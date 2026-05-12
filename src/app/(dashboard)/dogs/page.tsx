'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DogAssessmentBot from '@/components/DogAssessmentBot';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { User, Dog } from '@/types';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/lib/api/apiClient';
import { deleteDog, getDogById, searchDogs } from '@/lib/supabase/dogs';
import { supabase } from '@/lib/supabase/client';

interface DogFormData {
  name: string;
  breed: string;
  age: string;
  weight: string;
  medical_notes: string;
  behavioral_notes: string;
  vaccine_records: string;
  preferences: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

interface ParentOption {
  id: string;
  full_name: string;
  email: string;
}

export default function DogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [filteredDogs, setFilteredDogs] = useState<Dog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssessmentBot, setShowAssessmentBot] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Parents list for admin owner assignment
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  // Selected dog and form data
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [assessmentCode, setAssessmentCode] = useState('');
  const [formData, setFormData] = useState<DogFormData>({
    name: '',
    breed: '',
    age: '',
    weight: '',
    medical_notes: '',
    behavioral_notes: '',
    vaccine_records: '',
    preferences: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  // Load parents list for admin owner assignment
  const loadParents = async () => {
    try {
      const res = await authenticatedGet('/api/users?role=parent');
      if (res.ok) {
        const data = await res.json();
        setParents(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('Error loading parents:', error);
    }
  };

  // Load dogs from API
  const loadDogs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await authenticatedGet('/api/dogs');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load dogs' }));
        if (response.status !== 401) {
          console.error('Error loading dogs:', errorData.error || errorData.details || 'Unknown error');
        }
        setDogs([]);
        setFilteredDogs([]);
        return;
      }
      
      const data = await response.json();

      const dogsList = Array.isArray(data.dogs) ? data.dogs : [];
      if (data.success === true || (dogsList.length >= 0 && Array.isArray(data.dogs))) {
        setDogs(dogsList);
        setFilteredDogs(dogsList);
        if (dogsList.length === 0 && !data.error) {
          console.log('Dogs loaded: 0 dogs (API returned success with empty array)');
        }
      } else {
        if (data.error && data.error !== 'Authentication required') {
          console.error('Error loading dogs:', data.error || data.details || 'Unknown error');
        }
        setDogs([]);
        setFilteredDogs([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Authentication') && !errorMessage.includes('Session expired')) {
        console.error('Error loading dogs:', error);
      }
      setDogs([]);
      setFilteredDogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload dogs
  const reloadDogs = async () => {
    if (!user) return;
    
    try {
      const response = await authenticatedGet('/api/dogs');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to reload dogs' }));
        if (response.status !== 401) {
          console.error('Error reloading dogs:', errorData.error || 'Unknown error');
        }
        return;
      }
      
      const data = await response.json();

      const dogsList = Array.isArray(data.dogs) ? data.dogs : [];
      if (data.success) {
        setDogs(dogsList);
        if (searchTerm.trim()) {
          try {
            const results = await searchDogs(searchTerm, user?.role === 'parent' ? user.id : undefined);
            setFilteredDogs(results);
          } catch (error) {
            console.error('Error searching dogs during reload:', error);
            setFilteredDogs(dogsList);
          }
        } else {
          setFilteredDogs(dogsList);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Authentication') && !errorMessage.includes('Session expired')) {
        console.error('Error reloading dogs:', error);
      }
    }
  };

  // Initial load
  useEffect(() => {
    loadDogs();
  }, [user]);

  // Filter dogs based on search
  useEffect(() => {
    const filterDogs = async () => {
      if (searchTerm.trim()) {
        try {
          const results = await searchDogs(searchTerm, user?.role === 'parent' ? user.id : undefined);
          setFilteredDogs(results);
        } catch (error) {
          console.error('Error searching dogs:', error);
          setFilteredDogs(dogs);
        }
      } else {
        setFilteredDogs(dogs);
      }
    };

    filterDogs();
  }, [searchTerm, dogs, user]);

  // Handle form input changes
  const handleInputChange = (field: keyof DogFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedDog && showEditModal) {
        // Update existing dog
        const updateResponse = await authenticatedPut('/api/dogs', {
          id: selectedDog.id,
          name: formData.name,
          breed: formData.breed,
          age: parseInt(formData.age) || 0,
          weight: parseFloat(formData.weight) || 0,
          medical_notes: formData.medical_notes || undefined,
          behavioral_notes: formData.behavioral_notes || undefined,
          vaccine_records: formData.vaccine_records || undefined,
          preferences: formData.preferences || undefined,
          emergency_contact: formData.emergency_contact_name ? {
            name: formData.emergency_contact_name,
            phone: formData.emergency_contact_phone,
            relationship: formData.emergency_contact_relationship || 'Owner'
          } : undefined,
        });

        if (!updateResponse.ok) {
          let errorData;
          const contentType = updateResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await updateResponse.json().catch(() => ({}));
          } else {
            const text = await updateResponse.text().catch(() => '');
            errorData = { error: text || `HTTP ${updateResponse.status}` };
          }
          throw new Error(errorData.error || errorData.details || errorData.message || 'Failed to update dog');
        }
      } else {
        // Create new dog
        const createResponse = await authenticatedPost('/api/dogs', {
          owner_id: (user?.role === 'admin' && selectedOwnerId) ? selectedOwnerId : user?.id,
          name: formData.name,
          breed: formData.breed,
          age: parseInt(formData.age) || 0,
          weight: parseFloat(formData.weight) || 0,
          medical_notes: formData.medical_notes || undefined,
          behavioral_notes: formData.behavioral_notes || undefined,
          vaccine_records: formData.vaccine_records || undefined,
          preferences: formData.preferences || undefined,
          emergency_contact: formData.emergency_contact_name ? {
            name: formData.emergency_contact_name,
            phone: formData.emergency_contact_phone,
            relationship: formData.emergency_contact_relationship || 'Owner'
          } : undefined,
        });

        if (!createResponse.ok) {
          let errorData: any = {};
          const contentType = createResponse.headers.get('content-type');
          try {
            if (contentType && contentType.includes('application/json')) {
              errorData = await createResponse.json();
            } else {
              const text = await createResponse.text();
              errorData = { error: text || `HTTP ${createResponse.status}: ${createResponse.statusText}` };
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
            errorData = { error: `HTTP ${createResponse.status}: ${createResponse.statusText}` };
          }
          
          const errorMsg = errorData.error || errorData.message || errorData.details || `Failed to create dog (${createResponse.status})`;
          console.error('Create dog error:', {
            status: createResponse.status,
            statusText: createResponse.statusText,
            errorData
          });
          throw new Error(errorMsg);
        }

        const createData = await createResponse.json();
        if (!createData.success) {
          const errorMsg = createData.error || createData.message || createData.details || 'Failed to create dog';
          console.error('Create dog failed:', createData);
          throw new Error(errorMsg);
        }
      }

      // Wait for database commit
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Ensure session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (!refreshData.session) {
          alert('Dog saved successfully, but there was an authentication issue. Please refresh the page.');
          return;
        }
      }
      
      if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (!refreshData.session) {
          alert('Dog saved successfully, but session expired. Please refresh the page.');
          return;
        }
      }
      
      // Reload dogs
      await reloadDogs();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Reset form and close modals
      resetForm();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedDog(null);
      
      alert(selectedDog && showEditModal ? 'Dog updated successfully!' : 'Dog created successfully!');
    } catch (error) {
      console.error('Error saving dog:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Full error object:', error);
      
      // Show detailed error message
      const displayMessage = errorMessage || 'Failed to save dog. Please try again.';
      alert(displayMessage + '\n\nCheck the browser console for more details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      breed: '',
      age: '',
      weight: '',
      medical_notes: '',
      behavioral_notes: '',
      vaccine_records: '',
      preferences: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: ''
    });
    setSelectedOwnerId('');
  };

  // Open edit modal
  const openEditModal = async (dog: Dog) => {
    setSelectedDog(dog);
    const dogData = await getDogById(dog.id);
    if (dogData) {
      setFormData({
        name: dogData.name,
        breed: dogData.breed,
        age: dogData.age.toString(),
        weight: dogData.weight?.toString() || '',
        medical_notes: dogData.medical_notes || '',
        behavioral_notes: dogData.behavioral_notes || '',
        vaccine_records: dogData.vaccine_records || '',
        preferences: dogData.preferences || '',
        emergency_contact_name: dogData.emergency_contact?.name || '',
        emergency_contact_phone: dogData.emergency_contact?.phone || '',
        emergency_contact_relationship: dogData.emergency_contact?.relationship || ''
      });
      setShowEditModal(true);
    }
  };

  // Handle assessment completion
  const handleAssessmentComplete = async (result: any) => {
    const dogName = prompt('What is your dog\'s name?');
    if (!dogName) return;
    
    try {
      const response = await authenticatedPost('/api/dogs', {
        name: dogName,
        breed: result.dogProfile.breed,
        age: parseFloat(result.dogProfile.age) || 0,
        weight: 0,
        behavioral_notes: `Energy Level: ${result.dogProfile.energyLevel}\nBehavior Issues: ${result.dogProfile.behaviorIssues.join(', ')}\nRecommendations: ${result.recommendations.reasoning}`
      });

      if (!response.ok) {
        throw new Error('Failed to create dog from assessment');
      }

      await reloadDogs();
      setShowAssessmentBot(false);
      alert(`Dog profile created successfully for ${dogName}!`);
    } catch (error) {
      alert('Error processing assessment. Please try again.');
      console.error('Error processing assessment:', error);
    }
  };

  // Handle code submission
  const handleCodeSubmit = async () => {
    if (!assessmentCode || assessmentCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    try {
      const storedAssessment = localStorage.getItem(`assessment_${assessmentCode}`);
      if (!storedAssessment) {
        alert('Invalid assessment code. Please check and try again.');
        return;
      }

      const assessment = JSON.parse(storedAssessment);
      const dogName = prompt('What is your dog\'s name?');
      if (!dogName) return;

      await authenticatedPost('/api/dogs', {
        name: dogName,
        breed: assessment.dogProfile.breed,
        age: parseFloat(assessment.dogProfile.age) || 0,
        weight: 0,
        behavioral_notes: `Energy Level: ${assessment.dogProfile.energyLevel}\nBehavior Issues: ${assessment.dogProfile.behaviorIssues.join(', ')}`
      });

      await reloadDogs();
      setShowCodeInput(false);
      setAssessmentCode('');
      localStorage.removeItem(`assessment_${assessmentCode}`);
      alert(`Dog profile created successfully for ${dogName}!`);
    } catch (error) {
      alert('Error processing assessment code. Please try again.');
      console.error('Error processing code:', error);
    }
  };

  // Delete dog
  const handleDeleteDog = async (dog: Dog) => {
    if (!confirm(`Are you sure you want to delete ${dog.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await deleteDog(dog.id);
      if (success) {
        await reloadDogs();
        if (showViewModal && selectedDog?.id === dog.id) {
          setShowViewModal(false);
          setSelectedDog(null);
        }
        alert(`${dog.name} has been deleted successfully.`);
      } else {
        alert('Failed to delete dog. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting dog:', error);
      alert('Failed to delete dog. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dogs</h1>
          <p className="text-gray-600 mt-1">Manage dog profiles and training information</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowAssessmentBot(true)}
              variant="outline"
              className="border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              AI Assessment
            </Button>
            <Button
              onClick={() => {
                resetForm();
                if (user?.role === 'admin') loadParents();
                setShowAddModal(true);
              }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Dog
            </Button>
            <Button 
              onClick={() => setShowCodeInput(true)}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              Enter Code
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search dogs by name or breed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dogs</CardTitle>
            <UserGroupIcon className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dogs.length}</div>
            <p className="text-xs text-gray-500 mt-1">Dogs in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Training</CardTitle>
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dogs.length}</div>
            <p className="text-xs text-gray-500 mt-1">Currently in training</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Results</CardTitle>
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDogs.length}</div>
            <p className="text-xs text-gray-500 mt-1">{searchTerm ? 'Matching dogs' : 'All dogs'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dogs Grid */}
      {filteredDogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDogs.map((dog) => (
            <Card key={dog.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-[rgb(0_32_96)]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-[rgb(0_32_96)] to-[rgb(0_24_72)] rounded-full flex items-center justify-center shadow-md">
                      <span className="text-xl font-bold text-white">
                        {dog.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dog.name}</CardTitle>
                      <CardDescription className="text-sm">{dog.breed}</CardDescription>
                      {dog.owner_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Owner: <span className="font-medium text-gray-700">{dog.owner_name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {dog.weight && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Weight:</span>
                      <span className="font-medium">{dog.weight}kg</span>
                    </div>
                  )}
                </div>
                
                {dog.behavioral_notes && (
                  <div className="text-sm">
                    <p className="text-gray-500 mb-1">Notes:</p>
                    <p className="text-gray-700 line-clamp-2">{dog.behavioral_notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDog(dog);
                      setShowViewModal(true);
                    }}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEditModal(dog)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-16">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No dogs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first dog.'}
            </p>
            {!searchTerm && (user?.role === 'admin' || user?.role === 'parent') && (
              <Button onClick={() => {
                resetForm();
                if (user?.role === 'admin') loadParents();
                setShowAddModal(true);
              }}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Dog
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Dog Modal */}
      {showViewModal && selectedDog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[rgb(0_32_96)] to-[rgb(0_24_72)] rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {selectedDog.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{selectedDog.name}'s Profile</CardTitle>
                    <CardDescription>{selectedDog.breed}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDog(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <HeartIcon className="h-5 w-5 mr-2 text-[rgb(0_32_96)]" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-medium text-gray-900">{selectedDog.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Breed</p>
                    <p className="font-medium text-gray-900">{selectedDog.breed}</p>
                  </div>
                  {selectedDog.owner_name && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Owner</p>
                      <p className="font-medium text-gray-900">{selectedDog.owner_name}</p>
                    </div>
                  )}
                  {selectedDog.weight && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Weight</p>
                      <p className="font-medium text-gray-900">{selectedDog.weight}kg</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              {(selectedDog.medical_notes || selectedDog.vaccine_records) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                  {selectedDog.medical_notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Medical Notes</p>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedDog.medical_notes}</p>
                    </div>
                  )}
                  {selectedDog.vaccine_records && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Vaccine Records</p>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedDog.vaccine_records}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Behavioral Information */}
              {(selectedDog.behavioral_notes || selectedDog.preferences) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Behavioral Information</h3>
                  {selectedDog.behavioral_notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Behavioral Notes</p>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedDog.behavioral_notes}</p>
                    </div>
                  )}
                  {selectedDog.preferences && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Preferences</p>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedDog.preferences}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Emergency Contact */}
              {selectedDog.emergency_contact && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Name</p>
                      <p className="font-medium text-gray-900">{selectedDog.emergency_contact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">{selectedDog.emergency_contact.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Relationship</p>
                      <p className="font-medium text-gray-900">{selectedDog.emergency_contact.relationship}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback History */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-[rgb(0_32_96)]" />
                  Training Feedback History
                </h3>
                <div className="space-y-3">
                  {/* TODO: Load actual feedback from bookings */}
                  <div className="bg-gray-50 p-4 rounded-md border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-900">Farm Day Session</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      Great session today! {selectedDog.name} showed excellent progress with recall training and socialized well with other dogs.
                    </p>
                    <p className="text-xs text-gray-500">Trainer: Sarah Johnson</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-900">Basic Training Session</p>
                      <p className="text-xs text-gray-500">1 week ago</p>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      Worked on basic commands today. {selectedDog.name} is responding well to sit and stay commands. Recommend continuing with positive reinforcement.
                    </p>
                    <p className="text-xs text-gray-500">Trainer: Mike Thompson</p>
                  </div>
                  
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 italic">
                      Feedback history will be loaded from actual training sessions
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDeleteDog(selectedDog)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Dog
                  </Button>
                )}
                <div className={user?.role === 'admin' ? 'flex gap-2 ml-auto' : 'flex gap-2'}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedDog);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Dog Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{showEditModal ? 'Edit Dog' : 'Add New Dog'}</CardTitle>
                  <CardDescription className="mt-1">
                    {showEditModal ? 'Update the details for this dog' : 'Fill in the details to add a new dog to your profile'}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedDog(null);
                    resetForm();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

                  {/* Owner selector — admin only, add mode */}
                  {user?.role === 'admin' && showAddModal && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to Parent (Owner)
                      </label>
                      <select
                        value={selectedOwnerId}
                        onChange={(e) => setSelectedOwnerId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-transparent"
                      >
                        <option value="">— Unassigned (keep as admin) —</option>
                        {parents.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dog Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Enter dog's name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Breed <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Enter breed"
                        value={formData.breed}
                        onChange={(e) => handleInputChange('breed', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age (years) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter age"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        required
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (kg)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Enter weight"
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medical Notes
                      </label>
                      <Textarea
                        placeholder="Any medical conditions or notes"
                        value={formData.medical_notes}
                        onChange={(e) => handleInputChange('medical_notes', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vaccine Records
                      </label>
                      <Textarea
                        placeholder="Vaccination status and records"
                        value={formData.vaccine_records}
                        onChange={(e) => handleInputChange('vaccine_records', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Behavioral Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Behavioral Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Behavioral Notes
                      </label>
                      <Textarea
                        placeholder="Behavioral observations and notes"
                        value={formData.behavioral_notes}
                        onChange={(e) => handleInputChange('behavioral_notes', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferences
                      </label>
                      <Textarea
                        placeholder="Likes, dislikes, favorite activities"
                        value={formData.preferences}
                        onChange={(e) => handleInputChange('preferences', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Name
                        </label>
                        <Input
                          placeholder="Emergency contact name"
                          value={formData.emergency_contact_name}
                          onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Phone
                        </label>
                        <Input
                          placeholder="Emergency contact phone"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship
                      </label>
                      <Input
                        placeholder="Relationship to dog (e.g., Owner, Family Member)"
                        value={formData.emergency_contact_relationship}
                        onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting 
                      ? (showEditModal ? 'Updating...' : 'Creating...') 
                      : (showEditModal ? 'Update Dog' : 'Create Dog')
                    }
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedDog(null);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dog Assessment Bot */}
      <DogAssessmentBot
        isOpen={showAssessmentBot}
        onClose={() => setShowAssessmentBot(false)}
        onComplete={handleAssessmentComplete}
      />

      {/* Code Input Modal */}
      {showCodeInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Enter Assessment Code</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCodeInput(false);
                    setAssessmentCode('');
                  }}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Enter the 6-digit code you received after completing the dog assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={assessmentCode}
                  onChange={(e) => setAssessmentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCodeInput(false);
                    setAssessmentCode('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCodeSubmit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
