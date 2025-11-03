export type UserRole = 'admin' | 'trainer' | 'parent' | 'behaviorist';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight?: number;
  owner_id: string;
  medical_notes?: string;
  behavioral_notes?: string;
  vaccine_records?: string;
  preferences?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingType = 'pet_care' | 'dog_sitting' | 'dog_training' | 'private_training' | 'consult';
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ConsultType = 'behavioral' | 'training' | 'general';

export interface Booking {
  id: string;
  dog_id: string;
  trainer_id: string;
  parent_id: string;
  booking_type: BookingType;
  training_level?: TrainingLevel; // For dog training bookings
  consult_type?: ConsultType; // For consult bookings
  status: BookingStatus;
  start_time: string;
  end_time: string;
  special_instructions?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  booking_id: string;
  trainer_id: string;
  parent_id: string;
  dog_id: string;
  status: SessionStatus;
  start_time: string;
  end_time: string;
  notes: string;
  progress_rating?: number; // 1-5 scale
  behavior_rating?: number; // 1-5 scale
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  parent_id: string;
  booking_id?: string;
  amount: number; // in ZAR cents
  currency: 'ZAR';
  status: InvoiceStatus;
  due_date: string;
  invoice_number: string;
  description: string;
  payment_proof_url?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string; // null for announcements
  subject: string;
  content: string;
  is_announcement: boolean;
  target_roles?: UserRole[]; // for announcements
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_bookings_today: number;
  total_dogs: number;
  total_trainers: number;
  total_revenue_month: number;
  pending_bookings: number;
}

export interface TrainerStats {
  today_sessions: number;
  total_dogs_assigned: number;
  unread_messages: number;
  upcoming_sessions: Booking[];
}

export interface ParentStats {
  total_dogs: number;
  upcoming_sessions: number;
  unread_messages: number;
}

// Service definitions
export interface Service {
  id: string;
  name: string;
  type: BookingType;
  description: string;
  duration_minutes: number;
  price_zar: number; // in ZAR cents
  color_class: string;
  icon: string;
  available_levels?: TrainingLevel[];
  available_consult_types?: ConsultType[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface DogFormData {
  name: string;
  breed: string;
  age: number;
  weight?: number;
  medical_notes?: string;
  behavioral_notes?: string;
  vaccine_records?: string;
  preferences?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

export interface BookingFormData {
  dog_id: string;
  trainer_id: string;
  booking_type: BookingType;
  training_level?: TrainingLevel;
  consult_type?: ConsultType;
  start_time: string;
  end_time: string;
  special_instructions?: string;
  location?: string;
}

export interface SessionFormData {
  attended: boolean;
  notes: string;
  progress_rating?: number;
  behavior_rating?: number;
}

export interface MessageFormData {
  recipient_id?: string;
  subject: string;
  content: string;
  is_announcement: boolean;
  target_roles?: UserRole[];
}
