import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  RefreshCw, 
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Movimentacao {
  id: string;
  reserva_id: string;
  reserva_numero: string;
  cliente_nome: string;
  tour_nome: string;
  event_type: string;
  event_status: string;
  event_message: string;
  amount: number;
  refund_amount: number;
  payment_method: string;
  mp_payment_id: string;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'payment_approved', label: 'Pagamento Aprovado' },
  { value: 'payment_pending', label: 'Pagamento Pendente' },
  { value: 'payment_rejected', label: 'Pagamento Rejeitado' },
  { value: 'refund_full', label: 'Reembolso Total' },
  { value: 'refund_partial', label: 'Reembolso Parcial' },
  { value: 'refund_manual', label: 'Reembolso Manual' },
  { value: 'status_change', label: 'Alteração de Status' }
];

const getEventBadge = (eventType: string) => {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    'payment_approved': { className: 'bg-green-100 text-green-800', icon: <ArrowDownLeft className="h-3 w-3" />, label: 'Pagamento' },
    'infinitepay_webhook_approved': { className: 'bg-green-100 text-green-800', icon: <ArrowDownLeft className="h-3 w-3" />, label: 'Pagamento InfinitePay' },
    'infinitepay_link_created': { className: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" />, label: 'Link InfinitePay' },
    'payment_pending': { className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'Pendente' },
    'payment_rejected': { className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" />, label: 'Rejeitado' },
    'refund_full': { className: 'bg-purple-100 text-purple-800', icon: <ArrowUpRight className="h-3 w-3" />, label: 'Reembolso Total' },
    'refund_partial': { className: 'bg-purple-100 text-purple-800', icon: <ArrowUpRight className="h-3 w-3" />, label: 'Reembolso Parcial' },
    'refund_manual': { className: 'bg-orange-100 text-orange-800', icon: <ArrowUpRight className="h-3 w-3" />, label: 'Reembolso Manual' },
    'status_change': { className: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="h-3 w-3" />, label: 'Alteração' },
    'pix_generated': { className: 'bg-blue-100 text-blue-800', icon: <Smartphone className="h-3 w-3" />, label: 'PIX Gerado' },
    'payment_created': { className: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" />, label: 'Criado' }
  };
  
  const eventConfig = config[eventType] || { className: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="h-3 w-3" />, label: eventType };
  return (
    <Badge className={`${eventConfig.className} flex items-center gap-1`}>
      {eventConfig.icon}
      {eventConfig.label}
    </Badge>
  );
};

const getMethodIcon = (method: string) => {
  if (method === 'pix') return <Smartphone className="h-4 w-4 text-teal-600" />;
  if (method === 'cartao') return <CreditCard className="h-4 w-4 text-blue-600" />;
  return null;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch {
    return dateString;
  }
};

export default function MovimentacaoFinanceira() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchMovimentacoes();
  }, []);

  const fetchMovimentacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_logs')
        .select(`
          id,
          reserva_id,
          event_type,
          event_status,
          event_message,
          amount,
          refund_amount,
          payment_method,
          mp_payment_id,
          created_at,
          reservas!payment_logs_reserva_id_fkey(
            reserva_numero,
            clientes!fk_reservas_cliente(nome_completo),
            tours!fk_reservas_tour(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const transformed: Movimentacao[] = (data || []).map((log: any) => ({
        id: log.id,
        reserva_id: log.reserva_id,
        reserva_numero: log.reservas?.reserva_numero || log.reserva_id?.slice(0, 8) || '-',
        cliente_nome: log.reservas?.clientes?.nome_completo || 'N/A',
        tour_nome: log.reservas?.tours?.name || 'N/A',
        event_type: log.event_type,
        event_status: log.event_status,
        event_message: log.event_message,
        amount: log.amount || 0,
        refund_amount: log.refund_amount || 0,
        payment_method: log.payment_method || '',
        mp_payment_id: log.mp_payment_id || '',
        created_at: log.created_at
      }));

      setMovimentacoes(transformed);
    } catch (error) {
      console.error('Error fetching movimentacoes:', error);
      toast({ title: 'Erro ao carregar movimentações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(mov => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        mov.cliente_nome.toLowerCase().includes(searchLower) ||
        mov.reserva_numero.toLowerCase().includes(searchLower) ||
        mov.tour_nome.toLowerCase().includes(searchLower) ||
        mov.mp_payment_id?.includes(searchTerm);

      const matchesType = eventTypeFilter === 'all' || mov.event_type === eventTypeFilter;

      let matchesDate = true;
      if (dateFrom) matchesDate = matchesDate && new Date(mov.created_at) >= new Date(dateFrom);
      if (dateTo) matchesDate = matchesDate && new Date(mov.created_at) <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesType && matchesDate;
    });
  }, [movimentacoes, searchTerm, eventTypeFilter, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    // Include both payment_approved and infinitepay_webhook_approved as valid payment confirmations
    const entradas = filteredMovimentacoes.filter(m => 
      m.event_type === 'payment_approved' || 
      m.event_type === 'infinitepay_webhook_approved'
    );
    const saidas = filteredMovimentacoes.filter(m => m.event_type.includes('refund'));
    
    return {
      totalEntradas: entradas.reduce((acc, m) => acc + (m.amount || 0), 0),
      totalSaidas: saidas.reduce((acc, m) => acc + (m.refund_amount || m.amount || 0), 0),
      countEntradas: entradas.length,
      countSaidas: saidas.length,
      countTotal: filteredMovimentacoes.length
    };
  }, [filteredMovimentacoes]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Reserva', 'Cliente', 'Passeio', 'Tipo', 'Valor', 'Reembolso', 'Método', 'ID MP', 'Mensagem'];
    const rows = filteredMovimentacoes.map(m => [
      formatDate(m.created_at),
      m.reserva_numero,
      m.cliente_nome,
      m.tour_nome,
      m.event_type,
      m.amount,
      m.refund_amount,
      m.payment_method,
      m.mp_payment_id,
      m.event_message || ''
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacoes_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Movimentação Financeira</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMovimentacoes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalEntradas)}</p>
                <p className="text-xs text-muted-foreground">{metrics.countEntradas} transações</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saídas (Reembolsos)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalSaidas)}</p>
                <p className="text-xs text-muted-foreground">{metrics.countSaidas} reembolsos</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className={`text-2xl font-bold ${metrics.totalEntradas - metrics.totalSaidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.totalEntradas - metrics.totalSaidas)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Movimentações</p>
                <p className="text-2xl font-bold">{metrics.countTotal}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-muted-foreground opacity-50" />
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
                  placeholder="Buscar por cliente, reserva, passeio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
              placeholder="Data início"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
              placeholder="Data fim"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Reserva</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Passeio</TableHead>
                  <TableHead className="text-center">Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredMovimentacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovimentacoes.map((mov) => (
                    <TableRow key={mov.id} className="text-sm">
                      <TableCell className="font-mono text-xs">
                        {formatDate(mov.created_at)}
                      </TableCell>
                      <TableCell>{getEventBadge(mov.event_type)}</TableCell>
                      <TableCell className="font-medium">{mov.reserva_numero}</TableCell>
                      <TableCell>{mov.cliente_nome}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{mov.tour_nome}</TableCell>
                      <TableCell className="text-center">
                        {mov.payment_method && (
                          <div className="flex items-center justify-center gap-1">
                            {getMethodIcon(mov.payment_method)}
                            <span className="text-xs uppercase">{mov.payment_method}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.event_type.includes('refund') ? (
                          <span className="text-red-600">-{formatCurrency(mov.refund_amount || mov.amount)}</span>
                        ) : (mov.event_type === 'payment_approved' || mov.event_type === 'infinitepay_webhook_approved') ? (
                          <span className="text-green-600">+{formatCurrency(mov.amount)}</span>
                        ) : (
                          <span>{formatCurrency(mov.amount)}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                        {mov.event_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
