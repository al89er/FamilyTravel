-- ============================================================
-- Family Assignments: Room Assignments + Flight Seat Assignments
-- ============================================================

-- ---- Room Assignments ----

create table if not exists public.family_room_assignments (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items(id) on delete set null,
  hotel_name    text not null,
  room_number   text not null,
  guest_ids     text[] not null default '{}',
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.family_room_assignments enable row level security;

-- Owner / Organizer: full access
create policy "room_assignments_planner_select"
  on public.family_room_assignments for select
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_room_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "room_assignments_planner_insert"
  on public.family_room_assignments for insert
  with check (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_room_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "room_assignments_planner_update"
  on public.family_room_assignments for update
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_room_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "room_assignments_planner_delete"
  on public.family_room_assignments for delete
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_room_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

-- ---- Flight Seat Assignments ----

create table if not exists public.family_flight_seat_assignments (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items(id) on delete set null,
  flight_label      text not null,
  guest_id          text not null,
  guest_name        text not null,
  seat_number       text not null,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.family_flight_seat_assignments enable row level security;

-- Owner / Organizer: full access
create policy "flight_seats_planner_select"
  on public.family_flight_seat_assignments for select
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_flight_seat_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "flight_seats_planner_insert"
  on public.family_flight_seat_assignments for insert
  with check (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_flight_seat_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "flight_seats_planner_update"
  on public.family_flight_seat_assignments for update
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_flight_seat_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "flight_seats_planner_delete"
  on public.family_flight_seat_assignments for delete
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = family_flight_seat_assignments.trip_id
        and tm.user_id = auth.uid()
    )
  );

-- Family (via RPC get_family_trip already restricts) — no anon read policies needed.
-- The family view data will be loaded via the authenticated planners' data
-- OR exposed via a dedicated RPC if required in the future.
