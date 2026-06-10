create table public.trip_share_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token text not null unique,
  label text not null default 'Family share link',
  is_enabled boolean not null default true,
  allow_comments boolean not null default true,
  allow_votes boolean not null default true,
  allow_packing_checks boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.family_guests (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.trip_share_links(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  display_name text not null,
  display_name_key text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (share_link_id, display_name_key)
);

create table public.family_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  share_link_id uuid not null references public.trip_share_links(id) on delete cascade,
  guest_id uuid not null references public.family_guests(id) on delete cascade,
  target_type public.comment_target not null,
  target_id uuid not null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.family_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  share_link_id uuid not null references public.trip_share_links(id) on delete cascade,
  guest_id uuid not null references public.family_guests(id) on delete cascade,
  itinerary_item_id uuid not null references public.itinerary_items(id) on delete cascade,
  value public.vote_value not null default 'neutral',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id, itinerary_item_id)
);

create table public.family_packing_checks (
  packing_item_id uuid not null references public.packing_items(id) on delete cascade,
  guest_id uuid not null references public.family_guests(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (packing_item_id, guest_id)
);

create index trip_share_links_trip_idx on public.trip_share_links(trip_id);
create index family_guests_share_idx on public.family_guests(share_link_id);
create index family_comments_trip_idx on public.family_comments(trip_id, created_at);
create index family_votes_item_idx on public.family_votes(itinerary_item_id);

alter table public.trip_share_links enable row level security;
alter table public.family_guests enable row level security;
alter table public.family_comments enable row level security;
alter table public.family_votes enable row level security;
alter table public.family_packing_checks enable row level security;

create policy "share links owners manage" on public.trip_share_links
for all using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));

create policy "family guests owners read" on public.family_guests
for select using (public.can_manage_trip(trip_id));

create policy "family comments owners read" on public.family_comments
for select using (public.can_manage_trip(trip_id));

create policy "family votes owners read" on public.family_votes
for select using (public.can_manage_trip(trip_id));

create policy "family packing checks owners read" on public.family_packing_checks
for select using (
  exists (
    select 1 from public.packing_items p
    where p.id = family_packing_checks.packing_item_id
      and public.can_manage_trip(p.trip_id)
  )
);

