import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Alert,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_AREA_SIZE = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT * 0.5);

interface ImageCropScreenProps {
  imageUri: string;
  onCropComplete: (croppedUri: string) => void;
  onCancel: () => void;
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'move' | null;

export default function ImageCropScreen({
  imageUri,
  onCropComplete,
  onCancel,
}: ImageCropScreenProps) {
  console.log('ImageCropScreen rendered with URI:', imageUri);
  
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState({
    x: 0,
    y: 0,
    width: CROP_AREA_SIZE,
    height: CROP_AREA_SIZE,
  });
  const [imageLayout, setImageLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const activeHandleRef = useRef<ResizeHandle>(null);
  const initialCropAreaRef = useRef(cropArea);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('ImageCropScreen: Loading image size for:', imageUri);
    setIsLoading(true);
    
    // Get image dimensions
    Image.getSize(
      imageUri,
      (width, height) => {
        console.log('ImageCropScreen: Image size loaded:', width, height);
        setImageSize({ width, height });
        // Center the crop area
        const centerX = (SCREEN_WIDTH - CROP_AREA_SIZE) / 2;
        const centerY = (SCREEN_HEIGHT - CROP_AREA_SIZE) / 2 - 50; // Offset for header
        const newCropArea = {
          x: centerX,
          y: centerY,
          width: CROP_AREA_SIZE,
          height: CROP_AREA_SIZE,
        };
        setCropArea(newCropArea);
        initialCropAreaRef.current = newCropArea;
        setIsLoading(false);
      },
      (error) => {
        console.error('ImageCropScreen: Error getting image size:', error);
        Alert.alert('Error', 'Failed to load image. Please try again.');
        setIsLoading(false);
        // Don't cancel immediately, let user see the error
      }
    );
  }, [imageUri]);

  // Update ref when cropArea changes (but not during drag)
  useEffect(() => {
    if (!activeHandleRef.current) {
      initialCropAreaRef.current = cropArea;
    }
  }, [cropArea]);

