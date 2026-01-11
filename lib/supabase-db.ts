import { supabase, Database } from './supabase';
import { WardrobeItem, Outfit, Category, Tag } from './types';
import { CATEGORIES } from '../constants/taxonomy';

type ItemRow = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

type OutfitRow = Database['public']['Tables']['outfits']['Row'];
type OutfitInsert = Database['public']['Tables']['outfits']['Insert'];
type OutfitUpdate = Database['public']['Tables']['outfits']['Update'];

type TagRow = Database['public']['Tables']['tags']['Row'];
type TagInsert = Database['public']['Tables']['tags']['Insert'];
type TagUpdate = Database['public']['Tables']['tags']['Update'];

// Valid categories from the database constraint
const VALID_CATEGORIES: Category[] = ['tshirt', 'shirt', 'bottom', 'skirt', 'shorts', 'footwear', 'outerwear', 'blazer', 'accessory'];

/**
 * Validate and normalize category to ensure it matches database constraint
 * The database constraint allows: 'tshirt', 'shirt', 'bottom', 'skirt', 'shorts', 'footwear', 'outerwear', 'blazer', 'accessory'
 * If migrations haven't been applied, the original constraint only allows: 'tshirt', 'bottom', 'footwear', 'outerwear', 'accessory'
 * So we use 'tshirt' as the safest default since it's in both
 */
const validateCategory = (category: string): Category => {
  const normalized = category.toLowerCase().trim();
  
  // Check if it's a valid category
  if (VALID_CATEGORIES.includes(normalized as Category)) {
    return normalized as Category;
  }
  
  // Log warning for invalid category
  console.warn(`Invalid category "${category}" detected. Defaulting to "tshirt". Valid categories are:`, VALID_CATEGORIES);
  
  // Default to 'tshirt' if invalid - this is guaranteed to be in all constraint versions
  return 'tshirt';
};

// Helper function to transform Supabase tag row to Tag
const transformRowToTag = (row: TagRow): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color || undefined,
  createdAt: new Date(row.created_at || new Date()).getTime(),
});

// Helper function to transform Supabase row to WardrobeItem
const transformRowToItem = (row: ItemRow, tags: string[] = []): WardrobeItem => {
  // Handle rating conversion (NUMERIC can come back as string or number)
  let rating = 0.5;
  if (row.rating !== null && row.rating !== undefined) {
    rating = typeof row.rating === 'string' ? parseFloat(row.rating) : row.rating;
    // Ensure it's a valid number between 0 and 1
    if (isNaN(rating) || rating < 0) rating = 0;
    if (rating > 1) rating = 1;
  }
  
  return {
    id: row.id, // Use UUID directly
    category: row.category,
    colors: row.colors,
    styles: row.styles,
    occasions: row.occasions,
    imagePath: row.image_url || row.image_path || '',
    rating: rating,
    createdAt: new Date(row.created_at || new Date()).getTime(),
    tags: tags,
  };
};

// Helper function to transform WardrobeItem to Supabase insert
const transformItemToInsert = (item: Omit<WardrobeItem, 'id'>): ItemInsert => {
  // Validate category before inserting - ensure it's lowercase and matches constraint
  const validatedCategory = validateCategory(item.category);
  
  // Ensure category is exactly one of the valid values (case-sensitive match)
  const finalCategory: Category = VALID_CATEGORIES.includes(validatedCategory) 
    ? validatedCategory 
    : 'tshirt'; // Fallback to 'tshirt' which is in all constraint versions
  
  return {
    user_id: '', // Will be set by auth context
    category: finalCategory,
    colors: item.colors || [],
    styles: item.styles || [],
    occasions: item.occasions || [],
    image_url: item.imagePath.startsWith('http') ? item.imagePath : null,
    image_path: item.imagePath.startsWith('http') ? null : item.imagePath,
    rating: item.rating ?? 0.5, // Default to 0.5 if not set
  };
};

// Helper function to transform Supabase outfit row to Outfit
const transformRowToOutfit = (row: OutfitRow, items: WardrobeItem[], tags: string[] = []): Outfit => ({
  id: row.id, // Use UUID directly
  occasion: row.occasion,
  rating: row.rating,
  createdAt: new Date(row.created_at || new Date()).getTime(),
  items,
  tags: tags,
});

