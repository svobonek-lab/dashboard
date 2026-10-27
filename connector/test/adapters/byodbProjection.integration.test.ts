import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import pg from 'pg';

test('tenant projection RPC isolates two companies and loses employee access after reassignment', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  const client = new pg.Client({ host: '127.0.0.1', port: 25432, database: 'fixture', user: 'postgres', password: 'synthetic_admin_password' });
  await client.connect();
  try {
    await client.query(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
        if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
        if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
      end $$;
      create table if not exists public.app_members (company_id uuid not null,user_id uuid not null,email text not null,role text not null,active boolean not null);
      create table if not exists public.app_company_database_settings (company_id uuid primary key,mode text not null,connector_id uuid);
      create table if not exists public.app_connector_records (
        company_id uuid not null,connector_id uuid not null,entity_type text not null,external_id text not null,
        fingerprint text not null,payload jsonb not null,archived_at timestamptz,updated_at timestamptz not null default now());
    `);
    const proposal = await readFile(new URL('../../../supabase/staging/20261027_byodb_operational_projection.sql', import.meta.url), 'utf8');
    await client.query(proposal);
    const grants = await client.query(`select
      has_function_privilege('anon','public.app_list_byodb_records(uuid,uuid,text)','EXECUTE') as anon,
      has_function_privilege('authenticated','public.app_list_byodb_records(uuid,uuid,text)','EXECUTE') as authenticated,
      has_function_privilege('service_role','public.app_list_byodb_records(uuid,uuid,text)','EXECUTE') as service`);
    assert.deepEqual(grants.rows[0], { anon: false, authenticated: false, service: true });
    await client.query('begin');

    const companyA = randomUUID(), companyB = randomUUID();
    const connectorA = randomUUID(), connectorB = randomUUID();
    const ownerA = randomUUID(), ownerB = randomUUID(), employeeA = randomUUID();
    await client.query(`insert into public.app_members(company_id,user_id,email,role,active) values
      ($1,$2,'owner-a@example.test','owner',true),($3,$4,'owner-b@example.test','owner',true),
      ($1,$5,'worker-a@example.test','employee',true)`, [companyA, ownerA, companyB, ownerB, employeeA]);
    await client.query(`insert into public.app_company_database_settings(company_id,mode,connector_id)
      values($1,'byodb',$2),($3,'byodb',$4)`, [companyA, connectorA, companyB, connectorB]);
    const row = async (companyId: string, connectorId: string, entity: string, externalId: string, payload: Record<string, unknown>) => {
      await client.query(`insert into public.app_connector_records(company_id,connector_id,entity_type,external_id,fingerprint,payload)
        values($1,$2,$3,$4,$5,$6)`, [companyId, connectorId, entity, externalId, 'a'.repeat(64), JSON.stringify(payload)]);
    };
    await row(companyA, connectorA, 'lead', 'a-lead', { title: 'A lead', assignedToEmail: 'worker-a@example.test' });
    await row(companyA, connectorA, 'lead', 'other-lead', { title: 'Other lead', assignedToEmail: 'other@example.test' });
    await row(companyB, connectorB, 'lead', 'b-lead', { title: 'B lead', assignedToEmail: 'worker-a@example.test' });
    for (const entity of ['project', 'lead_note', 'lead_file']) {
      await row(companyA, connectorA, entity, `${entity}-a`, { leadExternalId: 'a-lead', title: entity, ...(entity === 'lead_file' ? { objectPath: 'private/a-lead/plan.pdf' } : {}) });
      await row(companyA, connectorA, entity, `${entity}-other`, { leadExternalId: 'other-lead', title: entity });
      await row(companyB, connectorB, entity, `${entity}-b`, { leadExternalId: 'b-lead', title: entity });
    }
    await row(companyA, connectorA, 'employee_directory', 'worker-a', { name: 'Worker A', email: 'worker-a@example.test' });
    const list = async (companyId: string, userId: string, entity: string): Promise<Array<{ externalId: string }>> => {
      const result = await client.query('select public.app_list_byodb_records($1,$2,$3) as rows', [companyId, userId, entity]);
      return result.rows[0].rows;
    };
    assert.deepEqual((await list(companyA, ownerA, 'lead')).map(item => item.externalId).sort(), ['a-lead', 'other-lead']);
    assert.deepEqual((await list(companyB, ownerB, 'lead')).map(item => item.externalId), ['b-lead']);
    assert.deepEqual((await list(companyB, ownerA, 'lead')), []);
    assert.deepEqual((await list(companyA, employeeA, 'employee_directory')), []);
    assert.deepEqual((await list(companyA, ownerA, 'employee_directory')).map(item => item.externalId), ['worker-a']);
    for (const entity of ['lead', 'project', 'lead_note', 'lead_file']) {
      const expected = entity === 'lead' ? 'a-lead' : `${entity}-a`;
      assert.deepEqual((await list(companyA, employeeA, entity)).map(item => item.externalId), [expected]);
    }
    const fileProjection = await client.query('select public.app_list_byodb_records($1,$2,$3) as rows', [companyA, employeeA, 'lead_file']);
    assert.equal(Object.hasOwn(fileProjection.rows[0].rows[0].payload, 'objectPath'), false);
    await client.query(`update public.app_connector_records set payload=jsonb_set(payload,'{assignedToEmail}','"other@example.test"')
      where company_id=$1 and connector_id=$2 and entity_type='lead' and external_id='a-lead'`, [companyA, connectorA]);
    for (const entity of ['lead', 'project', 'lead_note', 'lead_file']) {
      assert.deepEqual(await list(companyA, employeeA, entity), []);
    }
  } finally {
    await client.query('rollback').catch(() => undefined);
    await client.end();
  }
});
