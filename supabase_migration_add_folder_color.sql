-- Migration: Add color column to folders table
-- Date: 2025-12-12
-- Description: Adds a color column to allow users to color-code their folders

ALTER TABLE folders ADD COLUMN IF NOT EXISTS color TEXT;

-- Create an index for faster queries on colored folders
CREATE INDEX IF NOT EXISTS idx_folders_color ON folders(color) WHERE color IS NOT NULL;
