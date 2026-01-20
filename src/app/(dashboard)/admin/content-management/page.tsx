'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/auth/auth';
import { User, ApprovalStatus } from '@/types';
import {
  getAllNewsItems,
  updateNewsItem,
  addNewsItem,
  deleteNewsItem
} from '@/lib/data/content';
import {
  getAllEvents,
  updateEvent,
  addEvent,
  deleteEvent,
  type EventItem
} from '@/lib/supabase/events';
import {
  getAllServices as getSupabaseServices,
  addService as addSupabaseService,
  updateService as updateSupabaseService,
  deleteService as deleteSupabaseService,
  getAllTeamMembers as getSupabaseTeamMembers,
  addTeamMember as addSupabaseTeamMember,
  updateTeamMember as updateSupabaseTeamMember,
  deleteTeamMember as deleteSupabaseTeamMember,
  getAllGalleryImages,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  type ServiceItem,
  type TeamMember,
  type GalleryImage
} from '@/lib/supabase/content';
import { getAllUsers, updateUser } from '@/lib/supabase/users';
import {
  uploadGalleryImage,
  replaceGalleryImage,
  deleteGalleryImage as deleteStorageImage,
  initializeGalleryBucket
} from '@/lib/supabase/storage';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  NewspaperIcon,
  UsersIcon,
  CogIcon,
  PhotoIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'event' | 'announcement';
  published: boolean;
}


