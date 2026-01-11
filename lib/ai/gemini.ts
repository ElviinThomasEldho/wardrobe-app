import * as FileSystem from 'expo-file-system/legacy';
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
 * Convert image URI to base64 string for Gemini API
 * Handles both local file paths and HTTP URLs
 */
const imageUriToBase64 = async (uri: string): Promise<string> => {
  try {
    // Handle HTTP/HTTPS URLs - download and save temporarily, then read as base64
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        // Download the image to a temporary file
        const tempFileName = `temp_image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(
          uri,
          `${FileSystem.cacheDirectory}${tempFileName}`
        );
        
        if (downloadResult.status !== 200) {
          throw new Error(`Failed to download image: ${downloadResult.status}`);
        }
        
        // Read the downloaded file as base64
        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Clean up temporary file (fire and forget)
        FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
        
        return base64;
      } catch (downloadError) {
        console.error('Error downloading image:', downloadError);
        throw new Error(`Failed to download image from URL: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
      }
    }
    
    // Handle local file paths
    // Ensure file:// prefix is present if it's a local path
    let fileUri = uri;
    if (!uri.startsWith('file://') && !uri.startsWith('http')) {
      fileUri = `file://${uri}`;
    }
    
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

// Exponential backoff retry logic for Gemini API
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const callGeminiApiWithRetry = async (
  apiCall: () => Promise<Response>,
  retries: number = 0
): Promise<Response> => {
  try {
    const response = await apiCall();
    
    if (response.ok) {
      return response;
    }
    
    // Client errors that shouldn't be retried (4xx except 429)
    // 400: Bad Request - invalid request format
    // 401: Unauthorized - invalid API key
    // 402: Payment Required - billing issue
    // 403: Forbidden - quota/billing issue
    // 404: Not Found - model not found
    if ([400, 401, 402, 403, 404].includes(response.status)) {
      return response;
    }
    
    // Server errors and rate limits that should be retried
    // 429: Rate Limit - temporary, should retry
    // 500: Internal Server Error - transient server issue
    // 502: Bad Gateway - transient network issue
    // 503: Service Unavailable - temporary service issue
    // 504: Gateway Timeout - request timeout, might succeed on retry
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    if (retryableStatuses.includes(response.status)) {
      if (retries < MAX_RETRIES) {
        // Check for retry-after header (especially for 429)
        const retryAfter = response.headers.get('retry-after');
        let waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries); // Exponential backoff
        
        if (retryAfter) {
          // Use the retry-after value if provided (in seconds)
          waitTime = parseInt(retryAfter, 10) * 1000;
        }
        
        const statusText = response.status === 429 ? 'Rate limit hit' :
                          response.status === 500 ? 'Internal server error' :
                          response.status === 502 ? 'Bad gateway' :
                          response.status === 503 ? 'Service unavailable' :
                          'Gateway timeout';
        
        console.log(`${statusText} (${response.status}). Retrying after ${waitTime / 1000} seconds... (attempt ${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callGeminiApiWithRetry(apiCall, retries + 1);
      } else {
        // Max retries reached - read error response for better error message
        let errorMessage = `Server error (${response.status}). Max retries reached.`;
        
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
    // Network errors and other exceptions - retry with exponential backoff
    // This includes: TypeError (network failures), fetch errors, etc.
    if (retries < MAX_RETRIES) {
      // Check if it's a network-related error that might be transient
      const isNetworkError = error instanceof TypeError || 
                            error instanceof Error && (
                              error.message.includes('fetch') ||
                              error.message.includes('network') ||
                              error.message.includes('timeout') ||
                              error.message.includes('ECONNREFUSED') ||
                              error.message.includes('ENOTFOUND')
                            );
      
      if (isNetworkError) {
        const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries);
        console.log(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying after ${waitTime / 1000} seconds... (attempt ${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callGeminiApiWithRetry(apiCall, retries + 1);
      }
    }
    throw error;
  }
};

/**
 * Analyze apparel image using Google Gemini Vision API
 * 
 * Uses Gemini 1.5 Flash (or Pro) for image analysis with vision capabilities.
 * Documentation: https://ai.google.dev/gemini-api/docs
 * 
 * The API accepts images as base64-encoded strings in the format:
 * { mime_type: "image/png", data: base64Image }
 */
export const analyzeApparelImage = async (imageUri: string): Promise<ApparelAnalysisResult> => {
  try {
    // Check if API key is configured
    if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('Gemini API key not configured');
    }

    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Determine image MIME type from URI
    const extension = imageUri.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    
    // Create the prompt for structured analysis
    const prompt = `Analyze this clothing/apparel item image and return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, no explanations, just the raw JSON):

{
  "category": "one of: tshirt, shirt, bottom, skirt, shorts, footwear, outerwear, blazer, accessory",
  "colors": ["array of 1-3 dominant colors as HEX codes (format: #RRGGBB) extracted from the actual image"],
  "styles": ["array of 1-4 applicable styles from: minimalist, vintage, bohemian, preppy, streetwear, elegant, casual, sporty, romantic, edgy, classic, trendy"],
  "occasions": ["array of 1-4 suitable occasions from: casual, work, formal, party, sport, date, travel, wedding, interview, dinner"]
}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object, nothing else
- For colors, analyze actual pixel colors and return HEX codes (e.g., #FF5733, #2E86AB)
- Do NOT use generic color names
- Do NOT wrap in markdown code blocks
- Do NOT add any explanatory text before or after the JSON`;

    // Build Gemini API URL
    // Format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    // API key is passed in header, not query parameter
    const apiUrl = `${API_CONFIG.GEMINI_API_URL}/${API_CONFIG.GEMINI_MODEL}:generateContent`;

    // Call Gemini Vision API with retry logic
    const response = await callGeminiApiWithRetry(() =>
      fetch(apiUrl, {
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
            temperature: 0.4,
            top_k: 32,
            top_p: 1,
            max_output_tokens: 1024, // Increased to handle full JSON response
            response_mime_type: 'application/json',
          },
        }),
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error: ${response.status}`;
      let isQuotaError = false;
      
      // Log full error for debugging
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        url: apiUrl,
      });
      
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
            apiErrorMessage.includes('payment') ||
            apiErrorMessage.includes('resource exhausted')
          ) {
            isQuotaError = true;
            errorMessage = 'You have exceeded your Gemini API quota. Please check your usage limits at https://aistudio.google.com/app/apikey';
          } else {
            errorMessage = errorData.error.message;
          }
        }
        
        // Check for specific error codes
        if (errorData.error?.code) {
          console.error('Gemini API error code:', errorData.error.code);
        }
      } catch (e) {
        // If parsing fails, check status codes
        if (response.status === 402 || response.status === 403) {
          isQuotaError = true;
          errorMessage = 'You have exceeded your Gemini API quota. Please check your usage limits at https://aistudio.google.com/app/apikey';
        }
      }
      
      // Handle other status codes
      if (!isQuotaError) {
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your Gemini API key at https://aistudio.google.com/app/apikey';
        } else if (response.status === 400) {
          errorMessage = `Bad request: ${errorText.substring(0, 200)}. Please check the API request format.`;
        } else if (response.status === 404) {
          errorMessage = `Model '${API_CONFIG.GEMINI_MODEL}' not found. Please check available models at https://ai.google.dev/models/gemini. Try using 'gemini-2.5-flash' or 'gemini-2.5-pro'.`;
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a few minutes and try again.';
        } else if (response.status === 500) {
          errorMessage = 'Gemini server error. Please try again later.';
        } else if (response.status === 503) {
          // 503 could be temporary or a request format issue
          errorMessage = `Gemini service temporarily unavailable (503). Error details: ${errorText.substring(0, 200)}. Please check your API request format or try again later.`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // Gemini API response structure: data.candidates[0].content.parts[0].text
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const content = candidate?.content?.parts?.[0]?.text;
    
    // Check if response was truncated
    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini API response was truncated (MAX_TOKENS). Response structure:', JSON.stringify(data, null, 2));
      throw new Error('AI response was too long and was truncated. Please try again or use a simpler image.');
    }
    
    if (!content) {
      console.error('Gemini API response structure:', JSON.stringify(data, null, 2));
      console.error('Finish reason:', finishReason);
      throw new Error(`No response text from Gemini API. Finish reason: ${finishReason || 'unknown'}`);
    }

    // Log the raw content for debugging
    console.log('Gemini API raw response content:', content.substring(0, 500));

    // Parse JSON response
    let parsedResult: any;
    try {
      // First, try to parse directly
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.warn('Direct JSON parse failed, trying alternative methods...');
      
      // Try to extract JSON from markdown code blocks
      let jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.warn('Failed to parse JSON from markdown block');
        }
      }
      
      // If still not parsed, try to find JSON object in the content
      if (!parsedResult) {
        // Try to find a JSON object pattern
        jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.warn('Failed to parse JSON from extracted pattern');
          }
        }
      }
      
      // If still not parsed, try to clean the content
      if (!parsedResult) {
        // Remove common prefixes/suffixes that AI might add
        let cleanedContent = content.trim();
        // Remove leading text before first {
        const firstBrace = cleanedContent.indexOf('{');
        if (firstBrace > 0) {
          cleanedContent = cleanedContent.substring(firstBrace);
        }
        // Remove trailing text after last }
        const lastBrace = cleanedContent.lastIndexOf('}');
        if (lastBrace > 0 && lastBrace < cleanedContent.length - 1) {
          cleanedContent = cleanedContent.substring(0, lastBrace + 1);
        }
        
        try {
          parsedResult = JSON.parse(cleanedContent);
        } catch (e) {
          // Try one more time with more aggressive cleaning
          // Remove any trailing commas or incomplete structures
          cleanedContent = cleanedContent.replace(/,\s*}/g, '}'); // Remove trailing commas before }
          cleanedContent = cleanedContent.replace(/,\s*]/g, ']'); // Remove trailing commas before ]
          
          // Try to fix incomplete arrays/objects by finding the last complete structure
          let braceCount = 0;
          let bracketCount = 0;
          let lastValidIndex = cleanedContent.length - 1;
          
          for (let i = 0; i < cleanedContent.length; i++) {
            if (cleanedContent[i] === '{') braceCount++;
            if (cleanedContent[i] === '}') braceCount--;
            if (cleanedContent[i] === '[') bracketCount++;
            if (cleanedContent[i] === ']') bracketCount--;
            
            // If we've closed all braces and brackets, this is a valid end point
            if (braceCount === 0 && bracketCount === 0 && i > 0) {
              lastValidIndex = i;
              break;
            }
          }
          
          if (lastValidIndex < cleanedContent.length - 1) {
            cleanedContent = cleanedContent.substring(0, lastValidIndex + 1);
          }
          
          try {
            parsedResult = JSON.parse(cleanedContent);
          } catch (finalError) {
            console.error('Failed to parse cleaned JSON after all attempts.');
            console.error('Original content length:', content.length);
            console.error('Cleaned content:', cleanedContent);
            console.error('Parse error:', finalError);
            throw new Error(`Failed to parse AI response as JSON. Content preview: ${content.substring(0, 300)}...`);
          }
        }
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

