# Family Travel Companion

A production-ready mobile-first PWA foundation for planning family trips, sharing itineraries, managing documents, tracking expenses, coordinating packing, collecting votes, and keeping emergency details available offline.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Realtime-ready schema, Storage
- PWA install support with offline shell/data cache
- Cloudflare Pages deployment

## Features

- Two access modes: admin username/password and no-login family share links
- Trip dashboard with countdown, hotel info, emergency summary, budget status, and quick actions
- Shared itinerary with timeline/day grouping, categories, booking references, votes, and comments summary
- Map places module with provider-ready placeholder abstraction
- Documents vault metadata with Supabase Storage bucket and RLS policies
- Expense tracker with category totals and balance summary
- Shared and personal packing lists with per-person checked state
- Family voting, comments, and packing checks through share-token RPCs
- Emergency contacts, insurance, nearby hospitals, and private-aware medical notes
- Trip settings for currency, timezone, date format, default visibility, and member permissions
- Demo Bali Family Trip data in app and Supabase seed SQL

## Local Setup

Install dependencies:

```powershell
npm install
```

Create local environment:

```powershell
Copy-Item .env.example .env.local
```

Set:

```text
VITE_SUPABASE_URL=https://izbuhrfevmmaeqgzilhw.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase anon key
```

Run the app:

```powershell
npm run dev
```

Build and type-check:

```powershell
npm run build
```

## Supabase

This repo is linked to project ref:

```text
izbuhrfevmmaeqgzilhw
```

Apply the schema to the linked project:

```powershell
npx.cmd supabase db push
```

For local Supabase development:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
```

The schema lives in:

```text
supabase/migrations/20260610054617_family_travel_schema.sql
```

Demo seed data lives in:

```text
supabase/seed.sql
```

## Access Model

### Admin

1. Enable the Email provider with password sign-in.
2. Disable public signups so only you create admin accounts.
3. Create your user manually in Supabase Auth.
4. For username-style login, create your Auth user email as `<username>@familytravel.local`, or change `VITE_AUTH_USERNAME_DOMAIN`.
5. Add a matching row in `public.profiles` using your Auth user UUID.

Example admin-created account:

```text
Username shown in app: afif
Supabase Auth email: afif@familytravel.local
```

Admins can also type a full email address in the username field.

### Family

Family members do not need Supabase Auth accounts. They open a shared URL, enter their display name, and use a share token.

Example:

```text
http://localhost:5174/?share=bali-family-2026
```

Create a share token for a real trip:

```sql
insert into public.trip_share_links (
  trip_id,
  token,
  label,
  allow_comments,
  allow_votes,
  allow_packing_checks
)
values (
  '<trip-id>',
  'your-private-family-token',
  'Family share link',
  true,
  true,
  true
);
```

Family RPCs:

- `get_family_trip(share_token, display_name)`
- `add_family_comment(share_token, display_name, target_type, target_id, body)`
- `cast_family_vote(share_token, display_name, itinerary_item_id, value)`
- `set_family_packing_check(share_token, display_name, packing_item_id, checked)`

Family users only receive shared itinerary items, shared document metadata, places, expenses, packing lists, comments, votes, and emergency contacts. Private documents, storage paths, medical notes, and admin-only insurance details are not exposed through the family RPC.

## Storage

The migration creates a private bucket:

```text
trip-documents
```

Document object access is controlled by RLS policies that check trip membership and the matching row in `public.documents`.

## Cloudflare Pages Deployment

Use these settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20`

Add Cloudflare Pages environment variables:

```text
VITE_SUPABASE_URL=https://izbuhrfevmmaeqgzilhw.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase anon key
VITE_MAP_PROVIDER_KEY=
```

After the first deploy, copy the Cloudflare Pages URL and add it to Supabase Auth redirect URLs.

## Data Model Highlights

- `trip_members` controls authenticated admin access
- `trip_share_links` controls no-login family access
- Admin can manage trip, itinerary, members, emergency info, documents, and settings
- Family users can view shared data and optionally comment, vote, and check packing items
- Private document metadata is visible only to owners or uploader
- Medical notes are visible to the person and optionally to trip owners

## Future Integration Points

- Replace the map placeholder with Google Maps or Mapbox using `VITE_MAP_PROVIDER_KEY`
- Add Realtime subscriptions for itinerary, comments, votes, expenses, and packing checks
- Add offline write queue after conflict rules are finalized
- Add AI assistant after core planner workflows are stable
