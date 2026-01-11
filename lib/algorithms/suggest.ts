import { WardrobeItem } from '../types';
import { calculateOutfitCompatibility } from './compatibility';

export interface OutfitSuggestion {
  items: WardrobeItem[];
  score: number;
  explanation: string;
  category: 'complete' | 'partial';
}

/**
 * Generate outfit suggestions using random selection algorithm
 */
export const generateOutfitSuggestions = async (
  wardrobe: WardrobeItem[],
  occasion?: string,
  maxSuggestions: number = 10,
  useAI: boolean = false
): Promise<OutfitSuggestion[]> => {
  console.log('🔍 Generating random suggestions for wardrobe:', wardrobe.length, 'items');
  
  // Use random suggestion algorithm
  return generateRandomSuggestions(wardrobe, occasion, maxSuggestions);
};

/**
 * Random outfit suggestion algorithm that avoids duplicates
 */
const generateRandomSuggestions = (
  wardrobe: WardrobeItem[],
  occasion?: string,
  maxSuggestions: number = 10
): OutfitSuggestion[] => {
  const suggestions: OutfitSuggestion[] = [];
  const usedCombinations = new Set<string>();
  
  // Group items by category
  const itemsByCategory = wardrobe.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);
  
  // Filter by occasion if specified
  if (occasion) {
    Object.keys(itemsByCategory).forEach(category => {
      itemsByCategory[category] = itemsByCategory[category].filter(item =>
        item.occasions.includes(occasion)
      );
    });
  }
  
  // Get items from different categories
  const topwear = [
    ...(itemsByCategory.tshirt || []),
    ...(itemsByCategory.shirt || []),
  ];
  const bottomwear = [
    ...(itemsByCategory.bottom || []),
    ...(itemsByCategory.skirt || []),
    ...(itemsByCategory.shorts || []),
  ];
  const footwear = itemsByCategory.footwear || [];
  const accessories = itemsByCategory.accessory || [];
  const outerwear = itemsByCategory.outerwear || [];
  const blazers = itemsByCategory.blazer || [];
  
  console.log('📂 Available items: Topwear:', topwear.length, 'Bottomwear:', bottomwear.length, 
    'Footwear:', footwear.length, 'Accessories:', accessories.length);
  
  // Helper function to create a unique key for a combination
  const getCombinationKey = (items: WardrobeItem[]): string => {
    return items
      .map(item => item.id)
      .sort()
      .join('|');
  };
  
  // Helper function to randomly select an item from an array, weighted by rating
  const randomSelectWeighted = (items: WardrobeItem[]): WardrobeItem | null => {
    if (items.length === 0) return null;
    
    // Calculate weights based on ratings (higher rating = higher weight)
    const weights = items.map(item => {
      const rating = item.rating ?? 0.5;
      // Convert 0-1 rating to weight (0.5 = weight 1, 1.0 = weight 3, 0.0 = weight 0.1)
      return 0.1 + (rating * 2.9);
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    // Fallback to last item
    return items[items.length - 1];
  };
  
  // Helper function to randomly select an item from an array (uniform)
  const randomSelect = (items: WardrobeItem[]): WardrobeItem | null => {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  };
  
  // Generate random unique combinations
  let attempts = 0;
  const maxAttempts = maxSuggestions * 50; // Try up to 50x the desired number
  
  while (suggestions.length < maxSuggestions && attempts < maxAttempts) {
    attempts++;
    
    const items: WardrobeItem[] = [];
    
    // Try to create a complete outfit (top + bottom + optional items)
    if (topwear.length > 0 && bottomwear.length > 0) {
      const top = randomSelectWeighted(topwear);
      const bottom = randomSelectWeighted(bottomwear);
      
      if (top && bottom) {
        items.push(top, bottom);
        
        // Randomly add optional items (70% chance for footwear, 50% for accessory, 30% for outerwear/blazer)
        if (footwear.length > 0 && Math.random() < 0.7) {
          const shoe = randomSelectWeighted(footwear);
          if (shoe) items.push(shoe);
        }
        
        if (accessories.length > 0 && Math.random() < 0.5) {
          const accessory = randomSelectWeighted(accessories);
          if (accessory) items.push(accessory);
        }
        
        if (outerwear.length > 0 && Math.random() < 0.3) {
          const coat = randomSelectWeighted(outerwear);
          if (coat) items.push(coat);
        }
        
        if (blazers.length > 0 && Math.random() < 0.3) {
          const blazer = randomSelectWeighted(blazers);
          if (blazer) items.push(blazer);
        }
      }
    } else if (topwear.length > 0) {
      // Only topwear available
      const top = randomSelectWeighted(topwear);
      if (top) {
        items.push(top);
        if (footwear.length > 0 && Math.random() < 0.7) {
          const shoe = randomSelectWeighted(footwear);
          if (shoe) items.push(shoe);
        }
      }
    } else if (bottomwear.length > 0) {
      // Only bottomwear available
      const bottom = randomSelectWeighted(bottomwear);
      if (bottom) {
        items.push(bottom);
        if (footwear.length > 0 && Math.random() < 0.7) {
          const shoe = randomSelectWeighted(footwear);
          if (shoe) items.push(shoe);
        }
      }
    } else {
      // No topwear or bottomwear, create combinations from available items
      const availableCategories = Object.keys(itemsByCategory).filter(
        cat => itemsByCategory[cat].length > 0
      );
      
      if (availableCategories.length >= 2) {
        // Select 2-4 random items from different categories
        const numItems = Math.min(4, Math.max(2, availableCategories.length));
        const selectedCategories = new Set<string>();
        
        while (items.length < numItems && selectedCategories.size < availableCategories.length) {
          const category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
          if (!selectedCategories.has(category)) {
            selectedCategories.add(category);
            const item = randomSelectWeighted(itemsByCategory[category]);
            if (item) items.push(item);
          }
        }
      }
    }
    
    // Check if we have at least 2 items and it's a unique combination
    if (items.length >= 2) {
      const key = getCombinationKey(items);
      
      if (!usedCombinations.has(key)) {
        usedCombinations.add(key);
        
        // Calculate compatibility score
        const compatibility = calculateOutfitCompatibility(items, occasion);
        
        suggestions.push({
          items: items,
          score: compatibility.score,
          explanation: compatibility.explanation,
          category: isCompleteOutfit(items) ? 'complete' : 'partial',
        });
      }
    }
  }
  
  console.log(`✅ Generated ${suggestions.length} unique random suggestions after ${attempts} attempts`);
  
  // Sort by score (higher rated items will naturally score higher due to rating bonus)
  return suggestions.sort((a, b) => b.score - a.score);
};

/**
 * Rule-based outfit suggestion algorithm (kept for reference, not used by default)
 */
const generateRuleBasedSuggestions = (
  wardrobe: WardrobeItem[],
  occasion?: string,
  maxSuggestions: number = 10
): OutfitSuggestion[] => {
  const suggestions: OutfitSuggestion[] = [];
  
  // Group items by category and sort by rating (higher rated items first)
  const itemsByCategory = wardrobe.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);
  
  // Sort items within each category by rating (descending)
  Object.keys(itemsByCategory).forEach(category => {
    itemsByCategory[category].sort((a, b) => (b.rating ?? 0.5) - (a.rating ?? 0.5));
  });

  console.log('📂 Items by category:', Object.keys(itemsByCategory).map(cat => 
    `${cat}: ${itemsByCategory[cat].length}`
  ).join(', '));

  // Generate combinations
  const combinations = generateCombinations(itemsByCategory);
  console.log('🔄 Generated combinations:', combinations.length);
  
  // Score and filter combinations
  let scoredCount = 0;
  let filteredCount = 0;
  
  for (const combination of combinations) {
    const compatibility = calculateOutfitCompatibility(combination, occasion);
    scoredCount++;
    
    console.log(`📊 Combination ${scoredCount}: ${combination.map(i => `${i.category} (${i.colors[0] || 'no color'})`).join(' + ')} - Score: ${compatibility.score.toFixed(3)}`);
    
    // Lower the threshold to be more inclusive
    if (compatibility.score < 0.2) {
      filteredCount++;
      continue;
    }
    
    suggestions.push({
      items: combination,
      score: compatibility.score,
      explanation: compatibility.explanation,
      category: isCompleteOutfit(combination) ? 'complete' : 'partial',
    });
  }
  
  console.log(`✅ Scored ${scoredCount} combinations, filtered out ${filteredCount}, kept ${suggestions.length}`);
  
  // Sort by score and return top suggestions
  const result = suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
    
  console.log('🎯 Final suggestions:', result.length);
  return result;
};

