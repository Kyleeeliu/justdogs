import { supabase } from './client';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'event' | 'announcement';
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

const NEWS_TABLE = 'news_items';

// Get all published news items (public access)
export const getNewsItems = async (): Promise<NewsItem[]> => {
  try {
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select('*')
      .eq('published', true)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching news items:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      date: item.date,
      type: item.type,
      published: item.published,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getNewsItems:', error);
    return [];
  }
};

// Get all news items (admin only - includes unpublished)
export const getAllNewsItems = async (): Promise<NewsItem[]> => {
  try {
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching all news items:', error);
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      date: item.date,
      type: item.type,
      published: item.published,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getAllNewsItems:', error);
    throw error;
  }
};

// Add a new news item
export const addNewsItem = async (item: Omit<NewsItem, 'id' | 'created_at' | 'updated_at'>): Promise<NewsItem> => {
  try {
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .insert([{
        title: item.title,
        content: item.content,
        date: item.date,
        type: item.type,
        published: item.published !== undefined ? item.published : true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding news item:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      date: data.date,
      type: data.type,
      published: data.published,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in addNewsItem:', error);
    throw error;
  }
};

// Update a news item
export const updateNewsItem = async (id: string, updates: Partial<NewsItem>): Promise<NewsItem | null> => {
  try {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.published !== undefined) updateData.published = updates.published;

    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating news item:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      date: data.date,
      type: data.type,
      published: data.published,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error in updateNewsItem:', error);
    throw error;
  }
};

// Delete a news item
export const deleteNewsItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(NEWS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting news item:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNewsItem:', error);
    throw error;
  }
};

