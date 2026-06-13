alter table public.trip_gallery_media_items
add column is_removed boolean not null default false,
add column removed_at timestamptz,
add column removed_by uuid references auth.users(id),
add column removed_reason text;

drop policy if exists "trip gallery media member select" on public.trip_gallery_media_items;

create policy "trip gallery media member select" on public.trip_gallery_media_items
for select using (
  public.is_trip_member(trip_id)
  and (
    is_removed = false
    or public.can_manage_trip(trip_id)
  )
);
