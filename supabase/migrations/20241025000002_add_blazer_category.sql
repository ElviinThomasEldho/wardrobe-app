-- Add new categories (blazer, shirt, skirt, shorts) to the category check constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;
ALTER TABLE items ADD CONSTRAINT items_category_check 
  CHECK (category IN ('tshirt', 'shirt', 'bottom', 'skirt', 'shorts', 'footwear', 'outerwear', 'blazer', 'accessory'));

