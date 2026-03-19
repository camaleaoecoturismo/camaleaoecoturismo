import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  Eye, 
  RefreshCw, 
  CreditCard, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Filter,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Payment {
  id: string;
  reserva_numero: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_cpf: string;
  cliente_whatsapp: string;
  tour_nome: string;
  tour_id: string;
  tour_data: string;
  valor_total: number;
  valor_pago: number;
  payment_status: string;
  payment_method: string;
  installments: number;
  mp_payment_id: string;
  data_pagamento: string;
  data_reserva: string;
  card_fee_amount: number;
  refund_amount: number;
  refund_date: string;
  refund_reason: string;
  selected_optional_items: any[];
  status: string;
}

interface PaymentLog {
  id: string;
  event_type: string;
  event_status: string;
  event_message: string;
  amount: number;
  created_at: string;
}

const PAYMENT_STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'pago', label: 'Pago' },
  { value: 'rejeitado', label: 'Recusado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'expirado', label: 'Expirado' },
  { value: 'reembolsado', label: 'Reembolsado' },
  { value: 'reembolso_parcial', label: 'Reembolso Parcial' }
];

const PAYMENT_METHODS = [
  { value: 'all', label: 'Todas' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Cartão' }
];

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
    'pendente': { className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
    'aguardando': { className: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
    'pago': { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
    'confirmado': { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
    'rejeitado': { className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    'cancelado': { className: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    'expirado': { className: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="h-3 w-3" /> },
    'reembolsado': { className: 'bg-purple-100 text-purple-800', icon: <RotateCcw className="h-3 w-3" /> },
    'reembolso_parcial': { className: 'bg-purple-100 text-purple-800', icon: <RotateCcw className="h-3 w-3" /> }
  };
  
  const config = statusConfig[status] || statusConfig['pendente'];
  return (
    <Badge className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </Badge>
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tours, setTours] = useState<{ id: string; name: string }[]>([]);
  
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  
  // InfinitePay verification
  const [showInfinitePayDialog, setShowInfinitePayDialog] = useState(false);
  const [infinitePayNsu, setInfinitePayNsu] = useState('');
  const [verifyingInfinitePay, setVerifyingInfinitePay] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchTours();
  }, []);

  const syncMPPayments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-mp-payments');
      
      if (error) throw error;
      
      const updated = data?.results?.filter((r: any) => r.old_status && r.new_status) || [];
      
      if (updated.length > 0) {
        toast({ 
          title: `${updated.length} pagamento(s) atualizado(s)`,
          description: updated.map((r: any) => `${r.old_status} → ${r.new_status}`).join(', ')
        });
      } else {
        toast({ title: 'Todos os pagamentos estão sincronizados' });
      }
      
      await fetchPayments();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({ 
        title: 'Erro ao sincronizar pagamentos', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSyncing(false);
    }
  };

  const verifyInfinitePayPayment = async () => {
    if (!selectedPayment || !infinitePayNsu.trim()) return;
    
    setVerifyingInfinitePay(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-infinitepay-payment', {
        body: {
          reserva_id: selectedPayment.id,
          transaction_nsu: infinitePayNsu.trim(),
          capture_method: 'credit_card'
        }
      });

      if (error) throw error;

      if (data?.verified || data?.already_confirmed) {
        toast({
          title: 'Pagamento confirmado!',
          description: `Reserva ${selectedPayment.reserva_numero} foi confirmada com sucesso.`
        });
        setShowInfinitePayDialog(false);
        setInfinitePayNsu('');
        await fetchPayments();
        await fetchPaymentLogs(selectedPayment.id);
      } else {
        toast({
          title: 'Pagamento não confirmado',
          description: 'Não foi possível verificar o pagamento. Verifique o NSU.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('InfinitePay verification error:', error);
      toast({
        title: 'Erro ao verificar pagamento',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setVerifyingInfinitePay(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          reserva_numero,
          valor_passeio,
          valor_pago,
          valor_total_com_opcionais,
          payment_status,
          payment_method,
          installments,
          mp_payment_id,
          data_pagamento,
          data_reserva,
          card_fee_amount,
          refund_amount,
          refund_date,
          refund_reason,
          selected_optional_items,
          status,
          clientes!fk_reservas_cliente(id, nome_completo, email, cpf, whatsapp),
          tours!fk_reservas_tour(id, name, start_date)
        `)
        .order('data_reserva', { ascending: false });

      if (error) throw error;

      const transformedData: Payment[] = (data || []).map((r: any) => ({
        id: r.id,
        reserva_numero: r.reserva_numero || r.id.slice(0, 8),
        cliente_nome: r.clientes?.nome_completo || 'N/A',
        cliente_email: r.clientes?.email || '',
        cliente_cpf: r.clientes?.cpf || '',
        cliente_whatsapp: r.clientes?.whatsapp || '',
        tour_nome: r.tours?.name || 'N/A',
        tour_id: r.tours?.id || '',
        tour_data: r.tours?.start_date || '',
        valor_total: r.valor_total_com_opcionais || r.valor_passeio || 0,
        valor_pago: r.valor_pago || 0,
        payment_status: r.payment_status || 'pendente',
        payment_method: r.payment_method || 'pix',
        installments: r.installments || 1,
        mp_payment_id: r.mp_payment_id || '',
        data_pagamento: r.data_pagamento || '',
        data_reserva: r.data_reserva || '',
        card_fee_amount: r.card_fee_amount || 0,
        refund_amount: r.refund_amount || 0,
        refund_date: r.refund_date || '',
        refund_reason: r.refund_reason || '',
        selected_optional_items: r.selected_optional_items || [],
        status: r.status || 'pendente'
      }));

      setPayments(transformedData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({ title: 'Erro ao carregar pagamentos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTours = async () => {
    const { data } = await supabase.from('tours').select('id, name').order('name');
    setTours(data || []);
  };

  const fetchPaymentLogs = async (reservaId: string) => {
    const { data } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('reserva_id', reservaId)
      .order('created_at', { ascending: false });
    setPaymentLogs(data || []);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        payment.cliente_nome.toLowerCase().includes(searchLower) ||
        payment.cliente_email.toLowerCase().includes(searchLower) ||
        payment.cliente_cpf.includes(searchTerm) ||
        payment.reserva_numero.toLowerCase().includes(searchLower) ||
        payment.tour_nome.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;

      // Method filter
      const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;

      // Tour filter
      const matchesTour = tourFilter === 'all' || payment.tour_id === tourFilter;

      // Date filter
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(payment.data_reserva) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(payment.data_reserva) <= new Date(dateTo + 'T23:59:59');
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesTour && matchesDate;
    });
  }, [payments, searchTerm, statusFilter, methodFilter, tourFilter, dateFrom, dateTo]);

  // Summary metrics
  const metrics = useMemo(() => {
    const confirmed = filteredPayments.filter(p => p.payment_status === 'pago');
    const rejected = filteredPayments.filter(p => p.payment_status === 'rejeitado');
    const pending = filteredPayments.filter(p => p.payment_status === 'pendente');
    const refunded = filteredPayments.filter(p => p.refund_amount > 0);

    const pixPayments = confirmed.filter(p => p.payment_method === 'pix');
    const cardPayments = confirmed.filter(p => p.payment_method === 'cartao' || p.payment_method === 'credit_card');
    const totalConfirmed = confirmed.length;

    return {
      pixCount: pixPayments.length,
      cardCount: cardPayments.length,
      pixPercent: totalConfirmed > 0 ? Math.round((pixPayments.length / totalConfirmed) * 100) : 0,
      cardPercent: totalConfirmed > 0 ? Math.round((cardPayments.length / totalConfirmed) * 100) : 0,
      pixTotal: pixPayments.reduce((acc, p) => acc + p.valor_pago, 0),
      cardTotal: cardPayments.reduce((acc, p) => acc + p.valor_pago, 0),
      confirmados: confirmed.length,
      recusados: rejected.length,
      pendentes: pending.length,
      reembolsos: refunded.length,
      valorReembolsado: refunded.reduce((acc, p) => acc + p.refund_amount, 0)
    };
  }, [filteredPayments]);

  const handleViewDetails = async (payment: Payment) => {
    setSelectedPayment(payment);
    await fetchPaymentLogs(payment.id);
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;
    
    setProcessingRefund(true);
    try {
      const amount = refundType === 'full' 
        ? selectedPayment.valor_pago 
        : parseFloat(refundAmount);

      if (refundType === 'partial' && (isNaN(amount) || amount <= 0 || amount > selectedPayment.valor_pago)) {
        toast({ title: 'Valor de reembolso inválido', variant: 'destructive' });
        return;
      }

      // Call refund edge function
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          reserva_id: selectedPayment.id,
          mp_payment_id: selectedPayment.mp_payment_id,
          amount: amount,
          reason: refundReason
        }
      });

      if (error) throw error;

      // Update local state
      const newStatus = refundType === 'full' ? 'reembolsado' : 'reembolso_parcial';
      await supabase.from('reservas').update({
        payment_status: newStatus,
        refund_amount: amount,
        refund_date: new Date().toISOString(),
        refund_reason: refundReason
      }).eq('id', selectedPayment.id);

      // Log the refund
      await supabase.from('payment_logs').insert({
        reserva_id: selectedPayment.id,
        event_type: refundType === 'full' ? 'refund_full' : 'refund_partial',
        event_status: 'success',
        event_message: refundReason,
        amount: amount,
        refund_amount: amount
      });

      toast({ 
        title: 'Reembolso registrado!',
        description: 'Lembre-se de realizar o reembolso no painel InfinitePay.'
      });
      setShowRefundDialog(false);
      fetchPayments();
      fetchPaymentLogs(selectedPayment.id);
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({ 
        title: 'Erro ao processar reembolso', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Reserva', 'Cliente', 'Passeio', 'Valor', 'Pago', 'Método', 'Parcelas', 'Status', 'Data Pagamento'];
    const rows = filteredPayments.map(p => [
      p.reserva_numero,
      p.cliente_nome,
      p.tour_nome,
      p.valor_total,
      p.valor_pago,
      p.payment_method,
      p.installments,
      p.payment_status,
      p.data_pagamento ? format(parseISO(p.data_pagamento), 'dd/MM/yyyy HH:mm') : ''
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedPayment) return;
    
    try {
      await supabase.from('reservas').update({
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', selectedPayment.id);

      await supabase.from('payment_logs').insert({
        reserva_id: selectedPayment.id,
        event_type: 'status_change',
        event_status: newStatus,
        event_message: `Status alterado manualmente para ${newStatus}`
      });

      toast({ title: 'Status atualizado!' });
      fetchPayments();
      setSelectedPayment({ ...selectedPayment, payment_status: newStatus });
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  if (selectedPayment) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedPayment(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold">Detalhes do Pagamento</h2>
          <Badge className="ml-auto">{selectedPayment.reserva_numero}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium">{selectedPayment.cliente_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail:</span>
                <span>{selectedPayment.cliente_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF:</span>
                <span>{selectedPayment.cliente_cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">WhatsApp:</span>
                <span>{selectedPayment.cliente_whatsapp}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tour Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dados do Passeio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passeio:</span>
                <span className="font-medium">{selectedPayment.tour_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span>{selectedPayment.tour_data ? format(parseISO(selectedPayment.tour_data), 'dd/MM/yyyy') : '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Values */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-medium">{formatCurrency(selectedPayment.valor_total)}</span>
              </div>
              {selectedPayment.card_fee_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Cartão:</span>
                  <span>{formatCurrency(selectedPayment.card_fee_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Pago:</span>
                <span className="font-bold text-green-600">{formatCurrency(selectedPayment.valor_pago)}</span>
              </div>
              {selectedPayment.refund_amount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Reembolsado:</span>
                  <span className="font-medium">{formatCurrency(selectedPayment.refund_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Valor Líquido:</span>
                <span className="font-bold">{formatCurrency(selectedPayment.valor_pago - selectedPayment.refund_amount - selectedPayment.card_fee_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método:</span>
                <Badge variant="outline">
                  {selectedPayment.payment_method === 'cartao' ? 'Cartão' : 'PIX'}
                </Badge>
              </div>
              {selectedPayment.payment_method === 'cartao' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span>{selectedPayment.installments}x</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(selectedPayment.payment_status)}
              </div>
              {selectedPayment.mp_payment_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID MP:</span>
                  <span className="font-mono text-xs">{selectedPayment.mp_payment_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span>{formatDate(selectedPayment.data_pagamento)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optional Items */}
        {selectedPayment.selected_optional_items && selectedPayment.selected_optional_items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Itens Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedPayment.selected_optional_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.name} (x{item.quantity || 1})</span>
                    <span>{formatCurrency(item.price * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Linha do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {paymentLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                ) : (
                  paymentLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <div className="font-medium">{log.event_type.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-muted-foreground">{log.event_message}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(log.created_at)}</div>
                      </div>
                      {log.amount > 0 && (
                        <div className="font-medium">{formatCurrency(log.amount)}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {selectedPayment.payment_status === 'pago' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRefundType('full');
                    setShowRefundDialog(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reembolso Total
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setRefundType('partial');
                    setShowRefundDialog(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reembolso Parcial
                </Button>
              </>
            )}

            {/* InfinitePay verification button - for pending payments */}
            {(selectedPayment.payment_status === 'pendente' || selectedPayment.payment_status === 'aguardando') && 
             (selectedPayment.payment_method === 'infinitepay' || !selectedPayment.payment_method || selectedPayment.payment_method === '') && (
              <Button 
                variant="outline"
                onClick={() => setShowInfinitePayDialog(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verificar InfinitePay
              </Button>
            )}
            
            <Select onValueChange={handleUpdateStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alterar Status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.filter(s => s.value !== 'all').map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => window.open(`/admin?reserva=${selectedPayment.id}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Reserva
            </Button>
          </CardContent>
        </Card>

        {/* InfinitePay Verification Dialog */}
        <Dialog open={showInfinitePayDialog} onOpenChange={setShowInfinitePayDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Verificar Pagamento InfinitePay</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-emerald-700">
                  Insira o <strong>NSU da transação</strong> encontrado no comprovante de pagamento para confirmar a reserva automaticamente.
                </p>
              </div>
              
              <div>
                <Label>Transaction NSU</Label>
                <Input
                  placeholder="Ex: 0d19dd2d-d3fb-4072-9fc2-4de631354bce"
                  value={infinitePayNsu}
                  onChange={(e) => setInfinitePayNsu(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O NSU aparece na parte inferior do comprovante InfinitePay
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowInfinitePayDialog(false);
                setInfinitePayNsu('');
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={verifyInfinitePayPayment}
                disabled={verifyingInfinitePay || !infinitePayNsu.trim()}
              >
                {verifyingInfinitePay ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {refundType === 'full' ? 'Reembolso Total' : 'Reembolso Parcial'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* InfinitePay Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-800">Ação manual necessária</p>
                    <p className="text-sm text-amber-700">
                      O reembolso será <strong>registrado no sistema</strong>, mas você precisa realizar o 
                      reembolso manualmente pelo <strong>painel ou app InfinitePay</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Como realizar o reembolso:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse o <strong>painel InfinitePay</strong> ou abra o <strong>app</strong></li>
                  <li>Vá em <strong>Vendas</strong> e localize a transação</li>
                  <li>Clique em <strong>Estornar</strong> ou <strong>Reembolsar</strong></li>
                  <li>Confirme o valor e finalize</li>
                </ol>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.open('https://app.infinitepay.io', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Painel InfinitePay
                </Button>
              </div>

              {refundType === 'full' ? (
                <p>Valor a ser reembolsado: <strong>{formatCurrency(selectedPayment.valor_pago)}</strong></p>
              ) : (
                <div>
                  <Label>Valor do Reembolso</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedPayment.valor_pago}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo: {formatCurrency(selectedPayment.valor_pago)}
                  </p>
                </div>
              )}
              <div>
                <Label>Motivo do Reembolso</Label>
                <Textarea
                  placeholder="Descreva o motivo..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRefund} disabled={processingRefund}>
                {processingRefund ? 'Registrando...' : 'Registrar Reembolso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestão de Pagamentos</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncMPPayments}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar MP
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPayments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">PIX vs Cartão</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-green-600">{metrics.pixPercent}%</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-xl font-bold text-blue-600">{metrics.cardPercent}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.pixCount} PIX · {metrics.cardCount} Cartão
                </p>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-8 rounded bg-green-500" style={{ height: `${Math.max(8, metrics.pixPercent * 0.4)}px` }} />
                <div className="w-3 h-8 rounded bg-blue-500" style={{ height: `${Math.max(8, metrics.cardPercent * 0.4)}px` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">{metrics.confirmados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recusados</p>
                <p className="text-2xl font-bold text-red-600">{metrics.recusados}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reembolsos</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.reembolsos}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metrics.valorReembolsado)}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, e-mail, CPF, reserva..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={tourFilter} onValueChange={setTourFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Passeio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os passeios</SelectItem>
                {tours.map(tour => (
                  <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
              placeholder="Data início"
            />
            
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
              placeholder="Data fim"
            />
            
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            
            <Button variant="outline" onClick={fetchPayments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Passeio</TableHead>
                <TableHead>Reserva</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map(payment => (
                  <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(payment)}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.cliente_nome}</div>
                        <div className="text-xs text-muted-foreground">{payment.cliente_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.tour_nome}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.reserva_numero}</TableCell>
                    <TableCell>{formatCurrency(payment.valor_total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_method === 'cartao' ? 'Cartão' : 'PIX'}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.installments}x</TableCell>
                    <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(payment.data_pagamento || payment.data_reserva)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
