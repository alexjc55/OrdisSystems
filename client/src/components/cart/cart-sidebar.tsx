import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatQuantity, type ProductUnit } from "@/lib/currency";
import { X, Plus, Minus, Trash2, ShoppingCart, Info, Tag, Gift, CheckCircle } from "lucide-react";
import { useUTMNavigate } from "@/hooks/use-utm-navigate";
import { useState, useEffect, useRef } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { suppressedHistoryBack, isPopstateSuppressed } from "@/hooks/useModalBackButton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

// Calculate delivery fee based on order total and free delivery threshold
const calculateDeliveryFee = (orderTotal: number, deliveryFee: number, freeDeliveryFrom: number | null) => {
  if (!freeDeliveryFrom || freeDeliveryFrom <= 0) {
    return deliveryFee;
  }
  return orderTotal >= freeDeliveryFrom ? 0 : deliveryFee;
};

export default function CartSidebar() {
  const {
    items, isOpen, setCartOpen, updateQuantity, removeItem, getTotalPrice,
    appliedCoupon, setAppliedCoupon, giftAccepted, setGiftAccepted
  } = useCartStore();
  const navigate = useUTMNavigate();
  const [editingQuantity, setEditingQuantity] = useState<{[key: number]: string}>({});
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  const backButtonRef = useRef<{ pushed: boolean; handler: ((e: PopStateEvent) => void) | null }>({ pushed: false, handler: null });
  const suppressHistoryBackRef = useRef(false);

  // Loyalty context query
  const { data: loyaltyContext } = useQuery<{
    loyaltyDiscountEnabled: boolean;
    loyaltyDiscountPercent: number;
    giftEnabled: boolean;
    giftProduct: any | null;
    giftProductQuantity: number;
    giftMinOrderAmount: number;
  }>({
    queryKey: ['/api/loyalty/context'],
    staleTime: 5 * 60 * 1000,
  });

  // Coupon validation mutation
  const validateCouponMutation = useMutation({
    mutationFn: async ({ code, orderTotal, cartItems }: { code: string; orderTotal: number; cartItems?: Array<{ productId: number; quantity: number; totalPrice: string }> }) => {
      return await apiRequest('POST', '/api/coupons/validate', { code, orderTotal, cartItems });
    },
    onSuccess: (data) => {
      if (data.valid) {
        setAppliedCoupon({
          code: couponInput.toUpperCase(),
          discountType: data.coupon.discountType,
          discountValue: parseFloat(data.coupon.discountValue),
          discountAmount: data.discountAmount,
        });
        setCouponError(null);
        setCouponInput("");
      } else {
        setCouponError(data.message);
        setAppliedCoupon(null);
      }
    },
    onError: () => {
      setCouponError('coupon_error');
      setAppliedCoupon(null);
    }
  });

  const subtotal = getTotalPrice();

  // Fetch volume discounts for all products in cart
  const cartProductIds = items.map(item => item.product?.id).filter(Boolean) as number[];
  const { data: volumeDiscountsMap } = useQuery<Record<number, Array<{ minQuantity: string; discountType: string; discountValue: string }>>>({
    queryKey: ['/api/products/volume-discounts', cartProductIds.join(',')],
    queryFn: () => apiRequest('GET', `/api/products/volume-discounts?productIds=${cartProductIds.join(',')}`),
    enabled: cartProductIds.length > 0,
    staleTime: 60 * 1000,
  });

  // Compute per-item volume discounts — apply the highest applicable tier per item
  const volumeDiscountAmount = (() => {
    if (!volumeDiscountsMap) return 0;
    let total = 0;
    for (const item of items) {
      if (!item.product?.id) continue;
      const tiers = (volumeDiscountsMap[item.product.id] || []).filter(t =>
        t.minQuantity !== null && parseFloat(t.minQuantity) <= item.quantity
      );
      if (tiers.length === 0) continue;
      // Pick the highest applicable tier
      const best = tiers.reduce((a, b) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
      const pct = parseFloat(best.discountValue);
      if (best.discountType === 'percentage') {
        total += Math.round(item.totalPrice * pct / 100 * 100) / 100;
      } else {
        total += Math.min(pct, item.totalPrice);
      }
    }
    return Math.round(total * 100) / 100;
  })();

  const subtotalAfterVolumeDiscounts = Math.max(0, subtotal - volumeDiscountAmount);

  // Loyalty discount: any registered user, only when NO coupon is applied (non-stacking rule)
  const loyaltyDiscountAmount = (!appliedCoupon && loyaltyContext?.loyaltyDiscountEnabled && user && loyaltyContext.loyaltyDiscountPercent > 0)
    ? Math.round((subtotalAfterVolumeDiscounts * loyaltyContext.loyaltyDiscountPercent / 100) * 100) / 100
    : 0;

  // Gift eligibility — based on raw subtotal before discounts
  const giftEligible = loyaltyContext?.giftEnabled && loyaltyContext?.giftProduct && subtotal >= (loyaltyContext.giftMinOrderAmount || 300);

  // Effective subtotal after loyalty discount (based on volume-discounted amount)
  const subtotalAfterLoyalty = subtotalAfterVolumeDiscounts - loyaltyDiscountAmount;

  // Coupon discount: use the server-returned discountAmount as the authoritative value.
  // Server already computed it correctly for both order-scoped and product-scoped coupons,
  // so we never recalculate on the client — this prevents product-scoped coupon over-discount.
  const couponDiscountAmount = appliedCoupon?.discountAmount ?? 0;

  const subtotalAfterDiscounts = Math.max(0, appliedCoupon
    ? subtotalAfterVolumeDiscounts - couponDiscountAmount
    : subtotalAfterLoyalty);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    // Validate against the volume-discounted subtotal (pre-loyalty, pre-coupon base)
    const cartItemsForValidation = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      totalPrice: item.totalPrice.toString(),
    }));
    validateCouponMutation.mutate({ code: couponInput, orderTotal: subtotalAfterVolumeDiscounts, cartItems: cartItemsForValidation });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ cartOpen: true }, '', window.location.href);
      backButtonRef.current.pushed = true;

      const onPopState = () => {
        if (isPopstateSuppressed()) return;
        backButtonRef.current.pushed = false;
        backButtonRef.current.handler = null;
        window.removeEventListener('popstate', onPopState);
        setCartOpen(false);
      };

      window.addEventListener('popstate', onPopState);
      backButtonRef.current.handler = onPopState;

      return () => {
        window.removeEventListener('popstate', onPopState);
      };
    } else {
      const { pushed, handler } = backButtonRef.current;
      if (handler) {
        window.removeEventListener('popstate', handler);
        backButtonRef.current.handler = null;
      }
      if (pushed && !suppressHistoryBackRef.current) {
        backButtonRef.current.pushed = false;
        suppressedHistoryBack();
      }
      suppressHistoryBackRef.current = false;
    }
  }, [isOpen]);

  const handleQuantityChange = (productId: number, newQuantity: number, unit: ProductUnit) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      let adjustedQuantity = newQuantity;
      if (unit === "piece" || unit === "portion") {
        adjustedQuantity = Math.round(newQuantity);
      } else if (unit === "kg") {
        adjustedQuantity = Number(newQuantity.toFixed(1));
      } else {
        adjustedQuantity = Number(newQuantity.toFixed(1));
      }
      updateQuantity(productId, adjustedQuantity);
    }
  };

  const getIncrementValue = (unit: ProductUnit) => {
    switch (unit) {
      case "piece":
      case "portion":
        return 1;
      case "kg":
        return 0.1;
      case "100g":
      case "100ml":
        return 50;
      default:
        return 50;
    }
  };

  const handleManualQuantityChange = (productId: number, value: string, unit: ProductUnit) => {
    setEditingQuantity(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityBlur = (productId: number, unit: ProductUnit) => {
    const value = editingQuantity[productId];
    if (value !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        handleQuantityChange(productId, numValue, unit);
      }
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    }
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent, productId: number, unit: ProductUnit) => {
    if (e.key === 'Enter') {
      handleQuantityBlur(productId, unit);
    }
  };

  const getDisplayQuantity = (item: any) => {
    const productId = item.product?.id || 0;
    if (editingQuantity[productId] !== undefined) {
      return editingQuantity[productId];
    }
    return item.quantity?.toString() || '0';
  };

  const handleCheckout = () => {
    if (backButtonRef.current.handler) {
      window.removeEventListener('popstate', backButtonRef.current.handler);
      backButtonRef.current.handler = null;
    }
    suppressHistoryBackRef.current = true;
    setCartOpen(false);
    navigate("/checkout");
  };

  const getCouponErrorText = (msg: string | null) => {
    if (!msg) return '';
    switch (msg) {
      case 'coupon_not_found': return t('cart.couponNotFound');
      case 'coupon_inactive': return t('cart.couponInactive');
      case 'coupon_expired': return t('cart.couponExpired');
      case 'coupon_max_uses': return t('cart.couponMaxUses');
      case 'coupon_already_used': return t('cart.couponAlreadyUsed');
      case 'coupon_not_eligible': return t('cart.couponNotEligible');
      case 'coupon_not_eligible_for_cart': return t('cart.couponNotEligibleForCart');
      case 'coupon_min_order': return t('cart.couponMinOrder');
      default: return t('cart.couponError');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute inset-0" onClick={() => setCartOpen(false)} />
      
      <div className="absolute top-0 h-full w-full max-w-md bg-white shadow-xl cart-sidebar">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('cart.title')} ({items.length})
            </h2>
            <button
              onClick={() => setCartOpen(false)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('cart.empty')}</h3>
                  <p className="text-gray-500 mb-4">{t('cart.emptyDescription')}</p>
                  <Button onClick={() => setCartOpen(false)}>
                    {t('cart.continueShopping')}
                  </Button>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {items.filter(item => item && item.product && item.product.id).map((item) => (
                    <div key={item.product.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                  {getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru') || item.product.name || 'Product'}
                                </h4>
                                {item.product.availabilityStatus === 'out_of_stock_today' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                          <Info className="h-3 w-3" />
                                          {t('preOrder')}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{t('preOrderTooltip')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {getLocalizedField(item.product, 'description', currentLanguage as SupportedLanguage, 'ru') || item.product.description || ''}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.product?.id || 0)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(
                                    item.product?.id || 0, 
                                    item.quantity - getIncrementValue((item.product?.unit || "100g") as ProductUnit),
                                    (item.product?.unit || "100g") as ProductUnit
                                  )}
                                  className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary-light"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="text"
                                  value={getDisplayQuantity(item)}
                                  onChange={(e) => handleManualQuantityChange(item.product?.id || 0, e.target.value, (item.product?.unit || "100g") as ProductUnit)}
                                  onBlur={() => handleQuantityBlur(item.product?.id || 0, (item.product?.unit || "100g") as ProductUnit)}
                                  onKeyPress={(e) => handleQuantityKeyPress(e, item.product?.id || 0, (item.product?.unit || "100g") as ProductUnit)}
                                  className="w-16 h-8 text-center text-sm font-bold border-gray-200 focus:border-primary"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(
                                    item.product?.id || 0, 
                                    item.quantity + getIncrementValue((item.product?.unit || "100g") as ProductUnit),
                                    (item.product?.unit || "100g") as ProductUnit
                                  )}
                                  className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary-light"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatQuantity(item.quantity, (item.product?.unit || "100g") as ProductUnit, t)}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.product.price)} {(() => {
                                  switch (item.product.unit) {
                                    case 'piece': return `${t('units.per')} ${t('units.piece')}`;
                                    case 'portion': return `${t('units.per')} ${t('units.portion')}`;
                                    case 'kg': return `${t('units.per')} ${t('units.kg')}`;
                                    case '100g': return t('units.per100g');
                                    case '100ml': return t('units.per100ml');
                                    default: return item.product.unit;
                                  }
                                })()}
                              </div>
                              {(() => {
                                if (!volumeDiscountsMap || !item.product?.id) return null;
                                const tiers = (volumeDiscountsMap[item.product.id] || []).filter(tier =>
                                  tier.minQuantity !== null && parseFloat(tier.minQuantity) <= item.quantity
                                );
                                if (tiers.length === 0) return null;
                                const best = tiers.reduce((a, b) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
                                const pct = parseFloat(best.discountValue);
                                const itemSaving = best.discountType === 'percentage'
                                  ? Math.round(item.totalPrice * pct / 100 * 100) / 100
                                  : Math.min(pct, item.totalPrice);
                                if (itemSaving <= 0) return null;
                                const discountedTotal = Math.max(0, item.totalPrice - itemSaving);
                                return (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="text-sm line-through text-gray-400">{formatCurrency(item.totalPrice)}</div>
                                    <div className="font-bold text-lg text-green-600">{formatCurrency(discountedTotal)}</div>
                                    <div className="text-xs text-green-600 font-medium">-{best.discountType === 'percentage' ? `${pct}%` : formatCurrency(pct)}</div>
                                  </div>
                                );
                              })() || (
                                <div className="font-bold text-lg text-gray-900">
                                  {formatCurrency(item.totalPrice)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t bg-white p-4 space-y-3">

              {/* Gift Banner */}
              {giftEligible && loyaltyContext?.giftProduct && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Gift className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-800">{t('cart.giftAvailable')}</p>
                      <p className="text-xs text-green-700 mt-0.5 truncate">
                        {getLocalizedField(loyaltyContext.giftProduct, 'name', currentLanguage as SupportedLanguage, 'ru') || loyaltyContext.giftProduct.name}
                        {loyaltyContext.giftProductQuantity && loyaltyContext.giftProductQuantity > 0 && (() => {
                          const qty = loyaltyContext.giftProductQuantity;
                          const unit = loyaltyContext.giftProduct.unit;
                          const unitLabel =
                            unit === 'piece'   ? t('units.piece') :
                            unit === 'portion' ? t('units.portion') :
                            unit === 'kg'      ? t('units.kg') :
                            unit === '100ml'   ? t('units.ml') :
                            t('units.g');
                          return <span className="ml-1 font-medium">— {qty} {unitLabel}</span>;
                        })()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={giftAccepted ? "default" : "outline"}
                      onClick={() => setGiftAccepted(!giftAccepted)}
                      className={`text-xs flex-shrink-0 h-7 ${giftAccepted ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-400 text-green-700 hover:bg-green-100'}`}
                    >
                      {giftAccepted ? <><CheckCircle className="h-3 w-3 mr-1" />{t('cart.giftAdded')}</> : t('cart.addGift')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Coupon Input */}
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-primary-light border border-primary rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">{appliedCoupon.code}</span>
                      <span className="text-xs text-primary-dark">
                        -{formatCurrency(appliedCoupon.discountAmount)}
                      </span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('cart.enterCoupon')}
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      className="h-9 text-sm uppercase"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || validateCouponMutation.isPending}
                      className="h-9 flex-shrink-0 border-primary text-primary hover:bg-primary-light"
                    >
                      {validateCouponMutation.isPending ? '...' : t('cart.applyCoupon')}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-xs text-red-500">{getCouponErrorText(couponError)}</p>
                )}
              </div>

              {/* Totals */}
              <div className="bg-gradient-to-r from-primary-light to-yellow-50 rounded-xl p-4 border border-primary">
                <div className="space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span>{t('cart.items')}:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {/* Volume discount line */}
                  {volumeDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>{t('cart.volumeDiscount')}:</span>
                      <span>-{formatCurrency(volumeDiscountAmount)}</span>
                    </div>
                  )}

                  {/* Loyalty discount line */}
                  {loyaltyDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>{t('cart.loyaltyDiscount')} ({loyaltyContext!.loyaltyDiscountPercent}%):</span>
                      <span>-{formatCurrency(loyaltyDiscountAmount)}</span>
                    </div>
                  )}

                  {/* Coupon discount line */}
                  {appliedCoupon && couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>{t('cart.couponDiscount')} ({appliedCoupon.code}):</span>
                      <span>-{formatCurrency(couponDiscountAmount)}</span>
                    </div>
                  )}

                  {/* Delivery */}
                  {(() => {
                    const freeDeliveryThreshold = storeSettings?.freeDeliveryFrom ? parseFloat(storeSettings.freeDeliveryFrom) : null;
                    const deliveryFeeAmount = calculateDeliveryFee(
                      subtotalAfterDiscounts,
                      parseFloat(storeSettings?.deliveryFee || "15.00"),
                      freeDeliveryThreshold
                    );
                    const total = subtotalAfterDiscounts + deliveryFeeAmount;

                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>{t('cart.delivery')}:</span>
                          <span>
                            {deliveryFeeAmount === 0 ? (
                              <span className="text-green-600 font-medium">{t('cart.free')}</span>
                            ) : (
                              formatCurrency(deliveryFeeAmount)
                            )}
                          </span>
                        </div>
                        {deliveryFeeAmount > 0 && freeDeliveryThreshold && freeDeliveryThreshold > 0 && (
                          <div className="text-xs text-gray-500 text-center">
                            {t('cart.freeDeliveryFrom')} {formatCurrency(freeDeliveryThreshold)}
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-700">{t('cart.total')}:</span>
                          <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Cart Banner */}
              {storeSettings?.showCartBanner && (
                <div className="space-y-3">
                  {storeSettings.cartBannerType === "text" && storeSettings.cartBannerText && (
                    <div 
                      className="rounded-xl p-4 text-center font-semibold shadow-md"
                      style={{ 
                        backgroundColor: storeSettings.cartBannerBgColor || "#f97316",
                        color: storeSettings.cartBannerTextColor || "#ffffff"
                      }}
                    >
                      <p className="text-sm leading-relaxed">
                        {getLocalizedField(storeSettings, 'cartBannerText', currentLanguage as SupportedLanguage, 'ru') || storeSettings.cartBannerText}
                      </p>
                    </div>
                  )}
                  
                  {storeSettings.cartBannerType === "image" && (getLocalizedField(storeSettings, 'cartBannerImage', currentLanguage as SupportedLanguage, 'ru') || storeSettings.cartBannerImage) && (
                    <div className="rounded-xl overflow-hidden shadow-md">
                      <img 
                        src={getLocalizedField(storeSettings, 'cartBannerImage', currentLanguage as SupportedLanguage, 'ru') || storeSettings.cartBannerImage} 
                        alt="Cart Banner"
                        className="w-full h-auto max-h-[120px] object-cover"
                        style={{ maxHeight: "120px" }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/50 text-white font-semibold py-3 rounded-xl shadow-lg transition-shadow duration-200"
                size="lg"
              >
                {t('cart.checkout')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
