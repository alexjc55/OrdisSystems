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

export interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number; // computed discount in currency units
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  appliedCoupon: AppliedCoupon | null;
  giftAccepted: boolean;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateProductSnapshot: (productId: number, patch: Partial<Product>) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  setGiftAccepted: (accepted: boolean) => void;
}

// Returns the effective unit price for a product, applying its own special-offer
// discount (isSpecialOffer + discountType/discountValue) when present.
// This ensures that cart totals and downstream discount calculations (loyalty, coupon)
// operate on the price the customer actually pays, not the full base price.
function getEffectivePrice(product: Product): number {
  const base = parseFloat(product.price);
  if (product.isSpecialOffer && product.discountType && product.discountValue) {
    const dv = parseFloat(String(product.discountValue));
    if (!isNaN(dv)) {
      if (product.discountType === 'percentage') return Math.max(0, base * (1 - dv / 100));
      if (product.discountType === 'fixed') return Math.max(0, base - dv);
    }
  }
  return base;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      appliedCoupon: null,
      giftAccepted: false,
      
      addItem: (product, quantity) => {
        const items = get().items;
        // Filter out invalid items and find existing item
        const validItems = items.filter(item => item.product && item.product.id);
        const existingItemIndex = validItems.findIndex(item => item.product.id === product.id);
        const effectivePrice = getEffectivePrice(product);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...validItems];
          const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newQuantity,
            totalPrice: calculateTotal(effectivePrice, newQuantity, product.unit as ProductUnit)
          };
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            quantity,
            totalPrice: calculateTotal(effectivePrice, quantity, product.unit as ProductUnit)
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
                totalPrice: calculateTotal(getEffectivePrice(item.product), quantity, item.product.unit as ProductUnit)
              }
            : item
        );
        set({ items: updatedItems });
      },
      
      // Patch product availability snapshot in cart without changing quantity/price
      updateProductSnapshot: (productId, patch) => {
        const items = get().items;
        const validItems = items.filter(item => item.product && item.product.id);
        const updatedItems = validItems.map(item =>
          item.product.id === productId
            ? { ...item, product: { ...item.product, ...patch } }
            : item
        );
        set({ items: updatedItems });
      },
      
      clearCart: () => set({ items: [], appliedCoupon: null, giftAccepted: false }),
      
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
      },

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      setGiftAccepted: (accepted) => set({ giftAccepted: accepted }),
    }),
    {
      name: 'restaurant-cart-storage',
      // Do NOT persist isOpen — cart should always start closed.
      // Persisting it caused CartSidebar to push a history entry on admin page
      // load (if the cart was open when the user last left the shop page),
      // and its subsequent close would fire an unsuppressed popstate that
      // closed any open admin modal.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
