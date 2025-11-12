import { supabase } from './client';

const STORAGE_BUCKET = 'message-media';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL &&
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param userId - The user ID for organizing files
 * @param fileType - 'image' or 'video'
 * @returns The public URL of the uploaded file or null if in mock mode
 */
export const uploadMessageMedia = async (
  file: File,
  userId: string,
  fileType: 'image' | 'video'
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Mock mode: Simulating file upload');
    // In mock mode, create a local blob URL
    return URL.createObjectURL(file);
  }

  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileType}s/${fileName}`;

    console.log('Uploading file to Supabase Storage:', filePath);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadMessageMedia:', error);
    // Fall back to local blob URL in case of error
    return URL.createObjectURL(file);
  }
};

/**
 * Delete a file from Supabase Storage
 * @param filePath - The path of the file to delete
 * @returns True if successful, false otherwise
 */
export const deleteMessageMedia = async (filePath: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Mock mode: Simulating file deletion');
    return true;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    console.log('File deleted successfully:', filePath);
    return true;
  } catch (error) {
    console.error('Error in deleteMessageMedia:', error);
    return false;
  }
};

/**
 * Validate file type and size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns Object with isValid and error message
 */
export const validateMediaFile = (
  file: File,
  maxSizeMB: number = 10
): { isValid: boolean; error?: string } => {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not supported. Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, MOV, AVI, WebM)',
    };
  }

  return { isValid: true };
};

/**
 * Get media type from file
 * @param file - The file to check
 * @returns 'image' or 'video'
 */
export const getMediaType = (file: File): 'image' | 'video' => {
  return file.type.startsWith('image/') ? 'image' : 'video';
};

/**
 * Create a thumbnail for a video file
 * @param videoFile - The video file
 * @returns A blob of the thumbnail image
 */
export const createVideoThumbnail = async (videoFile: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of video duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      } else {
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Upload video thumbnail
 * @param thumbnailBlob - The thumbnail blob
 * @param userId - The user ID
 * @param videoFileName - Original video file name for reference
 * @returns The public URL of the uploaded thumbnail
 */
export const uploadVideoThumbnail = async (
  thumbnailBlob: Blob,
  userId: string,
  videoFileName: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Mock mode: Simulating thumbnail upload');
    return URL.createObjectURL(thumbnailBlob);
  }

  try {
    const fileName = `${userId}/${Date.now()}-thumbnail.jpg`;
    const filePath = `thumbnails/${fileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, thumbnailBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadVideoThumbnail:', error);
    return null;
  }
};

