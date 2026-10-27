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

test('operational queue accepts only approved owner mappings and same-company references', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  const client = new pg.Client({ host: '127.0.0.1', port: 25432, database: 'fixture', user: 'postgres', password: 'synthetic_admin_password' });
  await client.connect();
  try {
    await client.query(`
      alter table public.app_company_database_settings add column if not exists write_enabled boolean not null default false;
      create table if not exists public.app_connectors (
        id uuid primary key,company_id uuid not null,revoked_at timestamptz,scopes text[] not null);
      create table if not exists public.app_connector_mappings (
        connector_id uuid not null,company_id uuid not null,version integer not null,
        approved_at timestamptz,definition jsonb not null);
      create table if not exists public.app_byodb_operations (
        id uuid primary key default gen_random_uuid(),company_id uuid not null,connector_id uuid not null,
        actor_user_id uuid not null,actor_email text not null,actor_role text not null,idempotency_key uuid not null,
        mapping_version integer not null,entity_type text not null,action text not null,external_id text not null,
        expected_source_version text,payload jsonb not null,status text not null default 'pending',
        created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
        unique(company_id,idempotency_key),
        constraint app_byodb_operations_entity_type_check check(entity_type in ('company','lead')));
    `);
    const proposal = await readFile(new URL('../../../supabase/staging/20261027_byodb_operational_queue.sql', import.meta.url), 'utf8');
    await client.query(proposal);
    const grants = await client.query(`select
      has_function_privilege('anon','public.app_create_byodb_operation(uuid,uuid,text,uuid,jsonb)','EXECUTE') as anon,
      has_function_privilege('authenticated','public.app_create_byodb_operation(uuid,uuid,text,uuid,jsonb)','EXECUTE') as authenticated,
      has_function_privilege('service_role','public.app_create_byodb_operation(uuid,uuid,text,uuid,jsonb)','EXECUTE') as service`);
    assert.deepEqual(grants.rows[0], { anon: false, authenticated: false, service: true });
    await client.query('begin');
    const companyA = randomUUID(), companyB = randomUUID();
    const connectorA = randomUUID(), connectorB = randomUUID();
    const ownerA = randomUUID(), ownerB = randomUUID(), employeeA = randomUUID();
    await client.query(`insert into public.app_members(company_id,user_id,email,role,active) values
      ($1,$2,'owner-a@example.test','owner',true),($3,$4,'owner-b@example.test','owner',true),
      ($1,$5,'worker-a@example.test','employee',true)`, [companyA, ownerA, companyB, ownerB, employeeA]);
    await client.query(`insert into public.app_company_database_settings(company_id,mode,connector_id,write_enabled)
      values($1,'byodb',$2,true),($3,'byodb',$4,true)`, [companyA, connectorA, companyB, connectorB]);
    await client.query(`insert into public.app_connectors(id,company_id,scopes) values($1,$2,array['operations']),($3,$4,array['operations'])`, [connectorA, companyA, connectorB, companyB]);
    const mapping = (entityType: string, fields: string[]) => ({ entityType, fields: fields.map(targetField => ({ targetField })) });
    await client.query(`insert into public.app_connector_mappings(connector_id,company_id,version,approved_at,definition)
      values($1,$2,1,now(),$3),($1,$2,2,now(),$4)`, [connectorA, companyA, JSON.stringify(mapping('project', ['title','leadExternalId'])), JSON.stringify(mapping('employee_directory', ['name','email']))]);
    await client.query(`insert into public.app_connector_records(company_id,connector_id,entity_type,external_id,fingerprint,payload)
      values($1,$2,'lead','a-lead',$3,'{}'),($4,$5,'lead','b-lead',$3,'{}')`, [companyA, connectorA, 'a'.repeat(64), companyB, connectorB]);
    const queue = async (companyId: string, userId: string, connectorId: string, operation: Record<string, unknown>, email = 'owner-a@example.test') => {
      const result = await client.query('select public.app_create_byodb_operation($1,$2,$3,$4,$5) as result', [companyId, userId, email, connectorId, JSON.stringify(operation)]);
      return result.rows[0].result as { errorCode?: string; operationId?: string; replayed?: boolean };
    };
    const project = { version: 1, idempotencyKey: randomUUID(), mappingVersion: 1, entityType: 'project', action: 'create', externalId: randomUUID(), expectedSourceVersion: null, payload: { title: 'Roof', leadExternalId: 'a-lead' } };
    assert.equal((await queue(companyA, ownerA, connectorA, { ...project, payload: { title: 'Roof', leadExternalId: 'b-lead' } })).errorCode, 'OPERATION_REFERENCE_NOT_FOUND');
    assert.equal((await queue(companyA, ownerA, connectorA, { ...project, payload: { title: 'Roof', leadExternalId: 'missing' } })).errorCode, 'OPERATION_REFERENCE_NOT_FOUND');
    assert.equal((await queue(companyA, employeeA, connectorA, project, 'worker-a@example.test')).errorCode, 'MEMBER_SCOPE_DENIED');
    assert.equal((await queue(companyB, ownerB, connectorA, project, 'owner-b@example.test')).errorCode, 'BYODB_WRITE_DISABLED');
    assert.equal((await queue(companyA, ownerA, connectorA, project, 'spoofed@example.test')).errorCode, 'MEMBER_ACCESS_DENIED');
    assert.equal((await queue(companyA, ownerA, connectorA, { ...project, mappingVersion: 999 })).errorCode, 'MAPPING_STALE');
    const accepted = await queue(companyA, ownerA, connectorA, project);
    assert.ok(accepted.operationId);
    assert.equal(accepted.replayed, false);
    const replay = await queue(companyA, ownerA, connectorA, project);
    assert.equal(replay.operationId, accepted.operationId);
    assert.equal(replay.replayed, true);
    const employee = { ...project, idempotencyKey: randomUUID(), mappingVersion: 2, entityType: 'employee_directory', externalId: randomUUID(), payload: { name: 'Worker', email: 'worker@example.test' } };
    assert.ok((await queue(companyA, ownerA, connectorA, employee)).operationId);
    const rows = await client.query(`select entity_type from public.app_byodb_operations where company_id=$1 order by entity_type`, [companyA]);
    assert.deepEqual(rows.rows.map(item => item.entity_type), ['employee_directory','project']);
  } finally {
    await client.query('rollback').catch(() => undefined);
    await client.end();
  }
});
