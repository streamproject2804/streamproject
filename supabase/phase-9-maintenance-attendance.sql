-- SteamGuard Phase 9: maintenance completion and attendance history.
-- Run this complete file after Phase 8.

alter table public.maintenance_tasks add column if not exists completed_at timestamptz;
alter table public.maintenance_tasks add column if not exists completed_by uuid references public.profiles(id) on delete set null;

create table if not exists public.attendance_records (
  id bigint generated always as identity primary key,
  worker_id uuid not null references public.workers(id) on delete restrict,
  boiler_id bigint not null references public.boilers(id) on delete restrict,
  status text not null check (status in ('in','out')),
  event_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists attendance_event_at_idx on public.attendance_records(event_at desc);
create index if not exists attendance_worker_idx on public.attendance_records(worker_id,event_at desc);
create index if not exists attendance_boiler_idx on public.attendance_records(boiler_id,event_at desc);
alter table public.attendance_records enable row level security;
drop policy if exists "Approved users read attendance" on public.attendance_records;
create policy "Approved users read attendance" on public.attendance_records for select to authenticated using(
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true and p.approval_status='approved')
);

create or replace function public.record_worker_attendance(target_worker_id uuid,target_boiler_id bigint,next_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if next_status not in ('in','out') then raise exception 'Invalid attendance status'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and is_active=true and approval_status='approved') then
    raise exception 'Only approved users can record attendance';
  end if;
  if not exists(select 1 from public.workers where id=target_worker_id and is_active=true) then raise exception 'Active worker not found'; end if;
  if not exists(select 1 from public.boilers where id=target_boiler_id) then raise exception 'Boiler not found'; end if;
  insert into public.attendance_records(worker_id,boiler_id,status,recorded_by)
  values(target_worker_id,target_boiler_id,next_status,auth.uid());
  update public.workers set attendance_status=next_status,attendance_changed_at=now() where id=target_worker_id;
end $$;
revoke all on function public.record_worker_attendance(uuid,bigint,text) from public;
grant execute on function public.record_worker_attendance(uuid,bigint,text) to authenticated;

create or replace function public.complete_maintenance_task(target_task_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_active=true and approval_status='approved') then
    raise exception 'Only approved users can complete maintenance';
  end if;
  update public.maintenance_tasks set status='Completed',completed_at=now(),completed_by=auth.uid()
  where id=target_task_id and status<>'Completed';
  if not found and not exists(select 1 from public.maintenance_tasks where id=target_task_id) then raise exception 'Maintenance task not found'; end if;
end $$;
revoke all on function public.complete_maintenance_task(bigint) from public;
grant execute on function public.complete_maintenance_task(bigint) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_records') then
    alter publication supabase_realtime add table public.attendance_records;
  end if;
end $$;
