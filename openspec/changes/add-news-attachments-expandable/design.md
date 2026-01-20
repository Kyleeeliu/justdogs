## Context
The news and events system currently stores only text content in the `news_items` table. Users need to attach PDFs (e.g., event flyers, program brochures) and JPEG images (e.g., event photos, promotional images) to enhance content. Additionally, the news page needs expandable items to show full content and attachments without cluttering the initial view.

## Goals / Non-Goals

### Goals
- Support PDF and JPEG attachments per news item
- Store attachments in Supabase Storage with metadata in database
- Allow admins to upload/manage attachments via content management UI
- Display attachments on public news page with expandable items
- Maintain existing news item functionality

### Non-Goals
- Support for other file types (e.g., DOCX, PNG) in initial implementation
- Video attachments
- Inline PDF viewing (download only)
- Attachment versioning or history
- Bulk attachment operations

## Decisions

### Decision: JSONB Column for Attachments
**What**: Store attachment metadata as JSONB array in `news_items.attachments` column
**Why**: 
- Flexible structure allows multiple attachments per item
- Easy to query and update
- No need for separate join table for simple use case
- PostgreSQL JSONB provides good performance

**Alternatives considered**:
- Separate `news_attachments` table: More normalized but requires joins
- Single file path column: Too limiting for multiple attachments
- Storage-only (no DB metadata): Harder to query and manage

**Structure**:
```json
[
  {
    "id": "uuid",
    "filename": "event-flyer.pdf",
    "type": "pdf",
    "url": "https://storage.supabase.co/...",
    "size": 123456,
    "uploaded_at": "2024-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "filename": "event-photo.jpg",
    "type": "jpeg",
    "url": "https://storage.supabase.co/...",
    "thumbnail_url": "https://storage.supabase.co/...",
    "size": 234567,
    "uploaded_at": "2024-01-15T10:01:00Z"
  }
]
```

### Decision: Supabase Storage Bucket
**What**: Use dedicated `news-attachments` bucket in Supabase Storage
**Why**:
- Already using Supabase for database
- Integrated RLS policies
- CDN delivery for performance
- No additional service setup

**Alternatives considered**:
- AWS S3: More complex setup, additional service
- Local file storage: Not scalable, deployment complexity

### Decision: Expandable UI Pattern
**What**: Click-to-expand individual news items on public page
**Why**:
- Keeps initial page view clean
- Allows users to focus on items of interest
- Mobile-friendly (reduces scrolling)
- Common UX pattern users expect

**Alternatives considered**:
- Always expanded: Too cluttered, poor mobile experience
- Modal/separate page: Extra navigation, breaks flow
- Accordion with all items: Too much interaction required

### Decision: File Size Limits
**What**: 10MB limit per file, 50MB total per news item
**Why**:
- Prevents storage abuse
- Reasonable for PDFs and JPEGs
- Mobile-friendly (considering data usage in South African context)

## Risks / Trade-offs

### Risk: Storage Costs
**Mitigation**: 
- Enforce file size limits
- Consider image compression for JPEGs
- Monitor storage usage

### Risk: Performance with Many Attachments
**Mitigation**:
- Lazy load attachments (only when item expanded)
- Use thumbnails for images
- Index attachments column if querying needed

### Risk: RLS Policy Complexity
**Mitigation**:
- Public read access for published items only
- Admin-only write access
- Test policies thoroughly

### Trade-off: JSONB vs Normalized Table
**Chosen**: JSONB for simplicity
**Impact**: Less normalized but simpler queries and updates

## Migration Plan

1. **Database Migration**:
   - Add `attachments` JSONB column (nullable, default `[]`)
   - No data migration needed (new feature)

2. **Storage Setup**:
   - Create bucket via Supabase dashboard or migration script
   - Configure policies

3. **Code Deployment**:
   - Deploy backend changes first (handles new column gracefully)
   - Deploy frontend changes
   - Test in staging

4. **Rollback**:
   - Remove `attachments` column (data loss but acceptable for new feature)
   - Delete storage bucket contents if needed

## Open Questions
- Should we generate thumbnails for JPEGs automatically? (Consider image processing library)
- Should PDFs have preview thumbnails? (Requires PDF rendering)
- Maximum number of attachments per item? (Recommend: 5)