const generateCombinations = (itemsByCategory: Record<string, WardrobeItem[]>): WardrobeItem[][] => {
  const combinations: WardrobeItem[][] = [];
  const combinationSet = new Set<string>();
  
  console.log('🔧 Generating unique combinations...');
  
  // Get all items from essential categories
  const topwear = [
    ...(itemsByCategory.tshirt || []),
    ...(itemsByCategory.shirt || []),
  ];
  const bottomwear = [
    ...(itemsByCategory.bottom || []),
    ...(itemsByCategory.skirt || []),
    ...(itemsByCategory.shorts || []),
  ];
  const footwear = itemsByCategory.footwear || [];
  const accessories = itemsByCategory.accessory || [];
  
  console.log(`📊 Available items: Topwear: ${topwear.length}, Bottomwear: ${bottomwear.length}, Footwear: ${footwear.length}, Accessories: ${accessories.length}`);
  
  // Helper function to create a unique key for a combination
  const getCombinationKey = (items: WardrobeItem[]): string => {
    return items
      .map(item => item.id)
      .sort()
      .join('|');
  };
  
  // Helper function to add combination if unique
  const addIfUnique = (combo: WardrobeItem[]) => {
    const key = getCombinationKey(combo);
    if (!combinationSet.has(key) && combo.length > 0) {
      combinationSet.add(key);
      combinations.push(combo);
    }
  };
  
  // Generate unique combinations ensuring each has topwear, bottomwear, accessory, and footwear
  // Start with base: topwear + bottomwear
  for (const top of topwear) {
    for (const bottom of bottomwear) {
      const base = [top, bottom];
      
      // Add footwear and accessory to create complete unique combinations
      if (footwear.length > 0 && accessories.length > 0) {
        // Try to create combinations with one footwear and one accessory
        for (const shoe of footwear) {
          for (const accessory of accessories) {
            addIfUnique([...base, shoe, accessory]);
          }
        }
      }
      
      // Also add combinations with just footwear
      if (footwear.length > 0) {
        for (const shoe of footwear) {
          addIfUnique([...base, shoe]);
        }
      }
      
      // Also add combinations with just accessory
      if (accessories.length > 0) {
        for (const accessory of accessories) {
          addIfUnique([...base, accessory]);
        }
      }
      
      // Add base combination (top + bottom only)
      addIfUnique(base);
    }
  }
  
  // If no topwear or bottomwear, create partial combinations
  if (topwear.length === 0 && bottomwear.length > 0) {
    for (const bottom of bottomwear) {
      if (footwear.length > 0 && accessories.length > 0) {
        for (const shoe of footwear) {
          for (const accessory of accessories) {
            addIfUnique([bottom, shoe, accessory]);
          }
        }
      }
    }
  }
  
  if (bottomwear.length === 0 && topwear.length > 0) {
    for (const top of topwear) {
      if (footwear.length > 0 && accessories.length > 0) {
        for (const shoe of footwear) {
          for (const accessory of accessories) {
            addIfUnique([top, shoe, accessory]);
          }
        }
      }
    }
  }
  
  console.log(`🎯 Generated ${combinations.length} unique combinations`);
  return combinations;
};


