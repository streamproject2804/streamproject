-- SteamGuard Phase 7: authoritative boiler runtime tracking.
-- Run this entire file in Supabase SQL Editor after Phase 6.

alter table public.boilers add column if not exists running_started_at timestamptz;

create table if not exists public.boiler_runtime_sessions (
  id bigint generated always as identity primary key,
  boiler_id bigint not null references public.boilers(id) on delete cascade,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  duration_seconds bigint,
  started_by uuid references auth.users(id) on delete set null,
  stopped_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint runtime_stop_after_start check (stopped_at is null or stopped_at >= started_at),
  constraint runtime_duration_nonnegative check (duration_seconds is null or duration_seconds >= 0)
);
create unique index if not exists one_open_runtime_per_boiler on public.boiler_runtime_sessions (boiler_id) where stopped_at is null;
create index if not exists runtime_sessions_started_at_idx on public.boiler_runtime_sessions (started_at desc);
alter table public.boiler_runtime_sessions enable row level security;
drop policy if exists "Authenticated users read runtime history" on public.boiler_runtime_sessions;
create policy "Authenticated users read runtime history" on public.boiler_runtime_sessions for select to authenticated using (true);

create or replace function public.set_boiler_operational_status(target_boiler_id bigint,next_status text)
returns void language plpgsql security definer set search_path=public as $$
declare current_status text; start_time timestamptz; allowed boolean;
begin
 if next_status not in ('running','off') then raise exception 'Invalid boiler status'; end if;
 select operational_status,running_started_at into current_status,start_time from public.boilers where id=target_boiler_id for update;
 if not found then raise exception 'Boiler not found'; end if;
 select public.is_admin()
   or exists(select 1 from public.profiles where id=auth.uid() and role='supervisor' and is_active=true and approval_status='approved')
   or exists(select 1 from public.workers where assigned_boiler_id=target_boiler_id and is_active=true and lower(email)=lower(coalesce(auth.jwt()->>'email','')))
 into allowed;
 if not allowed then raise exception 'You are not allowed to control this boiler'; end if;
 if current_status=next_status then return; end if;
 if next_status='running' then
   start_time:=now();
   insert into public.boiler_runtime_sessions(boiler_id,started_at,started_by) values(target_boiler_id,start_time,auth.uid());
   update public.boilers set operational_status='running',running_started_at=start_time,status_changed_at=start_time,status_changed_by=auth.uid() where id=target_boiler_id;
 else
   update public.boiler_runtime_sessions set stopped_at=now(),duration_seconds=greatest(0,extract(epoch from(now()-started_at))::bigint),stopped_by=auth.uid() where boiler_id=target_boiler_id and stopped_at is null;
   update public.boilers set operational_status='off',running_started_at=null,status_changed_at=now(),status_changed_by=auth.uid() where id=target_boiler_id;
 end if;
end $$;
revoke all on function public.set_boiler_operational_status(bigint,text) from public;
grant execute on function public.set_boiler_operational_status(bigint,text) to authenticated;

update public.boilers set running_started_at=coalesce(running_started_at,status_changed_at,now()) where operational_status='running';
insert into public.boiler_runtime_sessions(boiler_id,started_at,started_by)
select id,running_started_at,status_changed_by from public.boilers b where b.operational_status='running'
and not exists(select 1 from public.boiler_runtime_sessions s where s.boiler_id=b.id and s.stopped_at is null);
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='boiler_runtime_sessions') then alter publication supabase_realtime add table public.boiler_runtime_sessions; end if;
end $$;
