'use client';

import { supabase } from './client';
import { Dog } from '@/types';
import * as localDogs from '../database/dogs';

export const DOGS_TABLE = 'dogs';

/* =========================
   CREATE
========================= */
export const createDog = async (
  // Updated type to allow owner_id to be passed in
  dogData: Omit<Dog, 'id' | 'created_at' | 'updated_at'>
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
      // Use provided owner_id if exists, otherwise fall back to current user
      owner_id: dogData.owner_id || user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase DB Error:', error);
    throw new Error(error.message);
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
    .order('name', { ascending: true }); // Ordered by name for better dropdowns

  if (error) {
    console.error('Error fetching dogs:', error);
    // Only fallback if really necessary
    return Array.isArray(localDogs.getAllDogs) ? localDogs.getAllDogs() : [];
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
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching dog by ID:', error);
    return null;
  }

  return data as Dog;
};