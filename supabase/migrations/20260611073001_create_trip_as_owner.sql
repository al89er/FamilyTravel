create or replace function public.create_trip_as_owner(
  p_title text,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_timezone text default 'UTC',
  p_currency text default 'USD',
  p_date_format text default 'DD MMM YYYY'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_email text := auth.jwt() ->> 'email';
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if nullif(trim(p_title), '') is null or length(trim(p_title)) > 120 then
    raise exception 'Trip title must be 1 to 120 characters.';
  end if;

  if nullif(trim(p_destination), '') is null or length(trim(p_destination)) > 120 then
    raise exception 'Destination must be 1 to 120 characters.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Trip dates are invalid.';
  end if;

  v_display_name := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Trip owner');

  insert into public.profiles (id, display_name)
  values (v_user_id, v_display_name)
  on conflict (id) do nothing;

  insert into public.trips (
    owner_id,
    title,
    destination,
    start_date,
    end_date,
    timezone,
    currency,
    date_format
  )
  values (
    v_user_id,
    trim(p_title),
    trim(p_destination),
    p_start_date,
    p_end_date,
    coalesce(nullif(trim(p_timezone), ''), 'UTC'),
    upper(coalesce(nullif(trim(p_currency), ''), 'USD')),
    coalesce(nullif(trim(p_date_format), ''), 'DD MMM YYYY')
  )
  returning id into v_trip_id;

  insert into public.trip_members (
    trip_id,
    profile_id,
    user_id,
    role,
    can_add_expenses
  )
  values (
    v_trip_id,
    v_user_id,
    v_user_id,
    'owner',
    true
  );

  return v_trip_id;
end;
$$;

revoke execute on function public.create_trip_as_owner(text, text, date, date, text, text, text) from public, anon;
grant execute on function public.create_trip_as_owner(text, text, date, date, text, text, text) to authenticated;
