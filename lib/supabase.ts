import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (generated from Supabase)
export type Database = {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          user_id: string | null;
          category: 'tshirt' | 'shirt' | 'bottom' | 'skirt' | 'shorts' | 'footwear' | 'outerwear' | 'blazer' | 'accessory';
          colors: string[];
          styles: string[];
          occasions: string[];
          image_url: string | null;
          image_path: string | null;
          rating: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category: 'tshirt' | 'shirt' | 'bottom' | 'skirt' | 'shorts' | 'footwear' | 'outerwear' | 'blazer' | 'accessory';
          colors?: string[];
          styles?: string[];
          occasions?: string[];
          image_url?: string | null;
          image_path?: string | null;
          rating?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          category?: 'tshirt' | 'shirt' | 'bottom' | 'skirt' | 'shorts' | 'footwear' | 'outerwear' | 'blazer' | 'accessory';
          colors?: string[];
          styles?: string[];
          occasions?: string[];
          image_url?: string | null;
          image_path?: string | null;
          rating?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      outfits: {
        Row: {
          id: string;
          user_id: string | null;
          occasion: string;
          rating: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          occasion: string;
          rating?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          occasion?: string;
          rating?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      outfit_items: {
        Row: {
          outfit_id: string;
          item_id: string;
        };
        Insert: {
          outfit_id: string;
          item_id: string;
        };
        Update: {
          outfit_id?: string;
          item_id?: string;
        };
      };
      user_prefs: {
        Row: {
          id: string;
          user_id: string | null;
          key: string;
          value: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          key: string;
          value: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          key?: string;
          value?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          color: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          color?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          color?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      item_tags: {
        Row: {
          item_id: string;
          tag_id: string;
        };
        Insert: {
          item_id: string;
          tag_id: string;
        };
        Update: {
          item_id?: string;
          tag_id?: string;
        };
      };
      outfit_tags: {
        Row: {
          outfit_id: string;
          tag_id: string;
        };
        Insert: {
          outfit_id: string;
          tag_id: string;
        };
        Update: {
          outfit_id?: string;
          tag_id?: string;
        };
      };
    };
  };
};
