# Eduverse Frontend

Frontend application for Eduverse, built with Next.js App Router.

This repository contains the user interface for:

- authentication entry and callback handling
- dashboard and classroom views
- chat experience
- file upload and indexing controls

It communicates with the backend API for all business logic and data persistence.

## Repository

Primary frontend repository:

- https://github.com/Surendra-vishnoi/frontend_eduverse

Related backend repository:

- https://github.com/Surendra-vishnoi/Eduverse

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI component primitives

## Frontend Scope

This project owns UI and client orchestration. It does not own backend business logic.

Owned here:

- routing, pages, and layouts
- cookie-session orchestration and auth state hydration
- API client wrappers and request retry behavior
- optimistic and cached UI state for classrooms/files/chat

Owned by backend:

- Google OAuth token exchange and validation
- JWT issuance and cookie refresh policy
- database persistence
- indexing pipeline and retrieval logic

## Architecture Summary

1. Browser UI calls frontend API utilities in `lib/api.ts`.
2. Browser requests go to Next proxy route `/api/proxy/*` with `credentials: include`.
3. Proxy forwards cookies (and CSRF header when present) to backend URL from env.
4. Backend handles auth, classroom sync, indexing, and chat inference.
5. Frontend renders and updates state from backend responses.

## Quick Start

### Prerequisites

- Node.js 20+ recommended
- npm
- Running Eduverse backend instance

### Install

```bash
npm install
```

### Configure Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set values:

- `NEXT_PUBLIC_BACKEND_URL`: backend URL for browser-side calls
- `BACKEND_URL`: optional server-side override for Next route handlers
- `BFF_BACKEND_SESSION_COOKIE_NAME` (optional): cookie name used for backend OAuth state handoff (`session` by default)

If `BACKEND_URL` is not set, server handlers fall back to `NEXT_PUBLIC_BACKEND_URL`.

Backend OAuth setting required for this flow:

- `GOOGLE_REDIRECT_URI` must point to frontend callback route: `https://<frontend-domain>/api/auth/callback`

### Run

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

## Main User Routes

- `/` - landing page
- `/login` - sign-in entry
- `/register` - sign-up entry
- `/callback` - auth callback completion
- `/dashboard` - main dashboard
- `/classrooms` - classroom list
- `/classrooms/[id]` - classroom detail
- `/chat` - tutor chat

## Key Internal Modules

- `lib/api.ts`
  - typed API client
  - cookie-based request flow and refresh-on-401 behavior
  - CSRF header injection for mutating requests
  - exported domain APIs (`authApi`, `classroomApi`, `filesApi`, `indexingApi`, `chatApi`)
- `lib/auth-context.tsx`
  - auth provider and user session hydration
- `app/api/auth/login/route.ts`
  - starts OAuth via backend and stores backend OAuth session cookie on frontend origin
- `app/api/auth/callback/route.ts`
  - exchanges Google callback code with backend server-side and relays auth cookies
- `app/api/proxy/[...path]/route.ts`
  - backend proxy route that forwards cookies, CSRF header, and backend `Set-Cookie`
- `next.config.mjs`
  - CSP and baseline browser security headers

## Auth Handling in This Frontend

This frontend triggers login and completes callback state, but credential authority is backend-owned.

- Frontend starts OAuth at `/api/auth/login`
- Frontend callback route `/api/auth/callback` calls backend `/auth/callback` server-side
- Backend callback sets HttpOnly auth cookies (`access` + `refresh`) and a readable CSRF cookie
- Frontend callback route relays those cookies back on frontend origin
- Frontend completes sign-in by calling `/auth/me` and hydrating user context
- Frontend sends cookie credentials on all API calls
- Frontend sends `X-CSRF-Token` (from CSRF cookie) on `POST`, `PUT`, `PATCH`, `DELETE`
- Frontend attempts backend `/auth/refresh` on `401` and retries once

## Security Integration Notes

- Authentication is cookie-only for browser flows (no bearer token persistence for auth).
- Session continuity relies on backend-set cookies and proxy `Set-Cookie` forwarding.
- CSRF uses double-submit token enforcement with `X-CSRF-Token`.
- Global headers are set via Next config (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`).

For successful integration with backend deployment:
- Keep `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_URL` aligned to the same backend origin.
- Configure backend `GOOGLE_REDIRECT_URI` as `https://<frontend-domain>/api/auth/callback`.
- Ensure backend `BACKEND_CORS_ORIGINS` includes your frontend domain.
- Use HTTPS in production so secure cookies are consistently set and sent.

## Project Structure

```text
app/
  (auth)/
    callback/
    login/
    register/
    token-login/
  (dashboard)/
    chat/
    classrooms/
    dashboard/
  api/
    auth/callback/
    proxy/[...path]/
  layout.tsx
  page.tsx

components/
  ui/
  sidebar.tsx
  theme-provider.tsx

lib/
  api.ts
  auth-context.tsx
  utils.ts
```

## Backend Dependency

This frontend requires a reachable Eduverse backend URL and matching OAuth/backend configuration.
