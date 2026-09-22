# SteamGuard Phase 11

## Changes

- Main administrator email changed to `muthuramanajith28@gmail.com`.
- Boiler Run History now includes **Overall export**.
- Boiler Run History now includes **Date-wise export** with From and To dates.
- Runtime PDF includes boiler ID, name, date, start time, stop time, session duration and combined runtime.

## Installation

1. Upload all project files to the GitHub repository, preserving folders.
2. In Supabase SQL Editor, open `supabase/phase-11-admin-runtime-export.sql`.
3. Copy the complete SQL content and run it once.
4. Ensure `muthuramanajith28@gmail.com` has already signed up. If not, sign up the account; the trigger will approve it as admin automatically.
5. Redeploy the latest GitHub commit in Vercel.
6. Sign in as the new administrator and verify the Admin Panel.
7. Open **Run History**, test **Overall export**, then select From/To dates and test **Date-wise export**. In the browser print dialog, choose **Save as PDF**.
