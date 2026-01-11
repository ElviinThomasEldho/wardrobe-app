import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, setUserPref, getUserPref, signOut } from '../lib/supabase-db';

interface User {
  id: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  preferences: Record<string, string>;
  setPreference: (key: string, value: string) => Promise<void>;
  getPreference: (key: string) => string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Record<string, string>>({});

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user';
      setError(errorMessage);
      console.error('Failed to load user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setPreference = async (key: string, value: string): Promise<void> => {
    try {
      setError(null);
      await setUserPref(key, value);
      setPreferences(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set preference';
      setError(errorMessage);
      console.error('Failed to set preference:', err);
    }
  };

  const getPreference = (key: string): string | null => {
    return preferences[key] || null;
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await signOut();
      setUser(null);
      setPreferences({});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout';
      setError(errorMessage);
      console.error('Failed to logout:', err);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await loadUser();
  };

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const value: UserContextType = {
    user,
    loading,
    error,
    preferences,
    setPreference,
    getPreference,
    logout,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
