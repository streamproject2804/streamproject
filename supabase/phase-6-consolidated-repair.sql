-- SteamGuard Phase 6 consolidated repair.
-- Safe to run once after schema.sql and Phase 3.

create table if not exists public.plant_state (
  id smallint primary key default 1 check (id = 1),
  current_shift text not null default 'Shift A'
    check (current_shift in ('Shift A', 'Shift B', 'Shift C')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
insert into public.plant_state (id) values (1) on conflict (id) do nothing;

create table if not exists public.workers (
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

create table if not exists public.shift_handovers (
  id bigint generated always as identity primary key,
  shift text not null,
  boiler_name text not null default '',
  boiler_condition text not null,
  pending_work text not null default '',
  safety_notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.shift_handovers add column if not exists boiler_name text not null default '';

create table if not exists public.maintenance_tasks (
  id bigint generated always as identity primary key,
  boiler_name text not null default '',
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
alter table public.maintenance_tasks add column if not exists boiler_name text not null default '';

create table if not exists public.incidents (
  id bigint generated always as identity primary key,
  boiler_name text not null default '',
  title text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  description text not null,
  corrective_action text not null default '',
  status text not null default 'Open'
    check (status in ('Open', 'Investigating', 'Resolved')),
  reported_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.incidents add column if not exists boiler_name text not null default '';

create table if not exists public.documents (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null,
  document_url text not null,
  expiry_date date,
  notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.boiler_event_records (
  id bigint generated always as identity primary key,
  boiler_name text not null,
  operator_name text not null,
  event_type text not null
    check (event_type in ('Boiler On', 'Boiler Off', 'Inspection', 'Maintenance', 'Other')),
  notes text not null default '',
  photo_path text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

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
  if not found then
    raise exception 'No active worker assignment found for this login email';
  end if;
end;
$$;
grant execute on function public.set_my_attendance(text) to authenticated;

alter table public.plant_state enable row level security;
alter table public.workers enable row level security;
alter table public.shift_handovers enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.documents enable row level security;
alter table public.boiler_event_records enable row level security;

drop policy if exists "Authenticated users can read plant state" on public.plant_state;
create policy "Authenticated users can read plant state" on public.plant_state for select to authenticated using (true);
drop policy if exists "Authenticated users can change shared shift" on public.plant_state;
create policy "Authenticated users can change shared shift" on public.plant_state for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view workers" on public.workers;
create policy "Authenticated users can view workers" on public.workers for select to authenticated using (true);
drop policy if exists "Admins manage workers" on public.workers;
create policy "Admins manage workers" on public.workers for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users read handovers" on public.shift_handovers;
create policy "Authenticated users read handovers" on public.shift_handovers for select to authenticated using (true);
drop policy if exists "Authenticated users create handovers" on public.shift_handovers;
create policy "Authenticated users create handovers" on public.shift_handovers for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Authenticated users read maintenance" on public.maintenance_tasks;
create policy "Authenticated users read maintenance" on public.maintenance_tasks for select to authenticated using (true);
drop policy if exists "Authenticated users create maintenance" on public.maintenance_tasks;
create policy "Authenticated users create maintenance" on public.maintenance_tasks for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Authenticated users update maintenance" on public.maintenance_tasks;
create policy "Authenticated users update maintenance" on public.maintenance_tasks for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users read incidents" on public.incidents;
create policy "Authenticated users read incidents" on public.incidents for select to authenticated using (true);
drop policy if exists "Authenticated users create incidents" on public.incidents;
create policy "Authenticated users create incidents" on public.incidents for insert to authenticated with check (reported_by = auth.uid());

drop policy if exists "Authenticated users read documents" on public.documents;
create policy "Authenticated users read documents" on public.documents for select to authenticated using (true);
drop policy if exists "Authenticated users create documents" on public.documents;
create policy "Authenticated users create documents" on public.documents for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Authenticated users read event records" on public.boiler_event_records;
create policy "Authenticated users read event records" on public.boiler_event_records for select to authenticated using (true);
drop policy if exists "Authenticated users create event records" on public.boiler_event_records;
create policy "Authenticated users create event records" on public.boiler_event_records for insert to authenticated with check (created_by = auth.uid());

insert into storage.buckets (id, name, public)
values ('boiler-references', 'boiler-references', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users upload boiler reference photos" on storage.objects;
create policy "Authenticated users upload boiler reference photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'boiler-references');
drop policy if exists "Authenticated users view boiler reference photos" on storage.objects;
create policy "Authenticated users view boiler reference photos"
on storage.objects for select to authenticated
using (bucket_id = 'boiler-references');

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'plant_state','workers','shift_handovers','maintenance_tasks',
    'incidents','documents','boiler_event_records'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
