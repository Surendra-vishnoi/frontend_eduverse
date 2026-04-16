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

Note: There is another similarly named frontend in the workspace. This README is for this repository only.

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
- local auth/token state management
- API client wrappers and request retry behavior
- optimistic and cached UI state for classrooms/files/chat

Owned by backend:

- Google OAuth token exchange and validation
- JWT issuance and refresh policy
- database persistence
- indexing pipeline and retrieval logic

## Architecture Summary

1. Browser UI calls frontend API utilities in `lib/api.ts`.
2. Browser requests go to Next proxy route `/api/proxy/*`.
3. Proxy forwards to backend URL from env.
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

If `BACKEND_URL` is not set, server handlers fall back to `NEXT_PUBLIC_BACKEND_URL`.

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
  - token helpers and refresh-on-401 behavior
  - exported domain APIs (`authApi`, `classroomApi`, `filesApi`, `indexingApi`, `chatApi`)
- `lib/auth-context.tsx`
  - auth provider and user session hydration
- `app/api/proxy/[...path]/route.ts`
  - backend proxy route for browser requests

## Auth Handling in This Frontend

This frontend triggers login and processes callback state, but credential authority is backend-owned.

- Frontend initiates redirect to backend `/auth/login`
- Frontend stores backend-issued access/refresh tokens in local storage
- Frontend sends `Authorization` header on API calls
- Frontend attempts backend `/auth/refresh` when access token expires

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
