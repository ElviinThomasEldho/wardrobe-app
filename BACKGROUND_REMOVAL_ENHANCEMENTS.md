# Background Removal Enhancements

## Overview
Enhanced the background removal functionality with improved error handling, Gemini-based pre-analysis, and optimized Remove.bg parameters for better clothing extraction.

## Key Improvements

### 1. **Gemini Pre-Analysis** (Optional)
- Uses Gemini Vision API to analyze images before background removal
- Detects if image contains:
  - People (hasPerson)
  - Clothing items (hasClothing)
  - Clothing type (clothingType)
  - Confidence level (confidence)
- Automatically selects optimal Remove.bg parameters based on analysis
- Falls back gracefully if Gemini API is unavailable

### 2. **Optimized Remove.bg Parameters**
- **Smart Type Selection**: Automatically chooses between 'product' and 'person' types based on image content
  - Person + Clothing → 'product' (extracts just the clothing)
  - Clothing only → 'product' (best for isolated items)
  - Person only → 'person' (fallback)
- **Automatic Cropping**: Enabled `crop: true` for better results
- **Fallback Strategy**: If 'person' type fails, automatically retries with 'product' type

### 3. **Enhanced Error Handling**
- Detailed error logging with timestamps
- Better error messages with parsed API responses
- Comprehensive error context (stack traces, analysis results)
- Graceful fallback to local image optimization
- Retry logging with timing information

### 4. **Improved Logging**
- Step-by-step progress logging
- Performance metrics (processing time)
- Analysis results logging
- Retry attempt logging
- Clear error messages

### 5. **Better Fallback Behavior**
- Increased fallback image size from 400px to 800px for better quality
- Clear warnings when fallback is used
- Preserves original image as last resort

## Usage

### Basic Usage (Backward Compatible)
```typescript
// Works exactly as before - no changes needed
const processedUri = await removeBackground(imageUri);
```

### With Pre-Analysis (Recommended)
```typescript
// Enable Gemini pre-analysis for optimal results
const processedUri = await removeBackground(imageUri, {
  usePreAnalysis: true, // Default: true
});
```

### Manual Type Selection
```typescript
// Override automatic type selection
const processedUri = await removeBackground(imageUri, {
  removeBgType: 'product', // 'auto' | 'person' | 'product' | etc.
  usePreAnalysis: false,
});
```

### Full Pipeline
```typescript
// Use the full processing pipeline
const { processedUri, originalUri } = await processImageForWardrobe(imageUri, {
  usePreAnalysis: true, // Optional, defaults to true
});
```

## Configuration

### Enable Pre-Analysis
Pre-analysis is enabled by default. To disable:
```typescript
await removeBackground(imageUri, { usePreAnalysis: false });
```

### API Keys Required
- **Remove.bg API Key**: Required for background removal
  - Set via `EXPO_PUBLIC_REMOVEBG_API_KEY` environment variable
  - Or configure in `config/api.ts`
  
- **Gemini API Key**: Optional, for pre-analysis
  - Set via `EXPO_PUBLIC_GEMINI_API_KEY` environment variable
  - Or configure in `config/api.ts`
  - If not configured, pre-analysis is skipped automatically

## How It Works

1. **Pre-Analysis (Optional)**
   - Gemini analyzes the image to detect people and clothing
   - Results inform parameter selection

2. **Parameter Selection**
   - Based on analysis, selects optimal Remove.bg type
   - Enables cropping for better results

3. **Background Removal**
   - Calls Remove.bg API with optimized parameters
   - Retries with exponential backoff on failures
   - Falls back to alternative type if needed

4. **Validation**
   - Validates processed image
   - Returns optimized result

## Benefits

- **Better Results**: Smart parameter selection improves clothing extraction
- **Handles People**: Automatically removes people while keeping clothing
- **Robust**: Multiple fallback strategies ensure processing always completes
- **Observable**: Comprehensive logging for debugging and monitoring
- **Flexible**: Optional features don't break existing code

## Performance

- **With Pre-Analysis**: ~2-4 seconds (Gemini + Remove.bg)
- **Without Pre-Analysis**: ~1-3 seconds (Remove.bg only)
- **Fallback**: ~0.5-1 second (local optimization)

## Error Handling

All errors are logged with:
- Timestamp
- Error message
- Stack trace (first 500 chars)
- Analysis results (if available)
- Processing duration

The system always falls back gracefully, ensuring images are processed even if APIs fail.

## Future Enhancements

Potential improvements:
- Local ML model for pre-analysis (faster, no API call)
- Batch processing optimization
- Image quality validation
- User feedback loop for result quality

