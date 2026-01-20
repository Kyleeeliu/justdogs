'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DogAssessmentBot from '@/components/DogAssessmentBot';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  HeartIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { User, Dog } from '@/types';
import { authenticatedGet, authenticatedPost } from '@/lib/api/apiClient';

export default function DogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssessmentBot, setShowAssessmentBot] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [assessmentCode, setAssessmentCode] = useState('');
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDogs = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Use the dogs API which handles role-based access
        const response = await authenticatedGet('/api/dogs');
        const data = await response.json();
        
        if (data.success) {
          setDogs(data.dogs);
        } else {
          console.error('Error loading dogs:', data.error);
          setDogs([]);
        }
      } catch (error) {
        console.error('Error loading dogs:', error);
        setDogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadDogs();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const reloadDogs = async () => {
    if (!user) return;
    
    try {
      const response = await authenticatedGet('/api/dogs');
      const data = await response.json();
      
      if (data.success) {
        setDogs(data.dogs);
      } else {
        console.error('Error reloading dogs:', data.error);
      }
    } catch (error) {
      console.error('Error reloading dogs:', error);
    }
  };

  const handleAssessmentComplete = async (result: { dogProfile: { name: string; age: string; breed: string; size: string; energyLevel: string; behaviorIssues: string[]; healthIssues: string[]; environment: string; experience: string }; recommendations: { primaryProgram: string; secondaryPrograms: string[]; reasoning: string; urgency: 'low' | 'medium' | 'high' } }) => {
    // Ask for dog name
    const dogName = prompt('What is your dog\'s name?');
    if (!dogName) return; // User cancelled
    
    try {
      // Create a new dog profile via API
      const response = await authenticatedPost('/api/dogs', {
        name: dogName,
        breed: result.dogProfile.breed,
        age: result.dogProfile.age.includes('Puppy') ? 0.5 :
             result.dogProfile.age.includes('Young') ? 2 :
             result.dogProfile.age.includes('Adult') ? 5 : 8,
        weight: result.dogProfile.size.includes('Small') ? 15 :
                result.dogProfile.size.includes('Medium') ? 40 :
                result.dogProfile.size.includes('Large') ? 80 : 120,
        medical_notes: result.dogProfile.healthIssues.length > 0 ?
          `Health issues: ${result.dogProfile.healthIssues.join(', ')}` : undefined,
        behavioral_notes: result.dogProfile.behaviorIssues.length > 0 ?
          `Behavioral issues: ${result.dogProfile.behaviorIssues.join(', ')}. Recommended program: ${result.recommendations.primaryProgram}` :
          `Recommended program: ${result.recommendations.primaryProgram}`,
        preferences: `Energy level: ${result.dogProfile.energyLevel}. Environment: ${result.dogProfile.environment}`,
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create dog');
      }

      // Reload dogs from database to get the updated list
      await reloadDogs();
      
      setShowAssessmentBot(false);
    } catch (error) {
      console.error('Error creating dog from assessment:', error);
      alert('Error creating dog profile. Please try again.');
    }
  };

  const handleCodeSubmit = async () => {
    if (!assessmentCode.trim()) {
      alert('Please enter an assessment code.');
      return;
    }

    // Check if assessment exists in localStorage
    const assessmentData = localStorage.getItem(`assessment_${assessmentCode}`);
    if (!assessmentData) {
      alert('Invalid assessment code. Please check the code and try again.');
      return;
    }

    try {
      const assessment = JSON.parse(assessmentData);
      
      // Ask for dog name
      const dogName = prompt('What is your dog\'s name?');
      if (!dogName) return; // User cancelled
      
      // Create a new dog profile in database based on the assessment
      await createDog({
        name: dogName,
        breed: assessment.dogProfile.breed,
        age: assessment.dogProfile.age.includes('Puppy') ? 0.5 : 
             assessment.dogProfile.age.includes('Young') ? 2 : 
             assessment.dogProfile.age.includes('Adult') ? 5 : 8,
        weight: assessment.dogProfile.size.includes('Small') ? 15 : 
                assessment.dogProfile.size.includes('Medium') ? 40 : 
                assessment.dogProfile.size.includes('Large') ? 80 : 120,
        medical_notes: assessment.dogProfile.healthIssues.length > 0 ? 
          `Health issues: ${assessment.dogProfile.healthIssues.join(', ')}` : undefined,
        behavioral_notes: assessment.dogProfile.behaviorIssues.length > 0 ? 
          `Behavioral issues: ${assessment.dogProfile.behaviorIssues.join(', ')}. Recommended program: ${assessment.recommendations.primaryProgram}` : 
          `Recommended program: ${assessment.recommendations.primaryProgram}`,
        preferences: `Energy level: ${assessment.dogProfile.energyLevel}. Environment: ${assessment.dogProfile.environment}`,
        photo_url: '/api/placeholder/150/150',
      });

      // Reload dogs from database to get the updated list
      await reloadDogs();
      
      setShowCodeInput(false);
      setAssessmentCode('');
      
      // Remove the assessment from localStorage
      localStorage.removeItem(`assessment_${assessmentCode}`);
      
      alert(`Dog profile created successfully for ${dogName}!`);
    } catch (error) {
      alert('Error processing assessment code. Please try again.');
      console.error('Error processing assessment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedDog && showEditModal) {
        // Update existing dog
        await updateDog(selectedDog.id, {
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
      } else {
        // Create new dog in database
        await createDog({
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
          photo_url: '/api/placeholder/150/150',
        });
      }

      // Reload dogs from database to get the updated list
      await reloadDogs();
      
      // Reset form and close modals
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
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedDog(null);
    } catch (error) {
      console.error('Error saving dog:', error);
      alert('Error saving dog. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Use database search function for better performance
  const [filteredDogs, setFilteredDogs] = useState<Dog[]>([]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dogs</h1>
          <p className="text-gray-600">
            Manage dog profiles and training information
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 sm:mt-0">
            <Button 
              onClick={() => setShowAssessmentBot(true)}
              variant="outline"
              className="border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              AI Assessment
            </Button>
            <Button 
              onClick={() => setShowAddModal(true)}
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
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search dogs by name or breed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dogs</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Dogs in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Training</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently in training
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <HeartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dogs.length > 0 ? Math.round(dogs.reduce((sum, dog) => sum + dog.age, 0) / dogs.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Years old
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dogs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDogs.map((dog) => (
          <Card key={dog.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[rgb(0_32_96)] bg-opacity-10 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-[rgb(0_32_96)]">
                    {dog.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg">{dog.name}</CardTitle>
                  <CardDescription>{dog.breed}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Age:</span> {dog.age} years
                </div>
                <div>
                  <span className="font-medium">Weight:</span> {dog.weight}kg
                </div>
              </div>
              
              {dog.behavioral_notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span>
                  <p className="text-gray-600 mt-1 line-clamp-2">
                    {dog.behavioral_notes}
                  </p>
                </div>
              )}

              {dog.emergency_contact && (
                <div className="text-sm">
                  <span className="font-medium">Emergency Contact:</span>
                  <p className="text-gray-600 mt-1">
                    {dog.emergency_contact.name}
                  </p>
                  <p className="text-gray-600">
                    {dog.emergency_contact.phone}
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedDog(dog);
                    setShowViewModal(true);
                  }}
                >
                  View Profile
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    setSelectedDog(dog);
                    // Load dog data into form
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
                  }}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDogs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first dog.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Dog Profile Modal */}
      {showViewModal && selectedDog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedDog.name}'s Profile</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDog(null);
                  }}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedDog.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Breed</p>
                    <p className="font-medium">{selectedDog.breed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-medium">{selectedDog.age} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-medium">{selectedDog.weight}kg</p>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              {(selectedDog.medical_notes || selectedDog.vaccine_records) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                  {selectedDog.medical_notes && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Medical Notes</p>
                      <p className="text-gray-900">{selectedDog.medical_notes}</p>
                    </div>
                  )}
                  {selectedDog.vaccine_records && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Vaccine Records</p>
                      <p className="text-gray-900">{selectedDog.vaccine_records}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Behavioral Information */}
              {(selectedDog.behavioral_notes || selectedDog.preferences) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Behavioral Information</h3>
                  {selectedDog.behavioral_notes && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Behavioral Notes</p>
                      <p className="text-gray-900">{selectedDog.behavioral_notes}</p>
                    </div>
                  )}
                  {selectedDog.preferences && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Preferences</p>
                      <p className="text-gray-900">{selectedDog.preferences}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Emergency Contact */}
              {selectedDog.emergency_contact && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedDog.emergency_contact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedDog.emergency_contact.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Relationship</p>
                      <p className="font-medium">{selectedDog.emergency_contact.relationship}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${selectedDog.name}? This action cannot be undone.`)) {
                        const success = await deleteDog(selectedDog.id);
                        if (success) {
                          // Reload dogs from database
                          await reloadDogs();
                          setShowViewModal(false);
                          setSelectedDog(null);
                          alert(`${selectedDog.name} has been deleted successfully.`);
                        } else {
                          alert('Failed to delete dog. Please try again.');
                        }
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Dog
                  </Button>
                )}
                <div className={user?.role === 'admin' ? 'flex gap-2' : 'flex justify-end'}>
                  <Button
                    onClick={async () => {
                      setShowViewModal(false);
                      // Load dog data into form for editing
                      const dogData = await getDogById(selectedDog.id);
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
                    }}
                  >
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
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{showEditModal ? 'Edit Dog' : 'Add New Dog'}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedDog(null);
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
                  }}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {showEditModal ? 'Update the details for this dog' : 'Fill in the details to add a new dog to your profile'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Dog Name"
                    placeholder="Enter dog's name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                  <Input
                    label="Breed"
                    placeholder="Enter breed"
                    value={formData.breed}
                    onChange={(e) => handleInputChange('breed', e.target.value)}
                    required
                  />
                  <Input
                    label="Age (years)"
                    type="number"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    required
                  />
                  <Input
                    label="Weight (kg)"
                    type="number"
                    step="0.1"
                    placeholder="Enter weight"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    required
                  />
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Medical Information</h3>
                  <Input
                    label="Medical Notes"
                    placeholder="Any medical conditions or notes"
                    value={formData.medical_notes}
                    onChange={(e) => handleInputChange('medical_notes', e.target.value)}
                  />
                  <Input
                    label="Vaccine Records"
                    placeholder="Vaccination status and records"
                    value={formData.vaccine_records}
                    onChange={(e) => handleInputChange('vaccine_records', e.target.value)}
                  />
                </div>

                {/* Behavioral Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Behavioral Information</h3>
                  <Input
                    label="Behavioral Notes"
                    placeholder="Behavioral observations and notes"
                    value={formData.behavioral_notes}
                    onChange={(e) => handleInputChange('behavioral_notes', e.target.value)}
                  />
                  <Input
                    label="Preferences"
                    placeholder="Likes, dislikes, favorite activities"
                    value={formData.preferences}
                    onChange={(e) => handleInputChange('preferences', e.target.value)}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Contact Name"
                      placeholder="Emergency contact name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    />
                    <Input
                      label="Contact Phone"
                      placeholder="Emergency contact phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Relationship"
                    placeholder="Relationship to dog (e.g., Owner, Family Member)"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (showEditModal ? 'Updating Dog...' : 'Adding Dog...') : (showEditModal ? 'Update Dog' : 'Add Dog')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedDog(null);
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
                  onClick={() => setShowCodeInput(false)}
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
                  onChange={(e) => setAssessmentCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCodeInput(false)}
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
