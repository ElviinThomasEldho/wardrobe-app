import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tag, WardrobeItem, Outfit } from '../lib/types';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getItemsByTag,
  getOutfitsByTag,
  getTagUsageCount,
} from '../lib/supabase-db';

interface TagsContextType {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  loadTags: () => Promise<void>;
  addTag: (name: string, color?: string) => Promise<Tag | null>;
  updateTagById: (id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>) => Promise<Tag | null>;
  deleteTagById: (id: string) => Promise<boolean>;
  getTagById: (id: string) => Tag | null;
  getItemsByTag: (tagId: string) => Promise<WardrobeItem[]>;
  getOutfitsByTag: (tagId: string) => Promise<Outfit[]>;
  getTagUsageCount: (tagId: string) => Promise<{ items: number; outfits: number }>;
  refreshTags: () => Promise<void>;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

interface TagsProviderProps {
  children: ReactNode;
}

export const TagsProvider: React.FC<TagsProviderProps> = ({ children }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const allTags = await getTags();
      setTags(allTags);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tags';
      setError(errorMessage);
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (name: string, color?: string): Promise<Tag | null> => {
    try {
      setError(null);
      const newTag = await createTag(name, color);
      setTags(prev => [newTag, ...prev]);
      return newTag;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tag';
      setError(errorMessage);
      console.error('Failed to add tag:', err);
      return null;
    }
  };

  const updateTagById = async (id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<Tag | null> => {
    try {
      setError(null);
      const success = await updateTag(id, updates);
      if (success) {
        let updatedTag: Tag | null = null;
        setTags(prev => {
          const updated = prev.map(tag =>
            tag.id === id ? { ...tag, ...updates } : tag
          );
          updatedTag = updated.find(tag => tag.id === id) || null;
          return updated;
        });
        return updatedTag;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      console.error('Failed to update tag:', err);
      return null;
    }
  };

  const deleteTagById = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteTag(id);
      if (success) {
        setTags(prev => prev.filter(tag => tag.id !== id));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(errorMessage);
      console.error('Failed to delete tag:', err);
      return false;
    }
  };

  const getTagById = (id: string): Tag | null => {
    return tags.find(tag => tag.id === id) || null;
  };

  const refreshTags = async () => {
    await loadTags();
  };

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  const value: TagsContextType = {
    tags,
    loading,
    error,
    loadTags,
    addTag,
    updateTagById,
    deleteTagById,
    getTagById,
    getItemsByTag,
    getOutfitsByTag,
    getTagUsageCount,
    refreshTags,
  };

  return (
    <TagsContext.Provider value={value}>
      {children}
    </TagsContext.Provider>
  );
};

export const useTags = (): TagsContextType => {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error('useTags must be used within a TagsProvider');
  }
  return context;
};

