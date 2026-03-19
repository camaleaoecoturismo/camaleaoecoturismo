import React, { useMemo, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import BalancoAnaliseGrafica from './BalancoAnaliseGrafica';
import IndicatorChartModal from './charts/IndicatorChartModal';
import { BALANCO_2025_DATA, BALANCO_2025_TOTALS } from '@/data/balanco2025';
import { BALANCO_2024_DATA, BALANCO_2024_TOTALS } from '@/data/balanco2024';
import { BALANCO_2023_DATA, BALANCO_2023_TOTALS } from '@/data/balanco2023';

interface Reservation {
  id: string;
  tour_id: string;
  cliente_id?: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
  capture_method?: string | null;
  numero_participantes?: number | null;
  card_fee_amount?: number | null;
  payment_method?: string | null;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }> | null;
}

// Helper: calculate real tour value (base + optionals), same as Diário
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
  auto_scale_participants?: boolean;
  auto_scale_optional_item_id?: string | null;
  auto_scale_pricing_option_id?: string | null;
}

interface ParticipantData {
  id: string;
  reserva_id: string;
  pricing_option_id: string | null;
  selected_optionals: any[] | null;
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

interface CostPaymentRecord {
  id: string;
  tour_cost_id: string;
  amount: number;
  payment_date: string | null;
}

interface BalancoAnualProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
  recurringCosts?: RecurringCost[];
  allCostPayments?: CostPaymentRecord[];
  selectedYear: number;
  showAnaliseGrafica?: boolean;
  useHistoricalOnly?: boolean;
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

interface TotalsData extends MonthData {
  filledMonths: number;
}

const IR_RATE = 0.06;

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const MONTH_ABBR = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

// Helper function to get static data for historical years
const getStaticData = (year: number): { data: MonthData[]; totals: TotalsData } | null => {
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

const BalancoAnual: React.FC<BalancoAnualProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts,
  recurringCosts = [],
  allCostPayments = [],
  selectedYear,
  showAnaliseGrafica = true,
  useHistoricalOnly = false
}) => {
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [allParcelas, setAllParcelas] = useState<{ reserva_id: string; valor: number; data_pagamento: string; forma_pagamento: string }[]>([]);
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [detailRowKey, setDetailRowKey] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome_completo: string }[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantData[]>([]);

  // Fetch all parcelas, clientes, and participants
  useEffect(() => {
    const fetchData = async () => {
      const [parcelasRes, clientesRes, participantsRes] = await Promise.all([
        supabase.from('reserva_parcelas').select('reserva_id, valor, data_pagamento, forma_pagamento'),
        supabase.from('clientes').select('id, nome_completo'),
        supabase.from('reservation_participants' as any).select('id, reserva_id, pricing_option_id, selected_optionals')
      ]);
      setAllParcelas(parcelasRes.data || []);
      setClientes(clientesRes.data || []);
      const rawParticipants = (participantsRes.data || []) as any[];
      setAllParticipants(rawParticipants.map((p: any) => ({
        id: p.id,
        reserva_id: p.reserva_id,
        pricing_option_id: p.pricing_option_id || null,
        selected_optionals: Array.isArray(p.selected_optionals) ? p.selected_optionals : null
      })));
    };
    fetchData();
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

  // Filter reservations based on useHistoricalOnly flag
  const filteredReservations = useMemo(() => {
    if (!useHistoricalOnly) return reservations;
    return reservations.filter(r => r.capture_method === 'historico');
  }, [reservations, useHistoricalOnly]);
  
  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  // Shared helper: calculate effective quantity for a cost (same logic as FinanceiroTab)
  const calcEffectiveQty = (cost: TourCost, tourConfirmedParticipants: number, tourParticipants: ParticipantData[], tourReservations: Reservation[]): number => {
    if (cost.auto_scale_optional_item_id) {
      let count = 0;
      tourParticipants.forEach(p => {
        if (p.selected_optionals && Array.isArray(p.selected_optionals)) {
          if (p.selected_optionals.some((opt: any) => opt.id === cost.auto_scale_optional_item_id || opt.optional_id === cost.auto_scale_optional_item_id)) count++;
        }
      });
      tourReservations.forEach(r => {
        (r.selected_optional_items || []).forEach((opt: any) => {
          if (opt.id === cost.auto_scale_optional_item_id) count += opt.quantity || 1;
        });
      });
      return count || 0;
    }
    if (cost.auto_scale_pricing_option_id) {
      return tourParticipants.filter(p => p.pricing_option_id === cost.auto_scale_pricing_option_id).length;
    }
    if (cost.auto_scale_participants && tourConfirmedParticipants > 0) {
      return tourConfirmedParticipants;
    }
    return cost.quantity;
  };
  // Calculate monthly data
  const monthlyData = useMemo((): MonthData[] => {
    // Para anos históricos (2023, 2024, 2025), usar dados estáticos
    const staticData = getStaticData(selectedYear);
    if (staticData) {
      return staticData.data;
    }

    return MONTHS.map((_, monthIndex) => {
      const monthStart = startOfMonth(new Date(selectedYear, monthIndex));
      const monthEnd = endOfMonth(monthStart);
      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;

      const monthTours = tours.filter(t => {
        const tourDate = new Date(t.start_date);
        return tourDate >= monthStart && tourDate <= monthEnd;
      });

      // FATURAMENTO: regime de caixa - soma das parcelas pagas no mês
      let faturamento = 0;
      
      filteredReservations.forEach(r => {
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

      // numClientes: mantém pela data do passeio (quantos clientes viajaram no mês)
      let numClientes = 0;
      monthTours.forEach(tour => {
        const tourReservations = filteredReservations.filter(r => 
          r.tour_id === tour.id && isConfirmed(r.status)
        );
        numClientes += tourReservations.length;
      });

      // GASTOS VIAGEM: custo operacional alocado pela data do passeio
      let gastosViagem = 0;

      // Get costs for tours in this month
      monthTours.forEach(tour => {
        const costs = allTourCosts.filter(c => c.tour_id === tour.id);
        const tourReservationsForCosts = filteredReservations.filter(r => 
          r.tour_id === tour.id && isConfirmed(r.status)
        );
        const tourConfirmedParticipants = tourReservationsForCosts.reduce(
          (sum, r) => sum + (r.numero_participantes || 1), 0
        );
        const tourReservaIds = tourReservationsForCosts.map(r => r.id);
        const tourParticipants = allParticipants.filter(p => tourReservaIds.includes(p.reserva_id));

        costs.forEach(cost => {
          const effectiveQty = calcEffectiveQty(cost, tourConfirmedParticipants, tourParticipants, tourReservationsForCosts);
          gastosViagem += effectiveQty * cost.unit_value;
        });
      });

      const monthCosts = allMonthlyGeneralCosts.filter(c => 
        c.month === monthKey && c.year === selectedYear
      );
      
      // Pró-labore tem linha própria
      const proLabore = monthCosts
        .filter(c => c.expense_type === 'pro_labore')
        .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);

      // Manutenção e Investimento = TODOS os custos mensais gerais EXCETO pró-labore + recorrentes ativos
      const custosPontuais = monthCosts
        .filter(c => c.expense_type !== 'pro_labore')
        .reduce((sum, c) => sum + c.quantity * c.unit_value, 0);

      // Add active recurring costs for this month
      const monthDate = new Date(selectedYear, monthIndex, 15);
      const activeRecurring = recurringCosts
        .filter(c => {
          if (c.status !== 'ativo') return false;
          const startDate = new Date(c.start_date + 'T12:00:00');
          if (startDate > monthDate) return false;
          if (c.end_date) {
            const endDate = new Date(c.end_date + 'T12:00:00');
            if (endDate < new Date(selectedYear, monthIndex, 1)) return false;
          }
          return true;
        })
        .reduce((sum, c) => sum + c.unit_value, 0);

      const manutencao = custosPontuais + activeRecurring;

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
    });
  }, [tours, filteredReservations, allTourCosts, allMonthlyGeneralCosts, recurringCosts, allCostPayments, selectedYear, parcelasMap, allParticipants]);

  // Calculate totals
  const totals = useMemo((): TotalsData => {
    const staticData = getStaticData(selectedYear);
    if (staticData) {
      return staticData.totals;
    }

    const sum = (key: keyof MonthData) => 
      monthlyData.reduce((acc, m) => acc + m[key], 0);
    
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
  }, [monthlyData, selectedYear]);

  // Calculate averages
  const mediaData = useMemo((): MonthData => {
    const fm = totals.filledMonths;
    return {
      faturamento: totals.faturamento / fm,
      gastosViagem: totals.gastosViagem / fm,
      saldoBruto: totals.saldoBruto / fm,
      manutencao: totals.manutencao / fm,
      impostoRenda: totals.impostoRenda / fm,
      proLabore: totals.proLabore / fm,
      gastosTotais: totals.gastosTotais / fm,
      saldoLiquido: totals.saldoLiquido / fm,
      numClientes: totals.numClientes / fm
    };
  }, [totals]);

  // Calculate projections
  const previsaoData = useMemo((): MonthData => ({
    faturamento: mediaData.faturamento * 12,
    gastosViagem: mediaData.gastosViagem * 12,
    saldoBruto: mediaData.saldoBruto * 12,
    manutencao: mediaData.manutencao * 12,
    impostoRenda: mediaData.impostoRenda * 12,
    proLabore: mediaData.proLabore * 12,
    gastosTotais: mediaData.gastosTotais * 12,
    saldoLiquido: mediaData.saldoLiquido * 12,
    numClientes: Math.round(mediaData.numClientes * 12)
  }), [mediaData]);

  // Format helpers
  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    const prefix = value < 0 ? '-' : '';
    return `${prefix}R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '-';
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    if (value === 0) return '-';
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  };

  // Row definitions with blocks
  type RowDef = {
    label: string;
    key: string;
    type: 'currency' | 'percent' | 'number';
    getValue: (data: MonthData, total: TotalsData) => number;
    block: number;
    isPercent?: boolean;
    chartable?: boolean;
  };

  const rows: RowDef[] = [
    { label: 'Faturamento', key: 'faturamento', type: 'currency', getValue: (d) => d.faturamento, block: 1, chartable: true },
    { label: '% do Fat. Total', key: 'pct_faturamento', type: 'percent', getValue: (d, t) => t.faturamento > 0 ? (d.faturamento / t.faturamento) * 100 : 0, block: 1, isPercent: true },
    
    { label: 'Gastos Viagens', key: 'gastos_viagem', type: 'currency', getValue: (d) => d.gastosViagem, block: 2, chartable: true },
    { label: '% Gastos/Fat.', key: 'pct_gastos_viagem', type: 'percent', getValue: (d) => d.faturamento > 0 ? (d.gastosViagem / d.faturamento) * 100 : 0, block: 2, isPercent: true },
    
    { label: 'Saldo Bruto', key: 'saldo_bruto', type: 'currency', getValue: (d) => d.saldoBruto, block: 3, chartable: true },
    { label: '% Saldo Bruto/Fat.', key: 'pct_saldo_bruto', type: 'percent', getValue: (d) => d.faturamento > 0 ? (d.saldoBruto / d.faturamento) * 100 : 0, block: 3, isPercent: true },
    
    { label: 'Manut. e Invest.', key: 'manutencao', type: 'currency', getValue: (d) => d.manutencao, block: 4, chartable: true },
    { label: '% Manut./Fat.', key: 'pct_manutencao', type: 'percent', getValue: (d) => d.faturamento > 0 ? (d.manutencao / d.faturamento) * 100 : 0, block: 4, isPercent: true },
    
    { label: 'Imposto de Renda', key: 'ir', type: 'currency', getValue: (d) => d.impostoRenda, block: 5, chartable: true },
    { label: 'Pró-labore', key: 'pro_labore', type: 'currency', getValue: (d) => d.proLabore, block: 6, chartable: true },
    
    { label: 'Gastos Totais', key: 'gastos_totais', type: 'currency', getValue: (d) => d.gastosTotais, block: 7, chartable: true },
    { label: '% do Gastos Total', key: 'pct_gastos_totais', type: 'percent', getValue: (d, t) => t.gastosTotais > 0 ? (d.gastosTotais / t.gastosTotais) * 100 : 0, block: 7, isPercent: true },
    { label: '% Gastos Tot./Fat.', key: 'pct_gastos_fat', type: 'percent', getValue: (d) => d.faturamento > 0 ? (d.gastosTotais / d.faturamento) * 100 : 0, block: 7, isPercent: true },
    
    { label: 'Saldo Líquido', key: 'saldo_liquido', type: 'currency', getValue: (d) => d.saldoLiquido, block: 8, chartable: true },
    { label: '% Saldo Líq. Total', key: 'pct_saldo_liq_total', type: 'percent', getValue: (d, t) => t.saldoLiquido !== 0 ? (d.saldoLiquido / t.saldoLiquido) * 100 : 0, block: 8, isPercent: true },
    { label: '% Saldo Líq./Fat.', key: 'pct_saldo_liq_fat', type: 'percent', getValue: (d) => d.faturamento > 0 ? (d.saldoLiquido / d.faturamento) * 100 : 0, block: 8, isPercent: true },
    { label: '% Saldo Líq./Gastos', key: 'pct_saldo_liq_gastos', type: 'percent', getValue: (d) => d.gastosTotais > 0 ? (d.saldoLiquido / d.gastosTotais) * 100 : 0, block: 8, isPercent: true },
    
    { label: 'Nº de Clientes', key: 'num_clientes', type: 'number', getValue: (d) => d.numClientes, block: 9, chartable: true },
    { label: '% Clientes Total', key: 'pct_clientes', type: 'percent', getValue: (d, t) => t.numClientes > 0 ? (d.numClientes / t.numClientes) * 100 : 0, block: 9, isPercent: true },
    
    { label: 'Fat. por Pessoa', key: 'fat_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.faturamento / d.numClientes : 0, block: 10, chartable: true },
    { label: 'Gastos Viag./Pessoa', key: 'gastos_viagem_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.gastosViagem / d.numClientes : 0, block: 10 },
    { label: 'Manut./Pessoa', key: 'manutencao_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.manutencao / d.numClientes : 0, block: 10 },
    { label: 'Gastos Tot./Pessoa', key: 'gastos_totais_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.gastosTotais / d.numClientes : 0, block: 10 },
    { label: 'Lucro Líq./Pessoa', key: 'lucro_liq_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.saldoLiquido / d.numClientes : 0, block: 10 },
    { label: 'Lucro Bruto/Pessoa', key: 'lucro_bruto_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.saldoBruto / d.numClientes : 0, block: 10 },
    { label: 'IR/Pessoa', key: 'ir_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.impostoRenda / d.numClientes : 0, block: 10 },
    { label: 'Pró-labore/Pessoa', key: 'pro_labore_pessoa', type: 'currency', getValue: (d) => d.numClientes > 0 ? d.proLabore / d.numClientes : 0, block: 10 },
  ];

  // Row colors
  const getRowStyle = (rowKey: string) => {
    const styles: Record<string, string> = {
      'faturamento': '#002BFF',
      'pct_faturamento': '#0B3C6F',
      'gastos_viagem': '#C75454',
      'pct_gastos_viagem': '#B4453A',
      'saldo_bruto': '#6AA86A',
      'pct_saldo_bruto': '#8FC18F',
      'manutencao': '#E06A4E',
      'pct_manutencao': '#D2904D',
      'ir': '#4E86E8',
      'pro_labore': '#7B00FF',
      'gastos_totais': '#E00000',
      'pct_gastos_totais': '#FF0000',
      'pct_gastos_fat': '#6A0000',
      'saldo_liquido': '#00FF00',
      'pct_saldo_liq_total': '#8BC34A',
      'pct_saldo_liq_fat': '#2E7D32',
      'pct_saldo_liq_gastos': '#E69500',
      'num_clientes': '#B07ADB',
      'pct_clientes': '#D9A8BF',
      'fat_pessoa': '#C96B7D',
      'gastos_viagem_pessoa': '#7B2E1D',
      'manutencao_pessoa': '#E3B17A',
      'gastos_totais_pessoa': '#B30000',
      'lucro_liq_pessoa': '#8BCF8B',
      'lucro_bruto_pessoa': '#7A63A8',
      'ir_pessoa': '#76A7FA',
      'pro_labore_pessoa': '#8A00FF',
    };
    
    return {
      backgroundColor: styles[rowKey] || '#1E0033',
      color: '#FFFFFF'
    };
  };

  // Get chart data for selected indicator
  const chartData = useMemo(() => {
    if (!selectedIndicator) return [];
    const row = rows.find(r => r.key === selectedIndicator);
    if (!row) return [];

    return MONTH_ABBR.map((month, idx) => ({
      month,
      value: row.getValue(monthlyData[idx], totals)
    }));
  }, [selectedIndicator, monthlyData, totals, rows]);

  const selectedRow = rows.find(r => r.key === selectedIndicator);

  // Get row total value
  const getRowTotal = (row: RowDef): number => {
    const mockData: MonthData = {
      faturamento: totals.faturamento,
      gastosViagem: totals.gastosViagem,
      saldoBruto: totals.saldoBruto,
      manutencao: totals.manutencao,
      impostoRenda: totals.impostoRenda,
      proLabore: totals.proLabore,
      gastosTotais: totals.gastosTotais,
      saldoLiquido: totals.saldoLiquido,
      numClientes: totals.numClientes
    };
    
    if (row.type === 'percent') {
      if (row.key === 'pct_faturamento') return 100;
      if (row.key === 'pct_gastos_viagem') return totals.faturamento > 0 ? (totals.gastosViagem / totals.faturamento) * 100 : 0;
      if (row.key === 'pct_saldo_bruto') return totals.faturamento > 0 ? (totals.saldoBruto / totals.faturamento) * 100 : 0;
      if (row.key === 'pct_manutencao') return totals.faturamento > 0 ? (totals.manutencao / totals.faturamento) * 100 : 0;
      if (row.key === 'pct_gastos_totais') return 100;
      if (row.key === 'pct_gastos_fat') return totals.faturamento > 0 ? (totals.gastosTotais / totals.faturamento) * 100 : 0;
      if (row.key === 'pct_saldo_liq_total') return 100;
      if (row.key === 'pct_saldo_liq_fat') return totals.faturamento > 0 ? (totals.saldoLiquido / totals.faturamento) * 100 : 0;
      if (row.key === 'pct_saldo_liq_gastos') return totals.gastosTotais > 0 ? (totals.saldoLiquido / totals.gastosTotais) * 100 : 0;
      if (row.key === 'pct_clientes') return 100;
    }
    
    return row.getValue(mockData, totals);
  };

  // Get row average value
  const getRowMedia = (row: RowDef): number => {
    if (row.type === 'percent') {
      if (row.key === 'pct_faturamento') return 100 / totals.filledMonths;
      return row.getValue(mediaData, totals);
    }
    
    return row.getValue(mediaData, totals);
  };

  // Get row projection value
  const getRowPrevisao = (row: RowDef): number | null => {
    if (row.type === 'percent') return null;
    return row.getValue(previsaoData, totals);
  };

  const formatValue = (value: number | null, type: string) => {
    if (value === null) return '-';
    if (type === 'currency') return formatCurrency(value);
    if (type === 'percent') return formatPercent(value);
    return formatNumber(value);
  };

  const isNegative = (value: number | null) => value !== null && value < 0;

  const handleRowClick = (row: RowDef) => {
    if (row.chartable) {
      setSelectedIndicator(row.key);
      setChartDialogOpen(true);
    }
  };

  // Helper maps for names
  const clienteNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clientes.forEach(c => map.set(c.id, c.nome_completo));
    return map;
  }, [clientes]);

  const tourNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tours.forEach(t => map.set(t.id, t.name));
    return map;
  }, [tours]);

  type DetailEntry = {
    label: string;
    sublabel?: string;
    date: string;
    value: number;
    method?: string;
  };

  // Build faturamento detail entries per month
  const faturamentoDetailByMonth = useMemo(() => {
    const monthDetails: Record<number, DetailEntry[]> = {};

    filteredReservations.forEach(r => {
      if (!isConfirmed(r.status)) return;
      const parcelas = parcelasMap.get(r.id);
      const totalValue = calcRealTourValue(r);
      const clienteName = clienteNameMap.get(r.cliente_id || '') || 'Desconhecido';
      const tourName = tourNameMap.get(r.tour_id) || 'Passeio';

      if (parcelas && parcelas.length > 0) {
        parcelas.forEach(p => {
          const payDate = new Date(p.data_pagamento + 'T12:00:00');
          if (payDate.getFullYear() !== selectedYear) return;
          const monthIdx = payDate.getMonth();
          if (!monthDetails[monthIdx]) monthDetails[monthIdx] = [];
          monthDetails[monthIdx].push({
            label: clienteName,
            sublabel: tourName,
            date: p.data_pagamento,
            value: Number(p.valor),
            method: p.forma_pagamento === 'cartao' || p.forma_pagamento === 'credit_card' ? 'Cartão' : 'PIX',
          });
        });
      } else {
        if (!r.data_pagamento) return;
        const payDate = new Date(r.data_pagamento);
        if (payDate.getFullYear() !== selectedYear) return;
        const monthIdx = payDate.getMonth();
        if (!monthDetails[monthIdx]) monthDetails[monthIdx] = [];
        monthDetails[monthIdx].push({
          label: clienteName,
          sublabel: tourName,
          date: r.data_pagamento.split('T')[0],
          value: totalValue,
          method: r.payment_method === 'credit_card' || r.payment_method === 'cartao' ? 'Cartão' : 'PIX',
        });
      }
    });

    return monthDetails;
  }, [filteredReservations, parcelasMap, clienteNameMap, tourNameMap, selectedYear]);

  // Build gastos viagem detail per month (operational cost by tour date)
  const gastosViagemDetailByMonth = useMemo(() => {
    const monthDetails: Record<number, DetailEntry[]> = {};

    tours.forEach(tour => {
      const tourDate = new Date(tour.start_date + 'T12:00:00');
      if (tourDate.getFullYear() !== selectedYear) return;
      const monthIdx = tourDate.getMonth();
      const tourName = tourNameMap.get(tour.id) || 'Passeio';
      const costs = allTourCosts.filter(c => c.tour_id === tour.id);
      const tourReservationsForCosts = filteredReservations.filter(r => 
        r.tour_id === tour.id && isConfirmed(r.status)
      );
      const tourConfirmedParticipants = tourReservationsForCosts.reduce(
        (sum, r) => sum + (r.numero_participantes || 1), 0
      );
      const tourReservaIds = tourReservationsForCosts.map(r => r.id);
      const tourParticipants = allParticipants.filter(p => tourReservaIds.includes(p.reserva_id));

      costs.forEach(cost => {
        const effectiveQty = calcEffectiveQty(cost, tourConfirmedParticipants, tourParticipants, tourReservationsForCosts);
        const value = effectiveQty * cost.unit_value;
        if (value === 0) return;
        if (!monthDetails[monthIdx]) monthDetails[monthIdx] = [];
        monthDetails[monthIdx].push({
          label: cost.product_service,
          sublabel: `${tourName} (${effectiveQty}x)`,
          date: tour.start_date,
          value,
        });
      });
    });

    return monthDetails;
  }, [allTourCosts, tours, tourNameMap, filteredReservations, selectedYear, allParticipants]);

  // Build manutencao detail per month (general costs + recurring)
  const manutencaoDetailByMonth = useMemo(() => {
    const monthDetails: Record<number, DetailEntry[]> = {};

    // Monthly general costs (excluding pro_labore)
    allMonthlyGeneralCosts.forEach(c => {
      if (c.year !== selectedYear) return;
      if (c.expense_type === 'pro_labore') return;
      const parts = c.month.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (!monthDetails[monthIdx]) monthDetails[monthIdx] = [];
      const installmentInfo = c.total_installments && c.current_installment
        ? ` (${c.current_installment}/${c.total_installments})`
        : '';
      monthDetails[monthIdx].push({
        label: `${c.expense_name}${installmentInfo}`,
        sublabel: c.expense_type,
        date: c.purchase_date || c.month + '-01',
        value: c.quantity * c.unit_value,
      });
    });

    // Recurring/fixed costs
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthDate = new Date(selectedYear, monthIdx, 15);
      recurringCosts.forEach(c => {
        if (c.status !== 'ativo') return;
        const startDate = new Date(c.start_date + 'T12:00:00');
        if (startDate > monthDate) return;
        if (c.end_date) {
          const endDate = new Date(c.end_date + 'T12:00:00');
          if (endDate < new Date(selectedYear, monthIdx, 1)) return;
        }
        if (!monthDetails[monthIdx]) monthDetails[monthIdx] = [];
        monthDetails[monthIdx].push({
          label: c.expense_name,
          sublabel: `Custo Fixo · ${c.expense_type}`,
          date: `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-01`,
          value: c.unit_value,
        });
      });
    }

    return monthDetails;
  }, [allMonthlyGeneralCosts, recurringCosts, selectedYear]);

  // Gastos totais = viagem + manutencao + IR + pro-labore
  const gastosTotaisDetailByMonth = useMemo(() => {
    const monthDetails: Record<number, DetailEntry[]> = {};

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const items: DetailEntry[] = [];

      // Viagem items
      (gastosViagemDetailByMonth[monthIdx] || []).forEach(e => items.push({ ...e, sublabel: `Viagem · ${e.sublabel || ''}` }));

      // Manutencao items
      (manutencaoDetailByMonth[monthIdx] || []).forEach(e => items.push(e));

      // Pro-labore
      const monthKey = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
      const proLaboreItems = allMonthlyGeneralCosts.filter(c => c.month === monthKey && c.year === selectedYear && c.expense_type === 'pro_labore');
      proLaboreItems.forEach(c => {
        items.push({
          label: c.expense_name,
          sublabel: 'Pró-labore',
          date: c.purchase_date || monthKey + '-01',
          value: c.quantity * c.unit_value,
        });
      });

      // IR
      const fat = monthlyData[monthIdx]?.faturamento || 0;
      if (fat > 0) {
        items.push({
          label: 'Imposto de Renda (6%)',
          sublabel: `Sobre faturamento de ${formatCurrency(fat)}`,
          date: monthKey + '-01',
          value: fat * IR_RATE,
        });
      }

      if (items.length > 0) monthDetails[monthIdx] = items;
    }

    return monthDetails;
  }, [gastosViagemDetailByMonth, manutencaoDetailByMonth, allMonthlyGeneralCosts, monthlyData, selectedYear]);

  const CLICKABLE_ROWS = ['faturamento', 'gastos_viagem', 'manutencao', 'gastos_totais'];

  const getDetailForRow = (rowKey: string, monthIdx: number): DetailEntry[] => {
    switch (rowKey) {
      case 'faturamento': return faturamentoDetailByMonth[monthIdx] || [];
      case 'gastos_viagem': return gastosViagemDetailByMonth[monthIdx] || [];
      case 'manutencao': return manutencaoDetailByMonth[monthIdx] || [];
      case 'gastos_totais': return gastosTotaisDetailByMonth[monthIdx] || [];
      default: return [];
    }
  };

  const getDetailTitle = (rowKey: string): string => {
    switch (rowKey) {
      case 'faturamento': return 'Detalhamento Faturamento';
      case 'gastos_viagem': return 'Detalhamento Gastos Viagens';
      case 'manutencao': return 'Detalhamento Manut. e Invest.';
      case 'gastos_totais': return 'Detalhamento Gastos Totais';
      default: return 'Detalhamento';
    }
  };

  const handleCellClick = (rowKey: string, monthIdx: number, e: React.MouseEvent) => {
    if (CLICKABLE_ROWS.includes(rowKey)) {
      e.stopPropagation();
      setDetailRowKey(rowKey);
      setDetailMonth(monthIdx);
    }
  };

  const detailEntries = detailMonth !== null && detailRowKey ? getDetailForRow(detailRowKey, detailMonth) : [];
  const detailMonthName = detailMonth !== null ? MONTHS[detailMonth] : '';
  const detailTotal = detailEntries.reduce((sum, e) => sum + e.value, 0);
  const detailTitle = detailRowKey ? getDetailTitle(detailRowKey) : '';

  return (
    <>
    {/* Detail Modal */}
    <Dialog open={detailMonth !== null} onOpenChange={(open) => { if (!open) setDetailMonth(null); }}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base capitalize">
            {detailTitle} — {detailMonthName} {selectedYear}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm font-semibold mb-2 text-right">
          Total: {formatCurrency(detailTotal)}
        </div>
        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-1">
            {detailEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento neste mês</p>
            )}
            {detailEntries
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((entry, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded border bg-card text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{entry.label}</div>
                  {entry.sublabel && <div className="text-xs text-muted-foreground truncate">{entry.sublabel}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}{entry.method ? ` · ${entry.method}` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("font-semibold", detailRowKey === 'faturamento' ? 'text-emerald-700' : 'text-destructive')}>{formatCurrency(entry.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <div className="w-full overflow-hidden rounded-lg shadow-xl relative" style={{ backgroundColor: '#1E0033', border: '2px solid rgba(255,255,255,0.3)' }}>
      <IndicatorChartModal
        open={chartDialogOpen}
        onOpenChange={setChartDialogOpen}
        title={selectedRow?.label || ''}
        year={selectedYear}
        data={chartData}
        format={selectedRow?.type || 'currency'}
        color={getRowStyle(selectedIndicator || '').backgroundColor}
        indicatorKey={selectedIndicator || 'faturamento'}
      />

      <div className="overflow-x-auto">
        <div className="w-full min-w-[1200px]">
          {/* Header */}
          <div 
            className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] font-bold sticky top-0 z-10 h-8"
            style={{ backgroundColor: '#820AD1', color: '#FFFFFF' }}
          >
            <div className="flex items-center justify-center border-r border-white/30 text-center px-1">
              BALANÇO {selectedYear}
            </div>
            <div className="flex items-center justify-center border-r border-white/30 text-center px-1" style={{ backgroundColor: '#F2F2F2', color: '#000000' }}>
              TOTAL
            </div>
            {MONTH_ABBR.map((month, i) => (
              <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1">
                {month}
              </div>
            ))}
            <div className="flex items-center justify-center border-r border-white/30 text-center leading-tight px-1" style={{ backgroundColor: '#E0E0E0', color: '#000000' }}>
              MÉDIA
            </div>
            <div className="flex items-center justify-center text-center leading-tight px-1" style={{ backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
              PREVISÃO
            </div>
          </div>

          {/* Body */}
          <div>
            {rows.map((row) => {
              const rowStyle = getRowStyle(row.key);
              const totalValue = getRowTotal(row);
              const mediaValue = getRowMedia(row);
              const previsaoValue = getRowPrevisao(row);
              
              return (
                <div 
                  key={row.key} 
                  className={cn(
                    "grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] h-7",
                    row.chartable && 'cursor-pointer hover:opacity-80 transition-opacity'
                  )}
                  style={{ 
                    backgroundColor: rowStyle.backgroundColor,
                    borderBottom: '1px solid rgba(255,255,255,0.2)'
                  }}
                  onClick={() => handleRowClick(row)}
                  title={row.chartable ? 'Clique para ver gráfico' : undefined}
                >
                  {/* Label */}
                  <div 
                    className="flex items-center px-2 font-medium border-r border-white/30 truncate"
                    style={{ color: '#FFFFFF' }}
                    title={row.label}
                  >
                    {row.chartable && <span className="mr-1 text-[9px]">📊</span>}
                    <span className="truncate">{row.label}</span>
                  </div>
                  
                  {/* Total */}
                  <div 
                    className="flex items-center justify-center font-semibold border-r border-white/30 text-center px-1"
                    style={{ 
                      backgroundColor: '#F2F2F2',
                      color: isNegative(totalValue) ? '#DC2626' : '#000000'
                    }}
                  >
                    {formatValue(totalValue, row.type)}
                  </div>
                  
                  {/* Monthly values */}
                  {monthlyData.map((data, monthIdx) => {
                    const value = row.getValue(data, totals);
                    const isClickable = CLICKABLE_ROWS.includes(row.key) && value !== 0;
                    return (
                      <div 
                        key={monthIdx} 
                        className={cn(
                          "flex items-center justify-center border-r border-white/30 text-center px-1",
                          isClickable && "cursor-pointer underline decoration-dotted hover:opacity-70"
                        )}
                        style={{ 
                          color: isNegative(value) ? '#FF6B6B' : '#FFFFFF'
                        }}
                        onClick={isClickable ? (e) => handleCellClick(row.key, monthIdx, e) : undefined}
                        title={isClickable ? 'Clique para ver detalhes' : undefined}
                      >
                        {formatValue(value, row.type)}
                      </div>
                    );
                  })}
                  
                  {/* Average */}
                  <div 
                    className="flex items-center justify-center font-medium border-r border-white/30 text-center px-1"
                    style={{ 
                      backgroundColor: '#E0E0E0',
                      color: isNegative(mediaValue) ? '#DC2626' : '#000000'
                    }}
                  >
                    {formatValue(mediaValue, row.type)}
                  </div>
                  
                  {/* Projection */}
                  <div 
                    className="flex items-center justify-center font-medium text-center px-1"
                    style={{ 
                      backgroundColor: '#3A3A3A',
                      color: isNegative(previsaoValue) ? '#FF6B6B' : '#FFFFFF'
                    }}
                  >
                    {formatValue(previsaoValue, row.type)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Caixa Acumulado Section */}
      <div className="mt-1">
        <div className="overflow-x-auto">
          <div className="w-full min-w-[1200px]">
            {/* Caixa Header */}
            <div 
              className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] font-bold h-8"
              style={{ backgroundColor: '#0D47A1', color: '#FFFFFF', borderTop: '2px solid rgba(255,255,255,0.4)' }}
            >
              <div className="flex items-center justify-center border-r border-white/30 text-center px-1">
                💰 CAIXA
              </div>
              <div className="flex items-center justify-center border-r border-white/30 text-center px-1" style={{ backgroundColor: '#F2F2F2', color: '#000000' }}>
                TOTAL
              </div>
              {MONTH_ABBR.map((month, i) => (
                <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1">
                  {month}
                </div>
              ))}
              <div className="flex items-center justify-center border-r border-white/30 text-center px-1" style={{ backgroundColor: '#E0E0E0', color: '#000000' }}>
                MÉDIA
              </div>
              <div className="flex items-center justify-center text-center px-1" style={{ backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
                PREVISÃO
              </div>
            </div>

            {/* Entradas */}
            <div 
              className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] h-7"
              style={{ backgroundColor: '#1B5E20', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex items-center px-2 font-medium border-r border-white/30 text-white">Entradas</div>
              <div className="flex items-center justify-center font-semibold border-r border-white/30 px-1" style={{ backgroundColor: '#F2F2F2', color: '#000000' }}>
                {formatCurrency(totals.faturamento)}
              </div>
              {monthlyData.map((d, i) => (
                <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1 text-white">
                  {formatCurrency(d.faturamento)}
                </div>
              ))}
              <div className="flex items-center justify-center font-medium border-r border-white/30 px-1" style={{ backgroundColor: '#E0E0E0', color: '#000000' }}>
                {formatCurrency(mediaData.faturamento)}
              </div>
              <div className="flex items-center justify-center font-medium px-1" style={{ backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
                {formatCurrency(previsaoData.faturamento)}
              </div>
            </div>

            {/* Saídas */}
            <div 
              className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] h-7"
              style={{ backgroundColor: '#B71C1C', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex items-center px-2 font-medium border-r border-white/30 text-white">Saídas</div>
              <div className="flex items-center justify-center font-semibold border-r border-white/30 px-1" style={{ backgroundColor: '#F2F2F2', color: '#DC2626' }}>
                {formatCurrency(totals.gastosTotais)}
              </div>
              {monthlyData.map((d, i) => (
                <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1 text-white">
                  {formatCurrency(d.gastosTotais)}
                </div>
              ))}
              <div className="flex items-center justify-center font-medium border-r border-white/30 px-1" style={{ backgroundColor: '#E0E0E0', color: '#DC2626' }}>
                {formatCurrency(mediaData.gastosTotais)}
              </div>
              <div className="flex items-center justify-center font-medium px-1" style={{ backgroundColor: '#3A3A3A', color: '#FF6B6B' }}>
                {formatCurrency(previsaoData.gastosTotais)}
              </div>
            </div>

            {/* Saldo do Mês */}
            <div 
              className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] h-7"
              style={{ backgroundColor: '#004D40', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex items-center px-2 font-medium border-r border-white/30 text-white">Saldo do Mês</div>
              <div className="flex items-center justify-center font-semibold border-r border-white/30 px-1" style={{ backgroundColor: '#F2F2F2', color: totals.saldoLiquido < 0 ? '#DC2626' : '#000000' }}>
                {formatCurrency(totals.saldoLiquido)}
              </div>
              {monthlyData.map((d, i) => (
                <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1" style={{ color: d.saldoLiquido < 0 ? '#FF6B6B' : '#FFFFFF' }}>
                  {formatCurrency(d.saldoLiquido)}
                </div>
              ))}
              <div className="flex items-center justify-center font-medium border-r border-white/30 px-1" style={{ backgroundColor: '#E0E0E0', color: mediaData.saldoLiquido < 0 ? '#DC2626' : '#000000' }}>
                {formatCurrency(mediaData.saldoLiquido)}
              </div>
              <div className="flex items-center justify-center font-medium px-1" style={{ backgroundColor: '#3A3A3A', color: previsaoData.saldoLiquido < 0 ? '#FF6B6B' : '#FFFFFF' }}>
                {formatCurrency(previsaoData.saldoLiquido)}
              </div>
            </div>

            {/* Caixa Acumulado */}
            {(() => {
              let acumulado = 0;
              const acumulados = monthlyData.map(d => {
                acumulado += d.saldoLiquido;
                return acumulado;
              });
              return (
                <div 
                  className="grid grid-cols-[140px_repeat(15,minmax(60px,1fr))] text-[10px] h-8 font-bold"
                  style={{ backgroundColor: '#0D47A1', borderTop: '2px solid rgba(255,255,255,0.4)' }}
                >
                  <div className="flex items-center px-2 border-r border-white/30 text-white">
                    💰 Caixa Acumulado
                  </div>
                  <div className="flex items-center justify-center font-bold border-r border-white/30 px-1" style={{ backgroundColor: '#F2F2F2', color: acumulados[11] < 0 ? '#DC2626' : '#000000' }}>
                    {formatCurrency(acumulados[11] || 0)}
                  </div>
                  {acumulados.map((val, i) => (
                    <div key={i} className="flex items-center justify-center border-r border-white/30 text-center px-1" style={{ color: val < 0 ? '#FF6B6B' : '#4ADE80' }}>
                      {formatCurrency(val)}
                    </div>
                  ))}
                  <div className="flex items-center justify-center font-medium border-r border-white/30 px-1" style={{ backgroundColor: '#E0E0E0', color: '#000000' }}>
                    -
                  </div>
                  <div className="flex items-center justify-center font-medium px-1" style={{ backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
                    -
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Análise Gráfica Section */}
      {showAnaliseGrafica && (
        <BalancoAnaliseGrafica
          tours={tours}
          reservations={filteredReservations}
          allTourCosts={allTourCosts}
          allMonthlyGeneralCosts={allMonthlyGeneralCosts}
          selectedYear={selectedYear}
        />
      )}
    </div>
    </>
  );
};

export default BalancoAnual;
