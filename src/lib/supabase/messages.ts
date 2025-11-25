import { supabase } from './client';
import { Message, Conversation, User, MessageAttachment } from '@/types';

const MESSAGES_TABLE = 'messages';
const CONVERSATIONS_TABLE = 'conversations';
const PARTICIPANTS_TABLE = 'conversation_participants';
const ATTACHMENTS_TABLE = 'message_attachments';

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

// Get or create a conversation between two users
export const getOrCreateConversation = async (userId1: string, userId2: string): Promise<string> => {
  console.log('getOrCreateConversation called:', { userId1, userId2 });
  
  try {
    // Verify both users exist in the users table before proceeding
    // This prevents foreign key constraint violations
    const { data: user1, error: user1Error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId1)
      .single();

    if (user1Error || !user1) {
      const errorMsg = `User ${userId1} not found in users table. The user profile may not exist or the ID doesn't match Supabase Auth. Error: ${user1Error?.message || 'Unknown error'}`;
      console.error('User 1 validation failed:', {
        userId1,
        error: user1Error,
        message: errorMsg
      });
      throw new Error(errorMsg);
    }

    const { data: user2, error: user2Error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId2)
      .single();

    if (user2Error || !user2) {
      const errorMsg = `User ${userId2} not found in users table. The user profile may not exist or the ID doesn't match Supabase Auth. Error: ${user2Error?.message || 'Unknown error'}`;
      console.error('User 2 validation failed:', {
        userId2,
        error: user2Error,
        message: errorMsg
      });
      throw new Error(errorMsg);
    }

    console.log('Both users verified in database:', {
      user1: { id: user1.id, email: user1.email, name: user1.full_name },
      user2: { id: user2.id, email: user2.email, name: user2.full_name }
    });
    // First, try to find existing conversation between these two users
    const { data: existingConversations, error: fetchError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select(`
        conversation_id,
        conversations:conversation_id (
          id,
          is_group
        )
      `)
      .eq('user_id', userId1);

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError);
      throw fetchError;
    }

    // Find a non-group conversation that includes both users
    for (const participant of existingConversations || []) {
      const conv = participant.conversations as any;
      if (!conv.is_group) {
        // Check if userId2 is in this conversation
        const { data: otherParticipants, error: participantsError } = await supabase
          .from(PARTICIPANTS_TABLE)
          .select('user_id')
          .eq('conversation_id', participant.conversation_id);

        if (!participantsError && otherParticipants) {
          const participantIds = otherParticipants.map(p => p.user_id);
          if (participantIds.includes(userId2) && participantIds.length === 2) {
            return participant.conversation_id;
          }
        }
      }
    }

    // No existing conversation found, create new one
    const { data: newConversation, error: createError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .insert({
        is_group: false,
        created_by: userId1,
      })
      .select()
      .single();

    if (createError || !newConversation) {
      console.error('Error creating conversation:', createError);
      throw createError;
    }

    // Add both participants
    const { error: participantsError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .insert([
        { conversation_id: newConversation.id, user_id: userId1 },
        { conversation_id: newConversation.id, user_id: userId2 },
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      throw participantsError;
    }

    return newConversation.id;
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    throw error;
  }
};

// Get all conversations for a user
export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select(`
        conversation_id,
        last_read_at,
        conversations:conversation_id (
          id,
          is_group,
          group_name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('conversation_id', { ascending: false });

    if (error) {
      console.error('Error fetching user conversations:', error);
      return [];
    }

    // For each conversation, get the other participants and last message
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (item) => {
        const conversation = item.conversations as any;
        
        // Get other participants
        const { data: participants } = await supabase
          .from(PARTICIPANTS_TABLE)
          .select(`
            user_id,
            users:user_id (
              id,
              full_name,
              email,
              avatar_url,
              role
            )
          `)
          .eq('conversation_id', conversation.id)
          .neq('user_id', userId);

        // Get last message
        const { data: lastMessage } = await supabase
          .from(MESSAGES_TABLE)
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from(MESSAGES_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', userId)
          .is('read_at', null);

        return {
          ...conversation,
          participants: participants?.map(p => p.users) || [],
          lastMessage,
          unreadCount: unreadCount || 0,
          last_read_at: item.last_read_at,
        };
      })
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
};

// Get messages in a conversation
export const getConversationMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        attachments:message_attachments (
          id,
          file_name,
          file_url,
          file_type,
          file_size,
          created_at
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }

    return data as any;
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  attachments?: File[]
): Promise<Message | null> => {
  try {
    // Get conversation participants to determine recipient_id
    const { data: participants, error: participantsError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (participantsError) {
      console.error('Error fetching conversation participants:', {
        error: participantsError,
        conversationId,
        message: participantsError.message,
        details: participantsError.details,
      });
      throw new Error(`Failed to fetch conversation participants: ${participantsError.message}`);
    }

    if (!participants || participants.length === 0) {
      console.error('No participants found for conversation:', conversationId);
      throw new Error('No participants found for this conversation');
    }

    // Find the recipient (the other participant, not the sender)
    const recipientId = participants.find(p => p.user_id !== senderId)?.user_id || null;
    
    if (!recipientId) {
      console.error('Could not find recipient in conversation:', {
        conversationId,
        senderId,
        participants: participants.map(p => p.user_id),
      });
      throw new Error('Could not determine recipient for this conversation');
    }

    // Create the message with both conversation_id and recipient_id for compatibility
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      subject: content.substring(0, 100) || 'Message', // Use content preview as subject if empty string not allowed
      message_type: attachments && attachments.length > 0 ? 'image' : 'text',
      delivered_at: new Date().toISOString(),
    };

    console.log('Inserting message with data:', {
      conversation_id: messageData.conversation_id,
      sender_id: messageData.sender_id,
      recipient_id: messageData.recipient_id,
      content_length: messageData.content.length,
      subject: messageData.subject,
      message_type: messageData.message_type,
    });

    const { data: message, error: messageError } = await supabase
      .from(MESSAGES_TABLE)
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', {
        message: messageError.message,
        details: messageError.details,
        hint: messageError.hint,
        code: messageError.code,
        fullError: JSON.stringify(messageError, Object.getOwnPropertyNames(messageError))
      });
      throw new Error(`Failed to save message: ${messageError.message || 'Unknown error'}`);
    }

    if (!message) {
      console.error('Message creation returned no data');
      throw new Error('Message creation returned no data');
    }

    // Upload attachments if any
    if (attachments && attachments.length > 0) {
      const uploadedAttachments = await uploadAttachments(message.id, attachments);
      return {
        ...message,
        attachments: uploadedAttachments,
      } as any;
    }

    return message as any;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to send message: ${JSON.stringify(error)}`);
  }
};

