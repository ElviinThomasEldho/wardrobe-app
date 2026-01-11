import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WardrobeItem } from '../lib/types';

interface ShoppingContextType {
  shoppingItem: WardrobeItem | null;
  isAnalyzing: boolean;
  setShoppingItem: (item: WardrobeItem | null) => void;
  clearShoppingItem: () => void;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

interface ShoppingProviderProps {
  children: ReactNode;
}

export const ShoppingProvider: React.FC<ShoppingProviderProps> = ({ children }) => {
  const [shoppingItem, setShoppingItem] = useState<WardrobeItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const clearShoppingItem = () => {
    setShoppingItem(null);
    setIsAnalyzing(false);
  };

  const value: ShoppingContextType = {
    shoppingItem,
    isAnalyzing,
    setShoppingItem,
    clearShoppingItem,
    setIsAnalyzing,
  };

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
};

export const useShopping = (): ShoppingContextType => {
  const context = useContext(ShoppingContext);
  if (context === undefined) {
    throw new Error('useShopping must be used within a ShoppingProvider');
  }
  return context;
};

