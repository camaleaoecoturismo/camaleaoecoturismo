import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Minus, ShoppingBag, Package } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// Local types for checkout - simpler than full ShopProduct
interface CheckoutProductImage {
  id: string;
  image_url: string;
  is_cover: boolean;
  order_index: number;
}

interface CheckoutVariation {
  id: string;
  variation_values: Record<string, string>;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface CheckoutAttribute {
  attribute_id: string;
  attribute: {
    id: string;
    name: string;
    slug: string;
    values: { id: string; value: string; order_index?: number }[];
  };
}

interface CheckoutProduct {
  id: string;
  name: string;
  price: number;
  short_description: string | null;
  has_stock_control: boolean;
  stock_quantity: number;
  out_of_stock_behavior: 'hide' | 'disable';
  has_variations: boolean;
  show_in_all_tours: boolean;
  images: CheckoutProductImage[];
  variations: CheckoutVariation[];
  product_attributes: CheckoutAttribute[];
  product_tours: { tour_id: string }[];
}

export interface CheckoutShopItem {
  product: CheckoutProduct;
  variation?: CheckoutVariation;
  selectedVariationValues: Record<string, string>;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ShopCheckoutGalleryProps {
  tourId: string;
  selectedItems: CheckoutShopItem[];
  onItemsChange: (items: CheckoutShopItem[]) => void;
}

export const ShopCheckoutGallery: React.FC<ShopCheckoutGalleryProps> = ({
  tourId,
  selectedItems,
  onItemsChange
}) => {
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track variation selections per product
  const [variationSelections, setVariationSelections] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    fetchProducts();
  }, [tourId]);

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [products]);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch products that should show in checkout
      const { data: productsData, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          images:shop_product_images(id, image_url, is_cover, order_index),
          variations:shop_product_variations(id, variation_values, sku, price_adjustment, stock_quantity, is_active),
          product_attributes:shop_product_attributes(
            attribute_id,
            attribute:shop_attributes(id, name, slug, values:shop_attribute_values(id, value, order_index))
          ),
          product_tours:shop_product_tours(tour_id)
        `)
        .eq('is_active', true)
        .eq('show_in_checkout', true)
        .order('checkout_order');

      if (error) throw error;

      // Filter products by tour visibility
      const filtered = (productsData || []).filter((product: any) => {
        if (product.show_in_all_tours) return true;
        return product.product_tours?.some((pt: any) => pt.tour_id === tourId);
      });

      // Filter out products with no stock (if stock control is enabled)
      const available = filtered.filter((product: any) => {
        if (!product.has_stock_control) return true;
        
        if (product.has_variations && product.variations?.length > 0) {
          // Check if any variation has stock
          const hasStock = product.variations.some((v: any) => v.is_active && v.stock_quantity > 0);
          if (!hasStock && product.out_of_stock_behavior === 'hide') return false;
          return true;
        } else {
          if (product.stock_quantity <= 0 && product.out_of_stock_behavior === 'hide') return false;
          return true;
        }
      });

      setProducts(available as CheckoutProduct[]);
    } catch (error) {
      console.error('Error fetching shop products:', error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 220;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getProductImage = (product: CheckoutProduct): string | null => {
    if (!product.images?.length) return null;
    const cover = product.images.find(img => img.is_cover);
    return cover?.image_url || product.images[0]?.image_url || null;
  };

  const getAvailableStock = (product: CheckoutProduct, variationId?: string): number => {
    if (!product.has_stock_control) return 999;
    
    if (variationId && product.has_variations) {
      const variation = product.variations.find(v => v.id === variationId);
      return variation?.stock_quantity || 0;
    }
    
    return product.stock_quantity;
  };

  const isProductOutOfStock = (product: CheckoutProduct, variationId?: string): boolean => {
    if (!product.has_stock_control) return false;
    return getAvailableStock(product, variationId) <= 0;
  };

  const getSelectedItem = (product: CheckoutProduct, variationId?: string): CheckoutShopItem | undefined => {
    return selectedItems.find(item => {
      if (item.product.id !== product.id) return false;
      if (variationId) return item.variation?.id === variationId;
      return !item.variation;
    });
  };

  const getVariationForSelections = (product: CheckoutProduct, selections: Record<string, string>): CheckoutVariation | undefined => {
    if (!product.has_variations || !product.variations?.length) return undefined;
    
    return product.variations.find(v => {
      if (!v.is_active) return false;
      const variationValues = v.variation_values as Record<string, string>;
      return Object.entries(selections).every(([key, value]) => variationValues[key] === value);
    });
  };

  const handleAddItem = (product: CheckoutProduct) => {
    const selections = variationSelections[product.id] || {};
    
    if (product.has_variations && product.product_attributes?.length) {
      // Check if all attributes are selected
      const allSelected = product.product_attributes.every(pa => selections[pa.attribute?.slug || '']);
      if (!allSelected) return;
      
      const variation = getVariationForSelections(product, selections);
      if (!variation || isProductOutOfStock(product, variation.id)) return;
      
      const existing = getSelectedItem(product, variation.id);
      if (existing) {
        // Increment quantity
        const newQty = Math.min(existing.quantity + 1, getAvailableStock(product, variation.id));
        updateItemQuantity(product, variation, newQty);
      } else {
        // Add new item
        const unitPrice = product.price + variation.price_adjustment;
        onItemsChange([...selectedItems, {
          product,
          variation,
          selectedVariationValues: selections,
          quantity: 1,
          unitPrice,
          subtotal: unitPrice
        }]);
      }
    } else {
      // No variations
      if (isProductOutOfStock(product)) return;
      
      const existing = getSelectedItem(product);
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, getAvailableStock(product));
        updateItemQuantity(product, undefined, newQty);
      } else {
        onItemsChange([...selectedItems, {
          product,
          selectedVariationValues: {},
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price
        }]);
      }
    }
  };

  const updateItemQuantity = (product: CheckoutProduct, variation: CheckoutVariation | undefined, newQty: number) => {
    if (newQty <= 0) {
      // Remove item
      onItemsChange(selectedItems.filter(item => {
        if (item.product.id !== product.id) return true;
        if (variation) return item.variation?.id !== variation.id;
        return !!item.variation;
      }));
    } else {
      // Update quantity
      onItemsChange(selectedItems.map(item => {
        const matches = item.product.id === product.id && 
          (variation ? item.variation?.id === variation.id : !item.variation);
        if (matches) {
          return { ...item, quantity: newQty, subtotal: item.unitPrice * newQty };
        }
        return item;
      }));
    }
  };

  const handleVariationChange = (productId: string, attributeSlug: string, value: string) => {
    setVariationSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [attributeSlug]: value
      }
    }));
  };

  const canAddProduct = (product: CheckoutProduct): boolean => {
    if (product.has_variations && product.product_attributes?.length) {
      const selections = variationSelections[product.id] || {};
      const allSelected = product.product_attributes.every(pa => selections[pa.attribute?.slug || '']);
      if (!allSelected) return false;
      
      const variation = getVariationForSelections(product, selections);
      if (!variation) return false;
      return !isProductOutOfStock(product, variation.id);
    }
    return !isProductOutOfStock(product);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando produtos...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Loja</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Produtos para complementar sua experiência. Retirada no embarque.
      </p>

      <div className="relative">
        {/* Scroll buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Horizontal scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {products.map(product => {
            const imageUrl = getProductImage(product);
            const hasVariations = product.has_variations && product.product_attributes?.length > 0;
            const selections = variationSelections[product.id] || {};
            const selectedVariation = hasVariations ? getVariationForSelections(product, selections) : undefined;
            const existingItem = getSelectedItem(product, selectedVariation?.id);
            const outOfStock = isProductOutOfStock(product, selectedVariation?.id);
            const canAdd = canAddProduct(product);
            
            const displayPrice = selectedVariation 
              ? product.price + selectedVariation.price_adjustment 
              : product.price;

            return (
              <div
                key={product.id}
                className={cn(
                  "flex-shrink-0 w-[180px] bg-white border rounded-xl p-3 transition-all",
                  existingItem && "ring-2 ring-primary/30 bg-primary/5"
                )}
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Product image */}
                <div className="relative mb-2">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  {outOfStock && (
                    <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] bg-gray-800 text-white">
                      Esgotado
                    </Badge>
                  )}
                </div>

                {/* Product info */}
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium line-clamp-2 leading-tight">{product.name}</h4>
                    <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(displayPrice)}</p>
                  </div>

                  {/* Variation selectors */}
                  {hasVariations && product.product_attributes && (
                    <div className="space-y-1.5">
                      {product.product_attributes.map(pa => {
                        const attr = pa.attribute;
                        if (!attr) return null;
                        
                        // Get only values that have available stock
                        const availableValues = (attr.values || []).filter(v => {
                          // Check if any active variation with this value has stock
                          return product.variations.some(variation => {
                            if (!variation.is_active) return false;
                            const variationValues = variation.variation_values as Record<string, string>;
                            if (variationValues[attr.slug] !== v.value) return false;
                            // Check stock
                            if (product.has_stock_control && variation.stock_quantity <= 0) return false;
                            return true;
                          });
                        });
                        
                        // Sort values by order_index
                        const sortedValues = [...availableValues].sort((a, b) => 
                          (a as any).order_index - (b as any).order_index
                        );
                        
                        // Helper to get stock for a specific value
                        const getStockForValue = (value: string): number => {
                          // Sum stock from all variations with this value
                          return product.variations
                            .filter(v => v.is_active && (v.variation_values as Record<string, string>)[attr.slug] === value)
                            .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                        };

                        return (
                          <Select
                            key={attr.id}
                            value={selections[attr.slug] || ''}
                            onValueChange={(val) => handleVariationChange(product.id, attr.slug, val)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder={attr.name} />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedValues.map(v => {
                                const stock = product.has_stock_control ? getStockForValue(v.value) : null;
                                return (
                                  <SelectItem key={v.id} value={v.value} className="text-xs">
                                    <span className="flex items-center justify-between gap-2 w-full">
                                      <span>{v.value}</span>
                                      {stock !== null && (
                                        <span className="text-muted-foreground text-[10px]">
                                          ({stock} disp.)
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        );
                      })}
                    </div>
                  )}

                  {/* Add/quantity controls */}
                  {existingItem ? (
                    <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-lg p-1">
                      <button
                        onClick={() => updateItemQuantity(product, selectedVariation, existingItem.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{existingItem.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(product, selectedVariation, existingItem.quantity + 1)}
                        disabled={existingItem.quantity >= getAvailableStock(product, selectedVariation?.id)}
                        className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={canAdd ? "default" : "secondary"}
                      className="w-full h-7 text-xs"
                      disabled={!canAdd}
                      onClick={() => handleAddItem(product)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary of selected shop items */}
      {selectedItems.length > 0 && (
        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Itens selecionados:</p>
          {selectedItems.map((item, idx) => (
            <div key={`${item.product.id}-${item.variation?.id || 'no-var'}-${idx}`} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.product.name}
                {item.variation && Object.keys(item.selectedVariationValues).length > 0 && (
                  <span className="ml-1 text-muted-foreground/70">
                    ({Object.values(item.selectedVariationValues).join(', ')})
                  </span>
                )}
                {item.quantity > 1 && ` x${item.quantity}`}
              </span>
              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopCheckoutGallery;
