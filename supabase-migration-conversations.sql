-- Migration to create conversations and conversation_participants tables
-- and fix RLS policies to prevent infinite recursion
-- Run this in your Supabase SQL Editor

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Add conversation_id column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Add message_type column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

-- Add delivered_at column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;
DROP FUNCTION IF EXISTS user_is_participant(UUID, UUID);
DROP FUNCTION IF EXISTS is_conversation_participant(UUID, UUID);

-- RLS Policies for conversations table
-- Users can view conversations they are participants in
-- IMPORTANT: Use a subquery that doesn't reference conversation_participants recursively
CREATE POLICY "Users can view conversations they participate in" ON conversations
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- User created the conversation
    created_by = auth.uid()::text OR
    -- User is a participant (check directly without recursion)
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()::text
    )
  )
);

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid()::text);

-- RLS Policies for conversation_participants table
-- IMPORTANT: Avoid recursion by using SECURITY DEFINER function that bypasses RLS
-- Create a function that checks participation without triggering RLS recursion
CREATE OR REPLACE FUNCTION user_is_participant(conv_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER bypasses RLS, preventing recursion
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Users can view participants in conversations they are part of
-- Use the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- User can always see their own participant record
    user_id = auth.uid()::text OR
    -- User can see other participants if they are a participant themselves (using function to avoid recursion)
    user_is_participant(conversation_id, auth.uid())
  )
);

-- Users can add participants to conversations they created
-- This allows adding both participants when creating a conversation
CREATE POLICY "Users can add participants to conversations they created" ON conversation_participants
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  -- User can add themselves or others if they created the conversation
  conversation_id IN (
    SELECT id FROM conversations WHERE created_by = auth.uid()::text
  )
);

-- Users can update their own participant record (e.g., last_read_at)
CREATE POLICY "Users can update their own participant record" ON conversation_participants
FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Update messages table RLS to include conversation-based messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Direct messages (sender or recipient)
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = recipient_id::text OR 
    -- Conversation-based messages (user is participant in conversation)
    (
      conversation_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()::text
      )
    ) OR
    -- Announcements (visible to all or admins)
    (is_announcement = true)
  )
);

-- Update messages INSERT policy to allow conversation-based messages
DROP POLICY IF EXISTS "Users can create messages" ON messages;
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User is the sender
    auth.uid()::text = sender_id::text AND
    (
      -- Direct message (has recipient_id)
      recipient_id IS NOT NULL OR
      -- Conversation message (user is participant)
      (
        conversation_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_id = messages.conversation_id
          AND user_id = auth.uid()::text
        )
      ) OR
      -- Announcement (admin only)
      (is_announcement = true AND auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin'))
    )
  )
);

-- Create trigger to update updated_at timestamp for conversations
CREATE TRIGGER update_conversations_updated_at 
BEFORE UPDATE ON conversations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

