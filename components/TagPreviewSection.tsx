import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Tag, WardrobeItem, Outfit } from '../lib/types';
import { useTags } from '../contexts/TagsContext';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import TagChip from './TagChip';

interface TagPreviewSectionProps {
  items?: WardrobeItem[];
  outfits?: Outfit[];
  type: 'items' | 'outfits';
}

export default function TagPreviewSection({
  items = [],
  outfits = [],
  type,
}: TagPreviewSectionProps) {
  const router = useRouter();
  const { tags } = useTags();

  const tagsWithPreviews = useMemo(() => {
    return tags.map((tag) => {
      let previews: Array<{ id: string; imagePath: string }> = [];
      let count = 0;

      if (type === 'items') {
        const taggedItems = items.filter((item) => item.tags.includes(tag.id));
        count = taggedItems.length;
        previews = taggedItems.slice(0, 4).map((item) => ({
          id: item.id,
          imagePath: item.imagePath,
        }));
      } else {
        const taggedOutfits = outfits.filter((outfit) => outfit.tags.includes(tag.id));
        count = taggedOutfits.length;
        previews = taggedOutfits.slice(0, 4).map((outfit) => ({
          id: outfit.id,
          imagePath: outfit.items[0]?.imagePath || '',
        }));
      }

      return {
        tag,
        count,
        previews,
      };
    }).filter((item) => item.count > 0);
  }, [tags, items, outfits, type]);

  if (tagsWithPreviews.length === 0) {
    return null;
  }

  const handleTagPress = (tagId: string) => {
    router.push(`/tags/${tagId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tags</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tagsWithPreviews.map(({ tag, count, previews }) => (
          <TouchableOpacity
            key={tag.id}
            style={styles.tagCard}
            onPress={() => handleTagPress(tag.id)}
            activeOpacity={0.9}
          >
            <View style={styles.tagHeader}>
              <TagChip tag={tag} size="small" />
              <Text style={styles.countText}>{count}</Text>
            </View>
            <View style={styles.previewGrid}>
              {previews.map((preview, index) => (
                <View key={preview.id} style={styles.previewItem}>
                  <Image
                    source={{
                      uri: preview.imagePath.startsWith('http')
                        ? preview.imagePath
                        : `file://${preview.imagePath}`,
                    }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  {index === 3 && count > 4 && (
                    <View style={styles.moreOverlay}>
                      <Text style={styles.moreText}>+{count - 4}</Text>
                    </View>
                  )}
                </View>
              ))}
              {previews.length === 0 && (
                <View style={styles.emptyPreview}>
                  <Text style={styles.emptyPreviewText}>No preview</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.spacing.md,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.md,
    gap: LAYOUT.spacing.md,
  },
  tagCard: {
    width: 160,
    backgroundColor: COLORS.glass.background,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    shadowColor: LAYOUT.glass.shadow.color,
    shadowOffset: LAYOUT.glass.shadow.offset,
    shadowOpacity: LAYOUT.glass.shadow.opacity,
    shadowRadius: LAYOUT.glass.shadow.radius,
    elevation: LAYOUT.glass.shadow.elevation,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  countText: {
    fontSize: LAYOUT.design.fontSize.xs,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: LAYOUT.spacing.xs,
    paddingVertical: 2,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.spacing.xs,
  },
  previewItem: {
    width: 64,
    height: 64,
    borderRadius: LAYOUT.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSecondary,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.bold,
  },
  emptyPreview: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  emptyPreviewText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textTertiary,
  },
});

