import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2,
  Loader2,
  Tags
} from 'lucide-react';
import { useShopAttributes, useCreateAttributeValue } from '@/hooks/useShopProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function AttributesManager() {
  const { data: attributes = [], isLoading } = useShopAttributes();
  const createValue = useCreateAttributeValue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newAttributeName, setNewAttributeName] = useState('');
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [creatingAttribute, setCreatingAttribute] = useState(false);

  const handleCreateAttribute = async () => {
    if (!newAttributeName.trim()) return;

    setCreatingAttribute(true);
    try {
      const slug = newAttributeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { error } = await supabase
        .from('shop_attributes')
        .insert({
          name: newAttributeName.trim(),
          slug,
          order_index: attributes.length
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['shop-attributes'] });
      setNewAttributeName('');
      toast({ title: 'Atributo criado!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAttribute(false);
    }
  };

  const handleAddValue = async (attributeId: string) => {
    const value = newValues[attributeId]?.trim();
    if (!value) return;

    await createValue.mutateAsync({ attributeId, value });
    setNewValues(prev => ({ ...prev, [attributeId]: '' }));
  };

  const handleDeleteAttribute = async (attributeId: string) => {
    try {
      const { error } = await supabase
        .from('shop_attributes')
        .delete()
        .eq('id', attributeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['shop-attributes'] });
      toast({ title: 'Atributo excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    try {
      const { error } = await supabase
        .from('shop_attribute_values')
        .delete()
        .eq('id', valueId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['shop-attributes'] });
      toast({ title: 'Valor excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Atributos de Variação
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Crie atributos como Cor, Tamanho, Numeração para usar nas variações dos produtos
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Nome do novo atributo (ex: Cor)"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAttribute()}
            />
            <Button 
              onClick={handleCreateAttribute}
              disabled={!newAttributeName.trim() || creatingAttribute}
            >
              {creatingAttribute ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {attributes.map(attr => (
              <div key={attr.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{attr.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttribute(attr.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {attr.values?.map(val => (
                    <Badge 
                      key={val.id} 
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {val.value}
                      <button
                        onClick={() => handleDeleteValue(val.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {(!attr.values || attr.values.length === 0) && (
                    <span className="text-sm text-muted-foreground">Nenhum valor cadastrado</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={`Adicionar valor (ex: ${attr.name === 'Tamanho' ? 'M' : attr.name === 'Cor' ? 'Preto' : 'Valor'})`}
                    value={newValues[attr.id] || ''}
                    onChange={(e) => setNewValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddValue(attr.id)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddValue(attr.id)}
                    disabled={!newValues[attr.id]?.trim() || createValue.isPending}
                  >
                    {createValue.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {attributes.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum atributo criado. Crie atributos como "Cor" ou "Tamanho" acima.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
