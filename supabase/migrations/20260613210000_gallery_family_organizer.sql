-- Phase 6A: Allow all members to select albums and media items
create policy "trip gallery albums member select" on public.trip_gallery_albums
for select using (public.is_trip_member(trip_id));

create policy "trip gallery media member select" on public.trip_gallery_media_items
for select using (public.is_trip_member(trip_id));

-- Phase 6B: Allow organizers to insert media items
create policy "trip gallery media organizer insert" on public.trip_gallery_media_items
for insert with check (public.can_write_trip(trip_id));
