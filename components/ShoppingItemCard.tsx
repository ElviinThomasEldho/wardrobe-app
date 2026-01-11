import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem } from '../lib/types';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import { CategoryIcon } from './CategoryIcon';
import { StyleIcon } from './StyleIcon';

interface ShoppingItemCardProps {
  item: WardrobeItem;
  onClear: () => void;
}

export default function ShoppingItemCard({ item, onClear }: ShoppingItemCardProps) {
  const getItemUri = (imagePath: string) => {
    return imagePath.startsWith('http') ? imagePath : `file://${imagePath}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bag" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Shopping Item</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.gradientBackground} />
          <Image
            source={{ uri: getItemUri(item.imagePath) }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          {/* Category */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <CategoryIcon category={item.category} size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailLabelText}>Category</Text>
            </View>
            <Text style={styles.detailValue}>{item.category}</Text>
          </View>

          {/* Colors */}
          {item.colors.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="color-palette" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabelText}>Colors</Text>
              </View>
              <View style={styles.colorsContainer}>
                {item.colors.map((color, index) => (
                  <View
                    key={index}
                    style={[styles.colorDot, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Styles */}
          {item.styles.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="brush" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabelText}>Styles</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stylesContainer}>
                {item.styles.map((style, index) => (
                  <View key={index} style={styles.styleTag}>
                    <StyleIcon style={style} size={12} color={COLORS.textSecondary} />
                    <Text style={styles.styleText}>{style}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Occasions */}
          {item.occasions.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabelText}>Occasions</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionsContainer}>
                {item.occasions.map((occasion, index) => (
                  <View key={index} style={styles.occasionTag}>
                    <Text style={styles.occasionText}>{occasion}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.glass.background,
    borderRadius: LAYOUT.borderRadius.xl,
    margin: LAYOUT.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadow.color,
    shadowOffset: LAYOUT.glass.shadow.offset,
    shadowOpacity: LAYOUT.glass.shadow.opacity,
    shadowRadius: LAYOUT.glass.shadow.radius,
    elevation: LAYOUT.glass.shadow.elevation,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
    backgroundColor: COLORS.glass.backgroundSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
  },
  headerTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: LAYOUT.spacing.xs,
  },
  content: {
    padding: LAYOUT.spacing.md,
  },
  imageSection: {
    position: 'relative',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
    backgroundColor: COLORS.glass.backgroundSubtle,
    borderRadius: LAYOUT.borderRadius.lg,
    overflow: 'hidden',
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
  detailsSection: {
    gap: LAYOUT.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: LAYOUT.spacing.sm,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.xs,
    flex: 1,
  },
  detailLabelText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  detailValue: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  colorsContainer: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.xs,
    alignItems: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  stylesContainer: {
    flex: 1,
  },
  styleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.glass.backgroundHeavy,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 4,
    borderRadius: LAYOUT.borderRadius.md,
    marginRight: LAYOUT.spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  styleText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  occasionsContainer: {
    flex: 1,
  },
  occasionTag: {
    backgroundColor: COLORS.glass.backgroundHeavy,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 4,
    borderRadius: LAYOUT.borderRadius.md,
    marginRight: LAYOUT.spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  occasionText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
});

