-- SteamGuard Phase 13: realtime timers, unlimited workers and attendance controls.
-- Run once after phase-12-functional-admin.sql.

-- Permit any number of workers per boiler and add a general-worker job option.
alter table public.workers drop constraint if exists workers_assigned_boiler_id_key;
alter table public.workers add column if not exists job_role text not null default 'boiler_operator';
alter table public.workers drop constraint if exists workers_job_role_check;
alter table public.workers add constraint workers_job_role_check check(job_role in('boiler_operator','worker'));
update public.workers set job_role=case when assigned_boiler_id is null then 'worker' else 'boiler_operator' end;
create index if not exists workers_assigned_boiler_idx on public.workers(assigned_boiler_id) where is_active=true;

-- General workers can operate any boiler; boiler operators control their assigned boiler.
create or replace function public.set_boiler_operational_status(target_boiler_id bigint,next_status text)
returns void language plpgsql security definer set search_path=public as $$
declare current_status text; start_time timestamptz; allowed boolean;
begin
  if next_status not in('running','off') then raise exception 'Invalid boiler status'; end if;
  select operational_status,running_started_at into current_status,start_time from public.boilers where id=target_boiler_id for update;
  if not found then raise exception 'Boiler not found'; end if;
  select public.is_admin()
    or exists(select 1 from public.profiles where id=auth.uid() and role='supervisor' and is_active=true and approval_status='approved')
    or exists(select 1 from public.workers where is_active=true and lower(email)=lower(coalesce(auth.jwt()->>'email','')) and (job_role='worker' or assigned_boiler_id=target_boiler_id))
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

-- Every approved user may remove a runtime history row as requested.
drop policy if exists "Approved users delete runtime history" on public.boiler_runtime_sessions;
create policy "Approved users delete runtime history" on public.boiler_runtime_sessions for delete to authenticated using(
  exists(select 1 from public.profiles where id=auth.uid() and is_active=true and approval_status='approved')
);

-- Only administrators may delete or reset attendance history.
drop policy if exists "Admins delete attendance" on public.attendance_records;
create policy "Admins delete attendance" on public.attendance_records for delete to authenticated using(public.is_admin());
create or replace function public.admin_reset_attendance()
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  delete from public.attendance_records;
  update public.workers set attendance_status='out',attendance_changed_at=now() where is_active=true;
end $$;
revoke all on function public.admin_reset_attendance() from public;
grant execute on function public.admin_reset_attendance() to authenticated;

-- Record attendance and worker status together in one atomic operation.
create or replace function public.record_worker_attendance(target_worker_id uuid,target_boiler_id bigint,next_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if next_status not in('in','out') then raise exception 'Invalid attendance status'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and is_active=true and approval_status='approved') then raise exception 'Only approved users can record attendance'; end if;
  if not exists(select 1 from public.workers where id=target_worker_id and is_active=true) then raise exception 'Active worker not found'; end if;
  if not public.is_admin() and not exists(select 1 from public.workers where id=target_worker_id and lower(email)=lower(coalesce(auth.jwt()->>'email',''))) then raise exception 'You can only mark your own attendance'; end if;
  if not exists(select 1 from public.boilers where id=target_boiler_id) then raise exception 'Boiler not found'; end if;
  insert into public.attendance_records(worker_id,boiler_id,status,recorded_by) values(target_worker_id,target_boiler_id,next_status,auth.uid());
  update public.workers set attendance_status=next_status,attendance_changed_at=now() where id=target_worker_id;
end $$;
revoke all on function public.record_worker_attendance(uuid,bigint,text) from public;
grant execute on function public.record_worker_attendance(uuid,bigint,text) to authenticated;

-- Ensure already-running boilers always have a timer start value.
update public.boilers set running_started_at=coalesce(running_started_at,status_changed_at,now()) where operational_status='running';
