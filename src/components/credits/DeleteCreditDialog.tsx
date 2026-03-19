import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreditTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  coupon_id: string | null;
  reason: string | null;
}

interface DeleteCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CreditTransaction | null;
  onSuccess: () => void;
}

export const DeleteCreditDialog: React.FC<DeleteCreditDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  onSuccess
}) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!transaction) return;

    setDeleting(true);
    try {
      // If this is a debit transaction linked to a coupon, delete the coupon too
      if (transaction.transaction_type === 'debit' && transaction.coupon_id) {
        const { error: couponError } = await supabase
          .from('coupons')
          .delete()
          .eq('id', transaction.coupon_id);

        if (couponError) {
          console.error('Error deleting coupon:', couponError);
          // Continue anyway, coupon might have been used
        }
      }

      // Delete the credit transaction
      const { error } = await supabase
        .from('client_credits')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: 'Transação excluída',
        description: transaction.transaction_type === 'debit' 
          ? 'Débito removido. O saldo foi restaurado.' 
          : 'Crédito removido com sucesso.'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!transaction) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir {transaction.transaction_type === 'credit' ? 'um crédito' : 'um débito'} de{' '}
              <strong>{formatCurrency(Number(transaction.amount))}</strong>.
            </p>
            {transaction.transaction_type === 'debit' && transaction.coupon_id && (
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ O cupom associado também será excluído e o saldo será restaurado.
              </p>
            )}
            {transaction.transaction_type === 'credit' && (
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ Isso reduzirá o saldo de crédito do cliente.
              </p>
            )}
            <p className="text-muted-foreground">
              Esta ação não pode ser desfeita.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
