-- STAGING-ONLY IMPORT WORKER CONTRACT
-- Apply only to the isolated staging project. Never apply automatically to
-- production. The worker is callable only with the service_role key.

begin;

create table if not exists public.app_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  actor uuid not null,
  fingerprint text not null,
  file_name text not null default '',
  imported integer not null default 0,
  source text not null default 'csv',
  row_count integer not null default 0,
  status text not null default 'completed'
    check (status in ('completed', 'rolled_back', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  rollback_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);
-- StavbaCore Staging already has a legacy app_imports table. CREATE TABLE IF
-- NOT EXISTS preserves it, so explicitly add the worker contract columns.
alter table public.app_imports
  add column if not exists actor uuid,
  add column if not exists fingerprint text,
  add column if not exists source text not null default 'csv',
  add column if not exists imported integer not null default 0,
  add column if not exists row_count integer not null default 0,
  add column if not exists status text not null default 'completed'
    check (status in ('completed', 'rolled_back', 'failed')),
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rollback_blocked boolean not null default false;

create unique index if not exists app_imports_company_fingerprint
  on public.app_imports(company_id, fingerprint);

-- Preserve the legacy import count when enriching pre-existing history rows.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_imports' and column_name = 'imported'
  ) then
    execute 'update public.app_imports set row_count = coalesce(imported, row_count) where row_count = 0';
  end if;
end;
$$;

update public.app_imports
   set completed_at = created_at
 where status = 'completed' and completed_at is null;

alter table public.app_leads add column if not exists import_fingerprint text;
alter table public.app_leads add column if not exists source_record_id text;
create unique index if not exists app_leads_import_identity
  on public.app_leads (company_id, import_fingerprint, source_record_id)
  where import_fingerprint is not null and source_record_id is not null;

alter table public.app_imports enable row level security;
revoke all on table public.app_imports from public, anon, authenticated;
grant select, insert, update, delete on table public.app_imports to service_role;
drop policy if exists app_imports_deny_direct on public.app_imports;
create policy app_imports_deny_direct
  on public.app_imports for all to anon, authenticated
  using (false) with check (false);

create or replace function public.app_mark_import_lead_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('app.import_worker', true), '') <> 'on'
     and coalesce(current_setting('app.import_rollback', true), '') <> 'on'
     and old.import_fingerprint is not null then
    update public.app_imports
       set rollback_blocked = true
     where company_id = old.company_id
       and fingerprint = old.import_fingerprint;
  end if;
  return old;
end;
$$;

revoke all on function public.app_mark_import_lead_changed() from public, anon, authenticated, service_role;
drop trigger if exists app_mark_import_lead_changed on public.app_leads;
create trigger app_mark_import_lead_changed
  after update or delete on public.app_leads
  for each row execute function public.app_mark_import_lead_changed();

-- Remove the legacy service-only RPC. Its four-argument contract cannot record
-- the authenticated actor and is no longer used by the server handler.
drop function if exists public.app_import_leads(uuid, jsonb, text, text);

