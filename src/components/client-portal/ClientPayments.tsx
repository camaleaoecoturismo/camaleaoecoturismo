import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPaymentsProps {
  clienteId: string;
}

interface Payment {
  id: string;
  tour_name: string;
  payment_status: string;
  payment_method: string | null;
  valor_pago: number | null;
  valor_passeio: number | null;
  data_pagamento: string | null;
  data_reserva: string;
}

const ClientPayments = ({ clienteId }: ClientPaymentsProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ paid: 0, pending: 0 });

  useEffect(() => {
    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          payment_status,
          payment_method,
          valor_pago,
          valor_passeio,
          data_pagamento,
          data_reserva,
          status,
          tours!reservas_tour_id_fkey (
            name
          )
        `)
        .eq('cliente_id', clienteId)
        .neq('status', 'cancelada')
        .order('data_reserva', { ascending: false });

      if (!error && data) {
        const formattedPayments = data.map(p => ({
          id: p.id,
          tour_name: (p.tours as any)?.name || 'Passeio',
          payment_status: p.payment_status,
          payment_method: p.payment_method,
          valor_pago: p.valor_pago,
          valor_passeio: p.valor_passeio,
          data_pagamento: p.data_pagamento,
          data_reserva: p.data_reserva
        }));

        setPayments(formattedPayments);

        const paid = formattedPayments
          .filter(p => p.payment_status === 'pago')
          .reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        
        const pending = formattedPayments
          .filter(p => p.payment_status !== 'pago')
          .reduce((sum, p) => sum + (p.valor_passeio || 0), 0);

        setTotals({ paid, pending });
      }
      setLoading(false);
    };

    fetchPayments();
  }, [clienteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-xs text-emerald-700">Total Pago</p>
                <p className="text-xl font-bold text-emerald-700">
                  R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-xs text-amber-700">Pendente</p>
                <p className="text-xl font-bold text-amber-700">
                  R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{payment.tour_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {payment.data_pagamento 
                        ? format(new Date(payment.data_pagamento), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : format(new Date(payment.data_reserva), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                      }
                    </div>
                    {payment.payment_method && (
                      <Badge variant="outline" className="text-xs">
                        {payment.payment_method === 'cartao' || payment.payment_method === 'credit_card' 
                          ? 'CARTÃO' 
                          : payment.payment_method.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {(() => {
                      const valorTotal = payment.valor_passeio || 0;
                      const valorPago = payment.valor_pago || 0;
                      const saldo = Math.max(0, valorTotal - valorPago);

                      return (
                        <p className={`font-bold ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientPayments;
