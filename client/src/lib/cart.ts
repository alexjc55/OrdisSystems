import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { calculateTotal, roundUpToNearestTenAgorot, type ProductUnit } from './currency';
import { triggerPushRequestAfterAction } from './prompt-utils';

export interface CartItem {
  product: Product;
  quantity: number; // quantity based on unit (pieces, kg, grams)
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
        // Filter out invalid items and find existing item
        const validItems = items.filter(item => item.product && item.product.id);
        const existingItemIndex = validItems.findIndex(item => item.product.id === product.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...validItems];
          const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newQuantity,
            totalPrice: calculateTotal(parseFloat(product.price), newQuantity, product.unit as ProductUnit)
          };
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            quantity,
            totalPrice: calculateTotal(parseFloat(product.price), quantity, product.unit as ProductUnit)
          };
          set({ items: [...validItems, newItem] });
        }
        
        // Trigger push notification request after adding to cart (contextual moment)
        triggerPushRequestAfterAction('cart-add');
      },
      
      removeItem: (productId) => {
        const items = get().items;
        const validItems = items.filter(item => item.product && item.product.id && item.product.id !== productId);
        set({ items: validItems });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        const items = get().items;
        const validItems = items.filter(item => item.product && item.product.id);
        const updatedItems = validItems.map(item => 
          item.product.id === productId
            ? {
                ...item,
                quantity,
                totalPrice: calculateTotal(parseFloat(item.product.price), quantity, item.product.unit as ProductUnit)
              }
            : item
        );
        set({ items: updatedItems });
      },
      
      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
      
      setCartOpen: (open) => set({ isOpen: open }),
      
      getTotalItems: () => {
        const validItems = get().items.filter(item => item.product && item.product.id);
        return validItems.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        const validItems = get().items.filter(item => item.product && item.product.id);
        const total = validItems.reduce((total, item) => total + item.totalPrice, 0);
        return roundUpToNearestTenAgorot(total);
      }
    }),
    {
      name: 'restaurant-cart-storage',
    }
  )
);
