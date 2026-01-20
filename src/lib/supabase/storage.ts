import { supabase } from './client';

// Storage bucket names
const GALLERY_BUCKET = 'gallery-images';
const NEWS_ATTACHMENTS_BUCKET = 'news-attachments';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadGalleryImage = async (file: File): Promise<UploadResult> => {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `gallery/${fileName}`;

    console.log('Uploading gallery image:', fileName);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(GALLERY_BUCKET)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', publicUrl);

    return {
      success: true,
      url: publicUrl
    };
  } catch (error) {
    console.error('Exception during file upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteGalleryImage = async (url: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === GALLERY_BUCKET);
    
    if (bucketIndex === -1) {
      console.error('Invalid gallery image URL:', url);
      return false;
    }

    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    console.log('Deleting gallery image:', filePath);

    const { error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    console.log('File deleted successfully:', filePath);
    return true;
  } catch (error) {
    console.error('Exception during file deletion:', error);
    return false;
  }
};

export const replaceGalleryImage = async (oldUrl: string, newFile: File): Promise<UploadResult> => {
  try {
    // Upload new image first
    const uploadResult = await uploadGalleryImage(newFile);
    
    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete old image (don't fail if this doesn't work)
    await deleteGalleryImage(oldUrl);

    return uploadResult;
  } catch (error) {
    console.error('Exception during file replacement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Initialize storage bucket (call this once during app setup)
export const initializeGalleryBucket = async (): Promise<boolean> => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('Note: Could not list buckets (this is normal if bucket doesn\'t exist yet):', listError.message);
      // Continue to try creating the bucket
    }

    const bucketExists = buckets?.some(bucket => bucket.name === GALLERY_BUCKET);
    
    if (!bucketExists) {
      console.log('Creating gallery images bucket...');
      
      const { error: createError } = await supabase.storage.createBucket(GALLERY_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.log('Note: Bucket creation failed (bucket may already exist):', createError.message);
        // Don't return false here - the bucket might already exist
        // We'll test if we can upload to it instead
      } else {
        console.log('Gallery images bucket created successfully');
      }
    } else {
      console.log('Gallery images bucket already exists');
    }

    // Test if we can access the bucket by trying to list files
    const { error: testError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .list('gallery', { limit: 1 });

    if (testError) {
      console.log('Note: Cannot access gallery bucket:', testError.message);
      console.log('This is normal if no files have been uploaded yet or if RLS policies need to be configured in Supabase dashboard');
    }

    return true; // Return true even if there are access issues - they'll be handled during upload
  } catch (error) {
    console.error('Exception during bucket initialization:', error);
    return true; // Don't fail the entire app initialization
  }
};

// News attachments storage functions
export interface NewsAttachment {
  id: string;
  filename: string;
  type: 'pdf' | 'jpeg';
  url: string;
  size: number;
  uploaded_at: string;
}

export const uploadNewsAttachment = async (file: File, newsItemId: string): Promise<UploadResult & { attachment?: NewsAttachment }> => {
  try {
    // Validate file type
    const fileType = file.type.toLowerCase();
    const isPdf = fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    
    if (!isPdf && !isJpeg) {
      return {
        success: false,
        error: 'Only PDF and JPEG files are allowed'
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size must be less than 10MB'
      };
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || (isPdf ? 'pdf' : 'jpg');
    const attachmentId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const fileName = `${attachmentId}.${fileExt}`;
    const filePath = `${newsItemId}/${fileName}`;

    console.log('Uploading news attachment:', fileName);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(NEWS_ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(NEWS_ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', publicUrl);

    const attachment: NewsAttachment = {
      id: attachmentId,
      filename: file.name,
      type: isPdf ? 'pdf' : 'jpeg',
      url: publicUrl,
      size: file.size,
      uploaded_at: new Date().toISOString()
    };

    return {
      success: true,
      url: publicUrl,
      attachment
    };
  } catch (error) {
    console.error('Exception during file upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteNewsAttachment = async (url: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === NEWS_ATTACHMENTS_BUCKET);
    
    if (bucketIndex === -1) {
      console.error('Invalid news attachment URL:', url);
      return false;
    }

    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    console.log('Deleting news attachment:', filePath);

    const { error } = await supabase.storage
      .from(NEWS_ATTACHMENTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    console.log('File deleted successfully:', filePath);
    return true;
  } catch (error) {
    console.error('Exception during file deletion:', error);
    return false;
  }
};

// Initialize news attachments bucket
export const initializeNewsAttachmentsBucket = async (): Promise<boolean> => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('Note: Could not list buckets (this is normal if bucket doesn\'t exist yet):', listError.message);
    }

    const bucketExists = buckets?.some(bucket => bucket.name === NEWS_ATTACHMENTS_BUCKET);
    
    if (!bucketExists) {
      console.log('Creating news attachments bucket...');
      
      const { error: createError } = await supabase.storage.createBucket(NEWS_ATTACHMENTS_BUCKET, {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        console.log('Note: Bucket creation failed (bucket may already exist):', createError.message);
      } else {
        console.log('News attachments bucket created successfully');
      }
    } else {
      console.log('News attachments bucket already exists');
    }

    return true;
  } catch (error) {
    console.error('Exception during bucket initialization:', error);
    return true; // Don't fail the entire app initialization
  }
};
