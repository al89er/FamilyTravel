create table public.google_photos_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  provider text not null default 'google_photos',
  google_account_email text,
  scopes text[] not null default '{}',
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_photos_connections_provider_unique unique (owner_user_id, provider),
  constraint google_photos_connections_status_check check (status in ('connected', 'expired', 'revoked', 'error'))
);

create table public.google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  owner_user_id uuid not null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  code_verifier text,
  return_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create trigger google_photos_connections_updated_at before update on public.google_photos_connections for each row execute function public.set_updated_at();

alter table public.google_photos_connections enable row level security;
alter table public.google_oauth_states enable row level security;

-- Client applications cannot read or write to these tables directly. 
-- Only edge functions using the service role key will bypass RLS.
-- Therefore, we do not add any public policies that allow selecting or inserting.
