-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION.
-- Adds append-only lead notes/file metadata, a private Storage bucket and
-- tenant/assignment-scoped RLS. Review and apply manually in isolated staging.

begin;

-- Match the currently deployed StavbaCore staging authorization contract.
-- Fail before DDL if helper signatures or tenant columns drift.
do $preflight$
begin
  if to_regprocedure('public.app_role(uuid)') is null
     or to_regprocedure('public.app_can_lead(uuid,uuid)') is null then
    raise exception 'Staging notes/files migration stopped: public tenant authorization helpers are missing';
  end if;
  if (select p.prorettype <> 'text'::regtype from pg_proc p where p.oid = to_regprocedure('public.app_role(uuid)'))
     or (select p.prorettype <> 'boolean'::regtype from pg_proc p where p.oid = to_regprocedure('public.app_can_lead(uuid,uuid)')) then
    raise exception 'Staging notes/files migration stopped: authorization helper return types changed';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid = to_regprocedure('public.app_role(uuid)')
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) or not exists (
    select 1 from pg_proc p
    where p.oid = to_regprocedure('public.app_can_lead(uuid,uuid)')
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'Staging notes/files migration stopped: authorization helper security contract changed';
  end if;
  if not has_function_privilege('authenticated', to_regprocedure('public.app_role(uuid)'), 'EXECUTE')
     or not has_function_privilege('authenticated', to_regprocedure('public.app_can_lead(uuid,uuid)'), 'EXECUTE')
     or has_function_privilege('anon', to_regprocedure('public.app_role(uuid)'), 'EXECUTE')
     or has_function_privilege('anon', to_regprocedure('public.app_can_lead(uuid,uuid)'), 'EXECUTE') then
    raise exception 'Staging notes/files migration stopped: authorization helper grants changed';
  end if;
  if to_regclass('public.app_leads') is null
     or to_regclass('public.app_companies') is null
     or to_regclass('public.app_members') is null
     or to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception 'Staging notes/files migration stopped: expected app_* tenant contract is missing';
  end if;
  if exists (
    select required.table_name, required.column_name, required.udt_name
    from (values
      ('app_companies','active','bool'),
      ('app_members','company_id','uuid'),('app_members','user_id','uuid'),
      ('app_members','role','text'),('app_members','active','bool'),
      ('app_leads','company_id','uuid'),('app_leads','assigned_to','uuid'),
      ('app_leads','status','text'),('app_leads','created_at','timestamptz'),
      ('app_leads','updated_at','timestamptz'),('app_leads','revision','int4'),
      ('app_leads','import_fingerprint','text'),('app_leads','source_record_id','text')
    ) as required(table_name,column_name,udt_name)
    left join information_schema.columns actual
      on actual.table_schema = 'public'
     and actual.table_name = required.table_name
     and actual.column_name = required.column_name
     and actual.udt_name = required.udt_name
    where actual.column_name is null
  ) then
    raise exception 'Staging notes/files migration stopped: required tenant columns changed';
  end if;
  if exists (
    select 1 from storage.buckets b
    where b.id = 'lead-files'
      and (b.public is distinct from false
        or b.file_size_limit is distinct from 15728640
        or b.allowed_mime_types is distinct from array[
          'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
        ]::text[])
  ) then
    raise exception 'Staging notes/files migration stopped: lead-files bucket already exists with an unexpected configuration';
  end if;
  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname not in (
        'app_lead_files_storage_select',
        'app_lead_files_storage_insert',
        'app_lead_files_storage_delete'
      )
      and (position('lead-files' in coalesce(p.qual, '')) > 0
        or position('lead-files' in coalesce(p.with_check, '')) > 0)
  ) then
    raise exception 'Staging notes/files migration stopped: unexpected Storage policy references lead-files';
  end if;
end;
$preflight$;

create unique index if not exists app_leads_company_id_id_unique
  on public.app_leads (company_id, id);

