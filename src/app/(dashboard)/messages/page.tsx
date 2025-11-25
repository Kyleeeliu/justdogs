
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ClockIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  PaperClipIcon,
  CheckIcon,
  ArrowLeftIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckCheckIcon } from '@heroicons/react/24/solid';
import { getCurrentUser } from '@/lib/auth/auth';
import { Message, User, UserRole } from '@/types';
import { formatDateTime, formatTime } from '@/lib/utils';
import { getAllUsers, getUsersByRole } from '@/lib/supabase/users';
import { getAllServices } from '@/lib/supabase/content';
import { defaultServices } from '@/lib/data/content';
import {
  createMessage,
  getMessagesByUser,
  subscribeToMessages,
  markMessageAsRead
} from '@/lib/supabase/messages';

// Mock conversation type for the UI
interface MockConversation {
  id: string; // This can be conversation_id UUID or user ID (for backward compatibility)
  conversationId?: string; // The actual conversation_id UUID from database
  otherUserId?: string; // The other participant's user ID
  participants: string[];
  participantNames: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<MockConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MockConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Announcement form data
  const [announcementData, setAnnouncementData] = useState({
    subject: '',
    content: '',
    target_roles: [] as UserRole[],
    filters: {
      service_types: [] as string[],
      service_categories: [] as string[],
      trainer_ids: [] as string[],
      next_service_before: '',
      next_service_after: '',
    }
  });
  const [trainers, setTrainers] = useState<User[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const loadUser = async () => {
      // Set a timeout to ensure loading always completes
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Loading timeout - forcing completion');
          setLoading(false);
          setMessages([]);
          setAvailableUsers([]);
        }
      }, 10000); // 10 second timeout

      try {
        console.log('Loading messages page...');

        // Load user with timeout
        const userPromise = getCurrentUser();
        const timeoutPromise = new Promise<User | null>((resolve) => {
          setTimeout(() => resolve(null), 5000);
        });
        const user = await Promise.race([userPromise, timeoutPromise]);

        console.log('Current user:', user?.email || 'none');

        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        setCurrentUser(user);

        if (user) {
          // Load available users for chat
          const users = await getAllUsers();
          if (mounted) {
            setAvailableUsers(users.filter(u => u.id !== user.id));
          }

          // Load trainers and services for admin announcement filters
          if (user.role === 'admin') {
            try {
              const trainersList = await getUsersByRole('trainer');
              const servicesList = await getAllServices();
              if (mounted) {
                setTrainers(trainersList);
                // Fallback to default services if Supabase returns empty (likely due to error or empty DB)
                setServices(servicesList.length > 0 ? servicesList : defaultServices);
              }
            } catch (error) {
              console.error('Error loading filters data:', error);
            }
          }

          // Load messages and create mock conversations
          const userMessages = await getMessagesByUser(user.id);
          if (mounted) {
            setMessages(userMessages);
          }

          // Create mock conversations from messages
          const conversationMap = new Map<string, MockConversation>();

          userMessages.forEach(message => {
            let conversationKey: string; // Key for the map
            let conversationId: string; // The actual conversation_id UUID or fallback ID
            let otherParticipant: string;

            if (message.is_announcement) {
              conversationKey = 'announcements';
              conversationId = 'announcements';
              otherParticipant = 'System';
            } else if (message.conversation_id) {
              // Use conversation_id UUID as both key and ID (new conversation-based system)
              conversationKey = message.conversation_id;
              conversationId = message.conversation_id;
              // Find the other participant from the message
              otherParticipant = message.sender_id === user.id
                ? (message.recipient_id || 'unknown')
                : message.sender_id;
            } else if (message.sender_id === user.id) {
              // Fallback to old system using recipient_id
              conversationKey = message.recipient_id || 'unknown';
              conversationId = message.recipient_id || 'unknown';
              otherParticipant = message.recipient_id || 'unknown';
            } else {
              // Fallback to old system using sender_id
              conversationKey = message.sender_id;
              conversationId = message.sender_id;
              otherParticipant = message.sender_id;
            }

            if (!conversationMap.has(conversationKey)) {
              const otherUser = users.find(u => u.id === otherParticipant);
              conversationMap.set(conversationKey, {
                id: conversationId, // Use the actual conversation_id UUID when available
                conversationId: message.conversation_id || undefined, // Store the UUID conversation_id
                otherUserId: conversationKey === 'announcements' ? undefined : otherParticipant,
                participants: conversationKey === 'announcements' ? ['system'] : [user.id, otherParticipant],
                participantNames: conversationKey === 'announcements' ? ['Announcements'] : [otherUser?.full_name || 'Unknown User'],
                lastMessage: message.content,
                lastMessageTime: message.created_at,
                unreadCount: 0
              });
            }

            const conversation = conversationMap.get(conversationKey)!;
            if (new Date(message.created_at) > new Date(conversation.lastMessageTime || '')) {
              conversation.lastMessage = message.content;
              conversation.lastMessageTime = message.created_at;
            }

            if (!message.read_at && message.sender_id !== user.id) {
              conversation.unreadCount++;
            }
          });

          if (mounted) {
            setConversations(Array.from(conversationMap.values()).sort((a, b) =>
              new Date(b.lastMessageTime || '').getTime() - new Date(a.lastMessageTime || '').getTime()
            ));
          }

          // Subscribe to real-time message updates
          try {
            subscription = subscribeToMessages(user.id, async (newMessage) => {
              if (mounted) {
                console.log('New message received via subscription:', newMessage.id);

                // Reload all messages to ensure consistency
                try {
                  const updatedMessages = await getMessagesByUser(user.id);
                  setMessages(updatedMessages);

                  // Rebuild conversations from updated messages
                  const updatedConversationMap = new Map<string, MockConversation>();
                  updatedMessages.forEach(msg => {
                    let convId: string;
                    let otherParticipant: string;

                    if (msg.is_announcement) {
                      convId = 'announcements';
                      otherParticipant = 'System';
                    } else if (msg.conversation_id) {
                      convId = msg.conversation_id;
                      otherParticipant = msg.sender_id === user.id
                        ? (msg.recipient_id || 'unknown')
                        : msg.sender_id;
                    } else if (msg.sender_id === user.id) {
                      convId = msg.recipient_id || 'unknown';
                      otherParticipant = msg.recipient_id || 'unknown';
                    } else {
                      convId = msg.sender_id;
                      otherParticipant = msg.sender_id;
                    }

                    if (!updatedConversationMap.has(convId)) {
                      const otherUser = availableUsers.find(u => u.id === otherParticipant);
                      updatedConversationMap.set(convId, {
                        id: convId,
                        conversationId: msg.conversation_id || undefined,
                        otherUserId: convId === 'announcements' ? undefined : otherParticipant,
                        participants: convId === 'announcements' ? ['system'] : [user.id, otherParticipant],
                        participantNames: convId === 'announcements' ? ['Announcements'] : [otherUser?.full_name || 'Unknown User'],
                        lastMessage: msg.content,
                        lastMessageTime: msg.created_at,
                        unreadCount: 0
                      });
                    }

                    const conv = updatedConversationMap.get(convId)!;
                    if (new Date(msg.created_at) > new Date(conv.lastMessageTime || '')) {
                      conv.lastMessage = msg.content;
                      conv.lastMessageTime = msg.created_at;
                    }

                    if (!msg.read_at && msg.sender_id !== user.id) {
                      conv.unreadCount++;
                    }
                  });

                  setConversations(Array.from(updatedConversationMap.values()).sort((a, b) =>
                    new Date(b.lastMessageTime || '').getTime() - new Date(a.lastMessageTime || '').getTime()
                  ));

                  // Scroll to bottom if this message is in the currently selected conversation
                  if (selectedConversation && (
                    newMessage.conversation_id === selectedConversation.id ||
                    (newMessage.sender_id === user.id && newMessage.recipient_id === selectedConversation.id) ||
                    (newMessage.sender_id === selectedConversation.id && newMessage.recipient_id === user.id)
                  )) {
                    setTimeout(() => scrollToBottom(), 100);
                  }
                } catch (reloadError) {
                  console.error('Error reloading messages in subscription:', reloadError);
                  // Fallback: just add the message
                  setMessages(prev => {
                    const exists = prev.some(m => m.id === newMessage.id);
                    if (exists) return prev;
                    return [...prev, newMessage];
                  });
                }
              }
            });
          } catch (subscriptionError) {
            console.error('Error setting up message subscription:', subscriptionError);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setMessages([]);
          setAvailableUsers([]);
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          console.log('Loading complete');
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConversationSelect = async (conversation: MockConversation) => {
    setSelectedConversation(conversation);

    // Reload messages to ensure we have the latest
    if (currentUser) {
      try {
        const updatedMessages = await getMessagesByUser(currentUser.id);
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Error reloading messages on conversation select:', error);
      }
    }

    // Mark messages as read (will be done after messages reload)
    setTimeout(async () => {
      const conversationMessages = getConversationMessages();
      const unreadMessages = conversationMessages.filter(
        msg => !msg.read_at && msg.sender_id !== currentUser?.id
      );

      for (const msg of unreadMessages) {
        try {
          await markMessageAsRead(msg.id);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      }

      // Update local state
      setMessages(prev => prev.map(msg =>
        unreadMessages.some(unread => unread.id === msg.id)
          ? { ...msg, read_at: new Date().toISOString() }
          : msg
      ));
    }, 500);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!currentUser || !selectedConversation) return;

    if (selectedConversation.id === 'announcements') {
      alert('Cannot send messages to announcements. Use the Announcement button to create announcements.');
      return;
    }

    const messageContent = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX

    try {
      // Get the recipient user ID - use otherUserId if available, otherwise fall back to id
      // otherUserId is the actual user ID, while id might be a conversation UUID
      const recipientId = selectedConversation.otherUserId || selectedConversation.id;
      
      // Don't use conversation UUID as recipient_id - it should be a user ID
      if (selectedConversation.conversationId && !selectedConversation.otherUserId) {
        console.error('Cannot send message: conversation has no otherUserId');
        alert('Error: Cannot determine recipient. Please select a conversation.');
        return;
      }

      console.log('Sending message:', {
        sender_id: currentUser.id,
        recipient_id: recipientId,
        conversation_id: selectedConversation.conversationId,
        content_length: messageContent.length,
      });

      const messageData = {
        sender_id: currentUser.id,
        recipient_id: recipientId,
        subject: '', // Chat messages don't need subjects
        content: messageContent,
        is_announcement: false,
        message_type: (attachments.length > 0 ? 'image' : 'text') as 'text' | 'image' | 'file'
      };

      const newMessage = await createMessage(messageData);

      if (newMessage) {
        console.log('Message sent successfully:', newMessage.id);

        // Reload messages to ensure we have the latest from database
        if (currentUser) {
          try {
            const updatedMessages = await getMessagesByUser(currentUser.id);
            setMessages(updatedMessages);

            // Update conversations list with latest messages
            const updatedConversationMap = new Map<string, MockConversation>();
            updatedMessages.forEach(msg => {
              let convId: string;
              let otherParticipant: string;

              if (msg.is_announcement) {
                convId = 'announcements';
                otherParticipant = 'System';
              } else if (msg.conversation_id) {
                convId = msg.conversation_id;
                otherParticipant = msg.sender_id === currentUser.id
                  ? (msg.recipient_id || 'unknown')
                  : msg.sender_id;
              } else if (msg.sender_id === currentUser.id) {
                convId = msg.recipient_id || 'unknown';
                otherParticipant = msg.recipient_id || 'unknown';
              } else {
                convId = msg.sender_id;
                otherParticipant = msg.sender_id;
              }

              if (!updatedConversationMap.has(convId)) {
                const otherUser = availableUsers.find(u => u.id === otherParticipant);
                updatedConversationMap.set(convId, {
                  id: convId,
                  conversationId: msg.conversation_id || undefined,
                  otherUserId: convId === 'announcements' ? undefined : otherParticipant,
                  participants: convId === 'announcements' ? ['system'] : [currentUser.id, otherParticipant],
                  participantNames: convId === 'announcements' ? ['Announcements'] : [otherUser?.full_name || 'Unknown User'],
                  lastMessage: msg.content,
                  lastMessageTime: msg.created_at,
                  unreadCount: 0
                });
              }

              const conv = updatedConversationMap.get(convId)!;
              if (new Date(msg.created_at) > new Date(conv.lastMessageTime || '')) {
                conv.lastMessage = msg.content;
                conv.lastMessageTime = msg.created_at;
              }

              if (!msg.read_at && msg.sender_id !== currentUser.id) {
                conv.unreadCount++;
              }
            });

            setConversations(Array.from(updatedConversationMap.values()).sort((a, b) =>
              new Date(b.lastMessageTime || '').getTime() - new Date(a.lastMessageTime || '').getTime()
            ));

            // Ensure the selected conversation is still selected (in case ID changed)
            // Try to find by conversation_id UUID first, then by other user ID
            let updatedConv = newMessage.conversation_id
              ? Array.from(updatedConversationMap.values()).find(c => c.conversationId === newMessage.conversation_id)
              : null;

            if (!updatedConv) {
              // Fallback: find by other user ID
              updatedConv = Array.from(updatedConversationMap.values()).find(c =>
                c.otherUserId === selectedConversation.otherUserId ||
                c.id === selectedConversation.id
              );
            }

            if (updatedConv) {
              console.log('Updated selected conversation:', updatedConv);
              setSelectedConversation(updatedConv);
            } else {
              console.warn('Could not find updated conversation for:', {
                conversation_id: newMessage.conversation_id,
                selectedConversationId: selectedConversation.id
              });
            }
          } catch (reloadError) {
            console.error('Error reloading messages:', reloadError);
            // Fallback: just add the message locally
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }

        // Scroll to bottom to show new message
        setTimeout(() => scrollToBottom(), 200);
      } else {
        throw new Error('Message was not created');
      }

      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message input on error
      setMessageInput(messageContent);
      alert(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    }
  };

  const handleCreateNewChat = async () => {
    if (selectedUsers.length === 0 || !currentUser) return;

    // For now, just select the first user and create a mock conversation
    const selectedUser = availableUsers.find(u => u.id === selectedUsers[0]);
    if (selectedUser) {
      const newConversation: MockConversation = {
        id: selectedUser.id,
        participants: [currentUser.id, selectedUser.id],
        participantNames: [selectedUser.full_name],
        unreadCount: 0
      };

      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      setShowNewChatModal(false);
      setSelectedUsers([]);
      setUserSearchTerm('');
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementData.subject.trim() || !announcementData.content.trim() || !currentUser) return;

    try {
      // Build filters object (only include non-empty filters)
      const filters: any = {};
      if (announcementData.filters.service_types.length > 0) {
        filters.service_types = announcementData.filters.service_types;
      }
      if (announcementData.filters.service_categories.length > 0) {
        filters.service_categories = announcementData.filters.service_categories;
      }
      if (announcementData.filters.trainer_ids.length > 0) {
        filters.trainer_ids = announcementData.filters.trainer_ids;
      }
      if (announcementData.filters.next_service_before) {
        filters.next_service_before = announcementData.filters.next_service_before;
      }
      if (announcementData.filters.next_service_after) {
        filters.next_service_after = announcementData.filters.next_service_after;
      }

      await createMessage({
        sender_id: currentUser.id,
        subject: announcementData.subject,
        content: announcementData.content,
        is_announcement: true,
        target_roles: announcementData.target_roles.length > 0 ? announcementData.target_roles : undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      } as any);

      setAnnouncementData({
        subject: '',
        content: '',
        target_roles: [],
        filters: {
          service_types: [],
          service_categories: [],
          trainer_ids: [],
          next_service_before: '',
          next_service_after: '',
        }
      });
      setShowAnnouncementModal(false);
      alert('Announcement sent successfully!');
    } catch (error) {
      console.error('Error sending announcement:', error);
      alert('Failed to send announcement. Please try again.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredConversations = conversations.filter(conv =>
    conv.participantNames.some(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getConversationName = (conversation: MockConversation) => {
    return conversation.participantNames[0] || 'Unknown User';
  };

  const getConversationMessages = () => {
    if (!selectedConversation) return [];

    if (selectedConversation.id === 'announcements') {
      return messages.filter(msg => msg.is_announcement);
    }

    console.log('Filtering messages for conversation:', {
      conversationId: selectedConversation.id,
      conversationIdUUID: selectedConversation.conversationId,
      otherUserId: selectedConversation.otherUserId,
      totalMessages: messages.length,
      currentUserId: currentUser?.id
    });

    // Filter messages by conversation_id (new system) or sender/recipient (old system)
    const filtered = messages.filter(msg => {
      if (msg.is_announcement) return false;

      // Check if message belongs to this conversation by conversation_id UUID
      if (selectedConversation.conversationId && msg.conversation_id === selectedConversation.conversationId) {
        console.log('Matched by conversation_id UUID:', msg.id);
        return true;
      }

      // Check if message belongs to this conversation by conversation_id matching selectedConversation.id
      if (msg.conversation_id === selectedConversation.id) {
        console.log('Matched by conversation_id (selectedConversation.id):', msg.id);
        return true;
      }

      // Check by other user ID
      if (selectedConversation.otherUserId) {
        if ((msg.sender_id === currentUser?.id && msg.recipient_id === selectedConversation.otherUserId) ||
          (msg.sender_id === selectedConversation.otherUserId && msg.recipient_id === currentUser?.id)) {
          console.log('Matched by otherUserId:', msg.id);
          return true;
        }
      }

      // Fallback: Check by sender/recipient (for backward compatibility)
      if (msg.sender_id === currentUser?.id && msg.recipient_id === selectedConversation.id) {
        console.log('Matched by sender/recipient (fallback 1):', msg.id);
        return true;
      }
      if (msg.sender_id === selectedConversation.id && msg.recipient_id === currentUser?.id) {
        console.log('Matched by sender/recipient (fallback 2):', msg.id);
        return true;
      }

      return false;
    });

    console.log('Filtered messages count:', filtered.length);
    filtered.forEach(msg => {
      console.log('Message:', {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        content: msg.content.substring(0, 50)
      });
    });

    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_id !== currentUser?.id) return null;

    if (message.read_at) {
      return <CheckCheckIcon className="h-4 w-4 text-blue-500" />;
    } else {
      return <CheckIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
        <p className="text-sm text-gray-600 font-medium">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-gray-600 text-base">Chat with trainers, parents, and staff</p>
        </div>
        <div className="flex gap-3 mt-6 sm:mt-0">
          {currentUser?.role === 'admin' && (
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              variant="outline"
              className="border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white"
            >
              <UserGroupIcon className="h-4 w-4 mr-2" />
              Announcement
            </Button>
          )}
          <Button
            onClick={() => setShowNewChatModal(true)}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={`w-full sm:w-80 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)]"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationSelect(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-[rgb(0_32_96)]' : ''
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {getConversationName(conversation).charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getConversationName(conversation)}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-[rgb(0_32_96)] text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    {conversation.lastMessageTime && (
                      <p className="text-xs text-gray-400">
                        {formatTime(conversation.lastMessageTime)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to begin messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden sm:flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="sm:hidden"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </Button>
                  <div className="w-10 h-10 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {getConversationName(selectedConversation).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {getConversationName(selectedConversation)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.id === 'announcements' ? 'System announcements' : 'Online'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getConversationMessages().map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender_id === currentUser?.id
                          ? 'bg-[rgb(0_32_96)] text-white'
                          : 'bg-gray-100 text-gray-900'
                        }`}
                    >
                      {message.sender_id !== currentUser?.id && !message.is_announcement && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {availableUsers.find(u => u.id === message.sender_id)?.full_name || 'Unknown'}
                        </p>
                      )}

                      {message.is_announcement && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          📢 {message.subject}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap">{message.content}</p>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {selectedConversation.id !== 'announcements' && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="relative">
                          {file.type.startsWith('image/') ? (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <button
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded">
                              <PaperClipIcon className="h-4 w-4" />
                              <span className="text-sm truncate max-w-20">{file.name}</span>
                              <button
                                onClick={() => removeAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end space-x-2">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2"
                      >
                        <PhotoIcon className="h-5 w-5 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2"
                      >
                        <PaperClipIcon className="h-5 w-5 text-gray-500" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Type a message..."
                        className="border-gray-200 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] text-gray-900 bg-white"
                      />
                    </div>

                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() && attachments.length === 0}
                      className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] p-2"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Hidden file inputs */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Chat</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewChatModal(false)}
                className="hover:bg-gray-200 rounded-full p-2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* User Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] text-gray-900 bg-white placeholder-gray-500"
                />
              </div>

              {/* User List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUsers([user.id]);
                        handleCreateNewChat();
                      }}
                      className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">{user.full_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No users found</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {userSearchTerm ? 'Try a different search term' : 'No other users available to message'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-semibold text-gray-900">Send Announcement</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnnouncementModal(false)}
                className="hover:bg-gray-200 rounded-full p-2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Subject */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Subject</label>
                <Input
                  type="text"
                  value={announcementData.subject}
                  onChange={(e) => setAnnouncementData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter announcement subject..."
                  className="border-gray-300 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)]"
                />
              </div>

              {/* Target Roles */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Target Audience</label>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  {(['parent', 'trainer', 'behaviorist'] as UserRole[]).map(role => (
                    <label key={role} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcementData.target_roles.includes(role)}
                        onChange={(e) => {
                          const newRoles = e.target.checked
                            ? [...announcementData.target_roles, role]
                            : announcementData.target_roles.filter(r => r !== role);
                          setAnnouncementData(prev => ({ ...prev, target_roles: newRoles }));
                        }}
                        className="mr-3 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium capitalize text-gray-900">{role}s</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600">
                  Select specific roles to target, or leave all unchecked to send to everyone.
                </p>
              </div>

              {/* Advanced Filters (Admin only) */}
              {currentUser?.role === 'admin' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">Advanced Filters</label>
                    <span className="text-xs text-gray-500">Optional - refine your audience</span>
                  </div>

                  {/* Service Categories Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Service Categories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['behaviour', 'farm', 'academy', 'service'] as const).map(category => (
                        <label key={category} className="flex items-center cursor-pointer p-2 bg-gray-50 rounded hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={announcementData.filters.service_categories.includes(category)}
                            onChange={(e) => {
                              const newCategories = e.target.checked
                                ? [...announcementData.filters.service_categories, category]
                                : announcementData.filters.service_categories.filter(c => c !== category);
                              setAnnouncementData(prev => ({
                                ...prev,
                                filters: { ...prev.filters, service_categories: newCategories }
                              }));
                            }}
                            className="mr-2 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                          />
                          <span className="text-sm capitalize text-gray-900">
                            {category === 'behaviour' ? 'Behaviour & Home' :
                              category === 'farm' ? 'Farm' :
                                category === 'academy' ? 'Academy' : 'Service & Support'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Service Types Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Service Types</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pet_care', 'dog_sitting', 'dog_training', 'private_training', 'consult'] as const).map(type => (
                        <label key={type} className="flex items-center cursor-pointer p-2 bg-gray-50 rounded hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={announcementData.filters.service_types.includes(type)}
                            onChange={(e) => {
                              const newTypes = e.target.checked
                                ? [...announcementData.filters.service_types, type]
                                : announcementData.filters.service_types.filter(t => t !== type);
                              setAnnouncementData(prev => ({
                                ...prev,
                                filters: { ...prev.filters, service_types: newTypes }
                              }));
                            }}
                            className="mr-2 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                          />
                          <span className="text-sm capitalize text-gray-900">
                            {type.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trainer Filter */}
                  {trainers.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Trainers/Handlers</label>
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                        {trainers.map(trainer => (
                          <label key={trainer.id} className="flex items-center cursor-pointer p-1 hover:bg-gray-100 rounded">
                            <input
                              type="checkbox"
                              checked={announcementData.filters.trainer_ids.includes(trainer.id)}
                              onChange={(e) => {
                                const newTrainerIds = e.target.checked
                                  ? [...announcementData.filters.trainer_ids, trainer.id]
                                  : announcementData.filters.trainer_ids.filter(id => id !== trainer.id);
                                setAnnouncementData(prev => ({
                                  ...prev,
                                  filters: { ...prev.filters, trainer_ids: newTrainerIds }
                                }));
                              }}
                              className="mr-2 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-900">{trainer.full_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Next Service After</label>
                      <Input
                        type="date"
                        value={announcementData.filters.next_service_after}
                        onChange={(e) => setAnnouncementData(prev => ({
                          ...prev,
                          filters: { ...prev.filters, next_service_after: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Next Service Before</label>
                      <Input
                        type="date"
                        value={announcementData.filters.next_service_before}
                        onChange={(e) => setAnnouncementData(prev => ({
                          ...prev,
                          filters: { ...prev.filters, next_service_before: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Filter by clients with upcoming services in the specified date range
                  </p>
                </div>
              )}

              {/* Content */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Message Content</label>
                <textarea
                  value={announcementData.content}
                  onChange={(e) => setAnnouncementData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Type your announcement here..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-[rgb(0_32_96)] min-h-[140px] resize-vertical text-gray-900 bg-white shadow-sm transition-colors"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendAnnouncement}
                  className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
                >
                  Send Announcement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
