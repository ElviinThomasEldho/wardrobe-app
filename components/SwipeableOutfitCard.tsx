import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { OutfitSuggestion } from '../lib/algorithms/suggest';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
// Calculate card dimensions for 9:16 portrait aspect ratio
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9;

interface SwipeableOutfitCardProps {
  suggestion: OutfitSuggestion;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  index: number;
  showActionButtons?: boolean;
}

export default function SwipeableOutfitCard({
  suggestion,
  onSwipeLeft,
  onSwipeRight,
  index,
  showActionButtons = false,
}: SwipeableOutfitCardProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const getItemUri = (imagePath: string) => {
    return imagePath.startsWith('http') ? imagePath : `file://${imagePath}`;
  };

  const getLayerOrder = (category: string) => {
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
    const cat = category.toLowerCase();
    if (cat === 'pants' || cat === 'jeans' || cat === 'trousers' || cat === 'shorts' || cat === 'bottom' || cat === 'skirt') {
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

  const sortedItems = [...suggestion.items].sort((a, b) => {
    return getLayerOrder(a.category) - getLayerOrder(b.category);
  });

  // Get topwear and bottomwear items separately
  const topwearItems = sortedItems.filter(item => getLayerOrder(item.category) >= 2);
  const bottomwearItems = sortedItems.filter(item => getLayerOrder(item.category) === 1);
  const outerwearItems = sortedItems.filter(item => getLayerOrder(item.category) === 3);

  // Generate random offsets and rotations for a "thrown on surface" effect
  const getItemTransform = (index: number, total: number, category: string) => {
    // Create consistent but varied offsets based on index and category
    const randomX = (index % 3 - 1) * 25; // -25, 0, or 25
    const randomY = (index % 2) * 8; // 0 or 8
    const rotation = (index % 5 - 2) * 4; // -8, -4, 0, 4, or 8 degrees
    
    return {
      translateX: randomX,
      translateY: randomY,
      rotation: rotation,
    };
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const shouldSwipeLeft = e.translationX < -SWIPE_THRESHOLD;
      const shouldSwipeRight = e.translationX > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onSwipeLeft)();
        });
      } else if (shouldSwipeRight) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onSwipeRight)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10]
    );
    
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const likeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1]
    );
    return { opacity };
  });

  const nopeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    );
    return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { zIndex: 0 },
        ]}
      >
        {/* Like indicator */}
        <Animated.View
          style={[
            styles.likeContainer,
            likeOpacityStyle,
          ]}
        >
          <Ionicons name="heart" size={80} color={COLORS.success} />
          <Text style={styles.likeText}>LIKE</Text>
        </Animated.View>

        {/* Nope indicator */}
        <Animated.View
          style={[
            styles.nopeContainer,
            nopeOpacityStyle,
          ]}
        >
          <Ionicons name="close-circle" size={80} color={COLORS.error} />
          <Text style={styles.nopeText}>NOPE</Text>
        </Animated.View>

        {/* Card content */}
        <View style={styles.cardContent}>
          {/* Score badge overlaid on top */}
          <View style={styles.scoreOverlay}>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(suggestion.score) }]}>
              <Text style={styles.scoreText}>
                {Math.round(suggestion.score * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.imageContainer}>
            {sortedItems.length > 0 ? (
              <View style={styles.fixedGridContainer}>
                {/* Outerwear items first (on top), centered */}
                {outerwearItems.map((item, index) => {
                  const transform = getItemTransform(index, outerwearItems.length, item.category);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.gridItem,
                        styles.outerwearItem,
                        {
                          top: '50%',
                          left: '50%',
                          marginLeft: '-35%', // Half of 70% width
                          marginTop: '-40%', // Half of 80% height (aspectRatio 0.8)
                          transform: [
                            { translateX: transform.translateX },
                            { translateY: transform.translateY },
                            { rotate: `${transform.rotation}deg` },
                          ],
                          zIndex: 30 + index,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: getItemUri(item.imagePath) }}
                        style={styles.gridImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
                
                {/* Topwear items - placed vertically with overlap, centered */}
                {topwearItems.map((item, index) => {
                  const transform = getItemTransform(index, topwearItems.length, item.category);
                  const verticalOffset = index * 30; // Stack items vertically with overlap (reduced for better centering)
                  // Calculate total outfit height to center it
                  const totalTopwearHeight = topwearItems.length * 30;
                  const totalBottomwearHeight = bottomwearItems.length * 35;
                  const gapBetween = 0; // Gap between topwear and bottomwear
                  const totalOutfitHeight = totalTopwearHeight + totalBottomwearHeight + gapBetween;
                  // Start from center and go up by half the total height, then shift up more for topwear
                  const startFromCenter = totalOutfitHeight / 2;
                  const upwardShift = 15; // Increased shift upward to move topwear higher
                  const topPosition = 50 - startFromCenter - upwardShift + verticalOffset;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.gridItem,
                        styles.topwearItem,
                        {
                          top: `${topPosition}%`,
                          left: '50%',
                          marginLeft: '-32.5%', // Half of 65% width
                          transform: [
                            { translateX: transform.translateX },
                            { translateY: transform.translateY },
                            { rotate: `${transform.rotation}deg` },
                          ],
                          zIndex: 20 + index,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: getItemUri(item.imagePath) }}
                        style={styles.gridImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
                
                {/* Bottomwear items - placed below topwear with overlap, centered */}
                {bottomwearItems.map((item, index) => {
                  const transform = getItemTransform(index, bottomwearItems.length, item.category);
                  const verticalOffset = index * 35; // Stack items vertically with overlap
                  // Calculate total outfit height to center it
                  const totalTopwearHeight = topwearItems.length * 30;
                  const totalBottomwearHeight = bottomwearItems.length * 35;
                  const gapBetween = 0; // Reduced gap between topwear and bottomwear for closer positioning
                  const totalOutfitHeight = totalTopwearHeight + totalBottomwearHeight + gapBetween;
                  // Position below topwear, starting from center, shifted upward
                  const startFromCenter = totalOutfitHeight / 2;
                  const upwardShift = 8; // Shift outfit upward to reduce top gap
                  const topPosition = 50 - startFromCenter - upwardShift + totalTopwearHeight + gapBetween + verticalOffset;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.gridItem,
                        styles.bottomwearItem,
                        {
                          top: `${topPosition}%`,
                          left: '50%',
                          marginLeft: '-37.5%', // Half of 75% width
                          transform: [
                            { translateX: transform.translateX },
                            { translateY: transform.translateY },
                            { rotate: `${transform.rotation}deg` },
                          ],
                          zIndex: 10 + index,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: getItemUri(item.imagePath) }}
                        style={styles.gridImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="shirt-outline" size={32} color={COLORS.textSecondary} />
              </View>
            )}
          </View>

        </View>

        {/* Action buttons at bottom center - outside cardContent for proper z-index */}
        {showActionButtons && (
          <View style={styles.bottomActionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSwipeLeft}
              activeOpacity={0.6}
            >
              <View style={[styles.actionButtonInner, styles.dislikeButton]}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSwipeRight}
              activeOpacity={0.6}
            >
              <View style={[styles.actionButtonInner, styles.likeButton]}>
                <Ionicons name="heart" size={20} color={COLORS.surface} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const getScoreColor = (score: number) => {
  if (score >= 0.8) return COLORS.success;
  if (score >= 0.6) return COLORS.warning;
  return COLORS.error;
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.borderRadius.xl,
    marginHorizontal: 20,
    overflow: 'visible',
  },
  cardContent: {
    flex: 1,
  },
  scoreOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.lg,
    left: LAYOUT.spacing.lg,
    zIndex: 20,
  },
  bottomActionButtons: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: LAYOUT.spacing.xxl,
    zIndex: 10,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dislikeButton: {
    backgroundColor: COLORS.surface,
  },
  likeButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scoreBadge: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: 6,
    borderRadius: LAYOUT.borderRadius.full,
  },
  scoreText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  imageContainer: {
    flex: 1,
    minHeight: 300,
    marginHorizontal: LAYOUT.spacing.lg,
    marginVertical: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    overflow: 'visible',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  fixedGridContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridItem: {
    position: 'absolute',
    borderRadius: LAYOUT.borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outerwearItem: {
    width: '70%',
    aspectRatio: 0.8,
    top: '5%',
  },
  topwearItem: {
    width: '65%',
    aspectRatio: 0.75,
  },
  bottomwearItem: {
    width: '75%',
    aspectRatio: 0.85,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.md,
    padding: LAYOUT.spacing.md,
    borderWidth: 1.5,
    borderColor: COLORS.success,
  },
  likeText: {
    color: COLORS.success,
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.bold,
    marginTop: 4,
  },
  nopeContainer: {
    position: 'absolute',
    top: 60,
    left: 24,
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.md,
    padding: LAYOUT.spacing.md,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  nopeText: {
    color: COLORS.error,
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.bold,
    marginTop: 4,
  },
});

