# Authentication Setup Guide

## Current Status

✅ **Fixed Issues:**
- Supabase client configuration conflicts resolved
- Proper TypeScript types generated from database schema
- Authentication flow properly configured
- Login page loads correctly

## Authentication System Overview

The authentication system is now properly configured with:

1. **Supabase Auth Integration**: Uses Supabase Auth for user authentication
2. **Role-Based Access**: Supports admin, trainer, parent, and behaviorist roles
3. **Database Integration**: User profiles stored in custom `users` table
4. **Session Management**: Automatic session handling and refresh

## Setup Instructions

### 1. Database Setup

First, run the database migration to create the required tables:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase-migration.sql (already provided)
```

### 2. Add Missing Column

Run the additional migration to add the approval_status column:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase-migration-update.sql (already provided)
```

### 3. Fix RLS Policies (CRITICAL)

**⚠️ IMPORTANT:** Run this RLS policy fix to resolve authentication issues:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase-rls-fix.sql (already provided)
```

This step fixes the Row Level Security policies that were blocking user authentication. Without this, you'll get "Error fetching user by email (Likely RLS issue)" errors.

### 4. Create Test Users

You have two options to create test users:

#### Option A: Use the Setup Script (Recommended)
```bash
node setup-users.js
```

#### Option B: Manual Creation via Supabase Dashboard
1. Go to your Supabase Dashboard → Authentication → Users
2. Create users manually with these credentials:
   - admin@justdogs.co.za / password123
   - trainer@justdogs.co.za / password123  
   - parent@justdogs.co.za / password123
   - behaviorist@justdogs.co.za / password123

3. After creating auth users, add their profiles to the users table via SQL:
```sql
INSERT INTO users (id, email, full_name, role, phone, approval_status) VALUES
  ('auth-user-id-here', 'admin@justdogs.co.za', 'Admin User', 'admin', '+27 82 123 4567', 'approved'),
  -- Repeat for other users with their actual auth user IDs
```

### 4. Test Login

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Try logging in with any of the test credentials above

## Troubleshooting

### "Invalid login credentials" Error

This usually means:
1. The user doesn't exist in Supabase Auth
2. The password is incorrect
3. The user exists but email confirmation is required

**Solutions:**
1. Check Supabase Dashboard → Authentication → Users to verify user exists
2. If using the setup script, check for any error messages
3. Try creating users manually via Supabase Dashboard
4. Ensure email confirmation is disabled for test users

### "Error fetching user by email (Likely RLS issue)" Error

This is the most common issue and means RLS policies are blocking user data access.

**Solutions:**
1. **Run the RLS fix migration** (Step 3 above) - this is critical
2. Verify the fix was applied in Supabase Dashboard → Database → Policies
3. Check that the "Allow public read access for authentication" policy exists

### "Database error" when creating users

This usually means:
1. RLS (Row Level Security) policies are blocking the operation
2. The users table doesn't exist
3. Missing required columns

**Solutions:**
1. Run the database migrations first
2. Run the RLS fix migration (Step 3)
3. Verify the users table structure matches the migration

### User logs in but gets redirected back to login

This means:
1. The user exists in Auth but not in the users table
2. RLS policies are preventing user profile retrieval

**Solutions:**
1. Run the RLS fix migration (Step 3) - this is the most likely cause
2. Ensure user profiles are created in the users table
3. Check RLS policies allow users to read their own profiles

## Current Authentication Flow

1. User enters credentials on login page
2. Supabase Auth validates credentials
3. If successful, app fetches user profile from users table
4. User is redirected to dashboard based on their role
5. Session is maintained automatically

## Next Steps

1. Run the database migrations
2. Create test users using one of the methods above
3. Test login functionality
4. If issues persist, check Supabase Dashboard for error details

## Files Modified

- ✅ `src/types/supabase.d.ts` - Updated with proper database types
- ✅ `src/lib/supabase/client-browser.ts` - Fixed client configuration
- ✅ `src/lib/supabase/client.ts` - Unified client configuration
- ✅ `src/lib/supabase/users.ts` - Fixed server/client usage
- ✅ `src/lib/auth/auth.ts` - Fixed authentication flow
- ✅ `src/hooks/useAuth.ts` - Fixed client imports
- ✅ `setup-users.js` - Script to create test users
- ✅ `supabase-migration-update.sql` - Additional database changes
- ✅ `supabase-rls-fix.sql` - **CRITICAL** RLS policy fixes for authentication

The authentication system should now work correctly for all user roles (admin, trainer, parent, behaviorist) after running the RLS fix.