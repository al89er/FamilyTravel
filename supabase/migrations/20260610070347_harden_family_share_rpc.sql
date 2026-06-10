alter table public.trip_share_links add column if not exists token_hash text;

update public.trip_share_links
set token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
where token_hash is null and token is not null;

alter table public.trip_share_links alter column token drop not null;

create unique index if not exists trip_share_links_token_hash_idx
on public.trip_share_links(token_hash)
where token_hash is not null;

create or replace function public.hash_trip_share_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.token is not null then
    new.token_hash := encode(extensions.digest(new.token, 'sha256'), 'hex');
    new.token := null;
  end if;

  if new.token_hash is null then
    raise exception 'Share token is required.';
  end if;

  return new;
end;
$$;

drop trigger if exists trip_share_links_hash_token on public.trip_share_links;
create trigger trip_share_links_hash_token
before insert or update of token, token_hash on public.trip_share_links
for each row execute function public.hash_trip_share_token();

update public.trip_share_links
set token = null
where token is not null and token_hash is not null;

revoke execute on function public.get_share_link(text) from public, anon, authenticated;
revoke execute on function public.get_or_create_family_guest(text, text) from public, anon, authenticated;

create or replace function public.get_share_link(p_share_token text)
returns public.trip_share_links
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.trip_share_links
  where token_hash = encode(extensions.digest(p_share_token, 'sha256'), 'hex')
    and is_enabled
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.family_comment_target_allowed(
  p_trip_id uuid,
  p_target_type public.comment_target,
  p_target_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case p_target_type
    when 'trip' then p_target_id = p_trip_id
    when 'itinerary_item' then exists (
      select 1 from public.itinerary_items
      where id = p_target_id and trip_id = p_trip_id and visibility = 'shared'
    )
    when 'expense' then exists (
      select 1 from public.expenses
      where id = p_target_id and trip_id = p_trip_id
    )
    when 'document' then exists (
      select 1 from public.documents
      where id = p_target_id and trip_id = p_trip_id and not is_private
    )
    when 'place' then exists (
      select 1 from public.places
      where id = p_target_id and trip_id = p_trip_id
    )
    else false
  end;
$$;

revoke execute on function public.family_comment_target_allowed(uuid, public.comment_target, uuid) from public, anon, authenticated;

create or replace function public.get_family_trip(p_share_token text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
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
      select jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'destination', t.destination,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'timezone', t.timezone,
        'currency', t.currency,
        'date_format', t.date_format,
        'default_visibility', t.default_visibility,
        'hotel_info', t.hotel_info,
        'emergency_summary', t.emergency_summary,
        'estimated_budget', t.estimated_budget
      )
      from public.trips t
      where t.id = v_link.trip_id
    ),
    'itinerary', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'trip_id', i.trip_id,
        'date', i.date,
        'start_time', i.start_time,
        'end_time', i.end_time,
        'title', i.title,
        'category', i.category,
        'location_name', i.location_name,
        'address', i.address,
        'notes', i.notes,
        'estimated_cost', i.estimated_cost,
        'booking_reference', i.booking_reference,
        'attachment_url', i.attachment_url,
        'visibility', i.visibility,
        'sort_order', i.sort_order
      ) order by i.date, i.sort_order, i.start_time)
      from public.itinerary_items i
      where i.trip_id = v_link.trip_id and i.visibility = 'shared'
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'trip_id', p.trip_id,
        'itinerary_item_id', p.itinerary_item_id,
        'name', p.name,
        'category', p.category,
        'address', p.address,
        'latitude', p.latitude,
        'longitude', p.longitude,
        'notes', p.notes
      ) order by p.name)
      from public.places p
      where p.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'trip_id', d.trip_id,
        'itinerary_item_id', d.itinerary_item_id,
        'file_name', d.file_name,
        'file_type', d.file_type,
        'category', d.category,
        'is_private', false,
        'created_at', d.created_at
      ) order by d.created_at desc)
      from public.documents d
      where d.trip_id = v_link.trip_id and not d.is_private
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'trip_id', e.trip_id,
        'amount', e.amount,
        'currency', e.currency,
        'category', e.category,
        'date', e.date,
        'notes', e.notes
      ) order by e.date desc)
      from public.expenses e
      where e.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'packing', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'trip_id', p.trip_id,
          'name', p.name,
          'category', p.category,
          'quantity', p.quantity,
          'assigned_to', null,
          'is_shared', p.is_shared,
          'notes', p.notes,
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
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'trip_id', v.trip_id,
        'itinerary_item_id', v.itinerary_item_id,
        'guest_id', v.guest_id,
        'value', v.value,
        'displayName', g.display_name
      ))
      from public.family_votes v
      join public.family_guests g on g.id = v.guest_id
      where v.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'trip_id', c.trip_id,
        'target_type', c.target_type,
        'target_id', c.target_id,
        'guest_id', c.guest_id,
        'body', c.body,
        'created_at', c.created_at,
        'displayName', g.display_name
      ) order by c.created_at desc)
      from public.family_comments c
      join public.family_guests g on g.id = c.guest_id
      where c.trip_id = v_link.trip_id
    ), '[]'::jsonb),
    'emergencyContacts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'trip_id', e.trip_id,
        'name', e.name,
        'relationship', e.relationship,
        'phone', e.phone,
        'notes', e.notes
      ) order by e.name)
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
  v_body text;
begin
  v_body := nullif(trim(p_body), '');

  select * into v_link from public.get_share_link(p_share_token);
  if v_link.id is null or not v_link.allow_comments then
    raise exception 'Comments are not available for this share link.';
  end if;

  if v_body is null or length(v_body) > 1000 then
    raise exception 'Comment must be 1 to 1000 characters.';
  end if;

  if not public.family_comment_target_allowed(v_link.trip_id, p_target_type, p_target_id) then
    raise exception 'Comment target is not available.';
  end if;

  v_guest_id := public.get_or_create_family_guest(p_share_token, p_display_name);

  insert into public.family_comments (trip_id, share_link_id, guest_id, target_type, target_id, body)
  values (v_link.trip_id, v_link.id, v_guest_id, p_target_type, p_target_id, v_body)
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function public.get_family_trip(text, text) to anon, authenticated;
grant execute on function public.add_family_comment(text, text, public.comment_target, uuid, text) to anon, authenticated;
grant execute on function public.cast_family_vote(text, text, uuid, public.vote_value) to anon, authenticated;
grant execute on function public.set_family_packing_check(text, text, uuid, boolean) to anon, authenticated;
