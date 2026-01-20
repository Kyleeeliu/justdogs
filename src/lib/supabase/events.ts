import { supabase } from './client';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_participants?: number;
  current_participants: number;
  registration_required: boolean;
  registration_url?: string;
  price: number;
  category: 'general' | 'training' | 'workshop' | 'social' | 'competition' | 'fundraiser';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  published: boolean;
  featured: boolean;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

const EVENTS_TABLE = 'events';

// Get all published events (public access)
export const getEvents = async (): Promise<EventItem[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('*')
      .eq('published', true)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      event_date: item.event_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      max_participants: item.max_participants,
      current_participants: item.current_participants || 0,
      registration_required: item.registration_required || false,
      registration_url: item.registration_url,
      price: item.price || 0,
      category: item.category || 'general',
      status: item.status || 'upcoming',
      published: item.published,
      featured: item.featured || false,
      image_url: item.image_url,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getEvents:', error);
    return [];
  }
};

// Get all events (admin only - includes unpublished)
export const getAllEvents = async (): Promise<EventItem[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      event_date: item.event_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      max_participants: item.max_participants,
      current_participants: item.current_participants || 0,
      registration_required: item.registration_required || false,
      registration_url: item.registration_url,
      price: item.price || 0,
      category: item.category || 'general',
      status: item.status || 'upcoming',
      published: item.published,
      featured: item.featured || false,
      image_url: item.image_url,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    throw error;
  }
};

// Get upcoming events only
export const getUpcomingEvents = async (): Promise<EventItem[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('*')
      .eq('published', true)
      .eq('status', 'upcoming')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      event_date: item.event_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      max_participants: item.max_participants,
      current_participants: item.current_participants || 0,
      registration_required: item.registration_required || false,
      registration_url: item.registration_url,
      price: item.price || 0,
      category: item.category || 'general',
      status: item.status || 'upcoming',
      published: item.published,
      featured: item.featured || false,
      image_url: item.image_url,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    return [];
  }
};

// Get featured events
export const getFeaturedEvents = async (): Promise<EventItem[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('*')
      .eq('published', true)
      .eq('featured', true)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching featured events:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      event_date: item.event_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      max_participants: item.max_participants,
      current_participants: item.current_participants || 0,
      registration_required: item.registration_required || false,
      registration_url: item.registration_url,
      price: item.price || 0,
      category: item.category || 'general',
      status: item.status || 'upcoming',
      published: item.published,
      featured: item.featured || false,
      image_url: item.image_url,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getFeaturedEvents:', error);
    return [];
  }
};

// Add a new event
export const addEvent = async (event: Omit<EventItem, 'id' | 'created_at' | 'updated_at' | 'current_participants'>): Promise<EventItem> => {
  try {
    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .insert([{
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        max_participants: event.max_participants,
        registration_required: event.registration_required !== undefined ? event.registration_required : false,
        registration_url: event.registration_url,
        price: event.price !== undefined ? event.price : 0,
        category: event.category || 'general',
        status: event.status || 'upcoming',
        published: event.published !== undefined ? event.published : true,
        featured: event.featured !== undefined ? event.featured : false,
        image_url: event.image_url,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding event:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      max_participants: data.max_participants,
      current_participants: data.current_participants || 0,
      registration_required: data.registration_required || false,
      registration_url: data.registration_url,
      price: data.price || 0,
      category: data.category || 'general',
      status: data.status || 'upcoming',
      published: data.published,
      featured: data.featured || false,
      image_url: data.image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in addEvent:', error);
    throw error;
  }
};

// Update an event
export const updateEvent = async (id: string, updates: Partial<EventItem>): Promise<EventItem | null> => {
  try {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.event_date !== undefined) updateData.event_date = updates.event_date;
    if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.max_participants !== undefined) updateData.max_participants = updates.max_participants;
    if (updates.current_participants !== undefined) updateData.current_participants = updates.current_participants;
    if (updates.registration_required !== undefined) updateData.registration_required = updates.registration_required;
    if (updates.registration_url !== undefined) updateData.registration_url = updates.registration_url;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.published !== undefined) updateData.published = updates.published;
    if (updates.featured !== undefined) updateData.featured = updates.featured;
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;

    const { data, error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      max_participants: data.max_participants,
      current_participants: data.current_participants || 0,
      registration_required: data.registration_required || false,
      registration_url: data.registration_url,
      price: data.price || 0,
      category: data.category || 'general',
      status: data.status || 'upcoming',
      published: data.published,
      featured: data.featured || false,
      image_url: data.image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in updateEvent:', error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    throw error;
  }
};