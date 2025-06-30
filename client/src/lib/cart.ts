import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { calculateTotal, roundUpToNearestTenAgorot, type ProductUnit } from './currency';

export interface CartItem {
  productId: number;
  quantity: number; // quantity based on unit (pieces, kg, grams)
  price: string; // Store price at time of adding to cart for consistency
  unit: string; // Store unit for calculations
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
        const existingItemIndex = items.findIndex(item => item.productId === product.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items];
          const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newQuantity
          };
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            productId: product.id,
            quantity,
            price: product.price,
            unit: product.unit
          };
          set({ items: [...items, newItem] });
        }
      },
      
      removeItem: (productId) => {
        const items = get().items;
        set({ items: items.filter(item => item.productId !== productId) });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        const items = get().items;
        const updatedItems = items.map(item => 
          item.productId === productId
            ? {
                ...item,
                quantity
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
        const total = get().items.reduce((total, item) => {
          const itemTotal = calculateTotal(parseFloat(item.price), item.quantity, item.unit as ProductUnit);
          return total + itemTotal;
        }, 0);
        return roundUpToNearestTenAgorot(total);
      }
    }),
    {
      name: 'restaurant-cart-storage',
    }
  )
);
