# Professional Booking System Documentation

## Overview

This document describes the implementation of a professional booking system for the "Just Dogs" application. The system allows dog trainers to set their availability and dog owners to book sessions, with robust double-booking prevention.

## Key Features

### ✅ Implemented Features

1. **Trainer Availability Management**
   - Weekly recurring availability slots
   - Time-off exceptions (full day or partial)
   - Easy-to-use interface for trainers

2. **Smart Booking System**
   - Dynamic slot generation based on availability
   - Real-time conflict detection
   - Double-booking prevention at database level
   - Clean, step-by-step booking interface

3. **Database Safety**
   - Database triggers prevent overlapping bookings
   - Transactional booking creation
   - Proper constraints and validations

4. **Role-Based Access**
   - Trainers: Manage availability, view their bookings
   - Dog Owners: Book sessions, view their bookings
   - Admins: Full access to all features

## Architecture

### Database Schema

#### New Tables

1. **trainer_availability**
   ```sql
   - id: UUID (Primary Key)
   - trainer_id: UUID (Foreign Key to users)
   - day_of_week: INTEGER (0=Sunday, 6=Saturday)
   - start_time: TIME
   - end_time: TIME
   - created_at, updated_at: TIMESTAMP
   ```

2. **trainer_exceptions**
   ```sql
   - id: UUID (Primary Key)
   - trainer_id: UUID (Foreign Key to users)
   - exception_date: DATE
   - start_time: TIME (nullable for full day)
   - end_time: TIME (nullable for full day)
   - reason: TEXT (optional)
   - created_at, updated_at: TIMESTAMP
   ```

3. **Enhanced bookings table**
   - Added proper start_time/end_time columns
   - Added parent_id for direct owner reference
   - Added constraints to prevent past bookings
   - Added trigger for double-booking prevention

#### Database Functions

1. **get_available_slots(trainer_id, date, duration_minutes)**
   - Generates available time slots dynamically
   - Considers trainer availability, existing bookings, and exceptions
   - Returns only truly available slots

2. **check_booking_conflict()**
   - Trigger function that prevents overlapping bookings
   - Runs on INSERT/UPDATE of bookings table
   - Ensures database-level consistency

### API Endpoints

#### Trainer Availability Management
- `GET /api/trainer-availability?trainer_id={id}` - Get trainer's availability
- `POST /api/trainer-availability` - Create availability slot
- `PUT /api/trainer-availability` - Update availability slot
- `DELETE /api/trainer-availability?id={id}` - Delete availability slot

#### Trainer Exceptions Management
- `GET /api/trainer-exceptions?trainer_id={id}` - Get trainer's exceptions
- `POST /api/trainer-exceptions` - Create exception
- `PUT /api/trainer-exceptions` - Update exception
- `DELETE /api/trainer-exceptions?id={id}` - Delete exception

#### Available Slots
- `GET /api/available-slots?trainer_id={id}&date={date}&duration_minutes={minutes}` - Get available booking slots

#### Enhanced Bookings
- Enhanced existing `/api/bookings` with transaction support and conflict detection

### Frontend Components

#### For Trainers
1. **TrainerAvailabilityManager** (`/components/TrainerAvailabilityManager.tsx`)
   - Manage weekly availability
   - Add/remove time slots
   - Manage exceptions and time off
   - Clean, intuitive interface

2. **Trainer Availability Page** (`/dashboard/trainer-availability`)
   - Dedicated page for trainers to manage their schedule
   - Role-based access control

#### For Dog Owners
1. **BookingSlotSelector** (`/components/BookingSlotSelector.tsx`)
   - Step-by-step booking process
   - Trainer selection → Date selection → Dog selection → Time slot selection → Confirmation
   - Only shows available slots (no manual time entry)
   - Real-time slot availability

2. **Book Session Page** (`/dashboard/book-session`)
   - Dedicated booking page for dog owners
   - Handles edge cases (no dogs, no trainers, etc.)
   - Success confirmation with booking details

