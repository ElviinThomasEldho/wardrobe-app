import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem, Category } from '../../lib/types';
import { useWardrobe, useOutfits } from '../../contexts';
import { calculateOutfitCompatibility } from '../../lib/algorithms/compatibility';
import { CATEGORIES, OCCASIONS } from '../../constants/taxonomy';
import { CategoryIcon } from '../../components/CategoryIcon';
import { OccasionIcon } from '../../components/OccasionIcon';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import TagSelector from '../../components/TagSelector';
import { assignTagToOutfit } from '../../lib/supabase-db';

export default function CreateOutfitScreen() {
  const { items, getItemsByCategory } = useWardrobe();
  const { addOutfit, addItemToOutfitById } = useOutfits();
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [compatibility, setCompatibility] = useState<ReturnType<typeof calculateOutfitCompatibility> | null>(null);

  useEffect(() => {
    if (selectedItems.length > 0) {
      const score = calculateOutfitCompatibility(selectedItems, selectedOccasion);
      setCompatibility(score);
    } else {
      setCompatibility(null);
    }
  }, [selectedItems, selectedOccasion]);

  const toggleItem = (item: WardrobeItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSaveOutfit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Missing Items', 'Please select at least one item for the outfit');
      return;
    }

    if (!selectedOccasion) {
      Alert.alert('Missing Information', 'Please select an occasion for the outfit');
      return;
    }

    try {
      // Create outfit
      const newOutfit = await addOutfit({
        occasion: selectedOccasion,
        rating: 0,
        createdAt: Date.now(),
      });

      if (newOutfit) {
        // Add items to outfit
        for (const item of selectedItems) {
          await addItemToOutfitById(newOutfit.id, item.id);
        }

        // Add tags to outfit
        for (const tagId of selectedTags) {
          await assignTagToOutfit(newOutfit.id, tagId);
        }

        Alert.alert('Success', 'Outfit created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create outfit');
      }

    } catch (error) {
      console.error('Error creating outfit:', error);
      Alert.alert('Error', 'Failed to create outfit');
    }
  };

  const getItemsByCategoryFromContext = (category: Category) => {
    return getItemsByCategory(category);
  };

  const renderCategorySection = (category: Category) => {
    const categoryItems = getItemsByCategoryFromContext(category);
    if (categoryItems.length === 0) return null;

    const categoryInfo = CATEGORIES.find(cat => cat.value === category);

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryTitleRow}>
          <CategoryIcon 
            category={category} 
            size={20} 
            color={COLORS.textPrimary} 
          />
          <Text style={styles.categoryTitle}>
            {categoryInfo?.label}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
          {categoryItems.map(item => {
            const isSelected = selectedItems.some(selected => selected.id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  isSelected && styles.itemCardSelected,
                ]}
                onPress={() => toggleItem(item)}
              >
                <Image
                  source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }}
                  style={styles.itemImage}
                />
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderItemGrid = () => {
    const images = selectedItems.map(item => 
      item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}`
    );
    
    if (images.length === 1) {
      return (
        <View style={styles.previewGrid}>
          <TouchableOpacity 
            style={styles.previewItemContainer}
            onPress={() => toggleItem(selectedItems[0])}
          >
            <Image
              source={{ uri: images[0] }}
              style={styles.previewSingleImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.previewRemoveButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleItem(selectedItems[0]);
              }}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (images.length === 2) {
      return (
        <View style={styles.previewGrid}>
          <View style={styles.previewTwoItemGrid}>
            {selectedItems.map((item, index) => (
              <TouchableOpacity 
                key={item.id}
                style={styles.previewHalfContainer}
                onPress={() => toggleItem(item)}
              >
                <Image
                  source={{ uri: images[index] }}
                  style={styles.previewHalfImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.previewRemoveButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleItem(item);
                  }}
                >
                  <Ionicons name="close" size={14} color="white" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    
    if (images.length === 3) {
      return (
        <View style={styles.previewGrid}>
          <View style={styles.previewThreeItemGrid}>
            <TouchableOpacity 
              style={styles.previewLargeContainer}
              onPress={() => toggleItem(selectedItems[0])}
            >
              <Image
                source={{ uri: images[0] }}
                style={styles.previewLargeImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.previewRemoveButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleItem(selectedItems[0]);
                }}
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
            <View style={styles.previewSmallColumn}>
              {selectedItems.slice(1).map((item, index) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.previewSmallContainer}
                  onPress={() => toggleItem(item)}
                >
                  <Image
                    source={{ uri: images[index + 1] }}
                    style={styles.previewSmallImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.previewRemoveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleItem(item);
                    }}
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }
    
    // 4+ items
    return (
      <View style={styles.previewGrid}>
        <View style={styles.previewFourItemGrid}>
          {selectedItems.slice(0, 4).map((item, index) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.previewQuarterContainer}
              onPress={() => toggleItem(item)}
            >
              <Image
                source={{ uri: images[index] }}
                style={styles.previewQuarterImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.previewRemoveButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleItem(item);
                }}
              >
                <Ionicons name="close" size={12} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {selectedItems.length > 4 && (
            <View style={styles.previewMoreOverlay}>
              <Text style={styles.previewMoreText}>+{selectedItems.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCompatibilitySection = () => {
    if (!compatibility) return null;

    return (
      <View style={styles.compatibilitySection}>
        <Text style={styles.compatibilityTitle}>Compatibility Score</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {Math.round(compatibility.score * 100)}%
          </Text>
          <Text style={styles.explanationText}>
            {compatibility.explanation}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Occasion *</Text>
        <Text style={styles.sectionSubtitle}>Choose the occasion for this outfit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionScroll}>
          {OCCASIONS.map(occasion => (
            <TouchableOpacity
              key={occasion}
              style={[
                styles.occasionButton,
                selectedOccasion === occasion && styles.occasionButtonActive,
              ]}
              onPress={() => setSelectedOccasion(occasion)}
            >
              <View style={styles.occasionButtonContent}>
                <OccasionIcon 
                  occasion={occasion} 
                  size={16} 
                  color={selectedOccasion === occasion ? COLORS.surface : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.occasionButtonText,
                  selectedOccasion === occasion && styles.occasionButtonTextActive,
                ]}>
                  {occasion}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <Text style={styles.sectionSubtitle}>Add tags to organize this outfit</Text>
        <TagSelector
          selectedTagIds={selectedTags}
          onSelectionChange={setSelectedTags}
          allowCreate={true}
        />
      </View>

      {renderCompatibilitySection()}

      {CATEGORIES.map(category => renderCategorySection(category.value))}

      <View style={styles.selectedItemsSection}>
        <Text style={styles.sectionTitle}>
          Selected Items ({selectedItems.length})
        </Text>
        {selectedItems.length > 0 ? (
          <View style={styles.selectedItemsContainer}>
            {renderItemGrid()}
          </View>
        ) : (
          <Text style={styles.noItemsText}>No items selected</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!selectedOccasion || selectedItems.length === 0) && styles.saveButtonDisabled,
        ]}
        onPress={handleSaveOutfit}
        disabled={!selectedOccasion || selectedItems.length === 0}
      >
        <Text style={styles.saveButtonText}>Create Outfit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: LAYOUT.spacing.md,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.low,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.md,
  },
  inputContainer: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.md,
  },
  inputText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
  },
  occasionScroll: {
    flexDirection: 'row',
  },
  occasionButton: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    marginRight: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.lg,
    backgroundColor: COLORS.surfaceSecondary,
  },
  occasionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occasionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  occasionButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  occasionButtonTextActive: {
    color: COLORS.surface,
  },
  compatibilitySection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.low,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  compatibilityTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: LAYOUT.design.fontSize.xxl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    color: COLORS.primary,
    marginBottom: LAYOUT.spacing.sm,
  },
  explanationText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categorySection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.low,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.md,
  },
  itemsScroll: {
    flexDirection: 'row',
  },
  itemCard: {
    width: 90,
    marginRight: LAYOUT.spacing.md,
    alignItems: 'center',
    position: 'relative',
    padding: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    backgroundColor: COLORS.primaryLight || COLORS.surface,
    borderColor: COLORS.primary,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  itemName: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.xs,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItemsSection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.low,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  selectedItemsContainer: {
    alignItems: 'center',
  },
  
  // Preview grid styles
  previewGrid: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.lg,
    overflow: 'hidden',
  },
  
  // Single item layout
  previewItemContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewSingleImage: {
    width: '100%',
    height: '100%',
  },
  
  // Two items grid layout
  previewTwoItemGrid: {
    flexDirection: 'row',
    height: '100%',
  },
  previewHalfContainer: {
    flex: 1,
    position: 'relative',
  },
  previewHalfImage: {
    width: '100%',
    height: '100%',
  },
  
  // Three items grid layout
  previewThreeItemGrid: {
    flexDirection: 'row',
    height: '100%',
  },
  previewLargeContainer: {
    flex: 2,
    position: 'relative',
  },
  previewLargeImage: {
    width: '100%',
    height: '100%',
  },
  previewSmallColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  previewSmallContainer: {
    flex: 1,
    position: 'relative',
  },
  previewSmallImage: {
    width: '100%',
    height: '100%',
  },
  
  // Four items grid layout
  previewFourItemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: '100%',
  },
  previewQuarterContainer: {
    width: '50%',
    height: '50%',
    position: 'relative',
  },
  previewQuarterImage: {
    width: '100%',
    height: '100%',
  },
  previewMoreOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMoreText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.bold,
  },
  
  // Remove button for preview
  previewRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: LAYOUT.elevation.medium,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  noItemsText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    margin: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.xl,
    paddingVertical: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    elevation: LAYOUT.elevation.medium,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    elevation: 0,
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
