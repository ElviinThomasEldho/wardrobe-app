import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserPref, setUserPref } from '../lib/supabase-db';
import { CATEGORIES, OCCASIONS, STYLES } from '../constants/taxonomy';
import { CategoryIcon } from '../components/CategoryIcon';
import { useAuth } from '../components/AuthProvider';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import TagManager from '../components/TagManager';

export default function SettingsScreen() {
  const [customOccasions, setCustomOccasions] = useState<string[]>([]);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [newOccasion, setNewOccasion] = useState('');
  const [newStyle, setNewStyle] = useState('');
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadCustomTaxonomy();
  }, []);

  const loadCustomTaxonomy = async () => {
    try {
      const occasionsData = await getUserPref('custom_occasions');
      const stylesData = await getUserPref('custom_styles');
      
      if (occasionsData) {
        setCustomOccasions(JSON.parse(occasionsData));
      }
      if (stylesData) {
        setCustomStyles(JSON.parse(stylesData));
      }
    } catch (error) {
      console.error('Failed to load custom taxonomy:', error);
    }
  };

  const saveCustomTaxonomy = async () => {
    try {
      await setUserPref('custom_occasions', JSON.stringify(customOccasions));
      await setUserPref('custom_styles', JSON.stringify(customStyles));
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save custom taxonomy:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const addCustomOccasion = () => {
    if (!newOccasion.trim()) {
      Alert.alert('Error', 'Please enter an occasion name');
      return;
    }

    const occasion = newOccasion.trim().toLowerCase();
    if (customOccasions.includes(occasion) || OCCASIONS.includes(occasion as any)) {
      Alert.alert('Error', 'This occasion already exists');
      return;
    }

    setCustomOccasions(prev => [...prev, occasion]);
    setNewOccasion('');
  };

  const addCustomStyle = () => {
    if (!newStyle.trim()) {
      Alert.alert('Error', 'Please enter a style name');
      return;
    }

    const style = newStyle.trim().toLowerCase();
    if (customStyles.includes(style) || STYLES.includes(style as any)) {
      Alert.alert('Error', 'This style already exists');
      return;
    }

    setCustomStyles(prev => [...prev, style]);
    setNewStyle('');
  };

  const removeCustomOccasion = (occasion: string) => {
    Alert.alert(
      'Remove Occasion',
      `Are you sure you want to remove "${occasion}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCustomOccasions(prev => prev.filter(o => o !== occasion));
          },
        },
      ]
    );
  };

  const removeCustomStyle = (style: string) => {
    Alert.alert(
      'Remove Style',
      `Are you sure you want to remove "${style}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCustomStyles(prev => prev.filter(s => s !== style));
          },
        },
      ]
    );
  };

  const renderUserInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDefaultTaxonomy = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Default Categories</Text>
      <View style={styles.tagsContainer}>
        {CATEGORIES.map(category => (
          <View key={category.value} style={styles.defaultTag}>
            <CategoryIcon 
              category={category.value} 
              size={16} 
              color={COLORS.textSecondary} 
            />
            <Text style={styles.defaultTagText}>
              {category.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCustomOccasions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Occasions</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Add new occasion..."
          value={newOccasion}
          onChangeText={setNewOccasion}
          onSubmitEditing={addCustomOccasion}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCustomOccasion}>
          <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.tagsContainer}>
        {customOccasions.map((occasion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.customTag}
            onLongPress={() => removeCustomOccasion(occasion)}
          >
            <Text style={styles.customTagText}>{occasion}</Text>
            <Ionicons name="close" size={LAYOUT.sizes.iconSmall} color={COLORS.error} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCustomStyles = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Styles</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Add new style..."
          value={newStyle}
          onChangeText={setNewStyle}
          onSubmitEditing={addCustomStyle}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCustomStyle}>
          <Ionicons name="add" size={LAYOUT.sizes.iconSmall} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.tagsContainer}>
        {customStyles.map((style, index) => (
          <TouchableOpacity
            key={index}
            style={styles.customTag}
            onLongPress={() => removeCustomStyle(style)}
          >
            <Text style={styles.customTagText}>{style}</Text>
            <Ionicons name="close" size={LAYOUT.sizes.iconSmall} color={COLORS.error} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDefaultOccasions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Default Occasions</Text>
      <View style={styles.tagsContainer}>
        {OCCASIONS.map(occasion => (
          <View key={occasion} style={styles.defaultTag}>
            <Text style={styles.defaultTagText}>{occasion}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderDefaultStyles = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Default Styles</Text>
      <View style={styles.tagsContainer}>
        {STYLES.map(style => (
          <View key={style} style={styles.defaultTag}>
            <Text style={styles.defaultTagText}>{style}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTags = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <TagManager />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderUserInfo()}
      {renderTags()}
      {renderDefaultTaxonomy()}
      {renderDefaultOccasions()}
      {renderDefaultStyles()}
      {renderCustomOccasions()}
      {renderCustomStyles()}
      
      <TouchableOpacity style={styles.saveButton} onPress={saveCustomTaxonomy}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: LAYOUT.spacing.md,
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.md,
    elevation: LAYOUT.elevation.low,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  sectionTitle: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textPrimary,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  signOutText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: LAYOUT.borderRadius.sm,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.sm,
    fontSize: LAYOUT.design.fontSize.md,
    marginRight: LAYOUT.spacing.sm,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: LAYOUT.sizes.buttonHeightSmall,
    height: LAYOUT.sizes.buttonHeightSmall,
    borderRadius: LAYOUT.sizes.buttonHeightSmall / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.md,
    marginRight: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.sm,
  },
  defaultTagText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
  },
  customTag: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.borderRadius.md,
    marginRight: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTagText: {
    fontSize: LAYOUT.design.fontSize.xs,
    color: COLORS.accent,
    fontWeight: LAYOUT.design.fontWeight.medium,
    textTransform: 'capitalize',
    marginRight: LAYOUT.spacing.xs,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    margin: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
});