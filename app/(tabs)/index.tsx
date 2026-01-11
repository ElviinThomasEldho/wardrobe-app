import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Category, WardrobeItem } from '../../lib/types';
import { useWardrobe } from '../../contexts';
import { CATEGORIES } from '../../constants/taxonomy';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import ItemCard from '../../components/ItemCard';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useCrudOperations } from '../../lib/hooks/useCrudOperations';
import TagPreviewSection from '../../components/TagPreviewSection';

export default function WardrobeScreen() {
  const { items, loading, error, deleteItemById, getItemsByCategory, refreshItems, isAnalyzing } = useWardrobe();
  const { executeOperation, showSuccessMessage, showErrorMessage, isProcessing } = useCrudOperations();
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WardrobeItem | null>(null);

  // Only refresh on initial load, not on every focus
  // The context will handle updates automatically

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshItems();
    setRefreshing(false);
  };

  const handleDeleteItem = (item: WardrobeItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    await executeOperation(
      () => deleteItemById(itemToDelete.id),
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
          showSuccessMessage('Item deleted successfully!');
        },
        onError: (error) => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
          showErrorMessage(`Failed to delete item: ${error}`);
        },
      }
    );
  };

  // Show all items, including those being analyzed (they'll be non-clickable)
  const categoryItems = getItemsByCategory(selectedCategory);
  const filteredItems = categoryItems; // Show all items, including analyzing ones

  // Get unique categories that exist in items
  const existingCategories = new Set(items.map(item => item.category));
  const availableCategories = CATEGORIES.filter(category => 
    existingCategories.has(category.value)
  );

  // Reset selected category to 'all' if the selected category no longer exists
  useEffect(() => {
    if (selectedCategory !== 'all' && !existingCategories.has(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [items, selectedCategory, existingCategories]);

  const renderItem = ({ item }: { item: WardrobeItem }) => (
    <ItemCard
      item={item}
      onPress={() => router.push(`/item/${item.id}`)}
      onDelete={() => handleDeleteItem(item)}
    />
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.categoryFilter}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'all' && styles.categoryButtonActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === 'all' && styles.categoryButtonTextActive,
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {availableCategories.map(category => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryButton,
              selectedCategory === category.value && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.value)}
          >
            <CategoryIcon 
              category={category.value} 
              size={18} 
              color={selectedCategory === category.value ? COLORS.surface : COLORS.textSecondary} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.value && styles.categoryButtonTextActive,
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <TagPreviewSection items={items} type="items" />
      {renderCategoryFilter()}
      
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={LAYOUT.sizes.iconXLarge} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No items in your wardrobe</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first item
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add')}
      >
        <Ionicons name="add" size={LAYOUT.sizes.iconMedium} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
        }}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isProcessing}
        message="Deleting item..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  categoryFilterContainer: {
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    marginRight: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
    elevation: LAYOUT.elevation.low,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: COLORS.surface,
  },
  listContainer: {
    padding: LAYOUT.spacing.lg,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.sm,
    textAlign: 'center',
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.sm,
  },
  addButton: {
    position: 'absolute',
    bottom: LAYOUT.spacing.xxxl,
    right: LAYOUT.spacing.lg,
    width: LAYOUT.sizes.fabSize,
    height: LAYOUT.sizes.fabSize,
    borderRadius: LAYOUT.sizes.fabSize / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: LAYOUT.elevation.medium,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
});