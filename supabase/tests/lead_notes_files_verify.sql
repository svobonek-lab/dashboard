\set ON_ERROR_STOP on

begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);

insert into public.app_lead_notes (id, company_id, lead_id, author_id, body) values (
  'a1000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  'Poznámka ze stavby'
);

insert into public.app_lead_files (
  id, company_id, lead_id, author_id, storage_path, file_name, mime_type, size_bytes
) values (
  'a2000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000001-photo.jpg',
  'photo.jpg',
  'image/jpeg',
  1024
);

insert into storage.objects (id, bucket_id, name, owner_id, metadata) values (
  'a3000000-0000-4000-8000-000000000001',
  'lead-files',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000001-photo.jpg',
  '12000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":1024}'::jsonb
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.app_lead_notes;
  if v_count <> 1 then raise exception 'FAIL: employee A cannot read own assigned note'; end if;
  select count(*) into v_count from public.app_lead_files;
  if v_count <> 1 then raise exception 'FAIL: employee A cannot read own assigned file'; end if;
  select count(*) into v_count from storage.objects where bucket_id = 'lead-files';
  if v_count <> 1 then raise exception 'FAIL: employee A cannot read own assigned object'; end if;
  select count(*) into v_count
  from public.app_lead_events
  where operation in ('NOTE_ADDED', 'FILE_ADDED')
    and actor_id = auth.uid();
  if v_count <> 2 then raise exception 'FAIL: note/file additions were not audited'; end if;
end;
$$;

update public.app_leads
set description = 'Zaměřeno na místě', phone = '+420 777 000 111', status = 'contacted'
where id = 'a0000000-0000-4000-8000-000000000001';

do $$
begin
  begin
    update public.app_leads
    set title = 'Zakázaný přepis názvu'
    where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: employee changed a field outside the allowlist';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000002', true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.app_lead_notes;
  if v_count <> 0 then raise exception 'FAIL: employee B sees company A note'; end if;
  select count(*) into v_count from public.app_lead_files;
  if v_count <> 0 then raise exception 'FAIL: employee B sees company A file'; end if;
  select count(*) into v_count from storage.objects where bucket_id = 'lead-files';
  if v_count <> 0 then raise exception 'FAIL: employee B directly reads company A object'; end if;

  begin
    insert into public.app_lead_notes (company_id, lead_id, author_id, body) values (
      '10000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      auth.uid(),
      'Cizí poznámka'
    );
    raise exception 'FAIL: employee B inserted into company A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata) values (
      'lead-files',
      '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-000000000002-intrusion.pdf',
      auth.uid(),
      '{"mimetype":"application/pdf","size":1024}'::jsonb
    );
    raise exception 'FAIL: employee B uploaded into company A path';
  exception when insufficient_privilege then null;
  end;
end;
$$;

insert into public.app_lead_notes (id, company_id, lead_id, author_id, body) values (
  'b1000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  '22000000-0000-4000-8000-000000000002',
  'Poznámka firmy B'
);

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.app_lead_notes;
  if v_count <> 1 then raise exception 'FAIL: owner A visibility is not tenant-scoped'; end if;
  select count(*) into v_count
  from public.app_lead_notes
  where company_id = '20000000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'FAIL: owner A sees company B notes'; end if;
end;
$$;

reset role;

insert into public.app_lead_notes (
  id, company_id, lead_id, author_id, body, created_at
) values (
  'a1000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  'Starší poznámka',
  clock_timestamp() - interval '16 minutes'
);

insert into public.app_lead_files (
  id, company_id, lead_id, author_id, storage_path, file_name, mime_type, size_bytes, created_at
) values (
  'a2000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000099-old.pdf',
  'old.pdf',
  'application/pdf',
  2048,
  clock_timestamp() - interval '16 minutes'
);

insert into storage.objects (id, bucket_id, name, owner_id, metadata, created_at) values (
  'a3000000-0000-4000-8000-000000000099',
  'lead-files',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000099-old.pdf',
  '12000000-0000-4000-8000-000000000001',
  '{"mimetype":"application/pdf","size":2048}'::jsonb,
  clock_timestamp() - interval '16 minutes'
);

insert into public.app_lead_notes (
  id, company_id, lead_id, author_id, body
) values (
  'a1000000-0000-4000-8000-000000000098',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'Poznámka majitele'
);

insert into public.app_lead_files (
  id, company_id, lead_id, author_id, storage_path, file_name, mime_type, size_bytes
) values (
  'a2000000-0000-4000-8000-000000000098',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000098-owner.png',
  'owner.png',
  'image/png',
  2048
);

