'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DogAssessmentBot from '@/components/DogAssessmentBot';

export default function ServicesPage() {
  const [showAssessmentBot, setShowAssessmentBot] = useState(false);

  const handleAssessmentComplete = (result: { code?: string; dogProfile?: { name: string; age: string; breed: string; size: string; energyLevel: string; behaviorIssues: string[]; healthIssues: string[]; environment: string; experience: string }; recommendations?: { primaryProgram: string; secondaryPrograms: string[]; reasoning: string; urgency: 'low' | 'medium' | 'high' } }) => {
    setShowAssessmentBot(false);
    
    // Show success message with code
    if (result.code) {
      alert(`Assessment completed! Your code is: ${result.code}\n\nPlease log in and enter this code in the Dogs section to create your dog profile.`);
    } else {
      alert('Assessment completed! Please log in to create your dog profile and view recommendations.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <img
                src="/images/icons/logo.gif"
                alt="Just Dogs Logo"
                className="w-[1.6rem] h-8 mr-3"
              />
              <span className="text-xl font-bold text-[rgb(0_32_96)]">Just Dogs</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)]">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white rounded-full px-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[rgb(0_32_96)] mb-4">Our Services</h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            From pet care to specialized training, we provide comprehensive dog services 
            with professional management. Trusted by hundreds of happy dogs and their families.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Behaviour & Home */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                🏠 Behaviour & Home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Professional behavior modification and home-based training to help your dog 
                become a well-behaved family member.
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                  onClick={() => setShowAssessmentBot(true)}
                >
                  Book This Service
                </Button>
                <Link 
                  href="https://justdogs.co.za/behaviour-and-home" 
                  target="_blank" 
                  className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline block text-center"
                >
                  More info on the website
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Farm */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                🚜 Farm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Specialized farm dog training and working dog programs designed for 
                agricultural and rural environments.
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                  onClick={() => setShowAssessmentBot(true)}
                >
                  Book This Service
                </Button>
                <Link 
                  href="https://justdogs.co.za/the-farm" 
                  target="_blank" 
                  className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline block text-center"
                >
                  More info on the website
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Academy */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                🎓 Academy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Comprehensive training programs and educational courses for dogs and 
                their owners to build strong foundations.
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                  onClick={() => setShowAssessmentBot(true)}
                >
                  Book This Service
                </Button>
                <Link 
                  href="https://justdogs.co.za/training-academy" 
                  target="_blank" 
                  className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline block text-center"
                >
                  More info on the website
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Service & Emotional Support */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                ❤️ Service & Emotional Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Specialized training for service dogs and emotional support animals 
                to provide assistance and companionship.
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                  onClick={() => setShowAssessmentBot(true)}
                >
                  Book This Service
                </Button>
                <Link 
                  href="https://justdogs.co.za/jdesd" 
                  target="_blank" 
                  className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline block text-center"
                >
                  More info on the website
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dog Assessment Bot Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-4">
            🐕 Get Personalized Recommendations
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Not sure which service is right for your dog? Take our quick assessment 
            to get personalized recommendations tailored to your dog's needs.
          </p>
          <Button 
            size="lg" 
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white px-8 py-4 text-lg rounded-xl"
            onClick={() => setShowAssessmentBot(true)}
          >
            Start Assessment
          </Button>
        </div>
      </div>

      {/* Dog Assessment Bot Modal */}
      {showAssessmentBot && (
        <DogAssessmentBot
          isOpen={showAssessmentBot}
          onComplete={handleAssessmentComplete}
          onClose={() => setShowAssessmentBot(false)}
        />
      )}
    </div>
  );
}
