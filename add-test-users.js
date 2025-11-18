const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://placeholder.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-anon-key'; // Replace with your actual key

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestUsers() {
  const testUsers = [
    {
      id: 'trainer-1',
      email: 'trainer1@justdogs.co.za',
      full_name: 'Sarah Johnson',
      role: 'trainer',
      phone: '+27 82 123 4567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'trainer-2', 
      email: 'trainer2@justdogs.co.za',
      full_name: 'Mike Wilson',
      role: 'trainer',
      phone: '+27 83 234 5678',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'parent-1',
      email: 'parent1@example.com',
      full_name: 'Emma Davis',
      role: 'parent',
      phone: '+27 84 345 6789',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'parent-2',
      email: 'parent2@example.com', 
      full_name: 'John Smith',
      role: 'parent',
      phone: '+27 85 456 7890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'behaviorist-1',
      email: 'behaviorist1@justdogs.co.za',
      full_name: 'Dr. Lisa Brown',
      role: 'behaviorist',
      phone: '+27 86 567 8901',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  try {
    console.log('Adding test users to database...');
    
    for (const user of testUsers) {
      const { data, error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' });
        
      if (error) {
        console.error(`Error adding user ${user.full_name}:`, error);
      } else {
        console.log(`✅ Added user: ${user.full_name} (${user.role})`);
      }
    }
    
    console.log('\n✅ All test users added successfully!');
    
  } catch (error) {
    console.error('Error adding test users:', error);
  }
}

// Since Supabase might not be configured, let's also add them to local storage
function addTestUsersToLocalStorage() {
  const testUsers = [
    {
      id: 'trainer-1',
      email: 'trainer1@justdogs.co.za',
      full_name: 'Sarah Johnson',
      role: 'trainer',
      phone: '+27 82 123 4567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'trainer-2', 
      email: 'trainer2@justdogs.co.za',
      full_name: 'Mike Wilson',
      role: 'trainer',
      phone: '+27 83 234 5678',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'parent-1',
      email: 'parent1@example.com',
      full_name: 'Emma Davis',
      role: 'parent',
      phone: '+27 84 345 6789',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'parent-2',
      email: 'parent2@example.com', 
      full_name: 'John Smith',
      role: 'parent',
      phone: '+27 85 456 7890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'behaviorist-1',
      email: 'behaviorist1@justdogs.co.za',
      full_name: 'Dr. Lisa Brown',
      role: 'behaviorist',
      phone: '+27 86 567 8901',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Add to local storage for testing
  if (typeof window !== 'undefined') {
    const existingUsers = JSON.parse(localStorage.getItem('just_dogs_users_db') || '{"users": [], "nextId": 1}');
    existingUsers.users = [...existingUsers.users, ...testUsers];
    localStorage.setItem('just_dogs_users_db', JSON.stringify(existingUsers));
    console.log('✅ Test users added to local storage');
  }
}

// Run the function
if (typeof window === 'undefined') {
  // Node.js environment
  addTestUsers();
} else {
  // Browser environment
  addTestUsersToLocalStorage();
}

module.exports = { addTestUsers, addTestUsersToLocalStorage };