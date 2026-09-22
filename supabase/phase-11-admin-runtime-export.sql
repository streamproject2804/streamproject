-- SteamGuard Phase 11: change the main administrator account.
-- Run this entire file once in Supabase SQL Editor after Phase 10.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_main_admin boolean;
begin
  is_main_admin := lower(coalesce(new.email, '')) = lower('muthuramanajith28@gmail.com');

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
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = case when is_main_admin then 'admin'::public.app_role else public.profiles.role end,
    is_active = case when is_main_admin then true else public.profiles.is_active end,
    approval_status = case when is_main_admin then 'approved' else public.profiles.approval_status end;
  return new;
end;
$$;

-- Promote and approve the new administrator if the account already exists.
update public.profiles
set role = 'admin', is_active = true, approval_status = 'approved'
where lower(email) = lower('muthuramanajith28@gmail.com');

-- The previous main account remains approved but no longer has administrator rights.
update public.profiles
set role = 'operator', is_active = true, approval_status = 'approved'
where lower(email) = lower('muthusubasri@gmail.com')
  and lower(email) <> lower('muthuramanajith28@gmail.com');
