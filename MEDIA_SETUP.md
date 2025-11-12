# Media Upload Setup Guide

This guide explains how to enable picture and video uploads in the messaging feature.

## Features Added

- ✅ Send images (JPEG, PNG, GIF, WebP)
- ✅ Send videos (MP4, MOV, AVI, WebM)
- ✅ Automatic video thumbnail generation
- ✅ File size validation (max 10MB)
- ✅ Image preview in message composer
- ✅ Media display in message detail view
- ✅ Media indicators in message list

## Database Setup

### Option 1: New Installation

If you're setting up Supabase for the first time, simply run the main migration:

```bash
# Run supabase-migration.sql in your Supabase SQL Editor
```

The messages table now includes:
- `media_url` - URL to the uploaded file
- `media_type` - Type of media ('image' or 'video')
- `media_thumbnail_url` - Thumbnail URL for videos

### Option 2: Existing Installation

If you already have the messages table, run the migration update:

```bash
# Run supabase-migration-media-columns.sql in your Supabase SQL Editor
```

## Supabase Storage Setup

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **"New Bucket"**
4. Configure the bucket:
   - **Name**: `message-media`
   - **Public bucket**: ✅ Enabled (so media can be accessed via public URLs)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/*` and `video/*`

### 2. Configure Storage Policies

The migration script (`supabase-migration-media-columns.sql`) includes storage policies that:

- ✅ Allow authenticated users to upload files
- ✅ Allow public access to view files
- ✅ Allow users to delete their own files

These policies should be automatically created when you run the migration.

### 3. Verify Setup

After running the migration:

1. Check that the `message-media` bucket exists in Storage
2. Verify that the three storage policies are active:
   - "Authenticated users can upload message media"
   - "Public can view message media"
   - "Users can delete their own message media"

## Mock Mode (Development)

If you're running in mock mode (without Supabase configured):

- File uploads will work using local blob URLs
- Files are stored in browser memory only
- Files are not persisted after page refresh
- This is useful for testing the UI without setting up Supabase

## Usage

### Sending Messages with Media

1. Click **"New Message"** button
2. Fill in recipient, subject, and content
3. Click **"Choose image or video"** in the "Attach Media" section
4. Select your file (max 10MB)
5. Preview will be shown for images
6. Click **"Send Message"**

### Viewing Messages with Media

- Messages with media show an indicator in the message list (📷 or 🎥)
- Open the message to view the full image or video
- Videos include a thumbnail and playback controls

## File Size and Type Limits

**Supported Image Formats:**
- JPEG/JPG
- PNG
- GIF
- WebP

**Supported Video Formats:**
- MP4
- MOV (QuickTime)
- AVI
- WebM

**File Size Limit:**
- Maximum: 10 MB per file
- Adjustable in `src/lib/supabase/storage.ts` (validateMediaFile function)

## Troubleshooting

### Files Not Uploading

1. **Check Supabase Configuration**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is set
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

2. **Check Storage Bucket**
   - Ensure `message-media` bucket exists
   - Verify bucket is public
   - Check storage policies are active

3. **Check File Size**
   - Files must be under 10MB
   - Try a smaller file to test

4. **Check Console**
   - Open browser DevTools
   - Look for errors in Console tab
   - Check Network tab for failed uploads

### Videos Not Playing

1. **Check Video Format**
   - Ensure format is MP4, MOV, AVI, or WebM
   - Some browsers have limited codec support

2. **Check File Size**
   - Large videos may take time to load
   - Consider compressing videos before uploading

3. **Check Browser Support**
   - Try a different browser
   - Update to latest browser version

### Storage Quota Issues

If you're hitting storage limits:

1. **Check Supabase Dashboard**
   - View storage usage in dashboard
   - Upgrade plan if needed

2. **Clean Up Old Files**
   - Delete unused media from Storage
   - Consider implementing automatic cleanup

## Security Considerations

1. **File Validation**
   - Files are validated on the client side
   - File type and size checks are enforced
   - Server-side validation is recommended for production

2. **Storage Policies**
   - Users can only delete their own files
   - All authenticated users can upload
   - All files are publicly readable

3. **File Naming**
   - Files are renamed with timestamps and random strings
   - Original filenames are not preserved
   - Files are organized by user ID

## Cost Considerations

**Supabase Storage Pricing:**
- Free tier includes 1GB storage
- Additional storage: ~$0.021/GB/month
- Bandwidth: ~$0.09/GB

**Recommendations:**
- Monitor storage usage regularly
- Compress images before uploading
- Consider video length limits
- Implement cleanup for old files

## Future Enhancements

Potential improvements:

- [ ] Image compression before upload
- [ ] Multiple file uploads
- [ ] Drag and drop file upload
- [ ] Progress bars for large uploads
- [ ] Image editing/cropping tools
- [ ] GIF/animation support
- [ ] File download functionality
- [ ] Message media gallery view

## Support

For issues or questions:
- Check the browser console for errors
- Review Supabase logs in dashboard
- Verify environment variables are set correctly
- Ensure database migrations have been run

