// Layout constants for consistent spacing and sizing - Minimalistic Design
export const LAYOUT = {
  // Spacing - Generous spacing for minimalistic feel
  spacing: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  
  // Border radius - Consistent rounded corners throughout
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },
  
  // Component sizes - Optimized for minimalistic design
  sizes: {
    // Cards - Larger for better visual hierarchy and transparent image display
    cardHeight: 160,
    outfitCardHeight: 240, // Increased to accommodate full outfit display
    
    // Buttons - Comfortable touch targets
    buttonHeight: 48,
    buttonHeightSmall: 36,
    buttonHeightLarge: 56,
    
    // Icons - Balanced sizing
    iconSmall: 18,
    iconMedium: 24,
    iconLarge: 32,
    iconXLarge: 64,
    
    // Badges - Subtle sizing
    badgeSize: 28,
    
    // Color swatches - Larger for better visibility
    colorSwatch: 20,
    
    // Floating action button - Prominent but not overwhelming
    fabSize: 60,
  },
  
  // Elevation/shadow - Subtle shadows for depth
  elevation: {
    low: 1,
    medium: 3,
    high: 6,
  },
  
  // Shadow properties - Soft, neutral shadows
  shadow: {
    color: '#000000',
    offset: { width: 0, height: 2 },
    opacity: 0.08,
    radius: 4,
  },
  
  // Glass effect properties - Frosty glass/glassmorphism styling
  glass: {
    // Shadow properties for glass effect depth
    shadow: {
      color: '#000000',
      offset: { width: 0, height: 2 },
      opacity: 0.08,
      radius: 4,
      elevation: 2,
    },
    // Light shadow variant
    shadowLight: {
      color: '#000000',
      offset: { width: 0, height: 1 },
      opacity: 0.05,
      radius: 3,
      elevation: 1,
    },
    // Heavy shadow variant for more depth
    shadowHeavy: {
      color: '#000000',
      offset: { width: 0, height: 4 },
      opacity: 0.12,
      radius: 8,
      elevation: 4,
    },
  },
  
  // Additional minimalistic design tokens
  design: {
    // Typography scale
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    
    // Line heights for better readability
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
    
    // Font weights
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Outfit item height scaling - Fixed relative scaling for consistent display
  outfitItemHeights: {
    bottomwear: '50%',   // Pants, jeans, trousers, shorts, skirts
    topwear: '37.5%',    // T-shirts, shirts, blouses (reduced by 25%)
    dress: '100%',       // Dresses span full height
  },
} as const;
