import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { API_CONFIG } from '../../config/api';
import Base64 from 'react-native-base64';

// Image analysis result from Gemini
export type ImageAnalysisResult = {
  hasPerson: boolean;
  hasClothing: boolean;
  clothingType?: string;
  confidence: number;
};

// Exponential backoff retry logic as recommended by Remove.bg API
const MAX_RETRIES = 5;
const callApiWithExponentialBackoff = async (apiCall: () => Promise<Response>): Promise<Response> => {
  let retry = true;
  let retries = 0;

  while (retry && retries < MAX_RETRIES) {
    try {
      const response = await apiCall();
      
      if (response.ok) {
        return response;
      } else if (response.status === 429 || response.status >= 500) {
        // Retry on rate limit or server errors
        retry = true;
      } else {
        // Don't retry on client errors (4xx except 429)
        retry = false;
        return response;
      }
    } catch (error) {
      // Retry on network errors
      retry = true;
    }

    if (retry && retries < MAX_RETRIES) {
      const waitTime = Math.pow(2, retries) + Math.random(); // random_number in seconds
      console.log(`Remove.bg API retry ${retries + 1}/${MAX_RETRIES} after ${waitTime.toFixed(2)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000)); // convert to milliseconds
      retries++;
    }
  }

  throw new Error(`API call failed after ${MAX_RETRIES} retries`);
};

/**
 * Analyze image using Gemini to detect if it contains people and clothing
 * This helps optimize the background removal process
 */
const analyzeImageContent = async (imageUri: string): Promise<ImageAnalysisResult | null> => {
  try {
    // Check if Gemini API key is configured
    if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      console.log('Gemini API key not configured, skipping image pre-analysis');
      return null;
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Determine image MIME type
    const extension = imageUri.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    
    // Create prompt for image content analysis
    const prompt = `Analyze this image and return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, no explanations, just the raw JSON):

{
  "hasPerson": true/false,
  "hasClothing": true/false,
  "clothingType": "description of clothing item if visible, or null",
  "confidence": 0.0-1.0
}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object, nothing else
- hasPerson: true if a person is visible in the image
- hasClothing: true if clothing/apparel is visible
- clothingType: brief description (e.g., "t-shirt", "jeans", "dress") or null
- confidence: how confident you are in the analysis (0.0 to 1.0)`;

    const apiUrl = `${API_CONFIG.GEMINI_API_URL}/${API_CONFIG.GEMINI_MODEL}:generateContent`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_CONFIG.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 256,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      console.warn('Gemini image analysis failed, continuing without pre-analysis');
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return null;
    }

    // Parse JSON response
    let parsedResult: ImageAnalysisResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        return null;
      }
    }

    console.log('Image analysis result:', {
      hasPerson: parsedResult.hasPerson,
      hasClothing: parsedResult.hasClothing,
      clothingType: parsedResult.clothingType,
    });

    return parsedResult;
  } catch (error) {
    console.warn('Error analyzing image content with Gemini:', error);
    return null; // Return null on error, don't block the process
  }
};

/**
 * Remove background and extract only the clothing/apparel from an image.
 * If a person is visible in the image, this function will focus on extracting
 * only the clothing items, removing both the background and the person.
 * 
 * Uses Remove.bg API with optimized parameters based on image content analysis.
 * Optionally uses Gemini to pre-analyze the image for better parameter selection.
 */
export const removeBackground = async (
  imageUri: string,
  options?: {
    usePreAnalysis?: boolean;
    removeBgType?: 'auto' | 'person' | 'product' | 'car' | 'animal' | 'graphic' | 'transportation';
  }
): Promise<string> => {
  const startTime = Date.now();
  let analysisResult: ImageAnalysisResult | null = null;
  
  try {
    // If no API key is provided, fall back to simple image optimization
    if (!API_CONFIG.REMOVEBG_API_KEY || API_CONFIG.REMOVEBG_API_KEY === 'YOUR_API_KEY_HERE') {
      console.warn('Remove.bg API key not provided, using fallback');
      return await fallbackBackgroundRemoval(imageUri);
    }

    // Optional: Pre-analyze image with Gemini to optimize parameters
    if (options?.usePreAnalysis !== false) {
      try {
        analysisResult = await analyzeImageContent(imageUri);
      } catch (error) {
        console.warn('Pre-analysis failed, using default parameters:', error);
      }
    }

    // Determine optimal Remove.bg type based on analysis
    let removeBgType = options?.removeBgType || API_CONFIG.REMOVEBG_TYPE;
    
    if (analysisResult) {
      if (analysisResult.hasPerson && analysisResult.hasClothing) {
        // Person wearing clothing - use 'product' to extract just the clothing
        removeBgType = 'product';
        console.log('Detected person with clothing, using "product" type for optimal extraction');
      } else if (analysisResult.hasClothing && !analysisResult.hasPerson) {
        // Just clothing, no person - 'product' is still best
        removeBgType = 'product';
        console.log('Detected clothing without person, using "product" type');
      } else if (analysisResult.hasPerson && !analysisResult.hasClothing) {
        // Person but unclear if clothing - try 'person' first, fallback to 'product'
        removeBgType = 'person';
        console.log('Detected person, using "person" type');
      }
    }

    // Create FormData following Remove.bg API specification
    const formData = new FormData();
    formData.append('image_file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);
    formData.append('size', API_CONFIG.REMOVEBG_SIZE);
    formData.append('format', API_CONFIG.REMOVEBG_FORMAT);
    formData.append('type', removeBgType);
    // Enable crop for better results
    formData.append('crop', 'true');

    console.log(`Starting background removal with type: ${removeBgType}`);

    // Call Remove.bg API with exponential backoff retry logic
    const apiResponse = await callApiWithExponentialBackoff(async () => {
      return await fetch(API_CONFIG.REMOVEBG_API_URL, {
        method: 'POST',
        headers: {
          'X-Api-Key': API_CONFIG.REMOVEBG_API_KEY,
        },
        body: formData,
      });
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      let errorMessage = `Remove.bg API error: ${apiResponse.status}`;
      
      // Try to parse error for better messaging
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors) {
          errorMessage += ` - ${JSON.stringify(errorData.errors)}`;
        } else if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }

      // If using 'person' type and it failed, try 'product' as fallback
      if (removeBgType === 'person' && (apiResponse.status === 400 || apiResponse.status === 422)) {
        console.log('Person type failed, retrying with product type...');
        return await removeBackground(imageUri, { ...options, removeBgType: 'product', usePreAnalysis: false });
      }

      throw new Error(errorMessage);
    }

    // Save the processed image directly to a temporary file
    const tempUri = `${FileSystem.cacheDirectory}processed_${Date.now()}.png`;
    
    // Convert response to base64 and save
    const arrayBuffer = await apiResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert Uint8Array to binary string
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    
    // Convert to base64 using react-native-base64
    const base64String = Base64.encode(binaryString);
    
    await FileSystem.writeAsStringAsync(tempUri, base64String, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Background removal completed successfully in ${duration}s`);
    
    return tempUri;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`Background removal failed after ${duration}s:`, error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        analysisResult,
      });
    }
    
    console.warn('Falling back to local image optimization');
    return await fallbackBackgroundRemoval(imageUri);
  }
};

