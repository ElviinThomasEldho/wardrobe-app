import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem } from '../lib/types';
import { useWardrobe } from '../contexts';
import { uploadImage, getImageUrl } from '../lib/supabase-db';
import { generateUniqueFilename } from '../lib/files';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
export default function AddItemScreen() {
  const { addItem, startAnalysis } = useWardrobe();
  const [isSaving, setIsSaving] = useState(false);

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

  const handleImageSelected = async (uri: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      // Upload the original image immediately (background processing will happen later)
      const filename = generateUniqueFilename();
      const imageFile = await uriToFile(uri, filename);
      
      // Upload original image to Supabase storage
      const uploadResult = await uploadImage(imageFile, filename);
      
      // Get the public URL for the uploaded image
      const imageUrl = getImageUrl(uploadResult.path);
      
      // Create item in database with minimal data (default category, empty arrays)
      // Background processing (remove background, trim, analyze) will happen in the background
      const newItem: Omit<WardrobeItem, 'id'> = {
        category: 'tshirt', // Default category, will be updated by AI
        colors: [], // Empty, will be populated by AI
        styles: [], // Empty, will be populated by AI
        occasions: [], // Empty, will be populated by AI
        imagePath: imageUrl,
        rating: 0.5, // Default rating (neutral)
        createdAt: Date.now(),
      };

      const savedItem = await addItem(newItem);
      
      if (savedItem) {
        // Start background processing: remove background → trim → analyze
        // Pass the original local URI for processing
        startAnalysis(savedItem.id, uri);
        
        // Navigate back to home screen immediately
        router.back();
      } else {
        Alert.alert('Error', 'Failed to save item. Please try again.');
      }
      
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Use built-in native crop UI
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Image is already cropped by the native picker
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
        allowsEditing: true, // Use built-in native crop UI
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Image is already cropped by the native camera
        const imageUri = result.assets[0].uri;
        await handleImageSelected(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add New Item</Text>
        <Text style={styles.subtitle}>Take a photo or choose from your gallery</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, isSaving && styles.actionButtonDisabled]} 
            onPress={takePhoto}
            disabled={isSaving}
          >
            <Ionicons name="camera" size={LAYOUT.sizes.iconXLarge} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, isSaving && styles.actionButtonDisabled]} 
            onPress={pickImage}
            disabled={isSaving}
          >
            <Ionicons name="image" size={LAYOUT.sizes.iconXLarge} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {isSaving && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Saving item...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xl,
  },
  title: {
    fontSize: LAYOUT.design.fontSize.xxl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.xxxl,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: LAYOUT.spacing.lg,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: LAYOUT.spacing.xl,
    paddingHorizontal: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: LAYOUT.spacing.md,
  },
  loadingContainer: {
    marginTop: LAYOUT.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
  },
});
