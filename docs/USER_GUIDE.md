# PropTrack User Guide

## 1. Introduction

This guide explains how to use PropTrack by role:
- Tenant
- Manager
- Technician

## 2. Login and Access

1. Open the app URL.
2. Click Login.
3. Enter your email and password.
4. You are redirected to your role dashboard automatically.

If your account is PENDING or REJECTED, login is blocked and you are shown status guidance.

## 3. Tenant Guide

### 3.1 Register a Tenant Account

1. Open Register.
2. Choose role Tenant.
3. Enter personal details, building, and unit.
4. Submit.
5. Login immediately after successful registration.

### 3.2 Create a Maintenance Ticket

1. Go to Tenant Dashboard or Tenant Tickets.
2. Click create/new ticket.
3. Fill title, description, category, and priority.
4. Add images if needed.
5. Submit.

What happens next:
- Ticket is created in OPEN state.
- Manager gets notified.
- You get confirmation and can track ticket progress.

### 3.3 Track Ticket Updates

1. Open Tenant Tickets.
2. Select a ticket.
3. Review status, timeline/activity, and updates.

### 3.4 Rate Completed Work

1. Open a ticket in DONE state.
2. Submit rating and optional feedback.
3. Save.

## 4. Manager Guide

### 4.1 Dashboard Overview

Manager dashboard highlights:
- Active ticket count
- Unassigned tickets
- Stalled tickets
- After-hours submissions
- Live ticket feed

### 4.2 Review Technician Registrations

1. Open Manager Registrations.
2. Review pending technician requests.
3. Approve or reject.
4. Add rejection reason when rejecting.

Result:
- Technician account status is updated.
- Technician receives notification.

### 4.3 Assign a Technician to a Ticket

1. Open Manager Tickets.
2. Open target ticket.
3. Choose Assign Technician.
4. Confirm assignment.

If specialty mismatch is detected:
- You must explicitly acknowledge mismatch before assignment completes.

### 4.4 Manage Ticket State

From ticket detail pages, managers can:
- Reopen DONE tickets (reason required)
- Close duplicates by linking to parent ticket
- Monitor blocked tickets and escalations

### 4.5 Configure Building and Rules

From Manager Settings:
- Configure business hours
- Configure escalation rules

## 5. Technician Guide

### 5.1 Register Technician Account

1. Register with role Technician.
2. Wait for manager approval.
3. Login only after account status becomes ACTIVE.

### 5.2 Work Assigned Tickets

1. Open Technician Dashboard or Tasks.
2. Open assigned ticket.
3. Use lifecycle actions:
   - On my way
   - Start job
   - Block (reason required)
   - Unblock (note required)
   - Complete (resolution note + proof images required)

### 5.3 Complete a Ticket Correctly

Before completion, prepare:
- Clear resolution note (detailed)
- Resolution images (required by flow)

Submit completion from task detail page.

## 6. Notifications Guide

Every important event generates in-app notifications.

Optional channels:
- Telegram direct messages
- Discord webhooks (typically manager workflow)

## 7. Connect Telegram Notifications

1. Open your Profile page.
2. Tap Get Connection Code.
3. Open your Telegram bot chat.
4. Send code directly, or /link CODE.
5. Wait for confirmation message.

After successful linking, ticket updates can arrive on Telegram.

## 8. Troubleshooting

### Cannot login

- Confirm correct email/password.
- Check if account is PENDING/REJECTED.
- For technician accounts, ask manager to review registration.

### Not receiving notifications

- Check Notifications page in app first.
- Verify Telegram is connected in profile.
- Verify manager Discord webhook if using Discord channel.

### Ticket action is blocked

- Some actions are role-limited.
- Some transitions require current status (for example, complete is valid from IN_PROGRESS).
- Some transitions require reason/note fields.

## 9. Demo Accounts (Seeded)

Default seeded password:
- Demo1234!

Example users:
- Manager: manager@proptrack.io
- Tenant: tenant@proptrack.io
- Tenant: tenant2@proptrack.io
- Technician: tech@proptrack.io
- Technician: tech2@proptrack.io
- Pending Technician: pending@proptrack.io
