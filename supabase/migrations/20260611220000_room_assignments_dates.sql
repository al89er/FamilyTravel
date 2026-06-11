-- Add check_in_date and check_out_date to family_room_assignments
-- These columns are nullable so existing rows remain valid.

alter table public.family_room_assignments
  add column if not exists check_in_date  date,
  add column if not exists check_out_date date;
