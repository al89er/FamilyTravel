create extension if not exists "pgcrypto";

create type public.trip_role as enum ('owner', 'member', 'viewer');
create type public.visibility as enum ('shared', 'private', 'planner_only');
create type public.itinerary_category as enum ('flight', 'transport', 'hotel', 'food', 'activity', 'shopping', 'free_time', 'emergency', 'other');
create type public.place_category as enum ('hotel', 'restaurant', 'attraction', 'airport', 'meeting_point', 'pharmacy', 'hospital', 'custom');
create type public.document_category as enum ('flight_ticket', 'hotel_booking', 'passport', 'insurance', 'attraction_ticket', 'other');
create type public.vote_value as enum ('interested', 'must_do', 'skip', 'neutral');
create type public.comment_target as enum ('trip', 'itinerary_item', 'expense', 'document', 'place');

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  medical_notes text,
  allergies text,
  medications text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'UTC',
  currency text not null default 'USD',
  date_format text not null default 'DD MMM YYYY',
  default_visibility public.visibility not null default 'shared',
  hotel_info text not null default '',
  emergency_summary text not null default '',
  estimated_budget numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_order check (end_date >= start_date)
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_role not null default 'viewer',
  can_add_expenses boolean not null default false,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (trip_id, profile_id)
);

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email text not null,
  role public.trip_role not null default 'viewer',
  token uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time,
  title text not null,
  category public.itinerary_category not null default 'other',
  location_name text,
  address text,
  notes text,
  estimated_cost numeric(12,2),
  booking_reference text,
  attachment_url text,
  visibility public.visibility not null default 'shared',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items(id) on delete set null,
  name text not null,
  category public.place_category not null default 'custom',
  address text not null default '',
  latitude numeric(10,7),
  longitude numeric(10,7),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint places_longitude_range check (longitude is null or longitude between -180 and 180)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items(id) on delete set null,
  file_name text not null,
  file_type text not null,
  category public.document_category not null default 'other',
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null,
  category text not null,
  paid_by uuid not null references public.profiles(id) on delete restrict,
  date date not null,
  notes text,
  receipt_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12,2),
  primary key (expense_id, profile_id)
);

create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  quantity integer not null default 1 check (quantity > 0),
  assigned_to uuid references public.profiles(id) on delete set null,
  is_shared boolean not null default true,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.packing_item_checks (
  packing_item_id uuid not null references public.packing_items(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (packing_item_id, profile_id)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_item_id uuid not null references public.itinerary_items(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  value public.vote_value not null default 'neutral',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_item_id, profile_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  target_type public.comment_target not null,
  target_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  relationship text not null,
  phone text not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.travel_insurance (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  provider text not null,
  policy_number text not null,
  emergency_phone text not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_medical_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  allergies text,
  medications text,
  notes text,
  visible_to_owner boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (trip_id, profile_id)
);

create index trip_members_profile_idx on public.trip_members(profile_id);
create index itinerary_items_trip_date_idx on public.itinerary_items(trip_id, date, sort_order);
create index places_trip_idx on public.places(trip_id);
create index documents_trip_idx on public.documents(trip_id);
create index expenses_trip_idx on public.expenses(trip_id, date);
create index packing_items_trip_idx on public.packing_items(trip_id);
create index votes_item_idx on public.votes(itinerary_item_id);
create index comments_target_idx on public.comments(target_type, target_id);

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id and profile_id = auth.uid()
  );
$$;

create or replace function public.trip_role(target_trip_id uuid)
returns public.trip_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.trip_members
  where trip_id = target_trip_id and profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_trip(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.trip_role(target_trip_id) = 'owner', false);
$$;

create or replace function public.can_write_trip(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.trip_role(target_trip_id) in ('owner', 'member'), false);
$$;

create or replace function public.can_create_expense(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id
      and profile_id = auth.uid()
      and (role = 'owner' or (role = 'member' and can_add_expenses))
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger itinerary_items_updated_at before update on public.itinerary_items for each row execute function public.set_updated_at();
create trigger places_updated_at before update on public.places for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger packing_items_updated_at before update on public.packing_items for each row execute function public.set_updated_at();
create trigger votes_updated_at before update on public.votes for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger emergency_contacts_updated_at before update on public.emergency_contacts for each row execute function public.set_updated_at();
create trigger travel_insurance_updated_at before update on public.travel_insurance for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.places enable row level security;
alter table public.documents enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.packing_items enable row level security;
alter table public.packing_item_checks enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.travel_insurance enable row level security;
alter table public.family_medical_notes enable row level security;

create policy "profiles self read and trip peers" on public.profiles
for select using (
  id = auth.uid()
  or exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.profile_id = auth.uid() and theirs.profile_id = profiles.id
  )
);

create policy "profiles self insert" on public.profiles
for insert with check (id = auth.uid());

create policy "profiles self update" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "trips members read" on public.trips
for select using (public.is_trip_member(id));

create policy "trips authenticated create" on public.trips
for insert with check (owner_id = auth.uid());

create policy "trips owners update" on public.trips
for update using (public.can_manage_trip(id)) with check (public.can_manage_trip(id));

create policy "trips owners delete" on public.trips
for delete using (public.can_manage_trip(id));

create policy "trip members read own trip" on public.trip_members
for select using (public.is_trip_member(trip_id));

create policy "trip members owners write" on public.trip_members
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "trip invites owners manage" on public.trip_invites
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "itinerary members read visible" on public.itinerary_items
for select using (
  public.is_trip_member(trip_id)
  and (visibility = 'shared' or public.can_manage_trip(trip_id) or created_by = auth.uid())
);

create policy "itinerary planners write" on public.itinerary_items
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "places members read" on public.places
for select using (public.is_trip_member(trip_id));

create policy "places writers manage" on public.places
for all using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));

