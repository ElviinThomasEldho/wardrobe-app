import { WardrobeItem } from '../types';

// Simple color harmony calculation
const getColorHarmony = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0.5;
  
  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
  
  // Calculate hue difference
  let hueDiff = Math.abs(hsl1.h - hsl2.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;
  
  // Calculate saturation and lightness differences
  const satDiff = Math.abs(hsl1.s - hsl2.s);
  const lightDiff = Math.abs(hsl1.l - hsl2.l);
  
  // Simple harmony scoring
  let harmonyScore = 0.5; // Base score
  
  // Monochromatic (same hue family)
  if (hueDiff <= 15) {
    harmonyScore = 0.9;
    if (lightDiff > 30) harmonyScore = 1.0;
  }
  // Analogous colors (30° apart)
  else if (hueDiff <= 30) {
    harmonyScore = 0.85;
  }
  // Complementary colors (180° apart)
  else if (hueDiff >= 170 && hueDiff <= 190) {
    harmonyScore = 0.8;
  }
  // Neutral colors (low saturation)
  else if (hsl1.s < 20 || hsl2.s < 20) {
    harmonyScore = 0.6;
  }
  // Other combinations
  else {
    harmonyScore = 0.4;
  }
  
  // Adjustments based on saturation and lightness
  if (satDiff > 60) harmonyScore *= 0.7;
  else if (satDiff > 40) harmonyScore *= 0.85;
  
  if (lightDiff > 70) harmonyScore *= 0.6;
  else if (lightDiff > 50) harmonyScore *= 0.8;
  
  return Math.max(0, Math.min(1, harmonyScore));
};

// Helper functions for color conversion
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export interface CompatibilityScore {
  score: number;
  explanation: string;
  breakdown: {
    colorHarmony: number;
    styleCompatibility: number;
    occasionFit: number;
    diversityBonus: number;
    itemRatingBonus: number;
    penalties: number;
  };
}

export const calculateOutfitCompatibility = (
  items: WardrobeItem[],
  targetOccasion?: string
): CompatibilityScore => {
  if (items.length === 0) {
    return {
      score: 0,
      explanation: 'No items to evaluate',
      breakdown: {
        colorHarmony: 0,
        styleCompatibility: 0,
        occasionFit: 0,
        diversityBonus: 0,
        itemRatingBonus: 0,
        penalties: 0,
      },
    };
  }

  let colorHarmony = 0;
  let styleCompatibility = 0;
  let occasionFit = 0;
  let diversityBonus = 0;
  let itemRatingBonus = 0;
  let penalties = 0;

  // Color harmony scoring
  const colorPairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1Colors = items[i].colors;
      const item2Colors = items[j].colors;
      
      let maxHarmony = 0;
      for (const color1 of item1Colors) {
        for (const color2 of item2Colors) {
          const harmony = getColorHarmony(color1, color2);
          maxHarmony = Math.max(maxHarmony, harmony);
        }
      }
      colorPairs.push(maxHarmony);
    }
  }
  
  colorHarmony = colorPairs.length > 0 
    ? colorPairs.reduce((sum, harmony) => sum + harmony, 0) / colorPairs.length 
    : 0.5; // Neutral score for single items

  // Style compatibility scoring
  const allStyles = items.flatMap(item => item.styles);
  const styleCounts = allStyles.reduce((acc, style) => {
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Bonus for shared styles, penalty for too many conflicting styles
  const sharedStyleBonus = Object.values(styleCounts)
    .filter(count => count > 1)
    .reduce((sum, count) => sum + (count - 1) * 0.1, 0);
  
  styleCompatibility = Math.min(1, 0.5 + sharedStyleBonus);

  // Occasion fit scoring
  if (targetOccasion) {
    const occasionMatches = items.filter(item => 
      item.occasions.includes(targetOccasion)
    ).length;
    occasionFit = occasionMatches / items.length;
  } else {
    // Check for internal occasion consistency
    const allOccasions = items.flatMap(item => item.occasions);
    const occasionCounts = allOccasions.reduce((acc, occasion) => {
      acc[occasion] = (acc[occasion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxOccasionCount = Math.max(...Object.values(occasionCounts));
    occasionFit = maxOccasionCount / items.length;
  }

  // Diversity bonus (reward having different categories)
  const categories = new Set(items.map(item => item.category));
  diversityBonus = Math.min(0.3, categories.size * 0.1);

  // Item rating bonus (reward using items with higher ratings)
  const averageRating = items.reduce((sum, item) => sum + (item.rating ?? 0.5), 0) / items.length;
  // Convert average rating (0-1) to a bonus (0-0.2)
  itemRatingBonus = averageRating * 0.2;

  // Penalties
  // Penalty for duplicate items
  const duplicatePenalty = items.length - new Set(items.map(item => item.id)).size;
  penalties += duplicatePenalty * 0.2;

  // Penalty for too many items of same color family
  const colorFamilies = items.map(item => item.colors[0]);
  const colorFamilyCounts = colorFamilies.reduce((acc, color) => {
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxColorFamilyCount = Math.max(...Object.values(colorFamilyCounts));
  if (maxColorFamilyCount > items.length * 0.6) {
    penalties += 0.2;
  }

  // Calculate final score with more balanced weighting
  const finalScore = Math.max(0, Math.min(1, 
    colorHarmony * 0.30 +
    styleCompatibility * 0.20 +
    occasionFit * 0.20 +
    diversityBonus * 0.10 +
    itemRatingBonus * 0.20 -
    penalties * 0.5  // Reduce penalty impact
  ));

  // Generate explanation
  const explanations = [];
  
  // Color harmony feedback
  if (colorHarmony > 0.8) explanations.push('Excellent color harmony');
  else if (colorHarmony > 0.6) explanations.push('Good color combination');
  else if (colorHarmony > 0.4) explanations.push('Decent color pairing');
  else explanations.push('Colors could be more harmonious');

  // Style compatibility feedback
  if (styleCompatibility > 0.7) explanations.push('Styles work well together');
  else if (styleCompatibility > 0.5) explanations.push('Styles are compatible');
  else if (styleCompatibility > 0.3) explanations.push('Styles are somewhat compatible');
  else explanations.push('Styles might clash');

  // Occasion fit feedback
  if (occasionFit > 0.8) explanations.push('Perfect for the occasion');
  else if (occasionFit > 0.6) explanations.push('Suitable for the occasion');
  else if (occasionFit > 0.4) explanations.push('Somewhat suitable for the occasion');
  else explanations.push('May not be ideal for the occasion');

  // Diversity feedback
  if (diversityBonus > 0.2) explanations.push('Good variety of pieces');
  else if (diversityBonus > 0.1) explanations.push('Decent variety');
  
  // Penalty feedback
  if (penalties > 0.1) explanations.push('Some items may be redundant');

  return {
    score: finalScore,
    explanation: explanations.join('. '),
    breakdown: {
      colorHarmony,
      styleCompatibility,
      occasionFit,
      diversityBonus,
      itemRatingBonus,
      penalties,
    },
  };
};