// Helper function to transform Outfit to Supabase insert
const transformOutfitToInsert = (outfit: Omit<Outfit, 'id' | 'items'>): OutfitInsert => ({
  user_id: '', // Will be set by auth context
  occasion: outfit.occasion,
  rating: outfit.rating,
});

// Database initialization is handled by Supabase automatically
// No need for manual initialization

// Items CRUD operations
export const createItem = async (item: Omit<WardrobeItem, 'id'>): Promise<WardrobeItem> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const insertData = transformItemToInsert(item);
  insertData.user_id = user.id;

  // Ensure category is definitely valid before inserting
  // Force it to be a plain string value that matches the constraint exactly
  if (!VALID_CATEGORIES.includes(insertData.category as Category)) {
    console.warn(`Category "${insertData.category}" is not valid, using "tshirt" instead`);
    insertData.category = 'tshirt' as Category;
  }
  
  // Ensure category is a plain string (not an object or anything else)
  const categoryValue = String(insertData.category).toLowerCase().trim();
  if (categoryValue === 'tshirt' || VALID_CATEGORIES.includes(categoryValue as Category)) {
    insertData.category = categoryValue as Category;
  } else {
    // Fallback to 'tshirt' which is guaranteed to be in all constraint versions
    insertData.category = 'tshirt' as Category;
  }

  // Log the data being inserted for debugging
  console.log('Inserting item with category:', insertData.category);
  console.log('Category type:', typeof insertData.category);
  console.log('Category value:', JSON.stringify(insertData.category));
  console.log('Full insert data:', JSON.stringify(insertData, null, 2));

  const { data, error } = await supabase
    .from('items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting item:', error);
    console.error('Insert data that failed:', JSON.stringify(insertData, null, 2));
    console.error('Category value:', insertData.category, 'Type:', typeof insertData.category);
    throw error;
  }
  return transformRowToItem(data, []); // New items have no tags initially
};

export const getItems = async (): Promise<WardrobeItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch tags for all items
  const itemsWithTags = await Promise.all(
    data.map(async (item) => {
      const { data: itemTags } = await supabase
        .from('item_tags')
        .select('tag_id')
        .eq('item_id', item.id);
      
      const tagIds = itemTags?.map((it) => it.tag_id) || [];
      return transformRowToItem(item, tagIds);
    })
  );

  return itemsWithTags;
};

export const getItemById = async (id: string): Promise<WardrobeItem | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return null;

  // Fetch tags for the item
  const { data: itemTags } = await supabase
    .from('item_tags')
    .select('tag_id')
    .eq('item_id', id);
  
  const tagIds = itemTags?.map((it) => it.tag_id) || [];
  return transformRowToItem(data, tagIds);
};

export const updateItem = async (id: string, updates: Partial<Omit<WardrobeItem, 'id'>>): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const updateData: ItemUpdate = {};
  if (updates.category !== undefined) {
    // Validate category before updating
    updateData.category = validateCategory(updates.category);
  }
  if (updates.colors !== undefined) updateData.colors = updates.colors;
  if (updates.styles !== undefined) updateData.styles = updates.styles;
  if (updates.occasions !== undefined) updateData.occasions = updates.occasions;
  if (updates.imagePath !== undefined) {
    updateData.image_url = updates.imagePath.startsWith('http') ? updates.imagePath : null;
    updateData.image_path = updates.imagePath.startsWith('http') ? null : updates.imagePath;
  }
  if (updates.rating !== undefined) {
    // Ensure rating is between 0 and 1, and round to 2 decimal places for NUMERIC(3,2)
    const rating = Math.max(0, Math.min(1, updates.rating));
    updateData.rating = Math.round(rating * 100) / 100; // Round to 2 decimal places
  }

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Update error:', error);
    console.error('Update data:', updateData);
  }

  return !error;
};

export const deleteItem = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
};

// Outfits CRUD operations
export const createOutfit = async (outfit: Omit<Outfit, 'id' | 'items'>): Promise<Outfit> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const insertData = transformOutfitToInsert(outfit);
  insertData.user_id = user.id;

  const { data, error } = await supabase
    .from('outfits')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return transformRowToOutfit(data, []);
};

