## Why
News and events items currently only support text content. Users need the ability to attach PDFs and JPEG images to provide richer content (e.g., event flyers, training program brochures, photo galleries). Additionally, the current news page displays items in a collapsed format without the ability to expand individual items for detailed viewing.

## What Changes
- Add support for PDF and JPEG attachments to news and events items
- Store attachments in Supabase Storage with references in the database
- Add expandable/collapsible functionality to individual news items on the public news page
- Update admin content management UI to allow uploading and managing attachments
- Update database schema to store attachment metadata (file paths, types, names)
- Update TypeScript interfaces to include attachment fields

## Impact
- Affected specs: `news` (new capability)
- Affected code:
  - Database: `news_items` table schema (`supabase-migration-news-items.sql`)
  - Storage: Supabase Storage bucket for news attachments
  - API: `/api/news/route.ts` (if exists) or news data layer
  - Frontend: `src/app/news/page.tsx` (expandable items)
  - Admin: `src/app/(dashboard)/admin/content-management/page.tsx` (attachment upload)
  - Types: `src/lib/supabase/news.ts`, `src/lib/data/content.ts` (NewsItem interface)
  - Storage utilities: `src/lib/supabase/storage.ts` (attachment handling)
