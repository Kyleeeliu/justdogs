// Simple test script to verify authentication flow
// Run this in the browser console on localhost:3000

console.log('Testing authentication flow...');

// Test 1: Clear any existing data
localStorage.clear();
console.log('Cleared localStorage');

// Test 2: Simulate registration
const testUser = {
  id: Date.now().toString(),
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'parent',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Simulate what signUp does
localStorage.setItem('newUser_test@example.com', JSON.stringify(testUser));
localStorage.setItem('userPassword_test@example.com', 'testpassword');
console.log('Simulated registration for:', testUser.email);

// Test 3: Simulate sign in
const newUserStr = localStorage.getItem('newUser_test@example.com');
if (newUserStr) {
  const newUser = JSON.parse(newUserStr);
  localStorage.setItem('mockUser', JSON.stringify(newUser));
  localStorage.removeItem('newUser_test@example.com');
  console.log('Simulated sign in successful');
  console.log('mockUser set:', localStorage.getItem('mockUser'));
} else {
  console.log('No new user found');
}

// Test 4: Simulate getCurrentUser
const mockUserStr = localStorage.getItem('mockUser');
if (mockUserStr) {
  const user = JSON.parse(mockUserStr);
  console.log('getCurrentUser would return:', user);
} else {
  console.log('No mock user found');
}

console.log('Test completed. Check the results above.');