create or replace function public.app_import_leads(
  p_company_id uuid,
  p_actor_id uuid,
  p_rows jsonb,
  p_file_name text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_import_id uuid;
  v_created integer := 0;
  v_updated integer := 0;
  v_source_id text;
  v_was_created boolean;
begin
  if not exists (
    select 1 from public.app_companies
    where id = p_company_id and active = true
  ) then
    raise exception 'company is not active';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'import must be an array with at most 10000 rows';
  end if;
  if nullif(trim(p_fingerprint), '') is null then
    raise exception 'fingerprint is required';
  end if;
  if p_actor_id is null then
    raise exception 'actor is required';
  end if;

  perform set_config('app.import_worker', 'on', true);

  insert into public.app_imports (company_id, actor, fingerprint, file_name, imported, row_count, status, summary, completed_at)
  values (p_company_id, p_actor_id, left(trim(coalesce(p_fingerprint, '')), 160),
          left(trim(coalesce(p_file_name, 'import.csv')), 160),
          jsonb_array_length(p_rows),
          jsonb_array_length(p_rows), 'completed', '{}'::jsonb, now())
  on conflict (company_id, fingerprint) do nothing
  returning id into v_import_id;

  if v_import_id is null then
    select id into v_import_id
    from public.app_imports
    where company_id = p_company_id and fingerprint = p_fingerprint;
    return (select jsonb_build_object(
      'importId', v_import_id,
      'status', status,
      'created', coalesce((summary->>'created')::integer, 0),
      'updated', coalesce((summary->>'updated')::integer, 0),
      'duplicate', true
    ) from public.app_imports where id = v_import_id);
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_source_id := left(nullif(trim(v_row->>'source_record_id'), ''), 160);
    if v_source_id is null then
      v_source_id := md5(v_row::text);
    end if;

    insert into public.app_leads (
      company_id, title, customer, email, phone, address, description,
      status, priority, scheduled_at, duration_minutes, value, source,
      import_fingerprint, source_record_id, updated_at
    )
    values (
      p_company_id,
      left(coalesce(nullif(trim(v_row->>'title'), ''), 'Importovaná poptávka'), 160),
      left(coalesce(nullif(trim(v_row->>'customer'), ''), 'Neznámý zákazník'), 160),
      left(coalesce(v_row->>'email', ''), 160),
      left(coalesce(v_row->>'phone', ''), 60),
      left(coalesce(v_row->>'address', ''), 240),
      left(coalesce(v_row->>'description', ''), 4000),
      lower(coalesce(nullif(trim(v_row->>'status'), ''), 'new')),
      lower(coalesce(nullif(trim(v_row->>'priority'), ''), 'normal')),
      nullif(v_row->>'scheduled_at', '')::timestamptz,
      greatest(coalesce(nullif(v_row->>'duration_minutes', '')::integer, 60), 15),
      greatest(coalesce(nullif(v_row->>'value', '')::numeric, 0), 0),
      'import',
      p_fingerprint,
      v_source_id,
      now()
    )
    on conflict (company_id, import_fingerprint, source_record_id) where import_fingerprint is not null and source_record_id is not null
    do update set
      title = excluded.title,
      customer = excluded.customer,
      email = excluded.email,
      phone = excluded.phone,
      address = excluded.address,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      scheduled_at = excluded.scheduled_at,
      duration_minutes = excluded.duration_minutes,
      value = excluded.value,
      updated_at = now()
    returning (xmax = 0) into v_was_created;

    if v_was_created then
      v_created := v_created + 1;
    else
      v_updated := v_updated + 1;
    end if;
  end loop;

  update public.app_imports
  set imported = v_created + v_updated,
      row_count = v_created + v_updated,
      summary = jsonb_build_object('created', v_created, 'updated', v_updated),
      completed_at = now()
  where id = v_import_id;

  return jsonb_build_object(
    'importId', v_import_id,
    'status', 'completed',
    'created', v_created,
    'updated', v_updated,
    'duplicate', false
  );
end;
$$;

revoke all on function public.app_import_leads(uuid, uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.app_import_leads(uuid, uuid, jsonb, text, text) to service_role;

create or replace function public.app_rollback_import(
  p_company_id uuid,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
  v_import_id uuid;
  v_rollback_blocked boolean;
begin
  select id, rollback_blocked
    into v_import_id, v_rollback_blocked
    from public.app_imports
   where company_id = p_company_id
     and fingerprint = p_fingerprint
   for update;
  if coalesce(v_rollback_blocked, false) then
    raise exception 'import has changed rows; rollback refused';
  end if;

  perform set_config('app.import_rollback', 'on', true);
  delete from public.app_leads
  where company_id = p_company_id
    and import_fingerprint = p_fingerprint;
  get diagnostics v_deleted = row_count;

  update public.app_imports
  set status = 'rolled_back', rolled_back_at = now()
  where company_id = p_company_id and fingerprint = p_fingerprint
  returning id into v_import_id;

  return jsonb_build_object('importId', v_import_id, 'deleted', v_deleted, 'status', 'rolled_back');
end;
$$;

revoke all on function public.app_rollback_import(uuid, text) from public, anon, authenticated;
grant execute on function public.app_rollback_import(uuid, text) to service_role;

commit;
