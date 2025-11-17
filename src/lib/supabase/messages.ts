import { supabase } from './client';
import { Message, User, UserRole } from '@/types';

// Get all users for recipient selection
export const getAllUsersForMessaging = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data as User[];
  } catch (error) {
    console.error('Error in getAllUsersForMessaging:', error);
    return [];
  }
};

// Search users by name or email
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('full_name', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data as User[];
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
};

// Create a direct message
export const createMessage = async (
  messageData: {
    sender_id: string;
    recipient_id?: string;
    subject?: string;
    content: string;
    is_announcement?: boolean;
    target_roles?: UserRole[];
  }
): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: messageData.sender_id,
        recipient_id: messageData.recipient_id || null,
        subject: messageData.subject || '',
        content: messageData.content,
        is_announcement: messageData.is_announcement || false,
        target_roles: messageData.target_roles || null,
        message_type: 'text',
        delivered_at: new Date().toISOString(),
      })
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return null;
    }

    return data as any;
  } catch (error) {
    console.error('Error in createMessage:', error);
    return null;
  }
};

// Get all messages for a user (direct messages + announcements)
export const getMessagesByUser = async (userId: string): Promise<Message[]> => {
  try {
    // Get direct messages where user is sender or recipient
    const { data: directMessages, error: directError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('is_announcement', false)
      .order('created_at', { ascending: false });

    if (directError) {
      console.error('Error fetching direct messages:', directError);
    }

    // Get announcements from last 48 hours
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: announcements, error: announcementError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('is_announcement', true)
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (announcementError) {
      console.error('Error fetching announcements:', announcementError);
    }

    // Combine and deduplicate
    const allMessages = [...(directMessages || []), ...(announcements || [])];
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    );

    return uniqueMessages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) as any;
  } catch (error) {
    console.error('Error in getMessagesByUser:', error);
    return [];
  }
};

// Get unread messages for a user
export const getUnreadMessages = async (userId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .or(`recipient_id.eq.${userId},is_announcement.eq.true`)
      .neq('sender_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread messages:', error);
      return [];
    }

    return data as any;
  } catch (error) {
    console.error('Error in getUnreadMessages:', error);
    return [];
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

// Get unread message count for a user
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`recipient_id.eq.${userId},is_announcement.eq.true`)
      .neq('sender_id', userId)
      .is('read_at', null);

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Subscribe to new messages for a user
export const subscribeToMessages = (
  userId: string,
  callback: (message: Message) => void
) => {
  try {
    return supabase
      .channel(`user-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Check if this message is relevant to the user
          const isRelevant = 
            message.sender_id === userId ||
            message.recipient_id === userId ||
            message.is_announcement;

          if (isRelevant) {
            // Fetch complete message with sender info
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                sender:sender_id (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              `)
              .eq('id', message.id)
              .single();

            if (data) {
              callback(data as any);
            }
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.error('Error setting up message subscription:', error);
    return {
      unsubscribe: () => {}
    };
  }
};

// Legacy exports for compatibility
export const sendMessage = createMessage;
export const createAnnouncement = createMessage;