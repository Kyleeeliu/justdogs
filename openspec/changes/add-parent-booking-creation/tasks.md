## 1. Implementation

### 1.1 Create Booking Modal Component
- [x] Create `CreateBookingModal.tsx` component with form fields
- [x] Add dog selection dropdown (parent's dogs only)
- [x] Add trainer selection dropdown (all available trainers)
- [x] Add booking type selection (dog_training, private_training, consult, dog_sitting, pet_care)
- [x] Add conditional fields (training_level for training types, consult_type for consultations)
- [x] Add date/time pickers for start and end times
- [x] Add location and special instructions fields
- [x] Implement form validation (required fields, date validation)
- [x] Add loading states and error handling

### 1.2 Create Bookings API Route
- [x] Create `/api/bookings` POST endpoint
- [x] Validate required fields (dog_id, trainer_id, parent_id, booking_type, start_time, end_time)
- [x] Validate dates (end after start, no past dates)
- [x] Verify dog ownership (security check)
- [x] Use service role key to bypass RLS for booking creation
- [x] Transform database schema to Booking interface format
- [x] Return created booking with proper status

### 1.3 Update Bookings Page
- [x] Add "New Booking" button in header (top-right, prominent styling)
- [x] Add state management for modal visibility
- [x] Fetch parent's dogs when modal opens
- [x] Fetch available trainers when modal opens
- [x] Integrate CreateBookingModal component
- [x] Handle booking creation and refresh list
- [x] Add empty state with "Create Your First Booking" button
- [x] Ensure button is visible for parents and admins only
- [x] Add proper loading states

### 1.4 Button Visibility & UX
- [x] Position button prominently in page header (top-right)
- [x] Use high-contrast styling (brand color background)
- [x] Add icon (PlusIcon) for visual clarity
- [x] Show button only when user is loaded and has parent/admin role
- [x] Add empty state call-to-action for better discoverability
- [x] Remove debug text before production

## 2. Validation
- [x] Test booking creation flow end-to-end
- [x] Verify form validation works correctly
- [x] Test error handling (missing fields, invalid dates)
- [x] Verify button visibility for different user roles
- [x] Test with parent who has no dogs (should show helpful message)
- [x] Verify bookings appear in list after creation
