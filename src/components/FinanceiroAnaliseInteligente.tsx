import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Lightbulb, Brain, Target, PieChart, BarChart3, Activity, Calendar, CheckCircle2, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Sparkles, ShieldAlert, Zap, TrendingUp as Growth } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
}
interface TourCost {
  id: string;
  tour_id: string;
  product_service: string;
  quantity: number;
  unit_value: number;
  order_index: number;
  expense_type?: string;
  valor_pago?: number;
  auto_scale_participants?: boolean;
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
interface FinanceiroAnaliseInteligenteProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
}
const IR_RATE = 0.06;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const CHART_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
type PeriodFilter = 'current_month' | 'last_3_months' | 'last_6_months' | 'current_year' | 'custom';
const FinanceiroAnaliseInteligente: React.FC<FinanceiroAnaliseInteligenteProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_year');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subMonths(new Date(), 6), 'yyyy-MM'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM'));
  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  // Format helpers - defined early as they're used in useMemo hooks
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfMonth(now);
    switch (periodFilter) {
      case 'current_month':
        start = startOfMonth(now);
        break;
      case 'last_3_months':
        start = startOfMonth(subMonths(now, 2));
        break;
      case 'last_6_months':
        start = startOfMonth(subMonths(now, 5));
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        const [startYear, startMonth] = customStartDate.split('-').map(Number);
        const [endYear, endMonth] = customEndDate.split('-').map(Number);
        start = new Date(startYear, startMonth - 1, 1);
        end = endOfMonth(new Date(endYear, endMonth - 1, 1));
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1);
    }
    return {
      start,
      end,
      months: differenceInMonths(end, start) + 1
    };
  }, [periodFilter, customStartDate, customEndDate]);

  // Calculate previous period for comparison
  const previousDateRange = useMemo(() => {
    const monthsDiff = dateRange.months;
    const previousEnd = subMonths(dateRange.start, 1);
    const previousStart = subMonths(previousEnd, monthsDiff - 1);
    return {
      start: startOfMonth(previousStart),
      end: endOfMonth(previousEnd),
      months: monthsDiff
    };
  }, [dateRange]);

  // Calculate financial data for a given period
  const calculatePeriodFinancials = (start: Date, end: Date) => {
    const periodTours = tours.filter(t => {
      const tourDate = new Date(t.start_date);
      return tourDate >= start && tourDate <= end;
    });
    let faturamento = 0;
    let gastosViagem = 0;
    let numClientes = 0;
    const tourBreakdown: {
      id: string;
      name: string;
      faturamento: number;
      gastos: number;
      lucro: number;
      clientes: number;
    }[] = [];
    const costBreakdown: Record<string, number> = {};
    const expenseTypeBreakdown: Record<string, number> = {};
    
    const EXPENSE_TYPE_LABELS: Record<string, string> = {
      'transporte': 'Transporte',
      'equipe': 'Equipe',
      'operacional': 'Operacional',
      'alimentacao': 'Alimentação',
      'seguro': 'Seguro',
      'hospedagem': 'Hospedagem',
      'gratificacao': 'Gratificação',
      'trafego_pago': 'Tráfego Pago',
      'servico_bordo': 'Serviço de Bordo',
      'taxas_entradas': 'Taxas e Entradas',
      'outros': 'Outros'
    };

    periodTours.forEach(tour => {
      const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
      const tourCostsFiltered = allTourCosts.filter(c => c.tour_id === tour.id);
      const tourFaturamento = tourReservations.reduce((sum, r) => sum + (r.valor_pago || 0), 0);
      const tourGastos = tourCostsFiltered.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
      faturamento += tourFaturamento;
      gastosViagem += tourGastos;
      numClientes += tourReservations.length;
      tourBreakdown.push({
        id: tour.id,
        name: tour.name,
        faturamento: tourFaturamento,
        gastos: tourGastos,
        lucro: tourFaturamento - tourGastos,
        clientes: tourReservations.length
      });

      // Categorize costs by expense_type from database
      tourCostsFiltered.forEach(cost => {
        const expenseType = cost.expense_type || 'outros';
        const expenseLabel = EXPENSE_TYPE_LABELS[expenseType] || expenseType;
        const costValue = cost.quantity * cost.unit_value;
        
        expenseTypeBreakdown[expenseLabel] = (expenseTypeBreakdown[expenseLabel] || 0) + costValue;
        
        // Also keep legacy keyword-based categorization for backwards compatibility
        const category = cost.product_service.toLowerCase().includes('transporte') ? 'Transporte' : cost.product_service.toLowerCase().includes('alimentação') || cost.product_service.toLowerCase().includes('refeição') ? 'Alimentação' : cost.product_service.toLowerCase().includes('hospedagem') || cost.product_service.toLowerCase().includes('hotel') ? 'Hospedagem' : cost.product_service.toLowerCase().includes('guia') ? 'Guias' : cost.product_service.toLowerCase().includes('ingresso') ? 'Ingressos' : 'Outros';
        costBreakdown[category] = (costBreakdown[category] || 0) + costValue;
      });
    });

    // Monthly general costs
    let manutencao = 0;
    let proLabore = 0;
    let outrosCustos = 0;
    allMonthlyGeneralCosts.forEach(cost => {
      const [year, month] = cost.month.split('-').map(Number);
      const costDate = new Date(year, month - 1, 15);
      if (costDate >= start && costDate <= end) {
        if (cost.expense_type === 'manutencao') manutencao += cost.quantity * cost.unit_value;else if (cost.expense_type === 'pro_labore') proLabore += cost.quantity * cost.unit_value;else outrosCustos += cost.quantity * cost.unit_value;
      }
    });
    const impostoRenda = faturamento * IR_RATE;
    const custosMensais = manutencao + proLabore + outrosCustos;
    const gastosTotais = gastosViagem + custosMensais + impostoRenda;
    const lucroBruto = faturamento - gastosViagem;
    const lucroLiquido = faturamento - gastosTotais;
    const margemLiquida = faturamento > 0 ? lucroLiquido / faturamento * 100 : 0;
    const margemBruta = faturamento > 0 ? lucroBruto / faturamento * 100 : 0;
    return {
      faturamento,
      gastosViagem,
      lucroBruto,
      manutencao,
      proLabore,
      outrosCustos,
      custosMensais,
      impostoRenda,
      gastosTotais,
      lucroLiquido,
      margemLiquida,
      margemBruta,
      numClientes,
      numTours: periodTours.length,
      tourBreakdown: tourBreakdown.sort((a, b) => b.faturamento - a.faturamento),
      costBreakdown,
      expenseTypeBreakdown
    };
  };

  // Current period financials
  const currentFinancials = useMemo(() => calculatePeriodFinancials(dateRange.start, dateRange.end), [dateRange, tours, reservations, allTourCosts, allMonthlyGeneralCosts]);

  // Previous period financials for comparison
  const previousFinancials = useMemo(() => calculatePeriodFinancials(previousDateRange.start, previousDateRange.end), [previousDateRange, tours, reservations, allTourCosts, allMonthlyGeneralCosts]);

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const data: any[] = [];
    let currentMonth = new Date(dateRange.start);
    while (currentMonth <= dateRange.end) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const monthFinancials = calculatePeriodFinancials(monthStart, monthEnd);
      data.push({
        month: format(currentMonth, 'MMM/yy', {
          locale: ptBR
        }),
        faturamento: monthFinancials.faturamento,
        custos: monthFinancials.gastosTotais,
        lucro: monthFinancials.lucroLiquido,
        margem: monthFinancials.margemLiquida,
        clientes: monthFinancials.numClientes
      });
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    return data;
  }, [dateRange, tours, reservations, allTourCosts, allMonthlyGeneralCosts]);

  // Growth calculations
  const growth = useMemo(() => {
    const faturamentoGrowth = previousFinancials.faturamento > 0 ? (currentFinancials.faturamento - previousFinancials.faturamento) / previousFinancials.faturamento * 100 : 0;
    const lucroGrowth = previousFinancials.lucroLiquido !== 0 ? (currentFinancials.lucroLiquido - previousFinancials.lucroLiquido) / Math.abs(previousFinancials.lucroLiquido) * 100 : 0;
    const clientesGrowth = previousFinancials.numClientes > 0 ? (currentFinancials.numClientes - previousFinancials.numClientes) / previousFinancials.numClientes * 100 : 0;
    return {
      faturamentoGrowth,
      lucroGrowth,
      clientesGrowth
    };
  }, [currentFinancials, previousFinancials]);

  // Health score calculation
  const healthScore = useMemo(() => {
    let score = 0;
    let maxScore = 100;

    // Margin check (30 points)
    if (currentFinancials.margemLiquida >= 20) score += 30;else if (currentFinancials.margemLiquida >= 10) score += 20;else if (currentFinancials.margemLiquida >= 0) score += 10;

    // Growth check (25 points)
    if (growth.faturamentoGrowth > 10) score += 25;else if (growth.faturamentoGrowth > 0) score += 15;else if (growth.faturamentoGrowth > -10) score += 5;

    // Revenue diversification (20 points)
    const topTourShare = currentFinancials.tourBreakdown[0]?.faturamento / currentFinancials.faturamento * 100 || 0;
    if (topTourShare < 30) score += 20;else if (topTourShare < 50) score += 15;else if (topTourShare < 70) score += 10;else score += 5;

    // Client base (15 points)
    if (currentFinancials.numClientes >= 50) score += 15;else if (currentFinancials.numClientes >= 30) score += 10;else if (currentFinancials.numClientes >= 15) score += 5;

    // Profitability (10 points)
    if (currentFinancials.lucroLiquido > 0) score += 10;
    const percentage = Math.round(score / maxScore * 100);
    if (percentage >= 80) return {
      score: percentage,
      label: 'Excelente',
      color: 'text-green-500',
      bgColor: 'bg-green-500'
    };
    if (percentage >= 60) return {
      score: percentage,
      label: 'Boa',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500'
    };
    if (percentage >= 40) return {
      score: percentage,
      label: 'Atenção',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500'
    };
    return {
      score: percentage,
      label: 'Crítica',
      color: 'text-red-500',
      bgColor: 'bg-red-500'
    };
  }, [currentFinancials, growth]);

  // Automated diagnostics
  const diagnostics = useMemo(() => {
    const insights: {
      type: 'positive' | 'warning' | 'critical';
      title: string;
      description: string;
    }[] = [];

    // Profitability analysis
    if (currentFinancials.margemLiquida >= 20) {
      insights.push({
        type: 'positive',
        title: 'Margem de lucro saudável',
        description: `A margem líquida de ${currentFinancials.margemLiquida.toFixed(1)}% está acima do ideal para o setor de turismo (15-20%).`
      });
    } else if (currentFinancials.margemLiquida >= 10) {
      insights.push({
        type: 'warning',
        title: 'Margem de lucro moderada',
        description: `A margem líquida de ${currentFinancials.margemLiquida.toFixed(1)}% está abaixo do ideal. Considere revisar custos ou ajustar preços.`
      });
    } else if (currentFinancials.margemLiquida > 0) {
      insights.push({
        type: 'critical',
        title: 'Margem de lucro baixa',
        description: `A margem líquida de ${currentFinancials.margemLiquida.toFixed(1)}% é preocupante. É necessário agir para melhorar a rentabilidade.`
      });
    } else {
      insights.push({
        type: 'critical',
        title: 'Operação com prejuízo',
        description: `O período está operando com prejuízo de ${formatCurrency(Math.abs(currentFinancials.lucroLiquido))}. Ação urgente necessária.`
      });
    }

    // Revenue concentration analysis
    if (currentFinancials.tourBreakdown.length > 0) {
      const topTourShare = currentFinancials.tourBreakdown[0].faturamento / currentFinancials.faturamento * 100;
      if (topTourShare > 50) {
        insights.push({
          type: 'warning',
          title: 'Alta concentração de receita',
          description: `"${currentFinancials.tourBreakdown[0].name}" representa ${topTourShare.toFixed(0)}% do faturamento. Diversificar reduz riscos.`
        });
      } else if (topTourShare < 30 && currentFinancials.tourBreakdown.length >= 3) {
        insights.push({
          type: 'positive',
          title: 'Receita bem diversificada',
          description: 'A receita está distribuída entre múltiplos passeios, reduzindo riscos de concentração.'
        });
      }
    }

    // Cost analysis
    const costRatio = currentFinancials.faturamento > 0 ? currentFinancials.gastosViagem / currentFinancials.faturamento * 100 : 0;
    if (costRatio > 60) {
      insights.push({
        type: 'critical',
        title: 'Custos operacionais muito elevados',
        description: `Os custos diretos de viagem consomem ${costRatio.toFixed(0)}% do faturamento. Recomenda-se renegociar com fornecedores.`
      });
    } else if (costRatio > 45) {
      insights.push({
        type: 'warning',
        title: 'Custos operacionais elevados',
        description: `Os custos de viagem representam ${costRatio.toFixed(0)}% do faturamento. Há espaço para otimização.`
      });
    }

    // Growth analysis
    if (growth.faturamentoGrowth > 20) {
      insights.push({
        type: 'positive',
        title: 'Crescimento expressivo',
        description: `O faturamento cresceu ${growth.faturamentoGrowth.toFixed(0)}% em relação ao período anterior.`
      });
    } else if (growth.faturamentoGrowth < -10) {
      insights.push({
        type: 'warning',
        title: 'Queda no faturamento',
        description: `O faturamento caiu ${Math.abs(growth.faturamentoGrowth).toFixed(0)}% em relação ao período anterior. Analise as causas.`
      });
    }

    // Seasonality analysis
    const monthsWithRevenue = monthlyTrendData.filter(m => m.faturamento > 0);
    const avgRevenue = monthsWithRevenue.reduce((sum, m) => sum + m.faturamento, 0) / (monthsWithRevenue.length || 1);
    const highMonths = monthlyTrendData.filter(m => m.faturamento > avgRevenue * 1.5);
    const lowMonths = monthlyTrendData.filter(m => m.faturamento > 0 && m.faturamento < avgRevenue * 0.5);
    if (highMonths.length > 0 || lowMonths.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Sazonalidade identificada',
        description: `Há variação significativa entre meses. ${highMonths.length > 0 ? `Picos: ${highMonths.map(m => m.month).join(', ')}.` : ''} ${lowMonths.length > 0 ? `Baixas: ${lowMonths.map(m => m.month).join(', ')}.` : ''}`
      });
    }
    return insights;
  }, [currentFinancials, growth, monthlyTrendData]);

  // Alerts generation
  const alerts = useMemo(() => {
    const alertsList: {
      severity: 'high' | 'medium' | 'low';
      message: string;
    }[] = [];
    if (currentFinancials.lucroLiquido < 0) {
      alertsList.push({
        severity: 'high',
        message: 'Operação com prejuízo líquido no período'
      });
    }
    if (currentFinancials.margemLiquida < 10 && currentFinancials.margemLiquida > 0) {
      alertsList.push({
        severity: 'medium',
        message: 'Margem de lucro abaixo de 10%'
      });
    }
    if (growth.faturamentoGrowth < -15) {
      alertsList.push({
        severity: 'high',
        message: `Queda de ${Math.abs(growth.faturamentoGrowth).toFixed(0)}% no faturamento`
      });
    }
    const topTourShare = currentFinancials.tourBreakdown[0]?.faturamento / currentFinancials.faturamento * 100 || 0;
    if (topTourShare > 70) {
      alertsList.push({
        severity: 'medium',
        message: `${topTourShare.toFixed(0)}% da receita vem de um único passeio`
      });
    }
    const transporteCost = currentFinancials.costBreakdown['Transporte'] || 0;
    const transporteRatio = currentFinancials.faturamento > 0 ? transporteCost / currentFinancials.faturamento * 100 : 0;
    if (transporteRatio > 30) {
      alertsList.push({
        severity: 'medium',
        message: `Transporte consome ${transporteRatio.toFixed(0)}% do faturamento`
      });
    }
    if (currentFinancials.gastosViagem > currentFinancials.faturamento * 0.6) {
      alertsList.push({
        severity: 'high',
        message: 'Custos operacionais acima de 60% do faturamento'
      });
    }
    return alertsList;
  }, [currentFinancials, growth]);

  // Strategic suggestions
  const suggestions = useMemo(() => {
    const suggestionsList: {
      icon: any;
      title: string;
      description: string;
    }[] = [];
    if (currentFinancials.margemLiquida < 15) {
      suggestionsList.push({
        icon: DollarSign,
        title: 'Revisar precificação',
        description: 'Considere um ajuste de 5-10% nos preços dos passeios com maior demanda para melhorar a margem.'
      });
    }
    const topTourShare = currentFinancials.tourBreakdown[0]?.faturamento / currentFinancials.faturamento * 100 || 0;
    if (topTourShare > 40) {
      suggestionsList.push({
        icon: Target,
        title: 'Diversificar portfólio',
        description: 'Promova mais os passeios menos vendidos ou crie pacotes combinados para reduzir dependência.'
      });
    }
    const lowMarginTours = currentFinancials.tourBreakdown.filter(t => {
      const margin = t.faturamento > 0 ? t.lucro / t.faturamento * 100 : 0;
      return margin < 10 && t.faturamento > 0;
    });
    if (lowMarginTours.length > 0) {
      suggestionsList.push({
        icon: AlertTriangle,
        title: 'Revisar passeios de baixa margem',
        description: `${lowMarginTours.map(t => `"${t.name}"`).join(', ')} têm margens abaixo de 10%. Renegocie custos ou ajuste preços.`
      });
    }
    if (currentFinancials.costBreakdown['Transporte'] > currentFinancials.gastosViagem * 0.4) {
      suggestionsList.push({
        icon: Zap,
        title: 'Otimizar logística',
        description: 'O transporte é seu maior custo. Considere parcerias de longo prazo ou veículos próprios.'
      });
    }
    const avgTicket = currentFinancials.numClientes > 0 ? currentFinancials.faturamento / currentFinancials.numClientes : 0;
    if (avgTicket > 0 && avgTicket < 200) {
      suggestionsList.push({
        icon: TrendingUp,
        title: 'Aumentar ticket médio',
        description: 'Ofereça opcionais premium, combos de passeios ou experiências exclusivas para aumentar o valor por cliente.'
      });
    }
    suggestionsList.push({
      icon: Calendar,
      title: 'Incentivar antecipação',
      description: 'Ofereça desconto de 5-10% para reservas antecipadas. Melhora o fluxo de caixa e previsibilidade.'
    });
    return suggestionsList;
  }, [currentFinancials]);

  // Projections
  const projections = useMemo(() => {
    const monthsWithData = monthlyTrendData.filter(m => m.faturamento > 0);
    const avgFaturamento = monthsWithData.reduce((sum, m) => sum + m.faturamento, 0) / (monthsWithData.length || 1);
    const avgCustos = monthsWithData.reduce((sum, m) => sum + m.custos, 0) / (monthsWithData.length || 1);
    const avgLucro = monthsWithData.reduce((sum, m) => sum + m.lucro, 0) / (monthsWithData.length || 1);
    const avgClientes = monthsWithData.reduce((sum, m) => sum + m.clientes, 0) / (monthsWithData.length || 1);
    return {
      faturamentoProximo: avgFaturamento,
      custosProximo: avgCustos,
      lucroProximo: avgLucro,
      clientesProximo: avgClientes,
      faturamentoAnual: avgFaturamento * 12,
      lucroAnual: avgLucro * 12
    };
  }, [monthlyTrendData]);

  // Cost distribution for pie chart
  const costDistributionData = useMemo(() => {
    const data = Object.entries(currentFinancials.costBreakdown).map(([name, value]) => ({
      name,
      value
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    // Add fixed costs
    if (currentFinancials.manutencao > 0) data.push({
      name: 'Manutenção',
      value: currentFinancials.manutencao
    });
    if (currentFinancials.proLabore > 0) data.push({
      name: 'Pró-Labore',
      value: currentFinancials.proLabore
    });
    if (currentFinancials.impostoRenda > 0) data.push({
      name: 'Imposto de Renda',
      value: currentFinancials.impostoRenda
    });
    return data;
  }, [currentFinancials]);

  // Tour participation for pie chart
  const tourParticipationData = useMemo(() => {
    return currentFinancials.tourBreakdown.map(t => ({
      name: t.name,
      value: t.faturamento
    })).filter(d => d.value > 0);
  }, [currentFinancials]);

  // Expense type breakdown for pie chart with insights
  const expenseTypeData = useMemo(() => {
    const data = Object.entries(currentFinancials.expenseTypeBreakdown || {})
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return data;
  }, [currentFinancials]);

  // Expense type insights
  const expenseTypeInsights = useMemo(() => {
    const insights: { type: 'info' | 'warning' | 'positive'; message: string }[] = [];
    const totalCosts = currentFinancials.gastosViagem;
    const expenseData = currentFinancials.expenseTypeBreakdown || {};
    
    if (totalCosts === 0) return insights;

    // Find highest cost category
    const sortedExpenses = Object.entries(expenseData).sort((a, b) => b[1] - a[1]);
    if (sortedExpenses.length > 0) {
      const [topCategory, topValue] = sortedExpenses[0];
      const topPercent = (topValue / totalCosts) * 100;
      insights.push({
        type: topPercent > 40 ? 'warning' : 'info',
        message: `"${topCategory}" é seu maior custo operacional (${topPercent.toFixed(0)}% do total).`
      });
    }

    // Check for transport costs
    const transportCost = expenseData['Transporte'] || 0;
    if (transportCost > 0) {
      const transportPercent = (transportCost / totalCosts) * 100;
      if (transportPercent > 35) {
        insights.push({
          type: 'warning',
          message: `Transporte consome ${transportPercent.toFixed(0)}% dos custos. Considere parcerias de longo prazo.`
        });
      }
    }

    // Check for team costs
    const equipeCost = expenseData['Equipe'] || 0;
    if (equipeCost > 0) {
      const equipePercent = (equipeCost / totalCosts) * 100;
      insights.push({
        type: 'info',
        message: `Equipe representa ${equipePercent.toFixed(0)}% dos custos (${formatCurrency(equipeCost)}).`
      });
    }

    // Check for diversification
    if (sortedExpenses.length >= 4) {
      const top3Sum = sortedExpenses.slice(0, 3).reduce((sum, [, val]) => sum + val, 0);
      const top3Percent = (top3Sum / totalCosts) * 100;
      if (top3Percent > 80) {
        insights.push({
          type: 'warning',
          message: `3 categorias concentram ${top3Percent.toFixed(0)}% dos custos. Diversificação limitada.`
        });
      } else {
        insights.push({
          type: 'positive',
          message: `Custos bem distribuídos entre ${sortedExpenses.length} categorias.`
        });
      }
    }

    // Low margin warning based on costs
    if (currentFinancials.faturamento > 0) {
      const costRatio = (totalCosts / currentFinancials.faturamento) * 100;
      if (costRatio > 60) {
        insights.push({
          type: 'warning',
          message: `Custos operacionais consomem ${costRatio.toFixed(0)}% do faturamento. Margem apertada.`
        });
      }
    }

    return insights.slice(0, 5);
  }, [currentFinancials]);

  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-card-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => <p key={index} style={{
          color: entry.color
        }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>)}
        </div>;
    }
    return null;
  };
  return <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Análise Financeira Inteligente</h2>
              <p className="text-muted-foreground">Diagnóstico automático do desempenho financeiro da Camaleão</p>
            </div>
          </div>
          
          {/* Period Filter */}
          <div className="flex items-center gap-4 mt-4">
            <Select value={periodFilter} onValueChange={v => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês atual</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                <SelectItem value="current_year">Ano atual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {periodFilter === 'custom' && <div className="flex items-center gap-2">
                <input type="month" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="px-3 py-2 border rounded-md bg-background" />
                <span className="text-muted-foreground">até</span>
                <input type="month" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="px-3 py-2 border rounded-md bg-background" />
              </div>}
          </div>
        </div>

        {/* Main Diagnostic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Resultado do Período */}
          <Card className={cn("col-span-1", currentFinancials.lucroLiquido >= 0 ? "bg-green-600 border-green-500" : "bg-red-600 border-red-500")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {currentFinancials.lucroLiquido >= 0 ? <TrendingUp className="h-4 w-4 text-white" /> : <TrendingDown className="h-4 w-4 text-white" />}
                <span className="text-xs uppercase text-white/80 font-medium">Resultado</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(currentFinancials.lucroLiquido)}
              </p>
              <Badge variant={currentFinancials.lucroLiquido >= 0 ? "secondary" : "destructive"} className="mt-2 bg-white/20 text-white border-white/30">
                {currentFinancials.lucroLiquido >= 0 ? 'Lucro' : 'Prejuízo'}
              </Badge>
            </CardContent>
          </Card>

          {/* Margem de Lucro */}
          <Card className="bg-blue-600 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-white" />
                <span className="text-xs uppercase text-white/80 font-medium">Margem Líquida</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {currentFinancials.margemLiquida.toFixed(1)}%
              </p>
              <p className="text-xs text-white/70 mt-1">
                Bruta: {currentFinancials.margemBruta.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Crescimento */}
          <Card className="bg-purple-600 border-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {growth.faturamentoGrowth >= 0 ? <ArrowUpRight className="h-4 w-4 text-white" /> : <ArrowDownRight className="h-4 w-4 text-white" />}
                <span className="text-xs uppercase text-white/80 font-medium">Crescimento</span>
              </div>
              <p className={cn("text-2xl font-bold", growth.faturamentoGrowth >= 0 ? "text-green-200" : "text-red-200")}>
                {formatPercent(growth.faturamentoGrowth)}
              </p>
              <p className="text-xs text-white/70 mt-1">vs período anterior</p>
            </CardContent>
          </Card>

          {/* Maior Fonte de Receita */}
          <Card className="bg-cyan-600 border-cyan-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-white" />
                <span className="text-xs uppercase text-white/80 font-medium">Top Receita</span>
              </div>
              <p className="text-sm font-bold text-white truncate">
                {currentFinancials.tourBreakdown[0]?.name || 'N/A'}
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {formatCurrency(currentFinancials.tourBreakdown[0]?.faturamento || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Maior Centro de Custo */}
          <Card className="bg-orange-600 border-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-white" />
                <span className="text-xs uppercase text-white/80 font-medium">Top Custo</span>
              </div>
              <p className="text-sm font-bold text-white truncate">
                {Object.entries(currentFinancials.costBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {formatCurrency(Object.values(currentFinancials.costBreakdown).sort((a, b) => b - a)[0] || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Saúde Financeira */}
          <Card className={cn("border", healthScore.label === 'Excelente' && "bg-green-600 border-green-500", healthScore.label === 'Boa' && "bg-blue-600 border-blue-500", healthScore.label === 'Atenção' && "bg-yellow-600 border-yellow-500", healthScore.label === 'Crítica' && "bg-red-600 border-red-500")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-xs uppercase text-white/80 font-medium">Saúde Geral</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{healthScore.score}%</span>
                <Badge className="bg-white/20 text-white border-white/30">{healthScore.label}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnóstico do Especialista */}
        <Card className="bg-slate-800 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg text-white">Diagnóstico do Especialista</CardTitle>
            </div>
            <p className="text-sm text-slate-300">
              Com base nos seus dados deste período, observamos que...
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {diagnostics.map((insight, index) => <div key={index} className={cn("p-4 rounded-lg border-l-4", insight.type === 'positive' && "bg-green-900/50 border-l-green-400", insight.type === 'warning' && "bg-yellow-900/50 border-l-yellow-400", insight.type === 'critical' && "bg-red-900/50 border-l-red-400")}>
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'positive' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                    {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-400" />}
                    {insight.type === 'critical' && <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="font-semibold text-white">{insight.title}</span>
                  </div>
                  <p className="text-sm text-slate-300 ml-6">{insight.description}</p>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Alertas e Sugestões Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alertas Financeiros */}
          <Card className="bg-slate-800 border-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <CardTitle className="text-lg text-white">Alertas Financeiros</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? <div className="space-y-2">
                  {alerts.map((alert, index) => <div key={index} className={cn("p-3 rounded-lg flex items-center gap-3", alert.severity === 'high' && "bg-red-700/60", alert.severity === 'medium' && "bg-yellow-700/60", alert.severity === 'low' && "bg-blue-700/60")}>
                      <AlertTriangle className={cn("h-4 w-4", alert.severity === 'high' && "text-red-300", alert.severity === 'medium' && "text-yellow-300", alert.severity === 'low' && "text-blue-300")} />
                      <span className="text-sm text-white">{alert.message}</span>
                    </div>)}
                </div> : <div className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-slate-300">Nenhum alerta crítico no momento</p>
                </div>}
            </CardContent>
          </Card>

          {/* Sugestões do Especialista */}
          <Card className="bg-slate-800 border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg text-white">Sugestões do Especialista</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestions.slice(0, 4).map((suggestion, index) => <div key={index} className="p-3 rounded-lg bg-primary/20 border border-primary/40">
                    <div className="flex items-center gap-2 mb-1">
                      <suggestion.icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-white text-sm">{suggestion.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 ml-6">{suggestion.description}</p>
                  </div>)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Faturamento x Custos x Lucro */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <BarChart3 className="h-4 w-4 text-primary" />
                Faturamento x Custos x Lucro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis dataKey="month" stroke="#ccc" tick={{
                  fontSize: 11,
                  fill: '#ccc'
                }} />
                  <YAxis stroke="#ccc" tick={{
                  fontSize: 11,
                  fill: '#ccc'
                }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{
                  color: '#fff'
                }} />
                  <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="custos" name="Custos" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Margem ao longo do tempo */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Activity className="h-4 w-4 text-primary" />
                Evolução da Margem de Lucro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis dataKey="month" stroke="#ccc" tick={{
                  fontSize: 11,
                  fill: '#ccc'
                }} />
                  <YAxis stroke="#ccc" tick={{
                  fontSize: 11,
                  fill: '#ccc'
                }} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend wrapperStyle={{
                  color: '#fff'
                }} />
                  <Line type="monotone" dataKey="margem" name="Margem Líquida" stroke="#a855f7" strokeWidth={3} dot={{
                  fill: '#a855f7',
                  r: 4
                }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição de Custos */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <PieChart className="h-4 w-4 text-primary" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie data={costDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({
                  name,
                  percent
                }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{
                  stroke: '#ccc'
                }}>
                    {costDistributionData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Participação por Passeio */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Target className="h-4 w-4 text-primary" />
                Participação no Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tourParticipationData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis type="number" stroke="#ccc" tick={{
                  fontSize: 11,
                  fill: '#ccc'
                }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#ccc" tick={{
                  fontSize: 10,
                  fill: '#ccc'
                }} width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Análise de Custos por Tipo */}
        <Card className="bg-gradient-to-br from-orange-900 to-amber-900 border-orange-600">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-orange-200" />
              <CardTitle className="text-lg text-white">Análise de Custos por Tipo</CardTitle>
            </div>
            <p className="text-sm text-orange-200">
              Diagnóstico detalhado de onde seu dinheiro está sendo gasto
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  Distribuição por Categoria
                </h4>
                {expenseTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPieChart>
                      <Pie 
                        data={expenseTypeData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={90} 
                        paddingAngle={3} 
                        dataKey="value" 
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} 
                        labelLine={{ stroke: '#ccc' }}
                      >
                        {expenseTypeData.map((_, index) => (
                          <Cell key={`cell-expense-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-slate-400">
                    <p className="text-sm">Sem dados de custos por tipo</p>
                  </div>
                )}
              </div>

              {/* Insights e Rankings */}
              <div className="space-y-4">
                {/* Top 5 Custos */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-400" />
                    Ranking de Custos
                  </h4>
                  <div className="space-y-2">
                    {expenseTypeData.slice(0, 6).map((item, index) => {
                      const percent = currentFinancials.gastosViagem > 0 
                        ? (item.value / currentFinancials.gastosViagem) * 100 
                        : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-white font-medium">{item.name}</span>
                              <span className="text-sm text-orange-200 font-bold">{formatCurrency(item.value)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${percent}%`, 
                                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length] 
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{percent.toFixed(1)}% do total</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Insights */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-orange-400" />
                    Insights de Custos
                  </h4>
                  {expenseTypeInsights.length > 0 ? (
                    <div className="space-y-2">
                      {expenseTypeInsights.map((insight, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "p-2.5 rounded-lg text-xs flex items-start gap-2",
                            insight.type === 'positive' && "bg-green-900/50 text-green-200",
                            insight.type === 'warning' && "bg-amber-900/50 text-amber-200",
                            insight.type === 'info' && "bg-blue-900/50 text-blue-200"
                          )}
                        >
                          {insight.type === 'positive' && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                          {insight.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                          {insight.type === 'info' && <Activity className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                          <span>{insight.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Cadastre custos com tipos para ver insights</p>
                  )}
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="mt-6 p-4 bg-orange-800/50 rounded-xl flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-xs uppercase text-orange-200 mb-1">Total de Custos Operacionais</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(currentFinancials.gastosViagem)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-orange-200 mb-1">Custo por Cliente</p>
                <p className="text-xl font-bold text-white">
                  {currentFinancials.numClientes > 0 
                    ? formatCurrency(currentFinancials.gastosViagem / currentFinancials.numClientes) 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-orange-200 mb-1">% do Faturamento</p>
                <p className={cn(
                  "text-xl font-bold",
                  currentFinancials.faturamento > 0 && (currentFinancials.gastosViagem / currentFinancials.faturamento) > 0.5 
                    ? "text-red-300" 
                    : "text-green-300"
                )}>
                  {currentFinancials.faturamento > 0 
                    ? `${((currentFinancials.gastosViagem / currentFinancials.faturamento) * 100).toFixed(1)}%` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-orange-200 mb-1">Categorias</p>
                <p className="text-xl font-bold text-white">{expenseTypeData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projeção Inteligente */}
        <Card className="bg-indigo-800 border-indigo-600">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Growth className="h-5 w-5 text-indigo-200" />
              <CardTitle className="text-lg text-white">Projeção Inteligente</CardTitle>
            </div>
            <p className="text-sm text-indigo-200">
              Baseada na média do período selecionado
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-indigo-700 border border-indigo-500">
                <p className="text-xs uppercase text-indigo-200 mb-1">Faturamento Próximo Mês</p>
                <p className="text-xl font-bold text-white">{formatCurrency(projections.faturamentoProximo)}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-700 border border-red-500">
                <p className="text-xs uppercase text-red-200 mb-1">Custos Próximo Mês</p>
                <p className="text-xl font-bold text-white">{formatCurrency(projections.custosProximo)}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-700 border border-green-500">
                <p className="text-xs uppercase text-green-200 mb-1">Lucro Estimado</p>
                <p className={cn("text-xl font-bold", projections.lucroProximo >= 0 ? "text-white" : "text-red-300")}>
                  {formatCurrency(projections.lucroProximo)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-cyan-700 border border-cyan-500">
                <p className="text-xs uppercase text-cyan-200 mb-1">Clientes Estimados</p>
                <p className="text-xl font-bold text-white">{Math.round(projections.clientesProximo)}</p>
              </div>
            </div>
            
            <div className="mt-4 p-4 rounded-lg border border-primary bg-current">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-white/80 mb-1">Projeção Anual de Faturamento</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(projections.faturamentoAnual)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/80 mb-1">Projeção Anual de Lucro</p>
                  <p className={cn("text-2xl font-bold", projections.lucroAnual >= 0 ? "text-green-200" : "text-red-300")}>
                    {formatCurrency(projections.lucroAnual)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>;
};
export default FinanceiroAnaliseInteligente;