/**
 * Outfit suggestion result from Gemini
 */
export type GeminiOutfitSuggestion = {
  itemIds: string[]; // Array of item IDs that form the outfit
  explanation: string; // Why this outfit works well
  score: number; // Confidence score 0-1
};

/**
 * Suggest outfits using Gemini AI based on user's wardrobe catalog
 * 
 * This function uses Gemini to intelligently suggest outfit combinations
 * from the user's available wardrobe items, considering color harmony,
 * style compatibility, and occasion appropriateness.
 */
export const suggestOutfitsWithGemini = async (
  wardrobeItems: Array<{
    id: string;
    category: string;
    colors: string[];
    styles: string[];
    occasions: string[];
    rating?: number;
  }>,
  occasion?: string,
  maxSuggestions: number = 10
): Promise<GeminiOutfitSuggestion[]> => {
  try {
    // Check if API key is configured
    if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('Gemini API key not configured');
    }

    if (wardrobeItems.length === 0) {
      return [];
    }

    // Format wardrobe items for the prompt
    const wardrobeDescription = wardrobeItems.map(item => {
      const colorNames = item.colors.map(c => {
        // Convert HEX to color name if possible, or keep HEX
        const hex = c.toUpperCase();
        const colorMap: Record<string, string> = {
          '#000000': 'black', '#FFFFFF': 'white', '#FF0000': 'red',
          '#00FF00': 'green', '#0000FF': 'blue', '#FFFF00': 'yellow',
          '#FF00FF': 'magenta', '#00FFFF': 'cyan', '#808080': 'gray',
          '#800000': 'maroon', '#008000': 'olive', '#000080': 'navy',
          '#FFA500': 'orange', '#FFC0CB': 'pink', '#800080': 'purple',
          '#A52A2A': 'brown', '#F5F5DC': 'beige', '#D2B48C': 'tan',
        };
        return colorMap[hex] || hex;
      }).join(', ');

      const rating = item.rating ?? 0.5;
      const ratingDescription = rating >= 0.7 ? 'highly preferred' : rating >= 0.5 ? 'preferred' : rating >= 0.3 ? 'neutral' : 'less preferred';
      
      return `- Item ${item.id}: ${item.category} in ${colorNames || 'various colors'}, styles: ${item.styles.join(', ') || 'none'}, suitable for: ${item.occasions.join(', ') || 'various occasions'}, user preference: ${ratingDescription} (rating: ${rating.toFixed(2)})`;
    }).join('\n');

    // Build the prompt
    const occasionContext = occasion 
      ? ` The user wants outfit suggestions for a "${occasion}" occasion.`
      : '';
    
    const prompt = `You are a fashion stylist AI assistant. Based on the user's wardrobe catalog below, suggest ${maxSuggestions} outfit combinations that work well together.

Wardrobe Catalog:
${wardrobeDescription}
${occasionContext}

For each outfit suggestion, consider:
1. Color harmony and coordination
2. Style compatibility between items
3. Occasion appropriateness${occasion ? ` (focusing on "${occasion}")` : ''}
4. Completeness (ideally include tshirt, bottom, and footwear when available)
5. Fashion trends and best practices
6. User preferences - prioritize items with higher ratings (highly preferred > preferred > neutral > less preferred)

Return a JSON array of outfit suggestions with this exact structure:
[
  {
    "itemIds": ["item-id-1", "item-id-2", "item-id-3"],
    "explanation": "Brief explanation of why this outfit works well (2-3 sentences)",
    "score": 0.85
  }
]

Rules:
- Each outfit should include 2-5 items
- itemIds must be actual IDs from the wardrobe catalog above
- score should be between 0.0 and 1.0 (higher = better outfit)
- Prioritize complete outfits (tshirt + bottom + footwear) when possible
- Avoid suggesting duplicate items in the same outfit
- Make explanations specific and helpful
- Return ONLY the JSON array, no additional text or markdown formatting`;

    // Build Gemini API URL
    const apiUrl = `${API_CONFIG.GEMINI_API_URL}/${API_CONFIG.GEMINI_MODEL}:generateContent`;

    // Call Gemini API with retry logic
    const response = await callGeminiApiWithRetry(() =>
      fetch(apiUrl, {
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
                  text: prompt,
                },
              ],
            },
          ],
          generation_config: {
            temperature: 0.7, // Slightly higher for more creative suggestions
            top_k: 40,
            top_p: 0.95,
            max_output_tokens: 2000,
            response_mime_type: 'application/json',
          },
        }),
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error: ${response.status}`;
      
      // Log full error for debugging
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
      });
      
      // Try to extract detailed error message
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
            apiErrorMessage.includes('payment') ||
            apiErrorMessage.includes('resource exhausted')
          ) {
            errorMessage = 'You have exceeded your Gemini API quota. Please check your usage limits at https://aistudio.google.com/app/apikey';
          } else {
            errorMessage = errorData.error.message;
          }
        }
      } catch (e) {
        // If parsing fails, check status codes
        if (response.status === 402 || response.status === 403) {
          errorMessage = 'You have exceeded your Gemini API quota. Please check your usage limits at https://aistudio.google.com/app/apikey';
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your Gemini API key at https://aistudio.google.com/app/apikey';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a few minutes and try again.';
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('Gemini API response structure:', JSON.stringify(data, null, 2));
      throw new Error('No response text from Gemini API. Check console for response structure.');
    }

    // Parse JSON response
    let parsedResult: GeminiOutfitSuggestion[];
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1]);
      } else {
        console.error('Failed to parse Gemini response:', content);
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and filter suggestions
    const validSuggestions: GeminiOutfitSuggestion[] = [];
    const itemIdSet = new Set(wardrobeItems.map(item => item.id));

    for (const suggestion of parsedResult) {
      // Validate structure
      if (!suggestion.itemIds || !Array.isArray(suggestion.itemIds)) {
        continue;
      }

      // Filter out invalid item IDs
      const validItemIds = suggestion.itemIds.filter((id: string) => itemIdSet.has(id));
      
      if (validItemIds.length < 2) {
        continue; // Skip suggestions with less than 2 valid items
      }

      // Ensure score is valid
      const score = typeof suggestion.score === 'number' 
        ? Math.max(0, Math.min(1, suggestion.score))
        : 0.5;

      validSuggestions.push({
        itemIds: validItemIds,
        explanation: suggestion.explanation || 'A well-coordinated outfit',
        score: score,
      });
    }

    // Sort by score and limit to maxSuggestions
    return validSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);

  } catch (error) {
    console.error('Error suggesting outfits with Gemini:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to suggest outfits with AI');
  }
};

/**
 * Generate AI virtual try-on image using Gemini
 * Takes a person's photo and outfit items, then generates an image of the person wearing the outfit
 */
export const generateVirtualTryOn = async (
  personPhotoUri: string,
  outfitItems: Array<{ imagePath: string; category: string }>
): Promise<string> => {
  try {
    // Check if API key is configured
    if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('Gemini API key not configured');
    }

    // Convert person photo to base64
    const personPhotoBase64 = await imageUriToBase64(personPhotoUri);
    const personExtension = personPhotoUri.split('.').pop()?.toLowerCase();
    const personMimeType = personExtension === 'png' ? 'image/png' : 'image/jpeg';

    // Convert outfit items to base64
    const outfitImages: Array<{ mime_type: string; data: string; category: string }> = [];
    for (const item of outfitItems) {
      try {
        // Normalize image path - handle both local and remote paths
        let imagePath = item.imagePath;
        if (!imagePath.startsWith('http') && !imagePath.startsWith('file://')) {
          imagePath = `file://${imagePath}`;
        }
        
        const itemBase64 = await imageUriToBase64(imagePath);
        
        // Determine MIME type from URL or default to jpeg
        let itemMimeType = 'image/jpeg';
        if (imagePath.includes('.png')) {
          itemMimeType = 'image/png';
        } else if (imagePath.includes('.jpg') || imagePath.includes('.jpeg')) {
          itemMimeType = 'image/jpeg';
        }
        
        outfitImages.push({
          mime_type: itemMimeType,
          data: itemBase64,
          category: item.category,
        });
      } catch (error) {
        console.error(`Failed to load outfit item ${item.imagePath}:`, error);
        // Continue with other items even if one fails
      }
    }

    if (outfitImages.length === 0) {
      throw new Error('No valid outfit items found');
    }

    // Build description of outfit items
    const outfitDescription = outfitImages
      .map((img, idx) => `${idx + 1}. ${img.category}`)
      .join(', ');

    // Create the prompt for virtual try-on
    // Note: Gemini doesn't generate images, but we can use it to create a detailed description
    // that could be used with an image generation service
    const prompt = `You are a fashion AI assistant. I will provide you with:
1. A full-body photo of a person
2. Images of clothing items that make up an outfit

The outfit consists of: ${outfitDescription}.

Please analyze the person's photo and the outfit items, then provide a detailed description of how this outfit would look on the person. Describe:
- How each clothing item would fit and appear on the person
- The overall style and aesthetic
- Color combinations and how they work together
- The layering of items (e.g., outerwear over tops, tops over bottoms)
- How the outfit complements the person's body type and pose

Provide a comprehensive, detailed description that could be used to visualize or generate an image of the person wearing this outfit.`;

    // Build Gemini API URL for image generation
    // Using gemini-2.5-flash which supports image generation
    const apiUrl = `${API_CONFIG.GEMINI_API_URL}/${API_CONFIG.GEMINI_MODEL}:generateContent`;

    // Prepare content parts: person photo + outfit items + prompt
    const parts: any[] = [
      {
        inline_data: {
          mime_type: personMimeType,
          data: personPhotoBase64,
        },
      },
    ];

    // Add all outfit item images
    for (const outfitImg of outfitImages) {
      parts.push({
        inline_data: {
          mime_type: outfitImg.mime_type,
          data: outfitImg.data,
        },
      });
    }

    // Add the text prompt
    parts.push({ text: prompt });

    // Call Gemini API with retry logic
    const response = await callGeminiApiWithRetry(() =>
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_CONFIG.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts,
            },
          ],
          generation_config: {
            temperature: 0.7,
            top_k: 40,
            top_p: 0.95,
            max_output_tokens: 4096,
          },
        }),
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // Use default error message
      }
      
      console.error('Gemini virtual try-on error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
      });
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    
    // Log the response for debugging
    console.log('Gemini API response structure:', JSON.stringify(responseData, null, 2).substring(0, 500));
    
    // Extract generated image from response
    // Note: Gemini models don't actually generate images - they only understand them
    // This function attempts to use Gemini's capabilities, but may need a different approach
    if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
      const parts = responseData.candidates[0].content.parts;
      
      // Look for inline_data (base64 image) in the response
      for (const part of parts) {
        if (part.inline_data && part.inline_data.data) {
          // Save the generated image to a temporary file
          const base64Data = part.inline_data.data;
          const mimeType = part.inline_data.mime_type || 'image/png';
          const extension = mimeType === 'image/png' ? 'png' : 'jpg';
          
          // Create a temporary file path
          const fileName = `tryon_${Date.now()}.${extension}`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          
          // Write the base64 image to file
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          return fileUri;
        }
      }
      
      // If no image found, check if there's a text response with image URL or data
      for (const part of parts) {
        if (part.text) {
          console.log('Gemini text response:', part.text.substring(0, 200));
          
          // Try to extract base64 image data from text response
          const base64Match = part.text.match(/data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)/);
          if (base64Match) {
            const extension = base64Match[1] === 'png' ? 'png' : 'jpg';
            const base64Data = base64Match[2];
            const fileName = `tryon_${Date.now()}.${extension}`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            return fileUri;
          }
        }
      }
    }
    
    // Gemini doesn't generate images - it only understands them
    // However, we can use the text response to provide a description
    // For actual image generation, we would need a different service
    let description = '';
    if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
      const parts = responseData.candidates[0].content.parts;
      for (const part of parts) {
        if (part.text) {
          description = part.text;
          break;
        }
      }
    }
    
    // Since Gemini can't generate images, we'll provide a helpful error
    // In the future, this description could be used with an image generation API
    const errorMessage = description 
      ? `Gemini API does not support image generation. However, here's a description: ${description.substring(0, 200)}... For actual virtual try-on images, consider using a specialized service like Replicate's virtual try-on models, or image generation APIs.`
      : 'Gemini API does not support image generation. Virtual try-on requires an image generation model. Consider using a specialized virtual try-on service or an image generation API.';
    
    console.error('Gemini response (no image generation support):', JSON.stringify(responseData, null, 2).substring(0, 1000));
    throw new Error(errorMessage);
  } catch (error) {
    console.error('Error generating virtual try-on:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate virtual try-on image');
  }
};

