# MarketIntel — Google Cloud Deployment

AI-powered business location intelligence and retail lead generation, running on Google Cloud (Compute Engine VM) instead of Supabase. Built for the Google Cloud AI Builder Cup 2026 (Retail & Commerce track).

## Architecture

```
web/            React 18 + TypeScript SPA (Vite), served by nginx
                nginx reverse-proxies /rest/v1, /auth/v1, /functions/v1
                so the existing @supabase/supabase-js client works unmodified
                against a self-hosted backend.

api/            Deno service: a minimal GoTrue-compatible auth shim
                (signup/login/refresh/logout/user) plus the four AI /
                Google Maps functions ported from the original
                Supabase Edge Functions — now calling Gemini and the
                Google Places/Maps/Routes APIs directly.

db/             PostgreSQL schema with Row-Level Security. Two distinct
                roles: marketintel_admin (schema owner) and
                marketintel_app (what PostgREST and the API connect as —
                deliberately NOT the owner, since Postgres table owners
                bypass RLS by default).

docker-compose.yml   Wires up postgres + postgrest + api + web.
```

## Why this replatform

The original prototype ran on Supabase (Postgres + Auth + Edge Functions) behind a Lovable-hosted frontend. This repo is a from-scratch re-implementation of the same product on Google Cloud infrastructure, using PostgREST (the same REST engine Supabase itself uses) so the frontend's data-access code needed no rewrite — only its two integration points (`src/integrations/supabase/client.ts` and the Gemini/Places API calls) point at new, self-hosted endpoints.

## Running it

1. Copy `.env.example` to `.env` and fill in real values (Gemini API key, Google Places API key, generated passwords/JWT secret, and `PUBLIC_URL` for your VM's external IP or domain).
2. `docker compose --env-file .env up -d --build`

## What's deployed vs. what's on the roadmap

- Core flow working end-to-end: natural-language business input → Gemini parsing → geocoding → live Google Places competitor/traffic signals → Gemini-written investment report — all against this self-hosted stack.
- Auth and per-user data isolation verified via PostgreSQL RLS (not just application-level checks).
- Reference datasets (BPS commodity spending, population) imported from the original public dataset export.
- Payment/subscription gating (Midtrans) intentionally out of scope for this submission.
