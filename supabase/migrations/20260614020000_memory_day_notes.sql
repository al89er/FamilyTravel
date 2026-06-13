create table public.trip_memory_day_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) not null,
  day_date date not null,
  day_number integer not null,
  note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trip_memory_day_notes enable row level security;

-- Unique constraint
create unique index trip_memory_day_notes_trip_id_day_date_idx on public.trip_memory_day_notes (trip_id, day_date);
alter table public.trip_memory_day_notes add constraint trip_memory_day_notes_trip_id_day_date_key unique using index trip_memory_day_notes_trip_id_day_date_idx;

-- RLS
create policy "Trip members can select day notes" on public.trip_memory_day_notes
for select using (
  public.is_trip_member(trip_id)
);

create policy "Planners can insert day notes" on public.trip_memory_day_notes
for insert with check (
  public.can_manage_trip(trip_id)
);

create policy "Planners can update day notes" on public.trip_memory_day_notes
for update using (
  public.can_manage_trip(trip_id)
);

create policy "Planners can delete day notes" on public.trip_memory_day_notes
for delete using (
  public.can_manage_trip(trip_id)
);

-- Trigger for updated_at
create trigger handle_updated_at before update on public.trip_memory_day_notes
  for each row execute function public.set_updated_at();
