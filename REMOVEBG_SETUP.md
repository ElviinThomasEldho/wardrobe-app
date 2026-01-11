# Remove.bg API Setup Instructions

## Overview
The wardrobe app now integrates with [Remove.bg API](https://www.remove.bg/api) for professional background removal. This provides much better results than the previous placeholder implementation.

## Setup Steps

### 1. Get Remove.bg API Key
1. Go to [https://www.remove.bg/api](https://www.remove.bg/api)
2. Sign up for a free account
3. Navigate to the API dashboard
4. Copy your API key

### 2. Configure the API Key

#### Option A: Environment Variable (Recommended)
Create a `.env` file in your project root:
```bash
EXPO_PUBLIC_REMOVEBG_API_KEY=your_actual_api_key_here
```

#### Option B: Direct Configuration
Edit `config/api.ts` and replace `'YOUR_API_KEY_HERE'` with your actual API key:
```typescript
export const API_CONFIG = {
  REMOVEBG_API_KEY: 'your_actual_api_key_here',
  REMOVEBG_API_URL: 'https://api.remove.bg/v1.0/removebg',
  REMOVEBG_SIZE: 'auto', // 'auto', 'preview', 'small', 'regular', 'full', '50MP'
  REMOVEBG_FORMAT: 'png', // 'png', 'jpg', 'zip'
  REMOVEBG_TYPE: 'auto', // 'auto', 'person', 'product', 'car', 'animal', 'graphic', 'transportation'
};
```

### 3. API Features & Limits
- **Free Tier**: 50 API calls per month
- **Paid Plans**: Available for higher usage
- **Size Options**: 'auto' (smart detection), 'preview', 'small', 'regular', 'full', '50MP'
- **Output Formats**: PNG (transparent), JPG, ZIP
- **Type Detection**: 'auto', 'person', 'product', 'car', 'animal', 'graphic', 'transportation'
- **Max Resolution**: Up to 50 megapixels with 50MP option
- **Rate Limiting**: 500 images per minute (resolution-dependent)

### 4. Advanced Features
- **Exponential Backoff**: Automatic retry with increasing delays
- **Error Handling**: Graceful fallback to local processing
- **Smart Size Detection**: Uses 'auto' for optimal results
- **Transparency Support**: PNG format preserves transparency

### 5. Fallback Behavior
If the API key is not configured or the API call fails, the app will automatically fall back to simple image optimization (resize and compress).

## Testing
1. Add the API key using one of the methods above
2. Restart the development server
3. Try adding a new item with an image
4. The background should be automatically removed
5. Test the reprocess button in item details

## Troubleshooting
- **"API key not provided"**: Make sure you've set the API key correctly
- **"Remove.bg API failed"**: Check your internet connection and API key validity
- **Slow processing**: The API call may take a few seconds, this is normal
- **Rate limiting**: The app automatically retries with exponential backoff
- **Network errors**: Automatic retry on network failures

## Cost Considerations
- Free tier: 50 images per month
- Consider implementing user limits or premium features for production use
- Monitor usage through Remove.bg dashboard

## API Reference
For more details, see the [Remove.bg API Documentation](https://www.remove.bg/api)
