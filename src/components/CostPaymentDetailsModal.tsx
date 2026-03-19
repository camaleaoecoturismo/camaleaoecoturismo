import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Receipt, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CostPayment {
  id: string;
  tour_cost_id: string;
  amount: number;
  description: string | null;
  payment_date: string | null;
  created_at: string;
}

interface CostPaymentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourCostId: string;
  costName: string;
  totalExpected: number;
  onTotalPaidChange: (tourCostId: string, totalPaid: number) => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CostPaymentDetailsModal: React.FC<CostPaymentDetailsModalProps> = ({
  open,
  onOpenChange,
  tourCostId,
  costName,
  totalExpected,
  onTotalPaidChange,
}) => {
  const [payments, setPayments] = useState<CostPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && tourCostId) {
      fetchPayments();
    }
  }, [open, tourCostId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tour_cost_payments')
        .select('*')
        .eq('tour_cost_id', tourCostId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching cost payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalExpected - totalPaid;

  const addPayment = async () => {
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0) return;
    try {
      const { error } = await supabase.from('tour_cost_payments').insert({
        tour_cost_id: tourCostId,
        amount,
        description: newDescription.trim() || null,
        payment_date: newDate || null,
      });
      if (error) throw error;
      setNewAmount('');
      setNewDescription('');
      setNewDate('');
      await fetchPayments();
      // Update parent valor_pago
      const newTotal = totalPaid + amount;
      await supabase.from('tour_costs').update({ valor_pago: newTotal }).eq('id', tourCostId);
      onTotalPaidChange(tourCostId, newTotal);
      toast({ title: "Pagamento adicionado" });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const deletePayment = async (paymentId: string, paymentAmount: number) => {
    try {
      const { error } = await supabase.from('tour_cost_payments').delete().eq('id', paymentId);
      if (error) throw error;
      await fetchPayments();
      const newTotal = totalPaid - paymentAmount;
      await supabase.from('tour_costs').update({ valor_pago: Math.max(0, newTotal) }).eq('id', tourCostId);
      onTotalPaidChange(tourCostId, Math.max(0, newTotal));
      toast({ title: "Pagamento removido" });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Pagamentos: {costName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Previsto</div>
            <div className="text-sm font-semibold">{formatCurrency(totalExpected)}</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2">
            <div className="text-[10px] text-emerald-600 uppercase">Pago</div>
            <div className="text-sm font-semibold text-emerald-700">{formatCurrency(totalPaid)}</div>
          </div>
          <div className={`rounded-lg p-2 ${remaining > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <div className={`text-[10px] uppercase ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Falta</div>
            <div className={`text-sm font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCurrency(Math.max(0, remaining))}
            </div>
          </div>
        </div>

        {/* Payment entries */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase">Parcelas registradas</div>
          {payments.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nenhum pagamento registrado
            </div>
          )}
          {payments.map((p, i) => (
            <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg border bg-card group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatCurrency(Number(p.amount))}</span>
                  {p.payment_date && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 shrink-0"
                onClick={() => deletePayment(p.id, Number(p.amount))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new payment */}
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase">Adicionar pagamento</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              className="h-8 text-sm w-28"
            />
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <Textarea
            placeholder="Descrição (ex: Pousada Sol Nascente - 2 quartos)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="min-h-[60px] text-sm"
            maxLength={500}
          />
          <Button
            size="sm"
            onClick={addPayment}
            disabled={!newAmount || parseFloat(newAmount) <= 0}
            className="w-full gap-1"
          >
            <Plus className="h-3 w-3" />
            Adicionar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CostPaymentDetailsModal;