create or replace function public.get_share_link(p_share_token text)
returns public.trip_share_links
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.trip_share_links
  where token = p_share_token
    and is_enabled
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.get_or_create_family_guest(p_share_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.trip_share_links;
  v_guest_id uuid;
  v_name text;
begin
  v_name := nullif(trim(p_display_name), '');
  if v_name is null or length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Display name must be 2 to 80 characters.';
  end if;

  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null then
    raise exception 'Invalid or expired share token.';
  end if;

  insert into public.family_guests (share_link_id, trip_id, display_name, display_name_key)
  values (v_link.id, v_link.trip_id, v_name, lower(v_name))
  on conflict (share_link_id, display_name_key)
  do update set last_seen_at = now()
  returning id into v_guest_id;

  return v_guest_id;
end;
$$;

create or replace function public.get_family_trip(p_share_token text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link public.trip_share_links;
  v_guest_id uuid;
begin
  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null then
    raise exception 'Invalid or expired share token.';
  end if;

  v_guest_id := public.get_or_create_family_guest(p_share_token, p_display_name);

  return jsonb_build_object(
    'guestId', v_guest_id,
    'permissions', jsonb_build_object(
      'comments', v_link.allow_comments,
      'votes', v_link.allow_votes,
      'packingChecks', v_link.allow_packing_checks
    ),
    'trip', (
      select to_jsonb(t) - 'owner_id'
      from public.trips t
      where t.id = v_link.trip_id
    ),
    'itinerary', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.date, i.sort_order, i.start_time)
      from public.itinerary_items i
      where i.trip_id = v_link.trip_id and i.visibility = 'shared'
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.name)
      from public.places p
      where p.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) - 'storage_path' order by d.created_at desc)
      from public.documents d
      where d.trip_id = v_link.trip_id and not d.is_private
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(to_jsonb(e) - 'receipt_path' order by e.date desc)
      from public.expenses e
      where e.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'packing', coalesce((
      select jsonb_agg(
        to_jsonb(p)
        || jsonb_build_object(
          'familyCheckedBy', coalesce((
            select jsonb_agg(g.display_name order by g.display_name)
            from public.family_packing_checks c
            join public.family_guests g on g.id = c.guest_id
            where c.packing_item_id = p.id
          ), '[]'::jsonb)
        )
        order by p.category, p.name
      )
      from public.packing_items p
      where p.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'votes', coalesce((
      select jsonb_agg(to_jsonb(v) || jsonb_build_object('displayName', g.display_name))
      from public.family_votes v
      join public.family_guests g on g.id = v.guest_id
      where v.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(c) || jsonb_build_object('displayName', g.display_name) order by c.created_at desc)
      from public.family_comments c
      join public.family_guests g on g.id = c.guest_id
      where c.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'emergencyContacts', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.name)
      from public.emergency_contacts e
      where e.trip_id = v_link.trip_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.add_family_comment(
  p_share_token text,
  p_display_name text,
  p_target_type public.comment_target,
  p_target_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.trip_share_links;
  v_guest_id uuid;
  v_comment_id uuid;
begin
  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null or not v_link.allow_comments then
    raise exception 'Comments are not available for this share link.';
  end if;

  v_guest_id := public.get_or_create_family_guest(p_share_token, p_display_name);

  insert into public.family_comments (trip_id, share_link_id, guest_id, target_type, target_id, body)
  values (v_link.trip_id, v_link.id, v_guest_id, p_target_type, p_target_id, p_body)
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

create or replace function public.cast_family_vote(
  p_share_token text,
  p_display_name text,
  p_itinerary_item_id uuid,
  p_value public.vote_value
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.trip_share_links;
  v_guest_id uuid;
  v_vote_id uuid;
begin
  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null or not v_link.allow_votes then
    raise exception 'Voting is not available for this share link.';
  end if;

  if not exists (
    select 1 from public.itinerary_items
    where id = p_itinerary_item_id and trip_id = v_link.trip_id and visibility = 'shared'
  ) then
    raise exception 'Itinerary item is not available.';
  end if;

  v_guest_id := public.get_or_create_family_guest(p_share_token, p_display_name);

  insert into public.family_votes (trip_id, share_link_id, guest_id, itinerary_item_id, value)
  values (v_link.trip_id, v_link.id, v_guest_id, p_itinerary_item_id, p_value)
  on conflict (guest_id, itinerary_item_id)
  do update set value = excluded.value, updated_at = now()
  returning id into v_vote_id;

  return v_vote_id;
end;
$$;

create or replace function public.set_family_packing_check(
  p_share_token text,
  p_display_name text,
  p_packing_item_id uuid,
  p_checked boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.trip_share_links;
  v_guest_id uuid;
begin
  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null or not v_link.allow_packing_checks then
    raise exception 'Packing checks are not available for this share link.';
  end if;

  if not exists (
    select 1 from public.packing_items
    where id = p_packing_item_id and trip_id = v_link.trip_id
  ) then
    raise exception 'Packing item is not available.';
  end if;

  v_guest_id := public.get_or_create_family_guest(p_share_token, p_display_name);

  if p_checked then
    insert into public.family_packing_checks (packing_item_id, guest_id)
    values (p_packing_item_id, v_guest_id)
    on conflict (packing_item_id, guest_id) do update set checked_at = now();
  else
    delete from public.family_packing_checks
    where packing_item_id = p_packing_item_id and guest_id = v_guest_id;
  end if;

  return p_checked;
end;
$$;

grant execute on function public.get_family_trip(text, text) to anon, authenticated;
grant execute on function public.add_family_comment(text, text, public.comment_target, uuid, text) to anon, authenticated;
grant execute on function public.cast_family_vote(text, text, uuid, public.vote_value) to anon, authenticated;
grant execute on function public.set_family_packing_check(text, text, uuid, boolean) to anon, authenticated;

insert into public.trip_share_links (
  trip_id,
  token,
  label,
  is_enabled,
  allow_comments,
  allow_votes,
  allow_packing_checks
)
select
  '10000000-0000-0000-0000-000000000001',
  'bali-family-2026',
  'Bali Family Trip share link',
  true,
  true,
  true,
  true
where exists (
  select 1 from public.trips where id = '10000000-0000-0000-0000-000000000001'
)
on conflict (token) do nothing;
