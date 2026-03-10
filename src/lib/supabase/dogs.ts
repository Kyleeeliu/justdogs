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
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs:', error);
    return localDogs.getAllDogs();
  }

  const rows = (data ?? []) as any[];
  return rows.map((row) => ({
    ...(row as Dog),
    owner_name: row.owner?.full_name ?? undefined,
    owner_email: row.owner?.email ?? undefined,
  }));
};

export const getDogsByOwner = async (ownerId: string): Promise<Dog[]> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs by owner:', error);
    return [];
  }

  const rows = (data ?? []) as any[];
  return rows.map((row) => ({
    ...(row as Dog),
    owner_name: row.owner?.full_name ?? undefined,
    owner_email: row.owner?.email ?? undefined,
  }));
};

export const getDogById = async (id: string): Promise<Dog | null> => {
  const { data, error } = await supabase
    .from(DOGS_TABLE)
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching dog by ID:', error);
    return null;
  }

  const row = data as any;
  return {
    ...(row as Dog),
    owner_name: row.owner?.full_name ?? undefined,
    owner_email: row.owner?.email ?? undefined,
  };
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
   SEARCH
========================= */
export const searchDogs = async (
  searchTerm: string,
  ownerId?: string
): Promise<Dog[]> => {
  let query = supabase
    .from(DOGS_TABLE)
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
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

  const rows = (data ?? []) as any[];
  return rows.map((row) => ({
    ...(row as Dog),
    owner_name: row.owner?.full_name ?? undefined,
    owner_email: row.owner?.email ?? undefined,
  }));
};