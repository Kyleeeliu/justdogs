# Bookings Capability

## ADDED Requirements

### Requirement: Parent Booking Creation
Parents SHALL be able to create new bookings for their dogs through a simple, visible interface on the bookings page.

#### Scenario: Parent accesses booking creation
- **WHEN** a parent navigates to the bookings page
- **THEN** a prominent "New Booking" button is visible in the top-right of the page header
- **AND** the button uses the brand color (rgb(0, 32, 96)) for high visibility
- **AND** the button includes a plus icon for clarity

#### Scenario: Parent opens booking modal
- **WHEN** a parent clicks the "New Booking" button
- **THEN** a modal opens with a booking creation form
- **AND** the form displays a dropdown of the parent's dogs
- **AND** the form displays a dropdown of available trainers
- **AND** the form includes fields for booking type, date/time, location, and special instructions

#### Scenario: Parent creates booking successfully
- **WHEN** a parent fills out all required fields (dog, trainer, booking type, start time, end time)
- **AND** submits the form
- **THEN** the booking is created with "pending" status
- **AND** the modal closes
- **AND** the new booking appears in the bookings list
- **AND** a success state is shown

#### Scenario: Booking validation prevents invalid submissions
- **WHEN** a parent submits a booking with missing required fields
- **THEN** validation errors are displayed for each missing field
- **AND** the booking is not created

#### Scenario: Date validation prevents past bookings
- **WHEN** a parent selects a start time in the past
- **THEN** a validation error is displayed
- **AND** the booking is not created

#### Scenario: End time validation
- **WHEN** a parent selects an end time that is before or equal to the start time
- **THEN** a validation error is displayed
- **AND** the booking is not created

#### Scenario: Parent with no dogs sees helpful message
- **WHEN** a parent opens the booking modal
- **AND** the parent has no dogs registered
- **THEN** a message is displayed indicating they need to add a dog first
- **AND** the dog dropdown is disabled or shows no options

#### Scenario: Empty state encourages booking creation
- **WHEN** a parent has no bookings
- **AND** views the bookings page
- **THEN** an empty state is displayed
- **AND** the empty state includes a "Create Your First Booking" button
- **AND** clicking the button opens the booking creation modal

### Requirement: Booking Form Fields
The booking creation form SHALL include all necessary fields for creating a complete booking request.

#### Scenario: Required fields are present
- **WHEN** the booking modal opens
- **THEN** the form includes: dog selection (required), trainer selection (required), booking type (required), start time (required), end time (required)
- **AND** all required fields are clearly marked

#### Scenario: Conditional fields appear based on booking type
- **WHEN** a parent selects "dog_training" or "private_training" as booking type
- **THEN** a "Training Level" dropdown appears (beginner, intermediate, advanced, expert)
- **WHEN** a parent selects "consult" as booking type
- **THEN** a "Consultation Type" dropdown appears (behavioral, training, general)

#### Scenario: Optional fields are available
- **WHEN** the booking modal opens
- **THEN** the form includes optional fields: location (defaults to "Just Dogs Training Center"), special instructions (textarea)

### Requirement: Booking API Endpoint
The system SHALL provide an API endpoint to create bookings with proper validation and security.

#### Scenario: API creates booking with valid data
- **WHEN** a POST request is made to `/api/bookings` with valid booking data
- **THEN** the booking is created in the database
- **AND** the booking status is set to "pending"
- **AND** the booking is associated with the correct dog, trainer, and parent
- **AND** a success response is returned with the created booking

#### Scenario: API validates dog ownership
- **WHEN** a POST request includes a dog_id that doesn't belong to the specified parent_id
- **THEN** a 403 Forbidden error is returned
- **AND** the booking is not created

#### Scenario: API validates required fields
- **WHEN** a POST request is missing required fields (dog_id, trainer_id, parent_id, booking_type, start_time, end_time)
- **THEN** a 400 Bad Request error is returned
- **AND** an error message indicates which fields are missing

#### Scenario: API validates date constraints
- **WHEN** a POST request has an end_time before or equal to start_time
- **THEN** a 400 Bad Request error is returned
- **AND** an error message indicates the date issue
- **WHEN** a POST request has a start_time in the past
- **THEN** a 400 Bad Request error is returned
- **AND** an error message indicates the date issue

### Requirement: Button Visibility
The "New Booking" button SHALL be highly visible and easy to find for parents.

#### Scenario: Button is prominently displayed
- **WHEN** a parent views the bookings page
- **THEN** the "New Booking" button is located in the top-right of the page header
- **AND** the button uses high-contrast styling (brand color background, white text)
- **AND** the button includes a plus icon for visual recognition
- **AND** the button is large enough to be easily clickable

#### Scenario: Button appears for correct roles only
- **WHEN** a user with role "parent" views the bookings page
- **THEN** the "New Booking" button is visible
- **WHEN** a user with role "admin" views the bookings page
- **THEN** the "New Booking" button is visible
- **WHEN** a user with role "trainer" views the bookings page
- **THEN** the "New Booking" button is not visible

#### Scenario: Button appears after user loads
- **WHEN** the bookings page is loading
- **THEN** the "New Booking" button is not shown (to prevent flicker)
- **WHEN** the user data has loaded
- **AND** the user has the appropriate role
- **THEN** the "New Booking" button becomes visible
