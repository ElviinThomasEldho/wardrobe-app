import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tag } from '../lib/types';
import { useTags } from '../contexts/TagsContext';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import TagChip from './TagChip';

interface TagSelectorProps {
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  allowCreate?: boolean;
}

export default function TagSelector({
  selectedTagIds,
  onSelectionChange,
  allowCreate = true,
}: TagSelectorProps) {
  const { tags, addTag } = useTags();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(selectedTagIds);

  useEffect(() => {
    setSelectedTags(selectedTagIds);
  }, [selectedTagIds]);

  const handleTagToggle = (tagId: string) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newSelection);
    onSelectionChange(newSelection);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    const trimmedName = newTagName.trim().toLowerCase();
    const existingTag = tags.find(
      (tag) => tag.name.toLowerCase() === trimmedName
    );

    if (existingTag) {
      Alert.alert('Error', 'This tag already exists');
      return;
    }

    const newTag = await addTag(trimmedName);
    if (newTag) {
      const newSelection = [...selectedTags, newTag.id];
      setSelectedTags(newSelection);
      onSelectionChange(newSelection);
      setNewTagName('');
      setIsModalVisible(false);
    }
  };

  const selectedTagsList = tags.filter((tag) => selectedTags.includes(tag.id));
  const unselectedTagsList = tags.filter((tag) => !selectedTags.includes(tag.id));

  return (
    <View style={styles.container}>
      <View style={styles.selectedTagsContainer}>
        {selectedTagsList.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedTagsScroll}
          >
            {selectedTagsList.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                selected
                onPress={() => handleTagToggle(tag.id)}
                showRemove
                onRemove={() => handleTagToggle(tag.id)}
                size="small"
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No tags selected</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.surface} />
        <Text style={styles.addButtonText}>Add Tags</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tags</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={LAYOUT.sizes.iconMedium} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {allowCreate && (
              <View style={styles.createTagContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Create new tag..."
                  value={newTagName}
                  onChangeText={setNewTagName}
                  onSubmitEditing={handleCreateTag}
                  placeholderTextColor={COLORS.textTertiary}
                />
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateTag}
                >
                  <Ionicons name="add-circle" size={LAYOUT.sizes.iconMedium} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.tagsList}>
              {unselectedTagsList.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Available Tags</Text>
                  <View style={styles.tagsGrid}>
                    {unselectedTagsList.map((tag) => (
                      <TagChip
                        key={tag.id}
                        tag={tag}
                        onPress={() => handleTagToggle(tag.id)}
                        size="medium"
                      />
                    ))}
                  </View>
                </View>
              )}

              {selectedTagsList.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Selected Tags</Text>
                  <View style={styles.tagsGrid}>
                    {selectedTagsList.map((tag) => (
                      <TagChip
                        key={tag.id}
                        tag={tag}
                        selected
                        onPress={() => handleTagToggle(tag.id)}
                        size="medium"
                      />
                    ))}
                  </View>
                </View>
              )}

              {tags.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="pricetag-outline"
                    size={LAYOUT.sizes.iconXLarge}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.emptyStateText}>No tags yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {allowCreate
                      ? 'Create your first tag above'
                      : 'Tags can be created in Settings'}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.spacing.sm,
  },
  selectedTagsContainer: {
    minHeight: 40,
  },
  selectedTagsScroll: {
    gap: LAYOUT.spacing.xs,
    paddingVertical: LAYOUT.spacing.xs,
  },
  emptyText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.spacing.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
  },
  addButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: LAYOUT.borderRadius.xl,
    borderTopRightRadius: LAYOUT.borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: LAYOUT.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: LAYOUT.spacing.xs,
  },
  createTagContainer: {
    flexDirection: 'row',
    padding: LAYOUT.spacing.md,
    gap: LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
  },
  createButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.sm,
  },
  tagsList: {
    flex: 1,
    padding: LAYOUT.spacing.md,
  },
  section: {
    marginBottom: LAYOUT.spacing.lg,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.spacing.xxl,
  },
  emptyStateText: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textTertiary,
    marginTop: LAYOUT.spacing.xs,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
});

