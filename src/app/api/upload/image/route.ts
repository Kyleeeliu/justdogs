import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromCookies() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('sb-pajtampwqutuuidklxbv-auth-token');
  
  if (!authCookie) {
    return null;
  }

  try {
    const authData = JSON.parse(authCookie.value);
    return authData.user;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const altText = formData.get('altText') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${user.id}/${filename}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload image to storage' 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to get public URL for uploaded image' 
      }, { status: 500 });
    }

    // Get image dimensions (basic implementation)
    let width: number | null = null;
    let height: number | null = null;

    try {
      // For a more robust solution, you might want to use a library like 'sharp'
      // For now, we'll skip dimensions and let the frontend handle it
    } catch (error) {
      console.log('Could not determine image dimensions:', error);
    }

    // Save metadata to database
    const { data: imageRecord, error: dbError } = await supabase
      .from('uploaded_images')
      .insert({
        filename,
        original_filename: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
        alt_text: altText || null,
        uploaded_by: user.id,
        entity_type: entityType || null,
        entity_id: entityId || null,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('images')
        .remove([filePath]);

      return NextResponse.json({ 
        error: 'Failed to save image metadata' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image: {
        id: imageRecord.id,
        filename: imageRecord.filename,
        originalFilename: imageRecord.original_filename,
        url: imageRecord.file_url,
        size: imageRecord.file_size,
        mimeType: imageRecord.mime_type,
        width: imageRecord.width,
        height: imageRecord.height,
        altText: imageRecord.alt_text
      }
    });

  } catch (error) {
    console.error('Image upload API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Get image record
    const { data: imageRecord, error: fetchError } = await supabase
      .from('uploaded_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (fetchError || !imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = imageRecord.uploaded_by === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('images')
      .remove([imageRecord.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploaded_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to delete image record' 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Image delete API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}