## How It Works

### Booking Flow

1. **Dog Owner Perspective:**
   ```
   Select Trainer → Choose Date → Select Dog → Pick Available Slot → Confirm Booking
   ```

2. **System Process:**
   ```
   Check trainer availability → Generate time slots → Filter out booked slots → 
   Filter out exceptions → Present available slots → Create booking with conflict check
   ```

3. **Double-Booking Prevention:**
   ```
   User clicks slot → API receives request → Database transaction begins → 
   Conflict check runs → If no conflict: booking created → Transaction commits
   If conflict: transaction rolls back → Error returned to user
   ```

### Availability System

1. **Weekly Patterns:**
   - Trainers set recurring weekly availability (e.g., Mon-Fri 9AM-5PM)
   - Multiple slots per day supported (e.g., 9AM-12PM, 2PM-5PM)

2. **Exceptions:**
   - Full day off (vacation, holiday)
   - Partial day off (doctor appointment, meeting)
   - Reason tracking for reference

3. **Slot Generation:**
   - System generates 60-minute slots from availability
   - Removes slots that conflict with existing bookings
   - Removes slots that conflict with exceptions
   - Only returns truly bookable slots

## Safety Features

### Database Level
- **Triggers:** Prevent double booking at database level
- **Constraints:** Ensure data integrity (end_time > start_time, etc.)
- **Transactions:** Atomic booking creation
- **RLS Policies:** Row-level security for data access

### Application Level
- **Role Validation:** Users can only access appropriate features
- **Input Validation:** All inputs validated before database operations
- **Error Handling:** Graceful error handling with user-friendly messages
- **Real-time Checks:** Availability checked at booking time

### User Experience
- **No Manual Time Entry:** Users can only select from available slots
- **Clear Feedback:** Loading states, error messages, success confirmations
- **Step-by-Step Process:** Guided booking flow prevents confusion
- **Conflict Prevention:** Impossible to book conflicting slots

## Installation & Setup

### 1. Database Migration
Run the migration file to create the new tables and functions:
```sql
-- Execute: supabase-migration-booking-system.sql
```

### 2. Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Navigation Updates
Add these routes to your navigation:
- `/dashboard/trainer-availability` (for trainers)
- `/dashboard/book-session` (for dog owners)

## Usage Instructions

### For Trainers

1. **Set Up Availability:**
   - Go to "Trainer Availability" page
   - Add your weekly schedule (e.g., Monday 9AM-5PM)
   - Add multiple time slots per day if needed

2. **Manage Time Off:**
   - Add exceptions for vacations, holidays, appointments
   - Choose full day or partial day off
   - Add reason for reference

3. **View Bookings:**
   - Use existing bookings page to see scheduled sessions
   - Bookings will only appear during your available times

### For Dog Owners

1. **Book a Session:**
   - Go to "Book Session" page
   - Follow the step-by-step process:
     - Select your preferred trainer
     - Choose a date
     - Select which dog
     - Pick from available time slots
     - Confirm booking details

2. **Manage Bookings:**
   - View all bookings in the main bookings page
   - See booking status and details

### For Admins

1. **Full Access:**
   - Can access both trainer and owner interfaces
   - Can book sessions for any dog owner
   - Can view all bookings and availability

## Session Duration Configuration

The system currently uses 60-minute sessions. To change this:

1. **Backend:** Update the default in `/api/available-slots/route.ts`:
   ```typescript
   const durationMinutes = parseInt(searchParams.get('duration_minutes') || '60');
   ```

2. **Frontend:** Update the duration in booking components:
   ```typescript
   `/api/available-slots?trainer_id=${trainerId}&date=${date}&duration_minutes=90`
   ```

3. **Database:** The `get_available_slots` function accepts duration as a parameter, so no database changes needed.

## Technical Notes

