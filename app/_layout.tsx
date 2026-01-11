import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { AuthScreen } from '../components/AuthScreen';
import { WardrobeProvider, OutfitsProvider, UserProvider, TagsProvider, ShoppingProvider } from '../contexts';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { LAYOUT } from '../constants/layout';
import '../global.css';

function RootLayoutContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WardrobeProvider>
        <OutfitsProvider>
          <TagsProvider>
            <UserProvider>
              <ShoppingProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="add" options={{ title: 'Add Item' }} />
                  <Stack.Screen name="item/[id]" options={{ title: 'Item Details' }} />
                  <Stack.Screen name="outfits/create" options={{ title: 'Create Outfit' }} />
                  <Stack.Screen name="outfits/edit" options={{ title: 'Edit Outfit' }} />
                  <Stack.Screen name="tags/[tagId]" options={{ title: 'Tag Details' }} />
                  <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                </Stack>
              </ShoppingProvider>
            </UserProvider>
          </TagsProvider>
        </OutfitsProvider>
      </WardrobeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