export const updateOutfit = async (id: string, updates: Partial<Omit<Outfit, 'id' | 'items'>>): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const updateData: OutfitUpdate = {};
  if (updates.occasion !== undefined) updateData.occasion = updates.occasion;
  if (updates.rating !== undefined) updateData.rating = updates.rating;

  const { error } = await supabase
    .from('outfits')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
};

export const getOutfits = async (): Promise<Outfit[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data: outfits, error: outfitsError } = await supabase
    .from('outfits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (outfitsError) throw outfitsError;

  const outfitsWithItems = await Promise.all(
    outfits.map(async (outfit) => {
      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('outfit_items')
        .select(`
          items (
            id,
            user_id,
            category,
            colors,
            styles,
            occasions,
            image_url,
            image_path,
            rating,
            created_at
          )
        `)
        .eq('outfit_id', outfit.id);

      if (itemsError) throw itemsError;

      // Fetch tags for items
      const outfitItems = await Promise.all(
        items.map(async (item: any) => {
          const { data: itemTags } = await supabase
            .from('item_tags')
            .select('tag_id')
            .eq('item_id', item.items.id);
          
          const tagIds = itemTags?.map((it) => it.tag_id) || [];
          return transformRowToItem(item.items, tagIds);
        })
      );

      // Fetch tags for outfit
      const { data: outfitTags } = await supabase
        .from('outfit_tags')
        .select('tag_id')
        .eq('outfit_id', outfit.id);
      
      const tagIds = outfitTags?.map((ot) => ot.tag_id) || [];
      return transformRowToOutfit(outfit, outfitItems, tagIds);
    })
  );

  return outfitsWithItems;
};

export const addItemToOutfit = async (outfitId: string, itemId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  console.log('Adding item to outfit:', { outfitId, itemId });

  const { error } = await supabase
    .from('outfit_items')
    .insert({
      outfit_id: outfitId,
      item_id: itemId,
    });

  if (error) {
    console.error('Error adding item to outfit:', error);
  }

  return !error;
};

export const removeItemFromOutfit = async (outfitId: string, itemId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('outfit_items')
    .delete()
    .eq('outfit_id', outfitId)
    .eq('item_id', itemId);

  return !error;
};

export const deleteOutfit = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
};

export const deleteAllOutfits = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('user_id', user.id);

  return !error;
};

// User preferences
export const setUserPref = async (key: string, value: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('user_prefs')
    .upsert({
      user_id: user.id,
      key,
      value,
    });

  if (error) throw error;
};

export const getUserPref = async (key: string): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('user_prefs')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', key)
    .single();

  if (error) return null;
  return data?.value || null;
};

// Authentication helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Storage helpers
export const uploadImage = async (file: any, path: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  console.log('Uploading file:', file.name, 'URI:', file.uri, 'Type:', file.type);

  // For React Native, we need to use FormData with the correct structure
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  console.log('FormData created, uploading...');

  const { data, error } = await supabase.storage
    .from('wardrobe-images')
    .upload(`${user.id}/${path}`, formData, {
      contentType: file.type,
    });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }
  
  console.log('Upload successful:', data);
  return data;
};

export const getImageUrl = (path: string) => {
  const { data } = supabase.storage
    .from('wardrobe-images')
    .getPublicUrl(path);
  return data.publicUrl;
};

export const deleteImage = async (path: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase.storage
    .from('wardrobe-images')
    .remove([`${user.id}/${path}`]);

  return !error;
};

// Tags CRUD operations
export const getTags = async (): Promise<Tag[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(transformRowToTag);
};

export const getTagById = async (id: string): Promise<Tag | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return transformRowToTag(data);
};

export const createTag = async (name: string, color?: string): Promise<Tag> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const insertData: TagInsert = {
    user_id: user.id,
    name: name.trim(),
    color: color || null,
  };

  const { data, error } = await supabase
    .from('tags')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return transformRowToTag(data);
};

export const updateTag = async (id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const updateData: TagUpdate = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.color !== undefined) updateData.color = updates.color || null;

  const { error } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
};

export const deleteTag = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Cascade delete will handle item_tags and outfit_tags
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
};

// Tag assignment operations
export const assignTagToItem = async (itemId: string, tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('item_tags')
    .insert({
      item_id: itemId,
      tag_id: tagId,
    });

  return !error;
};

