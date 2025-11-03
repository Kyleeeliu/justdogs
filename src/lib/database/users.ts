import { User } from '@/types';

const DB_KEY = 'just_dogs_users_db';

interface UserDB {
  users: User[];
  nextId: number;
}

// Initialize the database in localStorage
const initializeDB = (): UserDB => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Return default data for server-side rendering
    return {
      users: [
        {
          id: '1',
          email: 'admin@justdogs.co.za',
          full_name: 'Admin User',
          role: 'admin',
          phone: '+27 82 123 4567',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'trainer@justdogs.co.za',
          full_name: 'Trainer User',
          role: 'trainer',
          phone: '+27 83 987 6543',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          email: 'parent@justdogs.co.za',
          full_name: 'Parent User',
          role: 'parent',
          phone: '+27 84 555 1234',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          email: 'behaviorist@justdogs.co.za',
          full_name: 'Behaviorist User',
          role: 'behaviorist',
          phone: '+27 85 777 8888',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      nextId: 5,
    };
  }
  
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Initialize with default users
  const initialData: UserDB = {
    users: [
      {
        id: '1',
        email: 'admin@justdogs.co.za',
        full_name: 'Admin User',
        role: 'admin',
        phone: '+27 82 123 4567',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'trainer@justdogs.co.za',
        full_name: 'Trainer User',
        role: 'trainer',
        phone: '+27 83 987 6543',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        email: 'parent@justdogs.co.za',
        full_name: 'Parent User',
        role: 'parent',
        phone: '+27 84 555 1234',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        email: 'behaviorist@justdogs.co.za',
        full_name: 'Behaviorist User',
        role: 'behaviorist',
        phone: '+27 85 777 8888',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    nextId: 5,
  };
  localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  return initialData;
};

let db = initializeDB();

const saveDB = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
};

export const createUser = (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): User => {
  const newUser: User = {
    id: (db.nextId++).toString(),
    ...userData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.users.push(newUser);
  saveDB();
  return newUser;
};

export const getAllUsers = (): User[] => {
  console.log('getAllUsers called, db.users:', db.users);
  console.log('Database state:', db);
  return db.users;
};

export const getUserById = (id: string): User | undefined => {
  return db.users.find(user => user.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return db.users.find(user => user.email === email);
};

export const updateUser = (id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): User | undefined => {
  const userIndex = db.users.findIndex(user => user.id === id);
  if (userIndex > -1) {
    db.users[userIndex] = {
      ...db.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDB();
    return db.users[userIndex];
  }
  return undefined;
};

export const deleteUser = (id: string): boolean => {
  const initialLength = db.users.length;
  db.users = db.users.filter(user => user.id !== id);
  if (db.users.length < initialLength) {
    saveDB();
    return true;
  }
  return false;
};

export const searchUsers = (searchTerm: string, role?: string): User[] => {
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  let filteredUsers = db.users;

  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }

  return filteredUsers.filter(user =>
    user.full_name.toLowerCase().includes(lowerCaseSearchTerm) ||
    user.email.toLowerCase().includes(lowerCaseSearchTerm)
  );
};

export const getUsersByRole = (role: string): User[] => {
  return db.users.filter(user => user.role === role);
};

// For development/testing: reset the database
export const resetDB = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DB_KEY);
  }
  db = initializeDB();
};

// Ensure database is properly initialized
export const ensureDBInitialized = () => {
  if (typeof window !== 'undefined' && db.users.length === 0) {
    console.log('Database appears empty, reinitializing...');
    db = initializeDB();
  }
};

// Sync with auth system - add user if they don't exist
export const syncUserWithAuth = (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): User => {
  const existingUser = getUserByEmail(userData.email);
  if (existingUser) {
    return existingUser;
  }
  return createUser(userData);
};
