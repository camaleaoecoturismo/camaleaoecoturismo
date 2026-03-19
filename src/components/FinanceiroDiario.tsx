import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CreditCard, 
  Wallet, 
  TrendingUp,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  MapPin,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths, parseISO, isSameDay, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tour } from "@/hooks/useTours";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago?: number | null;
  valor_passeio?: number | null;
  numero_participantes?: number | null;
  valor_total_com_opcionais?: number | null;
  data_pagamento?: string | null;
  payment_method?: string | null;
  cliente_id: string;
  card_fee_amount?: number | null;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }> | null;
}

// Helper to calculate real tour value (base + optionals, without card fees)
const calcRealTourValue = (r: Reservation): number => {
  const baseValue = r.valor_passeio || 0;
  
  // Sum optionals if they exist
  let optionalsTotal = 0;
  if (r.selected_optional_items && Array.isArray(r.selected_optional_items)) {
    optionalsTotal = r.selected_optional_items.reduce((sum, opt) => {
      return sum + ((opt.price || 0) * (opt.quantity || 1));
    }, 0);
  }
  
  return baseValue + optionalsTotal;
};

interface Cliente {
  id: string;
  nome_completo: string;
}

interface FinanceiroDiarioProps {
  tours: Tour[];
  reservations: Reservation[];
  clientes?: Cliente[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const FinanceiroDiario: React.FC<FinanceiroDiarioProps> = ({ tours, reservations, clientes = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterTour, setFilterTour] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [allParcelas, setAllParcelas] = useState<{ reserva_id: string; valor: number; data_pagamento: string; forma_pagamento: string }[]>([]);

  // Fetch all parcelas for cash-basis distribution
  useEffect(() => {
    const fetchParcelas = async () => {
      const { data } = await (await import('@/integrations/supabase/client')).supabase
        .from('reserva_parcelas')
        .select('reserva_id, valor, data_pagamento, forma_pagamento');
      setAllParcelas(data || []);
    };
    fetchParcelas();
  }, []);

  // Build parcelas map: reserva_id -> parcelas[]
  const parcelasMap = useMemo(() => {
    const map = new Map<string, typeof allParcelas>();
    allParcelas.forEach(p => {
      const arr = map.get(p.reserva_id) || [];
      arr.push(p);
      map.set(p.reserva_id, arr);
    });
    return map;
  }, [allParcelas]);

  // Helper functions
  const isConfirmed = useCallback((status: string) => {
    return status === 'confirmada' || status === 'confirmado';
  }, []);

  const isPaidPayment = useCallback((payment_status: string) => {
    return payment_status === 'pago';
  }, []);

  // Get all paid reservations with PIX or Card
  const paidReservations = useMemo(() => {
    return reservations.filter(r => 
      isConfirmed(r.status) && 
      isPaidPayment(r.payment_status) &&
      (r.data_pagamento || parcelasMap.has(r.id)) &&
      (r.payment_method === 'pix' || r.payment_method === 'credit_card' || r.payment_method === 'cartao' || parcelasMap.has(r.id))
    );
  }, [reservations, isConfirmed, isPaidPayment, parcelasMap]);

  // Apply filters
  const filteredReservations = useMemo(() => {
    return paidReservations.filter(r => {
      if (filterPaymentMethod !== 'all') {
        const method = r.payment_method === 'credit_card' ? 'cartao' : r.payment_method;
        if (method !== filterPaymentMethod) return false;
      }
      if (filterTour !== 'all' && r.tour_id !== filterTour) return false;
      return true;
    });
  }, [paidReservations, filterPaymentMethod, filterTour]);

  // Helper to detect historical/consolidated reservations
  const isHistoricalConsolidated = useCallback((r: Reservation): boolean => {
    if (parcelasMap.has(r.id)) return false; // Has parcelas = real payments
    if (!r.data_pagamento) return false;
    const tour = tours.find(t => t.id === r.tour_id);
    if (!tour?.start_date) return false;
    const payDate = format(parseISO(r.data_pagamento), 'yyyy-MM-dd');
    const tourDate = tour.start_date;
    return payDate === tourDate;
  }, [parcelasMap, tours]);

  // Transaction entry for display - each entry represents a single payment event on a specific day
  interface TransactionEntry {
    reservation: Reservation;
    value: number;
    paymentMethod: string;
    isHistorical: boolean;
    time: string | null; // HH:mm for sorting
  }

  // Group payments by day - using parcelas when available for accurate cash-basis
  const paymentsByDay = useMemo(() => {
    const grouped: Record<string, { total: number; pix: number; card: number; count: number; transactions: TransactionEntry[]; historicalTotal: number }> = {};
    
    filteredReservations.forEach(r => {
      const parcelas = parcelasMap.get(r.id);
      
      if (parcelas && parcelas.length > 0) {
        // Each parcela is an individual transaction entry on its date
        parcelas.forEach(p => {
          const dateKey = p.data_pagamento;
          if (!grouped[dateKey]) {
            grouped[dateKey] = { total: 0, pix: 0, card: 0, count: 0, transactions: [], historicalTotal: 0 };
          }
          
          const parcelaValue = Number(p.valor);
          const method = p.forma_pagamento === 'cartao' ? 'card' : 'pix';
          
          grouped[dateKey].total += parcelaValue;
          grouped[dateKey].count += 1;
          grouped[dateKey].transactions.push({
            reservation: r,
            value: parcelaValue,
            paymentMethod: p.forma_pagamento === 'cartao' ? 'credit_card' : 'pix',
            isHistorical: false,
            time: null
          });
          
          if (method === 'pix') {
            grouped[dateKey].pix += parcelaValue;
          } else {
            grouped[dateKey].card += parcelaValue;
          }
        });
      } else {
        // Fallback: use data_pagamento from reservas with valor_pago
        if (!r.data_pagamento) return;
        const dateKey = format(parseISO(r.data_pagamento), 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = { total: 0, pix: 0, card: 0, count: 0, transactions: [], historicalTotal: 0 };
        }
        
        // Use valor_pago (what was actually received) instead of recalculating
        const paidValue = r.valor_pago || calcRealTourValue(r);
        const historical = isHistoricalConsolidated(r);
        
        grouped[dateKey].total += paidValue;
        grouped[dateKey].count += 1;
        grouped[dateKey].transactions.push({
          reservation: r,
          value: paidValue,
          paymentMethod: r.payment_method || 'pix',
          isHistorical: historical,
          time: r.data_pagamento ? format(parseISO(r.data_pagamento), 'HH:mm') : null
        });
        
        // Track historical consolidated amounts
        if (historical) {
          grouped[dateKey].historicalTotal += paidValue;
        }
        
        if (r.payment_method === 'pix') {
          grouped[dateKey].pix += paidValue;
        } else {
          grouped[dateKey].card += paidValue;
        }
      }
    });
    
    return grouped;
  }, [filteredReservations, parcelasMap, isHistoricalConsolidated]);

  // Calculate month stats
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    let totalMonth = 0;
    let daysWithPayments = 0;
    let maxDay = { date: '', amount: 0 };
    
    Object.entries(paymentsByDay).forEach(([dateKey, data]) => {
      const date = parseISO(dateKey);
      if (date >= monthStart && date <= monthEnd) {
        totalMonth += data.total;
        daysWithPayments += 1;
        if (data.total > maxDay.amount) {
          maxDay = { date: dateKey, amount: data.total };
        }
      }
    });
    
    return {
      total: totalMonth,
      avgDaily: daysWithPayments > 0 ? totalMonth / daysWithPayments : 0,
      bestDay: maxDay,
      daysWithPayments
    };
  }, [paymentsByDay, currentMonth]);

