import * as FileSystem from 'expo-file-system/legacy';
import Base64 from 'react-native-base64';
import { API_CONFIG } from '../../config/api';
import { Category } from '../types';
import { CATEGORIES, STYLES, OCCASIONS } from '../../constants/taxonomy';

export type ApparelAnalysisResult = {
  category: Category;
  colors: string[]; // HEX color codes
  styles: string[];
  occasions: string[];
};

/**
 * Convert image URI to base64 string for OpenAI API
 */
const imageUriToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to convert image to base64');
  }
};

/**
 * Map AI-detected category to valid Category type
 * Must match database constraint: ('tshirt', 'shirt', 'bottom', 'skirt', 'shorts', 'footwear', 'outerwear', 'blazer', 'accessory')
 */
const mapCategory = (detectedCategory: string): Category => {
  const lower = detectedCategory.toLowerCase().trim();
  
  // Valid categories that match the database constraint exactly
  const VALID_CATEGORIES: Category[] = ['tshirt', 'shirt', 'bottom', 'skirt', 'shorts', 'footwear', 'outerwear', 'blazer', 'accessory'];
  
  // Direct matches - check against valid categories first
  if (VALID_CATEGORIES.includes(lower as Category)) {
    return lower as Category;
  }
  
  // Fuzzy matching for common variations
  const categoryMap: Record<string, Category> = {
    't-shirt': 'tshirt',
    't shirt': 'tshirt',
    'tshirt': 'tshirt',
    'tee': 'tshirt',
    'tank top': 'tshirt',
    'blouse': 'tshirt',
    'sweater': 'tshirt',
    'hoodie': 'tshirt',
    'pants': 'bottom',
    'jeans': 'bottom',
    'trousers': 'bottom',
    'dress pants': 'bottom',
    'shoes': 'footwear',
    'sneakers': 'footwear',
    'boots': 'footwear',
    'sandals': 'footwear',
    'heels': 'footwear',
    'jacket': 'outerwear',
    'coat': 'outerwear',
    'suit jacket': 'blazer',
    'sports jacket': 'blazer',
    'hat': 'accessory',
    'cap': 'accessory',
    'scarf': 'accessory',
    'belt': 'accessory',
  };
  
  // Try to map to a valid category
  const mapped = categoryMap[lower];
  if (mapped && VALID_CATEGORIES.includes(mapped)) {
    return mapped;
  }
  
  // Default to 'tshirt' if no match found (always valid)
  console.warn(`Category "${detectedCategory}" could not be mapped to a valid category. Defaulting to "tshirt".`);
  return 'tshirt';
};

/**
 * Validate and format HEX color codes from AI response
 * Only accepts actual HEX codes extracted from the image
 */
const mapColors = (detectedColors: string[]): string[] => {
  const hexColors: string[] = [];
  
  for (const color of detectedColors) {
    const trimmed = color.trim();
    
    // Only accept valid HEX codes (format: #RRGGBB)
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      hexColors.push(trimmed.toUpperCase());
    } else if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
      // Accept HEX codes without # prefix
      hexColors.push(`#${trimmed.toUpperCase()}`);
    }
    // Skip color names - we only want actual HEX codes from the image
  }
  
  // Remove duplicates
  return Array.from(new Set(hexColors));
};

/**
 * Map AI-detected styles to valid styles
 */
const mapStyles = (detectedStyles: string[]): string[] => {
  const validStyles = STYLES as readonly string[];
  const lower = detectedStyles.map(s => s.toLowerCase().trim());
  
  return lower.filter(style => validStyles.includes(style));
};

/**
 * Map AI-detected occasions to valid occasions
 */
const mapOccasions = (detectedOccasions: string[]): string[] => {
  const validOccasions = OCCASIONS as readonly string[];
  const lower = detectedOccasions.map(o => o.toLowerCase().trim());
  
  return lower.filter(occasion => validOccasions.includes(occasion));
};

