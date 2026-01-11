import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface ColorSelectorProps {
  selectedColors: string[];
  onColorSelected: (color: string) => void;
  onRemoveColor: (color: string) => void;
}

const COMMON_COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#808080', name: 'Gray' },
  { hex: '#8B4513', name: 'Brown' },
  { hex: '#FF0000', name: 'Red' },
  { hex: '#FFA500', name: 'Orange' },
  { hex: '#FFFF00', name: 'Yellow' },
  { hex: '#00FF00', name: 'Green' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#0000FF', name: 'Blue' },
  { hex: '#800080', name: 'Purple' },
  { hex: '#FFC0CB', name: 'Pink' },
  { hex: '#FFD700', name: 'Gold' },
  { hex: '#C0C0C0', name: 'Silver' },
  { hex: '#4A90E2', name: 'Sky Blue' },
  { hex: '#E24A4A', name: 'Coral' },
  { hex: '#4AE24A', name: 'Lime' },
  { hex: '#9013FE', name: 'Violet' },
  { hex: '#F5A623', name: 'Amber' },
  { hex: '#8E8E93', name: 'Neutral' },
];

export default function ColorSelector({
  selectedColors,
  onColorSelected,
  onRemoveColor,
}: ColorSelectorProps) {
  const renderColorGrid = () => (
    <View style={styles.colorGrid}>
      {COMMON_COLORS.map((color) => (
        <TouchableOpacity
          key={color.hex}
          style={[
            styles.colorButton,
            { backgroundColor: color.hex },
            selectedColors.includes(color.hex) && styles.colorButtonSelected,
          ]}
          onPress={() => {
            if (selectedColors.includes(color.hex)) {
              onRemoveColor(color.hex);
            } else {
              onColorSelected(color.hex);
            }
          }}
        >
          {selectedColors.includes(color.hex) && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSelectedColors = () => {
    if (selectedColors.length === 0) {
      return (
        <Text style={styles.noColorsText}>
          No colors selected yet. Tap colors above to add them.
        </Text>
      );
    }

    return (
      <View style={styles.selectedColorsContainer}>
        <Text style={styles.selectedColorsTitle}>Selected Colors:</Text>
        <View style={styles.selectedColorsList}>
          {selectedColors.map((color) => {
            const colorInfo = COMMON_COLORS.find(c => c.hex === color);
            return (
              <View key={color} style={styles.selectedColorItem}>
                <View style={[styles.selectedColorSwatch, { backgroundColor: color }]} />
                <Text style={styles.selectedColorName}>
                  {colorInfo?.name || color}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveColor(color)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Select the colors that best represent your clothing item:
      </Text>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderColorGrid()}
        {renderSelectedColors()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  colorButtonSelected: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  checkmark: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedColorsContainer: {
    marginTop: 8,
  },
  selectedColorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  selectedColorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedColorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedColorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedColorName: {
    fontSize: 14,
    color: '#1C1C1E',
    marginRight: 8,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noColorsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
