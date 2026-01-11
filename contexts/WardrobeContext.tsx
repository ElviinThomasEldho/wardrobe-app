import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WardrobeItem, Category } from '../lib/types';
import { getItems, createItem, updateItem, deleteItem, uploadImage, getImageUrl } from '../lib/supabase-db';
import { analyzeApparelImage } from '../lib/ai/gemini';
import { removeBackground, trimTransparentPixels } from '../lib/image/background';
import { generateUniqueFilename } from '../lib/files';
import * as FileSystem from 'expo-file-system/legacy';

interface WardrobeContextType {
  items: WardrobeItem[];
  loading: boolean;
  error: string | null;
  analyzingItems: Set<string>; // Set of item IDs currently being analyzed
  failedItems: Set<string>; // Set of item IDs that failed analysis
  loadItems: () => Promise<void>;
  addItem: (item: Omit<WardrobeItem, 'id'>) => Promise<WardrobeItem | null>;
  updateItemById: (id: string, updates: Partial<Omit<WardrobeItem, 'id'>>) => Promise<WardrobeItem | null>;
  deleteItemById: (id: string) => Promise<boolean>;
  getItemById: (id: string) => WardrobeItem | null;
  getItemsByCategory: (category: Category | 'all') => WardrobeItem[];
  refreshItems: () => Promise<void>;
  startAnalysis: (itemId: string, imageUri: string) => Promise<void>;
  retryAnalysis: (itemId: string) => Promise<void>;
  isAnalyzing: (itemId: string) => boolean;
  hasFailedAnalysis: (itemId: string) => boolean;
}

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);

interface WardrobeProviderProps {
  children: ReactNode;
}

