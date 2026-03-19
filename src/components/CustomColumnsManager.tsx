import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
export interface CustomColumn {
  id: string;
  tour_id: string;
  column_name: string;
  column_type: 'text' | 'number' | 'currency' | 'select' | 'multiselect' | 'boolean';
  options: string[] | null;
  order_index: number;
}
export interface CustomColumnValue {
  id: string;
  reserva_id: string;
  column_id: string;
  value: string | null;
}
interface CustomColumnsManagerProps {
  tourId: string;
  columns: CustomColumn[];
  onColumnsChange: (columns: CustomColumn[]) => void;
}
const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  currency: 'Valor (R$)',
  select: 'Seleção',
  multiselect: 'Seleção Múltipla',
  boolean: 'Sim/Não'
};
export const CustomColumnsManager: React.FC<CustomColumnsManagerProps> = ({
  tourId,
  columns,
  onColumnsChange
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);
  const [newColumn, setNewColumn] = useState({
    column_name: '',
    column_type: 'text' as CustomColumn['column_type'],
    options: [] as string[]
  });
  const [newOption, setNewOption] = useState('');
  const {
    toast
  } = useToast();
  const resetForm = () => {
    setNewColumn({
      column_name: '',
      column_type: 'text',
      options: []
    });
    setNewOption('');
    setEditingColumn(null);
  };
  const addOption = () => {
    if (newOption.trim() && !newColumn.options.includes(newOption.trim())) {
      setNewColumn(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };
  const removeOption = (optionToRemove: string) => {
    setNewColumn(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt !== optionToRemove)
    }));
  };
  const saveColumn = async () => {
    if (!newColumn.column_name.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome da coluna",
        variant: "destructive"
      });
      return;
    }
    if ((newColumn.column_type === 'select' || newColumn.column_type === 'multiselect') && newColumn.options.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma opção para o campo de seleção",
        variant: "destructive"
      });
      return;
    }
    try {
      if (editingColumn) {
        // Update existing column
        const {
          error
        } = await supabase.from('tour_custom_columns').update({
          column_name: newColumn.column_name.trim(),
          column_type: newColumn.column_type,
          options: newColumn.column_type === 'select' || newColumn.column_type === 'multiselect' ? newColumn.options : null
        }).eq('id', editingColumn.id);
        if (error) throw error;
        onColumnsChange(columns.map(col => col.id === editingColumn.id ? {
          ...col,
          column_name: newColumn.column_name.trim(),
          column_type: newColumn.column_type,
          options: newColumn.column_type === 'select' || newColumn.column_type === 'multiselect' ? newColumn.options : null
        } : col));
        toast({
          title: "Coluna atualizada com sucesso"
        });
      } else {
        // Create new column
        const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order_index)) + 1 : 0;
        const {
          data,
          error
        } = await supabase.from('tour_custom_columns').insert({
          tour_id: tourId,
          column_name: newColumn.column_name.trim(),
          column_type: newColumn.column_type,
          options: newColumn.column_type === 'select' || newColumn.column_type === 'multiselect' ? newColumn.options : null,
          order_index: maxOrder
        }).select().single();
        if (error) throw error;
        onColumnsChange([...columns, data as CustomColumn]);
        toast({
          title: "Coluna adicionada com sucesso"
        });
      }
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar coluna",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const deleteColumn = async (columnId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta coluna? Todos os dados salvos nela serão perdidos.')) return;
    try {
      const {
        error
      } = await supabase.from('tour_custom_columns').delete().eq('id', columnId);
      if (error) throw error;
      onColumnsChange(columns.filter(col => col.id !== columnId));
      toast({
        title: "Coluna excluída com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir coluna",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const openEditModal = (column: CustomColumn) => {
    setEditingColumn(column);
    setNewColumn({
      column_name: column.column_name,
      column_type: column.column_type,
      options: column.options || []
    });
    setShowAddModal(true);
  };
  return <>
      <Button size="sm" variant="outline" onClick={() => {
      resetForm();
      setShowAddModal(true);
    }} className="flex items-center gap-1 text-primary">
        <Plus className="h-4 w-4" />
        Adicionar Coluna
      </Button>

      {columns.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
          {columns.map(col => <DropdownMenu key={col.id}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors border rounded-full text-sm">
                  <span className="font-medium">{col.column_name}</span>
                  <span className="text-muted-foreground text-xs">({COLUMN_TYPE_LABELS[col.column_type]})</span>
                  <Settings2 className="h-3 w-3 ml-1 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white z-50">
                <DropdownMenuItem onClick={() => openEditModal(col)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Coluna
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deleteColumn(col.id)} className="cursor-pointer text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Coluna
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>)}
        </div>}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Editar Coluna' : 'Nova Coluna Personalizada'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome da Coluna</Label>
              <Input value={newColumn.column_name} onChange={e => setNewColumn(prev => ({
              ...prev,
              column_name: e.target.value
            }))} placeholder="Ex: Tipo de Almoço, Kit Opcional..." />
            </div>

            <div>
              <Label>Tipo da Coluna</Label>
              <Select value={newColumn.column_type} onValueChange={(value: CustomColumn['column_type']) => setNewColumn(prev => ({
              ...prev,
              column_type: value,
              options: []
            }))} disabled={!!editingColumn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="currency">Valor (R$)</SelectItem>
                  <SelectItem value="select">Seleção (dropdown)</SelectItem>
                  <SelectItem value="multiselect">Seleção Múltipla</SelectItem>
                  <SelectItem value="boolean">Sim/Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newColumn.column_type === 'select' || newColumn.column_type === 'multiselect') && <div>
                <Label>Opções Disponíveis</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Digite uma opção..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                  <Button type="button" onClick={addOption} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newColumn.options.map(opt => <Badge key={opt} variant="secondary" className="flex items-center gap-1">
                      {opt}
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeOption(opt)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>)}
                </div>
              </div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveColumn}>
              {editingColumn ? 'Salvar Alterações' : 'Adicionar Coluna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
};

// Component for rendering custom column input based on type
interface CustomColumnInputProps {
  column: CustomColumn;
  value: string | null;
  onChange: (value: string) => void;
}
export const CustomColumnInput: React.FC<CustomColumnInputProps> = ({
  column,
  value,
  onChange
}) => {
  switch (column.column_type) {
    case 'text':
      return <Input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-32 h-8 bg-white border-gray-200 text-sm" placeholder="..." />;
    case 'number':
      return <Input type="number" value={value || ''} onChange={e => onChange(e.target.value)} className="w-24 h-8 bg-white border-gray-200 text-sm text-right" placeholder="0" />;
    case 'currency':
      return <Input type="number" step="0.01" value={value || ''} onChange={e => onChange(e.target.value)} className="w-24 h-8 bg-white border-gray-200 text-sm text-right" placeholder="R$ 0,00" />;
    case 'select':
      return <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-32 h-8 bg-white border-gray-200 text-sm">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_clear_">Limpar</SelectItem>
            {column.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>;
    case 'multiselect':
      {
        const selectedValues = value ? JSON.parse(value) as string[] : [];
        return <div className="flex flex-wrap gap-1 max-w-48">
          {column.options?.map(opt => <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
              <Checkbox checked={selectedValues.includes(opt)} onCheckedChange={checked => {
              const newValues = checked ? [...selectedValues, opt] : selectedValues.filter(v => v !== opt);
              onChange(JSON.stringify(newValues));
            }} />
              {opt}
            </label>)}
        </div>;
      }
    case 'boolean':
      return <div className="flex items-center gap-2">
          <Switch checked={value === 'true'} onCheckedChange={checked => onChange(checked ? 'true' : 'false')} />
          <span className="text-xs">{value === 'true' ? 'Sim' : 'Não'}</span>
        </div>;
    default:
      return null;
  }
};

// Helper to display value in read-only format
export const formatCustomColumnValue = (column: CustomColumn, value: string | null): string => {
  if (!value) return '-';
  switch (column.column_type) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(value) || 0);
    case 'multiselect':
      try {
        const arr = JSON.parse(value) as string[];
        return arr.join(', ') || '-';
      } catch {
        return value;
      }
    case 'boolean':
      return value === 'true' ? 'Sim' : 'Não';
    default:
      return value;
  }
};