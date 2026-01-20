## 1. Database Schema Updates
- [x] 1.1 Create migration to add `attachments` JSONB column to `news_items` table
- [x] 1.2 Add index on attachments column for query performance
- [ ] 1.3 Test migration on development database

## 2. Storage Setup
- [x] 2.1 Create Supabase Storage bucket `news-attachments` (if not exists)
- [ ] 2.2 Configure bucket policies for public read access to published items
- [ ] 2.3 Configure bucket policies for admin write access
- [x] 2.4 Add storage utility functions for uploading/deleting attachments

## 3. Type Definitions
- [x] 3.1 Update `NewsItem` interface in `src/lib/supabase/news.ts` to include attachments field
- [x] 3.2 Update `NewsItem` interface in `src/lib/data/content.ts` to include attachments field
- [x] 3.3 Create `NewsAttachment` type definition

## 4. Backend/API Updates
- [x] 4.1 Update `getNewsItems()` to include attachments in response
- [x] 4.2 Update `getAllNewsItems()` to include attachments
- [x] 4.3 Update `addNewsItem()` to handle attachment metadata
- [x] 4.4 Update `updateNewsItem()` to handle attachment updates
- [x] 4.5 Update `deleteNewsItem()` to clean up associated storage files
- [x] 4.6 Create API endpoint for attachment upload (if needed) or use direct Supabase Storage

## 5. Admin UI Updates
- [x] 5.1 Add file upload input to news item form (PDF and JPEG)
- [x] 5.2 Add preview for uploaded attachments in edit form
- [x] 5.3 Add ability to remove attachments
- [x] 5.4 Update form submission to upload files to storage and save metadata
- [x] 5.5 Add validation for file types (PDF, JPEG only) and size limits
- [x] 5.6 Display attachment indicators in news items list

## 6. Public News Page Updates
- [x] 6.1 Add expand/collapse functionality to individual news items
- [x] 6.2 Display attachments (thumbnails for images, download links for PDFs)
- [x] 6.3 Add smooth animations for expand/collapse
- [x] 6.4 Ensure mobile-responsive expandable behavior
- [x] 6.5 Update card layout to accommodate expanded content

## 7. Testing & Validation
- [ ] 7.1 Test PDF upload and display
- [ ] 7.2 Test JPEG upload and display
- [ ] 7.3 Test expand/collapse functionality
- [ ] 7.4 Test attachment deletion
- [ ] 7.5 Test RLS policies for storage access
- [ ] 7.6 Test mobile responsiveness
- [ ] 7.7 Verify file size limits are enforced

## 8. Documentation
- [ ] 8.1 Update database migration documentation
- [ ] 8.2 Document attachment file size limits
- [ ] 8.3 Document supported file types
