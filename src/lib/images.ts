// Images configuration for Just Dogs website
// This file centralizes all image paths and metadata

export const images = {
  // Company Logo
  logo: {
    dogGraduationCap: '/images/icons/logo.png',
    dogGraduationCapWhite: '/images/icons/logo.png',
    favicon: '/favicon.ico',
  },

  // Service Icons
  serviceIcons: {
    behavioralConsultation: '/images/icons/behavioral-consultation.svg',
    socialAssessment: '/images/icons/social-assessment.svg',
    complexConsultation: '/images/icons/complex-consultation.svg',
    introductions: '/images/icons/introductions.svg',
  },

  // Hero and Marketing Images
  hero: {
    mainHero: '/images/hero/main-hero.jpg',
    dogTraining: '/images/hero/dog-training.jpg',
    dogWalking: '/images/hero/dog-walking.jpg',
    dogSitting: '/images/hero/dog-sitting.jpg',
  },

  // Service Photos
  services: {
    training: '/images/services/training.jpg',
    consultation: '/images/services/consultation.jpg',
    assessment: '/images/services/assessment.jpg',
    introduction: '/images/services/introduction.jpg',
  },

  // Team and Staff Photos
  team: {
    trainer1: '/images/team/trainer-1.jpg',
    trainer2: '/images/team/trainer-2.jpg',
    behaviorist: '/images/team/behaviorist.jpg',
    seniorTrainer: '/images/team/senior-trainer.jpg',
  },

  // Dog Photos (for examples/demos)
  dogs: {
    dog1: '/images/dogs/dog-1.jpg',
    dog2: '/images/dogs/dog-2.jpg',
    dog3: '/images/dogs/dog-3.jpg',
    puppy: '/images/dogs/puppy.jpg',
    adultDog: '/images/dogs/adult-dog.jpg',
  },

  // Location Photos
  locations: {
    leadvilleOffice: '/images/locations/leadville-office.jpg',
    dogPark: '/images/locations/dog-park.jpg',
    trainingFacility: '/images/locations/training-facility.jpg',
    homeVisit: '/images/locations/home-visit.jpg',
  },

  // UI and Decorative Images
  ui: {
    backgroundPattern: '/images/ui/background-pattern.svg',
    divider: '/images/ui/divider.svg',
    arrow: '/images/ui/arrow.svg',
    checkmark: '/images/ui/checkmark.svg',
  },

  // Social Proof and Testimonials
  social: {
    testimonial1: '/images/social/testimonial-1.jpg',
    testimonial2: '/images/social/testimonial-2.jpg',
    beforeAfter1: '/images/social/before-after-1.jpg',
    beforeAfter2: '/images/social/before-after-2.jpg',
  },

  // Blog and Content Images
  blog: {
    blog1: '/images/blog/blog-1.jpg',
    blog2: '/images/blog/blog-2.jpg',
    blog3: '/images/blog/blog-3.jpg',
  },
};

// Image metadata for optimization
export const imageMetadata = {
  logo: {
    dogGraduationCap: {
      width: 64,
      height: 64,
      alt: 'Just Dogs Logo - Dog wearing graduation cap',
      priority: true,
    },
  },
  hero: {
    mainHero: {
      width: 1920,
      height: 1080,
      alt: 'Professional dog training services',
      priority: true,
    },
  },
  services: {
    training: {
      width: 800,
      height: 600,
      alt: 'Dog training session',
    },
    consultation: {
      width: 800,
      height: 600,
      alt: 'Behavioral consultation',
    },
  },
};

// SVG icon components for inline use
export const svgIcons = {
  dogGraduationCap: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <!-- Dog body -->
      <path d="M8 18c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1.5 3-3 3z"/>
      <path d="M16 18c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1.5 3-3 3z"/>
      <path d="M12 16c-2 0-4-1-4-3s2-3 4-3 4 1 4 3-2 3-4 3z"/>
      <!-- Dog head -->
      <circle cx="12" cy="10" r="2.5"/>
      <!-- Eye -->
      <circle cx="11" cy="9.5" r="0.8" fill="white"/>
      <!-- Graduation cap -->
      <rect x="9" y="6" width="6" height="1.5" rx="0.5"/>
      <rect x="10" y="5" width="4" height="1"/>
      <rect x="11" y="4" width="2" height="1"/>
      <!-- Tassel -->
      <path d="M15 5l1 2-1 1" stroke="white" strokeWidth="0.5" fill="none"/>
    </svg>
  `,
  
  behavioralConsultation: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 9h.01M15 9h.01M7 15c0 0 2 2 5 2s5-2 5-2"/>
    </svg>
  `,
  
  socialAssessment: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  `,
  
  complexConsultation: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  `,
  
  introductions: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M9 14h6M9 18h6"/>
    </svg>
  `,
};

// Helper function to get image with fallback
export function getImage(path: string, fallback?: string): string {
  return path || fallback || '/images/placeholder.jpg';
}

// Helper function to get optimized image props
export function getOptimizedImageProps(
  imageKey: keyof typeof images,
  size: 'small' | 'medium' | 'large' = 'medium'
) {
  const metadata = imageMetadata[imageKey as keyof typeof imageMetadata];
  if (!metadata) return {};
  
  const sizes = {
    small: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 },
  };
  
  return {
    ...metadata,
    ...sizes[size],
  };
}

export default images;