// Upload file attachments
export const uploadAttachments = async (messageId: string, files: File[]): Promise<MessageAttachment[]> => {
  const attachments: MessageAttachment[] = [];

  for (const file of files) {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${messageId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      // Save attachment record
      const { data: attachment, error: attachmentError } = await supabase
        .from(ATTACHMENTS_TABLE)
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (!attachmentError && attachment) {
        attachments.push(attachment as MessageAttachment);
      }
    } catch (error) {
      console.error('Error processing attachment:', error);
    }
  }

  return attachments;
};

// Mark message as read
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    await supabase
      .from(MESSAGES_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

// Mark all messages in a conversation as read
export const markConversationAsRead = async (conversationId: string, userId: string): Promise<void> => {
  try {
    // Mark all unread messages as read
    await supabase
      .from(MESSAGES_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    // Update last_read_at for the participant
    await supabase
      .from(PARTICIPANTS_TABLE)
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
};

// Subscribe to new messages in a conversation
export const subscribeToConversation = (
  conversationId: string,
  callback: (message: Message) => void
) => {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: MESSAGES_TABLE,
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the complete message with sender info
        const { data } = await supabase
          .from(MESSAGES_TABLE)
          .select(`
            *,
            sender:sender_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as any);
        }
      }
    )
    .subscribe();
};

// Get unread message count for a user
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    // Get all conversations the user is part of
    const { data: participantData } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('conversation_id')
      .eq('user_id', userId);

    if (!participantData) return 0;

    const conversationIds = participantData.map(p => p.conversation_id);

    // Count unread messages in those conversations
    const { count } = await supabase
      .from(MESSAGES_TABLE)
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Legacy function - Get all messages for a user (direct messages + announcements)
export const getMessagesByUser = async (userId: string): Promise<Message[]> => {
  try {
    // Get all conversations the user is part of
    const { data: participantData } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('conversation_id')
      .eq('user_id', userId);

    if (!participantData) return [];

    const conversationIds = participantData.map(p => p.conversation_id);

    // Get all messages from those conversations
    const { data: messages, error } = await supabase
      .from(MESSAGES_TABLE)
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        attachments:message_attachments (
          id,
          file_name,
          file_url,
          file_type,
          file_size,
          created_at
        )
      `)
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages by user:', error);
      return [];
    }

    // Also get announcements from last 48 hours
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: announcements } = await supabase
      .from(MESSAGES_TABLE)
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

    // Combine and deduplicate
    const allMessages = [...(messages || []), ...(announcements || [])];
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
    const { data: participantData } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('conversation_id')
      .eq('user_id', userId);

    if (!participantData) return [];

    const conversationIds = participantData.map(p => p.conversation_id);

    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds)
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

// Create announcement message with advanced filters
export const createAnnouncement = async (
  senderId: string,
  subject: string,
  content: string,
  targetRoles?: string[],
  filters?: {
    service_types?: string[];
    service_categories?: string[];
    trainer_ids?: string[];
    next_service_before?: string; // ISO date string
    next_service_after?: string; // ISO date string
  }
): Promise<Message | null> => {
  try {
    const insertData: any = {
        sender_id: senderId,
        subject,
        content,
        is_announcement: true,
        target_roles: targetRoles || null,
        delivered_at: new Date().toISOString(),
    };

    // Add filter fields if provided
    if (filters) {
      if (filters.service_types && filters.service_types.length > 0) {
        insertData.filter_service_types = filters.service_types;
      }
      if (filters.service_categories && filters.service_categories.length > 0) {
        insertData.filter_service_categories = filters.service_categories;
      }
      if (filters.trainer_ids && filters.trainer_ids.length > 0) {
        insertData.filter_trainer_ids = filters.trainer_ids;
      }
      if (filters.next_service_before) {
        insertData.filter_next_service_before = filters.next_service_before;
      }
      if (filters.next_service_after) {
        insertData.filter_next_service_after = filters.next_service_after;
      }
    }

    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .insert(insertData)
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
      console.error('Error creating announcement:', error);
      return null;
    }

    return data as any;
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    return null;
  }
};

