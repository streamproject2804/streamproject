-- SteamGuard Phase 4: workforce, shared shift, and operational modules.
-- Run once after phase-3-boiler-monitoring.sql.

create table public.plant_state (
  id smallint primary key default 1 check (id = 1),
  current_shift text not null default 'Shift A'
    check (current_shift in ('Shift A', 'Shift B', 'Shift C')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
insert into public.plant_state (id) values (1);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  assigned_boiler_id bigint unique references public.boilers(id) on delete set null,
  attendance_status text not null default 'out'
    check (attendance_status in ('in', 'out')),
  attendance_changed_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.shift_handovers (
  id bigint generated always as identity primary key,
  shift text not null,
  boiler_id bigint references public.boilers(id) on delete set null,
  boiler_condition text not null,
  pending_work text not null default '',
  safety_notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.maintenance_tasks (
  id bigint generated always as identity primary key,
  boiler_id bigint references public.boilers(id) on delete set null,
  equipment text not null,
  work_type text not null,
  due_date date not null,
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'In Progress', 'Completed', 'Overdue')),
  notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id bigint generated always as identity primary key,
  boiler_id bigint references public.boilers(id) on delete set null,
  title text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  description text not null,
  corrective_action text not null default '',
  status text not null default 'Open'
    check (status in ('Open', 'Investigating', 'Resolved')),
  reported_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.documents (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null,
  document_url text not null,
  expiry_date date,
  notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.plant_state enable row level security;
alter table public.workers enable row level security;
alter table public.shift_handovers enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.documents enable row level security;

drop policy if exists "Operators supervisors and admins can change boiler status" on public.boilers;
create policy "Assigned worker supervisor or admin changes boiler status"
on public.boilers for update to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'supervisor' and is_active)
  or exists (
    select 1 from public.workers
    where assigned_boiler_id = boilers.id and is_active
      and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
)
with check (
  public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'supervisor' and is_active)
  or exists (
    select 1 from public.workers
    where assigned_boiler_id = boilers.id and is_active
      and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

create policy "Authenticated users can read plant state" on public.plant_state
for select to authenticated using (true);
create policy "Authenticated users can change shared shift" on public.plant_state
for update to authenticated using (true) with check (true);

create policy "Authenticated users can view workers" on public.workers
for select to authenticated using (true);
create policy "Admins manage workers" on public.workers
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.set_my_attendance(next_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if next_status not in ('in', 'out') then
    raise exception 'Invalid attendance status';
  end if;
  update public.workers
  set attendance_status = next_status,
      attendance_changed_at = now()
  where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and is_active = true;
end;
$$;
grant execute on function public.set_my_attendance(text) to authenticated;

create policy "Authenticated users read handovers" on public.shift_handovers
for select to authenticated using (true);
create policy "Authenticated users create handovers" on public.shift_handovers
for insert to authenticated with check (created_by = auth.uid());

create policy "Authenticated users read maintenance" on public.maintenance_tasks
for select to authenticated using (true);
create policy "Authenticated users create maintenance" on public.maintenance_tasks
for insert to authenticated with check (created_by = auth.uid());
create policy "Authenticated users update maintenance" on public.maintenance_tasks
for update to authenticated using (true) with check (true);

create policy "Authenticated users read incidents" on public.incidents
for select to authenticated using (true);
create policy "Authenticated users create incidents" on public.incidents
for insert to authenticated with check (reported_by = auth.uid());
create policy "Authenticated users update incidents" on public.incidents
for update to authenticated using (true) with check (true);

create policy "Authenticated users read documents" on public.documents
for select to authenticated using (true);
create policy "Authenticated users create documents" on public.documents
for insert to authenticated with check (created_by = auth.uid());
create policy "Admins remove documents" on public.documents
for delete to authenticated using (public.is_admin());

alter publication supabase_realtime add table public.plant_state;
alter publication supabase_realtime add table public.workers;
alter publication supabase_realtime add table public.shift_handovers;
alter publication supabase_realtime add table public.maintenance_tasks;
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.documents;
