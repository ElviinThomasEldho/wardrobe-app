import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { Outfit } from '../lib/types';
import { shareOutfit } from '../lib/share';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

interface OutfitCardProps {
  outfit: Outfit;
  onPress: () => void;
  onDelete: () => void;
}

export default function OutfitCard({ outfit, onPress, onDelete }: OutfitCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    try {
      await shareOutfit(outfit, viewShotRef);
    } catch (error) {
      console.error('Error sharing outfit:', error);
      Alert.alert('Error', 'Failed to share outfit');
    }
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
      'bottom': 1,
      'skirt': 1,
      'tshirt': 2,
      'shirt': 2,
      'blouse': 2,
      'dress': 2,
      'jacket': 3,
      'coat': 3,
      'hoodie': 3,
      'sweater': 3,
      'cardigan': 3,
      'outerwear': 3,
      'blazer': 3,
    };
    return order[category.toLowerCase()] || 2;
  };

  const getVerticalPosition = (category: string) => {
    // Position items vertically like a mockup using fixed relative scaling
    // Add padding to avoid overlap with top overlay
    const topPadding = 40; // Space for top overlay items
    const bottomPadding = 10; // Minimal bottom spacing
    
    const cat = category.toLowerCase();
    if (cat === 'pants' || cat === 'jeans' || cat === 'trousers' || cat === 'shorts' || cat === 'bottom' || cat === 'skirt') {
      return { 
        bottom: bottomPadding, // Minimal bottom spacing
        top: undefined,
        height: LAYOUT.outfitItemHeights.bottomwear,
        maxWidth: '70%', // Prevent bottomwear from scaling too wide (handles pants vs shorts)
      };
    } else if (cat === 'dress') {
      return { 
        top: topPadding, // Add padding from top
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.dress,
        maxWidth: '80%', // Prevent dress from scaling too wide
      };
    } else {
      return { 
        top: topPadding, // Add padding from top
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.topwear,
        maxWidth: '75%', // Prevent topwear from scaling too wide (handles full vs half sleeves)
      };
    }
  };

  // Sort items: pants first (lowest z-index), then tops, then outerwear (highest z-index)
  const sortedItems = [...outfit.items].sort((a, b) => {
    return getLayerOrder(a.category) - getLayerOrder(b.category);
  });

  return (
    <>
      {/* <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.8 }}>
        <ShareableOutfit outfit={outfit} />
      </ViewShot> */}
      
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Image Section with Overlaid Content */}
        <View style={styles.imageSection}>
          {/* Subtle gradient background for transparent images */}
          <View style={styles.gradientBackground} />
          
          {/* Outfit mockup - layered images */}
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
                
                // Ensure proper z-index with non-overlapping ranges:
                // Pants (layerOrder 1): z-index 1-10 (always behind)
                // Tops (layerOrder 2): z-index 11-20 (always above pants)
                // Outerwear (layerOrder 3): z-index 21-30 (always on top)
                const zIndex = (layerOrder - 1) * 10 + 1 + categoryIndex;
                
                const imageStyle: any = {
                  zIndex: zIndex,
                  height: verticalPos.height,
                };
                
                if (verticalPos.top !== undefined) {
                  imageStyle.top = verticalPos.top;
                }
                if (verticalPos.bottom !== undefined) {
                  imageStyle.bottom = verticalPos.bottom;
                }
                if (verticalPos.maxWidth !== undefined) {
                  imageStyle.maxWidth = verticalPos.maxWidth;
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
          
          {/* Top Overlay - Item count (left) and Share button (right) */}
          <View style={styles.topOverlay}>
            {/* Left side - Item count */}
            <View style={styles.itemsCountContainer}>
              <Ionicons name="layers" size={14} color={COLORS.textPrimary} />
              <Text style={styles.itemsCountText}>
                {outfit.items.length}
              </Text>
            </View>
            
            {/* Right side - Share button */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleShare();
              }}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.glass.background,
    borderRadius: LAYOUT.borderRadius.lg,
    margin: LAYOUT.spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadow.color,
    shadowOffset: LAYOUT.glass.shadow.offset,
    shadowOpacity: LAYOUT.glass.shadow.opacity,
    shadowRadius: LAYOUT.glass.shadow.radius,
    elevation: LAYOUT.glass.shadow.elevation,
  },
  imageSection: {
    position: 'relative',
    height: LAYOUT.sizes.outfitCardHeight + 60,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass.backgroundSubtle,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.glass.backgroundSubtle,
    opacity: 0.5,
  },
  layeredImage: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass.backgroundSubtle,
  },
  topOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.sm,
    left: LAYOUT.spacing.sm,
    right: LAYOUT.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 100,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadowLight.color,
    shadowOffset: LAYOUT.glass.shadowLight.offset,
    shadowOpacity: LAYOUT.glass.shadowLight.opacity,
    shadowRadius: LAYOUT.glass.shadowLight.radius,
    elevation: LAYOUT.glass.shadowLight.elevation,
  },
  itemsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.glass.background,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 5,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadowLight.color,
    shadowOffset: LAYOUT.glass.shadowLight.offset,
    shadowOpacity: LAYOUT.glass.shadowLight.opacity,
    shadowRadius: LAYOUT.glass.shadowLight.radius,
    elevation: LAYOUT.glass.shadowLight.elevation,
  },
  itemsCountText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
