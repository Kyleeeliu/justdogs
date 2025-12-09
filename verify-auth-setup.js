// Diagnostic script to verify Supabase authentication setup
// Run this with: node verify-auth-setup.js

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying Supabase Authentication Setup...\n');

// Check environment variables
console.log('1. Checking environment variables...');
if (!SUPABASE_URL) {
    console.error('   ❌ NEXT_PUBLIC_SUPABASE_URL is missing');
    process.exit(1);
} else {
    console.log('   ✅ NEXT_PUBLIC_SUPABASE_URL is set');
    console.log(`      URL: ${SUPABASE_URL.substring(0, 30)}...`);
}

if (!SUPABASE_ANON_KEY) {
    console.error('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    process.exit(1);
} else {
    console.log('   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
    console.log(`      Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
}

if (!SUPABASE_SERVICE_KEY) {
    console.warn('   ⚠️  SUPABASE_SERVICE_ROLE_KEY is missing (needed for user management)');
} else {
    console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY is set');
}

// Test connection with anon key
console.log('\n2. Testing Supabase connection...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
    // Try a simple query to test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
        console.error('   ❌ Connection test failed:', error.message);
        console.error('      This might indicate RLS policies are blocking access');
    } else {
        console.log('   ✅ Successfully connected to Supabase');
    }
} catch (err) {
    console.error('   ❌ Connection error:', err.message);
}

// Check for users if service key is available
if (SUPABASE_SERVICE_KEY) {
    console.log('\n3. Checking existing users...');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });

    try {
        // List auth users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
            console.error('   ❌ Error fetching auth users:', authError.message);
        } else {
            console.log(`   ✅ Found ${authUsers.users.length} user(s) in Supabase Auth:`);
            authUsers.users.forEach((user, index) => {
                console.log(`      ${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
                console.log(`         - Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
                console.log(`         - Created: ${user.created_at}`);
            });
        }

        // List users in users table
        const { data: profileUsers, error: profileError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, role, approval_status');

        if (profileError) {
            console.error('   ❌ Error fetching user profiles:', profileError.message);
        } else {
            console.log(`\n   ✅ Found ${profileUsers.length} user profile(s) in users table:`);
            profileUsers.forEach((user, index) => {
                console.log(`      ${index + 1}. ${user.email} (${user.full_name})`);
                console.log(`         - Role: ${user.role}`);
                console.log(`         - Approval: ${user.approval_status}`);
            });
        }

        // Check for mismatches
        if (authUsers && profileUsers) {
            const authEmails = new Set(authUsers.users.map(u => u.email));
            const profileEmails = new Set(profileUsers.map(u => u.email));
            
            const missingProfiles = authUsers.users.filter(u => !profileEmails.has(u.email));
            const orphanedProfiles = profileUsers.filter(u => !authEmails.has(u.email));
            
            if (missingProfiles.length > 0) {
                console.log('\n   ⚠️  Warning: Users in Auth but missing profiles:');
                missingProfiles.forEach(u => {
                    console.log(`      - ${u.email}`);
                });
            }
            
            if (orphanedProfiles.length > 0) {
                console.log('\n   ⚠️  Warning: Profiles without Auth users:');
                orphanedProfiles.forEach(u => {
                    console.log(`      - ${u.email}`);
                });
            }
        }

    } catch (err) {
        console.error('   ❌ Error checking users:', err.message);
    }
} else {
    console.log('\n3. Skipping user check (service key not available)');
}

// Test credentials
console.log('\n4. Testing login credentials...');
const testCredentials = [
    { email: 'admin@justdogs.co.za', password: 'password123' },
    { email: 'trainer@justdogs.co.za', password: 'password123' },
    { email: 'parent@justdogs.co.za', password: 'password123' },
];

for (const cred of testCredentials) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cred.email,
            password: cred.password,
        });

        if (error) {
            console.log(`   ❌ ${cred.email}: ${error.message}`);
        } else {
            console.log(`   ✅ ${cred.email}: Login successful`);
            // Sign out after test
            await supabase.auth.signOut();
        }
    } catch (err) {
        console.log(`   ❌ ${cred.email}: ${err.message}`);
    }
}

console.log('\n✅ Diagnostic complete!');
console.log('\n💡 Tips:');
console.log('   - If users don\'t exist, run: node setup-users.js');
console.log('   - If "Invalid login credentials" persists, verify the user exists in Supabase Dashboard');
console.log('   - Check Supabase Dashboard → Authentication → Users to see all users');
console.log('   - Ensure email confirmation is disabled for test users or confirm emails manually');