create policy "documents members read allowed metadata" on public.documents
for select using (
  public.is_trip_member(trip_id)
  and (not is_private or public.can_manage_trip(trip_id) or uploaded_by = auth.uid())
);

create policy "documents writers insert" on public.documents
for insert with check (public.can_write_trip(trip_id) and uploaded_by = auth.uid());

create policy "documents owners or uploader update" on public.documents
for update using (public.can_manage_trip(trip_id) or uploaded_by = auth.uid()) with check (public.can_manage_trip(trip_id) or uploaded_by = auth.uid());

create policy "documents owners or uploader delete" on public.documents
for delete using (public.can_manage_trip(trip_id) or uploaded_by = auth.uid());

create policy "expenses members read" on public.expenses
for select using (public.is_trip_member(trip_id));

create policy "expenses permitted insert" on public.expenses
for insert with check (public.can_create_expense(trip_id) and created_by = auth.uid());

create policy "expenses owners or creator update" on public.expenses
for update using (public.can_manage_trip(trip_id) or created_by = auth.uid()) with check (public.can_manage_trip(trip_id) or created_by = auth.uid());

create policy "expenses owners or creator delete" on public.expenses
for delete using (public.can_manage_trip(trip_id) or created_by = auth.uid());

create policy "expense splits members read" on public.expense_splits
for select using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));

create policy "expense splits expense writers" on public.expense_splits
for all using (exists (select 1 from public.expenses e where e.id = expense_id and (public.can_manage_trip(e.trip_id) or e.created_by = auth.uid())))
with check (exists (select 1 from public.expenses e where e.id = expense_id and (public.can_manage_trip(e.trip_id) or e.created_by = auth.uid())));

create policy "packing members read" on public.packing_items
for select using (public.is_trip_member(trip_id));

create policy "packing writers manage" on public.packing_items
for all using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));

create policy "packing checks members read" on public.packing_item_checks
for select using (exists (select 1 from public.packing_items p where p.id = packing_item_id and public.is_trip_member(p.trip_id)));

create policy "packing checks self write" on public.packing_item_checks
for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "votes members read" on public.votes
for select using (public.is_trip_member(trip_id));

create policy "votes self write" on public.votes
for all using (profile_id = auth.uid() and public.can_write_trip(trip_id)) with check (profile_id = auth.uid() and public.can_write_trip(trip_id));

create policy "comments members read" on public.comments
for select using (public.is_trip_member(trip_id));

create policy "comments members insert" on public.comments
for insert with check (profile_id = auth.uid() and public.can_write_trip(trip_id));

create policy "comments author update" on public.comments
for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "comments author or owner delete" on public.comments
for delete using (profile_id = auth.uid() or public.can_manage_trip(trip_id));

create policy "emergency contacts members read" on public.emergency_contacts
for select using (public.is_trip_member(trip_id));

create policy "emergency contacts owners write" on public.emergency_contacts
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "travel insurance members read" on public.travel_insurance
for select using (public.is_trip_member(trip_id));

create policy "travel insurance owners write" on public.travel_insurance
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "medical notes self or owner read" on public.family_medical_notes
for select using (
  profile_id = auth.uid()
  or (visible_to_owner and public.can_manage_trip(trip_id))
);

create policy "medical notes self write" on public.family_medical_notes
for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-documents',
  'trip-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "trip document objects readable by permitted members" on storage.objects
for select using (
  bucket_id = 'trip-documents'
  and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and public.is_trip_member(d.trip_id)
      and (not d.is_private or public.can_manage_trip(d.trip_id) or d.uploaded_by = auth.uid())
  )
);

create policy "trip document objects insert by members" on storage.objects
for insert with check (
  bucket_id = 'trip-documents'
  and public.can_write_trip((split_part(storage.objects.name, '/', 1))::uuid)
);

create policy "trip document objects owner or uploader update" on storage.objects
for update using (
  bucket_id = 'trip-documents'
  and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and (public.can_manage_trip(d.trip_id) or d.uploaded_by = auth.uid())
  )
);

create policy "trip document objects owner or uploader delete" on storage.objects
for delete using (
  bucket_id = 'trip-documents'
  and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and (public.can_manage_trip(d.trip_id) or d.uploaded_by = auth.uid())
  )
);
