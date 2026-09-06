-- SteamGuard Phase 10: persistent operator logbook.
-- Run this complete file after Phase 9.

create table if not exists public.logbook_entries (
  id bigint generated always as identity primary key,
  boiler_id bigint not null references public.boilers(id) on delete restrict,
  pressure numeric(10,2) not null default 0 check(pressure>=0),
  water_level numeric(10,2) not null default 0 check(water_level>=0),
  steam_temperature numeric(10,2) not null default 0 check(steam_temperature>=0),
  flue_temperature numeric(10,2) not null default 0 check(flue_temperature>=0),
  feed_water_temperature numeric(10,2) not null default 0 check(feed_water_temperature>=0),
  furnace_temperature numeric(10,2) not null default 0 check(furnace_temperature>=0),
  remarks text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists logbook_boiler_created_idx on public.logbook_entries(boiler_id,created_at desc);
create index if not exists logbook_created_idx on public.logbook_entries(created_at desc);
alter table public.logbook_entries enable row level security;
drop policy if exists "Approved users read logbook" on public.logbook_entries;
create policy "Approved users read logbook" on public.logbook_entries for select to authenticated using(
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true and p.approval_status='approved')
);
drop policy if exists "Approved users create logbook" on public.logbook_entries;
create policy "Approved users create logbook" on public.logbook_entries for insert to authenticated with check(
  created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true and p.approval_status='approved')
);
drop policy if exists "Owner or admin deletes logbook" on public.logbook_entries;
create policy "Owner or admin deletes logbook" on public.logbook_entries for delete to authenticated using(created_by=auth.uid() or public.is_admin());

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='logbook_entries') then
    alter publication supabase_realtime add table public.logbook_entries;
  end if;
end $$;
