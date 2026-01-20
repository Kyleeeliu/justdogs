## ADDED Requirements

### Requirement: News Item Attachments
The system SHALL support attaching PDF and JPEG files to news and events items. Each news item MAY have zero or more attachments. Attachments SHALL be stored in Supabase Storage with metadata stored in the database.

#### Scenario: Admin uploads PDF attachment
- **WHEN** an admin creates or edits a news item
- **AND** uploads a PDF file (max 10MB)
- **THEN** the file is uploaded to Supabase Storage
- **AND** attachment metadata (filename, type, URL, size) is saved to the news item
- **AND** the attachment is associated with the news item

#### Scenario: Admin uploads JPEG attachment
- **WHEN** an admin creates or edits a news item
- **AND** uploads a JPEG file (max 10MB)
- **THEN** the file is uploaded to Supabase Storage
- **AND** attachment metadata (filename, type, URL, size) is saved to the news item
- **AND** the attachment is associated with the news item

#### Scenario: Admin removes attachment
- **WHEN** an admin edits a news item with attachments
- **AND** removes an attachment
- **THEN** the file is deleted from Supabase Storage
- **AND** the attachment metadata is removed from the news item

#### Scenario: File size limit enforcement
- **WHEN** an admin attempts to upload a file larger than 10MB
- **THEN** an error message is displayed
- **AND** the upload is rejected

#### Scenario: Invalid file type rejection
- **WHEN** an admin attempts to upload a file that is not PDF or JPEG
- **THEN** an error message is displayed
- **AND** the upload is rejected

### Requirement: Expandable News Items
The public news page SHALL display news items in a collapsed state by default. Users SHALL be able to expand individual items to view full content and attachments.

#### Scenario: User expands news item
- **WHEN** a user views the news page
- **AND** clicks on a news item or expand button
- **THEN** the item expands to show full content
- **AND** any attachments are displayed
- **AND** the expansion animation is smooth

#### Scenario: User collapses news item
- **WHEN** a user views an expanded news item
- **AND** clicks to collapse
- **THEN** the item collapses to show only summary/preview
- **AND** the collapse animation is smooth

#### Scenario: Multiple items expanded state
- **WHEN** a user expands one news item
- **AND** expands another item
- **THEN** both items remain expanded
- **AND** users can collapse them independently

### Requirement: Attachment Display
The public news page SHALL display attachments for expanded news items. JPEG images SHALL be displayed as thumbnails or full images. PDF files SHALL be displayed as download links.

#### Scenario: JPEG image display
- **WHEN** a user expands a news item with JPEG attachments
- **THEN** the images are displayed as thumbnails or preview images
- **AND** users can click to view full size (if applicable)

#### Scenario: PDF file display
- **WHEN** a user expands a news item with PDF attachments
- **THEN** PDF files are displayed as download links with filename
- **AND** clicking the link downloads the PDF

#### Scenario: Multiple attachments display
- **WHEN** a news item has multiple attachments
- **THEN** all attachments are displayed in the expanded view
- **AND** attachments are clearly labeled by type (PDF/JPEG)

### Requirement: Attachment Storage Access
Published news items SHALL have publicly accessible attachments. Unpublished items SHALL restrict attachment access to admins only.

#### Scenario: Public access to published item attachments
- **WHEN** a news item is published
- **AND** has attachments
- **THEN** the attachments are accessible via public URLs
- **AND** anyone can view/download the attachments

#### Scenario: Restricted access to unpublished item attachments
- **WHEN** a news item is unpublished
- **AND** has attachments
- **THEN** the attachments are only accessible to admins
- **AND** public users cannot access the attachments
