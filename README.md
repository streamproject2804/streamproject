# SteamGuard Boiler Management — Authentication Foundation

Responsive boiler-operations dashboard with Supabase authentication and role-security foundation.

## Supabase setup

1. Open Supabase Dashboard → SQL Editor.
2. Run `supabase/schema.sql` once.
3. Open Authentication → Users and create the first administrator account.
4. Run this in SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## Environment variables

Copy `.env.example` to `.env.local` and add:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Add the same two variables in Vercel → Project Settings → Environment Variables.
Never add a Supabase secret key, service-role key, or database password to frontend code.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

This phase includes email/password authentication, persistent sessions, secure sign-out, Admin/Supervisor/Operator/Technician profiles, Admin navigation protection, Row Level Security, and an audit-log foundation. Operational modules still use demonstration data until the next database phase.

## Phase 3: real-time boiler monitoring

After completing the first schema, run `supabase/phase-3-boiler-monitoring.sql` once.
It creates three 1-ton fire-tube boilers, shared operator IN/OUT attendance,
Running/Off controls, Realtime subscriptions, and promotes
`muthusubasri@gmail.com` as the main administrator.

## Phase 4: workforce and operations

Run `supabase/phase-4-operations.sql` once after Phase 3. This adds:

- One active worker assignment per boiler
- Shared realtime Shift A/B/C selection
- Worker IN/OUT attendance
- Assigned-boiler status permissions
- Shift handover records
- Maintenance work records
- Incident reporting
- Document links
- Live report totals
- Pending-item checklist submission

SteamGuard supports operational record management. It does not replace certified boiler controls, alarms, safety interlocks, PLC systems, safety valves, emergency shutdown systems, manufacturer instructions, or approved operating procedures.
