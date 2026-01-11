import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Category } from '../lib/types';

interface CategoryIconProps {
  category: Category | string;
  size?: number;
  color?: string;
}

const ICON_MAP: Record<string, any> = {
  'tshirt': require('../assets/icons/005-tshirt.png'),
  'shirt': require('../assets/icons/007-shirt.png'),
  'bottom': require('../assets/icons/006-jeans.png'),
  'skirt': require('../assets/icons/008-skirt.png'),
  'shorts': require('../assets/icons/009-shorts.png'),
  'footwear': require('../assets/icons/001-shoe.png'),
  'outerwear': require('../assets/icons/002-jacket.png'),
  'blazer': require('../assets/icons/003-blazer.png'),
  'accessory': require('../assets/icons/004-hat.png'),
};

export function CategoryIcon({ category, size = 24, color }: CategoryIconProps) {
  const iconSource = ICON_MAP[category] || ICON_MAP['tshirt'];
  
  return (
    <Image
      source={iconSource}
      style={[
        styles.icon,
        { width: size, height: size },
        color && { tintColor: color },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
  },
});

