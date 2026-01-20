// Simple in-memory data store for content management
// In a real app, this would be connected to a database

export interface NewsAttachment {
  id: string;
  filename: string;
  type: 'pdf' | 'jpeg';
  url: string;
  size: number;
  uploaded_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'event' | 'announcement';
  published: boolean;
  attachments?: NewsAttachment[];
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: 'behaviour' | 'farm' | 'academy' | 'service';
  active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  active: boolean;
}

// Default content data
export const defaultNewsItems: NewsItem[] = [
  {
    id: '1',
    title: 'New Training Program Launch',
    content: 'We\'re excited to announce our new "Puppy Foundations" program designed specifically for puppies aged 8-16 weeks. Early bird registration now open!',
    date: '2024-01-15',
    type: 'news',
    published: true
  },
  {
    id: '2',
    title: 'Team Expansion',
    content: 'Welcome our newest team member, Emma, who specializes in service dog training. She brings 5 years of experience in emotional support animal programs.',
    date: '2024-01-10',
    type: 'news',
    published: true
  },
  {
    id: '3',
    title: 'Puppy Socialization Day',
    content: 'Join us for a fun-filled day of puppy socialization and early training tips. Perfect for puppies 8-16 weeks old.',
    date: '2024-02-10',
    type: 'event',
    published: true
  },
  {
    id: '4',
    title: 'Advanced Training Workshop',
    content: 'Intensive workshop for experienced dog owners looking to take their training to the next level. Limited spots available.',
    date: '2024-02-24',
    type: 'event',
    published: true
  },
  {
    id: '5',
    title: 'Service Dog Awareness Day',
    content: 'Learn about service dogs and emotional support animals. Meet our trained service dogs and their handlers. Free event for the community.',
    date: '2024-03-15',
    type: 'event',
    published: true
  },
  {
    id: '6',
    title: 'New Client Special',
    content: 'Get 20% off your first training session when you book before February 29th, 2024!',
    date: '2024-01-20',
    type: 'announcement',
    published: true
  },
  {
    id: '7',
    title: 'Referral Program',
    content: 'Refer a friend and both you and your friend get a free consultation session!',
    date: '2024-01-25',
    type: 'announcement',
    published: true
  }
];

export const defaultServices: ServiceItem[] = [
  {
    id: '1',
    name: 'Behaviour & Home',
    description: 'Professional behavior modification and home-based training to help your dog become a well-behaved family member.',
    category: 'behaviour',
    active: true
  },
  {
    id: '2',
    name: 'Farm',
    description: 'Specialized farm dog training and working dog programs designed for agricultural and rural environments.',
    category: 'farm',
    active: true
  },
  {
    id: '3',
    name: 'Academy',
    description: 'Comprehensive training programs and educational courses for dogs and their owners to build strong foundations.',
    category: 'academy',
    active: true
  },
  {
    id: '4',
    name: 'Service & Emotional Support',
    description: 'Specialized training for service dogs and emotional support animals to provide assistance and companionship.',
    category: 'service',
    active: true
  }
];

export const defaultTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Lucy',
    role: 'Founder & Lead Behaviourist',
    bio: 'BSC(Hons) Animal Science, Behaviour and Welfare. Training dogs since 2005, founded Just Dogs in 2014. Oversees all operations and ensures every dog receives expert care.',
    active: true
  },
  {
    id: '2',
    name: 'Andy',
    role: 'Senior Trainer',
    bio: 'Certified dog trainer with 8+ years experience. Specializes in behavioral modification and works with dogs of all ages and breeds.',
    active: true
  },
  {
    id: '3',
    name: 'Sarah',
    role: 'Puppy Specialist',
    bio: 'Expert in puppy development and early socialization. Helps new dog owners establish strong foundations for their furry family members.',
    active: true
  },
  {
    id: '4',
    name: 'Mike',
    role: 'Farm Dog Specialist',
    bio: 'Specializes in working dogs and farm environments. Expert in training dogs for agricultural work and rural living situations.',
    active: true
  },
  {
    id: '5',
    name: 'Emma',
    role: 'Service Dog Trainer',
    bio: 'Certified service dog trainer specializing in emotional support and assistance dogs. Helps dogs and owners build life-changing partnerships.',
    active: true
  },
  {
    id: '6',
    name: 'David',
    role: 'Behavioral Consultant',
    bio: 'Advanced behavioral specialist working with complex cases. Focuses on rehabilitation and helping dogs overcome challenging behavioral issues.',
    active: true
  }
];

