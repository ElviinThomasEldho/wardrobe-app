import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';
import { WardrobeItem, Outfit } from './types';

export const shareOutfit = async (
  outfit: Outfit,
  viewShotRef: React.RefObject<ViewShot | null>
): Promise<void> => {
  try {
    if (!viewShotRef.current) {
      throw new Error('ViewShot ref not available');
    }

    // Capture the outfit view as an image
    const currentRef = viewShotRef.current;
    if (!currentRef || !currentRef.capture) {
      throw new Error('ViewShot ref is null or capture method unavailable');
    }
    const uri = await currentRef.capture();
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // Share the image
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Outfit',
    });

  } catch (error) {
    console.error('Error sharing outfit:', error);
    throw error;
  }
};

export const shareOutfitAsJson = async (outfit: Outfit): Promise<void> => {
  try {
    // Create a JSON representation of the outfit
    const outfitData = {
      occasion: outfit.occasion,
      rating: outfit.rating,
      createdAt: new Date(outfit.createdAt).toISOString(),
      items: outfit.items.map(item => ({
        category: item.category,
        colors: item.colors,
        styles: item.styles,
        occasions: item.occasions,
      })),
    };

    // Create a temporary file with the JSON data
    const documentDirectory = (FileSystem as any).documentDirectory;
    if (!documentDirectory) {
      throw new Error('Document directory not available');
    }
    const fileName = `outfit_${outfit.occasion.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const fileUri = `${documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(outfitData, null, 2));

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // Share the JSON file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Share Outfit Data',
    });

    // Clean up the temporary file
    await FileSystem.deleteAsync(fileUri, { idempotent: true });

  } catch (error) {
    console.error('Error sharing outfit data:', error);
    throw error;
  }
};

export const createOutfitImage = async (
  outfit: Outfit,
  viewShotRef: React.RefObject<ViewShot | null>
): Promise<string> => {
  try {
    if (!viewShotRef.current) {
      throw new Error('ViewShot ref not available');
    }

    // Capture the outfit view as an image
    const currentRef = viewShotRef.current;
    if (!currentRef || !currentRef.capture) {
      throw new Error('ViewShot ref is null or capture method unavailable');
    }
    const uri = await currentRef.capture();
    
    // Save to a permanent location
    const documentDirectory = (FileSystem as any).documentDirectory;
    if (!documentDirectory) {
      throw new Error('Document directory not available');
    }
    const fileName = `outfit_${outfit.occasion.replace(/\s+/g, '_')}_${Date.now()}.png`;
    const permanentUri = `${documentDirectory}images/${fileName}`;
    
    // Ensure directory exists
    const directory = `${documentDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    
    // Copy the captured image to permanent storage
    await FileSystem.copyAsync({
      from: uri,
      to: permanentUri,
    });

    return permanentUri;

  } catch (error) {
    console.error('Error creating outfit image:', error);
    throw error;
  }
};

export const generateOutfitDescription = (outfit: Outfit): string => {
  const itemsByCategory = outfit.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);

  const description = [];
  
  if (itemsByCategory.tshirt) {
    description.push(`T Shirt: ${itemsByCategory.tshirt.length} item(s)`);
  }
  if (itemsByCategory.bottom) {
    description.push(`Bottom: ${itemsByCategory.bottom.length} item(s)`);
  }
  if (itemsByCategory.footwear) {
    description.push(`Footwear: ${itemsByCategory.footwear.length} item(s)`);
  }
  if (itemsByCategory.outerwear) {
    description.push(`Outerwear: ${itemsByCategory.outerwear.length} item(s)`);
  }
  if (itemsByCategory.accessory) {
    description.push(`Accessories: ${itemsByCategory.accessory.length} item(s)`);
  }

  return `Outfit for ${outfit.occasion}\nRating: ${outfit.rating}/5\n\n${description.join('\n')}`;
};