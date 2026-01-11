import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export const saveImageToLocal = async (uri: string, filename: string): Promise<string> => {
  try {
    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) {
      throw new Error('Document directory not available');
    }
    const directory = `${documentDirectory}images/`;
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    
    const localUri = `${directory}${filename}`;
    
    // Copy file to local storage
    await FileSystem.copyAsync({
      from: uri,
      to: localUri,
    });
    
    return localUri;
  } catch (error) {
    console.error('Error saving image to local:', error);
    // Fallback: return the original URI if local saving fails
    return uri;
  }
};

export const deleteImageFromLocal = async (imagePath: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imagePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(imagePath);
    }
  } catch (error) {
    console.warn('Failed to delete image:', error);
  }
};

export const resizeImage = async (uri: string, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
  try {
    // First, get the image dimensions to calculate proper resize
    const imageInfo = await ImageManipulator.manipulateAsync(
      uri,
      [], // No operations, just get info
      { format: ImageManipulator.SaveFormat.PNG }
    );

    // Calculate the aspect ratio preserving resize
    const aspectRatio = imageInfo.width / imageInfo.height;
    let newWidth = maxWidth;
    let newHeight = maxHeight;

    if (aspectRatio > 1) {
      // Landscape: fit to width
      newHeight = maxWidth / aspectRatio;
    } else {
      // Portrait or square: fit to height
      newWidth = maxHeight * aspectRatio;
    }

    // Ensure we don't exceed the maximum dimensions
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = maxWidth / aspectRatio;
    }
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          },
        },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.PNG,
      }
    );
    
    console.log(`Resized image from ${imageInfo.width}x${imageInfo.height} to ${Math.round(newWidth)}x${Math.round(newHeight)} (aspect ratio preserved)`);
    return result.uri;
  } catch (error) {
    console.warn('Error resizing image with aspect ratio preservation, falling back to simple resize:', error);
    
    // Fallback to simple resize if the aspect ratio calculation fails
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.PNG,
      }
    );
    
    return result.uri;
  }
};

export const cropImage = async (uri: string, crop: { x: number; y: number; width: number; height: number }): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: crop.x,
          originY: crop.y,
          width: crop.width,
          height: crop.height,
        },
      },
    ],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.PNG,
    }
  );
  
  return result.uri;
};

export const generateUniqueFilename = (extension: string = 'png'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}.${extension}`;
};
