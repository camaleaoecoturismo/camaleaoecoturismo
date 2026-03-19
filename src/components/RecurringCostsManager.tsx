import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, RefreshCw, Pause, Play, X, Edit2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface RecurringCost {
  id: string;
  expense_name: string;
  unit_value: number;
  expense_type: string;
  status: 'ativo' | 'pausado' | 'encerrado';
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RecurringCostsManagerProps {
  recurringCosts: RecurringCost[];
  onRefresh: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'outros', label: 'Outros' },
];

const getCategoryLabel = (value: string) => 
  EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'ativo': return { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Play };
    case 'pausado': return { label: 'Pausado', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Pause };
    case 'encerrado': return { label: 'Encerrado', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: X };
    default: return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: RefreshCw };
  }
};

const RecurringCostsManager: React.FC<RecurringCostsManagerProps> = ({ recurringCosts, onRefresh }) => {
  const { toast } = useToast();
  
  // Add form state
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState('outros');
  const [newNotes, setNewNotes] = useState('');
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Edit dialog state
  const [editingCost, setEditingCost] = useState<RecurringCost | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const activeCosts = recurringCosts.filter(c => c.status === 'ativo');
  const pausedCosts = recurringCosts.filter(c => c.status === 'pausado');
  const endedCosts = recurringCosts.filter(c => c.status === 'encerrado');
  const totalActive = activeCosts.reduce((sum, c) => sum + c.unit_value, 0);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const { error } = await supabase.from('recurring_costs').insert({
        expense_name: newName.trim(),
        unit_value: parseFloat(newValue) || 0,
        expense_type: newType,
        notes: newNotes.trim() || null,
        start_date: newStartDate,
        status: 'ativo',
      });
      if (error) throw error;
      onRefresh();
      setNewName('');
      setNewValue('');
      setNewType('outros');
      setNewNotes('');
      setNewStartDate(format(new Date(), 'yyyy-MM-dd'));
      toast({ title: "Custo fixo adicionado" });
    } catch (error) {
      console.error('Error adding recurring cost:', error);
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'ativo' | 'pausado' | 'encerrado') => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'encerrado') {
        updates.end_date = new Date().toISOString().split('T')[0];
      }
      if (newStatus === 'ativo') {
        updates.end_date = null;
      }
      const { error } = await supabase.from('recurring_costs').update(updates).eq('id', id);
      if (error) throw error;
      onRefresh();
      toast({ title: `Status alterado para ${getStatusConfig(newStatus).label}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('recurring_costs').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Custo fixo removido" });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const openEdit = (cost: RecurringCost) => {
    setEditingCost(cost);
    setEditName(cost.expense_name);
    setEditValue(String(cost.unit_value));
    setEditType(cost.expense_type);
    setEditNotes(cost.notes || '');
    setEditStatus(cost.status);
    setEditStartDate(cost.start_date);
    setEditEndDate(cost.end_date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCost) return;
    try {
      const updates: any = {
        expense_name: editName.trim(),
        unit_value: parseFloat(editValue) || 0,
        expense_type: editType,
        notes: editNotes.trim() || null,
        status: editStatus,
        start_date: editStartDate,
        end_date: editStatus === 'encerrado' ? (editEndDate || new Date().toISOString().split('T')[0]) : null,
      };
      const { error } = await supabase.from('recurring_costs').update(updates).eq('id', editingCost.id);
      if (error) throw error;
      setEditingCost(null);
      onRefresh();
      toast({ title: "Custo fixo atualizado" });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const CostRow = ({ cost }: { cost: RecurringCost }) => {
    const statusConfig = getStatusConfig(cost.status);
    return (
      <div className="group flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{cost.expense_name}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {getCategoryLabel(cost.expense_type)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              Desde {format(new Date(cost.start_date + 'T12:00:00'), 'dd/MM/yyyy')}
            </span>
            {cost.notes && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={cost.notes}>
                • {cost.notes}
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(cost.unit_value)}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">/mês</span>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {cost.status === 'ativo' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(cost.id, 'pausado')} title="Pausar">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {cost.status === 'pausado' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStatusChange(cost.id, 'ativo')} title="Reativar">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {cost.status !== 'encerrado' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-slate-50" onClick={() => handleStatusChange(cost.id, 'encerrado')} title="Encerrar">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {cost.status === 'encerrado' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStatusChange(cost.id, 'ativo')} title="Reativar">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(cost)} title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(cost.id)} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Custos Fixos
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Ativo/mês</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(totalActive)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Add Form */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-5">
                <Input placeholder="Nome do custo recorrente..." value={newName} onChange={e => setNewName(e.target.value)} className="h-9 bg-background" />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input type="number" step="0.01" placeholder="R$ /mês" value={newValue} onChange={e => setNewValue(e.target.value)} className="h-9 bg-background text-right" />
              </div>
              <div className="col-span-12 sm:col-span-2">
                <Button onClick={handleAdd} disabled={!newName.trim()} className="w-full h-9" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 sm:col-span-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="h-9 bg-background text-xs" />
                </div>
              </div>
              <div className="col-span-6 sm:col-span-9">
                <Input placeholder="Observações (opcional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="h-9 bg-background text-xs" />
              </div>
            </div>
          </div>

          {/* Active */}
          {activeCosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Ativos ({activeCosts.length})</p>
              {activeCosts.map(cost => <CostRow key={cost.id} cost={cost} />)}
            </div>
          )}

          {/* Paused */}
          {pausedCosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pausados ({pausedCosts.length})</p>
              {pausedCosts.map(cost => <CostRow key={cost.id} cost={cost} />)}
            </div>
          )}

          {/* Ended */}
          {endedCosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Encerrados ({endedCosts.length})</p>
              {endedCosts.map(cost => <CostRow key={cost.id} cost={cost} />)}
            </div>
          )}

          {recurringCosts.length === 0 && (
            <div className="text-center py-8 bg-muted/20 rounded-lg">
              <RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum custo fixo cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione despesas fixas mensais como assinaturas, aluguel, etc.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCost} onOpenChange={(open) => !open && setEditingCost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Custo Fixo</DialogTitle>
            <DialogDescription>Altere os dados do custo fixo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Mensal (R$)</label>
                <Input type="number" step="0.01" value={editValue} onChange={e => setEditValue(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data de Início</label>
              <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editStatus === 'encerrado' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data de Encerramento</label>
                <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecurringCostsManager;
