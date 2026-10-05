import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  HydratedCartItem,
  CartSummary,
  Coupon,
  Product,
} from '../types';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface StoreContextType {
  // Auth state
  user: User | null;
  authLoading: boolean;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;

  // Cart state
  activeCartItems: HydratedCartItem[];
  savedForLaterItems: HydratedCartItem[];
  cartSummary: CartSummary;
  availableCoupons: Coupon[];
  cartLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  toggleSaveForLater: (itemId: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;

  // Wishlist state
  wishlistIds: string[];
  wishlistProducts: Product[];
  toggleWishlist: (productId: string) => Promise<void>;
  moveWishlistToCart: (productId: string, variantId?: string) => Promise<void>;

  // Product Comparison state (up to 4 products)
  compareIds: string[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;

  // UI Toast state
  toasts: ToastMessage[];
  showToast: (title: string, type?: 'success' | 'error' | 'info', description?: string) => void;
  dismissToast: (id: string) => void;
}

const defaultSummary: CartSummary = {
  subtotal: 0,
  sellingSubtotal: 0,
  productDiscount: 0,
  couponCode: null,
  couponDiscount: 0,
  deliveryFee: 0,
  taxableAmount: 0,
  gstRatePercent: 18,
  gstTaxAmount: 0,
  finalTotal: 0,
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [activeCartItems, setActiveCartItems] = useState<HydratedCartItem[]>([]);
  const [savedForLaterItems, setSavedForLaterItems] = useState<HydratedCartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary>(defaultSummary);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [cartLoading, setCartLoading] = useState<boolean>(false);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('krono_compare_ids');
      return saved ? JSON.parse(saved) : ['prod_01', 'prod_02'];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, type: 'success' | 'error' | 'info' = 'success', description?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const syncCartPayload = (data: any) => {
    setActiveCartItems(data.activeItems || []);
    setSavedForLaterItems(data.savedForLaterItems || []);
    setCartSummary(data.summary || defaultSummary);
    if (data.availableCoupons) {
      setAvailableCoupons(data.availableCoupons);
    }
  };

  const refreshCart = useCallback(async () => {
    if (!getStoredToken()) {
      setActiveCartItems([]);
      setSavedForLaterItems([]);
      setCartSummary(defaultSummary);
      return;
    }
    setCartLoading(true);
    try {
      const res = await apiRequest('/cart');
      syncCartPayload(res.data);
    } catch {
      // Ignore if unauthenticated
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!getStoredToken()) {
      setWishlistIds([]);
      setWishlistProducts([]);
      return;
    }
    try {
      const res = await apiRequest('/wishlist');
      setWishlistIds(res.data.productIds || []);
      setWishlistProducts(res.data.products || []);
    } catch {
      // Ignore
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await apiRequest('/auth/me');
      setUser(res.data.user);
      await Promise.all([refreshCart(), refreshWishlist()]);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshCart, refreshWishlist]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginWithToken = useCallback(
    (token: string, loggedInUser: User) => {
      setStoredToken(token);
      setUser(loggedInUser);
      refreshCart();
      refreshWishlist();
    },
    [refreshCart, refreshWishlist]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setActiveCartItems([]);
    setSavedForLaterItems([]);
    setCartSummary(defaultSummary);
    setWishlistIds([]);
    setWishlistProducts([]);
    showToast('Signed out of your account.', 'info');
  }, [showToast]);

  const addToCart = async (
    productId: string,
    variantId?: string,
    quantity = 1
  ): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in to add items to your shopping bag.', 'error');
      return false;
    }
    try {
      const res = await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      syncCartPayload(res.data);
      showToast(res.message || 'Added to shopping bag.', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Could not add item to bag.', 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await apiRequest(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      syncCartPayload(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to update quantity.', 'error');
    }
  };

  const toggleSaveForLater = async (itemId: string) => {
    try {
      const res = await apiRequest(`/cart/items/${itemId}/save-for-later`, {
        method: 'PATCH',
      });
      syncCartPayload(res.data);
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const res = await apiRequest(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      syncCartPayload(res.data);
      showToast('Item removed from shopping bag.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    try {
      const res = await apiRequest('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      syncCartPayload(res.data);
      showToast(res.message, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await apiRequest('/cart/coupon', { method: 'DELETE' });
      syncCartPayload(res.data);
      showToast('Coupon removed.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      showToast('Please sign in to save products to your wishlist.', 'error');
      return;
    }
    try {
      const res = await apiRequest('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      setWishlistIds(res.data.productIds || []);
      setWishlistProducts(res.data.products || []);
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveWishlistToCart = async (productId: string, variantId?: string) => {
    try {
      const res = await apiRequest('/wishlist/move-to-cart', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId }),
      });
      syncCartPayload(res.data.cart);
      setWishlistIds(res.data.wishlistIds || []);
      setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Moved from wishlist to shopping bag.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleCompare = useCallback(
    (productId: string) => {
      setCompareIds((prev) => {
        let next: string[];
        if (prev.includes(productId)) {
          next = prev.filter((id) => id !== productId);
          showToast('Removed from comparison tray.', 'info');
        } else {
          if (prev.length >= 4) {
            showToast('Maximum 4 products can be compared at once.', 'error');
            return prev;
          }
          next = [...prev, productId];
          showToast('Added to product comparison.', 'info');
        }
        try {
          localStorage.setItem('krono_compare_ids', JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [showToast]
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    try {
      localStorage.removeItem('krono_compare_ids');
    } catch {
      // Ignore
    }
  }, []);

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        loginWithToken,
        logout,
        refreshProfile,
        activeCartItems,
        savedForLaterItems,
        cartSummary,
        availableCoupons,
        cartLoading,
        refreshCart,
        addToCart,
        updateQuantity,
        toggleSaveForLater,
        removeFromCart,
        applyCoupon,
        removeCoupon,
        wishlistIds,
        wishlistProducts,
        toggleWishlist,
        moveWishlistToCart,
        compareIds,
        toggleCompare,
        clearCompare,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
