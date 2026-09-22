# SteamGuard Phase 13

## Changes

- Live boiler running timer refreshes every second for all users.
- Approved users and admins can delete runtime history rows.
- Unlimited workers can be assigned to the same boiler.
- New **Worker · Can operate any boiler** assignment.
- Dashboard includes a General Workforce status card.
- General workers can change any registered boiler between Running and Off.
- Account access check has a 6-second timeout and Retry option instead of endless loading.
- Admin can delete individual attendance records or reset all attendance.
- Workers List IN/OUT creates a real Attendance history record automatically.

## Install

1. Upload all files to GitHub, preserving folders.
2. In Supabase SQL Editor, copy and run the complete contents of `supabase/phase-13-workforce-realtime.sql`.
3. Redeploy the newest GitHub commit in Vercel.
4. Sign out, hard-refresh, and sign in again.
5. Test with two browsers/users to verify realtime timer and attendance sync.
