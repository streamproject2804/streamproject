# SteamGuard Phase 9

## Installation order

1. Extract the Phase 9 ZIP and upload all files to the existing GitHub repository while preserving folders.
2. Open `supabase/phase-9-maintenance-attendance.sql` locally.
3. Copy the complete contents into Supabase SQL Editor and run it. Do not type only the filename.
4. Redeploy the newest GitHub commit in Vercel.

## Changes

- The Incidents sidebar badge is no longer hard-coded. It shows the realtime count of incidents whose status is not Resolved, and is hidden when the count is zero.
- Every approved user can complete a maintenance task.
- Completed maintenance stores who completed it and when.
- Completed tasks immediately disappear from the maintenance notification centre.
- The new Attendance page records a selected worker, selected boiler, IN/OUT status, date, time, and the user who recorded it.
- Attendance records update in realtime.
- Attendance supports full-data and From/To date-range PDF exports through the browser Save as PDF dialog.

## Quick test

1. Create a maintenance task and confirm the bell count increases.
2. Sign in as any approved user and click Complete on the task.
3. Confirm the task becomes Completed and disappears from the bell panel.
4. Open Attendance, select worker + boiler, mark IN, then mark OUT.
5. Confirm both timestamped records appear and export both report modes.
