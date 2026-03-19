import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ShopProduct, ShopCategory, ShopAttribute, ShopAttributeValue, ProductFormData } from '@/components/shop/types';

// Fetch all categories
export function useShopCategories() {
  return useQuery({
    queryKey: ['shop-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_categories')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return data as ShopCategory[];
    }
  });
}

// Fetch all attributes with values
export function useShopAttributes() {
  return useQuery({
    queryKey: ['shop-attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_attributes')
        .select(`
          *,
          values:shop_attribute_values(*)
        `)
        .order('order_index');
      
      if (error) throw error;
      return data as (ShopAttribute & { values: ShopAttributeValue[] })[];
    }
  });
}

// Fetch all products with relations
export function useShopProducts() {
  return useQuery({
    queryKey: ['shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          category:shop_categories(*),
          images:shop_product_images(*),
          variations:shop_product_variations(*),
          product_tours:shop_product_tours(*),
          product_attributes:shop_product_attributes(
            *,
            attribute:shop_attributes(*)
          )
        `)
        .order('checkout_order', { ascending: true });
      
      if (error) throw error;
      return data as ShopProduct[];
    }
  });
}

// Fetch single product
export function useShopProduct(productId: string | null) {
  return useQuery({
    queryKey: ['shop-product', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          category:shop_categories(*),
          images:shop_product_images(*),
          variations:shop_product_variations(*),
          product_tours:shop_product_tours(*),
          product_attributes:shop_product_attributes(
            *,
            attribute:shop_attributes(*)
          )
        `)
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data as ShopProduct;
    },
    enabled: !!productId
  });
}

// Create product
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: ProductFormData & { images: string[] }) => {
      // Generate slug from name
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

      // Create product
      const { data: product, error: productError } = await supabase
        .from('shop_products')
        .insert({
          name: formData.name,
          slug,
          short_description: formData.short_description || null,
          full_description: formData.full_description || null,
          category_id: formData.category_id || null,
          price: formData.price,
          is_active: formData.is_active,
          show_in_checkout: formData.show_in_checkout,
          checkout_order: formData.checkout_order,
          has_stock_control: formData.has_stock_control,
          stock_quantity: formData.stock_quantity,
          out_of_stock_behavior: formData.out_of_stock_behavior,
          show_in_all_tours: formData.show_in_all_tours,
          has_variations: formData.has_variations
        })
        .select()
        .single();

      if (productError) throw productError;

      // Add images
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map((url, index) => ({
          product_id: product.id,
          image_url: url,
          order_index: index,
          is_cover: index === 0
        }));

        const { error: imagesError } = await supabase
          .from('shop_product_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      // Add product attributes
      if (formData.selected_attribute_ids.length > 0) {
        const attrInserts = formData.selected_attribute_ids.map(attrId => ({
          product_id: product.id,
          attribute_id: attrId
        }));

        const { error: attrError } = await supabase
          .from('shop_product_attributes')
          .insert(attrInserts);

        if (attrError) throw attrError;
      }

      // Add tour associations (if not global)
      if (!formData.show_in_all_tours && formData.selected_tour_ids.length > 0) {
        const tourInserts = formData.selected_tour_ids.map(tourId => ({
          product_id: product.id,
          tour_id: tourId
        }));

        const { error: tourError } = await supabase
          .from('shop_product_tours')
          .insert(tourInserts);

        if (tourError) throw tourError;
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast({ title: 'Produto criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
    }
  });
}

// Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      formData, 
      images 
    }: { 
      productId: string; 
      formData: ProductFormData; 
      images: string[] 
    }) => {
      // Update product
      const { error: productError } = await supabase
        .from('shop_products')
        .update({
          name: formData.name,
          short_description: formData.short_description || null,
          full_description: formData.full_description || null,
          category_id: formData.category_id || null,
          price: formData.price,
          is_active: formData.is_active,
          show_in_checkout: formData.show_in_checkout,
          checkout_order: formData.checkout_order,
          has_stock_control: formData.has_stock_control,
          stock_quantity: formData.stock_quantity,
          out_of_stock_behavior: formData.out_of_stock_behavior,
          show_in_all_tours: formData.show_in_all_tours,
          has_variations: formData.has_variations
        })
        .eq('id', productId);

      if (productError) throw productError;

      // Replace images
      await supabase.from('shop_product_images').delete().eq('product_id', productId);
      
      if (images.length > 0) {
        const imageInserts = images.map((url, index) => ({
          product_id: productId,
          image_url: url,
          order_index: index,
          is_cover: index === 0
        }));

        const { error: imagesError } = await supabase
          .from('shop_product_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      // Replace attributes
      await supabase.from('shop_product_attributes').delete().eq('product_id', productId);
      
      if (formData.selected_attribute_ids.length > 0) {
        const attrInserts = formData.selected_attribute_ids.map(attrId => ({
          product_id: productId,
          attribute_id: attrId
        }));

        const { error: attrError } = await supabase
          .from('shop_product_attributes')
          .insert(attrInserts);

        if (attrError) throw attrError;
      }

      // Replace tour associations
      await supabase.from('shop_product_tours').delete().eq('product_id', productId);
      
      if (!formData.show_in_all_tours && formData.selected_tour_ids.length > 0) {
        const tourInserts = formData.selected_tour_ids.map(tourId => ({
          product_id: productId,
          tour_id: tourId
        }));

        const { error: tourError } = await supabase
          .from('shop_product_tours')
          .insert(tourInserts);

        if (tourError) throw tourError;
      }

      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast({ title: 'Produto atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar produto', description: error.message, variant: 'destructive' });
    }
  });
}

// Delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('shop_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast({ title: 'Produto excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir produto', description: error.message, variant: 'destructive' });
    }
  });
}

// Manage variations
export function useProductVariations(productId: string | null) {
  return useQuery({
    queryKey: ['shop-product-variations', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('shop_product_variations')
        .select('*')
        .eq('product_id', productId)
        .order('created_at');
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId
  });
}

export function useCreateVariation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variation: {
      product_id: string;
      variation_values: Record<string, string>;
      sku?: string;
      price_adjustment: number;
      stock_quantity: number;
    }) => {
      const { data, error } = await supabase
        .from('shop_product_variations')
        .insert(variation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shop-product-variations', data.product_id] });
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast({ title: 'Variação criada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar variação', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteVariation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ variationId, productId }: { variationId: string; productId: string }) => {
      const { error } = await supabase
        .from('shop_product_variations')
        .delete()
        .eq('id', variationId);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['shop-product-variations', productId] });
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      toast({ title: 'Variação excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir variação', description: error.message, variant: 'destructive' });
    }
  });
}

// Manage attribute values
export function useCreateAttributeValue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attributeId, value }: { attributeId: string; value: string }) => {
      const { data: existing } = await supabase
        .from('shop_attribute_values')
        .select('order_index')
        .eq('attribute_id', attributeId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 1;

      const { data, error } = await supabase
        .from('shop_attribute_values')
        .insert({
          attribute_id: attributeId,
          value,
          order_index: nextOrder
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-attributes'] });
      toast({ title: 'Valor adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });
}
