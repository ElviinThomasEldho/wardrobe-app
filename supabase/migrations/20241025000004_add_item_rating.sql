-- Add rating column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (rating >= 0 AND rating <= 1);

-- Create index for rating to improve query performance
CREATE INDEX IF NOT EXISTS idx_items_user_rating ON items (user_id, rating DESC);

