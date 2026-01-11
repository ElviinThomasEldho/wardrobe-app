import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.spacing.xl,
    alignItems: 'center',
    minWidth: 140,
    elevation: LAYOUT.elevation.medium,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  message: {
    marginTop: LAYOUT.spacing.lg,
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
});
