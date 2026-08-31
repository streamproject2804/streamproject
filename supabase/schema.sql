-- SteamGuard authentication and role foundation
-- Run this once in Supabase Dashboard > SQL Editor.

create type public.app_role as enum ('admin', 'supervisor', 'operator', 'technician');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.app_role not null default 'operator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage profiles"
on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can view audit logs"
on public.audit_logs for select to authenticated
using (public.is_admin());

-- After creating the first user in Authentication > Users, promote that account:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