### Performance Considerations
- Database indexes on trainer_id, date, and time columns
- Efficient slot generation algorithm
- Minimal API calls during booking process

### Scalability
- System can handle multiple trainers and concurrent bookings
- Database triggers ensure consistency under load
- Stateless API design for horizontal scaling

### Security
- Row-level security policies
- Role-based access control
- Input validation and sanitization
- Service role key for admin operations

## Troubleshooting

### Common Issues

1. **"No available slots" message:**
   - Check if trainer has set availability for that day
   - Verify no exceptions are blocking the time
   - Ensure the date is not in the past

2. **Booking conflicts:**
   - System prevents double booking automatically
   - If error occurs, another user may have booked the slot
   - Refresh and try a different time slot

3. **Permission errors:**
   - Verify user roles are set correctly
   - Check RLS policies are applied
   - Ensure service role key is configured

4. **Authentication Issues (Invalid Refresh Token):**
   - **Quick Fix:** Visit `/auth-recovery` to clear corrupted auth state
   - **Manual Fix:** Clear browser localStorage and sessionStorage
   - **Root Cause:** Usually occurs when Supabase tokens expire or become corrupted
   - **Prevention:** The system now auto-detects and recovers from these errors

### Database Debugging

```sql
-- Check trainer availability
SELECT * FROM trainer_availability WHERE trainer_id = 'trainer-uuid';

-- Check exceptions
SELECT * FROM trainer_exceptions WHERE trainer_id = 'trainer-uuid';

-- Test slot generation
SELECT * FROM get_available_slots('trainer-uuid', '2024-01-15', 60);

-- Check for booking conflicts
SELECT * FROM bookings WHERE trainer_id = 'trainer-uuid' 
AND start_time <= '2024-01-15 10:00:00' 
AND end_time >= '2024-01-15 09:00:00';
```

### Authentication Recovery

If users encounter "Invalid Refresh Token" or "AuthApiError" issues:

1. **Automatic Recovery:** The system now automatically detects and handles these errors
2. **Manual Recovery:** Users can visit `/auth-recovery` to manually clear their auth state
3. **Developer Tools:** Use the `AuthRecovery` utility class for programmatic recovery

```typescript
import { AuthRecovery } from '@/lib/auth/authRecovery';

// Check if error should trigger recovery
if (AuthRecovery.shouldRecover(error)) {
  await AuthRecovery.clearAndRedirect();
}

// Handle auth errors gracefully
await AuthRecovery.handleAuthError(error, 'context-name');
```

**New Files Added for Auth Recovery:**
- `src/lib/auth/authRecovery.ts` - Auth recovery utility class
- `src/app/auth-recovery/page.tsx` - User-facing recovery page
- Enhanced error handling in `useAuth.ts` and `auth.ts`

## Future Enhancements

### Potential Improvements
1. **Multiple Session Durations:** Support 30, 60, 90-minute sessions
2. **Recurring Bookings:** Allow clients to book weekly recurring sessions
3. **Waitlist System:** Allow booking when slots become available
4. **Email Notifications:** Send booking confirmations and reminders
5. **Calendar Integration:** Export to Google Calendar, Outlook
6. **Payment Integration:** Handle payments during booking
7. **Cancellation Policies:** Implement cancellation rules and fees

### Advanced Features
1. **Resource Management:** Book specific training rooms or equipment
2. **Group Sessions:** Allow multiple dogs in one session
3. **Trainer Preferences:** Match dogs with suitable trainers
4. **Analytics Dashboard:** Booking trends and trainer utilization
5. **Mobile App:** Native mobile booking experience

## Conclusion

This booking system provides a solid foundation for professional appointment scheduling with robust conflict prevention and an excellent user experience. The system is designed to be safe, scalable, and user-friendly while maintaining data integrity and preventing double bookings.

The implementation follows best practices for database design, API development, and user interface design, ensuring a reliable and maintainable solution for the Just Dogs application.