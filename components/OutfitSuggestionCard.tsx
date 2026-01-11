import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OutfitSuggestion } from '../lib/algorithms/suggest';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

interface OutfitSuggestionCardProps {
  suggestion: OutfitSuggestion;
  onSave: () => void;
}

export default function OutfitSuggestionCard({ suggestion, onSave }: OutfitSuggestionCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return COLORS.success;
    if (score >= 0.6) return COLORS.warning;
    return COLORS.error;
  };

  const getItemUri = (imagePath: string) => {
    return imagePath.startsWith('http') ? imagePath : `file://${imagePath}`;
  };

  const getLayerOrder = (category: string) => {
    // Define layering order: bottom items first, top items last
    const order: { [key: string]: number } = {
      'pants': 1,
      'jeans': 1,
      'trousers': 1,
      'shorts': 1,
      'tshirt': 2,
      'shirt': 2,
      'blouse': 2,
      'dress': 2,
      'jacket': 3,
      'coat': 3,
      'hoodie': 3,
      'sweater': 3,
      'cardigan': 3,
    };
    return order[category.toLowerCase()] || 2;
  };

  const getVerticalPosition = (category: string) => {
    // Position items vertically like a mockup using fixed relative scaling
    const cat = category.toLowerCase();
    if (cat === 'pants' || cat === 'jeans' || cat === 'trousers' || cat === 'shorts') {
      return { 
        bottom: 0, 
        top: undefined,
        height: LAYOUT.outfitItemHeights.bottomwear,
      };
    } else if (cat === 'dress') {
      return { 
        top: 0, 
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.dress,
      };
    } else {
      return { 
        top: 0, 
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.topwear,
      };
    }
  };

  // Sort items: pants first (lowest z-index), then tops, then outerwear (highest z-index)
  // This ensures proper rendering order where pants are behind tops
  const sortedItems = [...suggestion.items].sort((a, b) => {
    return getLayerOrder(a.category) - getLayerOrder(b.category);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(suggestion.score) }]}>
            <Text style={styles.scoreText}>
              {Math.round(suggestion.score * 100)}%
            </Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {suggestion.category === 'complete' ? 'Complete' : 'Partial'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Ionicons name="bookmark-outline" size={16} color={COLORS.primary} />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        {sortedItems.length > 0 ? (
          (() => {
            // Count items per category for proper z-index calculation
            const categoryCounts: { [key: number]: number } = {};
            
            return sortedItems.map((item, index) => {
              const layerOrder = getLayerOrder(item.category);
              const verticalPos = getVerticalPosition(item.category);
              
              // Count items in this category
              if (!categoryCounts[layerOrder]) {
                categoryCounts[layerOrder] = 0;
              }
              const categoryIndex = categoryCounts[layerOrder]++;
              
              // Subtle horizontal offset for overlap effect
              const offsetX = (categoryIndex % 2 === 0 ? 1 : -1) * (categoryIndex * 5);
              
              // Ensure proper z-index with non-overlapping ranges:
              // Pants (layerOrder 1): z-index 1-10 (always behind)
              // Tops (layerOrder 2): z-index 11-20 (always above pants)
              // Outerwear (layerOrder 3): z-index 21-30 (always on top)
              const zIndex = (layerOrder - 1) * 10 + 1 + categoryIndex;
              
              const imageStyle: any = {
                zIndex: zIndex,
                height: verticalPos.height,
                transform: [
                  { translateX: offsetX },
                ],
              };
              
              if (verticalPos.top !== undefined) {
                imageStyle.top = verticalPos.top;
              }
              if (verticalPos.bottom !== undefined) {
                imageStyle.bottom = verticalPos.bottom;
              }
              
              return (
                <Image
                  key={item.id}
                  source={{ uri: getItemUri(item.imagePath) }}
                  style={[styles.layeredImage, imageStyle]}
                  resizeMode="contain"
                />
              );
            });
          })()
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="shirt-outline" size={32} color={COLORS.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.explanationText}>
          {suggestion.explanation}
        </Text>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>
            Items ({suggestion.items.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
            {suggestion.items.map((item, _index) => (
              <View key={item.id} style={styles.itemCard}>
                <Image
                  source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }}
                  style={styles.itemImage}
                />
                <Text style={styles.itemCategory}>
                  {item.category}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.colorsSection}>
          <Text style={styles.colorsTitle}>Color Palette</Text>
          <View style={styles.colorsContainer}>
            {suggestion.items.flatMap(item => item.colors).slice(0, 8).map((color, index) => (
              <View
                key={index}
                style={[styles.colorSwatch, { backgroundColor: color }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  scoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
  },
  saveButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  imageContainer: {
    height: 200,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layeredImage: {
    position: 'absolute',
    width: '100%',
    left: 0,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 16,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  itemsScroll: {
    flexDirection: 'row',
  },
  itemCard: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 10,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  colorsSection: {
    marginBottom: 8,
  },
  colorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
