import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem, Category } from '../../lib/types';
import { useWardrobe } from '../../contexts';
import { uploadImage, getImageUrl, deleteImage } from '../../lib/supabase-db';
import { deleteImageFromLocal, saveImageToLocal, generateUniqueFilename } from '../../lib/files';
import { removeBackground } from '../../lib/image/background';
import { CATEGORIES, OCCASIONS, STYLES } from '../../constants/taxonomy';
import { CategoryIcon } from '../../components/CategoryIcon';
import { StyleIcon } from '../../components/StyleIcon';
import { OccasionIcon } from '../../components/OccasionIcon';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useCrudOperations } from '../../lib/hooks/useCrudOperations';
import TagSelector from '../../components/TagSelector';
import { assignTagToItem, removeTagFromItem } from '../../lib/supabase-db';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const { getItemById, updateItemById, deleteItemById, refreshItems } = useWardrobe();
  const { executeOperation, confirmOperation, showSuccessMessage, showErrorMessage, isProcessing } = useCrudOperations();
  
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [category, setCategory] = useState<Category>('tshirt');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [originalData, setOriginalData] = useState<Partial<WardrobeItem> | null>(null);

  // Helper function to convert URI to File object for React Native
  const uriToFile = async (uri: string, filename: string): Promise<any> => {
    // Get the file extension to determine MIME type
    const extension = uri.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png'; // default
    
    if (extension === 'jpg' || extension === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (extension === 'png') {
      mimeType = 'image/png';
    }
    
    const file = {
      uri: uri,
      type: mimeType,
      name: filename,
    };
    
    return file;
  };

  useEffect(() => {
    const loadItem = async () => {
      if (id) {
        const itemData = getItemById(id as string);
        if (itemData) {
          setItem(itemData);
          setCategory(itemData.category);
          setSelectedStyles(itemData.styles);
          setSelectedOccasions(itemData.occasions);
          setSelectedTags(itemData.tags || []);
        }
      }
    };
    loadItem();
  }, [id]);

  // Update local state when item changes in context
  useEffect(() => {
    if (id) {
      const itemData = getItemById(id as string);
      if (itemData && itemData !== item) {
        setItem(itemData);
        setCategory(itemData.category);
        setSelectedStyles(itemData.styles);
        setSelectedOccasions(itemData.occasions);
        setSelectedTags(itemData.tags || []);
      }
    }
  }, [item?.id, item?.category, item?.styles, item?.occasions]);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!item) return;

    await executeOperation(
      async () => {
        // Delete image file (handle both local and Supabase)
        if (item.imagePath.startsWith('http')) {
          // Extract path from Supabase URL for deletion
          const pathMatch = item.imagePath.match(/wardrobe-images\/(.+)$/);
          if (pathMatch) {
            await deleteImage(pathMatch[1]);
          }
        } else {
          await deleteImageFromLocal(item.imagePath);
        }
        
        // Delete from database
        const success = await deleteItemById(item.id);
        if (!success) {
          throw new Error('Failed to delete item from database');
        }
        
        return success;
      },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          showSuccessMessage('Item deleted successfully!');
          router.back();
        },
        onError: (error) => {
          setShowDeleteDialog(false);
          showErrorMessage(`Failed to delete item: ${error}`);
        },
      }
    );
  };

  const handleEdit = () => {
    if (!item) return;
    
    // Store original data for potential rollback
    setOriginalData({
      category: item.category,
      styles: [...item.styles],
      occasions: [...item.occasions],
      tags: [...(item.tags || [])],
    });
    
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalData) {
      setCategory(originalData.category || 'tshirt');
      setSelectedStyles(originalData.styles || []);
      setSelectedOccasions(originalData.occasions || []);
      setSelectedTags(originalData.tags || []);
    }
    setIsEditing(false);
    setOriginalData(null);
  };

  const handleSave = async () => {
    if (!item) return;

    // Update tags separately
    const originalTags = item.tags || [];
    const tagsToAdd = selectedTags.filter(tagId => !originalTags.includes(tagId));
    const tagsToRemove = originalTags.filter(tagId => !selectedTags.includes(tagId));

    // Update item properties
    const updatedItem = await executeOperation(
      async () => {
        // Update item properties
        const result = await updateItemById(item.id, {
          category,
          styles: selectedStyles,
          occasions: selectedOccasions,
        });

        // Update tags
        await Promise.all([
          ...tagsToAdd.map(tagId => assignTagToItem(item.id, tagId)),
          ...tagsToRemove.map(tagId => removeTagFromItem(item.id, tagId)),
        ]);

        // Refresh items to get updated tags
        await refreshItems();
        const refreshedItem = getItemById(item.id);
        return refreshedItem;
      },
      {
        onSuccess: (result) => {
          if (result) {
            setItem(result);
            setIsEditing(false);
            setOriginalData(null);
            showSuccessMessage('Item updated successfully!');
          }
        },
        onError: (error) => {
          showErrorMessage(`Failed to update item: ${error}`);
        },
      }
    );
  };

  const handleTagSelectionChange = (tagIds: string[]) => {
    setSelectedTags(tagIds);
  };

  const reprocessImage = async () => {
    if (!item) return;

    await executeOperation(
      async () => {
        // Remove background
        const processedUri = await removeBackground(item.imagePath);
        
        // Generate unique filename
        const filename = generateUniqueFilename();
        
        // Convert processed image URI to File object
        const imageFile = await uriToFile(processedUri, filename);
        
        // Upload image to Supabase storage
        const uploadResult = await uploadImage(imageFile, filename);
        
        // Get the public URL for the uploaded image
        const imageUrl = getImageUrl(uploadResult.path);
        
        // Also save locally as backup
        const savedImagePath = await saveImageToLocal(processedUri, filename);
        
        // Delete the old image file (if it's local)
        if (item.imagePath.startsWith('file://')) {
          await deleteImageFromLocal(item.imagePath);
        }
        
        // Update item with new Supabase image URL
        const updatedItem = await updateItemById(item.id, {
          imagePath: imageUrl,
        });

        if (!updatedItem) {
          throw new Error('Failed to update item with new image');
        }

        return updatedItem;
      },
      {
        onSuccess: (result) => {
          if (result) {
            setItem(result);
            showSuccessMessage('Image reprocessed successfully!');
          }
        },
        onError: (error) => {
          showErrorMessage(`Failed to reprocess image: ${error}`);
        },
      }
    );
  };


  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const toggleOccasion = (occasion: string) => {
    setSelectedOccasions(prev => 
      prev.includes(occasion) 
        ? prev.filter(o => o !== occasion)
        : [...prev, occasion]
    );
  };

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading item...</Text>
      </View>
    );
  }

  const renderImageSection = () => (
    <View style={styles.imageSection}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}` }} 
          style={styles.image} 
        />
        
        {/* Colors overlay on top left */}
        <View style={styles.colorsOverlay}>
          {item.colors.slice(0, 4).map((color, index) => (
            <View
              key={index}
              style={[styles.colorDot, { backgroundColor: color }]}
            />
          ))}
          {item.colors.length > 4 && (
            <View style={styles.moreColorsDot}>
              <Text style={styles.moreColorsText}>+{item.colors.length - 4}</Text>
            </View>
          )}
        </View>
        
        {/* Reprocess button on top right */}
        <TouchableOpacity 
          style={[styles.reprocessImageButtonOverlay, isProcessing && styles.buttonDisabled]} 
          onPress={reprocessImage}
          disabled={isProcessing}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>
    </View>
  );



  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Section - Now at the top */}
        {renderImageSection()}
        
        {/* Main Info Section - Date */}
        <View style={styles.mainInfoSection}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              Added {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {/* Category Section */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Category</Text>
          {isEditing ? (
            <View style={styles.categoryButtonsContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    category === cat.value && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <CategoryIcon 
                    category={cat.value} 
                    size={20} 
                    color={category === cat.value ? COLORS.surface : COLORS.textPrimary} 
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    category === cat.value && styles.categoryButtonTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.categoryDisplay}>
              <View style={styles.categoryDisplayRow}>
                <CategoryIcon 
                  category={item.category} 
                  size={20} 
                  color={COLORS.textPrimary} 
                />
                <Text style={styles.categoryText}>
                  {CATEGORIES.find(cat => cat.value === item.category)?.label}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Styles Section */}
        <View style={styles.stylesSection}>
          <Text style={styles.sectionTitle}>Styles</Text>
          {isEditing ? (
            <View style={styles.tagsContainer}>
              {STYLES.map(style => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.tag,
                    selectedStyles.includes(style) && styles.tagActive,
                  ]}
                  onPress={() => toggleStyle(style)}
                >
                  <View style={styles.tagContent}>
                    <StyleIcon 
                      style={style} 
                      size={16} 
                      color={selectedStyles.includes(style) ? COLORS.surface : COLORS.textSecondary} 
                    />
                    <Text style={[
                      styles.tagText,
                      selectedStyles.includes(style) && styles.tagTextActive,
                    ]}>
                      {style}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.tagsContainer}>
              {item.styles.length > 0 ? (
                item.styles.map((style, index) => (
                  <View key={index} style={styles.tag}>
                    <View style={styles.tagContent}>
                      <StyleIcon style={style} size={14} color={COLORS.textSecondary} />
                      <Text style={styles.tagText}>{style}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyStateText}>No styles selected</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Occasions Section */}
        <View style={styles.occasionsSection}>
          <Text style={styles.sectionTitle}>Occasions</Text>
          {isEditing ? (
            <View style={styles.tagsContainer}>
              {OCCASIONS.map(occasion => (
                <TouchableOpacity
                  key={occasion}
                  style={[
                    styles.tag,
                    selectedOccasions.includes(occasion) && styles.tagActive,
                  ]}
                  onPress={() => toggleOccasion(occasion)}
                >
                  <View style={styles.tagContent}>
                    <OccasionIcon 
                      occasion={occasion} 
                      size={16} 
                      color={selectedOccasions.includes(occasion) ? COLORS.surface : COLORS.textSecondary} 
                    />
                    <Text style={[
                      styles.tagText,
                      selectedOccasions.includes(occasion) && styles.tagTextActive,
                    ]}>
                      {occasion}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.tagsContainer}>
              {item.occasions.length > 0 ? (
                item.occasions.map((occasion, index) => (
                  <View key={index} style={styles.tag}>
                    <View style={styles.tagContent}>
                      <OccasionIcon occasion={occasion} size={14} color={COLORS.textSecondary} />
                      <Text style={styles.tagText}>{occasion}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyStateText}>No occasions selected</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Tags Section */}
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Tags</Text>
          {isEditing ? (
            <TagSelector
              selectedTagIds={selectedTags}
              onSelectionChange={handleTagSelectionChange}
              allowCreate={true}
            />
          ) : (
            <View style={styles.tagsContainer}>
              {item.tags && item.tags.length > 0 ? (
                <Text style={styles.emptyStateText}>
                  {item.tags.length} tag(s) assigned
                </Text>
              ) : (
                <Text style={styles.emptyStateText}>No tags assigned</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Bottom padding to account for fixed buttons */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Fixed Bottom Button Container */}
      <View style={styles.fixedButtonContainer}>
        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.saveButton, isProcessing && styles.buttonDisabled]} 
              onPress={handleSave}
              disabled={isProcessing}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cancelButton, isProcessing && styles.buttonDisabled]} 
              onPress={handleCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEdit}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButtonSquare} 
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.surface} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Item"
        message={`Are you sure you want to delete this ${item?.category} item? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isProcessing}
        message={isProcessing ? "Processing..." : ""}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: LAYOUT.spacing.lg,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
  },
  reprocessImageButtonOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.sm,
    right: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  colorsOverlay: {
    position: 'absolute',
    top: LAYOUT.spacing.sm,
    left: LAYOUT.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: LAYOUT.spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moreColorsDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moreColorsText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: LAYOUT.spacing.lg, // Space for header
    paddingBottom: 100, // Space for fixed buttons
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  mainInfoSection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  nameContainer: {
    marginBottom: LAYOUT.spacing.md,
  },
  dateContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: LAYOUT.spacing.md,
  },
  categorySection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  categoryDisplay: {
    marginTop: LAYOUT.spacing.sm,
  },
  stylesSection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  occasionsSection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  tagsSection: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.lg,
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginHorizontal: LAYOUT.spacing.lg,
  },
  emptyStateText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginTop: LAYOUT.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.lg,
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.sm,
  },
  imageSection: {
    marginBottom: LAYOUT.spacing.lg,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    height: 320,
    borderRadius: LAYOUT.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: LAYOUT.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: COLORS.surface,
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  inputContainer: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.md,
  },
  inputText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nameText: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginTop: LAYOUT.spacing.xs,
  },
  categoryText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  categoryButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
    marginRight: LAYOUT.spacing.xs,
    marginBottom: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: COLORS.surface,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: LAYOUT.spacing.sm,
  },
  tag: {
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
    marginRight: LAYOUT.spacing.xs,
    marginBottom: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagActive: {
    backgroundColor: COLORS.primary,
  },
  tagText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  tagTextActive: {
    color: COLORS.surface,
  },
  dateText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.xs,
  },
  bottomPadding: {
    height: 20,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.md,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    flex: 1,
  },
  editButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    paddingVertical: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    flex: 1,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  cancelButton: {
    backgroundColor: COLORS.textSecondary,
    paddingVertical: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    flex: 1,
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  deleteButtonSquare: {
    backgroundColor: COLORS.error,
    width: 56,
    height: 56,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
