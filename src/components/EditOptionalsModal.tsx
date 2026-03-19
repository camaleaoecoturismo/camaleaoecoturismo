import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OptionalItem, prepareOptionalsForSave } from '@/lib/optionals';

interface TourOptionalItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface EditOptionalsModalProps {
  open: boolean;
  onClose: () => void;
  participantId?: string;
  reservaId: string;
  participantName: string;
  currentOptionals: OptionalItem[];
  tourOptionalItems: TourOptionalItem[];
  onSaved: () => void;
}

const EditOptionalsModal: React.FC<EditOptionalsModalProps> = ({
  open,
  onClose,
  participantId,
  reservaId,
  participantName,
  currentOptionals,
  tourOptionalItems,
  onSaved
}) => {
  const { toast } = useToast();
  const [optionals, setOptionals] = useState<OptionalItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOptional, setNewOptional] = useState({ id: '', nome: '', valor: '' });
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (open) {
      // Deep copy to avoid mutations
      setOptionals(currentOptionals.map(o => ({ ...o })));
      setShowAddForm(false);
      setNewOptional({ id: '', nome: '', valor: '' });
      setUseCustom(false);
    }
  }, [open, currentOptionals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleRemove = (index: number) => {
    setOptionals(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setOptionals(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const handleAdd = () => {
    if (useCustom) {
      if (!newOptional.nome || !newOptional.valor) {
        toast({ title: "Preencha nome e valor", variant: "destructive" });
        return;
      }
      const customItem: OptionalItem = {
        id: `custom_${Date.now()}`,
        name: newOptional.nome,
        price: parseFloat(newOptional.valor) || 0,
        quantity: 1
      };
      setOptionals(prev => [...prev, customItem]);
    } else {
      if (!newOptional.id) {
        toast({ title: "Selecione um item", variant: "destructive" });
        return;
      }
      const selectedItem = tourOptionalItems.find(item => item.id === newOptional.id);
      if (!selectedItem) return;

      // Check if already exists
      const existingIndex = optionals.findIndex(o => o.id === selectedItem.id);
      if (existingIndex >= 0) {
        // Increment quantity
        setOptionals(prev => prev.map((item, i) => 
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        setOptionals(prev => [...prev, {
          id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          quantity: 1
        }]);
      }
    }
    
    setNewOptional({ id: '', nome: '', valor: '' });
    setShowAddForm(false);
    setUseCustom(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const optionalsJson = prepareOptionalsForSave(optionals);

      if (participantId) {
        // Save to reservation_participants.selected_optionals (per-participant approach)
        const { error } = await supabase
          .from('reservation_participants')
          .update({ selected_optionals: optionalsJson as any })
          .eq('id', participantId);

        if (error) throw error;
      } else {
        // Legacy: save to reservas.selected_optional_items
        const { error } = await supabase
          .from('reservas')
          .update({ 
            selected_optional_items: optionalsJson as any,
            adicionais: [] // Clear legacy field
          })
          .eq('id', reservaId);

        if (error) throw error;
      }

      toast({ title: "Opcionais salvos!" });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving optionals:', error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const total = optionals.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Opcionais - {participantName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current optionals list */}
          {optionals.length > 0 ? (
            <div className="space-y-2">
              {optionals.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} cada</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleQuantityChange(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleQuantityChange(index, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum opcional adicionado</p>
            </div>
          )}

          {/* Add form */}
          {showAddForm ? (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              {!useCustom && tourOptionalItems.length > 0 ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Selecionar item</Label>
                    <Select value={newOptional.id} onValueChange={(val) => setNewOptional(prev => ({ ...prev, id: val }))}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {tourOptionalItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {formatCurrency(item.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => setUseCustom(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Adicionar item personalizado
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        placeholder="Nome do item"
                        value={newOptional.nome}
                        onChange={(e) => setNewOptional(prev => ({ ...prev, nome: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newOptional.valor}
                        onChange={(e) => setNewOptional(prev => ({ ...prev, valor: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  {tourOptionalItems.length > 0 && (
                    <button
                      onClick={() => setUseCustom(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Voltar para lista
                    </button>
                  )}
                </>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} className="flex-1">
                  Adicionar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setNewOptional({ id: '', nome: '', valor: '' });
                  setUseCustom(false);
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar opcional
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditOptionalsModal;
