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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Outfit } from '@/lib/types';
import { useOutfits } from '@/contexts';
import OutfitCard from '@/components/OutfitCard';
import OutfitDetailModal from '@/components/OutfitDetailModal';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useCrudOperations } from '@/lib/hooks/useCrudOperations';
import { COLORS } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { OCCASIONS } from '@/constants/taxonomy';
import { OccasionIcon } from '@/components/OccasionIcon';
import TagPreviewSection from '@/components/TagPreviewSection';

export default function OutfitsScreen() {
  const { outfits, loading, error, deleteOutfitById, refreshOutfits } = useOutfits();
  const { executeOperation, showSuccessMessage, showErrorMessage, isProcessing } = useCrudOperations();
  const [selectedOccasion, setSelectedOccasion] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Only refresh on initial load, not on every focus
  // The context will handle updates automatically

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOutfits();
    setRefreshing(false);
  };

  const handleOutfitPress = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setShowDetailModal(true);
  };

  const handleDeleteOutfit = async (outfit: Outfit) => {
    await executeOperation(
      () => deleteOutfitById(outfit.id),
      {
        onSuccess: () => {
          showSuccessMessage('Outfit deleted successfully!');
          setShowDetailModal(false);
          setSelectedOutfit(null);
        },
        onError: (error) => {
          showErrorMessage(`Failed to delete outfit: ${error}`);
        },
      }
    );
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedOutfit(null);
  };

  // Filter outfits by selected occasion
  const filteredOutfits = selectedOccasion === 'all' 
    ? outfits 
    : outfits.filter(outfit => outfit.occasion === selectedOccasion);

  // Get unique occasions that exist in outfits
  const existingOccasions = new Set(outfits.map(outfit => outfit.occasion));
  const availableOccasions = OCCASIONS.filter(occasion => 
    existingOccasions.has(occasion)
  );

  // Reset selected occasion to 'all' if the selected occasion no longer exists
  useEffect(() => {
    if (selectedOccasion !== 'all' && !existingOccasions.has(selectedOccasion)) {
      setSelectedOccasion('all');
    }
  }, [outfits, selectedOccasion, existingOccasions]);

  const renderOutfit = ({ item }: { item: Outfit }) => (
    <OutfitCard
      outfit={item}
      onPress={() => handleOutfitPress(item)}
      onDelete={() => handleDeleteOutfit(item)}
    />
  );

  const renderOccasionFilter = () => (
    <View style={styles.occasionFilterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.occasionFilter}
      >
        <TouchableOpacity
          style={[
            styles.occasionButton,
            selectedOccasion === 'all' && styles.occasionButtonActive,
          ]}
          onPress={() => setSelectedOccasion('all')}
        >
          <Text style={[
            styles.occasionButtonText,
            selectedOccasion === 'all' && styles.occasionButtonTextActive,
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {availableOccasions.map(occasion => (
          <TouchableOpacity
            key={occasion}
            style={[
              styles.occasionButton,
              selectedOccasion === occasion && styles.occasionButtonActive,
            ]}
            onPress={() => setSelectedOccasion(occasion)}
          >
            <OccasionIcon 
              occasion={occasion} 
              size={18} 
              color={selectedOccasion === occasion ? COLORS.surface : COLORS.textSecondary} 
            />
            <Text style={[
              styles.occasionButtonText,
              selectedOccasion === occasion && styles.occasionButtonTextActive,
            ]}>
              {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <TagPreviewSection outfits={outfits} type="outfits" />
      {renderOccasionFilter()}
      
      <FlatList
        data={filteredOutfits}
        renderItem={renderOutfit}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={LAYOUT.sizes.iconXLarge} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No outfits created yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first outfit to get started
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/outfits/create')}
      >
        <Ionicons name="add" size={LAYOUT.sizes.iconMedium} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Outfit Detail Modal */}
      <OutfitDetailModal
        visible={showDetailModal}
        outfit={selectedOutfit}
        onClose={handleCloseModal}
        onDelete={handleDeleteOutfit}
        isDeleting={isProcessing}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isProcessing}
        message="Deleting outfit..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  occasionFilterContainer: {
  },
  occasionFilter: {
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.sm,
  },
  occasionButton: {
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
  occasionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  occasionButtonText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  occasionButtonTextActive: {
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
    paddingVertical: LAYOUT.spacing.xxxl,
  },
  emptyText: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.md,
  },
  emptySubtext: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: LAYOUT.spacing.xl,
    right: LAYOUT.spacing.md,
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
