-- Remove name column from items table
ALTER TABLE items DROP COLUMN IF EXISTS name;

-- Remove name column from outfits table
ALTER TABLE outfits DROP COLUMN IF EXISTS name;

