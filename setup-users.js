// Supabase Test User Creation Script
// Run this script locally using: node setup-users.js
// Prerequisites:
// 1. Install supabase-js: npm install @supabase/supabase-js
// 2. Create a .env.local file in your project root with your keys.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Used to load .env.local variables

// --- CONFIGURATION ---
// Load environment variables (ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("FATAL: Missing Supabase URL or ANON Key.");
    console.log("Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.");
    process.exit(1);
}

// NOTE: We use the anon key for sign-up, but we need a Service Role client to bypass RLS and insert into the 'users' table.
// This key is HIGHLY sensitive. DO NOT check it into source control.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error("FATAL: Missing Supabase SERVICE ROLE Key.");
    console.log("To insert user profiles directly, this script requires SUPABASE_SERVICE_ROLE_KEY in your .env.local file.");
    console.log("Find it in Supabase Dashboard -> Project Settings -> API.");
    process.exit(1);
}

const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    }
});

const testUsers = [
    { email: 'admin@justdogs.co.za', password: 'password123', name: 'Admin User', role: 'admin', phone: '+27 82 123 4567', approval_status: 'approved' },
    { email: 'trainer@justdogs.co.za', password: 'password123', name: 'Trainer Chris', role: 'trainer', phone: '+27 82 987 6543', approval_status: 'approved' },
    { email: 'parent@justdogs.co.za', password: 'password123', name: 'Parent Jane', role: 'parent', phone: '+27 82 111 2222', approval_status: 'approved' },
    { email: 'behaviorist@justdogs.co.za', password: 'password123', name: 'Behaviorist Dave', role: 'behaviorist', phone: '+27 82 333 4444', approval_status: 'approved' },
    { email: 'pending@justdogs.co.za', password: 'password123', name: 'Pending User', role: 'parent', phone: '+27 82 555 6666', approval_status: 'pending' },
];

async function createTestUsers() {
    console.log("Starting test user setup...");

    for (const user of testUsers) {
        console.log(`\nProcessing user: ${user.email} (Role: ${user.role})`);
        
        let authUserId = null;

        // 1. Attempt to create the user in Supabase Auth
        const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true, // We want to force it to bypass email confirmation
        });

        if (authError) {
            // Error code 422 is typically "User already registered"
            if (authError.status === 422) {
                console.log(`  Auth user already exists. Attempting to fetch ID...`);
                // If user exists, we need to fetch their ID
                const { data: userData, error: userFetchError } = await supabaseServiceRole
                    .from('users')
                    .select('id')
                    .eq('email', user.email)
                    .single();
                
                if (userFetchError && userFetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
                     // The user might exist in auth but not in the 'users' table, so we use the admin API to get their ID
                     const { data: userAdminData } = await supabaseServiceRole.auth.admin.getUserByEmail(user.email);
                     if (userAdminData?.user?.id) {
                         authUserId = userAdminData.user.id;
                         console.log(`  Fetched existing Auth ID: ${authUserId}`);
                     } else {
                         console.error(`  Failed to fetch existing Auth ID:`, userFetchError);
                         continue;
                     }
                } else if (userData?.id) {
                    authUserId = userData.id;
                    console.log(`  Fetched existing user ID from 'users' table.`);
                }
            } else {
                console.error(`  Failed to create Auth user:`, authError.message);
                continue;
            }
        } else if (authData.user) {
            authUserId = authData.user.id;
            console.log(`  Auth user created successfully. ID: ${authUserId}`);
        }

        if (!authUserId) {
            console.error(`  Could not determine Auth User ID for ${user.email}. Skipping profile creation.`);
            continue;
        }

        // 2. Create or update the user profile in the 'users' table
        const profileData = {
            id: authUserId,
            email: user.email,
            full_name: user.name,
            role: user.role,
            phone: user.phone,
            approval_status: user.approval_status
        };

        const { error: profileError } = await supabaseServiceRole
            .from('users')
            .upsert(profileData, { onConflict: 'id', ignoreDuplicates: false });

        if (profileError) {
            console.error(`  Failed to create/update profile for ${user.email}:`, profileError.message);
        } else {
            console.log(`  Profile created/updated successfully in 'users' table.`);
        }
    }

    console.log("\nSetup complete. You can now test your login credentials.");
}

// Need to install the 'dotenv' package to load .env files
// Ensure you run: npm install dotenv
createTestUsers();