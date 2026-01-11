// Tag type
export type Tag = {
  id: string; // UUID string
  name: string;
  color?: string; // Optional hex color
  createdAt: number;
};

// Core wardrobe item type
export type WardrobeItem = {
  id: string; // UUID string
  category: Category;
  colors: string[]; // HEX color codes
  styles: string[];
  occasions: string[];
  imagePath: string; // PNG with alpha
  rating: number; // 0-1 scale (0 = disliked, 1 = liked)
  createdAt: number;
  tags: string[]; // Array of tag IDs
};

// Outfit type with embedded items
export type Outfit = {
  id: string; // UUID string
  occasion: string;
  rating: number; // 0-5 scale
  createdAt: number;
  items: WardrobeItem[];
  tags: string[]; // Array of tag IDs
};

// Junction table type for outfit-item relationships
export type OutfitItem = {
  outfitId: string; // UUID string
  itemId: string; // UUID string
};

// User preferences storage
export type UserPref = {
  id: number;
  key: string;
  value: string;
};

// Category enumeration
export type Category = 'tshirt' | 'shirt' | 'bottom' | 'skirt' | 'shorts' | 'footwear' | 'outerwear' | 'blazer' | 'accessory';

// Color palette extracted from images
export type ColorPalette = {
  dominant: string;
  palette: string[];
  vibrant: string;
  muted: string;
  lightVibrant: string;
  darkVibrant: string;
};

// Database operation result types
export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Form input types
export type ItemFormData = Omit<WardrobeItem, 'id' | 'createdAt'>;
export type OutfitFormData = Omit<Outfit, 'id' | 'createdAt' | 'items'>;
