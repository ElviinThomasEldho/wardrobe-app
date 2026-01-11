import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Outfit } from '../lib/types';
import { getOutfits, createOutfit, updateOutfit, deleteOutfit, addItemToOutfit, removeItemFromOutfit } from '../lib/supabase-db';

interface OutfitsContextType {
  outfits: Outfit[];
  loading: boolean;
  error: string | null;
  loadOutfits: () => Promise<void>;
  addOutfit: (outfit: Omit<Outfit, 'id' | 'items'>) => Promise<Outfit | null>;
  updateOutfitById: (id: string, updates: Partial<Omit<Outfit, 'id' | 'items'>>) => Promise<Outfit | null>;
  deleteOutfitById: (id: string) => Promise<boolean>;
  addItemToOutfitById: (outfitId: string, itemId: string, item?: any) => Promise<boolean>;
  removeItemFromOutfitById: (outfitId: string, itemId: string) => Promise<boolean>;
  getOutfitById: (id: string) => Outfit | null;
  refreshOutfits: () => Promise<void>;
}

const OutfitsContext = createContext<OutfitsContextType | undefined>(undefined);

interface OutfitsProviderProps {
  children: ReactNode;
}

export const OutfitsProvider: React.FC<OutfitsProviderProps> = ({ children }) => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOutfits = async () => {
    try {
      setLoading(true);
      setError(null);
      const allOutfits = await getOutfits();
      setOutfits(allOutfits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load outfits';
      setError(errorMessage);
      console.error('Failed to load outfits:', err);
    } finally {
      setLoading(false);
    }
  };

  const addOutfit = async (outfit: Omit<Outfit, 'id' | 'items'>): Promise<Outfit | null> => {
    try {
      setError(null);
      const newOutfit = await createOutfit(outfit);
      setOutfits(prev => [newOutfit, ...prev]);
      return newOutfit;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add outfit';
      setError(errorMessage);
      console.error('Failed to add outfit:', err);
      return null;
    }
  };

  const updateOutfitById = async (id: string, updates: Partial<Omit<Outfit, 'id' | 'items'>>): Promise<Outfit | null> => {
    try {
      setError(null);
      const success = await updateOutfit(id, updates);
      if (success) {
        let updatedOutfit: Outfit | null = null;
        setOutfits(prev => {
          const updated = prev.map(outfit => 
            outfit.id === id ? { ...outfit, ...updates } : outfit
          );
          updatedOutfit = updated.find(outfit => outfit.id === id) || null;
          return updated;
        });
        return updatedOutfit;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update outfit';
      setError(errorMessage);
      console.error('Failed to update outfit:', err);
      return null;
    }
  };

  const deleteOutfitById = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteOutfit(id);
      if (success) {
        setOutfits(prev => prev.filter(outfit => outfit.id !== id));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete outfit';
      setError(errorMessage);
      console.error('Failed to delete outfit:', err);
      return false;
    }
  };

  const addItemToOutfitById = async (outfitId: string, itemId: string, item?: any): Promise<boolean> => {
    try {
      setError(null);
      const success = await addItemToOutfit(outfitId, itemId);
      if (success) {
        // Update local state with the item if provided
        if (item) {
          setOutfits(prev => prev.map(outfit => {
            if (outfit.id === outfitId) {
              return {
                ...outfit,
                items: [...outfit.items, item]
              };
            }
            return outfit;
          }));
        } else {
          // If no item provided, refresh to get updated data
          await loadOutfits();
        }
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to outfit';
      setError(errorMessage);
      console.error('Failed to add item to outfit:', err);
      return false;
    }
  };

  const removeItemFromOutfitById = async (outfitId: string, itemId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await removeItemFromOutfit(outfitId, itemId);
      if (success) {
        // Update local state instead of refetching
        setOutfits(prev => prev.map(outfit => {
          if (outfit.id === outfitId) {
            return {
              ...outfit,
              items: outfit.items.filter(item => item.id !== itemId)
            };
          }
          return outfit;
        }));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from outfit';
      setError(errorMessage);
      console.error('Failed to remove item from outfit:', err);
      return false;
    }
  };

  const getOutfitById = (id: string): Outfit | null => {
    return outfits.find(outfit => outfit.id === id) || null;
  };

  const refreshOutfits = async () => {
    await loadOutfits();
  };

  // Load outfits on mount
  useEffect(() => {
    loadOutfits();
  }, []);

  const value: OutfitsContextType = {
    outfits,
    loading,
    error,
    loadOutfits,
    addOutfit,
    updateOutfitById,
    deleteOutfitById,
    addItemToOutfitById,
    removeItemFromOutfitById,
    getOutfitById,
    refreshOutfits,
  };

  return (
    <OutfitsContext.Provider value={value}>
      {children}
    </OutfitsContext.Provider>
  );
};

export const useOutfits = (): OutfitsContextType => {
  const context = useContext(OutfitsContext);
  if (context === undefined) {
    throw new Error('useOutfits must be used within an OutfitsProvider');
  }
  return context;
};
