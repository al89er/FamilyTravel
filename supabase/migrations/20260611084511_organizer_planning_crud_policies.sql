drop policy if exists "expenses owners or creator update" on public.expenses;
create policy "expenses organizers update" on public.expenses
for update
using (public.can_write_trip(trip_id))
with check (public.can_write_trip(trip_id));

drop policy if exists "expenses owners or creator delete" on public.expenses;
create policy "expenses organizers delete" on public.expenses
for delete
using (public.can_write_trip(trip_id));

drop policy if exists "expense splits expense writers" on public.expense_splits;
create policy "expense splits organizers manage" on public.expense_splits
for all
using (exists (
  select 1 from public.expenses e
  where e.id = expense_id and public.can_write_trip(e.trip_id)
))
with check (exists (
  select 1 from public.expenses e
  where e.id = expense_id and public.can_write_trip(e.trip_id)
));

drop policy if exists "emergency contacts owners write" on public.emergency_contacts;
create policy "emergency contacts organizers write" on public.emergency_contacts
for all
using (public.can_write_trip(trip_id))
with check (public.can_write_trip(trip_id));

drop policy if exists "travel insurance owners write" on public.travel_insurance;
create policy "travel insurance organizers write" on public.travel_insurance
for all
using (public.can_write_trip(trip_id))
with check (public.can_write_trip(trip_id));

create policy "medical notes organizers write" on public.family_medical_notes
for all
using (public.can_write_trip(trip_id))
with check (public.can_write_trip(trip_id));
