import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Percent, Wallet, Calculator, Calendar } from "lucide-react";
import { startOfMonth, endOfMonth, format, subMonths, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
  numero_participantes?: number | null;
  card_fee_amount?: number | null;
}
interface TourCost {
  id: string;
  tour_id: string;
  product_service: string;
  quantity: number;
  unit_value: number;
  order_index: number;
}
interface MonthlyGeneralCost {
  id: string;
  month: string;
  year: number;
  expense_name: string;
  quantity: number;
  unit_value: number;
  expense_type: string;
  order_index?: number;
  payment_method?: string;
  total_installments?: number;
  current_installment?: number;
  total_value?: number;
  parent_expense_id?: string;
  purchase_date?: string;
}
interface Tour {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
}
interface BalancoAnaliseGraficaProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
  selectedYear: number;
}
const IR_RATE = 0.06;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
type FilterPeriod = 'current' | '3months' | '6months' | 'year' | 'custom';
const BalancoAnaliseGrafica: React.FC<BalancoAnaliseGraficaProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts,
  selectedYear
}) => {
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('year');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Helper to check if reservation is confirmed
  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  // Get date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);
    switch (filterPeriod) {
      case 'current':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case '3months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case '6months':
        start = startOfMonth(subMonths(now, 5));
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(new Date(selectedYear, 0, 1));
        end = endOfYear(new Date(selectedYear, 0, 1));
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : startOfYear(now);
        end = customEndDate ? new Date(customEndDate) : endOfYear(now);
        break;
      default:
        start = startOfYear(new Date(selectedYear, 0, 1));
        end = endOfYear(new Date(selectedYear, 0, 1));
    }
    return {
      start,
      end
    };
  }, [filterPeriod, customStartDate, customEndDate, selectedYear]);

  // Calculate monthly data for the selected period
  const monthlyData = useMemo(() => {
    const data: Array<{
      month: string;
      monthKey: string;
      faturamento: number;
      gastosViagem: number;
      saldoBruto: number;
      manutencao: number;
      impostoRenda: number;
      proLabore: number;
      gastosTotais: number;
      saldoLiquido: number;
      numClientes: number;
      pctFaturamento: number;
      pctGastosViagem: number;
      pctSaldoBruto: number;
      pctManutencao: number;
      pctGastosTotais: number;
      pctSaldoLiquido: number;
      faturamentoPessoa: number;
      gastosViagemPessoa: number;
      manutencaoPessoa: number;
      gastosTotaisPessoa: number;
      lucroLiquidoPessoa: number;
      lucroBrutoPessoa: number;
      irPessoa: number;
      proLaborePessoa: number;
    }> = [];
    const {
      start,
      end
    } = dateRange;

    // Generate months in range
    let current = startOfMonth(start);
    while (current <= end) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const year = current.getFullYear();
      const monthIndex = current.getMonth();
      const monthKey = format(current, 'yyyy-MM');
      const monthLabel = format(current, 'MMM/yy', {
        locale: ptBR
      });

      // Tours in this month
      const monthTours = tours.filter(t => {
        const tourDate = new Date(t.start_date);
        return tourDate >= monthStart && tourDate <= monthEnd;
      });

      // Faturamento (usando valor base sem juros)
      let faturamento = 0;
      let numClientes = 0;
      monthTours.forEach(tour => {
        const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
        // Use valor_passeio * numero_participantes as revenue (base price without card fees)
        faturamento += tourReservations.reduce((sum, r) => {
          const valorBase = r.valor_passeio || 0;
          const participantes = r.numero_participantes || 1;
          return sum + (valorBase * participantes);
        }, 0);
        numClientes += tourReservations.length;
      });

      // Gastos em Viagens
      let gastosViagem = 0;
      monthTours.forEach(tour => {
        const costs = allTourCosts.filter(c => c.tour_id === tour.id);
        gastosViagem += costs.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
      });

      // Monthly general costs
      const monthCosts = allMonthlyGeneralCosts.filter(c => c.month === monthKey && c.year === year);
      const manutencao = monthCosts.filter(c => c.expense_type === 'manutencao' || c.expense_type === 'outros').reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
      const proLabore = monthCosts.filter(c => c.expense_type === 'pro_labore').reduce((sum, c) => sum + c.quantity * c.unit_value, 0);

      // Calculated values
      const saldoBruto = faturamento - gastosViagem;
      const impostoRenda = faturamento * IR_RATE;
      const gastosTotais = gastosViagem + manutencao + impostoRenda + proLabore;
      const saldoLiquido = faturamento - gastosTotais;
      data.push({
        month: monthLabel,
        monthKey,
        faturamento,
        gastosViagem,
        saldoBruto,
        manutencao,
        impostoRenda,
        proLabore,
        gastosTotais,
        saldoLiquido,
        numClientes,
        pctFaturamento: 0,
        // Will be calculated after
        pctGastosViagem: faturamento > 0 ? gastosViagem / faturamento * 100 : 0,
        pctSaldoBruto: faturamento > 0 ? saldoBruto / faturamento * 100 : 0,
        pctManutencao: faturamento > 0 ? manutencao / faturamento * 100 : 0,
        pctGastosTotais: faturamento > 0 ? gastosTotais / faturamento * 100 : 0,
        pctSaldoLiquido: faturamento > 0 ? saldoLiquido / faturamento * 100 : 0,
        faturamentoPessoa: numClientes > 0 ? faturamento / numClientes : 0,
        gastosViagemPessoa: numClientes > 0 ? gastosViagem / numClientes : 0,
        manutencaoPessoa: numClientes > 0 ? manutencao / numClientes : 0,
        gastosTotaisPessoa: numClientes > 0 ? gastosTotais / numClientes : 0,
        lucroLiquidoPessoa: numClientes > 0 ? saldoLiquido / numClientes : 0,
        lucroBrutoPessoa: numClientes > 0 ? saldoBruto / numClientes : 0,
        irPessoa: numClientes > 0 ? impostoRenda / numClientes : 0,
        proLaborePessoa: numClientes > 0 ? proLabore / numClientes : 0
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    // Calculate % of total faturamento
    const totalFaturamento = data.reduce((sum, d) => sum + d.faturamento, 0);
    data.forEach(d => {
      d.pctFaturamento = totalFaturamento > 0 ? d.faturamento / totalFaturamento * 100 : 0;
    });
    return data;
  }, [tours, reservations, allTourCosts, allMonthlyGeneralCosts, dateRange]);

  // Totals for KPIs
  const totals = useMemo(() => {
    const sum = (key: keyof typeof monthlyData[0]) => monthlyData.reduce((acc, m) => acc + (m[key] as number), 0);
    const faturamento = sum('faturamento');
    const gastosViagem = sum('gastosViagem');
    const saldoBruto = sum('saldoBruto');
    const manutencao = sum('manutencao');
    const impostoRenda = sum('impostoRenda');
    const proLabore = sum('proLabore');
    const gastosTotais = sum('gastosTotais');
    const saldoLiquido = sum('saldoLiquido');
    const numClientes = sum('numClientes');
    return {
      faturamento,
      gastosViagem,
      saldoBruto,
      manutencao,
      impostoRenda,
      proLabore,
      gastosTotais,
      saldoLiquido,
      numClientes,
      margem: faturamento > 0 ? saldoLiquido / faturamento * 100 : 0
    };
  }, [monthlyData]);

  // Daily revenue by month for the 12 months chart
  // Uses tour start_date to determine which month revenue belongs to
  const dailyRevenueByMonth = useMemo(() => {
    const year = selectedYear;
    const monthColors = [
      '#3B82F6', // Jan - blue
      '#10B981', // Feb - emerald
      '#F59E0B', // Mar - amber
      '#EF4444', // Apr - red
      '#8B5CF6', // May - violet
      '#EC4899', // Jun - pink
      '#06B6D4', // Jul - cyan
      '#84CC16', // Aug - lime
      '#F97316', // Sep - orange
      '#6366F1', // Oct - indigo
      '#14B8A6', // Nov - teal
      '#A855F7'  // Dec - purple
    ];
    
    // Create a map of tour_id to tour start_date
    const tourDateMap = new Map<string, Date>();
    tours.forEach(t => {
      if (t.start_date) {
        tourDateMap.set(t.id, new Date(t.start_date));
      }
    });
    
    // Initialize data structure: day -> month -> revenue
    const revenueByDayMonth: Record<number, Record<string, number>> = {};
    for (let day = 1; day <= 31; day++) {
      revenueByDayMonth[day] = {};
      MONTH_ABBR.forEach(m => {
        revenueByDayMonth[day][m] = 0;
      });
    }
    
    // Aggregate revenue by tour's start_date (day and month)
    reservations.forEach(r => {
      if (!r.valor_pago || r.valor_pago <= 0) return;
      
      // Check if reservation is confirmed or paid
      const isValid = r.status === 'confirmada' || r.status === 'confirmado' || r.payment_status === 'pago';
      if (!isValid) return;
      
      // Get the tour's start_date
      const tourDate = tourDateMap.get(r.tour_id);
      if (!tourDate) return;
      
      // Only count reservations for tours in the selected year
      if (tourDate.getFullYear() !== year) return;
      
      const month = tourDate.getMonth(); // 0-11
      const day = tourDate.getDate(); // 1-31
      
      revenueByDayMonth[day][MONTH_ABBR[month]] += r.valor_pago;
    });
    
    // Convert to array format for chart
    const data: Array<Record<string, number | string>> = [];
    for (let day = 1; day <= 31; day++) {
      const dayData: Record<string, number | string> = { day };
      MONTH_ABBR.forEach(m => {
        dayData[m] = revenueByDayMonth[day][m];
      });
      data.push(dayData);
    }
    
    return { data, colors: monthColors };
  }, [reservations, tours, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  const CHART_COLORS = {
    primary: '#820AD1',
    secondary: '#6B21A8',
    faturamento: '#10B981',
    gastos: '#EF4444',
    saldoBruto: '#3B82F6',
    saldoLiquido: '#22C55E',
    manutencao: '#F59E0B',
    ir: '#8B5CF6',
    proLabore: '#EC4899',
    clientes: '#06B6D4'
  };

  // Pie chart data for cost structure
  const costStructureData = useMemo(() => {
    const total = totals.gastosViagem + totals.manutencao + totals.impostoRenda + totals.proLabore;
    if (total === 0) return [];
    return [{
      name: 'Gastos Viagem',
      value: totals.gastosViagem,
      color: CHART_COLORS.gastos,
      pct: totals.gastosViagem / totals.faturamento * 100
    }, {
      name: 'Manutenção',
      value: totals.manutencao,
      color: CHART_COLORS.manutencao,
      pct: totals.manutencao / totals.faturamento * 100
    }, {
      name: 'Imposto Renda',
      value: totals.impostoRenda,
      color: CHART_COLORS.ir,
      pct: totals.impostoRenda / totals.faturamento * 100
    }, {
      name: 'Pró-labore',
      value: totals.proLabore,
      color: CHART_COLORS.proLabore,
      pct: totals.proLabore / totals.faturamento * 100
    }].filter(d => d.value > 0);
  }, [totals]);
  return <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-1 w-8 bg-primary rounded" />
        <h2 className="text-xl font-bold text-foreground">Análise Gráfica</h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Filters */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Período de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {[{
            value: 'current',
            label: 'Mês Atual'
          }, {
            value: '3months',
            label: 'Últimos 3 meses'
          }, {
            value: '6months',
            label: 'Últimos 6 meses'
          }, {
            value: 'year',
            label: 'Ano Atual'
          }, {
            value: 'custom',
            label: 'Personalizado'
          }].map(option => <Button key={option.value} variant={filterPeriod === option.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterPeriod(option.value as FilterPeriod)} className={filterPeriod === option.value ? 'bg-primary text-white' : ''}>
                {option.label}
              </Button>)}
            
            {filterPeriod === 'custom' && <div className="flex items-center gap-2 ml-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">De:</Label>
                  <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Até:</Label>
                  <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
              </div>}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Faturamento</span>
            </div>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.faturamento)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Gastos Totais</span>
            </div>
            <p className="text-lg font-bold text-red-700">{formatCurrency(totals.gastosTotais)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">Saldo Bruto</span>
            </div>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.saldoBruto)}</p>
          </CardContent>
        </Card>
        
        <Card className={totals.saldoLiquido >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-2 ${totals.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Saldo Líquido</span>
            </div>
            <p className={`text-lg font-bold ${totals.saldoLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totals.saldoLiquido)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-violet-600 mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">Margem</span>
            </div>
            <p className={`text-lg font-bold ${totals.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatPercent(totals.margem)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-cyan-50 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Nº de Clientes</span>
            </div>
            <p className="text-lg font-bold text-cyan-700">{totals.numClientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue by Month Chart - Full Width */}
      <Card>
        <CardHeader className="pb-2 bg-primary/5">
          <CardTitle className="text-sm font-medium text-card-foreground text-center">
            Faturamento Diário por Mês ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dailyRevenueByMonth.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 10 }}
                label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5, fontSize: 11 }}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              {MONTH_ABBR.map((month, idx) => (
                <Line
                  key={month}
                  type="monotone"
                  dataKey={month}
                  name={month}
                  stroke={dailyRevenueByMonth.colors[idx]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Evolução do Faturamento */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-card-foreground text-center">
              Evolução do Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis yAxisId="left" tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{
                fontSize: 10
              }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value: number, name: string) => [name.includes('%') ? formatPercent(value) : formatCurrency(value), name]} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={CHART_COLORS.faturamento} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="pctFaturamento" name="% do Total" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{
                r: 3
              }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Estrutura de Custos */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-center text-card-foreground">
              Estrutura de Custos (% por Faturamento)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={costStructureData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {costStructureData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {costStructureData.map((item, idx) => <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{
                  backgroundColor: item.color
                }} />
                    <span className="text-xs text-sidebar-primary">{item.name}</span>
                    <Badge variant="outline" className="text-xs rounded-sm border-solid border-card-foreground text-primary">{formatPercent(item.pct)}</Badge>
                  </div>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Comparativo Faturamento x Gastos x Saldo Bruto */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-center text-card-foreground">
              Faturamento x Gastos Totais x Saldo Bruto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Bar dataKey="faturamento" name="Faturamento" fill={CHART_COLORS.faturamento} radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastosTotais" name="Gastos Totais" fill={CHART_COLORS.gastos} radius={[4, 4, 0, 0]} />
                <Bar dataKey="saldoBruto" name="Saldo Bruto" fill={CHART_COLORS.saldoBruto} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Evolução do Saldo Líquido e Margem */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-card-foreground text-center">
              Saldo Líquido e Margens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis yAxisId="left" tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{
                fontSize: 10
              }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value: number, name: string) => [name.includes('%') ? formatPercent(value) : formatCurrency(value), name]} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Bar yAxisId="left" dataKey="saldoLiquido" name="Saldo Líquido" fill={CHART_COLORS.saldoLiquido} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="pctSaldoLiquido" name="% por Faturamento" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{
                r: 3
              }} />
                <Line yAxisId="right" type="monotone" dataKey="pctGastosTotais" name="% por Gastos" stroke={CHART_COLORS.manutencao} strokeWidth={2} dot={{
                r: 3
              }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 5. Volume de Clientes x Faturamento por Pessoa */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-center text-card-foreground">
              Clientes x Faturamento por Pessoa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis yAxisId="left" tick={{
                fontSize: 10
              }} />
                <YAxis yAxisId="right" orientation="right" tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip formatter={(value: number, name: string) => [name.includes('Pessoa') ? formatCurrency(value) : value, name]} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Bar yAxisId="left" dataKey="numClientes" name="Nº Clientes" fill={CHART_COLORS.clientes} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="faturamentoPessoa" name="Fat./Pessoa" stroke={CHART_COLORS.faturamento} strokeWidth={2} dot={{
                r: 3
              }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 6. Custos por Pessoa */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-sidebar-primary text-center">
              Custos por Pessoa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Line type="monotone" dataKey="gastosViagemPessoa" name="Viagens/Pessoa" stroke={CHART_COLORS.gastos} strokeWidth={2} dot={{
                r: 3
              }} />
                <Line type="monotone" dataKey="manutencaoPessoa" name="Manutenção/Pessoa" stroke={CHART_COLORS.manutencao} strokeWidth={2} dot={{
                r: 3
              }} />
                <Line type="monotone" dataKey="gastosTotaisPessoa" name="Gastos Tot./Pessoa" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{
                r: 3
              }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7. Lucro por Pessoa */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-card-foreground text-center">
              Lucro por Pessoa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Area type="monotone" dataKey="lucroBrutoPessoa" name="Lucro Bruto/Pessoa" fill={CHART_COLORS.saldoBruto} stroke={CHART_COLORS.saldoBruto} fillOpacity={0.3} />
                <Area type="monotone" dataKey="lucroLiquidoPessoa" name="Lucro Líquido/Pessoa" fill={CHART_COLORS.saldoLiquido} stroke={CHART_COLORS.saldoLiquido} fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 8. IR por Pessoa x Pró-labore por Pessoa */}
        <Card>
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-sm font-medium text-center text-card-foreground">
              Imposto de Renda x Pró-labore por Pessoa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{
                fontSize: 10
              }} />
                <YAxis tick={{
                fontSize: 10
              }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{
                fontSize: 10
              }} />
                <Bar dataKey="irPessoa" name="IR/Pessoa" fill={CHART_COLORS.ir} radius={[4, 4, 0, 0]} />
                <Bar dataKey="proLaborePessoa" name="Pró-labore/Pessoa" fill={CHART_COLORS.proLabore} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analytical Table */}
      <Card>
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Tabela Analítica Consolidada
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-foreground font-semibold bg-primary-foreground">Mês</TableHead>
                  <TableHead className="text-right text-foreground font-semibold bg-secondary">Faturamento</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Gastos Totais</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Saldo Bruto</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Saldo Líquido</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Margem (%)</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Clientes</TableHead>
                  <TableHead className="text-right text-foreground font-semibold">Lucro Líq./Pessoa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row, idx) => <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">{row.month}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(row.faturamento)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(row.gastosTotais)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(row.saldoBruto)}</TableCell>
                    <TableCell className={`text-right ${row.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.saldoLiquido)}
                    </TableCell>
                    <TableCell className={`text-right ${row.pctSaldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(row.pctSaldoLiquido)}
                    </TableCell>
                    <TableCell className="text-right text-cyan-600">{row.numClientes}</TableCell>
                    <TableCell className={`text-right ${row.lucroLiquidoPessoa >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.lucroLiquidoPessoa)}
                    </TableCell>
                  </TableRow>)}
                {/* Totals Row */}
                <TableRow className="bg-primary/10 font-bold">
                  <TableCell className="text-foreground">TOTAL</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(totals.faturamento)}</TableCell>
                  <TableCell className="text-right text-red-700">{formatCurrency(totals.gastosTotais)}</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(totals.saldoBruto)}</TableCell>
                  <TableCell className={`text-right ${totals.saldoLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(totals.saldoLiquido)}
                  </TableCell>
                  <TableCell className={`text-right ${totals.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPercent(totals.margem)}
                  </TableCell>
                  <TableCell className="text-right text-cyan-700">{totals.numClientes}</TableCell>
                  <TableCell className={`text-right ${totals.saldoLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(totals.numClientes > 0 ? totals.saldoLiquido / totals.numClientes : 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default BalancoAnaliseGrafica;