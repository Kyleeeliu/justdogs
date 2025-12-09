import { supabase } from './client';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: 'behaviour' | 'farm' | 'academy' | 'service';
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  active: boolean;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  dog_name?: string;
  display_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SERVICES_TABLE = 'services';
const TEAM_TABLE = 'team_members';
const GALLERY_TABLE = 'gallery_images';

// ========== SERVICES ==========

export const getAllServices = async (): Promise<ServiceItem[]> => {
  try {
    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      // Check if table doesn't exist (common error codes: 42P01, 42704)
      if (error.code === '42P01' || error.code === '42704' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Services table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
        return [];
      }
      console.warn('Error fetching services:', error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      active: item.active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    // Handle case where table doesn't exist
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      console.warn('Services table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
      return [];
    }
    console.warn('Error in getAllServices:', error);
    return [];
  }
};

export const getServices = async (): Promise<ServiceItem[]> => {
  try {
    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching active services:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      active: item.active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getServices:', error);
    return [];
  }
};

export const addService = async (service: Omit<ServiceItem, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceItem> => {
  try {
    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .insert([{
        name: service.name,
        description: service.description,
        category: service.category,
        active: service.active !== undefined ? service.active : true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding service:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in addService:', error);
    throw error;
  }
};

export const updateService = async (id: string, updates: Partial<ServiceItem>): Promise<ServiceItem | null> => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.active !== undefined) updateData.active = updates.active;

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in updateService:', error);
    throw error;
  }
};

export const deleteService = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(SERVICES_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteService:', error);
    throw error;
  }
};

// ========== TEAM MEMBERS ==========

export const getAllTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from(TEAM_TABLE)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Check if table doesn't exist (common error codes: 42P01, 42704)
      if (error.code === '42P01' || error.code === '42704' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Team members table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
        return [];
      }
      console.warn('Error fetching team members:', error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      role: item.role,
      bio: item.bio,
      active: item.active,
      photo_url: item.photo_url || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    // Handle case where table doesn't exist
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      console.warn('Team members table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
      return [];
    }
    console.warn('Error in getAllTeamMembers:', error);
    return [];
  }
};

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from(TEAM_TABLE)
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching active team members:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      role: item.role,
      bio: item.bio,
      active: item.active,
      photo_url: item.photo_url || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    return [];
  }
};

export const addTeamMember = async (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<TeamMember> => {
  try {
    const { data, error } = await supabase
      .from(TEAM_TABLE)
      .insert([{
        name: member.name,
        role: member.role,
        bio: member.bio,
        active: member.active !== undefined ? member.active : true,
        photo_url: member.photo_url || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding team member:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      bio: data.bio,
      active: data.active,
      photo_url: data.photo_url || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in addTeamMember:', error);
    throw error;
  }
};

export const updateTeamMember = async (id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url;

    const { data, error } = await supabase
      .from(TEAM_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      bio: data.bio,
      active: data.active,
      photo_url: data.photo_url || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in updateTeamMember:', error);
    throw error;
  }
};

export const deleteTeamMember = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TEAM_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTeamMember:', error);
    throw error;
  }
};

// ========== GALLERY ==========

export const getAllGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const { data, error } = await supabase
      .from(GALLERY_TABLE)
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      // Check if table doesn't exist (common error codes: 42P01, 42704)
      if (error.code === '42P01' || error.code === '42704' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Gallery images table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
        return [];
      }
      console.warn('Error fetching gallery images:', error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      image_url: item.image_url,
      title: item.title || undefined,
      description: item.description || undefined,
      dog_name: item.dog_name || undefined,
      display_order: item.display_order || 0,
      active: item.active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    // Handle case where table doesn't exist
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      console.warn('Gallery images table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
      return [];
    }
    console.warn('Error in getAllGalleryImages:', error);
    return [];
  }
};

export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const { data, error } = await supabase
      .from(GALLERY_TABLE)
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      // Check if table doesn't exist (common error codes: 42P01, 42704)
      if (error.code === '42P01' || error.code === '42704' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Gallery images table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
        return [];
      }
      console.warn('Error fetching active gallery images:', error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      image_url: item.image_url,
      title: item.title || undefined,
      description: item.description || undefined,
      dog_name: item.dog_name || undefined,
      display_order: item.display_order || 0,
      active: item.active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    // Handle case where table doesn't exist
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      console.warn('Gallery images table does not exist yet. Please run the migration: supabase-migration-content-management.sql');
      return [];
    }
    console.warn('Error in getGalleryImages:', error);
    return [];
  }
};

export const addGalleryImage = async (image: Omit<GalleryImage, 'id' | 'created_at' | 'updated_at'>): Promise<GalleryImage> => {
  try {
    const { data, error } = await supabase
      .from(GALLERY_TABLE)
      .insert([{
        image_url: image.image_url,
        title: image.title || null,
        description: image.description || null,
        dog_name: image.dog_name || null,
        display_order: image.display_order || 0,
        active: image.active !== undefined ? image.active : true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding gallery image:', error);
      throw error;
    }

    return {
      id: data.id,
      image_url: data.image_url,
      title: data.title || undefined,
      description: data.description || undefined,
      dog_name: data.dog_name || undefined,
      display_order: data.display_order || 0,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in addGalleryImage:', error);
    throw error;
  }
};

export const updateGalleryImage = async (id: string, updates: Partial<GalleryImage>): Promise<GalleryImage | null> => {
  try {
    const updateData: any = {};
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dog_name !== undefined) updateData.dog_name = updates.dog_name;
    if (updates.display_order !== undefined) updateData.display_order = updates.display_order;
    if (updates.active !== undefined) updateData.active = updates.active;

    const { data, error } = await supabase
      .from(GALLERY_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gallery image:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      image_url: data.image_url,
      title: data.title || undefined,
      description: data.description || undefined,
      dog_name: data.dog_name || undefined,
      display_order: data.display_order || 0,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in updateGalleryImage:', error);
    throw error;
  }
};

export const deleteGalleryImage = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(GALLERY_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gallery image:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGalleryImage:', error);
    throw error;
  }
};

