grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid) to authenticated;
grant execute on function public.can_manage_trip(uuid) to authenticated;
grant execute on function public.can_write_trip(uuid) to authenticated;
grant execute on function public.can_create_expense(uuid) to authenticated;