// Exponential backoff retry logic for OpenAI API
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const callOpenAIApiWithRetry = async (
  apiCall: () => Promise<Response>,
  retries: number = 0
): Promise<Response> => {
  try {
    const response = await apiCall();
    
    if (response.ok) {
      return response;
    }
    
    // Check for quota/billing errors - don't retry these
    // Status 402 (Payment Required) or 403 (Forbidden) often indicate quota/billing issues
    if (response.status === 402 || response.status === 403) {
      // Don't retry quota/billing errors - they won't be fixed by retrying
      // The main error handler will provide a detailed message
      return response;
    }
    
    // Handle rate limit errors (429) with retry
    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        // Check for retry-after header
        const retryAfter = response.headers.get('retry-after');
        let waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries); // Exponential backoff
        
        if (retryAfter) {
          // Use the retry-after value if provided (in seconds)
          waitTime = parseInt(retryAfter, 10) * 1000;
        }
        
        console.log(`Rate limit hit. Retrying after ${waitTime / 1000} seconds... (attempt ${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callOpenAIApiWithRetry(apiCall, retries + 1);
      } else {
        // Max retries reached - read error response
        let errorMessage = 'Rate limit exceeded. Please wait a few minutes and try again.';
        
        try {
          const errorText = await response.text();
          // Try to extract more info from error response
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // Ignore parse errors
          }
        } catch (e) {
          // If we can't read the response, use default message
          console.warn('Could not read error response:', e);
        }
        
        throw new Error(errorMessage);
      }
    }
    
    // For other errors, don't retry
    return response;
  } catch (error) {
    // Network errors - retry with exponential backoff
    if (retries < MAX_RETRIES && error instanceof TypeError) {
      const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries);
      console.log(`Network error. Retrying after ${waitTime / 1000} seconds... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callOpenAIApiWithRetry(apiCall, retries + 1);
    }
    throw error;
  }
};

/**
 * Analyze apparel image using OpenAI Vision API
 * 
 * Uses GPT-4o-mini (or gpt-4o) for image analysis with vision capabilities.
 * Documentation: https://platform.openai.com/docs/guides/images-vision
 * 
 * The API accepts images as base64-encoded strings in the format:
 * data:image/{mimeType};base64,{base64Image}
 */
export const analyzeApparelImage = async (imageUri: string): Promise<ApparelAnalysisResult> => {
  try {
    // Check if API key is configured
    if (!API_CONFIG.OPENAI_API_KEY || API_CONFIG.OPENAI_API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('OpenAI API key not configured');
    }

    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Determine image MIME type from URI
    const extension = imageUri.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    
    // Create the prompt for structured analysis
    const prompt = `You are analyzing a clothing/apparel item image. Analyze the image and return a JSON object with the following exact structure:
{
  "category": "one of: tshirt, shirt, bottom, skirt, shorts, footwear, outerwear, blazer, accessory",
  "colors": ["array of 1-3 dominant colors as HEX codes (format: #RRGGBB) extracted from the actual image"],
  "styles": ["array of 1-4 applicable styles from: minimalist, vintage, bohemian, preppy, streetwear, elegant, casual, sporty, romantic, edgy, classic, trendy"],
  "occasions": ["array of 1-4 suitable occasions from: casual, work, formal, party, sport, date, travel, wedding, interview, dinner"]
}

IMPORTANT: For colors, you MUST analyze the actual pixel colors in the image and return HEX codes (e.g., #FF5733, #2E86AB) that represent the real colors present in the clothing item. Do NOT use generic color names - extract the actual color values from the image. Return ONLY the JSON object, no additional text or markdown formatting.`;

    // Call OpenAI Vision API with retry logic
    const response = await callOpenAIApiWithRetry(() =>
      fetch(API_CONFIG.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.OPENAI_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error: ${response.status}`;
      let isQuotaError = false;
      
      // Try to extract detailed error message first
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          const apiErrorMessage = errorData.error.message.toLowerCase();
          
          // Check for quota/billing related errors
          if (
            apiErrorMessage.includes('quota') ||
            apiErrorMessage.includes('billing') ||
            apiErrorMessage.includes('exceeded') ||
            apiErrorMessage.includes('insufficient') ||
            apiErrorMessage.includes('payment')
          ) {
            isQuotaError = true;
            errorMessage = 'You have exceeded your OpenAI API quota. Please check your billing and add credits to your account at https://platform.openai.com/account/billing';
          } else {
            errorMessage = errorData.error.message;
          }
        }
      } catch (e) {
        // If parsing fails, check status codes
        if (response.status === 402 || response.status === 403) {
          isQuotaError = true;
          errorMessage = 'You have exceeded your OpenAI API quota. Please check your billing and add credits to your account at https://platform.openai.com/account/billing';
        }
      }
      
      // Handle other status codes
      if (!isQuotaError) {
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key at https://platform.openai.com/api-keys';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a few minutes and try again.';
        } else if (response.status === 500) {
          errorMessage = 'OpenAI server error. Please try again later.';
        } else if (response.status === 503) {
          errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
        }
      }
      
      console.error('OpenAI API error:', errorText);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    // Parse JSON response
    let parsedResult: any;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Map and validate the results
    const result: ApparelAnalysisResult = {
      category: mapCategory(parsedResult.category || 'tshirt'),
      colors: mapColors(parsedResult.colors || []),
      styles: mapStyles(parsedResult.styles || []),
      occasions: mapOccasions(parsedResult.occasions || []),
    };

    // Ensure at least one color is returned
    if (result.colors.length === 0) {
      result.colors = ['#808080']; // Default to gray if no colors detected
    }

    return result;
  } catch (error) {
    console.error('Error analyzing apparel image:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to analyze image with AI');
  }
};

