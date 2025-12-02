# RLS Policy Fix Guide - User Profile Creation

## Problem

When users try to sign up, they get this error:
```
Error: new row violates row-level security policy for table "users"
```

This happens because Row Level Security (RLS) policies prevent users from inserting their own profile into the `users` table during signup.

## Solution

I've implemented two solutions:

### Solution 1: API Route (Recommended - Already Implemented)

The signup flow now uses a server-side API route (`/api/auth/create-profile`) that uses the Supabase service role key to bypass RLS. This is the most reliable approach.

**What was changed:**
- ✅ Created `/src/app/api/auth/create-profile/route.ts` - API route that creates user profiles
- ✅ Updated `src/lib/auth/auth.ts` - Signup now calls the API route instead of direct database insert

**Requirements:**
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local` file
- The service role key can be found in: Supabase Dashboard → Project Settings → API → Service Role Key

### Solution 2: Database Trigger (Backup - Optional)

As a backup, you can also create a database trigger that automatically creates user profiles when auth users are created.

**To apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase-migration-user-profile-trigger.sql`
3. This creates a trigger that automatically creates user profiles when auth users are created

## Setup Instructions

### Step 1: Add Service Role Key to Environment

Add this to your `.env.local` file:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ IMPORTANT:** Never commit the service role key to git! It has full database access.

### Step 2: Verify RLS Policies

Make sure you've run the RLS fix migration:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase-rls-fix.sql`

This ensures the RLS policies are correctly configured.

### Step 3: (Optional) Add Database Trigger

If you want the trigger as a backup:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase-migration-user-profile-trigger.sql`

### Step 4: Test Signup

Try creating a new user account. The signup should now work without RLS errors.

## How It Works

### Before (Direct Insert - Failed)
```
Client → Supabase Client → INSERT into users table → ❌ RLS blocks it
```

### After (API Route - Works)
```
Client → API Route → Supabase Admin Client (Service Role) → INSERT into users table → ✅ Bypasses RLS
```

The API route uses the service role key, which has elevated privileges and can bypass RLS policies.

## Troubleshooting

### "Server configuration error"
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart your Next.js dev server after adding the key

### "Failed to create user profile"
- Check the server logs for detailed error messages
- Verify the `users` table structure matches the migration
- Check that RLS policies are correctly set up

### User profile still not created
- Check if the database trigger is working (if you enabled it)
- Verify the API route is being called (check browser network tab)
- Check server logs for errors

## Security Notes

- The service role key has full database access - keep it secret!
- The API route validates input before creating users
- The route only creates profiles for users that exist in Supabase Auth
- RLS policies still protect the table for normal operations

## Files Modified

- ✅ `src/app/api/auth/create-profile/route.ts` - New API route
- ✅ `src/lib/auth/auth.ts` - Updated to use API route
- ✅ `supabase-migration-user-profile-trigger.sql` - Optional trigger migration
