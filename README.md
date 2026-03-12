# PropTrack

PropTrack is a role-based property maintenance system for tenants, managers, and technicians.

## Documentation Index

- Application Documentation: ./docs/APP_DOCUMENTATION.md
- User Guide: ./docs/USER_GUIDE.md
- End-to-End Testing Guide: ./docs/E2E_TEST_GUIDE.md

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Fill all required values in .env.

3. Apply database schema:

```bash
npx drizzle-kit push
```

4. Seed demo data:

```bash
npx tsx src/db/seed.ts
```

5. Start the app:

```bash
npm run dev
```

Open http://localhost:3000

## Demo Accounts

All seeded users use password: Demo1234!

- Manager: manager@proptrack.io
- Tenant: tenant@proptrack.io
- Tenant: tenant2@proptrack.io
- Technician: tech@proptrack.io
- Technician: tech2@proptrack.io
- Pending Technician: pending@proptrack.io

## Scripts

- Start dev server: npm run dev
- Build: npm run build
- Start prod server: npm run start
- Lint: npm run lint
- Tests: npm run test
- Register Telegram webhook: npm run telegram:set-webhook

## Cron Endpoints

- /api/cron/escalate
- /api/cron/daily-digest

Both require:

```http
Authorization: Bearer <CRON_SECRET>
```

## Telegram Notes

To enable Telegram notifications, configure:

- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- NEXT_PUBLIC_APP_URL

Then run:

```bash
npm run telegram:set-webhook
```

## License

Private project.
