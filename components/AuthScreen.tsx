import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from './AuthProvider';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (isSignUp) {
        Alert.alert('Success', 'Please check your email to confirm your account');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const useTestCredentials = () => {
    setEmail('test@example.com');
    setPassword('password123');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wardrobe App</Text>
      <Text style={styles.subtitle}>
        {isSignUp ? 'Create your account' : 'Sign in to your account'}
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchButtonText}>
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testButton}
          onPress={useTestCredentials}
        >
          <Text style={styles.testButtonText}>Use Test Credentials</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: LAYOUT.design.fontSize.xxxl,
    fontWeight: LAYOUT.design.fontWeight.bold,
    marginBottom: LAYOUT.spacing.sm,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: LAYOUT.design.fontSize.md,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.spacing.xxxl,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
    fontSize: LAYOUT.design.fontSize.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: LAYOUT.spacing.md,
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: LAYOUT.design.fontSize.md,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
  switchButton: {
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: LAYOUT.design.fontSize.sm,
  },
  testButton: {
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.success,
    fontSize: LAYOUT.design.fontSize.sm,
    fontWeight: LAYOUT.design.fontWeight.semibold,
  },
});
