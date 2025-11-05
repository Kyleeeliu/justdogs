'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/auth/auth';
import { User } from '@/types';
import { 
  getAllNewsItems, 
  updateNewsItem, 
  addNewsItem, 
  deleteNewsItem,
  getAllServices,
  updateService,
  addService,
  deleteService,
  getAllTeamMembers,
  updateTeamMember,
  addTeamMember,
  deleteTeamMember
} from '@/lib/data/content';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CalendarIcon,
  NewspaperIcon,
  UsersIcon,
  CogIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'event' | 'announcement';
  published: boolean;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: 'behaviour' | 'farm' | 'academy' | 'service';
  active: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  active: boolean;
}

export default function ContentManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'news' | 'services' | 'team' | 'gallery'>('news');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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

        // keep services/team using existing in-memory helpers for now
        setServices(getAllServices());
        setTeamMembers(getAllTeamMembers());
      } catch (error) {
        console.error('Error loading content data:', error);
      }
    };

    loadData();
  }, [user]);

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

<<<<<<< HEAD
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
      } else {
        // keep existing in-memory behavior for services/team
        let success = false;
        switch (type) {
          case 'services':
            success = deleteService(id);
            if (success) setServices(getAllServices());
            break;
          case 'team':
            success = deleteTeamMember(id);
            if (success) setTeamMembers(getAllTeamMembers());
            break;
        }
        if (!success) console.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  async function handleSave(newItem: { id?: string; title?: string; content?: string; date?: string; type: string; published?: boolean }) {
    try {
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

      setShowForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error creating/updating news item:', err);
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.type === 'news' ? 'bg-blue-100 text-blue-800' :
                      item.type === 'event' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
          onClick={() => {/* TODO: Implement gallery upload */}}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Images
        </Button>
      </div>
      
      <div className="text-center py-12 text-gray-500">
        <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>Gallery management coming soon...</p>
        <p className="text-sm">Upload and manage dog photos for the gallery page</p>
      </div>
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
            { id: 'news', name: 'News & Events', icon: NewspaperIcon },
            { id: 'services', name: 'Services', icon: CogIcon },
            { id: 'team', name: 'Team', icon: UsersIcon },
            { id: 'gallery', name: 'Gallery', icon: PhotoIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
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
      {activeTab === 'services' && renderServicesManagement()}
      {activeTab === 'team' && renderTeamManagement()}
      {activeTab === 'gallery' && renderGalleryManagement()}

      {/* Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>
                {editingItem?.id ? 'Edit' : 'Add'} {editingItem?.type === 'news' ? 'News Item' : 
                 editingItem?.type === 'services' ? 'Service' : 'Team Member'}
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
    active: item?.active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // include id when editing so handleSave can PATCH
    onSave({ ...formData, id: item?.id });
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white">
          {item?.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
