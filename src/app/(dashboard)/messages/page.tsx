
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
import { getAllUsers } from '@/lib/supabase/users';
import { 
  createMessage, 
  getMessagesByUser, 
  subscribeToMessages, 
  markMessageAsRead
} from '@/lib/supabase/messages';

// Mock conversation type for the UI
interface MockConversation {
  id: string;
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
    target_roles: [] as UserRole[]
  });

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
          
          // Load messages and create mock conversations
          const userMessages = await getMessagesByUser(user.id);
          if (mounted) {
            setMessages(userMessages);
          }
          
          // Create mock conversations from messages
          const conversationMap = new Map<string, MockConversation>();
          
          userMessages.forEach(message => {
            let conversationId: string;
            let otherParticipant: string;
            
            if (message.is_announcement) {
              conversationId = 'announcements';
              otherParticipant = 'System';
            } else if (message.sender_id === user.id) {
              conversationId = message.recipient_id || 'unknown';
              otherParticipant = message.recipient_id || 'unknown';
            } else {
              conversationId = message.sender_id;
              otherParticipant = message.sender_id;
            }
            
            if (!conversationMap.has(conversationId)) {
              const otherUser = users.find(u => u.id === otherParticipant);
              conversationMap.set(conversationId, {
                id: conversationId,
                participants: conversationId === 'announcements' ? ['system'] : [user.id, otherParticipant],
                participantNames: conversationId === 'announcements' ? ['Announcements'] : [otherUser?.full_name || 'Unknown User'],
                lastMessage: message.content,
                lastMessageTime: message.created_at,
                unreadCount: 0
              });
            }
            
            const conversation = conversationMap.get(conversationId)!;
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
            subscription = subscribeToMessages(user.id, (newMessage) => {
              if (mounted) {
                setMessages(prev => [...prev, newMessage]);
                // Update conversations when new message arrives
                const updatedConversations = [...conversations];
                const convIndex = updatedConversations.findIndex(c => 
                  c.id === (newMessage.is_announcement ? 'announcements' : 
                    (newMessage.sender_id === user.id ? newMessage.recipient_id : newMessage.sender_id))
                );
                if (convIndex >= 0) {
                  updatedConversations[convIndex].lastMessage = newMessage.content;
                  updatedConversations[convIndex].lastMessageTime = newMessage.created_at;
                  if (!newMessage.read_at && newMessage.sender_id !== user.id) {
                    updatedConversations[convIndex].unreadCount++;
                  }
                }
                setConversations(updatedConversations);
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
    
    // Filter messages for this conversation
    let conversationMessages: Message[] = [];
    
    if (conversation.id === 'announcements') {
      conversationMessages = messages.filter(msg => msg.is_announcement);
    } else {
      conversationMessages = messages.filter(msg => 
        !msg.is_announcement && (
          (msg.sender_id === currentUser?.id && msg.recipient_id === conversation.id) ||
          (msg.sender_id === conversation.id && msg.recipient_id === currentUser?.id)
        )
      );
    }
    
    // Mark messages as read
    const unreadMessages = conversationMessages.filter(
      msg => !msg.read_at && msg.sender_id !== currentUser?.id
    );
    
    for (const msg of unreadMessages) {
      await markMessageAsRead(msg.id);
    }
    
    // Update local state
    setMessages(prev => prev.map(msg => 
      unreadMessages.some(unread => unread.id === msg.id) 
        ? { ...msg, read_at: new Date().toISOString() }
        : msg
    ));
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!currentUser || !selectedConversation) return;

    try {
      const messageData = {
        sender_id: currentUser.id,
        recipient_id: selectedConversation.id === 'announcements' ? undefined : selectedConversation.id,
        subject: '', // Chat messages don't need subjects
        content: messageInput.trim(),
        is_announcement: false,
        message_type: (attachments.length > 0 ? 'image' : 'text') as 'text' | 'image' | 'file'
      };

      const newMessage = await createMessage(messageData);
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        // Update conversation last message
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: newMessage.content, lastMessageTime: newMessage.created_at }
            : conv
        ));
      }
      setMessageInput('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
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
      await createMessage({
        sender_id: currentUser.id,
        subject: announcementData.subject,
        content: announcementData.content,
        is_announcement: true,
        target_roles: announcementData.target_roles.length > 0 ? announcementData.target_roles : undefined
      });

      setAnnouncementData({ subject: '', content: '', target_roles: [] });
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
    
    return messages.filter(msg => 
      !msg.is_announcement && (
        (msg.sender_id === currentUser?.id && msg.recipient_id === selectedConversation.id) ||
        (msg.sender_id === selectedConversation.id && msg.recipient_id === currentUser?.id)
      )
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-[rgb(0_32_96)]' : ''
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
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === currentUser?.id
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
