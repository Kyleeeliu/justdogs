-- Migration to add attachments support to news_items table
-- Run this in your Supabase SQL Editor

-- Add attachments JSONB column to news_items table
ALTER TABLE news_items 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index on attachments column for query performance
CREATE INDEX IF NOT EXISTS idx_news_items_attachments ON news_items USING GIN (attachments);

-- Add comment to document the structure
COMMENT ON COLUMN news_items.attachments IS 'Array of attachment objects with structure: [{id, filename, type, url, size, uploaded_at}]';
