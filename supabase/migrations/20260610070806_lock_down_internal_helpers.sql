revoke execute on function public.is_trip_member(uuid) from public, anon, authenticated;
revoke execute on function public.trip_role(uuid) from public, anon, authenticated;
revoke execute on function public.can_manage_trip(uuid) from public, anon, authenticated;
revoke execute on function public.can_write_trip(uuid) from public, anon, authenticated;
revoke execute on function public.can_create_expense(uuid) from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
