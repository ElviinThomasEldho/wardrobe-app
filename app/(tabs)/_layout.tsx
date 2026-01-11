import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { AuthScreen } from '../../components/AuthScreen';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: LAYOUT.design.fontSize.xs,
          fontWeight: LAYOUT.design.fontWeight.medium,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomColor: COLORS.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: LAYOUT.design.fontWeight.semibold,
          fontSize: LAYOUT.design.fontSize.lg,
          color: COLORS.textPrimary,
        },
        headerRight: () => (
          <TouchableOpacity
            style={{ 
              marginRight: LAYOUT.spacing.lg,
              padding: LAYOUT.spacing.xs,
              borderRadius: LAYOUT.borderRadius.sm,
            }}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={LAYOUT.sizes.iconMedium} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="suggest/index"
        options={{
          title: 'Suggest',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bulb-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits/index"
        options={{
          title: 'Outfits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop/index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}


