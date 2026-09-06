# SteamGuard Phase 10

## Installation

1. Extract the ZIP and upload all files to the existing GitHub repository, preserving the folder structure.
2. Open `supabase/phase-10-real-logbook.sql` and copy its complete contents into Supabase SQL Editor.
3. Run the SQL once, then redeploy the newest GitHub commit in Vercel.

## Disable signup confirmation email

This is a Supabase project setting, not a frontend environment variable.

1. Open Supabase Dashboard.
2. Select the SteamGuard project.
3. Open Authentication → Sign In / Providers.
4. Open Email provider settings.
5. Turn off `Confirm email`.
6. Save the setting.

New accounts will then be created without a confirmation email. SteamGuard's administrator-approval screen still protects access: a new profile remains pending until the administrator approves it.

For an account created before this setting was disabled, confirm it once from Authentication → Users or create a fresh account after changing the setting.

## Logbook behavior

- Every input starts at zero.
- No automatic or demonstration reading is displayed.
- Submitted readings are stored permanently in `logbook_entries`.
- The dashboard displays the latest submitted entry for each boiler.
- The dashboard warning appears only when an actually submitted latest entry contains an out-of-limit value.
- When there are no submitted entries, the dashboard displays `No readings recorded`.