// Fallback background removal (simple image optimization)
const fallbackBackgroundRemoval = async (imageUri: string): Promise<string> => {
  try {
    console.log('Using fallback background removal (local image optimization)');
    
    // Get image info first to preserve aspect ratio
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.PNG }
    );

    // Calculate aspect ratio preserving resize
    const aspectRatio = imageInfo.width / imageInfo.height;
    const maxSize = 800; // Increased from 400 for better quality
    let newWidth = maxSize;
    let newHeight = maxSize;

    if (aspectRatio > 1) {
      // Landscape: fit to width
      newHeight = maxSize / aspectRatio;
    } else {
      // Portrait or square: fit to height
      newWidth = maxSize * aspectRatio;
    }

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          },
        },
      ],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.PNG,
        base64: false,
      }
    );
    
    console.log('Fallback background removal completed, using optimized image');
    console.warn('Note: Background was not actually removed. Consider configuring Remove.bg API for better results.');
    return result.uri;
  } catch (error) {
    console.error('Fallback background removal failed:', error);
    console.warn('Returning original image as last resort');
    return imageUri; // Return original if all fails
  }
};

// Alternative: Simple edge detection-based background removal
export const simpleBackgroundRemoval = async (imageUri: string): Promise<string> => {
  // This is a placeholder implementation
  // In a real app, you would:
  // 1. Use a machine learning model for background segmentation
  // 2. Apply edge detection algorithms
  // 3. Use color-based segmentation
  // 4. Integrate with cloud services like remove.bg
  
  return removeBackground(imageUri);
};

