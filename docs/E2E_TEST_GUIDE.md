# PropTrack End-to-End Testing Guide

## 1. Purpose

This guide verifies the full application workflow across tenant, manager, technician, notifications, and cron behavior.

## 2. Test Environment Setup

### 2.1 Prerequisites

- Node.js 20+
- PostgreSQL reachable via DATABASE_URL
- Supabase project configured for storage
- Optional for Telegram tests:
  - Telegram bot token
  - Public URL (for webhook), for example ngrok

### 2.2 Install and Configure

1. Install dependencies:
   - npm install
2. Configure environment:
   - copy .env.example to .env
   - set required variables
3. Push schema:
   - npx drizzle-kit push
4. Seed demo data:
   - npx tsx src/db/seed.ts
5. Start app:
   - npm run dev

### 2.3 Optional: Telegram Webhook Setup

1. Set NEXT_PUBLIC_APP_URL to your public base URL.
2. Run:
   - npm run telegram:set-webhook
3. Confirm script reports successful registration.

## 3. Baseline Quality Gates

Run before manual E2E:
- npm run lint
- npm run test
- npm run build

Expected:
- Lint passes (or only accepted warnings)
- Tests pass
- Build succeeds

## 4. E2E Scenarios

Use separate browser sessions for each role where possible.

### Scenario A: Tenant Registration and Ticket Creation

1. Register a new tenant account.
2. Login as tenant.
3. Create a new ticket with category, priority, and description.
4. Attach optional image(s).
5. Submit.

Expected:
- Ticket appears in tenant ticket list.
- Ticket status is OPEN.
- Manager receives notification of new ticket.

### Scenario B: Technician Registration Approval Flow

1. Register a new technician account.
2. Try logging in as this technician.
3. Confirm pending/blocked access behavior.
4. Login as manager.
5. Open registrations page.
6. Approve the pending technician.
7. Login again as technician.

Expected:
- Pre-approval login is blocked for technician.
- Post-approval login succeeds.
- Technician receives approval notification.

### Scenario C: Manager Assignment and Mismatch Handling

1. Login as manager.
2. Open an OPEN ticket.
3. Assign a technician with matching specialty.
4. Assign another ticket with intentionally mismatched specialty.
5. Confirm mismatch acknowledgement prompt and proceed.

Expected:
- Ticket status becomes ASSIGNED.
- Assigned technician receives notification.
- Mismatch assignment requires explicit acknowledgement.

### Scenario D: Technician Work Lifecycle

1. Login as assigned technician.
2. Open assigned task.
3. Trigger On my way.
4. Start job.
5. Block with reason.
6. Unblock with note.
7. Complete with resolution note and proof image URLs.

Expected:
- Status transitions are enforced correctly.
- Block/unblock require mandatory text.
- Completion requires proof inputs.
- Tenant and manager receive status notifications.

### Scenario E: Manager Reopen Flow

1. Login as manager.
2. Open a DONE ticket.
3. Reopen with reason.

Expected:
- Ticket moves to REOPENED and re-enters active workflow.
- Technician and tenant are notified about dispute/reopen.

### Scenario F: Tenant Rating Flow

1. Login as tenant with completed ticket.
2. Open completed ticket.
3. Submit rating and optional comment.

Expected:
- Rating record is created.
- Ticket history reflects rating action.

### Scenario G: Telegram Linking and Delivery (Optional)

1. Login as any user.
2. Open profile and generate Telegram connection code.
3. Send code to bot using plain code or /link CODE.
4. Trigger a notification event for that user.

Expected:
- Bot confirms account linked.
- user.telegramChatId is populated.
- Subsequent events are delivered to Telegram.

### Scenario H: Cron Endpoint Verification

Use CRON_SECRET bearer token.

1. Call /api/cron/escalate with Authorization header.
2. Call /api/cron/daily-digest with Authorization header.

Expected:
- Unauthorized without token.
- Authorized calls return summary payload.
- Eligible managers receive notifications.

## 5. API-Level Smoke Checks (Optional)

Use curl/Postman and authenticated sessions where required:
- POST /api/auth/register
- PATCH /api/registrations/{id}
- PATCH /api/tickets/{id}/assign
- PATCH /api/tickets/{id}/status
- POST /api/telegram/connect
- POST /api/telegram/webhook

Validate response codes, permissions, and side effects.

## 6. Database Verification Checklist

After running scenarios, verify:
- users status transitions are correct
- registration_requests updated with reviewedBy/reviewedAt
- tickets status reflects lifecycle actions
- activity_logs records were created for key actions
- notifications records exist for each major event
- telegram_verifications entries are consumed after successful linking

## 7. Exit Criteria for Release

Ship readiness for E2E should require:
- Quality gates pass (lint/test/build)
- All critical scenarios (A-F) pass
- Optional channels tested if enabled (Telegram/Discord)
- No role-bypass, status-transition, or data-consistency defects

## 8. Common Failure Patterns

- Missing env vars cause auth or integration failures
- CRON_SECRET mismatch causes unauthorized cron calls
- Telegram webhook secret mismatch causes webhook 401
- Invalid status transition attempts return validation errors by design

## 9. Quick Regression Suite (Fast Pass)

Run this short suite after each major change:
1. Tenant creates ticket
2. Manager assigns technician
3. Technician starts and completes
4. Tenant rates
5. Manager approves one pending technician
6. Build + tests pass
