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
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tm.id,
        'trip_id', tm.trip_id,
        'user_id', tm.user_id,
        'profile_id', tm.profile_id,
        'role', tm.role,
        'can_add_expenses', tm.can_add_expenses,
        'profile', jsonb_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url
        )
      ) order by p.display_name)
      from public.trip_members tm
      join public.profiles p on p.id = tm.profile_id
      where tm.trip_id = v_link.trip_id
    ), '[]'::jsonb),
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
        'visibility', p.visibility,
        'notes', p.notes
      ) order by coalesce(i.date, '9999-12-31'::date), coalesce(i.sort_order, 9999), p.name)
      from public.places p
      left join public.itinerary_items i on i.id = p.itinerary_item_id
      where p.trip_id = v_link.trip_id
        and p.visibility = 'shared'
        and (p.itinerary_item_id is null or i.visibility = 'shared')
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
      where p.trip_id = v_link.trip_id and p.is_shared
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
    ), '[]'::jsonb),
    'roomAssignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'trip_id', r.trip_id,
        'itinerary_item_id', r.itinerary_item_id,
        'hotel_name', r.hotel_name,
        'check_in_date', r.check_in_date,
        'check_out_date', r.check_out_date,
        'room_number', r.room_number,
        'guest_ids', r.guest_ids,
        'notes', r.notes,
        'created_at', r.created_at
      ) order by r.hotel_name, r.room_number)
      from public.family_room_assignments r
      left join public.itinerary_items i on i.id = r.itinerary_item_id
      where r.trip_id = v_link.trip_id
        and (r.itinerary_item_id is null or i.visibility = 'shared')
    ), '[]'::jsonb),
    'flightSeatAssignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'trip_id', s.trip_id,
        'itinerary_item_id', s.itinerary_item_id,
        'flight_label', s.flight_label,
        'guest_id', s.guest_id,
        'guest_name', s.guest_name,
        'seat_number', s.seat_number,
        'notes', s.notes,
        'created_at', s.created_at
      ) order by s.flight_label, s.seat_number)
      from public.family_flight_seat_assignments s
      left join public.itinerary_items i on i.id = s.itinerary_item_id
      where s.trip_id = v_link.trip_id
        and (s.itinerary_item_id is null or i.visibility = 'shared')
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_family_trip(text, text) to anon, authenticated;