export default function ContentManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'news' | 'events' | 'services' | 'team' | 'gallery' | 'trainers'>('news');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [pendingTrainers, setPendingTrainers] = useState<User[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser) {
          router.push('/login');
          return;
        }

        if (currentUser.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load data from data store
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const loadData = async () => {
      try {
        // Initialize Supabase Storage bucket
        await initializeGalleryBucket();

        // Fetch news from API (DB-backed)
        const res = await fetch('/api/news', { cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown' }));
          console.error('Failed to fetch news:', err);
          setNewsItems([]);
        } else {
          const data = await res.json();
          // normalize rows to the UI's NewsItem shape
          setNewsItems(
            Array.isArray(data)
              ? data.map((n: any) => ({
                id: String(n.id),
                title: n.title ?? '',
                content: n.content ?? '',
                date: n.date ? (typeof n.date === 'string' ? n.date : new Date(n.date).toISOString().split('T')[0]) : '',
                type: n.type ?? 'news',
                published: !!n.published
              }))
              : []
          );
        }

        // Load services, team, and events from Supabase
        const servicesData = await getSupabaseServices();
        const teamData = await getSupabaseTeamMembers();
        const galleryData = await getAllGalleryImages();
        
        // Load events from API (DB-backed)
        try {
          const eventsRes = await fetch('/api/events', { cache: 'no-store' });
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            setEvents(Array.isArray(eventsData) ? eventsData : []);
          } else {
            console.error('Failed to fetch events');
            setEvents([]);
          }
        } catch (error) {
          console.error('Error fetching events:', error);
          setEvents([]);
        }
        
        setServices(servicesData);
        setTeamMembers(teamData);
        setGalleryImages(galleryData);

        // Load pending trainers from Supabase
        await loadPendingTrainers();
      } catch (error) {
        console.error('Error loading content data:', error);
      }
    };

    loadData();
  }, [user]);

  // Function to load pending trainers from Supabase
  const loadPendingTrainers = async () => {
    try {
      const allUsers = await getAllUsers();
      const pending = allUsers.filter(user =>
        user.role === 'trainer' && user.approval_status === 'pending'
      );
      setPendingTrainers(pending);
    } catch (error) {
      console.error('Error loading pending trainers:', error);
    }
  };

  // Function to approve/reject trainer
  const handleTrainerApproval = async (trainerId: string, action: 'approve' | 'reject') => {
    try {
      const newStatus: ApprovalStatus = action === 'approve' ? 'approved' : 'rejected';
      
      await updateUser(trainerId, { approval_status: newStatus });
      
      // Remove from pending list
      setPendingTrainers(prev => prev.filter(trainer => trainer.id !== trainerId));
      
      alert(`Trainer ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing trainer:`, error);
      alert(`Failed to ${action} trainer. Please try again.`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content management...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized access message
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Only administrators can manage content.
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEdit = (item: any, type: string) => {
    setEditingItem({ ...item, type });
    setShowForm(true);
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (type === 'news') {
        const res = await fetch(`/api/news?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) {
          console.error('Failed to delete news item:', body);
          return;
        }
        setNewsItems((prev) => prev.filter((i) => i.id !== id));
      } else if (type === 'events') {
        const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) {
          console.error('Failed to delete event:', body);
          return;
        }
        setEvents((prev) => prev.filter((i) => i.id !== id));
      } else if (type === 'services') {
        await deleteSupabaseService(id);
        const updated = await getSupabaseServices();
        setServices(updated);
      } else if (type === 'team') {
        await deleteSupabaseTeamMember(id);
        const updated = await getSupabaseTeamMembers();
        setTeamMembers(updated);
      } else if (type === 'gallery') {
        // Find the gallery image to get its URL for storage deletion
        const imageToDelete = galleryImages.find(img => img.id === id);
        if (imageToDelete?.image_url) {
          // Delete from storage first
          await deleteStorageImage(imageToDelete.image_url);
        }
        // Delete from database
        await deleteGalleryImage(id);
        const updated = await getAllGalleryImages();
        setGalleryImages(updated);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  async function handleSave(newItem: any) {
    try {
      if (newItem.type === 'news') {
        const method = newItem.id ? 'PATCH' : 'POST';
        const res = await fetch('/api/news', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });

        const body = await res.json();

        if (!res.ok) {
          console.error(`${method} /api/news failed:`, body);
          return;
        }

        const saved = body;
        if (method === 'POST') {
          setNewsItems((prev) => [saved, ...prev]);
        } else {
          setNewsItems((prev) => prev.map((i) => (i.id === String(saved.id) ? {
            id: String(saved.id),
            title: saved.title ?? '',
            content: saved.content ?? '',
            date: saved.date ? (typeof saved.date === 'string' ? saved.date : new Date(saved.date).toISOString().split('T')[0]) : '',
            type: saved.type ?? 'news',
            published: !!saved.published
          } : i)));
        }
      } else if (newItem.type === 'events') {
        const method = newItem.id ? 'PATCH' : 'POST';
        const res = await fetch('/api/events', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });

        const body = await res.json();

        if (!res.ok) {
          console.error(`${method} /api/events failed:`, body);
          return;
        }

        const saved = body;
        if (method === 'POST') {
          setEvents((prev) => [saved, ...prev]);
        } else {
          setEvents((prev) => prev.map((i) => (i.id === String(saved.id) ? saved : i)));
        }
      } else if (newItem.type === 'services') {
        if (newItem.id) {
          await updateSupabaseService(newItem.id, {
            name: newItem.name,
            description: newItem.description,
            category: newItem.category,
            active: newItem.active,
          });
        } else {
          await addSupabaseService({
            name: newItem.name,
            description: newItem.description,
            category: newItem.category,
            active: newItem.active,
          });
        }
        const updated = await getSupabaseServices();
        setServices(updated);
      } else if (newItem.type === 'team') {
        if (newItem.id) {
          await updateSupabaseTeamMember(newItem.id, {
            name: newItem.name,
            role: newItem.role,
            bio: newItem.bio,
            active: newItem.active,
          });
        } else {
          await addSupabaseTeamMember({
            name: newItem.name,
            role: newItem.role,
            bio: newItem.bio,
            active: newItem.active,
          });
        }
        const updated = await getSupabaseTeamMembers();
        setTeamMembers(updated);
      } else if (newItem.type === 'gallery') {
        let imageUrl = newItem.image_url;

        // Handle file upload
        if (newItem.imageFile) {
          if (newItem.id && newItem.image_url) {
            // Replace existing image
            const uploadResult = await replaceGalleryImage(newItem.image_url, newItem.imageFile);
            if (!uploadResult.success) {
              alert(`Failed to upload image: ${uploadResult.error}`);
              return;
            }
            imageUrl = uploadResult.url;
          } else {
            // Upload new image
            const uploadResult = await uploadGalleryImage(newItem.imageFile);
            if (!uploadResult.success) {
              alert(`Failed to upload image: ${uploadResult.error}`);
              return;
            }
            imageUrl = uploadResult.url;
          }
        }

        if (newItem.id) {
          await updateGalleryImage(newItem.id, {
            image_url: imageUrl,
            title: newItem.title,
            description: newItem.description,
            dog_name: newItem.dog_name,
            display_order: newItem.display_order || 0,
            active: newItem.active,
          });
        } else {
          await addGalleryImage({
            image_url: imageUrl,
            title: newItem.title,
            description: newItem.description,
            dog_name: newItem.dog_name,
            display_order: newItem.display_order || 0,
            active: newItem.active,
          });
        }
        const updated = await getAllGalleryImages();
        setGalleryImages(updated);
      }

      setShowForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      alert('Failed to save item. Please try again.');
    }
  }

  const renderNewsManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">News & Events Management</h2>
        <Button
          onClick={() => handleEdit({ type: 'news' }, 'news')}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add News Item
        </Button>
      </div>

      <div className="grid gap-4">
        {newsItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'news' ? 'bg-blue-100 text-blue-800' :
                        item.type === 'event' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {item.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {item.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{item.content}</p>
                  <p className="text-xs text-gray-500">{item.date}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item, 'news')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id, 'news')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEventsManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
        <Button
          onClick={() => handleEdit({ type: 'events' }, 'events')}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      event.category === 'training' ? 'bg-blue-100 text-blue-800' :
                      event.category === 'workshop' ? 'bg-purple-100 text-purple-800' :
                      event.category === 'social' ? 'bg-green-100 text-green-800' :
                      event.category === 'competition' ? 'bg-orange-100 text-orange-800' :
                      event.category === 'fundraiser' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                      event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                      event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${event.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {event.published ? 'Published' : 'Draft'}
                    </span>
                    {event.featured && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
                    {event.start_time && <span>🕐 {event.start_time}</span>}
                    {event.location && <span>📍 {event.location}</span>}
                    {event.price > 0 && <span>💰 ${event.price}</span>}
                    {event.max_participants && (
                      <span>👥 {event.current_participants}/{event.max_participants}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(event, 'events')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event.id, 'events')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderServicesManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>
        <Button
          onClick={() => handleEdit({ type: 'services' }, 'services')}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                      {service.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(service, 'services')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service.id, 'services')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTeamManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
        <Button
          onClick={() => handleEdit({ type: 'team' }, 'team')}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <div className="grid gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${member.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-[rgb(0_32_96)] font-medium text-sm mb-2">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(member, 'team')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(member.id, 'team')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderGalleryManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gallery Management</h2>
        <Button
          onClick={() => handleEdit({ type: 'gallery' }, 'gallery')}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Image
        </Button>
      </div>

      {galleryImages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Gallery Images</h3>
            <p className="text-gray-600">Add images to showcase happy dogs on the gallery page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryImages.map((image) => (
            <Card key={image.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.title || image.dog_name || 'Gallery image'}
                    className="w-full h-full object-cover rounded-t-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/400/400';
                    }}
                  />
                  {!image.active && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Inactive
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {image.title && (
                    <h3 className="font-semibold text-gray-900 mb-1">{image.title}</h3>
                  )}
                  {image.dog_name && (
                    <p className="text-sm text-gray-600 mb-2">Dog: {image.dog_name}</p>
                  )}
                  {image.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{image.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(image, 'gallery')}
                      className="flex-1"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(image.id, 'gallery')}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderTrainerApprovals = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Trainer Approvals</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <UserPlusIcon className="h-4 w-4" />
          <span>{pendingTrainers.length} pending approval{pendingTrainers.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {pendingTrainers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserPlusIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-500">All trainer applications have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingTrainers.map((trainer) => (
            <Card key={trainer.id} className="border-l-4 border-l-yellow-400">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {trainer.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{trainer.full_name}</h3>
                        <p className="text-sm text-gray-500">{trainer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <span>Applied: {new Date(trainer.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                    {trainer.phone && (
                      <p className="text-sm text-gray-600 mt-1">Phone: {trainer.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => handleTrainerApproval(trainer.id, 'reject')}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleTrainerApproval(trainer.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-2">Manage news, services, team members, and gallery content</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'news', name: 'News', icon: NewspaperIcon },
            { id: 'events', name: 'Events', icon: CalendarIcon },
            { id: 'services', name: 'Services', icon: CogIcon },
            { id: 'team', name: 'Team', icon: UsersIcon },
            { id: 'trainers', name: 'Trainer Approvals', icon: UserPlusIcon },
            { id: 'gallery', name: 'Gallery', icon: PhotoIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'news' && renderNewsManagement()}
      {activeTab === 'events' && renderEventsManagement()}
      {activeTab === 'services' && renderServicesManagement()}
      {activeTab === 'team' && renderTeamManagement()}
      {activeTab === 'trainers' && renderTrainerApprovals()}
      {activeTab === 'gallery' && renderGalleryManagement()}

      {/* Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>
                {editingItem?.id ? 'Edit' : 'Add'} {editingItem?.type === 'news' ? 'News Item' :
                  editingItem?.type === 'services' ? 'Service' :
                  editingItem?.type === 'team' ? 'Team Member' :
                  editingItem?.type === 'gallery' ? 'Gallery Image' : 'Item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContentForm
                item={editingItem}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingItem(null); }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Content Form Component
function ContentForm({ item, onSave, onCancel }: { item: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    content: item?.content || '',
    description: item?.description || '',
    name: item?.name || '',
    role: item?.role || '',
    bio: item?.bio || '',
    date: item?.date || new Date().toISOString().split('T')[0],
    type: item?.type || 'news',
    category: item?.category || 'behaviour',
    published: item?.published ?? true,
    active: item?.active ?? true,
    // Gallery specific fields
    image_url: item?.image_url || '',
    dog_name: item?.dog_name || '',
    display_order: item?.display_order || 0
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.image_url || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For gallery items, ensure we have either an existing image or a new file
    if (item?.type === 'gallery' && !selectedFile && !formData.image_url) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      // include id when editing so handleSave can PATCH
      onSave({
        ...formData,
        id: item?.id,
        imageFile: selectedFile // Pass the file to handleSave
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {item?.type === 'news' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="news">News</option>
                <option value="event">Event</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="published" className="text-sm text-gray-700">Published</label>
          </div>
        </>
      )}

      {item?.type === 'services' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="behaviour">Behaviour & Home</option>
              <option value="farm">Farm</option>
              <option value="academy">Academy</option>
              <option value="service">Service & Emotional Support</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm text-gray-700">Active</label>
          </div>
        </>
      )}

      {item?.type === 'team' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Input
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm text-gray-700">Active</label>
          </div>
        </>
      )}

      {item?.type === 'gallery' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {item?.id ? 'Replace Image' : 'Upload Image'}
            </label>
            <div className="space-y-4">
              {/* File Input */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <CloudArrowUpIcon className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    required={!item?.id && !formData.image_url}
                  />
                </label>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/400/300';
                    }}
                  />
                  {selectedFile && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                      New Image Selected
                    </div>
                  )}
                </div>
              )}

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Image title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dog Name (Optional)</label>
            <Input
              value={formData.dog_name}
              onChange={(e) => setFormData({ ...formData, dog_name: e.target.value })}
              placeholder="Dog's name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the image"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active-gallery"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active-gallery" className="text-sm text-gray-700">Active (visible on gallery page)</label>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {item?.type === 'gallery' ? 'Uploading...' : 'Saving...'}
            </>
          ) : (
            <>
              {item?.id ? 'Update' : 'Create'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
