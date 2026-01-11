import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WardrobeItem } from '@/lib/types';
import { getItems, updateItem } from '@/lib/supabase-db';
import { generateOutfitSuggestions, getOccasionBasedSuggestions, OutfitSuggestion } from '@/lib/algorithms/suggest';
import { OCCASIONS } from '@/constants/taxonomy';
import SwipeableOutfitCard from '@/components/SwipeableOutfitCard';
import { COLORS } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useOutfits } from '@/contexts/OutfitsContext';
import { getOutfits } from '@/lib/supabase-db';
import { Outfit } from '@/lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SuggestScreen() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [likedOutfits, setLikedOutfits] = useState<OutfitSuggestion[]>([]);
  const [noSuggestionsAvailable, setNoSuggestionsAvailable] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const { addOutfit, addItemToOutfitById } = useOutfits();
  const isInitialMount = useRef(true);
  const previousOccasion = useRef<string>('');

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadItems(), loadSavedOutfits()]);
    };
    initialize();
  }, []);

  // Regenerate suggestions when occasion changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousOccasion.current = selectedOccasion;
      return;
    }

    // Only regenerate if occasion actually changed and we have items
    if (previousOccasion.current !== selectedOccasion && items.length > 0) {
      previousOccasion.current = selectedOccasion;
      // Clear current suggestions and generate new ones
      setSuggestions([]);
      setCurrentIndex(0);
      setLikedOutfits([]);
      setNoSuggestionsAvailable(false);
      generateSuggestions(false); // Don't show alert when auto-regenerating
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOccasion, items.length]);

  const loadItems = async () => {
    try {
      const allItems = await getItems();
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load items:', error);
      Alert.alert('Error', 'Failed to load wardrobe items');
    }
  };

  const loadSavedOutfits = async () => {
    try {
      const outfits = await getOutfits();
      setSavedOutfits(outfits);
    } catch (error) {
      console.error('Failed to load saved outfits:', error);
      // Don't show alert for this, just log the error
    }
  };

  // Helper function to create a unique key for a combination of items
  const getCombinationKey = (items: WardrobeItem[]): string => {
    return items
      .map(item => item.id)
      .sort()
      .join('|');
  };

  // Check if a suggestion matches a saved outfit
  const isOutfitAlreadySaved = (suggestion: OutfitSuggestion): boolean => {
    const suggestionKey = getCombinationKey(suggestion.items);
    
    return savedOutfits.some(outfit => {
      const outfitKey = getCombinationKey(outfit.items);
      return outfitKey === suggestionKey;
    });
  };

  // Filter out duplicates and already saved outfits
  const filterSuggestions = (suggestions: OutfitSuggestion[]): OutfitSuggestion[] => {
    const seen = new Set<string>();
    const filtered: OutfitSuggestion[] = [];
    
    for (const suggestion of suggestions) {
      const key = getCombinationKey(suggestion.items);
      
      // Skip if we've already seen this combination in this batch
      if (seen.has(key)) {
        continue;
      }
      
      // Skip if this outfit is already saved
      if (isOutfitAlreadySaved(suggestion)) {
        continue;
      }
      
      seen.add(key);
      filtered.push(suggestion);
    }
    
    return filtered;
  };

  const generateSuggestions = async (showAlert = true, itemsToUse?: WardrobeItem[]) => {
    const itemsForGeneration = itemsToUse || items;
    
    if (itemsForGeneration.length === 0) {
      if (showAlert) {
        Alert.alert('No Items', 'Please add some items to your wardrobe first');
      }
      setNoSuggestionsAvailable(false);
      return;
    }

    setIsLoading(true);
    setNoSuggestionsAvailable(false);
    try {
      // Reload saved outfits to get the latest data
      await loadSavedOutfits();
      
      console.log('🎯 Generating suggestions with', itemsForGeneration.length, 'items');
      let newSuggestions;
      if (selectedOccasion) {
        newSuggestions = await getOccasionBasedSuggestions(itemsForGeneration, selectedOccasion, 20);
      } else {
        newSuggestions = await generateOutfitSuggestions(itemsForGeneration, undefined, 20);
      }
      console.log('✅ Generated', newSuggestions.length, 'suggestions');
      
      // Filter out duplicates and already saved outfits
      const filteredSuggestions = filterSuggestions(newSuggestions);
      console.log('🔍 Filtered to', filteredSuggestions.length, 'unique suggestions (removed', newSuggestions.length - filteredSuggestions.length, 'duplicates/saved)');
      
      if (filteredSuggestions.length === 0) {
        setNoSuggestionsAvailable(true);
        setSuggestions([]);
      } else {
        setNoSuggestionsAvailable(false);
        setSuggestions(filteredSuggestions);
      }
      setCurrentIndex(0);
      setLikedOutfits([]);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate outfit suggestions';
      if (showAlert) {
        Alert.alert('Error', errorMessage);
      }
      setNoSuggestionsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    // Reload items first to get the latest data, then regenerate suggestions
    try {
      const freshItems = await getItems();
      setItems(freshItems);
      // Generate suggestions with the fresh items
      await generateSuggestions(true, freshItems);
    } catch (error) {
      console.error('Failed to reload suggestions:', error);
      Alert.alert('Error', 'Failed to reload suggestions');
    }
  };

  const handleSwipeLeft = () => {
    // Dislike - decrease ratings for items in this outfit and move to next suggestion
    if (currentIndex < suggestions.length) {
      const dislikedOutfit = suggestions[currentIndex];
      
      // Move to next suggestion immediately
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // No more suggestions
        Alert.alert(
          'No More Suggestions',
          'You\'ve seen all suggestions! Generate new ones or review your liked outfits.',
          [
            { text: 'OK' },
            {
              text: 'Generate More',
              onPress: () => generateSuggestions(),
            },
          ]
        );
      }
      
      // Update ratings in the background (non-blocking)
      (async () => {
        try {
          // Get current ratings from the items state (most up-to-date)
          const itemsMap = new Map(items.map(item => [item.id, item]));
          
          const updatePromises = dislikedOutfit.items.map(async (item) => {
            // Use current rating from items state, fallback to suggestion item rating, then default to 0.5
            const currentItem = itemsMap.get(item.id);
            const currentRating = currentItem?.rating ?? item.rating ?? 0.5;
            const newRating = Math.max(0, currentRating - 0.1);
            await updateItem(item.id, { rating: newRating });
          });
          await Promise.all(updatePromises);
          
          // Reload items to get updated ratings (in background)
          await loadItems();
        } catch (error) {
          console.error('Error updating item ratings:', error);
          // Silently fail - user can continue swiping
        }
      })();
    }
  };

  const handleSwipeRight = () => {
    // Like - save outfit, increase ratings for items, and move to next
    if (currentIndex < suggestions.length) {
      const likedOutfit = suggestions[currentIndex];
      
      // Optimistically update UI immediately
      setLikedOutfits([...likedOutfits, likedOutfit]);
      
      // Move to next suggestion immediately
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // No more suggestions
        Alert.alert(
          'Outfit Saved!',
          'You\'ve seen all suggestions! The liked outfit has been saved to your outfits.',
          [
            { text: 'OK' },
            {
              text: 'Generate More',
              onPress: () => generateSuggestions(),
            },
          ]
        );
      }
      
      // Save outfit and update ratings in the background (non-blocking)
      (async () => {
        try {
          // Get current ratings from the items state (most up-to-date)
          const itemsMap = new Map(items.map(item => [item.id, item]));
          
          // Update ratings for items in the liked outfit (increase by 0.1, maximum 1.0)
          const updatePromises = likedOutfit.items.map(async (item) => {
            // Use current rating from items state, fallback to suggestion item rating, then default to 0.5
            const currentItem = itemsMap.get(item.id);
            const currentRating = currentItem?.rating ?? item.rating ?? 0.5;
            const newRating = Math.min(1.0, currentRating + 0.1);
            await updateItem(item.id, { rating: newRating });
          });
          await Promise.all(updatePromises);
          
          // Save outfit to database
          const newOutfit = await addOutfit({
            occasion: selectedOccasion || 'casual',
            rating: Math.round(likedOutfit.score * 5), // Convert 0-1 score to 0-5 rating
            createdAt: Date.now(),
          });

          if (newOutfit) {
            // Add items to outfit
            const addItemPromises = likedOutfit.items.map((item) =>
              addItemToOutfitById(newOutfit.id, item.id, item)
            );
            await Promise.all(addItemPromises);
            
            // Reload saved outfits so this one won't appear in future suggestions
            await loadSavedOutfits();
          }
          
          // Reload items to get updated ratings (in background)
          await loadItems();
        } catch (error) {
          console.error('Error saving liked outfit:', error);
          // Silently fail - user can continue swiping
          // The outfit is already shown in likedOutfits for UI feedback
        }
      })();
    }
  };

  const handleSaveLikedOutfit = (suggestion: OutfitSuggestion) => {
    Alert.alert(
      'Save Outfit',
      'Would you like to save this outfit combination?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            // Navigate to outfit creation with pre-filled items
            Alert.alert('Success', 'Outfit saved! (This would navigate to outfit creation)');
          },
        },
      ]
    );
  };


  const renderSwipeableCards = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Generating suggestions...</Text>
          </View>
        </View>
      );
    }

    if (suggestions.length === 0) {
      if (noSuggestionsAvailable) {
        return (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No suggestions available</Text>
              <Text style={styles.emptyText}>
                We couldn't generate any new outfit suggestions at this time. Try adjusting your occasion filter or add more items to your wardrobe.
              </Text>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="sparkles-outline" size={48} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No suggestions yet</Text>
            <Text style={styles.emptyText}>
              Generate personalized outfit suggestions based on your wardrobe
            </Text>
          </View>
        </View>
      );
    }

    // Check if all outfits have been viewed
    const allOutfitsViewed = currentIndex >= suggestions.length;

    // Show centered generate button when all outfits are viewed
    if (allOutfitsViewed) {
      return (
        <View style={styles.centeredContainer}>
          <View style={styles.centeredContent}>
            <View style={styles.centeredIconContainer}>
              <Ionicons name="sparkles-outline" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.centeredTitle}>All suggestions viewed!</Text>
            <Text style={styles.centeredText}>
              Generate more outfit suggestions to discover new combinations
            </Text>
            <TouchableOpacity
              style={[styles.generateButton, styles.generateButtonCentered, isLoading && styles.generateButtonDisabled]}
              onPress={() => generateSuggestions()}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Ionicons name="sparkles-outline" size={18} color={COLORS.surface} />
              )}
              <Text style={styles.generateButtonText}>
                {isLoading ? 'Generating...' : 'Generate More'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Show only the current card
    if (currentIndex < suggestions.length) {
      return (
        <View style={styles.swipeContainer}>
          <View style={styles.cardsWrapper}>
            <SwipeableOutfitCard
              key={currentIndex}
              suggestion={suggestions[currentIndex]}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              index={0}
              showActionButtons={true}
            />
          </View>

          {/* Reload button */}
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={handleReload}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={isLoading ? COLORS.textTertiary : COLORS.primary} 
            />
          </TouchableOpacity>

          {/* Saved outfits badge */}
          {likedOutfits.length > 0 && (
            <TouchableOpacity
              style={styles.savedBadge}
              onPress={() => {
                Alert.alert(
                  'Saved Outfits',
                  `You have saved ${likedOutfits.length} outfit${likedOutfits.length > 1 ? 's' : ''} to your wardrobe!`,
                  [
                    { text: 'OK' },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              <Text style={styles.savedBadgeText}>
                {likedOutfits.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

  };

  return (
    <GestureHandlerRootView style={styles.container}>

      <View style={styles.swipeArea}>
        {renderSwipeableCards()}
        
        {/* Occasion slider overlaid on outfit cards */}
        {suggestions.length > 0 && currentIndex < suggestions.length && (
          <View style={styles.overlayOccasionContainer}>
            <View style={styles.occasionSliderContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.occasionSliderContent}
                snapToInterval={100}
                decelerationRate="fast"
              >
                {['', ...OCCASIONS].map((occasion) => (
                  <TouchableOpacity
                    key={occasion || 'all'}
                    style={[
                      styles.occasionSliderItem,
                      selectedOccasion === occasion && styles.occasionSliderItemActive,
                    ]}
                    onPress={() => setSelectedOccasion(occasion)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.occasionSliderText,
                        selectedOccasion === occasion && styles.occasionSliderTextActive,
                      ]}
                    >
                      {occasion === '' ? 'All' : occasion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* Bottom section with generate button - only show when no suggestions at all */}
      {suggestions.length === 0 && (
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
            onPress={() => generateSuggestions()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color={COLORS.surface} />
            )}
            <Text style={styles.generateButtonText}>
              {isLoading ? 'Generating...' : 'Generate'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  swipeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlayOccasionContainer: {
    position: 'absolute',
    bottom: LAYOUT.spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.lg,
    zIndex: 9,
  },
  occasionSliderContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.full,
    paddingVertical: LAYOUT.spacing.xs,
    paddingHorizontal: LAYOUT.spacing.sm,
    maxWidth: '90%',
  },
  occasionSliderContent: {
    paddingHorizontal: LAYOUT.spacing.sm,
    alignItems: 'center',
    gap: LAYOUT.spacing.xs,
  },
  occasionSliderItem: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.full,
    marginHorizontal: LAYOUT.spacing.xs,
  },
  occasionSliderItemActive: {
    backgroundColor: COLORS.primary,
  },
  occasionSliderText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  occasionSliderTextActive: {
    color: COLORS.surface,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  swipeContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: LAYOUT.spacing.sm,
  },
  cardsWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadButton: {
    position: 'absolute',
    top: LAYOUT.spacing.lg,
    left: LAYOUT.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: LAYOUT.elevation.small,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity * 0.1,
    shadowRadius: LAYOUT.shadow.radius,
  },
  savedBadge: {
    position: 'absolute',
    top: LAYOUT.spacing.lg,
    right: LAYOUT.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10,
  },
  savedBadgeText: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  bottomSection: {
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingBottom: LAYOUT.spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    gap: LAYOUT.spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.xl,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: LAYOUT.spacing.lg,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
  emptyTitle: {
    fontSize: LAYOUT.design.fontSize.xl,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.sm,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.xl,
  },
  centeredContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  centeredIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.lg,
    elevation: LAYOUT.elevation.medium,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity * 0.2,
    shadowRadius: LAYOUT.shadow.radius,
  },
  centeredTitle: {
    fontSize: LAYOUT.design.fontSize.xl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  centeredText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.xl,
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.md,
  },
  generateButtonCentered: {
    marginTop: LAYOUT.spacing.md,
    minWidth: 200,
  },
});