  const constrainToImage = (x: number, y: number, width: number, height: number) => {
    if (imageLayout.width > 0 && imageLayout.height > 0) {
      const minX = imageLayout.x;
      const maxX = imageLayout.x + imageLayout.width;
      const minY = imageLayout.y;
      const maxY = imageLayout.y + imageLayout.height;

      const constrainedX = Math.max(minX, Math.min(x, maxX - width));
      const constrainedY = Math.max(minY, Math.min(y, maxY - height));
      const constrainedWidth = Math.min(width, maxX - constrainedX);
      const constrainedHeight = Math.min(height, maxY - constrainedY);

      return {
        x: constrainedX,
        y: constrainedY,
        width: Math.max(50, constrainedWidth), // Minimum size
        height: Math.max(50, constrainedHeight), // Minimum size
      };
    } else {
      // Fallback: constrain to screen bounds
      return {
        x: Math.max(20, Math.min(x, SCREEN_WIDTH - width - 20)),
        y: Math.max(100, Math.min(y, SCREEN_HEIGHT - height - 100)),
        width: Math.max(50, Math.min(width, SCREEN_WIDTH - 40)),
        height: Math.max(50, Math.min(height, SCREEN_HEIGHT - 200)),
      };
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      initialCropAreaRef.current = { ...cropArea };

      // Determine which handle is being dragged
      // locationX and locationY are relative to the crop area view
      const handleSize = 30;
      const { width, height } = cropArea;
      
      let handle: ResizeHandle = 'move';
      
      // Check corners first (larger hit area)
      if (locationX < handleSize && locationY < handleSize) {
        handle = 'top-left';
      } else if (locationX > width - handleSize && locationY < handleSize) {
        handle = 'top-right';
      } else if (locationX < handleSize && locationY > height - handleSize) {
        handle = 'bottom-left';
      } else if (locationX > width - handleSize && locationY > height - handleSize) {
        handle = 'bottom-right';
      } 
      // Check edges (smaller hit area, but still reasonable)
      else if (locationY < 15 && locationX >= 15 && locationX <= width - 15) {
        handle = 'top';
      } else if (locationY > height - 15 && locationX >= 15 && locationX <= width - 15) {
        handle = 'bottom';
      } else if (locationX < 15 && locationY >= 15 && locationY <= height - 15) {
        handle = 'left';
      } else if (locationX > width - 15 && locationY >= 15 && locationY <= height - 15) {
        handle = 'right';
      }
      
      activeHandleRef.current = handle;
      setActiveHandle(handle);
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const currentHandle = activeHandleRef.current;
      const { x: initialX, y: initialY, width: initialWidth, height: initialHeight } = initialCropAreaRef.current;

      let newCropArea = { ...initialCropAreaRef.current };

      switch (currentHandle) {
        case 'move':
          newCropArea.x = initialX + dx;
          newCropArea.y = initialY + dy;
          break;

        case 'top-left':
          newCropArea.x = initialX + dx;
          newCropArea.y = initialY + dy;
          newCropArea.width = initialWidth - dx;
          newCropArea.height = initialHeight - dy;
          break;

        case 'top-right':
          newCropArea.y = initialY + dy;
          newCropArea.width = initialWidth + dx;
          newCropArea.height = initialHeight - dy;
          break;

        case 'bottom-left':
          newCropArea.x = initialX + dx;
          newCropArea.width = initialWidth - dx;
          newCropArea.height = initialHeight + dy;
          break;

        case 'bottom-right':
          newCropArea.width = initialWidth + dx;
          newCropArea.height = initialHeight + dy;
          break;

        case 'top':
          newCropArea.y = initialY + dy;
          newCropArea.height = initialHeight - dy;
          break;

        case 'bottom':
          newCropArea.height = initialHeight + dy;
          break;

        case 'left':
          newCropArea.x = initialX + dx;
          newCropArea.width = initialWidth - dx;
          break;

        case 'right':
          newCropArea.width = initialWidth + dx;
          break;
      }

      // Ensure minimum size
      if (newCropArea.width < 50) {
        if (currentHandle?.includes('left')) {
          newCropArea.x = initialX + initialWidth - 50;
        }
        newCropArea.width = 50;
      }
      if (newCropArea.height < 50) {
        if (currentHandle?.includes('top')) {
          newCropArea.y = initialY + initialHeight - 50;
        }
        newCropArea.height = 50;
      }

      // Constrain to image bounds
      const constrained = constrainToImage(newCropArea.x, newCropArea.y, newCropArea.width, newCropArea.height);
      setCropArea(constrained);
    },
    onPanResponderRelease: () => {
      activeHandleRef.current = null;
      setActiveHandle(null);
    },
  });

  const handleCrop = async () => {
    try {
      // Calculate crop region relative to image
      const scaleX = imageSize.width / imageLayout.width;
      const scaleY = imageSize.height / imageLayout.height;

      const cropX = (cropArea.x - imageLayout.x) * scaleX;
      const cropY = (cropArea.y - imageLayout.y) * scaleY;
      const cropWidth = cropArea.width * scaleX;
      const cropHeight = cropArea.height * scaleY;

      // Ensure crop is within image bounds
      const finalCropX = Math.max(0, Math.min(cropX, imageSize.width - cropWidth));
      const finalCropY = Math.max(0, Math.min(cropY, imageSize.height - cropHeight));
      const finalCropWidth = Math.min(cropWidth, imageSize.width - finalCropX);
      const finalCropHeight = Math.min(cropHeight, imageSize.height - finalCropY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: finalCropX,
              originY: finalCropY,
              width: finalCropWidth,
              height: finalCropHeight,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      onCropComplete(result.uri);
    } catch (error) {
      console.error('Error cropping image:', error);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    }
  };

  const handleImageLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setImageLayout({ x, y, width, height });
    
    // Center crop area on image if not already set
    if (cropArea.x === 0 && cropArea.y === 0) {
      const centerX = x + (width - CROP_AREA_SIZE) / 2;
      const centerY = y + (height - CROP_AREA_SIZE) / 2;
      setCropArea({
        x: Math.max(x, centerX),
        y: Math.max(y, centerY),
        width: CROP_AREA_SIZE,
        height: CROP_AREA_SIZE,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Image</Text>
          <View style={styles.doneButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading image...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop Image</Text>
        <TouchableOpacity onPress={handleCrop} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          onLayout={handleImageLayout}
        />

        {/* Overlay with crop area - using absolute positioning to create hole effect */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          {/* Top overlay */}
          <View
            style={[
              styles.overlaySection,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: cropArea.y,
              },
            ]}
          />
          
          {/* Bottom overlay */}
          <View
            style={[
              styles.overlaySection,
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                top: cropArea.y + cropArea.height,
              },
            ]}
          />
          
          {/* Left overlay */}
          <View
            style={[
              styles.overlaySection,
              {
                position: 'absolute',
                top: cropArea.y,
                left: 0,
                width: cropArea.x,
                height: cropArea.height,
              },
            ]}
          />
          
          {/* Right overlay */}
          <View
            style={[
              styles.overlaySection,
              {
                position: 'absolute',
                top: cropArea.y,
                right: 0,
                left: cropArea.x + cropArea.width,
                height: cropArea.height,
              },
            ]}
          />
          
          {/* Crop area border (transparent center) */}
          <View
            style={[
              styles.cropArea,
              {
                position: 'absolute',
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Corner handles */}
            <View 
              style={[
                styles.cornerHandle, 
                styles.topLeft,
                activeHandle === 'top-left' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.cornerHandle, 
                styles.topRight,
                activeHandle === 'top-right' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.cornerHandle, 
                styles.bottomLeft,
                activeHandle === 'bottom-left' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.cornerHandle, 
                styles.bottomRight,
                activeHandle === 'bottom-right' && styles.activeHandle
              ]} 
            />
            
            {/* Edge handles */}
            <View 
              style={[
                styles.edgeHandle, 
                styles.topEdge,
                activeHandle === 'top' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.edgeHandle, 
                styles.bottomEdge,
                activeHandle === 'bottom' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.edgeHandle, 
                styles.leftEdge,
                activeHandle === 'left' && styles.activeHandle
              ]} 
            />
            <View 
              style={[
                styles.edgeHandle, 
                styles.rightEdge,
                activeHandle === 'right' && styles.activeHandle
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Drag corners or edges to resize, or drag center to move
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.md,
    paddingTop: 50,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancelButton: {
    padding: LAYOUT.spacing.sm,
  },
  headerTitle: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  doneButton: {
    padding: LAYOUT.spacing.sm,
  },
  doneButtonText: {
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.primary,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropArea: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
  cornerHandle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
  },
  topLeft: {
    top: -12,
    left: -12,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    cursor: 'nwse-resize',
  },
  topRight: {
    top: -12,
    right: -12,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    cursor: 'nesw-resize',
  },
  bottomLeft: {
    bottom: -12,
    left: -12,
    borderRightWidth: 0,
    borderTopWidth: 0,
    cursor: 'nesw-resize',
  },
  bottomRight: {
    bottom: -12,
    right: -12,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    cursor: 'nwse-resize',
  },
  edgeHandle: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    opacity: 0.8,
  },
  topEdge: {
    top: -2,
    left: 12,
    right: 12,
    height: 4,
    cursor: 'ns-resize',
  },
  bottomEdge: {
    bottom: -2,
    left: 12,
    right: 12,
    height: 4,
    cursor: 'ns-resize',
  },
  leftEdge: {
    left: -2,
    top: 12,
    bottom: 12,
    width: 4,
    cursor: 'ew-resize',
  },
  rightEdge: {
    right: -2,
    top: 12,
    bottom: 12,
    width: 4,
    cursor: 'ew-resize',
  },
  activeHandle: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.surface,
    opacity: 1,
  },
  instructions: {
    padding: LAYOUT.spacing.md,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: LAYOUT.design.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.xl,
  },
  loadingText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
  },
});