create table if not exists public.app_lead_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  lead_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint app_lead_notes_lead_company_fkey
    foreign key (company_id, lead_id)
    references public.app_leads(company_id, id) on delete cascade,
  constraint app_lead_notes_body_length
    check (char_length(trim(body)) between 1 and 4000)
);

create table if not exists public.app_lead_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  lead_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint app_lead_files_lead_company_fkey
    foreign key (company_id, lead_id)
    references public.app_leads(company_id, id) on delete cascade,
  constraint app_lead_files_path_matches_row check (
    storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]+$'
    and split_part(storage_path, '/', 1) = company_id::text
    and split_part(storage_path, '/', 2) = lead_id::text
  ),
  constraint app_lead_files_file_name_length
    check (
      char_length(trim(file_name)) between 1 and 255
      and position('/' in file_name) = 0
      and position(chr(92) in file_name) = 0
    ),
  constraint app_lead_files_mime_type check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')
  ),
  constraint app_lead_files_size check (size_bytes between 1 and 15728640)
);

-- This project has app_audit, but no app_lead_events table. Keep these
-- append-only attachment events separate instead of assuming a foreign audit
-- schema or a sequence on app_audit.id.
create table if not exists public.app_lead_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  lead_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  operation text not null check (operation in ('NOTE_ADDED', 'FILE_ADDED')),
  new_status text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint app_lead_events_lead_company_fkey
    foreign key (company_id, lead_id)
    references public.app_leads(company_id, id) on delete cascade
);

create index if not exists app_lead_notes_lead_created_idx
  on public.app_lead_notes (company_id, lead_id, created_at desc);
create index if not exists app_lead_files_lead_created_idx
  on public.app_lead_files (company_id, lead_id, created_at desc);
create index if not exists app_lead_notes_author_created_idx
  on public.app_lead_notes (author_id, created_at desc);
create index if not exists app_lead_files_author_created_idx
  on public.app_lead_files (author_id, created_at desc);

alter table public.app_lead_notes enable row level security;
alter table public.app_lead_files enable row level security;
alter table public.app_lead_events enable row level security;
revoke all on public.app_lead_notes, public.app_lead_files, public.app_lead_events from public, anon, authenticated;
grant select, insert, delete on public.app_lead_notes, public.app_lead_files to authenticated;
grant select on public.app_lead_events to authenticated;

drop policy if exists app_lead_events_select_scoped on public.app_lead_events;
create policy app_lead_events_select_scoped on public.app_lead_events
for select to authenticated
using (
  public.app_role(company_id) = 'owner'
  or public.app_can_lead(company_id, lead_id)
);

drop policy if exists app_lead_notes_select_scoped on public.app_lead_notes;
create policy app_lead_notes_select_scoped on public.app_lead_notes
for select to authenticated
using (
  public.app_role(company_id) = 'owner'
  or public.app_can_lead(company_id, lead_id)
);

drop policy if exists app_lead_notes_insert_scoped on public.app_lead_notes;
create policy app_lead_notes_insert_scoped on public.app_lead_notes
for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.app_role(company_id) = 'owner'
    or public.app_can_lead(company_id, lead_id)
  )
);

drop policy if exists app_lead_notes_delete_scoped on public.app_lead_notes;
create policy app_lead_notes_delete_scoped on public.app_lead_notes
for delete to authenticated
using (
  public.app_role(company_id) = 'owner'
  or (
    public.app_can_lead(company_id, lead_id)
    and author_id = auth.uid()
    and created_at >= clock_timestamp() - interval '15 minutes'
  )
);

drop policy if exists app_lead_files_select_scoped on public.app_lead_files;
create policy app_lead_files_select_scoped on public.app_lead_files
for select to authenticated
using (
  public.app_role(company_id) = 'owner'
  or public.app_can_lead(company_id, lead_id)
);

drop policy if exists app_lead_files_insert_scoped on public.app_lead_files;
create policy app_lead_files_insert_scoped on public.app_lead_files
for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.app_role(company_id) = 'owner'
    or public.app_can_lead(company_id, lead_id)
  )
);

