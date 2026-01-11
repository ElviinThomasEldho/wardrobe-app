import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return 'warning-outline';
      case 'warning':
        return 'alert-circle-outline';
      case 'info':
        return 'information-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'info':
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return styles.dangerButton;
      case 'warning':
        return styles.warningButton;
      case 'info':
        return styles.infoButton;
      default:
        return styles.defaultButton;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Ionicons name={getIcon()} size={LAYOUT.sizes.iconMedium} color={getIconColor()} />
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={getConfirmButtonStyle()}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: LAYOUT.spacing.lg,
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.spacing.xl,
    width: '100%',
    maxWidth: 400,
    elevation: LAYOUT.elevation.high,
    shadowColor: LAYOUT.shadow.color,
    shadowOffset: LAYOUT.shadow.offset,
    shadowOpacity: LAYOUT.shadow.opacity,
    shadowRadius: LAYOUT.shadow.radius,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
  title: {
    fontSize: LAYOUT.design.fontSize.lg,
    fontWeight: LAYOUT.design.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginLeft: LAYOUT.spacing.sm,
    flex: 1,
  },
  message: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    lineHeight: LAYOUT.design.lineHeight.relaxed * LAYOUT.design.fontSize.md,
    marginBottom: LAYOUT.spacing.xl,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: LAYOUT.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  cancelButtonText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: LAYOUT.design.fontWeight.medium,
  },
  confirmButtonText: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.surface,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  dangerButton: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.error,
  },
  warningButton: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.warning,
  },
  infoButton: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.info,
  },
  defaultButton: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.sm,
    backgroundColor: COLORS.primary,
  },
});