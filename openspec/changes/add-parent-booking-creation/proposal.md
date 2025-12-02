## Why
Parents need a simple, self-service way to book training sessions for their dogs with trainers. Currently, bookings may require admin intervention or lack a clear, visible interface for parents to initiate bookings. This feature enables parents to independently create bookings, improving user experience and reducing administrative overhead.

## What Changes
- Add prominent "New Booking" button on bookings page for parents and admins
- Create booking creation modal with intuitive form for selecting dog, trainer, booking type, date/time, and special instructions
- Implement API route to handle booking creation with validation
- Fetch and display parent's dogs and available trainers in booking form
- Ensure button is highly visible and easy to find (top-right of bookings page, prominent styling)
- Add empty state with call-to-action button when no bookings exist

**BREAKING**: None

## Impact
- Affected specs: `bookings` capability (new)
- Affected code: 
  - `src/app/(dashboard)/bookings/page.tsx` - Add button and modal integration
  - `src/components/CreateBookingModal.tsx` - New component
  - `src/app/api/bookings/route.ts` - New API endpoint
  - `src/lib/database/dogs.ts` - Used for fetching parent's dogs
  - `src/lib/supabase/users.ts` - Used for fetching trainers
- User-facing: Parents can now create bookings independently
- Database: Uses existing `bookings` table schema