drop policy if exists app_lead_files_delete_scoped on public.app_lead_files;
create policy app_lead_files_delete_scoped on public.app_lead_files
for delete to authenticated
using (
  public.app_role(company_id) = 'owner'
  or (
    public.app_can_lead(company_id, lead_id)
    and author_id = auth.uid()
    and created_at >= clock_timestamp() - interval '15 minutes'
  )
);

-- Browser callers cannot choose an author or backdate a record to influence
-- the employee deletion window. Privileged server-side maintenance keeps the
-- ability to restore an explicit historical timestamp.
create or replace function app_private.stamp_lead_attachment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if auth.uid() is null then
      raise exception 'authenticated user required' using errcode = '42501';
    end if;
    new.author_id := auth.uid();
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function app_private.stamp_lead_attachment() from public, anon, authenticated;

drop trigger if exists app_lead_notes_stamp_author on public.app_lead_notes;
create trigger app_lead_notes_stamp_author
before insert on public.app_lead_notes
for each row execute function app_private.stamp_lead_attachment();

drop trigger if exists app_lead_files_stamp_author on public.app_lead_files;
create trigger app_lead_files_stamp_author
before insert on public.app_lead_files
for each row execute function app_private.stamp_lead_attachment();

-- One reviewed source of truth for fields an assigned employee may edit.
-- `description` stores site/contact notes until a dedicated domain field is
-- introduced; identity, assignment, commercial and server fields stay locked.
create or replace function app_private.employee_lead_editable_fields()
returns text[]
language sql
immutable
security invoker
set search_path = ''
as $$ select array['status', 'description', 'phone', 'email', 'address']::text[] $$;
revoke all on function app_private.employee_lead_editable_fields() from public, anon;
grant execute on function app_private.employee_lead_editable_fields() to authenticated;

create or replace function app_private.guard_lead_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
declare
  v_role text;
begin
  if tg_op = 'UPDATE'
    and (new.id is distinct from old.id or new.company_id is distinct from old.company_id) then
    raise exception 'lead identity is immutable' using errcode = '42501';
  end if;

  if current_user = 'authenticated' then
    v_role := public.app_role(new.company_id);
    if auth.uid() is null
      or v_role is null
      or not exists (
        select 1 from public.app_companies c
        where c.id = new.company_id and c.active
      ) then
      raise exception 'active company membership required' using errcode = '42501';
    end if;

    if tg_op = 'INSERT' and v_role <> 'owner' then
      raise exception 'only owner can create leads' using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' then
      if new.created_at is distinct from old.created_at
        or new.import_fingerprint is distinct from old.import_fingerprint
        or new.source_record_id is distinct from old.source_record_id
        or new.revision is distinct from old.revision then
        raise exception 'server-managed fields are immutable' using errcode = '42501';
      end if;

      if v_role = 'employee' then
        if old.assigned_to is distinct from auth.uid()
          or (to_jsonb(new) - app_private.employee_lead_editable_fields())
             is distinct from
             (to_jsonb(old) - app_private.employee_lead_editable_fields()) then
          raise exception 'employee changed a field outside the allowlist' using errcode = '42501';
        end if;

        if new.status is distinct from old.status and not (
          (old.status = 'new' and new.status in ('contacted', 'lost'))
          or (old.status = 'contacted' and new.status in ('scheduled', 'in_progress', 'lost'))
          or (old.status = 'scheduled' and new.status in ('in_progress', 'lost'))
          or (old.status = 'in_progress' and new.status in ('won', 'lost'))
        ) then
          raise exception 'invalid employee status transition' using errcode = '42501';
        end if;
      elsif v_role <> 'owner' then
        raise exception 'unsupported role' using errcode = '42501';
      end if;
    end if;

    if new.status not in ('new', 'contacted', 'scheduled', 'in_progress', 'won', 'lost') then
      raise exception 'invalid lead status' using errcode = '22023';
    end if;
  end if;

  if new.assigned_to is not null
    and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
    and not exists (
      select 1 from public.app_members m
      where m.company_id = new.company_id
        and m.user_id = new.assigned_to
        and m.active
    ) then
    raise exception 'assignee must be an active member of this company' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function app_private.guard_lead_mutation() from public, anon, authenticated;

