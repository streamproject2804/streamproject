-- SteamGuard Phase 8. Run this complete file after Phase 7.

create table if not exists public.fuel_usage (
 id bigint generated always as identity primary key,
 usage_date date not null,
 boiler_name text not null,
 quantity numeric(12,2) not null check(quantity>=0),
 unit text not null default 'kg' check(unit in('kg','litre','ton')),
 notes text not null default '',
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists fuel_usage_date_idx on public.fuel_usage(usage_date desc);

create table if not exists public.safety_checklist_items (
 id bigint generated always as identity primary key,
 item_text text not null,
 is_completed boolean not null default false,
 sort_order integer not null default 0,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
insert into public.safety_checklist_items(item_text,sort_order)
select v.item_text,v.sort_order from (values
 ('Boiler area is clean and accessible',1),('Water level has been verified',2),
 ('Pressure gauge is in good condition',3),('Safety valve condition has been checked',4),
 ('Feed-water pump is operating normally',5),('Fuel supply is stable',6),
 ('Furnace condition has been inspected',7),('No visible steam or water leakage',8),
 ('Alarm system status has been checked',9),('Shift handover notes have been reviewed',10)
) as v(item_text,sort_order)
where not exists(select 1 from public.safety_checklist_items);

create table if not exists public.announcements (
 id bigint generated always as identity primary key,
 title text not null,
 message text not null default '',
 file_name text,
 file_path text,
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.announcement_likes (
 announcement_id bigint not null references public.announcements(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(announcement_id,user_id)
);

alter table public.fuel_usage enable row level security;
alter table public.safety_checklist_items enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_likes enable row level security;

drop policy if exists "Authenticated read fuel" on public.fuel_usage;
create policy "Authenticated read fuel" on public.fuel_usage for select to authenticated using(true);
drop policy if exists "Authenticated add fuel" on public.fuel_usage;
create policy "Authenticated add fuel" on public.fuel_usage for insert to authenticated with check(created_by=auth.uid());
drop policy if exists "Owner or admin changes fuel" on public.fuel_usage;
create policy "Owner or admin changes fuel" on public.fuel_usage for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes fuel" on public.fuel_usage;
create policy "Owner or admin deletes fuel" on public.fuel_usage for delete to authenticated using(created_by=auth.uid() or public.is_admin());

drop policy if exists "Authenticated read checklist" on public.safety_checklist_items;
create policy "Authenticated read checklist" on public.safety_checklist_items for select to authenticated using(true);
drop policy if exists "Authenticated add checklist" on public.safety_checklist_items;
create policy "Authenticated add checklist" on public.safety_checklist_items for insert to authenticated with check(true);
drop policy if exists "Authenticated update checklist" on public.safety_checklist_items;
create policy "Authenticated update checklist" on public.safety_checklist_items for update to authenticated using(true) with check(true);
drop policy if exists "Authenticated delete checklist" on public.safety_checklist_items;
create policy "Authenticated delete checklist" on public.safety_checklist_items for delete to authenticated using(true);

drop policy if exists "Authenticated read announcements" on public.announcements;
create policy "Authenticated read announcements" on public.announcements for select to authenticated using(true);
drop policy if exists "Authenticated create announcements" on public.announcements;
create policy "Authenticated create announcements" on public.announcements for insert to authenticated with check(created_by=auth.uid());
drop policy if exists "Owner or admin updates announcements" on public.announcements;
create policy "Owner or admin updates announcements" on public.announcements for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes announcements" on public.announcements;
create policy "Owner or admin deletes announcements" on public.announcements for delete to authenticated using(created_by=auth.uid() or public.is_admin());
drop policy if exists "Authenticated read likes" on public.announcement_likes;
create policy "Authenticated read likes" on public.announcement_likes for select to authenticated using(true);
drop policy if exists "User creates own like" on public.announcement_likes;
create policy "User creates own like" on public.announcement_likes for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "User deletes own like" on public.announcement_likes;
create policy "User deletes own like" on public.announcement_likes for delete to authenticated using(user_id=auth.uid());

-- Existing operational records: creators can edit/delete; administrators can manage all.
drop policy if exists "Authenticated users update maintenance" on public.maintenance_tasks;
drop policy if exists "Owner or admin updates maintenance" on public.maintenance_tasks;
create policy "Owner or admin updates maintenance" on public.maintenance_tasks for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes maintenance" on public.maintenance_tasks;
create policy "Owner or admin deletes maintenance" on public.maintenance_tasks for delete to authenticated using(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin updates incidents" on public.incidents;
create policy "Owner or admin updates incidents" on public.incidents for update to authenticated using(reported_by=auth.uid() or public.is_admin()) with check(reported_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes incidents" on public.incidents;
create policy "Owner or admin deletes incidents" on public.incidents for delete to authenticated using(reported_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin updates event records" on public.boiler_event_records;
create policy "Owner or admin updates event records" on public.boiler_event_records for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes event records" on public.boiler_event_records;
create policy "Owner or admin deletes event records" on public.boiler_event_records for delete to authenticated using(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin updates handovers" on public.shift_handovers;
create policy "Owner or admin updates handovers" on public.shift_handovers for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes handovers" on public.shift_handovers;
create policy "Owner or admin deletes handovers" on public.shift_handovers for delete to authenticated using(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin updates documents" on public.documents;
create policy "Owner or admin updates documents" on public.documents for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "Owner or admin deletes documents" on public.documents;
create policy "Owner or admin deletes documents" on public.documents for delete to authenticated using(created_by=auth.uid() or public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit) values('announcements','announcements',false,20971520)
on conflict(id) do update set file_size_limit=20971520;
drop policy if exists "Authenticated upload announcement files" on storage.objects;
create policy "Authenticated upload announcement files" on storage.objects for insert to authenticated with check(bucket_id='announcements' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Authenticated download announcement files" on storage.objects;
create policy "Authenticated download announcement files" on storage.objects for select to authenticated using(bucket_id='announcements');
drop policy if exists "Owner or admin deletes announcement files" on storage.objects;
create policy "Owner or admin deletes announcement files" on storage.objects for delete to authenticated using(bucket_id='announcements' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

do $$ declare t text; begin foreach t in array array['fuel_usage','safety_checklist_items','announcements','announcement_likes'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
end loop; end $$;
