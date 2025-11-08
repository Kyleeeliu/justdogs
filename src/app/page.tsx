'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/1000531276.jpg" 
          alt="German Shepherd in natural setting" 
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(0_32_96)]/20 via-transparent to-[rgb(0_32_96)]/30"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8">
        <img
          src="/images/icons/logo.gif"
          alt="Just Dogs Logo"
          className="w-20 h-20 mx-auto mb-4"
        />
        <h1 className="text-4xl font-bold text-white text-center drop-shadow-lg">
          Just Dogs
        </h1>
      </div>

      {/* Slogan */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md slogan-font">
          SOCIALISE | STIMULATE | EXERCISE | EDUCATE
        </h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto drop-shadow-md mb-6">
          Empowering every dog's journey from enrichment to training, we bring out their best.
        </p>
        
        {/* Statistics */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-white drop-shadow-lg">1000+</div>
            <div className="text-sm text-white/80 drop-shadow-md">Dogs Trained</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white drop-shadow-lg">20+</div>
            <div className="text-sm text-white/80 drop-shadow-md">Dedicated Staff</div>
          </div>
        </div>
      </div>

      {/* Main Navigation Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl w-full">
        <Link href="/services" className="flex">
          <Button
            size="lg"
            className="w-full h-16 text-lg bg-white/90 hover:bg-white text-[rgb(0_32_96)] rounded-xl transition-all duration-300 hover:scale-105 shadow-xl backdrop-blur-sm flex items-center justify-center"
          >
            🐕 Our Services
          </Button>
        </Link>
        <Link href="/team" className="flex">
          <Button
            size="lg"
            className="w-full h-16 text-lg bg-white/90 hover:bg-white text-[rgb(0_32_96)] rounded-xl transition-all duration-300 hover:scale-105 shadow-xl backdrop-blur-sm flex items-center justify-center"
          >
            👥 Meet the Team
          </Button>
        </Link>
        <Link href="/gallery" className="flex">
          <Button
            size="lg"
            className="w-full h-16 text-lg bg-white/90 hover:bg-white text-[rgb(0_32_96)] rounded-xl transition-all duration-300 hover:scale-105 shadow-xl backdrop-blur-sm flex items-center justify-center"
          >
            🐾 Happy Dogs
          </Button>
        </Link>
        <Link href="/news" className="flex">
          <Button
            size="lg"
            className="w-full h-16 text-lg bg-white/90 hover:bg-white text-[rgb(0_32_96)] rounded-xl transition-all duration-300 hover:scale-105 shadow-xl backdrop-blur-sm flex items-center justify-center"
          >
            📰 News & Events
          </Button>
        </Link>
      </div>

      {/* Login/Register Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link href="/login" className="flex-1">
          <Button
            variant="outline"
            size="lg"
            className="w-full px-8 py-3 border-2 border-white text-[rgb(0_32_96)] hover:bg-white hover:text-[rgb(0_32_96)] rounded-xl transition-all duration-300 backdrop-blur-sm bg-white/90 flex items-center justify-center"
          >
            Login
          </Button>
        </Link>
        <Link href="/register" className="flex-1">
          <Button
            size="lg"
            className="w-full px-8 py-3 bg-white/90 hover:bg-white text-[rgb(0_32_96)] rounded-xl transition-all duration-300 shadow-xl backdrop-blur-sm flex items-center justify-center"
          >
            Register
          </Button>
        </Link>
      </div>
      </div>
    </div>
  );
}