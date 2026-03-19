import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Minus, Download, Filter, TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { BALANCO_2025_DATA, BALANCO_2025_TOTALS } from '@/data/balanco2025';
import { BALANCO_2024_DATA, BALANCO_2024_TOTALS } from '@/data/balanco2024';
import { BALANCO_2023_DATA, BALANCO_2023_TOTALS } from '@/data/balanco2023';

interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  data_pagamento: string | null;
}

interface TourCost {
  id: string;
  tour_id: string;
  quantity: number;
  unit_value: number;
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
}

interface FinanceiroComparacaoProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
}

interface MonthData {
  faturamento: number;
  gastosViagem: number;
  saldoBruto: number;
  manutencao: number;
  impostoRenda: number;
  proLabore: number;
  gastosTotais: number;
  saldoLiquido: number;
  numClientes: number;
}

const IR_RATE = 0.06;

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type IndicatorCategory = 'financeiro' | 'operacional' | 'por_pessoa' | 'all';

interface Indicator {
  id: string;
  label: string;
  category: IndicatorCategory;
  getValue: (data: MonthData, total: MonthData) => number;
  format: 'currency' | 'percent' | 'number';
}

const INDICATORS: Indicator[] = [
  // Financeiros
  { id: 'faturamento', label: 'Faturamento', category: 'financeiro', getValue: (d) => d.faturamento, format: 'currency' },
  { id: 'pct_faturamento', label: '% do Faturamento Total', category: 'financeiro', getValue: (d, t) => t.faturamento > 0 ? (d.faturamento / t.faturamento) * 100 : 0, format: 'percent' },
  { id: 'gastos_viagem', label: 'Gastos em Viagens', category: 'financeiro', getValue: (d) => d.gastosViagem, format: 'currency' },
  { id: 'pct_gastos_viagem', label: '% Gastos em Viagens por Faturamento', category: 'financeiro', getValue: (d) => d.faturamento > 0 ? (d.gastosViagem / d.faturamento) * 100 : 0, format: 'percent' },
  { id: 'saldo_bruto', label: 'Saldo Bruto', category: 'financeiro', getValue: (d) => d.saldoBruto, format: 'currency' },
  { id: 'pct_saldo_bruto', label: '% de Saldo Bruto por Faturamento', category: 'financeiro', getValue: (d) => d.faturamento > 0 ? (d.saldoBruto / d.faturamento) * 100 : 0, format: 'percent' },
  { id: 'manutencao', label: 'Manutenção e Investimentos', category: 'financeiro', getValue: (d) => d.manutencao, format: 'currency' },
  { id: 'pct_manutencao', label: '% Manutenção por Faturamento', category: 'financeiro', getValue: (d) => d.faturamento > 0 ? (d.manutencao / d.faturamento) * 100 : 0, format: 'percent' },
  { id: 'ir', label: 'Imposto de Renda', category: 'financeiro', getValue: (d) => d.impostoRenda, format: 'currency' },
  { id: 'pro_labore', label: 'Pró-labore', category: 'financeiro', getValue: (d) => d.proLabore, format: 'currency' },
  { id: 'gastos_totais', label: 'Gastos Totais', category: 'financeiro', getValue: (d) => d.gastosTotais, format: 'currency' },
  { id: 'pct_gastos_totais', label: '% de Gastos Totais', category: 'financeiro', getValue: (d, t) => t.gastosTotais > 0 ? (d.gastosTotais / t.gastosTotais) * 100 : 0, format: 'percent' },
  { id: 'pct_gastos_fat', label: '% Gastos Totais por Faturamento', category: 'financeiro', getValue: (d) => d.faturamento > 0 ? (d.gastosTotais / d.faturamento) * 100 : 0, format: 'percent' },
  { id: 'saldo_liquido', label: 'Saldo Líquido', category: 'financeiro', getValue: (d) => d.saldoLiquido, format: 'currency' },
  { id: 'pct_saldo_liq_total', label: '% do Saldo Líquido Total', category: 'financeiro', getValue: (d, t) => t.saldoLiquido !== 0 ? (d.saldoLiquido / t.saldoLiquido) * 100 : 0, format: 'percent' },
  { id: 'pct_saldo_liq_fat', label: '% Saldo Líquido por Faturamento', category: 'financeiro', getValue: (d) => d.faturamento > 0 ? (d.saldoLiquido / d.faturamento) * 100 : 0, format: 'percent' },
  { id: 'pct_saldo_liq_gastos', label: '% Saldo Líquido por Gastos Totais', category: 'financeiro', getValue: (d) => d.gastosTotais > 0 ? (d.saldoLiquido / d.gastosTotais) * 100 : 0, format: 'percent' },
  
  // Operacionais
  { id: 'num_clientes', label: 'Nº de Clientes', category: 'operacional', getValue: (d) => d.numClientes, format: 'number' },
  { id: 'pct_clientes', label: '% do Nº de Clientes Totais', category: 'operacional', getValue: (d, t) => t.numClientes > 0 ? (d.numClientes / t.numClientes) * 100 : 0, format: 'percent' },
  
  // Por Pessoa
  { id: 'fat_pessoa', label: 'Faturamento por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.faturamento / d.numClientes : 0, format: 'currency' },
  { id: 'gastos_viagem_pessoa', label: 'Gastos em Viagens por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.gastosViagem / d.numClientes : 0, format: 'currency' },
  { id: 'manutencao_pessoa', label: 'Manutenção por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.manutencao / d.numClientes : 0, format: 'currency' },
  { id: 'gastos_totais_pessoa', label: 'Gastos Totais por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.gastosTotais / d.numClientes : 0, format: 'currency' },
  { id: 'lucro_liq_pessoa', label: 'Lucro Líquido por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.saldoLiquido / d.numClientes : 0, format: 'currency' },
  { id: 'lucro_bruto_pessoa', label: 'Lucro Bruto por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.saldoBruto / d.numClientes : 0, format: 'currency' },
  { id: 'ir_pessoa', label: 'Imposto de Renda por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.impostoRenda / d.numClientes : 0, format: 'currency' },
  { id: 'pro_labore_pessoa', label: 'Pró-labore por Pessoa', category: 'por_pessoa', getValue: (d) => d.numClientes > 0 ? d.proLabore / d.numClientes : 0, format: 'currency' },
];

// Helper function to get static data for historical years
const getStaticYearData = (year: number): { data: MonthData[]; totals: MonthData & { filledMonths: number } } | null => {
  if (year === 2025) {
    return { data: BALANCO_2025_DATA, totals: BALANCO_2025_TOTALS };
  }
  if (year === 2024) {
    return { data: BALANCO_2024_DATA, totals: BALANCO_2024_TOTALS };
  }
  if (year === 2023) {
    return { data: BALANCO_2023_DATA, totals: BALANCO_2023_TOTALS };
  }
  return null;
};

const FinanceiroComparacao: React.FC<FinanceiroComparacaoProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts
}) => {
  const [comparisonMode, setComparisonMode] = useState<'monthly' | 'annual'>('monthly');
  const [categoryFilter, setCategoryFilter] = useState<IndicatorCategory>('all');
  
  // Get available years - always include 2023, 2024, 2025
  const availableYears = useMemo(() => {
    const years = new Set<number>([2023, 2024, 2025]);
    tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
    allMonthlyGeneralCosts.forEach(c => years.add(c.year));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [tours, allMonthlyGeneralCosts]);

  // Period selectors
  const [period1Year, setPeriod1Year] = useState(availableYears[0] || new Date().getFullYear());
  const [period1Month, setPeriod1Month] = useState(new Date().getMonth());
  const [period2Year, setPeriod2Year] = useState(availableYears[0] || new Date().getFullYear());
  const [period2Month, setPeriod2Month] = useState(Math.max(0, new Date().getMonth() - 1));

  // Helper to check if reservation is confirmed
  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  // Calculate data for a specific month
  const calculateMonthData = (year: number, monthIndex: number): MonthData => {
    const monthStart = startOfMonth(new Date(year, monthIndex));
    const monthEnd = endOfMonth(monthStart);
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const monthTours = tours.filter(t => {
      const tourDate = new Date(t.start_date);
      return tourDate >= monthStart && tourDate <= monthEnd;
    });

    let faturamento = 0;
    let numClientes = 0;
    monthTours.forEach(tour => {
      const tourReservations = reservations.filter(r => 
        r.tour_id === tour.id && isConfirmed(r.status)
      );
      faturamento += tourReservations.reduce((sum, r) => sum + (r.valor_pago || 0), 0);
      numClientes += tourReservations.length;
    });

    let gastosViagem = 0;
    monthTours.forEach(tour => {
      const costs = allTourCosts.filter(c => c.tour_id === tour.id);
      gastosViagem += costs.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
    });

    const monthCosts = allMonthlyGeneralCosts.filter(c => 
      c.month === monthKey && c.year === year
    );
    
    const manutencao = monthCosts
      .filter(c => c.expense_type === 'manutencao' || c.expense_type === 'outros')
      .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
    
    const proLabore = monthCosts
      .filter(c => c.expense_type === 'pro_labore')
      .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);

    const saldoBruto = faturamento - gastosViagem;
    const impostoRenda = faturamento * IR_RATE;
    const gastosTotais = gastosViagem + manutencao + impostoRenda + proLabore;
    const saldoLiquido = faturamento - gastosTotais;

    return {
      faturamento,
      gastosViagem,
      saldoBruto,
      manutencao,
      impostoRenda,
      proLabore,
      gastosTotais,
      saldoLiquido,
      numClientes
    };
  };

  // Calculate data for a full year (use static data for historical years)
  const calculateYearData = (year: number): MonthData => {
    // Check for static data first
    const staticData = getStaticYearData(year);
    if (staticData) {
      return staticData.totals;
    }
    
    const monthlyData = MONTHS.map((_, i) => calculateMonthData(year, i));
    return {
      faturamento: monthlyData.reduce((sum, m) => sum + m.faturamento, 0),
      gastosViagem: monthlyData.reduce((sum, m) => sum + m.gastosViagem, 0),
      saldoBruto: monthlyData.reduce((sum, m) => sum + m.saldoBruto, 0),
      manutencao: monthlyData.reduce((sum, m) => sum + m.manutencao, 0),
      impostoRenda: monthlyData.reduce((sum, m) => sum + m.impostoRenda, 0),
      proLabore: monthlyData.reduce((sum, m) => sum + m.proLabore, 0),
      gastosTotais: monthlyData.reduce((sum, m) => sum + m.gastosTotais, 0),
      saldoLiquido: monthlyData.reduce((sum, m) => sum + m.saldoLiquido, 0),
      numClientes: monthlyData.reduce((sum, m) => sum + m.numClientes, 0)
    };
  };

  // Get month data from static data or calculate
  const getMonthDataFromStatic = (year: number, monthIndex: number): MonthData => {
    const staticData = getStaticYearData(year);
    if (staticData) {
      return staticData.data[monthIndex];
    }
    return calculateMonthData(year, monthIndex);
  };

  // Get comparison data
  const comparisonData = useMemo(() => {
    let data1: MonthData, data2: MonthData;
    let label1: string, label2: string;
    let total1: MonthData, total2: MonthData;

    if (comparisonMode === 'monthly') {
      data1 = getMonthDataFromStatic(period1Year, period1Month);
      data2 = getMonthDataFromStatic(period2Year, period2Month);
      total1 = calculateYearData(period1Year);
      total2 = calculateYearData(period2Year);
      label1 = `${MONTHS[period1Month]} ${period1Year}`;
      label2 = `${MONTHS[period2Month]} ${period2Year}`;
    } else {
      data1 = calculateYearData(period1Year);
      data2 = calculateYearData(period2Year);
      total1 = data1;
      total2 = data2;
      label1 = `${period1Year}`;
      label2 = `${period2Year}`;
    }

    return { data1, data2, label1, label2, total1, total2 };
  }, [comparisonMode, period1Year, period1Month, period2Year, period2Month, tours, reservations, allTourCosts, allMonthlyGeneralCosts]);

  // Format helpers
  const formatCurrency = (value: number) => {
    if (value === 0) return 'R$ 0,00';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0,00%';
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatValue = (value: number, format: 'currency' | 'percent' | 'number') => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'number': return formatNumber(value);
    }
  };

  // Get filtered indicators
  const filteredIndicators = useMemo(() => {
    if (categoryFilter === 'all') return INDICATORS;
    return INDICATORS.filter(i => i.category === categoryFilter);
  }, [categoryFilter]);

  // Calculate variation
  const getVariation = (val1: number, val2: number) => {
    if (val2 === 0) return val1 === 0 ? 0 : 100;
    return ((val1 - val2) / Math.abs(val2)) * 100;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Indicador', comparisonData.label1, comparisonData.label2, 'Diferença', 'Variação %'];
    const rows = filteredIndicators.map(indicator => {
      const val1 = indicator.getValue(comparisonData.data1, comparisonData.total1);
      const val2 = indicator.getValue(comparisonData.data2, comparisonData.total2);
      const diff = val1 - val2;
      const variation = getVariation(val1, val2);
      return [
        indicator.label,
        formatValue(val1, indicator.format),
        formatValue(val2, indicator.format),
        formatValue(diff, indicator.format),
        `${variation.toFixed(2)}%`
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparacao-${comparisonData.label1}-vs-${comparisonData.label2}.csv`;
    link.click();
  };

  // Chart data for key indicators
  const chartData = useMemo(() => {
    const keyIndicators = ['faturamento', 'gastos_totais', 'saldo_liquido', 'num_clientes'];
    return keyIndicators.map(id => {
      const indicator = INDICATORS.find(i => i.id === id)!;
      const val1 = indicator.getValue(comparisonData.data1, comparisonData.total1);
      const val2 = indicator.getValue(comparisonData.data2, comparisonData.total2);
      return {
        name: indicator.label.replace(' por Pessoa', '').replace('Nº de ', ''),
        [comparisonData.label1]: val1,
        [comparisonData.label2]: val2,
      };
    });
  }, [comparisonData, filteredIndicators]);

  // Summary stats
  const summaryStats = useMemo(() => {
    let better1 = 0, better2 = 0, equal = 0;
    INDICATORS.forEach(indicator => {
      const val1 = indicator.getValue(comparisonData.data1, comparisonData.total1);
      const val2 = indicator.getValue(comparisonData.data2, comparisonData.total2);
      const isPositiveGood = !indicator.id.includes('gastos') && !indicator.id.includes('ir') && !indicator.id.includes('pro_labore');
      
      if (Math.abs(val1 - val2) < 0.01) {
        equal++;
      } else if ((val1 > val2 && isPositiveGood) || (val1 < val2 && !isPositiveGood)) {
        better1++;
      } else {
        better2++;
      }
    });
    return { better1, better2, equal };
  }, [comparisonData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Comparação Financeira</h2>
          <p className="text-sm text-muted-foreground">Compare indicadores entre períodos diferentes</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Mode Selection */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <Tabs value={comparisonMode} onValueChange={(v) => setComparisonMode(v as 'monthly' | 'annual')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly" className="gap-2">
                <Calendar className="h-4 w-4" />
                Mensal
              </TabsTrigger>
              <TabsTrigger value="annual" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Anual
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Period 1 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Período 1</label>
                <div className="flex gap-2">
                  {comparisonMode === 'monthly' && (
                    <Select value={String(period1Month)} onValueChange={v => setPeriod1Month(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, i) => (
                          <SelectItem key={i} value={String(i)}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={String(period1Year)} onValueChange={v => setPeriod1Year(parseInt(v))}>
                    <SelectTrigger className={comparisonMode === 'monthly' ? 'w-28' : 'flex-1'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Period 2 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Período 2</label>
                <div className="flex gap-2">
                  {comparisonMode === 'monthly' && (
                    <Select value={String(period2Month)} onValueChange={v => setPeriod2Month(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, i) => (
                          <SelectItem key={i} value={String(i)}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={String(period2Year)} onValueChange={v => setPeriod2Year(parseInt(v))}>
                    <SelectTrigger className={comparisonMode === 'monthly' ? 'w-28' : 'flex-1'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Melhor em</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{comparisonData.label1}</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{summaryStats.better1} indicadores</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-rose-50 dark:bg-rose-950/30">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Melhor em</span>
            </div>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{comparisonData.label2}</p>
            <p className="text-sm text-rose-600 dark:text-rose-400">{summaryStats.better2} indicadores</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-muted/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Minus className="h-4 w-4" />
              <span className="text-sm font-medium">Iguais</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.equal}</p>
            <p className="text-sm text-muted-foreground">indicadores</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Principais Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v).replace('R$ ', '')} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey={comparisonData.label1} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey={comparisonData.label2} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'financeiro', label: 'Financeiros' },
            { value: 'operacional', label: 'Operacionais' },
            { value: 'por_pessoa', label: 'Por Pessoa' },
          ].map(cat => (
            <Badge 
              key={cat.value}
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(cat.value as IndicatorCategory)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium w-1/3">Indicador</TableHead>
                  <TableHead className="text-xs font-medium text-right">{comparisonData.label1}</TableHead>
                  <TableHead className="text-xs font-medium text-right">{comparisonData.label2}</TableHead>
                  <TableHead className="text-xs font-medium text-right">Diferença</TableHead>
                  <TableHead className="text-xs font-medium text-right w-28">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndicators.map((indicator, idx) => {
                  const val1 = indicator.getValue(comparisonData.data1, comparisonData.total1);
                  const val2 = indicator.getValue(comparisonData.data2, comparisonData.total2);
                  const diff = val1 - val2;
                  const variation = getVariation(val1, val2);
                  const isPositiveGood = !indicator.id.includes('gastos') && !indicator.id.includes('ir') && !indicator.id.includes('pro_labore');
                  const isGood = (variation > 0 && isPositiveGood) || (variation < 0 && !isPositiveGood);
                  const isBad = (variation < 0 && isPositiveGood) || (variation > 0 && !isPositiveGood);

                  return (
                    <TableRow key={indicator.id} className={cn(
                      "hover:bg-muted/30",
                      idx % 2 === 0 ? "bg-muted/10" : ""
                    )}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {indicator.category === 'financeiro' ? 'FIN' : 
                             indicator.category === 'operacional' ? 'OPE' : 'P/P'}
                          </Badge>
                          <span className="text-sm font-medium">{indicator.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right font-medium text-sm">
                        {formatValue(val1, indicator.format)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-medium text-sm">
                        {formatValue(val2, indicator.format)}
                      </TableCell>
                      <TableCell className={cn(
                        "py-3 text-right font-medium text-sm",
                        diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-500" : "text-muted-foreground"
                      )}>
                        {diff > 0 ? '+' : ''}{formatValue(diff, indicator.format)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          isGood ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                          isBad ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {isGood && <ArrowUpRight className="h-3 w-3" />}
                          {isBad && <ArrowDownRight className="h-3 w-3" />}
                          {!isGood && !isBad && <Minus className="h-3 w-3" />}
                          {Math.abs(variation).toFixed(1)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroComparacao;
