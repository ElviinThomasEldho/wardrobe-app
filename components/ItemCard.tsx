import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem } from '../lib/types';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import { CATEGORIES } from '../constants/taxonomy';
import { CategoryIcon } from './CategoryIcon';
import { StyleIcon } from './StyleIcon';
import { useWardrobe } from '../contexts';

interface ItemCardProps {
  item: WardrobeItem;
  onPress: () => void;
  onDelete: () => void;
}

export default function ItemCard({ item, onPress, onDelete }: ItemCardProps) {
  const { isAnalyzing, hasFailedAnalysis, retryAnalysis } = useWardrobe();
  const analyzing = isAnalyzing(item.id) || (item.colors.length === 0 && !hasFailedAnalysis(item.id));
  const failed = hasFailedAnalysis(item.id) && item.colors.length === 0;

  const handleLongPress = () => {
    Alert.alert(
      'Item Options',
      `What would you like to do with this ${item.category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };


  return (
    <TouchableOpacity
      style={[styles.container, analyzing && styles.containerDisabled]}
      onPress={analyzing ? undefined : onPress}
      onLongPress={analyzing ? undefined : handleLongPress}
      activeOpacity={analyzing ? 1 : 0.9}
      disabled={analyzing}
    >
      {/* Image Section with Overlaid Content */}
      <View style={styles.imageSection}>
        {/* Subtle gradient background for transparent images */}
        <View style={styles.gradientBackground} />
        
        {/* Main image */}
        <Image
          source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }}
          style={styles.image}
          resizeMode="contain"
        />
        
        {/* Top Overlay - Better visual hierarchy */}
        <View style={styles.topOverlay}>
          {/* Left side - Colors with background for visibility */}
          <View style={styles.colorsContainer}>
            <View style={styles.colorsBackground}>
              {item.colors.slice(0, 3).map((color, index) => (
                <View
                  key={index}
                  style={[styles.colorDot, { backgroundColor: color }]}
                />
              ))}
              {item.colors.length > 3 && (
                <View style={styles.moreColorsDot}>
                  <Text style={styles.moreColorsText}>+{item.colors.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Right side - Rating (prominent) and Category icon */}
          <View style={styles.rightOverlay}>
            {/* Rating badge - Most prominent */}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={COLORS.warning || '#FFB800'} />
              <Text style={styles.ratingText}>
                {(item.rating ?? 0.5).toFixed(1)}
              </Text>
            </View>
            
            {/* Category icon - Secondary */}
            <View style={styles.categoryIcon}>
              <CategoryIcon category={item.category} size={16} color={COLORS.textPrimary} />
            </View>
          </View>
        </View>
        
        {/* Bottom Overlay - Style tag only */}
        <View style={styles.bottomOverlay}>
          {/* Gradient background */}
          <LinearGradient
            colors={['transparent', COLORS.glass.backgroundSubtle, COLORS.glass.background, COLORS.glass.backgroundHeavy]}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.gradientOverlay}
          />
          
          <View style={styles.overlayContent}>
            {/* Style tag - only show primary style */}
            {item.styles.length > 0 && (
              <View style={styles.styleContainer}>
                <View style={styles.styleContent}>
                  <StyleIcon style={item.styles[0]} size={14} color={COLORS.textSecondary} />
                  <Text style={styles.primaryStyle}>{item.styles[0]}</Text>
                </View>
                {item.styles.length > 1 && (
                  <Text style={styles.additionalStyles}>+{item.styles.length - 1}</Text>
                )}
              </View>
            )}
          </View>
        </View>
        
        {/* Loading overlay when analyzing */}
        {analyzing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
        
        {/* Retry button when analysis failed */}
        {failed && !analyzing && (
          <View style={styles.retryOverlay}>
            <View style={styles.retryContent}>
              <Ionicons name="alert-circle" size={24} color={COLORS.error} />
              <Text style={styles.retryText}>Analysis failed</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={(e) => {
                  e.stopPropagation();
                  retryAnalysis(item.id);
                }}
              >
                <Ionicons name="refresh" size={16} color={COLORS.surface} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.glass.background,
    borderRadius: LAYOUT.borderRadius.xl,
    margin: LAYOUT.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadow.color,
    shadowOffset: LAYOUT.glass.shadow.offset,
    shadowOpacity: LAYOUT.glass.shadow.opacity,
    shadowRadius: LAYOUT.glass.shadow.radius,
    elevation: LAYOUT.glass.shadow.elevation,
    overflow: 'hidden',
  },
  containerDisabled: {
    opacity: 0.7,
  },
  imageSection: {
    position: 'relative',
    height: LAYOUT.sizes.cardHeight + 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.lg,
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
  image: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.sm,
    left: LAYOUT.spacing.sm,
    right: LAYOUT.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  colorsContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  colorsBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass.backgroundHeavy,
    paddingHorizontal: LAYOUT.spacing.xs,
    paddingVertical: 6,
    borderRadius: LAYOUT.borderRadius.md,
    gap: LAYOUT.spacing.xs / 2,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadowLight.color,
    shadowOffset: LAYOUT.glass.shadowLight.offset,
    shadowOpacity: LAYOUT.glass.shadowLight.opacity,
    shadowRadius: LAYOUT.glass.shadowLight.radius,
    elevation: LAYOUT.glass.shadowLight.elevation,
  },
  rightOverlay: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: LAYOUT.spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass.background,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 6,
    borderRadius: LAYOUT.borderRadius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 168, 38, 0.2)',
    shadowColor: LAYOUT.glass.shadowLight.color,
    shadowOffset: LAYOUT.glass.shadowLight.offset,
    shadowOpacity: LAYOUT.glass.shadowLight.opacity,
    shadowRadius: LAYOUT.glass.shadowLight.radius,
    elevation: LAYOUT.glass.shadowLight.elevation,
  },
  ratingText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.bold,
    minWidth: 24,
    textAlign: 'center',
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.glass.backgroundHeavy,
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
  categoryIconText: {
    fontSize: 16,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 2,
    borderTopLeftRadius: LAYOUT.borderRadius.lg,
    borderTopRightRadius: LAYOUT.borderRadius.lg,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: LAYOUT.borderRadius.lg,
    borderTopRightRadius: LAYOUT.borderRadius.lg,
  },
  overlayContent: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.sm,
    zIndex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    height: '100%',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 1,
  },
  moreColorsDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.glass.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  moreColorsText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  styleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  styleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.glass.backgroundHeavy,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 6,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadowLight.color,
    shadowOffset: LAYOUT.glass.shadowLight.offset,
    shadowOpacity: LAYOUT.glass.shadowLight.opacity,
    shadowRadius: LAYOUT.glass.shadowLight.radius,
    elevation: LAYOUT.glass.shadowLight.elevation,
  },
  primaryStyle: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  additionalStyles: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textTertiary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    marginLeft: LAYOUT.spacing.xs,
    backgroundColor: COLORS.glass.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: LAYOUT.borderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.glass.backgroundHeavy,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: LAYOUT.borderRadius.xl,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  loadingText: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  retryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.glass.backgroundHeavy,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: LAYOUT.borderRadius.xl,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  retryContent: {
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
  },
  retryText: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    marginBottom: LAYOUT.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.md,
    gap: LAYOUT.spacing.xs,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
});