// Legacy function - Create a direct message (non-conversation based)
export const createMessage = async (
  messageData: {
    sender_id: string;
    recipient_id?: string;
    subject?: string;
    content: string;
    is_announcement?: boolean;
    target_roles?: string[];
    message_type?: 'text' | 'image' | 'file';
  }
): Promise<Message | null> => {
  try {
    console.log('createMessage called with:', {
      sender_id: messageData.sender_id,
      recipient_id: messageData.recipient_id,
      is_announcement: messageData.is_announcement,
      content_length: messageData.content.length,
    });

    // If it's an announcement, use createAnnouncement
    if (messageData.is_announcement) {
      const announcement = await createAnnouncement(
        messageData.sender_id,
        messageData.subject || 'Announcement',
        messageData.content,
        messageData.target_roles,
        (messageData as any).filters // Pass filters if provided
      );
      if (!announcement) {
        throw new Error('Failed to create announcement');
      }
      return announcement;
    }

    // For direct messages, create or get conversation first
    if (!messageData.recipient_id) {
      console.error('recipient_id is required for direct messages');
      throw new Error('Recipient ID is required for direct messages');
    }

    console.log('Creating/getting conversation between:', messageData.sender_id, 'and', messageData.recipient_id);
    const conversationId = await getOrCreateConversation(
      messageData.sender_id,
      messageData.recipient_id
    );
    console.log('DEBUG: IDs passed to getOrCreateConversation:', messageData.sender_id, messageData.recipient_id); // New Line

    if (!conversationId) {
      throw new Error('Failed to create or get conversation');
    }

    console.log('Conversation ID:', conversationId);
    console.log('Sending message to conversation');

    // Send the message
    const message = await sendMessage(
      conversationId,
      messageData.sender_id,
      messageData.content
    );

    if (!message) {
      throw new Error('Failed to send message');
    }

    console.log('Message sent successfully:', message.id);
    return message;
  } catch (error) {
    console.error('Error in createMessage:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    // Properly serialize error objects
    const errorMessage = typeof error === 'object' && error !== null
      ? JSON.stringify(error, Object.getOwnPropertyNames(error))
      : String(error);
    throw new Error(`Failed to create message: ${errorMessage}`);
  }
};

// Optimized Real-time Subscription
export const subscribeToMessages = (
  userId: string,
  callback: (message: Message) => void
) => {
  console.log('Setting up real-time subscription for user:', userId);

  const channel = supabase
    .channel(`user-messages-${userId}`) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
        table: 'messages',
        // We do NOT filter here. We let RLS handle security, 
        // and we filter logic client-side for speed.
        },
        async (payload) => {
        const newMessage = payload.new as any;
          
        // 1. FAST CHECK: Is this relevant to me?
        // We check IDs directly. No DB query needed yet.
          const isRelevant = 
          newMessage.sender_id === userId || 
          newMessage.recipient_id === userId ||
          newMessage.is_announcement === true;

        if (!isRelevant) return;

        console.log('Realtime event received:', newMessage.id);

        // 2. Fetch details (Sender info is needed for UI)
        // We only do this fetch if we passed the fast check.
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
              ),
              attachments:message_attachments (*)
              `)
            .eq('id', newMessage.id)
              .single();

          if (!error && data) {
              callback(data as any);
            }
        } catch (fetchError) {
          console.error('Error fetching details for new message:', fetchError);
          // Fallback: send the raw message so UI at least updates
          callback(newMessage); 
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status for ${userId}:`, status);
    });

    return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
    };
};

// Helper function to check if user is in a conversation
const isUserInConversation = async (userId: string, conversationId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
};