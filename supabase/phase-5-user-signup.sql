-- SteamGuard Phase 5: automatic signup and administrator approval.
-- Run once after phase-4-operations.sql.

alter table public.profiles
add column approval_status text not null default 'pending'
check (approval_status in ('pending', 'approved', 'rejected'));

-- Preserve access for accounts that existed before this migration.
update public.profiles
set approval_status = 'approved'
where is_active = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_main_admin boolean;
begin
  is_main_admin := lower(coalesce(new.email, '')) = lower('muthusubasri@gmail.com');

  insert into public.profiles (
    id, full_name, email, role, is_active, approval_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    case when is_main_admin then 'admin'::public.app_role else 'operator'::public.app_role end,
    is_main_admin,
    case when is_main_admin then 'approved' else 'pending' end
  );
  return new;
end;
$$;

-- Ensure the main administrator stays approved.
update public.profiles
set role = 'admin', is_active = true, approval_status = 'approved'
where lower(email) = lower('muthusubasri@gmail.com');

alter publication supabase_realtime add table public.profiles;
