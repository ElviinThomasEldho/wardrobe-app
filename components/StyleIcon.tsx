import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface StyleIconProps {
  style: string;
  size?: number;
  color?: string;
}

const STYLE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'minimalist': 'ellipse-outline',
  'vintage': 'radio-outline',
  'bohemian': 'flower-outline',
  'preppy': 'school-outline',
  'streetwear': 'walk-outline',
  'elegant': 'diamond-outline',
  'casual': 'happy-outline', // Changed from shirt-outline to avoid conflict
  'sporty': 'football-outline',
  'romantic': 'heart-outline',
  'edgy': 'flash-outline',
  'classic': 'business-outline',
  'trendy': 'sparkles-outline',
};

export function StyleIcon({ style, size = 16, color = '#000' }: StyleIconProps) {
  const iconName = STYLE_ICON_MAP[style] || 'ellipse-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
}


