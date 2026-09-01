# SteamGuard Phase 7

## Install order

1. Upload all Phase 7 project files to the GitHub repository, preserving folders.
2. In Supabase SQL Editor, open `supabase/phase-7-runtime-history.sql`, copy its complete contents, and run it once.
3. Redeploy the latest GitHub commit in Vercel.

## Verify the main administrator

Run this query in Supabase SQL Editor:

```sql
select p.email, p.role, p.is_active, p.approval_status,
       u.email_confirmed_at, u.last_sign_in_at
from public.profiles p
left join auth.users u on u.id = p.id
where lower(p.email) = lower('muthusubasri@gmail.com');
```

Expected profile values: `admin`, `true`, `approved`.

If the account exists but the profile values are incorrect, run:

```sql
update public.profiles
set role = 'admin', is_active = true, approval_status = 'approved'
where lower(email) = lower('muthusubasri@gmail.com');
```

## Runtime behavior

- Changing Off to Running creates an open runtime session and starts the live timer.
- Changing Running to Off closes that session and stores start time, stop time, and duration.
- Boiler cards and Run History update for signed-in users through Supabase Realtime.
- Repeatedly pressing the already-selected state does not create duplicate sessions.
