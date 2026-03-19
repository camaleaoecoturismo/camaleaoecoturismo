import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Upload, Loader2 } from 'lucide-react';
import { 
  useShopCategories, 
  useShopAttributes, 
  useShopProduct,
  useCreateProduct,
  useUpdateProduct
} from '@/hooks/useShopProducts';
import { useTours } from '@/hooks/useTours';
import { supabase } from '@/integrations/supabase/client';
import { ProductVariationsManager } from './ProductVariationsManager';
import type { ProductFormData } from './types';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
}

const initialFormData: ProductFormData = {
  name: '',
  short_description: '',
  full_description: '',
  category_id: '',
  price: 0,
  is_active: true,
  show_in_checkout: true,
  checkout_order: 0,
  has_stock_control: false,
  stock_quantity: 0,
  out_of_stock_behavior: 'hide',
  show_in_all_tours: true,
  has_variations: false,
  selected_attribute_ids: [],
  selected_tour_ids: []
};

export function ProductFormModal({ open, onOpenChange, productId }: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const { data: categories = [] } = useShopCategories();
  const { data: attributes = [] } = useShopAttributes();
  const { tours = [] } = useTours();
  const { data: existingProduct, isLoading: loadingProduct } = useShopProduct(productId);
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEditing = !!productId;
  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  // Load existing product data
  useEffect(() => {
    if (existingProduct && isEditing) {
      setFormData({
        name: existingProduct.name,
        short_description: existingProduct.short_description || '',
        full_description: existingProduct.full_description || '',
        category_id: existingProduct.category_id || '',
        price: existingProduct.price,
        is_active: existingProduct.is_active,
        show_in_checkout: existingProduct.show_in_checkout,
        checkout_order: existingProduct.checkout_order,
        has_stock_control: existingProduct.has_stock_control,
        stock_quantity: existingProduct.stock_quantity,
        out_of_stock_behavior: existingProduct.out_of_stock_behavior,
        show_in_all_tours: existingProduct.show_in_all_tours,
        has_variations: existingProduct.has_variations,
        selected_attribute_ids: existingProduct.product_attributes?.map(pa => pa.attribute_id) || [],
        selected_tour_ids: existingProduct.product_tours?.map(pt => pt.tour_id) || []
      });
      setImages(existingProduct.images?.map(i => i.image_url) || []);
    } else if (!isEditing) {
      setFormData(initialFormData);
      setImages([]);
    }
  }, [existingProduct, isEditing]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setImages([]);
      setActiveTab('basic');
    }
  }, [open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `shop/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tour-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tour-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && productId) {
        await updateProduct.mutateAsync({ productId, formData, images });
      } else {
        await createProduct.mutateAsync({ ...formData, images });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const toggleAttribute = (attrId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_attribute_ids: prev.selected_attribute_ids.includes(attrId)
        ? prev.selected_attribute_ids.filter(id => id !== attrId)
        : [...prev.selected_attribute_ids, attrId]
    }));
  };

  const toggleTour = (tourId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_tour_ids: prev.selected_tour_ids.includes(tourId)
        ? prev.selected_tour_ids.filter(id => id !== tourId)
        : [...prev.selected_tour_ids, tourId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        {loadingProduct && isEditing ? (
          <div className="p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">Básico</TabsTrigger>
                <TabsTrigger value="images" className="flex-1">Imagens</TabsTrigger>
                <TabsTrigger value="stock" className="flex-1">Estoque</TabsTrigger>
                <TabsTrigger value="visibility" className="flex-1">Exibição</TabsTrigger>
                {isEditing && formData.has_variations && (
                  <TabsTrigger value="variations" className="flex-1">Variações</TabsTrigger>
                )}
              </TabsList>

              <ScrollArea className="h-[50vh] mt-4">
                <TabsContent value="basic" className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <Label>Nome do Produto *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Camisa Camaleão Ecoturismo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição Curta</Label>
                    <Input
                      value={formData.short_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      placeholder="Resumo que aparece na listagem"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição Completa</Label>
                    <Textarea
                      value={formData.full_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_description: e.target.value }))}
                      placeholder="Descrição detalhada do produto"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Preço (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Produto com Variações</Label>
                      <p className="text-xs text-muted-foreground">
                        Habilite para produtos com tamanho, cor, etc.
                      </p>
                    </div>
                    <Switch
                      checked={formData.has_variations}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_variations: checked }))}
                    />
                  </div>

                  {formData.has_variations && (
                    <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <Label>Atributos de Variação</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Selecione quais atributos este produto terá
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attributes.map(attr => (
                          <label
                            key={attr.id}
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={formData.selected_attribute_ids.includes(attr.id)}
                              onCheckedChange={() => toggleAttribute(attr.id)}
                            />
                            <span className="text-sm">{attr.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({attr.values?.length || 0} valores)
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="images" className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <Label>Imagens do Produto</Label>
                    <p className="text-xs text-muted-foreground">
                      A primeira imagem será a capa do produto
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {images.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                            Capa
                          </span>
                        )}
                      </div>
                    ))}

                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Adicionar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="stock" className="space-y-4 pr-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Controle de Estoque</Label>
                      <p className="text-xs text-muted-foreground">
                        Limitar vendas pela quantidade disponível
                      </p>
                    </div>
                    <Switch
                      checked={formData.has_stock_control}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_stock_control: checked }))}
                    />
                  </div>

                  {formData.has_stock_control && (
                    <>
                      <div className="space-y-2">
                        <Label>Quantidade em Estoque</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.has_variations 
                            ? 'Este é o estoque geral. Configure o estoque de cada variação separadamente.'
                            : 'Quantidade disponível para venda'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Quando estoque zerar</Label>
                        <Select
                          value={formData.out_of_stock_behavior}
                          onValueChange={(value: 'hide' | 'disable') => 
                            setFormData(prev => ({ ...prev, out_of_stock_behavior: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hide">Ocultar do checkout</SelectItem>
                            <SelectItem value="disable">Mostrar como indisponível</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="visibility" className="space-y-4 pr-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Produto Ativo</Label>
                      <p className="text-xs text-muted-foreground">
                        Produtos inativos não aparecem em lugar nenhum
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Mostrar no Checkout</Label>
                      <p className="text-xs text-muted-foreground">
                        Exibir este produto na etapa de pagamento
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_in_checkout}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_checkout: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ordem no Checkout</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.checkout_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkout_order: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Produtos com número menor aparecem primeiro
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Aparecer em Todos os Passeios</Label>
                      <p className="text-xs text-muted-foreground">
                        Exibir no checkout de qualquer passeio
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_in_all_tours}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_all_tours: checked }))}
                    />
                  </div>

                  {!formData.show_in_all_tours && (
                    <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <Label>Passeios Específicos</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Selecione em quais passeios este produto aparecerá
                      </p>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {tours
                            .filter(t => t.is_active)
                            .map(tour => (
                              <label
                                key={tour.id}
                                className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={formData.selected_tour_ids.includes(tour.id)}
                                  onCheckedChange={() => toggleTour(tour.id)}
                                />
                                <span className="text-sm">{tour.name}</span>
                              </label>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>

                {isEditing && formData.has_variations && productId && (
                  <TabsContent value="variations" className="pr-4">
                    <ProductVariationsManager 
                      productId={productId}
                      selectedAttributeIds={formData.selected_attribute_ids}
                    />
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
