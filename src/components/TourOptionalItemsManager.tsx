import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Package, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface OptionalItem {
  id: string;
  tour_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  order_index: number;
  image_url: string | null;
}

interface TourOptionalItemsManagerProps {
  tourId: string;
}

export const TourOptionalItemsManager = ({ tourId }: TourOptionalItemsManagerProps) => {
  const [items, setItems] = useState<OptionalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, [tourId]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_optional_items')
        .select('*')
        .eq('tour_id', tourId)
        .order('order_index');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching optional items:', error);
      toast({
        title: "Erro ao carregar itens opcionais",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    setSaving(true);
    try {
      const newItem = {
        tour_id: tourId,
        name: 'Novo Item',
        description: '',
        price: 0,
        is_active: true,
        order_index: items.length,
        image_url: null
      };

      const { data, error } = await supabase
        .from('tour_optional_items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      setItems([...items, data]);
      toast({ title: "Item adicionado" });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (itemId: string, field: keyof OptionalItem, value: any) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    setItems(updatedItems);

    try {
      const { error } = await supabase
        .from('tour_optional_items')
        .update({ [field]: value })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive"
      });
      fetchItems(); // Revert on error
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('tour_optional_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.filter(item => item.id !== itemId));
      toast({ title: "Item removido" });
    } catch (error: any) {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx. 5MB)", variant: "destructive" });
      return;
    }

    setUploadingId(itemId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `optional-item-${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `optional-items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tour-images')
        .getPublicUrl(filePath);

      await updateItem(itemId, 'image_url', publicUrl);
      toast({ title: "Imagem enviada com sucesso!" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingId(null);
      setCurrentUploadId(null);
    }
  };

  const removeImage = async (itemId: string) => {
    await updateItem(itemId, 'image_url', null);
    toast({ title: "Imagem removida" });
  };

  const triggerFileInput = (itemId: string) => {
    setCurrentUploadId(itemId);
    fileInputRef.current?.click();
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Itens Opcionais (Extras)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Itens extras que o cliente pode adicionar à reserva (ex: chapéu, camisa, kit)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => currentUploadId && handleImageUpload(e, currentUploadId)}
        />

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum item opcional cadastrado
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move mt-2" />
              
              {/* Image Upload/Preview */}
              <div className="flex-shrink-0">
                {uploadingId === item.id ? (
                  <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : item.image_url ? (
                  <div className="relative group">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(item.id)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => triggerFileInput(item.id)}
                    className="w-16 h-16 flex flex-col items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
                  </button>
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Nome do item"
                    className="h-8"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
                  <Input
                    value={item.description || ''}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="h-8"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8"
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteItem(item.id)}
                className="text-destructive hover:text-destructive mt-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={saving}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item Opcional
        </Button>
      </CardContent>
    </Card>
  );
};