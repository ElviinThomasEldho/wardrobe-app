-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT, -- Optional hex color for visual distinction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create item_tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Create outfit_tags junction table
CREATE TABLE IF NOT EXISTS outfit_tags (
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (outfit_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags (user_id, name);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags (item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_outfit_tags_outfit_id ON outfit_tags (outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_tags_tag_id ON outfit_tags (tag_id);

-- Create trigger for updated_at on tags
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "Users can view their own tags" ON tags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for item_tags
CREATE POLICY "Users can view item tags for their items" ON item_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM items 
            WHERE items.id = item_tags.item_id 
            AND items.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert item tags for their items" ON item_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM items 
            WHERE items.id = item_tags.item_id 
            AND items.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags 
            WHERE tags.id = item_tags.tag_id 
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete item tags for their items" ON item_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM items 
            WHERE items.id = item_tags.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- Create RLS policies for outfit_tags
CREATE POLICY "Users can view outfit tags for their outfits" ON outfit_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_tags.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert outfit tags for their outfits" ON outfit_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_tags.outfit_id 
            AND outfits.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags 
            WHERE tags.id = outfit_tags.tag_id 
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete outfit tags for their outfits" ON outfit_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM outfits 
            WHERE outfits.id = outfit_tags.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

