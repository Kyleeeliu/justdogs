import { Service, BookingType, TrainingLevel, ConsultType } from '@/types';

export const SERVICES: Service[] = [
  {
    id: '1',
    name: 'Pet Care',
    type: 'pet_care',
    description: 'Comprehensive pet care including feeding, walking, and basic attention',
    duration_minutes: 60,
    price_zar: 15000, // R150.00
    color_class: 'service-pet-care',
    icon: '🐾',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Dog Sitting',
    type: 'dog_sitting',
    description: 'Professional dog sitting service in your home or our facility',
    duration_minutes: 480, // 8 hours
    price_zar: 80000, // R800.00
    color_class: 'service-dog-sitting',
    icon: '🏠',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Dog Training',
    type: 'dog_training',
    description: 'Structured training sessions with certified trainers',
    duration_minutes: 60,
    price_zar: 25000, // R250.00
    color_class: 'service-dog-training',
    icon: '🎓',
    available_levels: ['beginner', 'intermediate', 'advanced', 'expert'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Private Training',
    type: 'private_training',
    description: 'One-on-one training for behavioral issues and specialized needs',
    duration_minutes: 90,
    price_zar: 40000, // R400.00
    color_class: 'service-private-training',
    icon: '🎯',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Consultation',
    type: 'consult',
    description: 'Professional consultation with behaviorist or trainer',
    duration_minutes: 45,
    price_zar: 30000, // R300.00
    color_class: 'service-consult',
    icon: '💬',
    available_consult_types: ['behavioral', 'training', 'general'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getServiceById = (id: string): Service | undefined => {
  return SERVICES.find(service => service.id === id);
};

export const getServiceByType = (type: BookingType): Service | undefined => {
  return SERVICES.find(service => service.type === type);
};

export const getActiveServices = (): Service[] => {
  return SERVICES.filter(service => service.is_active);
};

export const getServiceColor = (type: BookingType): string => {
  const service = getServiceByType(type);
  return service?.color_class || 'service-dog-training';
};

export const getServiceIcon = (type: BookingType): string => {
  const service = getServiceByType(type);
  return service?.icon || '🐕';
};

export const getServicePrice = (type: BookingType): number => {
  const service = getServiceByType(type);
  return service?.price_zar || 0;
};

export const formatPrice = (priceInCents: number): string => {
  return `R${(priceInCents / 100).toFixed(2)}`;
};

export const getTrainingLevels = (): { value: TrainingLevel; label: string }[] => [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export const getConsultTypes = (): { value: ConsultType; label: string }[] => [
  { value: 'behavioral', label: 'Behavioral Issues' },
  { value: 'training', label: 'Training Guidance' },
  { value: 'general', label: 'General Advice' },
];

export const getServiceDisplayName = (type: BookingType): string => {
  const service = getServiceByType(type);
  return service?.name || 'Unknown Service';
};

export const getServiceDescription = (type: BookingType): string => {
  const service = getServiceByType(type);
  return service?.description || 'Service description not available';
};