export const removeTagFromItem = async (itemId: string, tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('item_tags')
    .delete()
    .eq('item_id', itemId)
    .eq('tag_id', tagId);

  return !error;
};

export const assignTagToOutfit = async (outfitId: string, tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('outfit_tags')
    .insert({
      outfit_id: outfitId,
      tag_id: tagId,
    });

  return !error;
};

export const removeTagFromOutfit = async (outfitId: string, tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('outfit_tags')
    .delete()
    .eq('outfit_id', outfitId)
    .eq('tag_id', tagId);

  return !error;
};

// Bulk tag assignment operations
export const bulkAssignTagToItems = async (itemIds: string[], tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const inserts = itemIds.map(itemId => ({
    item_id: itemId,
    tag_id: tagId,
  }));

  const { error } = await supabase
    .from('item_tags')
    .upsert(inserts, { onConflict: 'item_id,tag_id' });

  return !error;
};

export const bulkAssignTagToOutfits = async (outfitIds: string[], tagId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const inserts = outfitIds.map(outfitId => ({
    outfit_id: outfitId,
    tag_id: tagId,
  }));

  const { error } = await supabase
    .from('outfit_tags')
    .upsert(inserts, { onConflict: 'outfit_id,tag_id' });

  return !error;
};

// Get items/outfits by tag
export const getItemsByTag = async (tagId: string): Promise<WardrobeItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data: itemTags, error } = await supabase
    .from('item_tags')
    .select('item_id')
    .eq('tag_id', tagId);

  if (error) throw error;

  const itemIds = itemTags?.map((it) => it.item_id) || [];
  if (itemIds.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .in('id', itemIds)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (itemsError) throw itemsError;

  const itemsWithTags = await Promise.all(
    items.map(async (item) => {
      const { data: itemTags } = await supabase
        .from('item_tags')
        .select('tag_id')
        .eq('item_id', item.id);
      
      const tagIds = itemTags?.map((it) => it.tag_id) || [];
      return transformRowToItem(item, tagIds);
    })
  );

  return itemsWithTags;
};

export const getOutfitsByTag = async (tagId: string): Promise<Outfit[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data: outfitTags, error } = await supabase
    .from('outfit_tags')
    .select('outfit_id')
    .eq('tag_id', tagId);

  if (error) throw error;

  const outfitIds = outfitTags?.map((ot) => ot.outfit_id) || [];
  if (outfitIds.length === 0) return [];

  const { data: outfits, error: outfitsError } = await supabase
    .from('outfits')
    .select('*')
    .in('id', outfitIds)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (outfitsError) throw outfitsError;

  const outfitsWithItems = await Promise.all(
    outfits.map(async (outfit) => {
      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('outfit_items')
        .select(`
          items (
            id,
            user_id,
            category,
            colors,
            styles,
            occasions,
            image_url,
            image_path,
            rating,
            created_at
          )
        `)
        .eq('outfit_id', outfit.id);

      if (itemsError) throw itemsError;

      // Fetch tags for items
      const outfitItems = await Promise.all(
        items.map(async (item: any) => {
          const { data: itemTags } = await supabase
            .from('item_tags')
            .select('tag_id')
            .eq('item_id', item.items.id);
          
          const tagIds = itemTags?.map((it) => it.tag_id) || [];
          return transformRowToItem(item.items, tagIds);
        })
      );

      // Fetch tags for outfit
      const { data: outfitTags } = await supabase
        .from('outfit_tags')
        .select('tag_id')
        .eq('outfit_id', outfit.id);
      
      const tagIds = outfitTags?.map((ot) => ot.tag_id) || [];
      return transformRowToOutfit(outfit, outfitItems, tagIds);
    })
  );

  return outfitsWithItems;
};

// Get tag usage count
export const getTagUsageCount = async (tagId: string): Promise<{ items: number; outfits: number }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const [itemsResult, outfitsResult] = await Promise.all([
    supabase
      .from('item_tags')
      .select('item_id', { count: 'exact', head: true })
      .eq('tag_id', tagId),
    supabase
      .from('outfit_tags')
      .select('outfit_id', { count: 'exact', head: true })
      .eq('tag_id', tagId),
  ]);

  return {
    items: itemsResult.count || 0,
    outfits: outfitsResult.count || 0,
  };
};
