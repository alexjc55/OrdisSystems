import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { calculateTotal } from './currency';

export interface CartItem {
  product: Product;
  quantity: number; // weight in kg
  totalPrice: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (product, quantity) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(item => item.product.id === product.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
            totalPrice: calculateTotal(parseFloat(product.pricePerKg), updatedItems[existingItemIndex].quantity + quantity)
          };
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            quantity,
            totalPrice: calculateTotal(parseFloat(product.pricePerKg), quantity)
          };
          set({ items: [...items, newItem] });
        }
      },
      
      removeItem: (productId) => {
        const items = get().items;
        set({ items: items.filter(item => item.product.id !== productId) });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        const items = get().items;
        const updatedItems = items.map(item => 
          item.product.id === productId
            ? {
                ...item,
                quantity,
                totalPrice: calculateTotal(parseFloat(item.product.pricePerKg), quantity)
              }
            : item
        );
        set({ items: updatedItems });
      },
      
      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
      
      setCartOpen: (open) => set({ isOpen: open }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.totalPrice, 0);
      }
    }),
    {
      name: 'restaurant-cart-storage',
    }
  )
);
