import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreditTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  original_value: number | null;
  percentage_applied: number | null;
  tour_name: string | null;
  tour_id: string | null;
  cancellation_date: string | null;
  reason: string | null;
  coupon_id: string | null;
}

interface EditCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CreditTransaction | null;
  onSuccess: () => void;
}

export const EditCreditModal: React.FC<EditCreditModalProps> = ({
  open,
  onOpenChange,
  transaction,
  onSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [percentage, setPercentage] = useState('');
  const [tourName, setTourName] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (transaction && open) {
      setAmount(String(transaction.amount || ''));
      setOriginalValue(String(transaction.original_value || ''));
      setPercentage(String(transaction.percentage_applied || ''));
      setTourName(transaction.tour_name || '');
      setCancellationDate(transaction.cancellation_date || '');
      setReason(transaction.reason || '');
    }
  }, [transaction, open]);

  const handleSave = async () => {
    if (!transaction) return;
    
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        amount: value,
        reason: reason || null,
        updated_at: new Date().toISOString()
      };

      // Only update these fields for credit transactions
      if (transaction.transaction_type === 'credit') {
        updateData.original_value = originalValue ? parseFloat(originalValue) : null;
        updateData.percentage_applied = percentage ? parseFloat(percentage) : null;
        updateData.tour_name = tourName || null;
        updateData.cancellation_date = cancellationDate || null;
      }

      const { error } = await supabase
        .from('client_credits')
        .update(updateData)
        .eq('id', transaction.id);

      if (error) throw error;

      // If this is a debit with a coupon, update the coupon value too
      if (transaction.transaction_type === 'debit' && transaction.coupon_id) {
        const { error: couponError } = await supabase
          .from('coupons')
          .update({
            valor: value,
            credit_remaining: value
          })
          .eq('id', transaction.coupon_id);

        if (couponError) throw couponError;
      }

      toast({
        title: 'Crédito atualizado',
        description: 'As alterações foram salvas com sucesso.'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar {transaction.transaction_type === 'credit' ? 'Crédito' : 'Débito'}
          </DialogTitle>
          <DialogDescription>
            Altere os dados da transação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {transaction.transaction_type === 'credit' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor Original (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={originalValue}
                    onChange={(e) => setOriginalValue(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Passeio Relacionado</Label>
                <Input
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  placeholder="Nome do passeio"
                />
              </div>

              <div className="space-y-2">
                <Label>Data do Cancelamento</Label>
                <Input
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Motivo/Observação</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Justificativa ou observações..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !amount}
              className="flex-1"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