// In-memory storage (in a real app, this would be a database)
let newsItems = [...defaultNewsItems];
let services = [...defaultServices];
let teamMembers = [...defaultTeamMembers];

// News functions - Now using Supabase
import * as supabaseNews from '../supabase/news';

export const getNewsItems = async (): Promise<NewsItem[]> => {
  try {
    return await supabaseNews.getNewsItems();
  } catch (error) {
    console.error('Error fetching news items, falling back to defaults:', error);
    // Fallback to defaults if Supabase fails
    return defaultNewsItems.filter(item => item.published);
  }
};

export const getAllNewsItems = async (): Promise<NewsItem[]> => {
  try {
    return await supabaseNews.getAllNewsItems();
  } catch (error) {
    console.error('Error fetching all news items, falling back to defaults:', error);
    // Fallback to defaults if Supabase fails
    return defaultNewsItems;
  }
};

export const updateNewsItem = async (id: string, updates: Partial<NewsItem>): Promise<NewsItem | null> => {
  try {
    return await supabaseNews.updateNewsItem(id, updates);
  } catch (error) {
    console.error('Error updating news item:', error);
    throw error;
  }
};

export const addNewsItem = async (item: Omit<NewsItem, 'id'>): Promise<NewsItem> => {
  try {
    return await supabaseNews.addNewsItem(item);
  } catch (error) {
    console.error('Error adding news item:', error);
    throw error;
  }
};

export const deleteNewsItem = async (id: string): Promise<boolean> => {
  try {
    return await supabaseNews.deleteNewsItem(id);
  } catch (error) {
    console.error('Error deleting news item:', error);
    throw error;
  }
};

// Services functions
export const getServices = (): ServiceItem[] => {
  return services.filter(service => service.active);
};

export const getAllServices = (): ServiceItem[] => {
  return services;
};

export const updateService = (id: string, updates: Partial<ServiceItem>): ServiceItem | null => {
  const index = services.findIndex(service => service.id === id);
  if (index !== -1) {
    services[index] = { ...services[index], ...updates };
    return services[index];
  }
  return null;
};

export const addService = (service: Omit<ServiceItem, 'id'>): ServiceItem => {
  const newService: ServiceItem = {
    ...service,
    id: Date.now().toString()
  };
  services.push(newService);
  return newService;
};

export const deleteService = (id: string): boolean => {
  const index = services.findIndex(service => service.id === id);
  if (index !== -1) {
    services.splice(index, 1);
    return true;
  }
  return false;
};

// Team functions
export const getTeamMembers = (): TeamMember[] => {
  return teamMembers.filter(member => member.active);
};

export const getAllTeamMembers = (): TeamMember[] => {
  return teamMembers;
};

export const updateTeamMember = (id: string, updates: Partial<TeamMember>): TeamMember | null => {
  const index = teamMembers.findIndex(member => member.id === id);
  if (index !== -1) {
    teamMembers[index] = { ...teamMembers[index], ...updates };
    return teamMembers[index];
  }
  return null;
};

export const addTeamMember = (member: Omit<TeamMember, 'id'>): TeamMember => {
  const newMember: TeamMember = {
    ...member,
    id: Date.now().toString()
  };
  teamMembers.push(newMember);
  return newMember;
};

export const deleteTeamMember = (id: string): boolean => {
  const index = teamMembers.findIndex(member => member.id === id);
  if (index !== -1) {
    teamMembers.splice(index, 1);
    return true;
  }
  return false;
};
