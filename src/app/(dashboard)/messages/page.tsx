'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/auth/auth';
import { Message, User, UserRole } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { getAllUsers } from '@/lib/supabase/users';
import { createMessage, getMessagesByUser, subscribeToMessages, markMessageAsRead } from '@/lib/supabase/messages';

// Import getAllUsers directly from the database

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    is_announcement: false,
    target_roles: [] as UserRole[]
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Load user names first
        await loadUserNames();
        
        if (user) {
          // Load messages from Supabase based on user role
          try {
            const userMessages = await getMessagesByUser(user.id);
            setMessages(userMessages);
          } catch (messageError) {
            console.error('Error fetching messages by user:', messageError);
            // Fallback to empty array if Supabase fails
            setMessages([]);
          }
          
          // Load available recipients
          try {
            const recipients = await getAvailableRecipients();
            setAvailableRecipients(recipients);
          } catch (recipientError) {
            console.error('Error loading recipients:', recipientError);
            setAvailableRecipients([]);
          }
          
          // Subscribe to real-time message updates
          try {
            const subscription = subscribeToMessages(user.id, (newMessage) => {
              setMessages(prev => [newMessage, ...prev]);
            });
            
            // Cleanup subscription on unmount
            return () => {
              subscription.unsubscribe();
            };
          } catch (subscriptionError) {
            console.error('Error setting up message subscription:', subscriptionError);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const filteredMessages = messages.filter(message =>
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadMessages = messages.filter(message => !message.read_at);
  const recentMessages = messages.slice(0, 5);

  const [userNames, setUserNames] = useState<{[key: string]: string}>({});

  const getSenderName = (senderId: string) => {
    return userNames[senderId] || 'Unknown User';
  };

  const getReceiverName = (receiverId?: string) => {
    if (!receiverId) return 'All Users';
    return userNames[receiverId] || 'Unknown User';
  };

  const loadUserNames = async () => {
    try {
      const allUsers = await getAllUsers();
      const nameMap: {[key: string]: string} = {};
      allUsers.forEach(user => {
        nameMap[user.id] = user.full_name;
      });
      setUserNames(nameMap);
    } catch (error) {
      console.error('Error loading user names:', error);
    }
  };

  const getMessageTypeColor = (isAnnouncement: boolean) => {
    if (isAnnouncement) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-[rgb(0_32_96)] text-white';
  };

  const handleInputChange = (field: string, value: string | boolean | UserRole[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    try {
      // Create message in Supabase
      const newMessage = await createMessage({
        sender_id: currentUser.id,
        recipient_id: formData.is_announcement ? undefined : formData.recipient_id,
        subject: formData.subject,
        content: formData.content,
        is_announcement: formData.is_announcement,
        target_roles: formData.is_announcement ? formData.target_roles : undefined,
      });

      // Update local state
      setMessages(prev => [newMessage, ...prev]);
      setFormData({
        recipient_id: '',
        subject: '',
        content: '',
        is_announcement: false,
        target_roles: [] as UserRole[]
      });
      setShowNewMessageModal(false);
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);
    
    // Mark message as read if it's unread and the current user is the recipient
    if (!message.read_at && currentUser &&
        (message.recipient_id === currentUser.id || message.is_announcement)) {
      try {
        await markMessageAsRead(message.id);
        // Update local state
        setMessages(prev => prev.map(m =>
          m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m
        ));
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const getAvailableRecipients = useCallback(async () => {
    if (!currentUser) return [];
    
    try {
      const allUsers = await getAllUsers();
      console.log('All users from Supabase:', allUsers);
      console.log('Current user:', currentUser);
      
      // Filter recipients based on role
      let recipients: User[] = [];
      
      if (currentUser.role === 'admin') {
        // Admins can only message parent accounts
        recipients = allUsers.filter(user =>
          user.id !== currentUser.id && user.role === 'parent'
        );
      } else if (currentUser.role === 'trainer') {
        // Trainers can message parents and behaviorists
        recipients = allUsers.filter(user =>
          user.id !== currentUser.id && (user.role === 'parent' || user.role === 'behaviorist')
        );
      } else if (currentUser.role === 'parent') {
        // Parents can message trainers and behaviorists
        recipients = allUsers.filter(user =>
          user.id !== currentUser.id && (user.role === 'trainer' || user.role === 'behaviorist')
        );
      } else if (currentUser.role === 'behaviorist') {
        // Behaviorists can message parents and trainers
        recipients = allUsers.filter(user =>
          user.id !== currentUser.id && (user.role === 'parent' || user.role === 'trainer')
        );
      }
      
      console.log('Available recipients for', currentUser.role + ':', recipients);
      return recipients;
    } catch (error) {
      console.error('Error fetching recipients:', error);
      return [];
    }
  }, [currentUser]);

  // Debug: Show current users in database
  const debugUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      console.log('=== DEBUG: All Users in Supabase ===');
      console.log('Total users:', allUsers.length);
      allUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        });
      });
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error debugging users:', error);
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-gray-600 text-base">Communicate with trainers, parents, and staff</p>
        </div>
        <div className="flex gap-3 mt-6 sm:mt-0">
          <Button
            onClick={() => setShowNewMessageModal(true)}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 border-gray-200 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] shadow-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Messages</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-[rgb(0_32_96)]" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{messages.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              All conversations
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Unread</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <ClockIcon className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{unreadMessages.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Recent Activity</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <UserGroupIcon className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{recentMessages.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Latest messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.map((message) => (
          <Card
            key={message.id}
            className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 ${
              !message.read_at
                ? 'border-l-4 border-l-[rgb(0_32_96)] bg-gradient-to-r from-[rgb(0_32_96)]/5 to-transparent shadow-sm'
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleMessageClick(message)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    {!message.read_at && (
                      <div className="w-2.5 h-2.5 bg-[rgb(0_32_96)] rounded-full flex-shrink-0"></div>
                    )}
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{message.subject}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getMessageTypeColor(message.is_announcement)}`}>
                      {message.is_announcement ? 'Announcement' : 'Direct'}
                    </span>
                  </div>
                  
                  <div className="mb-4 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium text-gray-700">From:</span>
                      <span className="ml-1">{getSenderName(message.sender_id)}</span>
                      {!message.is_announcement && (
                        <>
                          <span className="mx-3 text-gray-400">•</span>
                          <span className="font-medium text-gray-700">To:</span>
                          <span className="ml-1">{getReceiverName(message.recipient_id)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>

                  <p className="text-gray-700 line-clamp-2 leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredMessages.length === 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No messages found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
              {searchTerm ? 'Try adjusting your search terms to find what you\'re looking for.' : 'Start a conversation by sending your first message to connect with others.'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowNewMessageModal(true)}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] shadow-sm"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-semibold text-gray-900">Compose Message</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewMessageModal(false)}
                className="hover:bg-gray-200 rounded-full p-2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Message Type */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Message Type</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="messageType"
                      checked={!formData.is_announcement}
                      onChange={() => handleInputChange('is_announcement', false)}
                      className="mr-3 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-900">Direct Message</span>
                  </label>
                  {currentUser?.role === 'admin' && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="messageType"
                        checked={formData.is_announcement}
                        onChange={() => handleInputChange('is_announcement', true)}
                        className="mr-3 h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-900">Announcement</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Recipient Selection */}
              {!formData.is_announcement && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Recipient
                  </label>
                  <select
                    value={formData.recipient_id}
                    onChange={(e) => handleInputChange('recipient_id', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-[rgb(0_32_96)] text-gray-900 bg-white shadow-sm transition-colors"
                    required
                  >
                    <option value="">Select recipient...</option>
                    {availableRecipients.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Roles for Announcements */}
              {formData.is_announcement && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Target Audience
                  </label>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    {(['parent', 'trainer', 'behaviorist'] as UserRole[]).map(role => (
                      <label key={role} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.target_roles.includes(role)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...formData.target_roles, role]
                              : formData.target_roles.filter(r => r !== role);
                            handleInputChange('target_roles', newRoles);
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
              )}

              {/* Subject */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Subject
                </label>
                <Input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Enter message subject..."
                  className="h-11 border-gray-300 focus:border-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] shadow-sm"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Message Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-[rgb(0_32_96)] min-h-[140px] resize-vertical text-gray-900 bg-white shadow-sm transition-colors"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewMessageModal(false)}
                  className="px-6 py-2 border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6 py-2 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] shadow-sm"
                >
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900 truncate">{selectedMessage.subject}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMessageTypeColor(selectedMessage.is_announcement)}`}>
                  {selectedMessage.is_announcement ? 'Announcement' : 'Direct'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMessage(null)}
                className="hover:bg-gray-200 rounded-full p-2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-700">From:</span>
                      <span className="text-sm text-gray-900 font-medium">{getSenderName(selectedMessage.sender_id)}</span>
                    </div>
                    {!selectedMessage.is_announcement && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">To:</span>
                        <span className="text-sm text-gray-900 font-medium">{getReceiverName(selectedMessage.recipient_id)}</span>
                      </div>
                    )}
                    {selectedMessage.is_announcement && selectedMessage.target_roles && selectedMessage.target_roles.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">Target Roles:</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedMessage.target_roles.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-700">Sent:</span>
                      <span className="text-sm text-gray-600">{formatDateTime(selectedMessage.created_at)}</span>
                    </div>
                    {selectedMessage.read_at && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">Read:</span>
                        <span className="text-sm text-gray-600">{formatDateTime(selectedMessage.read_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Message Content</h3>
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMessage(null)}
                  className="px-6 py-2 border-gray-300 hover:bg-gray-50"
                >
                  Close
                </Button>
                {selectedMessage.sender_id !== currentUser?.id && (
                  <Button
                    onClick={() => {
                      setFormData({
                        recipient_id: selectedMessage.sender_id,
                        subject: `Re: ${selectedMessage.subject}`,
                        content: '',
                        is_announcement: false,
                        target_roles: []
                      });
                      setSelectedMessage(null);
                      setShowNewMessageModal(true);
                    }}
                    className="px-6 py-2 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] shadow-sm"
                  >
                    Reply
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
