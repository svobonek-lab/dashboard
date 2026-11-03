\set ON_ERROR_STOP on
do $$
declare row_status text;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_email_outbox' and column_name='invite_link_ciphertext')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_email_outbox' and column_name='template_data') then
    raise exception 'encrypted invitation payload columns are missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.app_email_outbox'::regclass) then raise exception 'outbox RLS must remain enabled'; end if;
  if has_table_privilege('anon','public.app_email_outbox','select') or has_table_privilege('authenticated','public.app_email_outbox','select')
     or has_table_privilege('authenticated','public.app_email_outbox','insert') or has_table_privilege('authenticated','public.app_email_outbox','update') then
    raise exception 'browser roles must not access invitation outbox payloads';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='app_email_outbox') then raise exception 'outbox browser policies must be removed'; end if;
  if not has_table_privilege('service_role','public.app_email_outbox','select') or not has_table_privilege('service_role','public.app_email_outbox','insert') or not has_table_privilege('service_role','public.app_email_outbox','update') then
    raise exception 'service worker access is incomplete';
  end if;
end;
$$;
insert into public.app_email_outbox(id,company_id,invite_id,notification_kind,recipient,subject,template_data,status)
values ('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','auth_invite','owner-a@example.test','Invite','{"name":"Owner A"}','pending');
set role authenticated;
do $$ declare first_id uuid; second_id uuid; begin
  first_id:=public.app_create_invite('30000000-0000-4000-8000-000000000001','worker-a@example.test','Worker A');
  second_id:=public.app_create_invite('30000000-0000-4000-8000-000000000001','worker-a@example.test','Worker A');
  if first_id<>second_id then raise exception 'repeat invitation must reuse the active app invite'; end if;
end $$;
reset role;
set role service_role;
do $$ begin
  if (select count(*) from public.app_invites where email='worker-a@example.test' and accepted_at is null and revoked_at is null)<>1 then raise exception 'repeat invitation created duplicate app_invites'; end if;
  if (select count(*) from public.app_email_outbox where invite_id=(select id from public.app_invites where email='worker-a@example.test') and notification_kind='auth_invite')<>1 then raise exception 'employee invite and outbox must be atomic and unique'; end if;
end $$;
do $$ declare observed text; begin
  select invitation_status into observed from public.app_platform_list_companies('40000000-0000-4000-8000-000000000001') where id='30000000-0000-4000-8000-000000000001';
  if observed <> 'queued' then raise exception 'platform directory must report queued before provider delivery'; end if;
end $$;
update public.app_email_outbox set status='delivered' where id='60000000-0000-4000-8000-000000000001';
do $$ declare observed text; begin
  select invitation_status into observed from public.app_platform_list_companies('40000000-0000-4000-8000-000000000001') where id='30000000-0000-4000-8000-000000000001';
  if observed <> 'sent' then raise exception 'platform directory must report sent after provider delivery'; end if;
end $$;
do $$ declare created record; begin
  select * into created from public.app_platform_create_company_onboarding(
    '40000000-0000-4000-8000-000000000001','Company B','company-b','Owner B','owner-b@example.test','pilot',now(),now()
  );
  if not exists(select 1 from public.app_email_outbox where invite_id=created.invite_id and notification_kind='auth_invite') then raise exception 'company creation and invite queue were not atomic'; end if;
end $$;
do $$ declare resent record; begin
  select * into resent from public.app_platform_resend_owner_invite('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
  if not exists(select 1 from public.app_email_outbox where invite_id=resent.invite_id and notification_kind='auth_invite') then raise exception 'resend and invite queue were not atomic'; end if;
  if resent.invite_id<>'50000000-0000-4000-8000-000000000001' then raise exception 'resend must reuse the unexpired active owner invite'; end if;
  if (select count(*) from public.app_invites where company_id='30000000-0000-4000-8000-000000000001' and role='owner' and accepted_at is null and revoked_at is null)<>1 then raise exception 'resend created duplicate active owner invites'; end if;
  if (select status from public.app_email_outbox where invite_id=resent.invite_id)<>'pending' then raise exception 'resend did not requeue the prior delivery'; end if;
end $$;
reset role;
update public.app_email_outbox set status='delivered'
where invite_id=(select id from public.app_invites where company_id='30000000-0000-4000-8000-000000000001' and role='owner' and revoked_at is null order by created_at desc limit 1);
set role service_role;
do $$ declare observed text; begin
  select invitation_status into observed from public.app_platform_list_companies('40000000-0000-4000-8000-000000000001') where id='30000000-0000-4000-8000-000000000001';
  if observed <> 'sent' then raise exception 'platform directory must report sent only after provider delivery'; end if;
end $$;
reset role;
