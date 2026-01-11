import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useShopping } from '../../../contexts/ShoppingContext';
import { useWardrobe } from '../../../contexts';
import { analyzeApparelImage } from '../../../lib/ai/gemini';
import { generateShoppingSuggestions, OutfitSuggestion } from '../../../lib/algorithms/suggest';
import { WardrobeItem } from '../../../lib/types';
import { generateUniqueFilename } from '../../../lib/files';
import ShoppingItemCard from '../../../components/ShoppingItemCard';
import OutfitSuggestionCard from '../../../components/OutfitSuggestionCard';
import { COLORS } from '../../../constants/colors';
import { LAYOUT } from '../../../constants/layout';

export default function ShopScreen() {
  const { shoppingItem, isAnalyzing, setShoppingItem, clearShoppingItem, setIsAnalyzing } = useShopping();
  const { items } = useWardrobe();
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Generate suggestions when shopping item changes
  useEffect(() => {
    if (shoppingItem && items.length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [shoppingItem, items]);

  const generateSuggestions = async () => {
    if (!shoppingItem) return;

    setIsGeneratingSuggestions(true);
    try {
      const newSuggestions = generateShoppingSuggestions(shoppingItem, items, undefined, 15);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      Alert.alert('Error', 'Failed to generate outfit suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleImageSelected = async (uri: string) => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Analyze the image
      const analysis = await analyzeApparelImage(uri);

      // Create a temporary shopping item
      const tempShoppingItem: WardrobeItem = {
        id: `shopping_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        category: analysis.category,
        colors: analysis.colors,
        styles: analysis.styles,
        occasions: analysis.occasions,
        imagePath: uri, // Use local URI for temporary item
        rating: 0.5, // Default rating
        createdAt: Date.now(),
        tags: [],
      };

      setShoppingItem(tempShoppingItem);
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      setAnalysisError(errorMessage);
      Alert.alert('Analysis Error', errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await handleImageSelected(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await handleImageSelected(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSaveSuggestion = () => {
    // This would save the outfit, but for shopping we might want to handle it differently
    // For now, just show a message
    Alert.alert('Save Outfit', 'This feature will save the outfit to your collection');
  };

  const renderSuggestion = ({ item }: { item: OutfitSuggestion }) => (
    <OutfitSuggestionCard
      suggestion={item}
      onSave={handleSaveSuggestion}
    />
  );

  // Empty state - no shopping item selected
  if (!shoppingItem && !isAnalyzing) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={LAYOUT.sizes.iconXLarge} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Try On While Shopping</Text>
          <Text style={styles.emptySubtext}>
            Take a photo of an item you're considering and see how it works with your wardrobe
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.actionButtonDisabled]}
              onPress={takePhoto}
              disabled={isAnalyzing}
            >
              <Ionicons name="camera" size={LAYOUT.sizes.iconLarge} color={COLORS.surface} />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.actionButtonDisabled]}
              onPress={pickImage}
              disabled={isAnalyzing}
            >
              <Ionicons name="image" size={LAYOUT.sizes.iconLarge} color={COLORS.surface} />
              <Text style={styles.actionButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Loading state - analyzing image
  if (isAnalyzing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing item...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      </View>
    );
  }

  // Main content - shopping item and suggestions
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shopping Item Card */}
        {shoppingItem && (
          <ShoppingItemCard
            item={shoppingItem}
            onClear={clearShoppingItem}
          />
        )}

        {/* Error Message */}
        {analysisError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{analysisError}</Text>
          </View>
        )}

        {/* Suggestions Section */}
        {shoppingItem && (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>Outfit Suggestions</Text>
              {isGeneratingSuggestions && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>

            {items.length === 0 ? (
              <View style={styles.emptySuggestionsContainer}>
                <Ionicons name="shirt-outline" size={LAYOUT.sizes.iconLarge} color={COLORS.textSecondary} />
                <Text style={styles.emptySuggestionsText}>
                  No items in your wardrobe yet
                </Text>
                <Text style={styles.emptySuggestionsSubtext}>
                  Add items to your wardrobe to see outfit suggestions
                </Text>
              </View>
            ) : suggestions.length === 0 ? (
              <View style={styles.emptySuggestionsContainer}>
                <Ionicons name="bulb-outline" size={LAYOUT.sizes.iconLarge} color={COLORS.textSecondary} />
                <Text style={styles.emptySuggestionsText}>
                  No suggestions available
                </Text>
                <Text style={styles.emptySuggestionsSubtext}>
                  Try adding more items to your wardrobe for better suggestions
                </Text>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item, index) => `suggestion-${index}`}
                scrollEnabled={false}
                contentContainerStyle={styles.suggestionsList}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: LAYOUT.spacing.xxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xl,
  },
  emptyTitle: {
    fontSize: LAYOUT.design.fontSize.xxl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    color: COLORS.textPrimary,
    marginTop: LAYOUT.spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.md,
    textAlign: 'center',
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.md,
    marginBottom: LAYOUT.spacing.xxxl,
  },
  buttonContainer: {
    width: '100%',
    gap: LAYOUT.spacing.lg,
    maxWidth: 400,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: LAYOUT.spacing.xl,
    paddingHorizontal: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.medium,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xl,
  },
  loadingText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.lg,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  loadingSubtext: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
  },
  suggestionsSection: {
    padding: LAYOUT.spacing.md,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  suggestionsTitle: {
    fontSize: LAYOUT.design.fontSize.xl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  suggestionsList: {
    gap: LAYOUT.spacing.md,
  },
  emptySuggestionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.spacing.xxxl,
  },
  emptySuggestionsText: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.md,
    textAlign: 'center',
  },
  emptySuggestionsSubtext: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    backgroundColor: COLORS.error + '20',
    padding: LAYOUT.spacing.md,
    margin: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  errorText: {
    flex: 1,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.error,
  },
});

