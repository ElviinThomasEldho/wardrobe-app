export const CATEGORIES = [
  { value: 'tshirt', label: 'T Shirt', icon: '005-tshirt.png' },
  { value: 'shirt', label: 'Shirt', icon: '007-shirt.png' },
  { value: 'bottom', label: 'Bottom', icon: '006-jeans.png' },
  { value: 'skirt', label: 'Skirt', icon: '008-skirt.png' },
  { value: 'shorts', label: 'Shorts', icon: '009-shorts.png' },
  { value: 'footwear', label: 'Footwear', icon: '001-shoe.png' },
  { value: 'outerwear', label: 'Outerwear', icon: '002-jacket.png' },
  { value: 'blazer', label: 'Blazer', icon: '003-blazer.png' },
  { value: 'accessory', label: 'Accessory', icon: '004-hat.png' },
] as const;

export const OCCASIONS = [
  'casual',
  'work',
  'formal',
  'party',
  'sport',
  'date',
  'travel',
  'wedding',
  'interview',
  'dinner',
] as const;

export const STYLES = [
  'minimalist',
  'vintage',
  'bohemian',
  'preppy',
  'streetwear',
  'elegant',
  'casual',
  'sporty',
  'romantic',
  'edgy',
  'classic',
  'trendy',
] as const;

export const DEFAULT_COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#808080', // Gray
  '#800000', // Maroon
  '#008000', // Olive
  '#000080', // Navy
] as const;
