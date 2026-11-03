-- STAGING-ONLY ROLLBACK. Stops this job; leaves extensions and Vault entries intact.
select cron.unschedule(jobid) from cron.job where jobname='stavbaflow-outbox-worker';