insert into storage.objects (id, bucket_id, name, owner_id, metadata) values (
  'a3000000-0000-4000-8000-000000000098',
  'lead-files',
  '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000098-owner.png',
  '11000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/png","size":2048}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);

delete from public.app_lead_notes
where id = 'a1000000-0000-4000-8000-000000000099';
delete from public.app_lead_files
where id = 'a2000000-0000-4000-8000-000000000099';
delete from storage.objects
where id = 'a3000000-0000-4000-8000-000000000099';
delete from public.app_lead_notes
where id = 'a1000000-0000-4000-8000-000000000098';
delete from public.app_lead_files
where id = 'a2000000-0000-4000-8000-000000000098';
delete from storage.objects
where id = 'a3000000-0000-4000-8000-000000000098';

do $$
begin
  if not exists (
    select 1 from public.app_lead_notes
    where id = 'a1000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: employee deleted a note after 15 minutes'; end if;
  if not exists (
    select 1 from public.app_lead_files
    where id = 'a2000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: employee deleted file metadata after 15 minutes'; end if;
  if not exists (
    select 1 from storage.objects
    where id = 'a3000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: employee deleted storage object after 15 minutes'; end if;
  if not exists (
    select 1 from public.app_lead_notes
    where id = 'a1000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: employee deleted another author note'; end if;
  if not exists (
    select 1 from public.app_lead_files
    where id = 'a2000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: employee deleted another author file metadata'; end if;
  if not exists (
    select 1 from storage.objects
    where id = 'a3000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: employee deleted another uploader object'; end if;
end;
$$;

delete from public.app_lead_notes
where id = 'a1000000-0000-4000-8000-000000000001';
delete from public.app_lead_files
where id = 'a2000000-0000-4000-8000-000000000001';
delete from storage.objects
where id = 'a3000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (
    select 1 from public.app_lead_notes
    where id = 'a1000000-0000-4000-8000-000000000001'
  ) then raise exception 'FAIL: employee could not delete own recent note'; end if;
  if exists (
    select 1 from public.app_lead_files
    where id = 'a2000000-0000-4000-8000-000000000001'
  ) then raise exception 'FAIL: employee could not delete own recent file metadata'; end if;
  if exists (
    select 1 from storage.objects
    where id = 'a3000000-0000-4000-8000-000000000001'
  ) then raise exception 'FAIL: employee could not delete own recent storage object'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
delete from public.app_lead_notes
where id = 'a1000000-0000-4000-8000-000000000099';
delete from public.app_lead_files
where id = 'a2000000-0000-4000-8000-000000000099';
delete from storage.objects
where id = 'a3000000-0000-4000-8000-000000000099';
delete from public.app_lead_notes
where id = 'a1000000-0000-4000-8000-000000000098';
delete from public.app_lead_files
where id = 'a2000000-0000-4000-8000-000000000098';
delete from storage.objects
where id = 'a3000000-0000-4000-8000-000000000098';

do $$
begin
  if exists (
    select 1 from public.app_lead_notes
    where id = 'a1000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: owner could not delete an old company note'; end if;
  if exists (
    select 1 from public.app_lead_files
    where id = 'a2000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: owner could not delete old file metadata'; end if;
  if exists (
    select 1 from storage.objects
    where id = 'a3000000-0000-4000-8000-000000000099'
  ) then raise exception 'FAIL: owner could not delete old storage object'; end if;
  if exists (
    select 1 from public.app_lead_notes
    where id = 'a1000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: owner could not delete another author note'; end if;
  if exists (
    select 1 from public.app_lead_files
    where id = 'a2000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: owner could not delete another author file metadata'; end if;
  if exists (
    select 1 from storage.objects
    where id = 'a3000000-0000-4000-8000-000000000098'
  ) then raise exception 'FAIL: owner could not delete another uploader object'; end if;

  if app_private.employee_lead_editable_fields()
     is distinct from array['status', 'description', 'phone', 'email', 'address']::text[] then
    raise exception 'FAIL: employee lead field allowlist changed without test review';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'lead-files'
      and public = false
      and file_size_limit = 15728640
      and allowed_mime_types @> array[
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
      ]::text[]
  ) then raise exception 'FAIL: private bucket constraints are incomplete'; end if;

  begin
    insert into public.app_lead_files (
      company_id, lead_id, author_id, storage_path, file_name, mime_type, size_bytes
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000099-malware.exe',
      'malware.exe',
      'application/x-msdownload',
      1024
    );
    raise exception 'FAIL: forbidden MIME type was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.app_lead_files (
      company_id, lead_id, author_id, storage_path, file_name, mime_type, size_bytes
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000098-too-large.pdf',
      'too-large.pdf',
      'application/pdf',
      15728641
    );
    raise exception 'FAIL: oversized file metadata was accepted';
  exception when check_violation then null;
  end;
end;
$$;

select 'PASS: lead notes, files, storage path isolation, audit and employee field allowlist' as result;
rollback;
