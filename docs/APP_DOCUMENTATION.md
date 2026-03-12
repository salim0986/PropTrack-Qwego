# PropTrack Application Documentation

## 1. Overview

PropTrack is a role-based property maintenance platform for:
- Tenants to submit and track maintenance issues
- Managers to triage, assign, and monitor work
- Technicians to execute and update tasks with proof of completion

The app is mobile-first, full-stack Next.js, and uses Drizzle ORM with PostgreSQL.

## 2. Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Auth: NextAuth v5 (credentials provider, JWT sessions)
- Database: PostgreSQL (Supabase-hosted recommended)
- ORM: Drizzle ORM + drizzle-kit
- Storage: Supabase Storage (ticket images)
- Notifications:
  - In-app notifications (database-backed)
  - Telegram Bot API (optional)
  - Discord webhooks (optional)
- Background Jobs: Vercel cron endpoints
- Testing: Vitest + React Testing Library

## 3. Project Structure

- src/app: App Router pages and API routes
- src/components: UI and feature components
- src/db: Drizzle schema, DB client, and seed script
- src/lib: auth, notification, utility, validation, and integration logic
- tests: unit and integration tests
- scripts: helper scripts (for example, Telegram webhook setup)
- docs: project documentation and guides

## 4. Roles and Access Model

User roles:
- TENANT
- MANAGER
- TECHNICIAN

Account status:
- ACTIVE
- PENDING
- REJECTED

Rules:
- Manager accounts are seeded only (cannot self-register).
- Tenant accounts become ACTIVE immediately after valid registration.
- Technician accounts are created as PENDING and require manager approval.
- PENDING/REJECTED users are blocked at login and redirected to pending flow.

Route protection:
- Middleware enforces auth and role routes.
- Public: /login, /register, /pending
- Role areas:
  - /tenant/*
  - /manager/*
  - /technician/*

## 5. Core Domain Model

Main tables:
- users
- buildings
- tickets
- ticket_images
- activity_logs
- notifications
- registration_requests
- telegram_verifications
- ticket_ratings
- escalation_rules

Notable relations:
- users <-> buildings has two explicit relation paths:
  - resident relation via users.buildingId
  - manager relation via buildings.managerId
- tickets relate to tenant user, technician user, and building
- notifications are always persisted in DB first

## 6. Ticket Lifecycle

Ticket statuses:
- OPEN
- ASSIGNED
- IN_PROGRESS
- BLOCKED
- DONE
- REOPENED
- CLOSED_DUPLICATE

Typical flow:
1. Tenant creates ticket (OPEN)
2. Manager assigns technician (ASSIGNED)
3. Technician starts work (IN_PROGRESS)
4. Technician can block/unblock with required reason/note
5. Technician completes with required resolution note + 1-3 image URLs (DONE)
6. Manager can reopen DONE tickets with a required reason

## 7. Notifications

sendNotification behavior:
1. Always writes an in-app notification record to notifications table
2. Then fan-outs to optional channels:
   - Telegram if user.telegramChatId exists
   - Discord if user.discordWebhook exists

This guarantees in-app delivery even if external channels fail.

## 8. Telegram Integration

Endpoints:
- POST /api/telegram/connect
  - Auth required
  - Generates a 6-digit verification code (10-minute validity)
  - Replaces old pending code for the same user
- POST /api/telegram/webhook
  - Validates x-telegram-bot-api-secret-token against TELEGRAM_WEBHOOK_SECRET
  - Processes bot messages and links code to user.telegramChatId

Bot linking flow:
1. User requests connection code from profile
2. User sends code to bot (or /link CODE)
3. System validates code and TTL
4. telegramChatId is saved to user record

Webhook setup script:
- npm run telegram:set-webhook
- Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL
- Registers webhook at /api/telegram/webhook

## 9. Cron Jobs

Configured in vercel.json:
- /api/cron/escalate every 30 minutes
- /api/cron/daily-digest at 08:00 weekdays

Security:
- Both endpoints require Authorization: Bearer <CRON_SECRET>

Purpose:
- Escalate stale or urgent unassigned tickets
- Send managers a daily digest summary

## 10. Environment Variables

Required core variables:
- DATABASE_URL
- NEXTAUTH_URL
- AUTH_SECRET
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET

Optional (feature dependent):
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- NEXT_PUBLIC_APP_URL

See .env.example for the current canonical list.

## 11. Local Setup

1. Install dependencies:
   - npm install
2. Configure environment:
   - copy .env.example to .env
   - fill all required values
3. Apply database schema:
   - npx drizzle-kit push
4. Seed demo data:
   - npx tsx src/db/seed.ts
5. Start app:
   - npm run dev

## 12. Build, Lint, and Tests

- Lint: npm run lint
- Unit and integration tests: npm run test
- Production build: npm run build
- Production serve: npm run start

## 13. Deployment Notes

- Recommended hosting: Vercel for app + cron, Supabase for PostgreSQL and storage.
- Ensure all production env vars are configured in deployment platform.
- Telegram webhook URL must point to public app URL.
- Keep CRON_SECRET private and rotate if exposed.

## 14. Known Operational Note

Next.js 16 logs a deprecation warning for middleware naming. The app currently works, but migration to the new proxy convention should be scheduled to stay aligned with framework direction.