export const WardrobeProvider: React.FC<WardrobeProviderProps> = ({ children }) => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingItems, setAnalyzingItems] = useState<Set<string>>(new Set());
  const [failedItems, setFailedItems] = useState<Set<string>>(new Set());
  const [originalImageUris, setOriginalImageUris] = useState<Map<string, string>>(new Map()); // Store original URIs for retry

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const allItems = await getItems();
      setItems(allItems);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items';
      setError(errorMessage);
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<WardrobeItem, 'id'>): Promise<WardrobeItem | null> => {
    try {
      setError(null);
      const newItem = await createItem(item);
      setItems(prev => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
      setError(errorMessage);
      console.error('Failed to add item:', err);
      return null;
    }
  };

  const updateItemById = async (id: string, updates: Partial<Omit<WardrobeItem, 'id'>>): Promise<WardrobeItem | null> => {
    try {
      setError(null);
      const success = await updateItem(id, updates);
      if (success) {
        let updatedItem: WardrobeItem | null = null;
        setItems(prev => {
          const updated = prev.map(item => 
            item.id === id ? { ...item, ...updates } : item
          );
          updatedItem = updated.find(item => item.id === id) || null;
          return updated;
        });
        return updatedItem;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      setError(errorMessage);
      console.error('Failed to update item:', err);
      return null;
    }
  };

  const deleteItemById = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteItem(id);
      if (success) {
        setItems(prev => prev.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      console.error('Failed to delete item:', err);
      return false;
    }
  };

  const getItemById = (id: string): WardrobeItem | null => {
    return items.find(item => item.id === id) || null;
  };

  const getItemsByCategory = (category: Category | 'all'): WardrobeItem[] => {
    if (category === 'all') {
      return items;
    }
    return items.filter(item => item.category === category);
  };

  const refreshItems = async () => {
    await loadItems();
  };

  const isAnalyzing = (itemId: string): boolean => {
    return analyzingItems.has(itemId);
  };

  const hasFailedAnalysis = (itemId: string): boolean => {
    return failedItems.has(itemId);
  };

  const startAnalysis = async (itemId: string, imageUri: string): Promise<void> => {
    // Store original URI for potential retry
    setOriginalImageUris(prev => new Map(prev).set(itemId, imageUri));
    
    // Remove from failed items if it was previously failed
    setFailedItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    
    // Mark item as analyzing
    setAnalyzingItems(prev => new Set(prev).add(itemId));

    try {
      // Step 1: Remove background (happens in background)
      console.log('Background: Removing background from image...');
      const noBackgroundUri = await removeBackground(imageUri);
      
      // Step 2: Trim transparent pixels (happens in background)
      console.log('Background: Trimming transparent pixels...');
      const processedUri = await trimTransparentPixels(noBackgroundUri, imageUri);
      
      // Step 3: Upload the processed image to replace the original
      console.log('Background: Uploading processed image...');
      const filename = generateUniqueFilename();
      
      // Helper to convert URI to File object
      const extension = processedUri.split('.').pop()?.toLowerCase();
      let mimeType = 'image/png';
      if (extension === 'jpg' || extension === 'jpeg') {
        mimeType = 'image/jpeg';
      }
      
      const imageFile = {
        uri: processedUri,
        type: mimeType,
        name: filename,
      };
      
      const uploadResult = await uploadImage(imageFile, filename);
      const processedImageUrl = getImageUrl(uploadResult.path);
      
      // Update item with processed image URL
      await updateItemById(itemId, {
        imagePath: processedImageUrl,
      });
      
      // Step 4: Run AI analysis on the processed image
      console.log('Background: Analyzing image with AI...');
      const analysis = await analyzeApparelImage(processedUri);
      
      // Step 5: Update item with analysis results
      await updateItemById(itemId, {
        category: analysis.category,
        colors: analysis.colors,
        styles: analysis.styles,
        occasions: analysis.occasions,
      });
      
      console.log('Background processing complete for item:', itemId);
    } catch (error) {
      console.error('Error in background processing:', error);
      // Mark item as failed
      setFailedItems(prev => new Set(prev).add(itemId));
      // If processing fails, keep the item with default values
      // The item will still be visible but without AI-populated attributes
    } finally {
      // Remove from analyzing set
      setAnalyzingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const retryAnalysis = async (itemId: string): Promise<void> => {
    // Get the original image URI if available, otherwise download from the item's imagePath
    let originalUri = originalImageUris.get(itemId);
    const item = getItemById(itemId);
    
    if (!item) {
      console.error('Item not found for retry:', itemId);
      return;
    }
    
    // If we don't have the original local URI, download the image from the URL
    if (!originalUri && item.imagePath.startsWith('http')) {
      try {
        console.log('Downloading image for retry from:', item.imagePath);
        const downloadUri = `${FileSystem.cacheDirectory}retry_${itemId}_${Date.now()}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(item.imagePath, downloadUri);
        originalUri = downloadResult.uri;
        // Store it for future retries
        setOriginalImageUris(prev => new Map(prev).set(itemId, originalUri!));
      } catch (error) {
        console.error('Error downloading image for retry:', error);
        // Fallback: try to analyze the current image URL directly
        // This might not work if the analysis function expects a local URI
        setFailedItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        
        setAnalyzingItems(prev => new Set(prev).add(itemId));
        
        try {
          const analysis = await analyzeApparelImage(item.imagePath);
          await updateItemById(itemId, {
            category: analysis.category,
            colors: analysis.colors,
            styles: analysis.styles,
            occasions: analysis.occasions,
          });
        } catch (retryError) {
          console.error('Error retrying analysis:', retryError);
          setFailedItems(prev => new Set(prev).add(itemId));
        } finally {
          setAnalyzingItems(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }
        return;
      }
    }
    
    // If we have a local URI (original or downloaded), run full processing
    if (originalUri) {
      await startAnalysis(itemId, originalUri);
    } else {
      // Last resort: try to analyze the current image path
      setFailedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      
      setAnalyzingItems(prev => new Set(prev).add(itemId));
      
      try {
        const analysis = await analyzeApparelImage(item.imagePath);
        await updateItemById(itemId, {
          category: analysis.category,
          colors: analysis.colors,
          styles: analysis.styles,
          occasions: analysis.occasions,
        });
      } catch (error) {
        console.error('Error retrying analysis:', error);
        setFailedItems(prev => new Set(prev).add(itemId));
      } finally {
        setAnalyzingItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    }
  };

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, []);

  const value: WardrobeContextType = {
    items,
    loading,
    error,
    analyzingItems,
    failedItems,
    loadItems,
    addItem,
    updateItemById,
    deleteItemById,
    getItemById,
    getItemsByCategory,
    refreshItems,
    startAnalysis,
    retryAnalysis,
    isAnalyzing,
    hasFailedAnalysis,
  };

  return (
    <WardrobeContext.Provider value={value}>
      {children}
    </WardrobeContext.Provider>
  );
};

export const useWardrobe = (): WardrobeContextType => {
  const context = useContext(WardrobeContext);
  if (context === undefined) {
    throw new Error('useWardrobe must be used within a WardrobeProvider');
  }
  return context;
};
