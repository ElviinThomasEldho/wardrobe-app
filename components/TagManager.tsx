import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTags } from '../contexts/TagsContext';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import TagChip from './TagChip';

export default function TagManager() {
  const { tags, loading, addTag, updateTagById, deleteTagById, getTagUsageCount } = useTags();
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [usageCounts, setUsageCounts] = useState<Record<string, { items: number; outfits: number }>>({});

  useEffect(() => {
    // Load usage counts for all tags
    const loadUsageCounts = async () => {
      const counts: Record<string, { items: number; outfits: number }> = {};
      for (const tag of tags) {
        try {
          const count = await getTagUsageCount(tag.id);
          counts[tag.id] = count;
        } catch (error) {
          console.error(`Failed to load usage count for tag ${tag.id}:`, error);
          counts[tag.id] = { items: 0, outfits: 0 };
        }
      }
      setUsageCounts(counts);
    };

    if (tags.length > 0) {
      loadUsageCounts();
    }
  }, [tags, getTagUsageCount]);

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
      setNewTagName('');
      Alert.alert('Success', 'Tag created successfully');
    }
  };

  const handleStartEdit = (tagId: string, currentName: string) => {
    setEditingTagId(tagId);
    setEditName(currentName);
  };

  const handleSaveEdit = async (tagId: string) => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Tag name cannot be empty');
      return;
    }

    const trimmedName = editName.trim().toLowerCase();
    const existingTag = tags.find(
      (tag) => tag.id !== tagId && tag.name.toLowerCase() === trimmedName
    );

    if (existingTag) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    const success = await updateTagById(tagId, { name: trimmedName });
    if (success) {
      setEditingTagId(null);
      setEditName('');
      Alert.alert('Success', 'Tag updated successfully');
    }
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditName('');
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    const count = usageCounts[tagId] || { items: 0, outfits: 0 };
    const totalUsage = count.items + count.outfits;

    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tagName}"?${
        totalUsage > 0
          ? `\n\nThis tag is used by ${count.items} item(s) and ${count.outfits} outfit(s). The tag will be removed from all items and outfits.`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTagById(tagId);
            if (success) {
              Alert.alert('Success', 'Tag deleted successfully');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Tag</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter tag name..."
            value={newTagName}
            onChangeText={setNewTagName}
            onSubmitEditing={handleCreateTag}
            placeholderTextColor={COLORS.textTertiary}
          />
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateTag}
          >
            <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Tags ({tags.length})
        </Text>
        {tags.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="pricetag-outline"
              size={LAYOUT.sizes.iconXLarge}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyStateText}>No tags yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first tag above
            </Text>
          </View>
        ) : (
          <View style={styles.tagsList}>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tagItem}>
                {editingTagId === tag.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.editInput}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                      placeholderTextColor={COLORS.textTertiary}
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => handleSaveEdit(tag.id)}
                    >
                      <Ionicons name="checkmark" size={LAYOUT.sizes.iconSmall} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelEdit}
                    >
                      <Ionicons name="close" size={LAYOUT.sizes.iconSmall} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.tagInfo}>
                      <TagChip tag={tag} size="medium" />
                      {usageCounts[tag.id] && (
                        <Text style={styles.usageText}>
                          {usageCounts[tag.id].items} items, {usageCounts[tag.id].outfits} outfits
                        </Text>
                      )}
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleStartEdit(tag.id, tag.name)}
                      >
                        <Ionicons name="pencil" size={LAYOUT.sizes.iconSmall} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteTag(tag.id, tag.name)}
                      >
                        <Ionicons name="trash-outline" size={LAYOUT.sizes.iconSmall} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xxl,
  },
  section: {
    marginBottom: LAYOUT.spacing.lg,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
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
    backgroundColor: COLORS.primary,
    width: LAYOUT.sizes.buttonHeightSmall,
    height: LAYOUT.sizes.buttonHeightSmall,
    borderRadius: LAYOUT.sizes.buttonHeightSmall / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsList: {
    gap: LAYOUT.spacing.sm,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    gap: LAYOUT.spacing.sm,
  },
  tagInfo: {
    flex: 1,
    gap: LAYOUT.spacing.xs,
  },
  usageText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textTertiary,
    marginTop: LAYOUT.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
  },
  actionButton: {
    padding: LAYOUT.spacing.xs,
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.sm,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    padding: LAYOUT.spacing.xs,
  },
  cancelButton: {
    padding: LAYOUT.spacing.xs,
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
});

