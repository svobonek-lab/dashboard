-- STAGING-ONLY PROPOSAL. Requires endpoint and bearer secret preloaded in Vault.
-- Do not paste credentials into SQL or execute without a separate review/approval.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='stavbaflow_outbox_scheduler_url')
     or not exists(select 1 from vault.decrypted_secrets where name='stavbaflow_outbox_cron_secret') then
    raise exception 'Store scheduler URL and CRON_SECRET in Vault before scheduling; do not embed values here.';
  end if;
  if (select decrypted_secret from vault.decrypted_secrets where name='stavbaflow_outbox_scheduler_url') !~ '^https://[^/]+/api/outbox-scheduler$' then
    raise exception 'Vault scheduler URL must be an HTTPS /api/outbox-scheduler endpoint.';
  end if;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname='stavbaflow-outbox-worker';
select cron.schedule(
  'stavbaflow-outbox-worker',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='stavbaflow_outbox_scheduler_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='stavbaflow_outbox_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);
commit;
