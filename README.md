# Wardrobe Planner

A React Native Expo app to help you plan your daily outfits by cataloging your clothes, suggesting combinations, and sharing your looks.

## Features

### 📸 Photo Management
- **Capture clothing photos** using camera or gallery
- **Automatic background removal** (placeholder implementation)
- **Color extraction** from clothing items
- **Local storage** of all images

### 🏷️ Smart Tagging
- **Automatic color detection** with palette extraction
- **Manual style tagging** (minimalist, vintage, bohemian, etc.)
- **Occasion tagging** (casual, work, formal, party, etc.)
- **Category organization** (tshirt, bottom, footwear, outerwear, accessory)

### 👗 Outfit Management
- **Create custom outfits** by combining items
- **Compatibility scoring** based on colors, styles, and occasions
- **Outfit rating system** (1-5 stars)
- **Outfit history** and management

### 🤖 Smart Suggestions
- **AI-powered outfit suggestions** based on your wardrobe
- **Occasion-based recommendations** (work, party, casual, etc.)
- **Compatibility explanations** for each suggestion
- **Rule-based algorithm** for color harmony and style matching

### 📤 Sharing
- **Share outfit images** via native share sheet
- **Export outfit data** as JSON
- **Beautiful outfit cards** for social media

### ⚙️ Customization
- **Custom occasions** and styles
- **Editable taxonomies**
- **Settings management**

## Description

Wardrobe Planner is a comprehensive React Native mobile application that helps users organize their clothing, create outfit combinations, and receive AI-powered style suggestions. The app allows users to catalog their wardrobe items with photos, extract color palettes, and get intelligent outfit recommendations based on color harmony, style compatibility, and occasion appropriateness.

## Technologies Used

- **Framework**: Expo 54.0.23 (managed workflow)
- **Language**: TypeScript 5.9.2
- **Navigation**: Expo Router 6.0.14
- **Database**: SQLite (expo-sqlite 16.0.9)
- **Storage**: Local file system (expo-file-system 19.0.16)
- **Image Processing**: 
  - expo-image-manipulator 14.0.7
  - expo-image-picker 17.0.8
  - expo-camera 17.0.9
- **Cloud Storage**: Cloudinary 2.7.0
- **Color Processing**: colord 2.9.3
- **Sharing**: expo-sharing 14.0.7
- **UI Framework**: 
  - NativeWind 4.2.1 (Tailwind CSS for React Native)
  - Tailwind CSS 3.4.18
- **Icons**: 
  - @expo/vector-icons 15.0.2
  - react-icons 5.5.0
- **React Native**: 0.81.5
- **React**: 19.1.0
- **Additional Libraries**:
  - react-native-view-shot 4.0.3 (for outfit cards)
  - react-native-gesture-handler 2.28.0
  - react-native-reanimated 4.1.2
  - react-native-safe-area-context 5.6.1

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wardrobe-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## Development Scripts

- `npm start` - Start the Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser
- `npm run lint` - Run ESLint for code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run lint:css` - Run Stylelint for CSS quality
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
wardrobe-app/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx     # Wardrobe screen
│   │   ├── outfits/      # Outfits management
│   │   └── suggest/      # Suggestions screen
│   ├── add.tsx           # Add item screen
│   ├── item/[id].tsx     # Item detail screen
│   ├── outfits/create.tsx # Create outfit screen
│   └── settings.tsx      # Settings screen
├── components/            # Reusable components
│   ├── ItemCard.tsx
│   ├── OutfitCard.tsx
│   ├── OutfitSuggestionCard.tsx
│   └── ShareableOutfit.tsx
├── lib/                   # Core functionality
│   ├── db.ts             # Database operations
│   ├── files.ts          # File management
│   ├── share.ts          # Sharing functionality
│   ├── types.ts          # TypeScript types
│   ├── image/            # Image processing
│   └── algorithms/       # Suggestion algorithms
├── constants/            # App constants
│   └── taxonomy.ts       # Categories, occasions, styles
└── assets/              # Images and icons
```

## Key Features Implementation

### Database Schema
- **items**: Clothing items with metadata
- **outfits**: Saved outfit combinations
- **outfit_items**: Many-to-many relationship
- **user_prefs**: Custom taxonomies

### Color Harmony Algorithm
- Hue distance calculation
- Complementary, analogous, and triadic relationships
- Saturation and brightness penalties
- Neutral color handling

### Outfit Compatibility Scoring
- Color harmony (40% weight)
- Style compatibility (30% weight)
- Occasion fit (20% weight)
- Diversity bonus (10% weight)
- Penalties for duplicates and clashes

### Background Removal
- Placeholder implementation using expo-image-manipulator
- In production, integrate with services like remove.bg
- On-device processing for privacy

## Development Notes

### Native Modules
Some packages require native modules and need to be built with EAS:
- `react-native-image-colors`
- `react-native-view-shot`

### Build Configuration
For production builds, configure EAS Build:

```bash
npm install -g @expo/cli
expo install expo-dev-client
eas build --platform all
```

### Permissions
The app requires:
- Camera permission for taking photos
- Photo library access for selecting images
- File system access for local storage

## Future Enhancements

- **Weather integration** for weather-appropriate suggestions
- **Machine learning** for improved suggestions
- **Cloud sync** for multi-device access
- **Social features** for sharing with friends
- **Advanced background removal** with AI
- **Barcode scanning** for clothing identification
- **Seasonal recommendations** based on weather data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
