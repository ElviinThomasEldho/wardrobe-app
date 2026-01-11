import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Outfit } from '../lib/types';
import { calculateOutfitCompatibility } from '../lib/algorithms/compatibility';
import { CATEGORIES } from '../constants/taxonomy';
import { CategoryIcon } from './CategoryIcon';
import { ConfirmationDialog } from './ConfirmationDialog';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import { generateVirtualTryOn } from '../lib/ai/gemini';

interface OutfitDetailModalProps {
  visible: boolean;
  outfit: Outfit | null;
  onClose: () => void;
  onDelete: (outfit: Outfit) => void;
  isDeleting?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OutfitDetailModal({
  visible,
  outfit,
  onClose,
  onDelete,
  isDeleting = false,
}: OutfitDetailModalProps) {
  const [compatibility, setCompatibility] = useState<ReturnType<typeof calculateOutfitCompatibility> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [personPhoto, setPersonPhoto] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);

  useEffect(() => {
    if (outfit && outfit.items.length > 0) {
      const score = calculateOutfitCompatibility(outfit.items, outfit.occasion);
      setCompatibility(score);
    } else {
      setCompatibility(null);
    }
  }, [outfit]);

  const handleDelete = () => {
    if (outfit) {
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    if (outfit) {
      onDelete(outfit);
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const pickPersonPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPersonPhoto(result.assets[0].uri);
        setTryOnResult(null); // Reset previous result
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleGenerateTryOn = async () => {
    if (!outfit || !personPhoto || outfit.items.length === 0) {
      Alert.alert('Error', 'Please select a person photo and ensure the outfit has items.');
      return;
    }

    setIsGeneratingTryOn(true);
    setTryOnResult(null);

    try {
      const resultUri = await generateVirtualTryOn(
        personPhoto,
        outfit.items.map(item => ({
          imagePath: item.imagePath,
          category: item.category,
        }))
      );
      setTryOnResult(resultUri);
    } catch (error) {
      console.error('Error generating try-on:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to generate virtual try-on. Please try again.'
      );
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

  const getItemUri = (imagePath: string) => {
    return imagePath.startsWith('http') ? imagePath : `file://${imagePath}`;
  };

  const getLayerOrder = (category: string) => {
    const order: { [key: string]: number } = {
      'pants': 1,
      'jeans': 1,
      'trousers': 1,
      'shorts': 1,
      'bottom': 1,
      'skirt': 1,
      'tshirt': 2,
      'shirt': 2,
      'blouse': 2,
      'dress': 2,
      'jacket': 3,
      'coat': 3,
      'hoodie': 3,
      'sweater': 3,
      'cardigan': 3,
      'outerwear': 3,
      'blazer': 3,
    };
    return order[category.toLowerCase()] || 2;
  };

  const getVerticalPosition = (category: string) => {
    const topPadding = 50;
    const bottomPadding = 10;
    
    const cat = category.toLowerCase();
    if (cat === 'pants' || cat === 'jeans' || cat === 'trousers' || cat === 'shorts' || cat === 'bottom' || cat === 'skirt') {
      return { 
        bottom: bottomPadding,
        top: undefined,
        height: LAYOUT.outfitItemHeights.bottomwear,
        maxWidth: '70%',
      };
    } else if (cat === 'dress') {
      return { 
        top: topPadding,
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.dress,
        maxWidth: '80%',
      };
    } else {
      return { 
        top: topPadding,
        bottom: undefined,
        height: LAYOUT.outfitItemHeights.topwear,
        maxWidth: '75%',
      };
    }
  };

  const renderLayeredOutfit = () => {
    if (!outfit || outfit.items.length === 0) return null;

    const sortedItems = [...outfit.items].sort((a, b) => {
      return getLayerOrder(a.category) - getLayerOrder(b.category);
    });

    const categoryCounts: { [key: number]: number } = {};
    
    return sortedItems.map((item) => {
      const layerOrder = getLayerOrder(item.category);
      const verticalPos = getVerticalPosition(item.category);
      
      if (!categoryCounts[layerOrder]) {
        categoryCounts[layerOrder] = 0;
      }
      const categoryIndex = categoryCounts[layerOrder]++;
      
      const zIndex = (layerOrder - 1) * 10 + 1 + categoryIndex;
      
      const imageStyle: any = {
        zIndex: zIndex,
        height: verticalPos.height,
      };
      
      if (verticalPos.top !== undefined) {
        imageStyle.top = verticalPos.top;
      }
      if (verticalPos.bottom !== undefined) {
        imageStyle.bottom = verticalPos.bottom;
      }
      if (verticalPos.maxWidth !== undefined) {
        imageStyle.maxWidth = verticalPos.maxWidth;
      }

      return (
        <Image
          key={item.id}
          source={{ uri: getItemUri(item.imagePath) }}
          style={[styles.layeredImage, imageStyle]}
          resizeMode="contain"
        />
      );
    });
  };

  const renderCategorySection = (category: string) => {
    if (!outfit) return null;
    
    const outfitItemsInCategory = outfit.items.filter(item => item.category === category);
    if (outfitItemsInCategory.length === 0) return null;

    const categoryInfo = CATEGORIES.find(cat => cat.value === category);

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryTitleRow}>
          <CategoryIcon 
            category={category} 
            size={20} 
            color={COLORS.textPrimary} 
          />
          <Text style={styles.categoryTitle}>
            {categoryInfo?.label}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
          {outfitItemsInCategory.map(item => (
            <View
              key={item.id}
              style={styles.itemCard}
            >
              <Image
                source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }}
                style={styles.itemImage}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (!outfit) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Outfit Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {/* Outfit Preview */}
              <View style={styles.previewSection}>
                <View style={styles.previewContainer}>
                  <View style={styles.gradientBackground} />
                  
                  {outfit.items.length > 0 ? (
                    renderLayeredOutfit()
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="shirt-outline" size={48} color={COLORS.textTertiary} />
                      <Text style={styles.emptyPreviewText}>No items in outfit</Text>
                    </View>
                  )}
                  
                  {/* Overlay chips */}
                  <View style={styles.previewOverlay}>
                    <View style={styles.occasionChip}>
                      <Text style={styles.occasionChipText}>
                        {outfit.occasion || 'No occasion'}
                      </Text>
                    </View>
                    {compatibility && (
                      <View style={styles.compatibilityChip}>
                        <Text style={styles.compatibilityScore}>
                          {Math.round(compatibility.score * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Occasion Display */}
              <View style={styles.occasionSection}>
                <Text style={styles.label}>Occasion</Text>
                <View style={styles.occasionDisplay}>
                  <Text style={styles.occasionDisplayText}>
                    {outfit.occasion}
                  </Text>
                </View>
              </View>

              {/* Compatibility Details */}
              {compatibility && (
                <View style={styles.compatibilitySection}>
                  <Text style={styles.compatibilityExplanation}>
                    {compatibility.explanation}
                  </Text>
                </View>
              )}

              {/* Items by Category */}
              {CATEGORIES.map(category => renderCategorySection(category.value))}

              {/* AI Try-On Section */}
              <View style={styles.tryOnSection}>
                <Text style={styles.label}>AI Virtual Try-On</Text>
                <Text style={styles.tryOnDescription}>
                  Upload a full-body photo to see how this outfit looks on you
                </Text>
                
                {!personPhoto ? (
                  <TouchableOpacity
                    style={styles.uploadPhotoButton}
                    onPress={pickPersonPhoto}
                  >
                    <Ionicons name="camera-outline" size={LAYOUT.sizes.iconMedium} color={COLORS.primary} />
                    <Text style={styles.uploadPhotoButtonText}>Upload Person Photo</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: personPhoto }}
                      style={styles.personPhotoPreview}
                    />
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={pickPersonPhoto}
                    >
                      <Ionicons name="pencil" size={LAYOUT.sizes.iconSmall} color={COLORS.textSecondary} />
                      <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {personPhoto && (
                  <TouchableOpacity
                    style={[styles.generateTryOnButton, isGeneratingTryOn && styles.generateTryOnButtonDisabled]}
                    onPress={handleGenerateTryOn}
                    disabled={isGeneratingTryOn || outfit.items.length === 0}
                  >
                    {isGeneratingTryOn ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.surface} />
                        <Text style={styles.generateTryOnButtonText}>Generating...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={LAYOUT.sizes.iconMedium} color={COLORS.surface} />
                        <Text style={styles.generateTryOnButtonText}>Generate Try-On</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {tryOnResult && (
                  <View style={styles.tryOnResultContainer}>
                    <Text style={styles.tryOnResultLabel}>Try-On Result</Text>
                    <Image
                      source={{ uri: tryOnResult }}
                      style={styles.tryOnResultImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Delete Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                <Ionicons name="trash-outline" size={LAYOUT.sizes.iconMedium} color={COLORS.surface} />
                <Text style={styles.deleteButtonText}>Delete Outfit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Outfit"
        message={`Are you sure you want to delete this ${outfit?.occasion} outfit? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: LAYOUT.borderRadius.xl,
    borderTopRightRadius: LAYOUT.borderRadius.xl,
    height: SCREEN_HEIGHT * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.9,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: LAYOUT.design.fontSize.xl,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: LAYOUT.spacing.xl,
  },
  previewSection: {
    marginBottom: LAYOUT.spacing.lg,
    position: 'relative',
  },
  previewContainer: {
    marginHorizontal: LAYOUT.spacing.md,
    position: 'relative',
    height: LAYOUT.sizes.outfitCardHeight + 60,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass.backgroundSubtle,
    borderRadius: LAYOUT.borderRadius.xl,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.glass.backgroundSubtle,
    opacity: 0.5,
  },
  layeredImage: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass.backgroundSubtle,
  },
  emptyPreviewText: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textTertiary,
  },
  previewOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.md,
    left: LAYOUT.spacing.md,
    right: LAYOUT.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 100,
  },
  occasionChip: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.full,
    backgroundColor: COLORS.glass.backgroundHeavy,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  occasionChipText: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  compatibilityChip: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.full,
    backgroundColor: COLORS.glass.backgroundHeavy,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  compatibilityScore: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.primary,
  },
  occasionSection: {
    marginBottom: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  label: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  occasionDisplay: {
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  occasionDisplayText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  compatibilitySection: {
    marginBottom: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  compatibilityExplanation: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.sm,
  },
  categorySection: {
    marginBottom: LAYOUT.spacing.xl,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.xs,
    marginBottom: LAYOUT.spacing.md,
  },
  categoryTitle: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsScroll: {
    flexDirection: 'row',
    paddingRight: LAYOUT.spacing.md,
  },
  itemCard: {
    width: 80,
    marginRight: LAYOUT.spacing.sm,
    alignItems: 'center',
    position: 'relative',
    padding: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  bottomSpacer: {
    height: LAYOUT.spacing.md,
  },
  footer: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: LAYOUT.spacing.sm,
  },
  deleteButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  tryOnSection: {
    marginBottom: LAYOUT.spacing.xl,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  tryOnDescription: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.md,
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.sm,
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  uploadPhotoButtonText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.primary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  photoPreviewContainer: {
    marginBottom: LAYOUT.spacing.md,
  },
  personPhotoPreview: {
    width: '100%',
    height: 300,
    borderRadius: LAYOUT.borderRadius.lg,
    backgroundColor: COLORS.surfaceSecondary,
    marginBottom: LAYOUT.spacing.sm,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.spacing.xs,
    paddingVertical: LAYOUT.spacing.sm,
  },
  changePhotoButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
  },
  generateTryOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.lg,
    marginBottom: LAYOUT.spacing.md,
  },
  generateTryOnButtonDisabled: {
    opacity: 0.6,
  },
  generateTryOnButtonText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.surface,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  tryOnResultContainer: {
    marginTop: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tryOnResultLabel: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.medium,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tryOnResultImage: {
    width: '100%',
    height: 400,
    borderRadius: LAYOUT.borderRadius.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
});

