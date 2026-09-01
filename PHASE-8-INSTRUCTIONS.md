# SteamGuard Phase 8

## Installation

1. Upload all extracted files to the existing GitHub repository while preserving the folders.
2. In Supabase SQL Editor, open `supabase/phase-8-fuel-announcements-editing.sql`.
3. Copy the complete SQL contents into the editor and run it once. Do not paste only the filename.
4. Redeploy the newest GitHub commit in Vercel.

## Added functions

- Dashboard boiler visual with realtime Running/Off state.
- Daily fuel usage and cumulative total.
- Full fuel report and From/To date range PDF export through the browser Save as PDF dialog.
- Shared checklist items that authenticated users can add, complete, and remove.
- Edit/Delete controls for operational records and Data Store records.
- Shared announcement feed supporting private images, PDFs, and documents up to 20 MB.
- Announcement likes and authenticated downloads.

## Permissions

- Authenticated users can read operational data and announcements.
- Users can update/delete records they created.
- Administrators can manage every record.
- Announcement attachments are not public URLs; signed-in users receive temporary download links.
