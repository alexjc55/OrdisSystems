import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { calculateTotal, roundUpToNearestTenAgorot, type ProductUnit } from './currency';

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
        const existingItemIndex = items.findIndex(item => item.product.id === product.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items];
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
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        const total = get().items.reduce((total, item) => total + item.totalPrice, 0);
        return roundUpToNearestTenAgorot(total);
      }
    }),
    {
      name: 'restaurant-cart-storage',
    }
  )
);
