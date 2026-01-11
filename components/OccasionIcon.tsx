import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface OccasionIconProps {
  occasion: string;
  size?: number;
  color?: string;
}

const OCCASION_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'casual': 'cafe-outline', // Changed from shirt-outline to avoid conflict
  'work': 'briefcase-outline',
  'formal': 'ribbon-outline',
  'party': 'wine-outline',
  'sport': 'basketball-outline', // Changed from football-outline to avoid conflict with style "sporty"
  'date': 'star-outline', // Changed from heart-outline to avoid conflict with style "romantic"
  'travel': 'airplane-outline',
  'wedding': 'rose-outline',
  'interview': 'hand-left-outline',
  'dinner': 'restaurant-outline',
};

export function OccasionIcon({ occasion, size = 16, color = '#000' }: OccasionIconProps) {
  const iconName = OCCASION_ICON_MAP[occasion] || 'ellipse-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
}


