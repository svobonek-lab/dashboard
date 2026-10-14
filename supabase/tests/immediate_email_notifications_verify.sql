\set ON_ERROR_STOP on

set role anon;
select public.app_submit_public_lead(
  'firma-a', 'immediate-widget-1', 'Notified Customer', '777123456', 'private-contact@example.invalid',
  'Roof repair', 'Private address: Hidden Street 42', 100
) as notified_lead_id \gset
select public.app_submit_public_lead(
  'firma-a', 'immediate-widget-1', 'Changed Customer', '000', 'changed@example.invalid',
  'Changed title', 'Duplicate request', 999
) = :'notified_lead_id'::uuid as widget_retry_is_idempotent \gset
reset role;

create temporary table immediate_notification_test_ids(name text primary key, id uuid not null);
insert into immediate_notification_test_ids values ('notified', :'notified_lead_id'::uuid);

\if :widget_retry_is_idempotent
\else
  \quit 1
\endif

do $$
begin
  if (select count(*) from public.app_email_outbox
      where event_key = 'lead:new:' || (select id::text from immediate_notification_test_ids where name = 'notified') || ':owner') <> 1 then
    raise exception 'public form retry must queue one owner notification';
  end if;
  if exists (
    select 1 from public.app_email_outbox
    where lead_id = (select id from immediate_notification_test_ids where name = 'notified')
      and (body like '%777123456%' or body like '%private-contact@example.invalid%' or body like '%Hidden Street 42%')
  ) then raise exception 'email body leaked sensitive contact data'; end if;
end;
$$;

update public.app_companies set email_notifications = false
where id = '10000000-0000-4000-8000-000000000001';
set role anon;
select public.app_submit_public_lead(
  'firma-a', 'immediate-widget-disabled', 'Muted Customer', '111', '',
  'Muted job', 'No notification expected', 0
) as muted_lead_id \gset
reset role;
insert into immediate_notification_test_ids values ('muted', :'muted_lead_id'::uuid);
do $$
begin
  if exists (select 1 from public.app_email_outbox where lead_id = (select id from immediate_notification_test_ids where name = 'muted')) then
    raise exception 'disabled company must not queue notifications';
  end if;
end;
$$;

update public.app_companies set email_notifications = true
where id = '10000000-0000-4000-8000-000000000001';

set role service_role;
select public.app_submit_ai_inbox_lead(
  '20000000-0000-4000-8000-000000000002', 'immediate-ai-1', 'AI Customer',
  '555', 'AI roof', 'Private AI description', 'Private AI location'
) as ai_notified_lead_id \gset
select public.app_submit_ai_inbox_lead(
  '20000000-0000-4000-8000-000000000002', 'immediate-ai-1', 'Changed AI customer',
  '000', 'Changed AI title', 'Duplicate AI request', 'Elsewhere'
) = :'ai_notified_lead_id'::uuid as ai_retry_is_idempotent \gset
reset role;
insert into immediate_notification_test_ids values ('ai-notified', :'ai_notified_lead_id'::uuid);
\if :ai_retry_is_idempotent
\else
  \quit 1
\endif
do $$
begin
  if (select count(*) from public.app_email_outbox
      where lead_id = (select id from immediate_notification_test_ids where name = 'ai-notified')
        and notification_kind = 'new_lead_owner') <> 1 then
    raise exception 'AI inbox retry must queue one owner notification';
  end if;
end;
$$;

insert into public.app_leads(company_id, title, customer, source)
values ('10000000-0000-4000-8000-000000000001', 'CSV job', 'CSV customer', 'csv_import')
returning id as csv_lead_id \gset
insert into immediate_notification_test_ids values ('csv', :'csv_lead_id'::uuid);
do $$
begin
  if exists (select 1 from public.app_email_outbox where lead_id = (select id from immediate_notification_test_ids where name = 'csv')) then
    raise exception 'CSV import must not queue an immediate notification';
  end if;
end;
$$;

update public.app_leads
set assigned_to = '11000000-0000-4000-8000-000000000009', revision = revision + 1
where id = (select id from immediate_notification_test_ids where name = 'notified');
update public.app_leads
set assigned_to = '11000000-0000-4000-8000-000000000009'
where id = (select id from immediate_notification_test_ids where name = 'notified');

do $$
begin
  if (select count(*) from public.app_email_outbox
      where lead_id = (select id from immediate_notification_test_ids where name = 'notified') and notification_kind = 'lead_assigned_employee') <> 1 then
    raise exception 'assignment retry must queue one employee notification';
  end if;
  if not exists (
    select 1 from public.app_email_outbox
    where lead_id = (select id from immediate_notification_test_ids where name = 'notified')
      and notification_kind = 'lead_assigned_employee'
      and recipient = 'employee-a@example.invalid'
  ) then raise exception 'assignment notification must target the new employee'; end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', false);
select public.app_set_email_notifications('10000000-0000-4000-8000-000000000001', false) = false as owner_disabled_notifications \gset
reset role;
\if :owner_disabled_notifications
\else
  \quit 1
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', false);
do $$
begin
  perform public.app_set_email_notifications('20000000-0000-4000-8000-000000000002', false);
  raise exception 'owner A changed notification settings for company B';
exception
  when insufficient_privilege then null;
end;
$$;
reset role;

do $$
begin
  if (select email_notifications from public.app_companies where id = '10000000-0000-4000-8000-000000000001') then
    raise exception 'owner setting did not disable notifications';
  end if;
end;
$$;
