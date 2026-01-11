import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { Outfit } from '../lib/types';

interface ShareableOutfitProps {
  outfit: Outfit;
}

export default function ShareableOutfit({ outfit }: ShareableOutfitProps) {
  const getMainImage = () => {
    const mainItem = outfit.items.find(item => item.category === 'tshirt') || outfit.items[0];
    return mainItem ? (mainItem.imagePath.startsWith('http') ? mainItem.imagePath : `file://${mainItem.imagePath}`) : null;
  };

  const renderRating = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= outfit.rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Outfit</Text>
        <Text style={styles.occasion}>{outfit.occasion}</Text>
        <View style={styles.ratingContainer}>
          {renderRating()}
        </View>
      </View>

      {/* Main Image */}
      <View style={styles.imageContainer}>
        {getMainImage() ? (
          <Image
            source={{ uri: getMainImage()! }}
            style={styles.mainImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>

      {/* Items Grid */}
      <View style={styles.itemsContainer}>
        <Text style={styles.itemsTitle}>Items ({outfit.items.length})</Text>
        <View style={styles.itemsGrid}>
          {outfit.items.map((item, _index) => (
            <View key={item.id} style={styles.itemCard}>
              <Image
                source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }}
                style={styles.itemImage}
              />
              <Text style={styles.itemCategory}>
                {item.category}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Color Palette */}
      <View style={styles.colorsContainer}>
        <Text style={styles.colorsTitle}>Color Palette</Text>
        <View style={styles.colorSwatches}>
          {outfit.items.flatMap(item => item.colors).slice(0, 8).map((color, index) => (
            <View
              key={index}
              style={[styles.colorSwatch, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Created with Wardrobe Planner
        </Text>
        <Text style={styles.footerDate}>
          {new Date(outfit.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    width: 400,
    minHeight: 600,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  occasion: {
    fontSize: 16,
    color: '#8E8E93',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    color: '#FFD700',
    marginHorizontal: 1,
  },
  imageContainer: {
    height: 200,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  itemsContainer: {
    padding: 16,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 12,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  colorsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  colorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  footerDate: {
    fontSize: 10,
    color: '#8E8E93',
  },
});