/**
 * Trim transparent pixels from an image
 * This function removes transparent borders around the apparel item
 * Note: Remove.bg already includes cropping when 'crop: true' is set,
 * so this function primarily serves as a validation step
 * @param processedImageUri - The image with background already removed
 * @param originalImageUri - The original image URI (optional, for re-processing if needed)
 */
export const trimTransparentPixels = async (
  processedImageUri: string, 
  originalImageUri?: string
): Promise<string> => {
  try {
    // Since we now use 'crop: true' in removeBackground, the image should already be trimmed
    // This function now primarily validates the result
    console.log('Validating processed image (Remove.bg already includes cropping)');
    
    // Check if the processed image exists and is valid
    const fileInfo = await FileSystem.getInfoAsync(processedImageUri);
    if (!fileInfo.exists) {
      console.warn('Processed image not found, returning original if available');
      return originalImageUri || processedImageUri;
    }

    // Remove.bg with crop=true already handles trimming, so we can return as-is
    // If we wanted to do additional local trimming, we could add it here
    // but it's usually not necessary since Remove.bg does a good job
    
    console.log('Image validation complete');
    return processedImageUri;
  } catch (error) {
    console.warn('Error validating trimmed image:', error);
    return processedImageUri; // Return processed image if validation fails
  }
};

export const processImageForWardrobe = async (
  imageUri: string,
  options?: {
    usePreAnalysis?: boolean;
  }
): Promise<{
  processedUri: string;
  originalUri: string;
}> => {
  const startTime = Date.now();
  console.log('Starting image processing pipeline...');
  
  try {
    // Step 1: Remove background (with optional Gemini pre-analysis)
    console.log('Step 1/2: Removing background...');
    const noBackgroundUri = await removeBackground(imageUri, {
      usePreAnalysis: options?.usePreAnalysis,
    });
    
    // Step 2: Validate/trim transparent pixels
    console.log('Step 2/2: Validating processed image...');
    const trimmedUri = await trimTransparentPixels(noBackgroundUri, imageUri);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Image processing pipeline completed in ${duration}s`);
    
    return {
      processedUri: trimmedUri,
      originalUri: imageUri,
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`Image processing pipeline failed after ${duration}s:`, error);
    throw error;
  }
};

// Check Remove.bg API account status and credits
export const checkRemoveBgAccount = async (): Promise<{
  credits: number;
  enterprise: boolean;
  error?: string;
}> => {
  try {
    if (!API_CONFIG.REMOVEBG_API_KEY || API_CONFIG.REMOVEBG_API_KEY === 'YOUR_API_KEY_HERE') {
      return { credits: 0, enterprise: false, error: 'API key not configured' };
    }

    console.log('Checking Remove.bg account status...');
    const response = await fetch('https://api.remove.bg/v1.0/account', {
      method: 'GET',
      headers: {
        'X-Api-Key': API_CONFIG.REMOVEBG_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors) {
          errorMessage += ` - ${JSON.stringify(errorData.errors)}`;
        } else if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
      
      console.error('Remove.bg account check failed:', errorMessage);
      return { credits: 0, enterprise: false, error: errorMessage };
    }

    const data = await response.json();
    const result = {
      credits: data.credits || 0,
      enterprise: data.enterprise || false,
    };
    
    console.log('Remove.bg account status:', {
      credits: result.credits,
      enterprise: result.enterprise,
    });
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Network error: ${error}`;
    console.error('Error checking Remove.bg account:', errorMessage);
    return { credits: 0, enterprise: false, error: errorMessage };
  }
};


