// Color palette for the wardrobe app - Neutral & Minimalistic
export const COLORS = {
  // Primary colors - Neutral gray tones
  primary: '#4A4A4A', // Medium gray
  primaryDark: '#2C2C2C', // Dark gray
  primaryLight: '#6B6B6B', // Light gray
  
  // Background colors - Neutral, minimalistic tones
  background: '#F5F5F5', // Light gray background
  surface: '#FFFFFF', // White surface
  surfaceSecondary: '#F8F8F8', // Very light gray
  
  // Text colors - Neutral, sophisticated
  textPrimary: '#1A1A1A', // Near black
  textSecondary: '#6B6B6B', // Medium gray
  textTertiary: '#9E9E9E', // Light gray
  
  // Border colors - Subtle neutral tones
  border: '#E0E0E0', // Light gray border
  borderLight: '#F0F0F0', // Very light gray border
  
  // Status colors - Soft, neutral-friendly
  success: '#66BB6A', // Soft green
  warning: '#FFA726', // Soft orange
  error: '#EF5350', // Soft red
  info: '#42A5F5', // Soft blue
  
  // Rating colors
  rating: '#4A4A4A', // Neutral gray
  ratingEmpty: '#D0D0D0', // Light gray
  
  // Shadow colors - Subtle neutral shadows
  shadow: '#000000',
  
  // Overlay colors - Neutral overlays
  overlay: 'rgba(0, 0, 0, 0.5)', // Dark overlay
  overlayLight: 'rgba(0, 0, 0, 0.2)', // Light overlay
  
  // Category colors - Neutral gray palette
  categoryTshirt: '#6B6B6B', // Medium gray
  categoryBottom: '#8E8E8E', // Gray
  categoryFootwear: '#9E9E9E', // Light gray
  categoryOuterwear: '#B0B0B0', // Very light gray
  categoryAccessory: '#7A7A7A', // Medium-light gray
  
  // Additional neutral colors
  accent: '#4A4A4A', // Medium gray accent
  accentLight: '#E0E0E0', // Light gray accent
  neutral: '#6B6B6B', // Medium gray
  neutralLight: '#D0D0D0', // Light gray
  
  // Glass effect colors - Frosty glass/glassmorphism
  glass: {
    // Background colors with transparency for glass effect
    background: 'rgba(255, 255, 255, 0.7)', // Main glass background
    backgroundLight: 'rgba(255, 255, 255, 0.5)', // Lighter glass background
    backgroundHeavy: 'rgba(255, 255, 255, 0.9)', // Heavier glass background
    backgroundSubtle: 'rgba(255, 255, 255, 0.4)', // Subtle glass background
    
    // Border colors with transparency for glass effect
    border: 'rgba(255, 255, 255, 0.4)', // Main glass border
    borderLight: 'rgba(255, 255, 255, 0.3)', // Lighter glass border
    borderHeavy: 'rgba(255, 255, 255, 0.6)', // Heavier glass border
    
    // Dark glass variants (for dark mode or dark backgrounds)
    darkBackground: 'rgba(0, 0, 0, 0.3)', // Dark glass background
    darkBorder: 'rgba(255, 255, 255, 0.1)', // Dark glass border
  },
} as const;

// Color utility functions
export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'tshirt':
      return COLORS.categoryTshirt;
    case 'bottom':
      return COLORS.categoryBottom;
    case 'footwear':
      return COLORS.categoryFootwear;
    case 'outerwear':
      return COLORS.categoryOuterwear;
    case 'accessory':
      return COLORS.categoryAccessory;
    default:
      return COLORS.textSecondary;
  }
};
