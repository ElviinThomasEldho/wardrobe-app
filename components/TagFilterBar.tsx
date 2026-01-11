import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Tag } from '../lib/types';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import TagChip from './TagChip';

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onClearAll?: () => void;
}

export default function TagFilterBar({
  tags,
  selectedTagIds,
  onTagToggle,
  onClearAll,
}: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {onClearAll && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedTagIds.length === 0 && styles.filterButtonActive,
            ]}
            onPress={onClearAll}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedTagIds.length === 0 && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        )}
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            selected={selectedTagIds.includes(tag.id)}
            onPress={() => onTagToggle(tag.id)}
            size="small"
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.spacing.sm,
  },
  scrollContent: {
    gap: LAYOUT.spacing.xs,
    paddingHorizontal: LAYOUT.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.md,
    backgroundColor: COLORS.glass.background,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  filterButtonTextActive: {
    color: COLORS.surface,
  },
});

