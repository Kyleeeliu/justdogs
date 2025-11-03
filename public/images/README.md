# Images Directory

This directory contains all images used throughout the Just Dogs website.

## Directory Structure

```
public/images/
├── README.md                           # This file
├── logo-dog-graduation-cap.svg         # Main company logo
├── logo-dog-graduation-cap-white.svg   # White version of logo
├── icons/                              # Service and UI icons
│   ├── behavioral-consultation.svg
│   ├── social-assessment.svg
│   ├── complex-consultation.svg
│   └── introductions.svg
├── hero/                               # Hero section images
│   ├── main-hero.jpg
│   ├── dog-training.jpg
│   ├── dog-walking.jpg
│   └── dog-sitting.jpg
├── services/                           # Service-related photos
│   ├── training.jpg
│   ├── consultation.jpg
│   ├── assessment.jpg
│   └── introduction.jpg
├── team/                               # Team and staff photos
│   ├── trainer-1.jpg
│   ├── trainer-2.jpg
│   ├── behaviorist.jpg
│   └── senior-trainer.jpg
├── dogs/                               # Dog example photos
│   ├── dog-1.jpg
│   ├── dog-2.jpg
│   ├── dog-3.jpg
│   ├── puppy.jpg
│   └── adult-dog.jpg
├── locations/                          # Location photos
│   ├── leadville-office.jpg
│   ├── dog-park.jpg
│   ├── training-facility.jpg
│   └── home-visit.jpg
├── ui/                                 # UI and decorative images
│   ├── background-pattern.svg
│   ├── divider.svg
│   ├── arrow.svg
│   └── checkmark.svg
├── social/                             # Social proof images
│   ├── testimonial-1.jpg
│   ├── testimonial-2.jpg
│   ├── before-after-1.jpg
│   └── before-after-2.jpg
└── blog/                               # Blog content images
    ├── blog-1.jpg
    ├── blog-2.jpg
    └── blog-3.jpg
```

## Image Specifications

### Logo
- **Format**: SVG (scalable vector graphics)
- **Colors**: Uses `currentColor` for dynamic theming
- **Dimensions**: 24x24 viewBox (scalable)

### Photos
- **Format**: JPG for photos, PNG for graphics with transparency
- **Optimization**: Compressed for web use
- **Responsive**: Multiple sizes available (small, medium, large)

### Icons
- **Format**: SVG for scalability
- **Style**: Consistent with design system
- **Colors**: Inherit from parent element

## Usage

### In React Components

```tsx
import { images, svgIcons } from '@/lib/images';

// Using image paths
<img src={images.logo.dogGraduationCap} alt="Just Dogs Logo" />

// Using SVG icons inline
<div dangerouslySetInnerHTML={{ __html: svgIcons.dogGraduationCap }} />

// Using Next.js Image component
import Image from 'next/image';
<Image 
  src={images.hero.mainHero}
  alt="Professional dog training"
  width={1920}
  height={1080}
/>
```

### Helper Functions

```tsx
import { getImage, getOptimizedImageProps } from '@/lib/images';

// Get image with fallback
const imagePath = getImage('/images/hero/main-hero.jpg', '/images/placeholder.jpg');

// Get optimized image props
const imageProps = getOptimizedImageProps('hero.mainHero', 'large');
```

## Adding New Images

1. **Place the image** in the appropriate subdirectory
2. **Update the images configuration** in `src/lib/images.ts`
3. **Add metadata** for optimization in `imageMetadata`
4. **Update this README** if adding new categories

## Image Optimization

- Use appropriate formats (JPG for photos, SVG for icons)
- Compress images for web use
- Provide multiple sizes for responsive design
- Use descriptive filenames and alt text
- Consider lazy loading for non-critical images

## Brand Guidelines

- **Logo**: Always maintain aspect ratio, minimum size 32x32px
- **Colors**: Use brand colors (navy blue: rgb(0, 32, 96))
- **Style**: Professional, clean, and approachable
- **Quality**: High resolution for print, optimized for web
