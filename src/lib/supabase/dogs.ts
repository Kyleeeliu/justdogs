'use client';

import { supabase } from './client';
import { Dog } from '@/types';
import * as localDogs from '../database/dogs';

export const DOGS_TABLE = 'dogs';

/* =========================
   CREATE
========================= */
export const createDog = async (
  dogData: Omit<Dog, 'id' | 'created_at' | 'updated_at' | 'owner_id'>
): Promise<Dog> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be logged in to create a dog');
  }

  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .insert({
      ...dogData,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating dog:', error);
    throw error;
  }

  return data as Dog;
};

/* =========================
   READ
========================= */
export const getAllDogs = async (): Promise<Dog[]> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs:', error);
    return localDogs.getAllDogs();
  }

  return (data ?? []) as Dog[];
};

export const getDogsByOwner = async (ownerId: string): Promise<Dog[]> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs by owner:', error);
    return [];
  }

  return (data ?? []) as Dog[];
};

/* =========================
   UPDATE
========================= */
export const updateDog = async (
  id: string,
  updates: Partial<Omit<Dog, 'id' | 'created_at'>>
): Promise<Dog | null> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating dog:', error);
    return null;
  }

  return data as Dog;
};
/* =========================
   SEARCH
========================= */
export const searchDogs = async (searchTerm: string): Promise<Dog[]> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error searching dogs:', error);
    return [];
  }

  return (data ?? []) as Dog[];
};
/* =========================
   DELETE
========================= */
export const deleteDog = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from(DOGS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting dog:', error);
    return false;
  }

  return true;
};

/* =========================
   READ (single + search)
========================= */
export const getDogById = async (id: string): Promise<Dog | null> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // no rows found
      return null;
    }
    console.error('Error fetching dog by ID:', error);
    return null;
  }

  return data as Dog;
};

export const searchDogs = async (
  searchTerm: string,
  ownerId?: string
): Promise<Dog[]> => {
  let query = supabase
    .from(DOGS_TABLE)
    .select('*')
    .or(`name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`);

  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    console.error('Error searching dogs:', error);
    return [];
  }

  return (data ?? []) as Dog[];
};
