import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { 
  useShopAttributes, 
  useProductVariations, 
  useCreateVariation,
  useDeleteVariation 
} from '@/hooks/useShopProducts';
import { formatCurrency } from '@/lib/utils';

interface ProductVariationsManagerProps {
  productId: string;
  selectedAttributeIds: string[];
}

export function ProductVariationsManager({ productId, selectedAttributeIds }: ProductVariationsManagerProps) {
  const { data: allAttributes = [] } = useShopAttributes();
  const { data: variations = [], isLoading } = useProductVariations(productId);
  const createVariation = useCreateVariation();
  const deleteVariation = useDeleteVariation();

  const [newVariation, setNewVariation] = useState<{
    values: Record<string, string>;
    sku: string;
    price_adjustment: number;
    stock_quantity: number;
  }>({
    values: {},
    sku: '',
    price_adjustment: 0,
    stock_quantity: 0
  });

  const activeAttributes = allAttributes.filter(attr => 
    selectedAttributeIds.includes(attr.id)
  );

  const handleAddVariation = async () => {
    const allAttributesSelected = activeAttributes.every(
      attr => newVariation.values[attr.slug]
    );

    if (!allAttributesSelected) {
      return;
    }

    await createVariation.mutateAsync({
      product_id: productId,
      variation_values: newVariation.values,
      sku: newVariation.sku || undefined,
      price_adjustment: newVariation.price_adjustment,
      stock_quantity: newVariation.stock_quantity
    });

    setNewVariation({
      values: {},
      sku: '',
      price_adjustment: 0,
      stock_quantity: 0
    });
  };

  const handleDeleteVariation = async (variationId: string) => {
    await deleteVariation.mutateAsync({ variationId, productId });
  };

  if (selectedAttributeIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Selecione atributos na aba "Basico" para criar variacoes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
        <h4 className="font-medium">Adicionar Variacao</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {activeAttributes.map(attr => (
            <div key={attr.id} className="space-y-1">
              <Label className="text-xs">{attr.name}</Label>
              <Select
                value={newVariation.values[attr.slug] || ''}
                onValueChange={(value) => setNewVariation(prev => ({
                  ...prev,
                  values: { ...prev.values, [attr.slug]: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione ${attr.name.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {attr.values?.map(val => (
                    <SelectItem key={val.id} value={val.value}>
                      {val.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">SKU (opcional)</Label>
            <Input
              value={newVariation.sku}
              onChange={(e) => setNewVariation(prev => ({ ...prev, sku: e.target.value }))}
              placeholder="Codigo"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ajuste de Preco (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={newVariation.price_adjustment}
              onChange={(e) => setNewVariation(prev => ({ 
                ...prev, 
                price_adjustment: parseFloat(e.target.value) || 0 
              }))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estoque</Label>
            <Input
              type="number"
              min="0"
              value={newVariation.stock_quantity}
              onChange={(e) => setNewVariation(prev => ({ 
                ...prev, 
                stock_quantity: parseInt(e.target.value) || 0 
              }))}
            />
          </div>
        </div>

        <Button 
          onClick={handleAddVariation}
          disabled={createVariation.isPending || activeAttributes.some(attr => !newVariation.values[attr.slug])}
          size="sm"
        >
          {createVariation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Adicionar Variacao
        </Button>
      </div>

      <div>
        <h4 className="font-medium mb-3">Variacoes Cadastradas ({variations.length})</h4>
        
        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : variations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma variacao cadastrada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variacao</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Ajuste Preco</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map(variation => (
                <TableRow key={variation.id}>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variation.variation_values as Record<string, string>).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {variation.sku || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {variation.price_adjustment !== 0 ? (
                      <span className={variation.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                        {variation.price_adjustment > 0 ? '+' : ''}{formatCurrency(variation.price_adjustment)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {variation.stock_quantity}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVariation(variation.id)}
                      disabled={deleteVariation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
