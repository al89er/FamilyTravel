insert into public.profiles (id, display_name, allergies, medications)
values
  ('00000000-0000-0000-0000-000000000001', 'Aisha Planner', 'Peanuts', 'Antihistamine as needed'),
  ('00000000-0000-0000-0000-000000000002', 'Omar', null, null),
  ('00000000-0000-0000-0000-000000000003', 'Grandma', 'Shellfish', 'Blood pressure medication')
on conflict (id) do update set
  display_name = excluded.display_name,
  allergies = excluded.allergies,
  medications = excluded.medications;

insert into public.trips (
  id,
  owner_id,
  title,
  destination,
  start_date,
  end_date,
  timezone,
  currency,
  date_format,
  default_visibility,
  hotel_info,
  emergency_summary,
  estimated_budget
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Bali Family Trip',
  'Bali, Indonesia',
  '2026-08-14',
  '2026-08-20',
  'Asia/Makassar',
  'MYR',
  'DD MMM YYYY',
  'shared',
  'Sunrise Nusa Dua Resort, two connecting rooms, check-in 3:00 PM.',
  'Dial 112 for local emergency services. Keep passports and insurance copies in Documents.',
  9800
)
on conflict (id) do update set title = excluded.title;

insert into public.trip_members (id, trip_id, profile_id, role, can_add_expenses)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member', true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'viewer', false)
on conflict (trip_id, profile_id) do update set role = excluded.role, can_add_expenses = excluded.can_add_expenses;

insert into public.itinerary_items (
  id, trip_id, date, start_time, end_time, title, category, location_name, address, notes,
  estimated_cost, booking_reference, visibility, sort_order, created_by
)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-08-14', '09:15', '12:20', 'Flight to Denpasar', 'flight', 'Kuala Lumpur International Airport', 'Sepang, Selangor', 'Arrive at airport three hours early.', 2800, 'FAM-BALI-2026', 'shared', 1, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-08-15', '10:00', '14:00', 'Ubud Monkey Forest and lunch', 'activity', 'Sacred Monkey Forest Sanctuary', 'Ubud, Gianyar Regency', 'Keep snacks zipped away and bring water.', 520, null, 'shared', 2, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2026-08-16', '16:30', '20:00', 'Jimbaran seafood dinner', 'food', 'Jimbaran Bay', 'Jimbaran Beach', 'Book a table facing the beach.', 760, null, 'shared', 3, '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set title = excluded.title;

insert into public.places (id, trip_id, itinerary_item_id, name, category, address, notes, created_by)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, 'Sunrise Nusa Dua Resort', 'hotel', 'Nusa Dua, Bali', 'Ask for baby cot and late checkout.', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', null, 'BIMC Hospital Nusa Dua', 'hospital', 'Kawasan ITDC Blok D, Nusa Dua', 'International clinic with 24-hour emergency service.', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Jimbaran Bay', 'restaurant', 'Jimbaran Beach', 'Sunset seafood dinner area.', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name;

insert into public.documents (id, trip_id, file_name, file_type, category, uploaded_by, storage_path, is_private)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'family-flight-tickets.pdf', 'application/pdf', 'flight_ticket', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/family-flight-tickets.pdf', false),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'travel-insurance.pdf', 'application/pdf', 'insurance', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/private/travel-insurance.pdf', true)
on conflict (id) do update set file_name = excluded.file_name;

insert into public.expenses (id, trip_id, amount, currency, category, paid_by, date, notes, created_by)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2800, 'MYR', 'Flights', '00000000-0000-0000-0000-000000000001', '2026-06-10', 'Round trip tickets.', '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1450, 'MYR', 'Hotel', '00000000-0000-0000-0000-000000000002', '2026-06-11', 'Deposit.', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set amount = excluded.amount;

insert into public.expense_splits (expense_id, profile_id)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.packing_items (id, trip_id, name, category, quantity, assigned_to, is_shared, notes, created_by)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Passports', 'Documents', 3, null, true, 'Keep originals in carry-on.', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Swimwear', 'Clothing', 3, '00000000-0000-0000-0000-000000000002', false, null, '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Allergy medicine', 'Medical', 1, '00000000-0000-0000-0000-000000000001', false, null, '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name;

insert into public.packing_item_checks (packing_item_id, profile_id)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.votes (id, trip_id, itinerary_item_id, profile_id, value)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'must_do'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'interested')
on conflict (itinerary_item_id, profile_id) do update set value = excluded.value;

insert into public.comments (id, trip_id, target_type, target_id, profile_id, body)
values
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'trip', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Can we keep one free afternoon for the pool?')
on conflict (id) do update set body = excluded.body;

insert into public.emergency_contacts (id, trip_id, name, relationship, phone, notes, created_by)
values
  ('91000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Malaysia Embassy Jakarta', 'Embassy', '+62 21 5224947', 'For passport or consular support.', '00000000-0000-0000-0000-000000000001'),
  ('91000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Bali Driver Wayan', 'Local driver', '+62 812 0000 0000', 'Airport pickup and day tours.', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name;

insert into public.travel_insurance (id, trip_id, provider, policy_number, emergency_phone, notes, created_by)
values (
  '92000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'SafeTrip Insurance',
  'ST-BALI-2026-8891',
  '+60 3 0000 0000',
  'Covers outpatient clinic, hospital admission, and trip interruption.',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set provider = excluded.provider;

insert into public.family_medical_notes (id, trip_id, profile_id, allergies, medications, notes, visible_to_owner)
values
  ('93000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Peanuts', 'Antihistamine as needed', 'Carry medicine in hand luggage.', true),
  ('93000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Shellfish', 'Blood pressure medication', 'Keep clinic details handy.', true)
on conflict (trip_id, profile_id) do update set allergies = excluded.allergies, medications = excluded.medications, notes = excluded.notes;
