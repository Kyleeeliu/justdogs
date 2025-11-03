import { Dog } from '@/types';

const DOGS_STORAGE_KEY = 'just_dogs_database';

// Database interface for dogs
interface DogsDatabase {
  dogs: Dog[];
  lastId: number;
}

// Initialize database if it doesn't exist
const initializeDatabase = (): DogsDatabase => {
  const existing = localStorage.getItem(DOGS_STORAGE_KEY);
  if (existing) {
    return JSON.parse(existing);
  }
  
  const newDb: DogsDatabase = {
    dogs: [],
    lastId: 0
  };
  
  localStorage.setItem(DOGS_STORAGE_KEY, JSON.stringify(newDb));
  return newDb;
};

// Get all dogs
export const getAllDogs = (): Dog[] => {
  const db = initializeDatabase();
  return db.dogs;
};

// Get dogs by owner ID
export const getDogsByOwner = (ownerId: string): Dog[] => {
  const db = initializeDatabase();
  return db.dogs.filter(dog => dog.owner_id === ownerId);
};

// Get dog by ID
export const getDogById = (id: string): Dog | null => {
  const db = initializeDatabase();
  return db.dogs.find(dog => dog.id === id) || null;
};

// Create a new dog
export const createDog = (dogData: Omit<Dog, 'id' | 'created_at' | 'updated_at'>): Dog => {
  const db = initializeDatabase();
  
  const newDog: Dog = {
    ...dogData,
    id: (db.lastId + 1).toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  db.dogs.push(newDog);
  db.lastId += 1;
  
  localStorage.setItem(DOGS_STORAGE_KEY, JSON.stringify(db));
  
  return newDog;
};

// Update an existing dog
export const updateDog = (id: string, updates: Partial<Omit<Dog, 'id' | 'created_at' | 'updated_at'>>): Dog | null => {
  const db = initializeDatabase();
  const dogIndex = db.dogs.findIndex(dog => dog.id === id);
  
  if (dogIndex === -1) {
    return null;
  }
  
  const updatedDog: Dog = {
    ...db.dogs[dogIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  db.dogs[dogIndex] = updatedDog;
  localStorage.setItem(DOGS_STORAGE_KEY, JSON.stringify(db));
  
  return updatedDog;
};

// Delete a dog
export const deleteDog = (id: string): boolean => {
  const db = initializeDatabase();
  const dogIndex = db.dogs.findIndex(dog => dog.id === id);
  
  if (dogIndex === -1) {
    return false;
  }
  
  db.dogs.splice(dogIndex, 1);
  localStorage.setItem(DOGS_STORAGE_KEY, JSON.stringify(db));
  
  return true;
};

// Search dogs by name or breed
export const searchDogs = (query: string, ownerId?: string): Dog[] => {
  const db = initializeDatabase();
  let dogs = db.dogs;
  
  if (ownerId) {
    dogs = dogs.filter(dog => dog.owner_id === ownerId);
  }
  
  if (!query.trim()) {
    return dogs;
  }
  
  const searchTerm = query.toLowerCase();
  return dogs.filter(dog => 
    dog.name.toLowerCase().includes(searchTerm) ||
    dog.breed.toLowerCase().includes(searchTerm)
  );
};

// Get database statistics
export const getDatabaseStats = () => {
  const db = initializeDatabase();
  return {
    totalDogs: db.dogs.length,
    lastId: db.lastId
  };
};
