import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Wallet, Calculator, Target, Settings2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, BarChart, Bar } from "recharts";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
  refund_amount?: number | null;
  numero_participantes?: number | null;
  card_fee_amount?: number | null;
  payment_method?: string | null;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }> | null;
}

// Helper: calculate real tour value (base + optionals)
const calcRealTourValue = (r: Reservation): number => {
  const baseValue = r.valor_passeio || 0;
  let optionalsTotal = 0;
  if (r.selected_optional_items && Array.isArray(r.selected_optional_items)) {
    optionalsTotal = r.selected_optional_items.reduce((sum, opt) => {
      return sum + ((opt.price || 0) * (opt.quantity || 1));
    }, 0);
  }
  return baseValue + optionalsTotal;
};

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

interface RecurringCost {
  id: string;
  expense_name: string;
  unit_value: number;
  expense_type: string;
  status: 'ativo' | 'pausado' | 'encerrado';
  start_date: string;
  end_date: string | null;
}

interface FinanceiroDashboardProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
  recurringCosts?: RecurringCost[];
  selectedYear: number;
}

const IR_RATE = 0.06;

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const FinanceiroDashboard: React.FC<FinanceiroDashboardProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts,
  recurringCosts = [],
  selectedYear
}) => {
  const [metaFaturamento, setMetaFaturamento] = useState<string>('');
  const [metaLucro, setMetaLucro] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [allParcelas, setAllParcelas] = useState<{ reserva_id: string; valor: number; data_pagamento: string; forma_pagamento: string }[]>([]);

  useEffect(() => {
    const fetchParcelas = async () => {
      const { data } = await supabase.from('reserva_parcelas').select('reserva_id, valor, data_pagamento, forma_pagamento');
      setAllParcelas(data || []);
    };
    fetchParcelas();
  }, []);

  // Build parcelas map
  const parcelasMap = useMemo(() => {
    const map = new Map<string, typeof allParcelas>();
    allParcelas.forEach(p => {
      const arr = map.get(p.reserva_id) || [];
      arr.push(p);
      map.set(p.reserva_id, arr);
    });
    return map;
  }, [allParcelas]);

  useEffect(() => {
    const loadMetas = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [`meta_faturamento_${selectedYear}`, `meta_lucro_${selectedYear}`]);
      
      if (!error && data) {
        data.forEach(item => {
          if (item.setting_key === `meta_faturamento_${selectedYear}`) {
            setMetaFaturamento(item.setting_value || '');
          } else if (item.setting_key === `meta_lucro_${selectedYear}`) {
            setMetaLucro(item.setting_value || '');
          }
        });
      }
    };
    loadMetas();
  }, [selectedYear]);

  const saveMetas = async () => {
    try {
      await supabase
        .from('site_settings')
        .upsert({
          setting_key: `meta_faturamento_${selectedYear}`,
          setting_value: metaFaturamento
        }, { onConflict: 'setting_key' });

      await supabase
        .from('site_settings')
        .upsert({
          setting_key: `meta_lucro_${selectedYear}`,
          setting_value: metaLucro
        }, { onConflict: 'setting_key' });

      toast.success('Metas salvas com sucesso!');
      setModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar metas');
    }
  };

  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  const monthlyData = useMemo(() => {
    return MONTHS.map((_, monthIndex) => {
      const monthStart = startOfMonth(new Date(selectedYear, monthIndex));
      const monthEnd = endOfMonth(monthStart);
      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;

      const monthTours = tours.filter(t => {
        const tourDate = new Date(t.start_date);
        return tourDate >= monthStart && tourDate <= monthEnd;
      });

      // FATURAMENTO: regime de caixa - usando parcelas individuais quando existem
      let faturamento = 0;
      let numClientes = 0;
      
      // Count clients by tour start_date (operational metric)
      monthTours.forEach(tour => {
        const tourReservations = reservations.filter(r => 
          r.tour_id === tour.id && isConfirmed(r.status)
        );
        numClientes += tourReservations.length;
      });

      // Revenue by payment date (cash-basis) - use actual parcela values
      reservations.forEach(r => {
        if (!isConfirmed(r.status)) return;
        const parcelas = parcelasMap.get(r.id);
        
        if (parcelas && parcelas.length > 0) {
          // Sum actual parcela values paid in this month
          parcelas.forEach(p => {
            const payDate = new Date(p.data_pagamento + 'T12:00:00');
            if (payDate >= monthStart && payDate <= monthEnd) {
              faturamento += Number(p.valor);
            }
          });
        } else {
          // Fallback: use data_pagamento from reservas with calcRealTourValue
          if (!r.data_pagamento) return;
          const payDate = new Date(r.data_pagamento);
          if (payDate >= monthStart && payDate <= monthEnd) {
            faturamento += calcRealTourValue(r);
          }
        }
      });
      
      // Faturamento total
      const faturamentoTotal = faturamento;

      let gastosViagem = 0;
      monthTours.forEach(tour => {
        const costs = allTourCosts.filter(c => c.tour_id === tour.id);
        gastosViagem += costs.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
      });

      const monthCosts = allMonthlyGeneralCosts.filter(c => 
        c.month === monthKey && c.year === selectedYear
      );
      
      const manutencao = monthCosts
        .filter(c => c.expense_type !== 'pro_labore')
        .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
      
      const proLabore = monthCosts
        .filter(c => c.expense_type === 'pro_labore')
        .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);

      // Add active recurring costs for this month
      const monthDate = new Date(selectedYear, monthIndex, 15);
      const activeRecurringTotal = recurringCosts
        .filter(c => {
          if (c.status !== 'ativo') return false;
          const startDate = new Date(c.start_date);
          if (monthDate < startDate) return false;
          if (c.end_date) {
            const endDate = new Date(c.end_date);
            if (monthDate > endDate) return false;
          }
          return true;
        })
        .reduce((sum, c) => sum + c.unit_value, 0);

      const manutencaoTotal = manutencao + activeRecurringTotal;
      const saldoBruto = faturamentoTotal - gastosViagem;
      const impostoRenda = faturamentoTotal * IR_RATE;
      const gastosTotais = gastosViagem + manutencaoTotal + impostoRenda + proLabore;
      const saldoLiquido = faturamentoTotal - gastosTotais;

      return {
        month: MONTH_ABBR[monthIndex],
        monthFull: MONTHS[monthIndex],
        faturamento: faturamentoTotal,
        valorRetidoCancelamentos: 0,
        gastosViagem,
        saldoBruto,
        manutencao: manutencaoTotal,
        impostoRenda,
        proLabore,
        gastosTotais,
        saldoLiquido,
        numClientes
      };
    });
  }, [tours, reservations, allTourCosts, allMonthlyGeneralCosts, recurringCosts, selectedYear, parcelasMap]);

  const totals = useMemo(() => {
    const sum = (key: keyof typeof monthlyData[0]) => 
      monthlyData.reduce((acc, m) => acc + (typeof m[key] === 'number' ? m[key] as number : 0), 0);
    
    const filledMonths = monthlyData.filter(m => m.faturamento > 0).length || 1;

    return {
      faturamento: sum('faturamento'),
      gastosViagem: sum('gastosViagem'),
      saldoBruto: sum('saldoBruto'),
      manutencao: sum('manutencao'),
      impostoRenda: sum('impostoRenda'),
      proLabore: sum('proLabore'),
      gastosTotais: sum('gastosTotais'),
      saldoLiquido: sum('saldoLiquido'),
      numClientes: sum('numClientes'),
      filledMonths
    };
  }, [monthlyData]);

  const averages = useMemo(() => {
    const fm = totals.filledMonths;
    return {
      faturamento: totals.faturamento / fm,
      gastosViagem: totals.gastosViagem / fm,
      gastosTotais: totals.gastosTotais / fm,
      saldoLiquido: totals.saldoLiquido / fm,
      numClientes: totals.numClientes / fm
    };
  }, [totals]);

  const perClient = useMemo(() => {
    const n = totals.numClientes || 1;
    return {
      faturamento: totals.faturamento / n,
      saldoLiquido: totals.saldoLiquido / n,
      saldoBruto: totals.saldoBruto / n,
      gastosTotais: totals.gastosTotais / n,
      gastosViagem: totals.gastosViagem / n,
      manutencao: totals.manutencao / n
    };
  }, [totals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const metaFaturamentoValue = parseFloat(metaFaturamento.replace(/\D/g, '')) || 0;
  const metaLucroValue = parseFloat(metaLucro.replace(/\D/g, '')) || 0;
  const progressFaturamento = metaFaturamentoValue > 0 ? (totals.faturamento / metaFaturamentoValue) * 100 : 0;
  const progressLucro = metaLucroValue > 0 ? (totals.saldoLiquido / metaLucroValue) * 100 : 0;

  const margemLiquida = totals.faturamento > 0 ? (totals.saldoLiquido / totals.faturamento) * 100 : 0;
  const margemBruta = totals.faturamento > 0 ? (totals.saldoBruto / totals.faturamento) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border p-3 rounded-xl shadow-lg">
          <p className="font-medium text-foreground mb-2 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Resumo Financeiro</h2>
          <p className="text-sm text-muted-foreground">Consolidado mensal de {selectedYear}</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="h-4 w-4" />
              Metas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Metas Anuais {selectedYear}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm">Meta de Faturamento</Label>
                <Input
                  type="text"
                  placeholder="Ex: 100000"
                  value={metaFaturamento}
                  onChange={(e) => setMetaFaturamento(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Meta de Lucro Líquido</Label>
                <Input
                  type="text"
                  placeholder="Ex: 50000"
                  value={metaLucro}
                  onChange={(e) => setMetaLucro(e.target.value)}
                />
              </div>
              <Button onClick={saveMetas} className="w-full">
                Salvar Metas
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {metaFaturamentoValue > 0 && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  progressFaturamento >= 100 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {progressFaturamento.toFixed(0)}% da meta
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">Faturamento Total</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.faturamento)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Média: {formatCurrency(averages.faturamento)}/mês
            </p>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-xs text-muted-foreground">
                {totals.faturamento > 0 ? formatPercent((totals.gastosTotais / totals.faturamento) * 100) : '0%'} do fat.
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Despesas Totais</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.gastosTotais)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Média: {formatCurrency(averages.gastosTotais)}/mês
            </p>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "p-2 rounded-lg",
                totals.saldoLiquido >= 0 
                  ? "bg-emerald-100 dark:bg-emerald-900/30" 
                  : "bg-rose-100 dark:bg-rose-900/30"
              )}>
                <DollarSign className={cn(
                  "h-4 w-4",
                  totals.saldoLiquido >= 0 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-rose-600 dark:text-rose-400"
                )} />
              </div>
              {metaLucroValue > 0 && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  progressLucro >= 100 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {progressLucro.toFixed(0)}% da meta
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">Lucro Líquido</p>
            <p className={cn(
              "text-2xl font-bold",
              totals.saldoLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {formatCurrency(totals.saldoLiquido)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Margem: {formatPercent(margemLiquida)}
            </p>
          </CardContent>
        </Card>

        {/* Clientes */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(perClient.faturamento)}/cliente
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
            <p className="text-2xl font-bold text-foreground">{totals.numClientes}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Média: {averages.numClientes.toFixed(1)} clientes/mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm bg-card overflow-hidden">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Evolução Mensal</h3>
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Line 
                  type="monotone" 
                  dataKey="faturamento" 
                  name="Faturamento"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(160, 84%, 39%)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gastosTotais" 
                  name="Despesas"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(0, 84%, 60%)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldoLiquido" 
                  name="Lucro"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(262, 83%, 58%)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard 
          label="Lucro Bruto" 
          value={formatCurrency(totals.saldoBruto)}
          subtext={formatPercent(margemBruta)}
          positive={totals.saldoBruto >= 0}
        />
        <MetricCard 
          label="Gastos Viagens" 
          value={formatCurrency(totals.gastosViagem)}
          subtext={`${totals.faturamento > 0 ? formatPercent((totals.gastosViagem / totals.faturamento) * 100) : '0%'} do fat.`}
        />
        <MetricCard 
          label="Manutenção" 
          value={formatCurrency(totals.manutencao)}
          subtext={`${totals.faturamento > 0 ? formatPercent((totals.manutencao / totals.faturamento) * 100) : '0%'} do fat.`}
        />
        <MetricCard 
          label="Pró-Labore" 
          value={formatCurrency(totals.proLabore)}
          subtext={`${formatCurrency(totals.proLabore / 12)}/mês`}
        />
        <MetricCard 
          label="Impostos" 
          value={formatCurrency(totals.impostoRenda)}
          subtext={`${formatPercent(IR_RATE * 100)} IR`}
        />
        <MetricCard 
          label="Meses Ativos" 
          value={totals.filledMonths.toString()}
          subtext={`de 12 meses`}
        />
      </div>

      {/* Per Client Metrics */}
      <Card className="border-0 shadow-sm bg-card">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Indicadores por Cliente</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <PerClientMetric label="Faturamento" value={formatCurrency(perClient.faturamento)} />
            <PerClientMetric 
              label="Lucro Líquido" 
              value={formatCurrency(perClient.saldoLiquido)} 
              highlight={perClient.saldoLiquido >= 0 ? 'positive' : 'negative'}
            />
            <PerClientMetric label="Lucro Bruto" value={formatCurrency(perClient.saldoBruto)} />
            <PerClientMetric label="Gastos Totais" value={formatCurrency(perClient.gastosTotais)} />
            <PerClientMetric label="Gastos Viagens" value={formatCurrency(perClient.gastosViagem)} />
            <PerClientMetric label="Manutenção" value={formatCurrency(perClient.manutencao)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Auxiliary Components
const MetricCard = ({ 
  label, 
  value, 
  subtext,
  positive
}: { 
  label: string; 
  value: string; 
  subtext?: string;
  positive?: boolean;
}) => (
  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
    <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
    <p className={cn(
      "text-lg font-semibold truncate",
      positive === true && "text-emerald-600 dark:text-emerald-400",
      positive === false && "text-rose-600 dark:text-rose-400"
    )}>
      {value}
    </p>
    {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
  </div>
);

const PerClientMetric = ({ 
  label, 
  value,
  highlight
}: { 
  label: string; 
  value: string;
  highlight?: 'positive' | 'negative';
}) => (
  <div className="text-center">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={cn(
      "text-base font-semibold",
      highlight === 'positive' && "text-emerald-600 dark:text-emerald-400",
      highlight === 'negative' && "text-rose-600 dark:text-rose-400"
    )}>
      {value}
    </p>
  </div>
);

export default FinanceiroDashboard;