create or replace function app_private.record_lead_attachment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_operation text;
begin
  select l.status into strict v_status
  from public.app_leads l
  where l.company_id = new.company_id and l.id = new.lead_id;

  v_operation := case tg_table_name
    when 'app_lead_notes' then 'NOTE_ADDED'
    when 'app_lead_files' then 'FILE_ADDED'
    else null
  end;
  if v_operation is null then
    raise exception 'unsupported lead attachment event source';
  end if;

  insert into public.app_lead_events (
    company_id, lead_id, actor_id, operation, new_status
  ) values (
    new.company_id, new.lead_id, new.author_id, v_operation, v_status
  );
  return new;
end;
$$;
revoke all on function app_private.record_lead_attachment_event() from public, anon, authenticated;

drop trigger if exists app_lead_notes_record_event on public.app_lead_notes;
create trigger app_lead_notes_record_event
after insert on public.app_lead_notes
for each row execute function app_private.record_lead_attachment_event();

drop trigger if exists app_lead_files_record_event on public.app_lead_files;
create trigger app_lead_files_record_event
after insert on public.app_lead_files
for each row execute function app_private.record_lead_attachment_event();

create or replace function app_private.lead_file_path_is_valid(p_name text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select p_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[^/]+$'
$$;

create or replace function app_private.lead_file_path_company_id(p_name text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when app_private.lead_file_path_is_valid(p_name)
    then split_part(p_name, '/', 1)::uuid else null end
$$;

create or replace function app_private.lead_file_path_lead_id(p_name text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when app_private.lead_file_path_is_valid(p_name)
    then split_part(p_name, '/', 2)::uuid else null end
$$;

revoke all on function app_private.lead_file_path_is_valid(text) from public, anon;
revoke all on function app_private.lead_file_path_company_id(text) from public, anon;
revoke all on function app_private.lead_file_path_lead_id(text) from public, anon;
grant execute on function app_private.lead_file_path_is_valid(text) to authenticated;
grant execute on function app_private.lead_file_path_company_id(text) to authenticated;
grant execute on function app_private.lead_file_path_lead_id(text) to authenticated;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'lead-files',
  'lead-files',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists app_lead_files_storage_select on storage.objects;
create policy app_lead_files_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'lead-files'
  and app_private.lead_file_path_is_valid(name)
  and exists (
    select 1 from public.app_leads l
    where l.company_id = app_private.lead_file_path_company_id(name)
      and l.id = app_private.lead_file_path_lead_id(name)
      and (
        public.app_role(l.company_id) = 'owner'
        or public.app_can_lead(l.company_id, l.id)
      )
  )
);

drop policy if exists app_lead_files_storage_insert on storage.objects;
create policy app_lead_files_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'lead-files'
  and owner_id = auth.uid()::text
  and app_private.lead_file_path_is_valid(name)
  and exists (
    select 1 from public.app_leads l
    where l.company_id = app_private.lead_file_path_company_id(name)
      and l.id = app_private.lead_file_path_lead_id(name)
      and (
        public.app_role(l.company_id) = 'owner'
        or public.app_can_lead(l.company_id, l.id)
      )
  )
);

drop policy if exists app_lead_files_storage_delete on storage.objects;
create policy app_lead_files_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'lead-files'
  and app_private.lead_file_path_is_valid(name)
  and exists (
    select 1 from public.app_leads l
    where l.company_id = app_private.lead_file_path_company_id(name)
      and l.id = app_private.lead_file_path_lead_id(name)
      and (
        public.app_role(l.company_id) = 'owner'
        or (
          public.app_can_lead(l.company_id, l.id)
          and owner_id = auth.uid()::text
          and storage.objects.created_at >= clock_timestamp() - interval '15 minutes'
        )
      )
  )
);

commit;
