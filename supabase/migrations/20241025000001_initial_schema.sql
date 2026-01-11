-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('tshirt', 'bottom', 'footwear', 'outerwear', 'accessory')),
  name TEXT NOT NULL,
  colors TEXT[] NOT NULL DEFAULT '{}', -- Array of HEX color codes
  styles TEXT[] NOT NULL DEFAULT '{}', -- Array of style tags
  occasions TEXT[] NOT NULL DEFAULT '{}', -- Array of occasion tags
  image_url TEXT, -- URL to image in Supabase Storage
  image_path TEXT, -- Local path for migration purposes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outfits table
CREATE TABLE IF NOT EXISTS outfits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occasion TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outfit_items junction table
CREATE TABLE IF NOT EXISTS outfit_items (
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (outfit_id, item_id)
);

-- Create user_prefs table
CREATE TABLE IF NOT EXISTS user_prefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_category ON items (user_id, category);
CREATE INDEX IF NOT EXISTS idx_items_user_created ON items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outfits_user_occasion ON outfits (user_id, occasion);
CREATE INDEX IF NOT EXISTS idx_outfits_user_created ON outfits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON outfit_items (outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_item ON outfit_items (item_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_key ON user_prefs (user_id, key);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outfits_updated_at BEFORE UPDATE ON outfits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_prefs_updated_at BEFORE UPDATE ON user_prefs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for items
CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for outfits
CREATE POLICY "Users can view their own outfits" ON outfits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits" ON outfits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits" ON outfits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits" ON outfits
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for outfit_items
CREATE POLICY "Users can view outfit items for their outfits" ON outfit_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert outfit items for their outfits" ON outfit_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete outfit items for their outfits" ON outfit_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

-- Create RLS policies for user_prefs
CREATE POLICY "Users can view their own preferences" ON user_prefs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_prefs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_prefs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_prefs
    FOR DELETE USING (auth.uid() = user_id);
