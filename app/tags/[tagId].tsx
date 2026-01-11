import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem, Outfit } from '../../lib/types';
import { useTags, useWardrobe, useOutfits } from '../../contexts';
import { bulkAssignTagToItems, bulkAssignTagToOutfits } from '../../lib/supabase-db';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import ItemCard from '../../components/ItemCard';
import OutfitCard from '../../components/OutfitCard';
import TagChip from '../../components/TagChip';
import { useCrudOperations } from '../../lib/hooks/useCrudOperations';

type ViewMode = 'items' | 'outfits' | 'both';

export default function TagDetailScreen() {
  const { tagId } = useLocalSearchParams();
  const router = useRouter();
  const { getTagById, getItemsByTag, getOutfitsByTag } = useTags();
  const { items, refreshItems } = useWardrobe();
  const { outfits, refreshOutfits } = useOutfits();
  const { executeOperation, showSuccessMessage, showErrorMessage, isProcessing } = useCrudOperations();

  const [tag, setTag] = useState(getTagById(tagId as string));
  const [taggedItems, setTaggedItems] = useState<WardrobeItem[]>([]);
  const [taggedOutfits, setTaggedOutfits] = useState<Outfit[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTagData();
  }, [tagId]);

  const loadTagData = async () => {
    if (!tagId) return;
    
    setLoading(true);
    try {
      const tagData = getTagById(tagId as string);
      setTag(tagData);

      const [itemsData, outfitsData] = await Promise.all([
        getItemsByTag(tagId as string),
        getOutfitsByTag(tagId as string),
      ]);

      setTaggedItems(itemsData);
      setTaggedOutfits(outfitsData);
    } catch (error) {
      console.error('Failed to load tag data:', error);
      Alert.alert('Error', 'Failed to load tag data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItems = () => {
    setIsSelectionMode(true);
    setViewMode('items');
  };

  const handleAddOutfits = () => {
    setIsSelectionMode(true);
    setViewMode('outfits');
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItemIds(new Set());
    setSelectedOutfitIds(new Set());
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleToggleOutfitSelection = (outfitId: string) => {
    setSelectedOutfitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outfitId)) {
        newSet.delete(outfitId);
      } else {
        newSet.add(outfitId);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = async () => {
    if (!tagId) return;

    const itemIds = Array.from(selectedItemIds);
    const outfitIds = Array.from(selectedOutfitIds);

    if (itemIds.length === 0 && outfitIds.length === 0) {
      Alert.alert('No Selection', 'Please select at least one item or outfit');
      return;
    }

    await executeOperation(
      async () => {
        await Promise.all([
          itemIds.length > 0 && bulkAssignTagToItems(itemIds, tagId as string),
          outfitIds.length > 0 && bulkAssignTagToOutfits(outfitIds, tagId as string),
        ]);

        await Promise.all([refreshItems(), refreshOutfits()]);
        await loadTagData();
      },
      {
        onSuccess: () => {
          showSuccessMessage('Items/Outfits added to tag successfully!');
          setIsSelectionMode(false);
          setSelectedItemIds(new Set());
          setSelectedOutfitIds(new Set());
        },
        onError: (error) => {
          showErrorMessage(`Failed to add items/outfits: ${error}`);
        },
      }
    );
  };

  const getAvailableItems = () => {
    return items.filter(item => !taggedItems.some(tagged => tagged.id === item.id));
  };

  const getAvailableOutfits = () => {
    return outfits.filter(outfit => !taggedOutfits.some(tagged => tagged.id === outfit.id));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tag...</Text>
      </View>
    );
  }

  if (!tag) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={LAYOUT.sizes.iconXLarge} color={COLORS.error} />
        <Text style={styles.errorText}>Tag not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCount = taggedItems.length + taggedOutfits.length;
  const selectedCount = selectedItemIds.size + selectedOutfitIds.size;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={LAYOUT.sizes.iconMedium} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <TagChip tag={tag} size="large" />
          <Text style={styles.countText}>
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {!isSelectionMode && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddItems}
            >
              <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddOutfits}
            >
              <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionText}>
            {selectedCount} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSelection}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, selectedCount === 0 && styles.confirmButtonDisabled]}
              onPress={handleConfirmSelection}
              disabled={selectedCount === 0 || isProcessing}
            >
              <Text style={styles.confirmButtonText}>Add ({selectedCount})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* View Mode Toggle */}
      {!isSelectionMode && (
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'items' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('items')}
          >
            <Text style={[styles.viewModeText, viewMode === 'items' && styles.viewModeTextActive]}>
              Items ({taggedItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'outfits' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('outfits')}
          >
            <Text style={[styles.viewModeText, viewMode === 'outfits' && styles.viewModeTextActive]}>
              Outfits ({taggedOutfits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'both' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('both')}
          >
            <Text style={[styles.viewModeText, viewMode === 'both' && styles.viewModeTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isSelectionMode ? (
        <FlatList
          style={styles.content}
          data={viewMode === 'items' ? getAvailableItems() : getAvailableOutfits()}
          numColumns={2}
          keyExtractor={(item) => (item as WardrobeItem | Outfit).id}
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { padding: LAYOUT.spacing.md }]}>
              Select {viewMode === 'items' ? 'Items' : 'Outfits'} to Add
            </Text>
          }
          renderItem={({ item }) => {
            if (viewMode === 'items') {
              const wardrobeItem = item as WardrobeItem;
              return (
                <TouchableOpacity
                  style={[
                    styles.selectionCard,
                    selectedItemIds.has(wardrobeItem.id) && styles.selectionCardSelected,
                  ]}
                  onPress={() => handleToggleItemSelection(wardrobeItem.id)}
                >
                  <Image
                    source={{ uri: wardrobeItem.imagePath.startsWith('http') ? wardrobeItem.imagePath : `file://${wardrobeItem.imagePath}` }}
                    style={styles.selectionImage}
                    resizeMode="cover"
                  />
                  {selectedItemIds.has(wardrobeItem.id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            } else {
              const outfit = item as Outfit;
              return (
                <TouchableOpacity
                  style={[
                    styles.selectionCard,
                    selectedOutfitIds.has(outfit.id) && styles.selectionCardSelected,
                  ]}
                  onPress={() => handleToggleOutfitSelection(outfit.id)}
                >
                  {outfit.items.length > 0 ? (
                    <Image
                      source={{ uri: outfit.items[0].imagePath.startsWith('http') ? outfit.items[0].imagePath : `file://${outfit.items[0].imagePath}` }}
                      style={styles.selectionImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.selectionPlaceholder}>
                      <Ionicons name="shirt-outline" size={32} color={COLORS.textTertiary} />
                    </View>
                  )}
                  {selectedOutfitIds.has(outfit.id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          }}
        />
      ) : (
        <ScrollView style={styles.content}>
          {(viewMode === 'items' || viewMode === 'both') && taggedItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items ({taggedItems.length})</Text>
              <View style={styles.gridContainer}>
                {taggedItems.map((item) => (
                  <View key={item.id} style={styles.gridItem}>
                    <ItemCard
                      item={item}
                      onPress={() => router.push(`/item/${item.id}`)}
                      onDelete={() => {}}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
          {(viewMode === 'outfits' || viewMode === 'both') && taggedOutfits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outfits ({taggedOutfits.length})</Text>
              <View style={styles.gridContainer}>
                {taggedOutfits.map((outfit) => (
                  <View key={outfit.id} style={styles.gridItem}>
                    <OutfitCard
                      outfit={outfit}
                      onPress={() => router.push(`/outfits/edit?id=${outfit.id}`)}
                      onDelete={() => {}}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
          {totalCount === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={LAYOUT.sizes.iconXLarge} color={COLORS.textTertiary} />
              <Text style={styles.emptyStateText}>No items or outfits with this tag</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add items or outfits
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xl,
  },
  errorText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.lg,
    color: COLORS.textPrimary,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: LAYOUT.spacing.sm,
  },
  backButton: {
    padding: LAYOUT.spacing.xs,
  },
  headerContent: {
    flex: 1,
    gap: LAYOUT.spacing.xs,
  },
  countText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.xs,
  },
  addButton: {
    padding: LAYOUT.spacing.xs,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    backgroundColor: COLORS.primary,
  },
  selectionText: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.surface,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.md,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  viewModeToggle: {
    flexDirection: 'row',
    padding: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: LAYOUT.spacing.xs,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  viewModeTextActive: {
    color: COLORS.surface,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: LAYOUT.spacing.md,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.md,
  },
  selectionSection: {
    padding: LAYOUT.spacing.md,
  },
  selectionCard: {
    flex: 1,
    aspectRatio: 1,
    margin: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  selectionCardSelected: {
    borderColor: COLORS.success,
  },
  selectionImage: {
    width: '100%',
    height: '100%',
  },
  selectionPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  checkmark: {
    position: 'absolute',
    top: LAYOUT.spacing.xs,
    right: LAYOUT.spacing.xs,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xxl,
  },
  emptyStateText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
  },
  emptyStateSubtext: {
    marginTop: LAYOUT.spacing.xs,
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    marginTop: LAYOUT.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: LAYOUT.spacing.sm,
  },
});

