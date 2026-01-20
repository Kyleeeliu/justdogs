'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamPage() {
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
          <h1 className="text-4xl font-bold text-[rgb(0_32_96)] mb-4">Meet Our Expert Team</h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Qualified professionals dedicated to providing the best care for your dogs
          </p>
        </div>

        {/* Team Members */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Lucy - Founder */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">L</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lucy</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Founder & Lead Behaviourist</p>
              <p className="text-gray-600 text-sm mb-4">
                BSC(Hons) Animal Science, Behaviour and Welfare. Training dogs since 2005, 
                founded Just Dogs in 2014. Oversees all operations and ensures every dog receives expert care.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>

          {/* Andy */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">A</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Andy</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Senior Trainer</p>
              <p className="text-gray-600 text-sm mb-4">
                Certified dog trainer with 8+ years experience. Specializes in behavioral modification 
                and works with dogs of all ages and breeds.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>

          {/* Sarah */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">S</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sarah</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Puppy Specialist</p>
              <p className="text-gray-600 text-sm mb-4">
                Expert in puppy development and early socialization. Helps new dog owners 
                establish strong foundations for their furry family members.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>

          {/* Mike */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">M</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mike</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Farm Dog Specialist</p>
              <p className="text-gray-600 text-sm mb-4">
                Specializes in working dogs and farm environments. Expert in training dogs 
                for agricultural work and rural living situations.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>

          {/* Emma */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">E</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Emma</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Service Dog Trainer</p>
              <p className="text-gray-600 text-sm mb-4">
                Certified service dog trainer specializing in emotional support and 
                assistance dogs. Helps dogs and owners build life-changing partnerships.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>

          {/* David */}
          <Card className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-20 h-20 bg-[rgb(0_32_96)] rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <span className="text-white text-2xl font-bold">D</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">David</h3>
              <p className="text-[rgb(0_32_96)] font-medium mb-3">Behavioral Consultant</p>
              <p className="text-gray-600 text-sm mb-4">
                Advanced behavioral specialist working with complex cases. Focuses on 
                rehabilitation and helping dogs overcome challenging behavioral issues.
              </p>
              <Button 
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                onClick={() => window.open('https://justdogs.co.za', '_blank')}
              >
                Book Session
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-4">
            Ready to Meet Your Perfect Trainer?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Our team is ready to help your dog reach their full potential. 
            Book a session today or learn more about our comprehensive training programs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://justdogs.co.za', '_blank')}
            >
              Visit Our Website
            </Button>
            <Link href="/services">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white px-8 py-4 text-lg rounded-xl"
              >
                View Our Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
