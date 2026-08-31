-- SteamGuard Phase 3: three-boiler real-time monitoring
-- Run after schema.sql, once, in Supabase SQL Editor.

create table public.boilers (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  boiler_type text not null default 'Fire-tube',
  capacity_tons numeric(6,2) not null default 1,
  operational_status text not null default 'off'
    check (operational_status in ('running', 'off')),
  status_changed_by uuid references auth.users(id) on delete set null,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.operator_presence (
  id uuid primary key default gen_random_uuid(),
  boiler_id bigint not null references public.boilers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operator_name text not null,
  presence_status text not null default 'out'
    check (presence_status in ('in', 'out')),
  changed_at timestamptz not null default now(),
  unique (boiler_id, user_id)
);

create index operator_presence_boiler_status_idx
  on public.operator_presence (boiler_id, presence_status);

insert into public.boilers (code, name, boiler_type, capacity_tons)
values
  ('SG-01', 'Main Boiler 1', 'Fire-tube', 1),
  ('SG-02', 'Main Boiler 2', 'Fire-tube', 1),
  ('SG-03', 'Main Boiler 3', 'Fire-tube', 1);

alter table public.boilers enable row level security;
alter table public.operator_presence enable row level security;

create policy "Authenticated users can monitor boilers"
on public.boilers for select to authenticated
using (true);

create policy "Operators supervisors and admins can change boiler status"
on public.boilers for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
      and role in ('admin', 'supervisor', 'operator')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
      and role in ('admin', 'supervisor', 'operator')
  )
);

create policy "Authenticated users can monitor operator presence"
on public.operator_presence for select to authenticated
using (true);

create policy "Users can create their own presence"
on public.operator_presence for insert to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own presence"
on public.operator_presence for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter publication supabase_realtime add table public.boilers;
alter publication supabase_realtime add table public.operator_presence;

-- Always assign the requested email as the main administrator.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    case
      when lower(coalesce(new.email, '')) = lower('muthusubasri@gmail.com')
        then 'admin'::public.app_role
      else 'operator'::public.app_role
    end
  );
  return new;
end;
$$;

-- Promote the account immediately if it already exists.
update public.profiles
set role = 'admin'
where lower(email) = lower('muthusubasri@gmail.com');