const isCompleteOutfit = (items: WardrobeItem[]): boolean => {
  const categories = new Set(items.map(item => item.category));
  return categories.has('tshirt') && categories.has('bottom');
};

export const getOccasionBasedSuggestions = async (
  wardrobe: WardrobeItem[],
  occasion: string,
  maxSuggestions: number = 5,
  useAI: boolean = false
): Promise<OutfitSuggestion[]> => {
  // Filter items that are suitable for the occasion
  const suitableItems = wardrobe.filter(item => 
    item.occasions.includes(occasion)
  );
  
  if (suitableItems.length === 0) {
    return [];
  }
  
  return generateOutfitSuggestions(suitableItems, occasion, maxSuggestions, useAI);
};

export const getRandomOutfitSuggestion = async (
  wardrobe: WardrobeItem[],
  occasion?: string,
  useAI: boolean = false
): Promise<OutfitSuggestion | null> => {
  const suggestions = await generateOutfitSuggestions(wardrobe, occasion, 1, useAI);
  return suggestions.length > 0 ? suggestions[0] : null;
};

/**
 * Generate outfit suggestions for a shopping item combined with wardrobe items
 * The shopping item is always included in every suggestion
 */
export const generateShoppingSuggestions = (
  shoppingItem: WardrobeItem,
  wardrobe: WardrobeItem[],
  occasion?: string,
  maxSuggestions: number = 15
): OutfitSuggestion[] => {
  console.log('🛍️ Generating shopping suggestions for item:', shoppingItem.category);
  
  if (wardrobe.length === 0) {
    console.log('⚠️ No wardrobe items available for suggestions');
    return [];
  }

  const suggestions: OutfitSuggestion[] = [];
  const usedCombinations = new Set<string>();

  // Group wardrobe items by category
  const itemsByCategory = wardrobe.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);

  // Filter by occasion if specified
  if (occasion) {
    Object.keys(itemsByCategory).forEach(category => {
      itemsByCategory[category] = itemsByCategory[category].filter(item =>
        item.occasions.includes(occasion)
      );
    });
  }

  // Get items from different categories
  const topwear = [
    ...(itemsByCategory.tshirt || []),
    ...(itemsByCategory.shirt || []),
  ];
  const bottomwear = [
    ...(itemsByCategory.bottom || []),
    ...(itemsByCategory.skirt || []),
    ...(itemsByCategory.shorts || []),
  ];
  const footwear = itemsByCategory.footwear || [];
  const accessories = itemsByCategory.accessory || [];
  const outerwear = itemsByCategory.outerwear || [];
  const blazers = itemsByCategory.blazer || [];

  // Helper function to create a unique key for a combination
  const getCombinationKey = (items: WardrobeItem[]): string => {
    return items
      .map(item => item.id)
      .sort()
      .join('|');
  };

  // Helper function to randomly select an item from an array, weighted by rating
  const randomSelectWeighted = (items: WardrobeItem[]): WardrobeItem | null => {
    if (items.length === 0) return null;
    
    const weights = items.map(item => {
      const rating = item.rating ?? 0.5;
      return 0.1 + (rating * 2.9);
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  };

  // Determine what category the shopping item is
  const shoppingCategory = shoppingItem.category;
  const isShoppingTop = shoppingCategory === 'tshirt' || shoppingCategory === 'shirt';
  const isShoppingBottom = shoppingCategory === 'bottom' || shoppingCategory === 'skirt' || shoppingCategory === 'shorts';
  const isShoppingFootwear = shoppingCategory === 'footwear';
  const isShoppingAccessory = shoppingCategory === 'accessory';
  const isShoppingOuterwear = shoppingCategory === 'outerwear' || shoppingCategory === 'blazer';

  // Generate combinations based on shopping item category
  let attempts = 0;
  const maxAttempts = maxSuggestions * 50;

  while (suggestions.length < maxSuggestions && attempts < maxAttempts) {
    attempts++;
    
    const items: WardrobeItem[] = [shoppingItem]; // Always include shopping item

    if (isShoppingTop) {
      // Shopping item is a top, add bottomwear and optional items
      if (bottomwear.length > 0) {
        const bottom = randomSelectWeighted(bottomwear);
        if (bottom) items.push(bottom);
      }
      
      // Add optional items
      if (footwear.length > 0 && Math.random() < 0.7) {
        const shoe = randomSelectWeighted(footwear);
        if (shoe) items.push(shoe);
      }
      
      if (accessories.length > 0 && Math.random() < 0.5) {
        const accessory = randomSelectWeighted(accessories);
        if (accessory) items.push(accessory);
      }
      
      if (outerwear.length > 0 && Math.random() < 0.3) {
        const coat = randomSelectWeighted(outerwear);
        if (coat) items.push(coat);
      }
      
      if (blazers.length > 0 && Math.random() < 0.3) {
        const blazer = randomSelectWeighted(blazers);
        if (blazer) items.push(blazer);
      }
    } else if (isShoppingBottom) {
      // Shopping item is a bottom, add topwear and optional items
      if (topwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        if (top) items.push(top);
      }
      
      // Add optional items
      if (footwear.length > 0 && Math.random() < 0.7) {
        const shoe = randomSelectWeighted(footwear);
        if (shoe) items.push(shoe);
      }
      
      if (accessories.length > 0 && Math.random() < 0.5) {
        const accessory = randomSelectWeighted(accessories);
        if (accessory) items.push(accessory);
      }
      
      if (outerwear.length > 0 && Math.random() < 0.3) {
        const coat = randomSelectWeighted(outerwear);
        if (coat) items.push(coat);
      }
      
      if (blazers.length > 0 && Math.random() < 0.3) {
        const blazer = randomSelectWeighted(blazers);
        if (blazer) items.push(blazer);
      }
    } else if (isShoppingFootwear) {
      // Shopping item is footwear, add top and bottom
      if (topwear.length > 0 && bottomwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        const bottom = randomSelectWeighted(bottomwear);
        if (top && bottom) {
          items.push(top, bottom);
        }
      } else if (topwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        if (top) items.push(top);
      } else if (bottomwear.length > 0) {
        const bottom = randomSelectWeighted(bottomwear);
        if (bottom) items.push(bottom);
      }
      
      // Add optional items
      if (accessories.length > 0 && Math.random() < 0.5) {
        const accessory = randomSelectWeighted(accessories);
        if (accessory) items.push(accessory);
      }
      
      if (outerwear.length > 0 && Math.random() < 0.3) {
        const coat = randomSelectWeighted(outerwear);
        if (coat) items.push(coat);
      }
    } else if (isShoppingAccessory) {
      // Shopping item is an accessory, add top and bottom
      if (topwear.length > 0 && bottomwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        const bottom = randomSelectWeighted(bottomwear);
        if (top && bottom) {
          items.push(top, bottom);
        }
      } else if (topwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        if (top) items.push(top);
      } else if (bottomwear.length > 0) {
        const bottom = randomSelectWeighted(bottomwear);
        if (bottom) items.push(bottom);
      }
      
      // Add optional items
      if (footwear.length > 0 && Math.random() < 0.7) {
        const shoe = randomSelectWeighted(footwear);
        if (shoe) items.push(shoe);
      }
      
      if (outerwear.length > 0 && Math.random() < 0.3) {
        const coat = randomSelectWeighted(outerwear);
        if (coat) items.push(coat);
      }
    } else if (isShoppingOuterwear) {
      // Shopping item is outerwear, add top and bottom
      if (topwear.length > 0 && bottomwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        const bottom = randomSelectWeighted(bottomwear);
        if (top && bottom) {
          items.push(top, bottom);
        }
      } else if (topwear.length > 0) {
        const top = randomSelectWeighted(topwear);
        if (top) items.push(top);
      } else if (bottomwear.length > 0) {
        const bottom = randomSelectWeighted(bottomwear);
        if (bottom) items.push(bottom);
      }
      
      // Add optional items
      if (footwear.length > 0 && Math.random() < 0.7) {
        const shoe = randomSelectWeighted(footwear);
        if (shoe) items.push(shoe);
      }
      
      if (accessories.length > 0 && Math.random() < 0.5) {
        const accessory = randomSelectWeighted(accessories);
        if (accessory) items.push(accessory);
      }
    } else {
      // Unknown category, try to add any compatible items
      if (topwear.length > 0 && Math.random() < 0.5) {
        const top = randomSelectWeighted(topwear);
        if (top) items.push(top);
      }
      
      if (bottomwear.length > 0 && Math.random() < 0.5) {
        const bottom = randomSelectWeighted(bottomwear);
        if (bottom) items.push(bottom);
      }
      
      if (footwear.length > 0 && Math.random() < 0.5) {
        const shoe = randomSelectWeighted(footwear);
        if (shoe) items.push(shoe);
      }
    }

    // Check if we have at least 2 items (shopping item + at least one wardrobe item) and it's unique
    if (items.length >= 2) {
      const key = getCombinationKey(items);
      
      if (!usedCombinations.has(key)) {
        usedCombinations.add(key);
        
        // Calculate compatibility score
        const compatibility = calculateOutfitCompatibility(items, occasion);
        
        suggestions.push({
          items: items,
          score: compatibility.score,
          explanation: compatibility.explanation,
          category: isCompleteOutfit(items) ? 'complete' : 'partial',
        });
      }
    }
  }

  console.log(`✅ Generated ${suggestions.length} unique shopping suggestions after ${attempts} attempts`);
  
  // Sort by score (highest first)
  return suggestions.sort((a, b) => b.score - a.score);
};


