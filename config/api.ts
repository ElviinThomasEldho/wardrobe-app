// API Configuration
// Get your Remove.bg API key from https://www.remove.bg/api
export const API_CONFIG = {
  REMOVEBG_API_KEY: process.env.EXPO_PUBLIC_REMOVEBG_API_KEY || 'mwnjJdyLjUgN9YfcwV5SSfFZ',
  REMOVEBG_API_URL: 'https://api.remove.bg/v1.0/removebg',
  // Additional Remove.bg API parameters
  REMOVEBG_SIZE: 'auto', // 'auto', 'preview', 'small', 'regular', 'full', '50MP'
  REMOVEBG_FORMAT: 'png', // 'png', 'jpg', 'zip'
  REMOVEBG_TYPE: 'product', // 'auto', 'person', 'product', 'car', 'animal', 'graphic', 'transportation' - using 'product' to focus on clothing items
  // Google Gemini API Configuration
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyD7k5RFO9lRhEe7fbVAwfBMEAIra8LvduM',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  // Model options: 'gemini-2.5-flash' (fast, free tier) or 'gemini-2.5-pro' (more accurate)
  // Both support vision/image analysis. See: https://ai.google.dev/gemini-api/docs/image-understanding
  GEMINI_MODEL: 'gemini-2.5-flash', // Using gemini-2.5-flash for speed and free tier
};

// Instructions for setting up Google Gemini API:
// 1. Go to https://aistudio.google.com/app/apikey
// 2. Create a new API key or use existing one
// 3. Set the environment variable: EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key
// 4. Or replace the API key in this file (not recommended for production)
//
// API Features:
// - Uses Gemini 1.5 Flash for image analysis (supports vision, fast and free tier)
// - Can switch to 'gemini-1.5-pro' for higher accuracy (change GEMINI_MODEL above)
// - Analyzes apparel images to detect category, colors, styles, and occasions
// - Automatic retry with exponential backoff for rate limits
// - Free tier: 15 requests per minute, 1,500 requests per day
//
// Model Options:
// - 'gemini-1.5-flash': Faster, free tier, good accuracy (recommended)
// - 'gemini-1.5-pro': Higher accuracy, better for complex analysis
// - Both support vision/image analysis
// - Documentation: https://ai.google.dev/gemini-api/docs
//
// Rate Limit Management:
// - Free tier: 15 requests per minute, 1,500 requests per day
// - If you hit rate limits, the app will automatically retry
// - Monitor usage at https://aistudio.google.com/app/apikey

// Instructions for setting up Remove.bg API:
// 1. Go to https://www.remove.bg/api
// 2. Sign up for a free account (50 free API calls per month)
// 3. Get your API key from the dashboard
// 4. Set the environment variable: EXPO_PUBLIC_REMOVEBG_API_KEY=your_actual_api_key
// 5. Or replace 'YOUR_API_KEY_HERE' in this file with your actual API key
//
// API Features:
// - Free tier: 50 API calls per month
// - Supports images up to 50 megapixels (with 50MP size option)
// - Automatic retry with exponential backoff
// - Multiple output formats: PNG, JPG, ZIP
// - Smart size detection with 'auto' option
// - Using 'product' type to extract clothing items and remove person if visible
//   This focuses on the apparel as a product, removing both background and person
