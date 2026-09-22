-- SteamGuard Phase 12: functional administrator panel.
-- Run this entire script once after phase-11-admin-runtime-export.sql.

create table if not exists public.operational_limits (
  id bigint generated always as identity primary key,
  reading_key text not null unique,
  label text not null,
  minimum numeric(12,2) not null,
  maximum numeric(12,2) not null,
  unit text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint valid_operational_limit check (minimum < maximum)
);

insert into public.operational_limits(reading_key,label,minimum,maximum,unit) values
('pressure','Steam pressure',6,12,'bar'),
('water_level','Water level',40,80,'%'),
('steam_temperature','Steam temperature',150,200,'°C'),
('flue_temperature','Flue gas temperature',110,220,'°C')
on conflict(reading_key) do nothing;

alter table public.operational_limits enable row level security;
drop policy if exists "Authenticated read operational limits" on public.operational_limits;
create policy "Authenticated read operational limits" on public.operational_limits for select to authenticated using(true);
drop policy if exists "Admins manage operational limits" on public.operational_limits;
create policy "Admins manage operational limits" on public.operational_limits for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Admins create boilers" on public.boilers;
create policy "Admins create boilers" on public.boilers for insert to authenticated with check(public.is_admin());
drop policy if exists "Admins delete boilers" on public.boilers;
create policy "Admins delete boilers" on public.boilers for delete to authenticated using(public.is_admin());

-- All signed-in users may mark checklist items complete. Only admins configure the list.
drop policy if exists "Authenticated add checklist" on public.safety_checklist_items;
drop policy if exists "Authenticated delete checklist" on public.safety_checklist_items;
create policy "Admins add checklist" on public.safety_checklist_items for insert to authenticated with check(public.is_admin());
create policy "Admins delete checklist" on public.safety_checklist_items for delete to authenticated using(public.is_admin());

create or replace function public.capture_admin_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_id text;
begin
  old_row := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  row_id := coalesce(new_row->>'id',old_row->>'id','');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
  values(auth.uid(),lower(tg_op),tg_table_name,row_id,old_row,new_row);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_profiles_admin on public.profiles;
create trigger audit_profiles_admin after update on public.profiles for each row execute function public.capture_admin_audit();
drop trigger if exists audit_boilers_admin on public.boilers;
create trigger audit_boilers_admin after insert or update or delete on public.boilers for each row execute function public.capture_admin_audit();
drop trigger if exists audit_limits_admin on public.operational_limits;
create trigger audit_limits_admin after insert or update or delete on public.operational_limits for each row execute function public.capture_admin_audit();
drop trigger if exists audit_checklist_admin on public.safety_checklist_items;
create trigger audit_checklist_admin after insert or update or delete on public.safety_checklist_items for each row execute function public.capture_admin_audit();

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operational_limits') then
    alter publication supabase_realtime add table public.operational_limits;
  end if;
end $$;
