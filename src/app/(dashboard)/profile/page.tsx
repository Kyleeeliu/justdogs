'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, updateUserProfile } from '@/lib/auth/auth';
import { User } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          setFormData({
            full_name: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            role: currentUser.role || ''
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updatedUser = await updateUserProfile(user.id, {
        full_name: formData.full_name,
        phone: formData.phone
      });
      
      setUser(updatedUser);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || ''
      });
    }
    setEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'trainer':
        return 'Trainer';
      case 'parent':
        return 'Dog Parent';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Unable to load profile information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-white" />
                  </div>
                  {editing && (
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center hover:bg-[rgb(0_24_72)] transition-colors">
                      <CameraIcon className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {editing ? formData.full_name : user.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">{getRoleDisplayName(user.role)}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {editing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-gray-900">{user.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  {editing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{getRoleDisplayName(user.role)}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>
              </div>

              {/* Action Buttons */}
              {editing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Password</h4>
                  <p className="text-sm text-gray-600">Last changed: {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-medium">
                  {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Status</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[rgb(0_32_96)] text-white">
                  Active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Privacy Settings
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                <XMarkIcon className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
