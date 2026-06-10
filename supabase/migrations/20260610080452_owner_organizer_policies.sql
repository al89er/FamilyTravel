alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

update public.profiles
set username = lower(regexp_replace(display_name, '[^a-zA-Z0-9_]+', '_', 'g'))
where username is null;

create unique index if not exists profiles_username_key
on public.profiles(lower(username))
where username is not null;

alter table public.trip_members add column if not exists user_id uuid;

update public.trip_members
set user_id = profile_id
where user_id is null;

alter table public.trip_members drop constraint if exists trip_members_trip_id_profile_id_key;
create unique index if not exists trip_members_trip_user_key
on public.trip_members(trip_id, user_id)
where user_id is not null;

create unique index if not exists trip_members_one_owner_per_trip
on public.trip_members(trip_id)
where role = 'owner';

update public.trip_members
set role = 'organizer'
where role = 'member';

create or replace function public.trip_role(target_trip_id uuid)
returns public.trip_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.trip_members
  where trip_id = target_trip_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.trip_role(target_trip_id) = 'owner', false);
$$;

create or replace function public.is_trip_organizer(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.trip_role(target_trip_id) in ('owner', 'organizer'), false);
$$;

create or replace function public.can_manage_trip(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_trip_owner(target_trip_id);
$$;

create or replace function public.can_write_trip(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_trip_organizer(target_trip_id);
$$;

create or replace function public.can_create_expense(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_trip_organizer(target_trip_id);
$$;

revoke execute on function public.is_trip_owner(uuid) from public, anon;
revoke execute on function public.is_trip_organizer(uuid) from public, anon;
grant execute on function public.is_trip_owner(uuid) to authenticated;
grant execute on function public.is_trip_organizer(uuid) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid) to authenticated;
grant execute on function public.can_manage_trip(uuid) to authenticated;
grant execute on function public.can_write_trip(uuid) to authenticated;
grant execute on function public.can_create_expense(uuid) to authenticated;

drop policy if exists "itinerary planners write" on public.itinerary_items;
create policy "itinerary organizers write" on public.itinerary_items
for all using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));

drop policy if exists "documents owners or uploader update" on public.documents;
create policy "documents organizers update" on public.documents
for update using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));

drop policy if exists "documents owners or uploader delete" on public.documents;
create policy "documents organizers delete" on public.documents
for delete using (public.can_write_trip(trip_id));

drop policy if exists "share links owners manage" on public.trip_share_links;
create policy "share links organizers manage" on public.trip_share_links
for all using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));

create or replace function public.transfer_trip_ownership_as_owner(
  p_trip_id uuid,
  p_current_owner_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_current_owner_id and role = 'owner'
  ) then
    raise exception 'Current user is not the trip owner.';
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_new_owner_id and role = 'organizer'
  ) then
    raise exception 'New owner must be an organizer on this trip.';
  end if;

  update public.trip_members
  set role = 'organizer'
  where trip_id = p_trip_id and user_id = p_current_owner_id;

  update public.trip_members
  set role = 'owner'
  where trip_id = p_trip_id and user_id = p_new_owner_id;
end;
$$;

revoke execute on function public.transfer_trip_ownership_as_owner(uuid, uuid, uuid) from public, anon, authenticated;
