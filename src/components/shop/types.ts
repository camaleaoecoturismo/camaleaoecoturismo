// Types for Shop module

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  category_id: string | null;
  price: number;
  is_active: boolean;
  show_in_checkout: boolean;
  checkout_order: number;
  has_stock_control: boolean;
  stock_quantity: number;
  out_of_stock_behavior: 'hide' | 'disable';
  show_in_all_tours: boolean;
  has_variations: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: ShopCategory;
  images?: ShopProductImage[];
  variations?: ShopProductVariation[];
  product_tours?: ShopProductTour[];
  product_attributes?: ShopProductAttribute[];
}

export interface ShopProductImage {
  id: string;
  product_id: string;
  image_url: string;
  order_index: number;
  is_cover: boolean;
  created_at: string;
}

export interface ShopAttribute {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  values?: ShopAttributeValue[];
}

export interface ShopAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  order_index: number;
  created_at: string;
}

export interface ShopProductAttribute {
  id: string;
  product_id: string;
  attribute_id: string;
  created_at: string;
  attribute?: ShopAttribute;
}

export interface ShopProductVariation {
  id: string;
  product_id: string;
  variation_values: Record<string, string>; // e.g., {"cor": "Preto", "tamanho": "M"}
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopProductTour {
  id: string;
  product_id: string;
  tour_id: string;
  created_at: string;
}

export interface ShopOrderItem {
  id: string;
  reserva_id: string;
  product_id: string;
  variation_id: string | null;
  product_name: string;
  variation_label: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

// Form types
export interface ProductFormData {
  name: string;
  short_description: string;
  full_description: string;
  category_id: string;
  price: number;
  is_active: boolean;
  show_in_checkout: boolean;
  checkout_order: number;
  has_stock_control: boolean;
  stock_quantity: number;
  out_of_stock_behavior: 'hide' | 'disable';
  show_in_all_tours: boolean;
  has_variations: boolean;
  selected_attribute_ids: string[];
  selected_tour_ids: string[];
}

// Note: CheckoutShopItem is defined in ShopCheckoutGallery.tsx with local types
