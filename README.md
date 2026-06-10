# Family Travel Companion

A production-ready mobile-first PWA foundation for planning family trips, sharing itineraries, managing documents, tracking expenses, coordinating packing, collecting votes, and keeping emergency details available offline.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Realtime-ready schema, Storage
- PWA install support with offline shell/data cache
- Cloudflare Pages deployment

## Features

- Email magic-link auth and Google OAuth wiring through Supabase
- Trip dashboard with countdown, hotel info, emergency summary, budget status, and quick actions
- Shared itinerary with timeline/day grouping, categories, booking references, votes, and comments summary
- Map places module with provider-ready placeholder abstraction
- Documents vault metadata with Supabase Storage bucket and RLS policies
- Expense tracker with category totals and balance summary
- Shared and personal packing lists with per-person checked state
- Family voting and comments data model
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

## Auth Setup

In Supabase Dashboard:

1. Enable email provider for magic-link login.
2. Enable Google provider if you want Google login.
3. Add local redirect URL: `http://localhost:5173`.
4. Add production redirect URL after Cloudflare Pages deploys.

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

- `trip_members` controls roles: `owner`, `member`, `viewer`
- Owner can manage trip, itinerary, members, emergency info, and settings
- Member can comment, vote, check packing items, and add expenses when permitted
- Viewer gets read-only access
- Private document metadata is visible only to owners or uploader
- Medical notes are visible to the person and optionally to trip owners

## Future Integration Points

- Replace the map placeholder with Google Maps or Mapbox using `VITE_MAP_PROVIDER_KEY`
- Add Realtime subscriptions for itinerary, comments, votes, expenses, and packing checks
- Add offline write queue after conflict rules are finalized
- Add AI assistant after core planner workflows are stable
