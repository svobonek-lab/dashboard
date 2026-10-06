-- STAGING-ONLY, SYNTHETIC, ROLLED-BACK authorization assertions.
begin;
do $$
declare
  company_a uuid := gen_random_uuid(); company_b uuid := gen_random_uuid();
  connector_a uuid := gen_random_uuid(); connector_b uuid := gen_random_uuid();
  response jsonb; cross_count integer; acknowledged boolean;
begin
  insert into public.app_companies(id,name,slug,active,public_form) values
    (company_a,'Synthetic Connector A','synthetic-connector-a',true,false),
    (company_b,'Synthetic Connector B','synthetic-connector-b',true,false);
  insert into public.app_connectors(id,company_id,public_key,scopes,status) values
    (connector_a,company_a,'synthetic-public-key-a',array['heartbeat','ingest','commands'],'ready'),
    (connector_b,company_b,'synthetic-public-key-b',array['heartbeat','ingest','commands'],'ready');
  insert into public.app_connector_mappings(connector_id,company_id,version,definition,approved_at) values
    (connector_a,company_a,1,'{}',now()),(connector_b,company_b,1,'{}',now());
  perform public.app_reserve_connector_request(connector_a,'synthetic-request-a',now()+interval '10 minutes');
  response := public.app_ingest_connector_batch(connector_a,1,'synthetic-request-a',false,jsonb_build_array(jsonb_build_object(
    'version',1,'type','lead','sourceSystem','synthetic','sourceTable','leads','externalId','lead-a','fingerprint',repeat('a',64),'payload',jsonb_build_object('title','Synthetic lead A')
  )));
  if response->>'accepted' <> 'true' then raise exception 'synthetic ingest was not accepted'; end if;
  select count(*) into cross_count from public.app_connector_records where connector_id=connector_a and company_id=company_b;
  if cross_count <> 0 then raise exception 'cross-company connector record exists'; end if;
  insert into public.app_connector_commands(company_id,connector_id,command_type,expires_at) values(company_a,connector_a,'sync_now',now()+interval '5 minutes');
  select public.app_ack_connector_command(connector_b,id) into acknowledged from public.app_connector_commands where connector_id=connector_a limit 1;
  if acknowledged then raise exception 'connector B acknowledged connector A command'; end if;
  update public.app_connectors set revoked_at=now() where id=connector_a;
  if public.app_connector_heartbeat(connector_a,'ready','0.1.0') then raise exception 'revoked connector heartbeat succeeded'; end if;
end $$;
rollback;
