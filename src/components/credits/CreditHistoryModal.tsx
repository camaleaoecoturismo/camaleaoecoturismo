import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Tag, Calendar, FileText, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditCreditModal } from './EditCreditModal';
import { DeleteCreditDialog } from './DeleteCreditDialog';

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
  created_at: string;
  coupons?: {
    codigo: string;
  } | null;
}

interface CreditHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onDataChange?: () => void;
}

export const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onDataChange
}) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && clientId) {
      fetchHistory();
    }
  }, [open, clientId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('client_credits')
        .select(`
          id,
          transaction_type,
          amount,
          original_value,
          percentage_applied,
          tour_name,
          tour_id,
          cancellation_date,
          reason,
          coupon_id,
          created_at,
          coupons (
            codigo
          )
        `)
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast transaction_type properly
      const typedTransactions: CreditTransaction[] = (data || []).map(t => ({
        ...t,
        transaction_type: t.transaction_type as 'credit' | 'debit'
      }));
      
      setTransactions(typedTransactions);
      
      // Calculate balance
      const total = (data || []).reduce((sum, t) => {
        return sum + (t.transaction_type === 'credit' ? Number(t.amount) : -Number(t.amount));
      }, 0);
      setBalance(total);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: CreditTransaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleDelete = (transaction: CreditTransaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleTransactionChange = () => {
    fetchHistory();
    onDataChange?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extrato de Créditos</DialogTitle>
            <DialogDescription>{clientName}</DialogDescription>
          </DialogHeader>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo Atual:</span>
                <Badge 
                  variant={balance > 0 ? 'default' : 'secondary'}
                  className="text-lg px-3 py-1"
                >
                  {formatCurrency(balance)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {transaction.transaction_type === 'credit' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(transaction)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(transaction)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                        
                        {transaction.tour_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {transaction.tour_name}
                          </p>
                        )}
                        
                        {transaction.original_value && transaction.percentage_applied && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Valor original: {formatCurrency(Number(transaction.original_value))} ({transaction.percentage_applied}%)
                          </p>
                        )}
                        
                        {transaction.cancellation_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Cancelamento: {new Date(transaction.cancellation_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        
                        {transaction.coupons?.codigo && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Tag className="h-3 w-3" />
                            Cupom: {transaction.coupons.codigo}
                          </p>
                        )}
                        
                        {transaction.reason && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1 mt-2 bg-muted/50 p-2 rounded">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {transaction.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditCreditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        transaction={selectedTransaction}
        onSuccess={handleTransactionChange}
      />

      <DeleteCreditDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transaction={selectedTransaction}
        onSuccess={handleTransactionChange}
      />
    </>
  );
};
