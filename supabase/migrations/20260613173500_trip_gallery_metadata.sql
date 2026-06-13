create table public.trip_gallery_albums (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  provider text not null default 'google_photos',
  google_album_id text,
  album_url text,
  title text,
  status text not null default 'external_link',
  visibility text not null default 'owner_only',
  created_by_profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_gallery_albums_provider_unique unique (trip_id, provider),
  constraint trip_gallery_albums_status_check check (status in ('external_link', 'api_ready', 'syncing', 'active', 'disabled')),
  constraint trip_gallery_albums_visibility_check check (visibility in ('owner_only', 'shared_later'))
);

create table public.trip_gallery_media_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  album_id uuid references public.trip_gallery_albums(id) on delete set null,
  provider text not null default 'google_photos',
  google_media_item_id text,
  filename text,
  mime_type text,
  media_type text,
  caption text,
  description text,
  google_product_url text,
  cached_base_url text,
  cached_base_url_expires_at timestamptz,
  uploaded_by_profile_id uuid,
  uploaded_by_name text,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_gallery_media_items_media_type_check check (media_type in ('photo', 'video', 'unknown'))
);

create unique index trip_gallery_media_items_provider_id_idx 
on public.trip_gallery_media_items (provider, google_media_item_id) 
where google_media_item_id is not null;

create trigger trip_gallery_albums_updated_at before update on public.trip_gallery_albums for each row execute function public.set_updated_at();
create trigger trip_gallery_media_items_updated_at before update on public.trip_gallery_media_items for each row execute function public.set_updated_at();

alter table public.trip_gallery_albums enable row level security;
alter table public.trip_gallery_media_items enable row level security;

create policy "trip gallery albums owner all" on public.trip_gallery_albums
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "trip gallery media owner all" on public.trip_gallery_media_items
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));