  // Daily chart data (1 to last day of month)
  const dailyChartData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = format(new Date(year, month, day), 'yyyy-MM-dd');
      const dayData = paymentsByDay[dateKey];
      
      return {
        day,
        total: dayData?.total || 0,
        pix: dayData?.pix || 0,
        card: dayData?.card || 0
      };
    });
  }, [currentMonth, paymentsByDay]);

  const getHeatmapIntensity = useCallback((amount: number) => {
    if (amount === 0) return 0;
    const maxAmount = Math.max(...Object.values(paymentsByDay).map(d => d.total), 1);
    return Math.min(Math.ceil((amount / maxAmount) * 5), 5);
  }, [paymentsByDay]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding days at the beginning
    const startDayOfWeek = getDay(monthStart);
    const paddingDays: (Date | null)[] = Array(startDayOfWeek).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  // Selected day details
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return paymentsByDay[dateKey] || { total: 0, pix: 0, card: 0, count: 0, transactions: [], historicalTotal: 0 };
  }, [selectedDate, paymentsByDay]);

  // Group selected day by tour
  const selectedDayByTour = useMemo(() => {
    if (!selectedDayData) return [];
    
    const grouped: Record<string, { tour: Tour | undefined; total: number; count: number }> = {};
    
    selectedDayData.transactions.forEach(t => {
      const tourId = t.reservation.tour_id;
      if (!grouped[tourId]) {
        grouped[tourId] = {
          tour: tours.find(tour => tour.id === tourId),
          total: 0,
          count: 0
        };
      }
      grouped[tourId].total += t.value;
      grouped[tourId].count += 1;
    });
    
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [selectedDayData, tours]);

  // Get client name
  const getClientName = useCallback((clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_completo || 'Cliente não encontrado';
  }, [clientes]);

  // Get tour name
  const getTourName = useCallback((tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    return tour?.name || 'Passeio não encontrado';
  }, [tours]);

  // Handle day click
  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
    setSheetOpen(true);
  };

  // Export to CSV
  const exportToCSV = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const rows = filteredReservations
      .filter(r => {
        if (!r.data_pagamento) return false;
        const date = parseISO(r.data_pagamento);
        return date >= monthStart && date <= monthEnd;
      })
      .map(r => ({
        data: r.data_pagamento ? format(parseISO(r.data_pagamento), 'dd/MM/yyyy HH:mm') : '',
        cliente: getClientName(r.cliente_id),
        passeio: getTourName(r.tour_id),
        forma_pagamento: r.payment_method === 'pix' ? 'PIX' : 'Cartão',
        valor: r.valor_pago || 0
      }));
    
    const header = ['Data', 'Cliente', 'Passeio', 'Forma de Pagamento', 'Valor'];
    const csvContent = [
      header.join(';'),
      ...rows.map(r => [r.data, r.cliente, r.passeio, r.forma_pagamento, r.valor.toFixed(2).replace('.', ',')].join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro-diario-${format(currentMonth, 'yyyy-MM')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Tours with payments in the period
  const toursWithPayments = useMemo(() => {
    const tourIds = new Set(paidReservations.map(r => r.tour_id));
    return tours.filter(t => tourIds.has(t.id));
  }, [tours, paidReservations]);

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterTour} onValueChange={setFilterTour}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Passeio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os passeios</SelectItem>
              {toursWithPayments.map(tour => (
                <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Total do Mês</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(monthStats.total)}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Média Diária</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(monthStats.avgDaily)}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">Melhor Dia</p>
                <p className="text-2xl font-bold text-violet-700">{formatCurrency(monthStats.bestDay.amount)}</p>
                {monthStats.bestDay.date && (
                  <p className="text-xs text-violet-500 mt-1">
                    {format(parseISO(monthStats.bestDay.date), 'dd/MM', { locale: ptBR })}
                  </p>
                )}
              </div>
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Dias com Entradas</p>
                <p className="text-2xl font-bold text-amber-700">{monthStats.daysWithPayments}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendário Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayData = paymentsByDay[dateKey];
              const hasPayments = dayData && dayData.total > 0;
              const hasHistorical = dayData && dayData.historicalTotal > 0;
              const intensity = hasPayments ? getHeatmapIntensity(dayData.total) : 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              
              return (
                <button
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-0.5 relative group",
                    "hover:ring-2 hover:ring-primary/30",
                    isCurrentDay && "ring-2 ring-primary",
                    !isCurrentMonth && "opacity-40",
                    hasPayments && intensity === 1 && "bg-emerald-100",
                    hasPayments && intensity === 2 && "bg-emerald-200",
                    hasPayments && intensity === 3 && "bg-emerald-300",
                    hasPayments && intensity === 4 && "bg-emerald-400",
                    hasPayments && intensity === 5 && "bg-emerald-500",
                    !hasPayments && "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    hasPayments && intensity >= 4 && "text-white",
                    hasPayments && intensity < 4 && "text-emerald-900",
                    !hasPayments && "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasPayments && (
                    <span className={cn(
                      "text-[9px] font-medium truncate max-w-full px-1",
                      intensity >= 4 ? "text-white/90" : "text-emerald-700"
                    )}>
                      {formatCurrency(dayData.total).replace('R$', '').trim()}
                    </span>
                  )}
                  {hasHistorical && (
                    <AlertTriangle className={cn(
                      "absolute top-0.5 right-0.5 h-3 w-3",
                      intensity >= 4 ? "text-yellow-200" : "text-amber-500"
                    )} />
                  )}
                  
                  {/* Tooltip on hover */}
                  {hasPayments && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <div className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        <div>{formatCurrency(dayData.total)}</div>
                        <div className="text-[10px] opacity-80">{dayData.count} transação(ões)</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded bg-muted/30" />
              <span>Sem entradas</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded",
                    i === 1 && "bg-emerald-100",
                    i === 2 && "bg-emerald-200",
                    i === 3 && "bg-emerald-300",
                    i === 4 && "bg-emerald-400",
                    i === 5 && "bg-emerald-500"
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-2">Maior volume</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Gráfico Diário - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  labelFormatter={(label) => `Dia ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Day Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            {selectedDayData && selectedDayData.total > 0 ? (
              <div className="space-y-6 pr-4">
                {/* Historical warning */}
                {selectedDayData.historicalTotal > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold">Dados históricos consolidados</p>
                      <p className="mt-0.5">{formatCurrency(selectedDayData.historicalTotal)} deste dia vem de reservas importadas em lote, onde a data de pagamento foi registrada como a data da viagem. O valor real pode ter sido recebido em datas anteriores.</p>
                    </div>
                  </div>
                )}
                {/* Day Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-emerald-600 font-medium">Total</p>
                      <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedDayData.total)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Wallet className="h-3 w-3 text-green-600" />
                        <p className="text-xs text-green-600 font-medium">PIX</p>
                      </div>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(selectedDayData.pix)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CreditCard className="h-3 w-3 text-blue-600" />
                        <p className="text-xs text-blue-600 font-medium">Cartão</p>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedDayData.card)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Tour */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Por Passeio
                  </h4>
                  <div className="space-y-2">
                    {selectedDayByTour.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.tour?.name || 'Desconhecido'}</p>
                          <p className="text-xs text-muted-foreground">{item.count} venda(s)</p>
                        </div>
                        <Badge variant="secondary" className="text-sm font-semibold">
                          {formatCurrency(item.total)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Transactions List */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Transações ({selectedDayData.count})
                  </h4>
                  <div className="space-y-3">
                    {selectedDayData.transactions
                      .sort((a, b) => {
                        const dateA = a.reservation.data_pagamento ? new Date(a.reservation.data_pagamento).getTime() : 0;
                        const dateB = b.reservation.data_pagamento ? new Date(b.reservation.data_pagamento).getTime() : 0;
                        return dateB - dateA;
                      })
                      .map((t, idx) => {
                        const r = t.reservation;
                        const isPix = t.paymentMethod === 'pix';
                        return (
                        <div key={idx} className={cn("p-3 border rounded-lg bg-background", t.isHistorical && "border-amber-300 bg-amber-50/50")}>
                          {t.isHistorical && (
                            <div className="flex items-center gap-1 mb-2">
                              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-100">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Histórico consolidado
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{getClientName(r.cliente_id)}</p>
                              <p className="text-xs text-muted-foreground truncate">{getTourName(r.tour_id)}</p>
                              {t.time && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.time}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  isPix 
                                    ? "border-green-500 text-green-600" 
                                    : "border-blue-500 text-blue-600"
                                )}
                              >
                                {isPix ? (
                                  <><Wallet className="h-3 w-3 mr-1" /> PIX</>
                                ) : (
                                  <><CreditCard className="h-3 w-3 mr-1" /> Cartão</>
                                )}
                              </Badge>
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(t.value)}
                              </span>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nenhuma transação neste dia</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FinanceiroDiario;
