do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_invites'
      and column_name = 'accepted_at' and data_type = 'timestamp with time zone'
      and is_nullable = 'YES'
  ) then
    raise exception 'app_invites.accepted_at must be nullable timestamptz';
  end if;

  if (select count(*) from public.app_invites) <> 1
    or (select count(*) from public.app_invites where accepted_at is null) <> 1
  then
    raise exception 'existing pending invitation was changed';
  end if;
end;
$$;
