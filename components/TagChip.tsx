import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tag } from '../lib/types';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

interface TagChipProps {
  tag: Tag;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function TagChip({
  tag,
  selected = false,
  onPress,
  onRemove,
  showRemove = false,
  size = 'medium',
}: TagChipProps) {
  const sizeStyles = {
    small: {
      paddingHorizontal: LAYOUT.spacing.xs,
      paddingVertical: 4,
      fontSize: LAYOUT.design.fontSize.xs,
      iconSize: 12,
    },
    medium: {
      paddingHorizontal: LAYOUT.spacing.sm,
      paddingVertical: 6,
      fontSize: LAYOUT.design.fontSize.sm,
      iconSize: 14,
    },
    large: {
      paddingHorizontal: LAYOUT.spacing.md,
      paddingVertical: 8,
      fontSize: LAYOUT.design.fontSize.md,
      iconSize: 16,
    },
  };

  const currentSize = sizeStyles[size];
  const tagColor = tag.color || COLORS.primary;

  const content = (
    <View
      style={[
        styles.chip,
        {
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          backgroundColor: selected
            ? COLORS.primary
            : tag.color
            ? `${tag.color}20`
            : COLORS.glass.background,
          borderColor: selected
            ? COLORS.primary
            : tag.color
            ? tag.color
            : COLORS.glass.border,
        },
        selected && styles.chipSelected,
      ]}
    >
      {tag.color && (
        <View
          style={[
            styles.colorIndicator,
            { backgroundColor: tag.color },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: currentSize.fontSize,
            color: selected ? COLORS.surface : COLORS.textPrimary,
          },
        ]}
      >
        {tag.name}
      </Text>
      {showRemove && onRemove && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.removeButton}
        >
          <Ionicons
            name="close-circle"
            size={currentSize.iconSize + 2}
            color={selected ? COLORS.surface : COLORS.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  chipSelected: {
    shadowColor: LAYOUT.glass.shadow.color,
    shadowOffset: LAYOUT.glass.shadow.offset,
    shadowOpacity: LAYOUT.glass.shadow.opacity,
    shadowRadius: LAYOUT.glass.shadow.radius,
    elevation: LAYOUT.glass.shadow.elevation,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  removeButton: {
    marginLeft: 2,
  },
});

