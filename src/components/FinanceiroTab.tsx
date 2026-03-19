import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Users, Percent, Wallet, Building2, Briefcase, Calculator, ChevronLeft, ChevronRight, Lock, Calendar, BarChart3, LayoutDashboard, Brain, Link2, PieChart as PieChartIcon, Receipt, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import BalancoAnual from './BalancoAnual';
import BalancoAnaliseGrafica from './BalancoAnaliseGrafica';
import FinanceiroDashboard from './FinanceiroDashboard';
import FinanceiroAnaliseInteligente from './FinanceiroAnaliseInteligente';
import FinanceiroHistorico from './FinanceiroHistorico';
import FinanceiroDiario from './FinanceiroDiario';
import FinanceiroComparacao from './FinanceiroComparacao';
import RecurringCostsManager, { type RecurringCost } from './RecurringCostsManager';
import CostPaymentDetailsModal from './CostPaymentDetailsModal';

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
interface TourCost {
  id: string;
  tour_id: string;
  product_service: string;
  quantity: number;
  unit_value: number;
  order_index: number;
  valor_pago: number;
  expense_type: string;
  auto_scale_participants: boolean;
  auto_scale_optional_item_id?: string | null;
  auto_scale_pricing_option_id?: string | null;
}

interface TourOptionalItem {
  id: string;
  name: string;
  price: number;
}

interface TourPricingOption {
  id: string;
  option_name: string;
  pix_price: number;
  card_price: number;
}

interface ParticipantData {
  id: string;
  reserva_id: string;
  pricing_option_id: string | null;
  pricing_option_name: string | null;
  selected_optionals: any[] | null;
}

const EXPENSE_TYPES = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'equipe', label: 'Equipe' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'gratificacao', label: 'Gratificação' },
  { value: 'trafego_pago', label: 'Tráfego Pago' },
  { value: 'servico_bordo', label: 'Serviço de Bordo' },
  { value: 'taxas_entradas', label: 'Taxas e Entradas' },
  { value: 'outros', label: 'Outros' },
];
interface MonthlyGeneralCost {
  id: string;
  month: string;
  year: number;
  expense_name: string;
  quantity: number;
  unit_value: number;
  expense_type: string;
  order_index: number;
  // Installment fields
  payment_method?: string;
  total_installments?: number;
  current_installment?: number;
  total_value?: number;
  parent_expense_id?: string;
  purchase_date?: string;
}
interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
  payment_method: string | null;
  cliente_id: string;
  capture_method?: string | null;
  // manter como "presente sempre" (pode ser null) para evitar conflito de tipos entre componentes
  numero_participantes: number | null;
  refund_amount?: number | null;
  card_fee_amount?: number | null;
  // Legacy + novo formato de opcionais
  adicionais?: any[] | null;
  selected_optional_items?: any[] | null;
}
interface FinanceiroTabProps {
  tours: Tour[];
  viewMode?: string;
}
const IR_RATE = 0.06; // 6%
// Password validation done server-side via site_settings

// Editable input that doesn't lose focus
const EditableInput = ({
  value,
  onChange,
  type = "text",
  step,
  className
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  className?: string;
}) => {
  const [localValue, setLocalValue] = useState(String(value));
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);
  return <Input type={type} step={step} value={localValue} onChange={e => setLocalValue(e.target.value)} onBlur={() => onChange(localValue)} className={className} />;
};

// Password protection component - validates against server-side stored hash
const PasswordGate = ({
  onUnlock
}: {
  onUnlock: () => void;
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    try {
      // Server-side validation via RPC function
      const { data, error: rpcError } = await supabase.rpc('validate_financeiro_password' as any, {
        input_password: password
      });
      
      if (rpcError) {
        console.error('Password validation error:', rpcError);
        setError(true);
        setPassword('');
      } else if (data === true) {
        onUnlock();
      } else {
        setError(true);
        setPassword('');
      }
    } catch (err) {
      console.error('Password validation error:', err);
      setError(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };
  
  return <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Acesso Restrito</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Digite a senha para acessar o módulo financeiro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input type="password" placeholder="Senha" value={password} onChange={e => {
              setPassword(e.target.value);
              setError(false);
            }} className={cn("text-center text-lg tracking-widest", error && "border-red-500 focus-visible:ring-red-500")} autoFocus disabled={loading} />
              {error && <p className="text-sm text-red-500 mt-2 text-center">
                  Senha incorreta. Tente novamente.
                </p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verificando...' : 'Acessar Financeiro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
};
const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  tours,
  viewMode: propViewMode = 'passeio'
}) => {
  const {
    toast
  } = useToast();
  const [isUnlocked, setIsUnlocked] = useState(false);
  // Map prop viewMode to internal viewMode format
  const viewMode: 'dashboard' | 'passeio' | 'mensal' | 'balanco' | 'grafica' | 'analise' | 'diario' | 'comparacao' | 'historico' = 
    propViewMode === 'passeio' ? 'passeio' :
    propViewMode === 'mensal' ? 'mensal' :
    propViewMode === 'balanco' ? 'balanco' :
    propViewMode === 'dashboard' ? 'dashboard' :
    propViewMode === 'analise' ? 'analise' :
    propViewMode === 'diario' ? 'diario' :
    propViewMode === 'grafica' ? 'grafica' :
    propViewMode === 'comparacao' ? 'comparacao' :
    propViewMode === 'historico' ? 'historico' : 'passeio';
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [allMonthlyGeneralCosts, setAllMonthlyGeneralCosts] = useState<MonthlyGeneralCost[]>([]);
  const [recurringCosts, setRecurringCosts] = useState<RecurringCost[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [tourCosts, setTourCosts] = useState<TourCost[]>([]);
  const [allTourCosts, setAllTourCosts] = useState<TourCost[]>([]);
  const [monthlyGeneralCosts, setMonthlyGeneralCosts] = useState<MonthlyGeneralCost[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome_completo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // States for optional items and pricing options auto-scaling
  const [tourOptionalItems, setTourOptionalItems] = useState<TourOptionalItem[]>([]);
  const [tourPricingOptions, setTourPricingOptions] = useState<TourPricingOption[]>([]);
  const [tourParticipants, setTourParticipants] = useState<ParticipantData[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantData[]>([]);
  const [allCostPayments, setAllCostPayments] = useState<{ id: string; tour_cost_id: string; amount: number; payment_date: string | null }[]>([]);
  const [allParcelas, setAllParcelas] = useState<{ reserva_id: string; valor: number; data_pagamento: string; forma_pagamento: string }[]>([]);

  // Cost toggle state for simulation
  const [costToggles, setCostToggles] = useState({
    gastosViagem: true,
    custosVariados: true,
    custosFixos: true,
    proLabore: true,
    impostoRenda: true,
  });

  // Get ALL tours sorted by date (descending - newest first), grouped by year/month
  const allToursSorted = useMemo(() => {
    return [...tours].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [tours]);

  // Group tours by year and month for the selector
  const toursByYearMonth = useMemo(() => {
    const grouped: Record<string, {
      year: number;
      month: string;
      tours: Tour[];
    }> = {};
    allToursSorted.forEach(tour => {
      const date = new Date(tour.start_date);
      const key = format(date, 'yyyy-MM');
      const year = date.getFullYear();
      const monthLabel = format(date, 'MMMM', {
        locale: ptBR
      });
      if (!grouped[key]) {
        grouped[key] = {
          year,
          month: monthLabel,
          tours: []
        };
      }
      grouped[key].tours.push(tour);
    });
    return grouped;
  }, [allToursSorted]);

  // Generate month options (last 24 months + next 12)
  const monthOptions = useMemo(() => {
    const options: {
      value: string;
      label: string;
    }[] = [];
    const now = new Date();
    for (let i = -24; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', {
          locale: ptBR
        })
      });
    }
    return options;
  }, []);

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const newDate = subMonths(date, 1);
    setSelectedMonth(format(newDate, 'yyyy-MM'));
  }, [selectedMonth]);
  const goToNextMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const newDate = addMonths(date, 1);
    setSelectedMonth(format(newDate, 'yyyy-MM'));
  }, [selectedMonth]);

  // Helper to check if reservation is confirmed (handles both 'confirmada' and 'confirmado')
  const isConfirmed = useCallback((status: string) => {
    return status === 'confirmada' || status === 'confirmado';
  }, []);

  // Shared helper: check if payment method is card
  const isCardPaymentMethod = useCallback((method?: string | null) => {
    const m = (method || '').toLowerCase();
    return m === 'credit_card' || m === 'cartao' || m === 'card';
  }, []);

  // Calcula o valor total real de uma reserva (incluindo opcionais por participante)
  // Mesma lógica do calcularValorTotal em ParticipantsTable
  const calcValorTotalReserva = useCallback((r: Reservation, participantsData: ParticipantData[]) => {
    const valorBase = r.valor_passeio || 0;
    
    // Legacy adicionais
    const adicionaisTotal = Array.isArray(r.adicionais)
      ? (r.adicionais as any[]).reduce((addSum, add) => addSum + (add?.valor || 0), 0)
      : 0;
    
    // Opcionais por participante (prioridade se existir)
    const reservaParticipants = participantsData.filter(p => p.reserva_id === r.id);
    const hasParticipantOptionals = reservaParticipants.some(
      p => Array.isArray(p.selected_optionals) && (p.selected_optionals as any[]).length > 0
    );
    
    let opcionaisTotal = 0;
    if (hasParticipantOptionals) {
      opcionaisTotal = reservaParticipants.reduce((sum, p) => {
        if (!Array.isArray(p.selected_optionals)) return sum;
        return sum + (p.selected_optionals as any[]).reduce((s, opt) => {
          const price = Number(opt?.price ?? opt?.valor ?? 0);
          const qty = Number(opt?.quantity ?? opt?.quantidade ?? 1) || 1;
          return s + price * qty;
        }, 0);
      }, 0);
    } else {
      // Fallback: opcionais no nível da reserva
      opcionaisTotal = Array.isArray(r.selected_optional_items) 
        ? (r.selected_optional_items as any[]).reduce((optSum, opt) => optSum + ((opt?.price || 0) * (opt?.quantity || 1)), 0)
        : 0;
    }
    
    return valorBase + adicionaisTotal + opcionaisTotal;
  }, []);

  // Shared helper: calculate faturamento base (valor pago sem taxas, ou valor esperado se não pagou)
  const calcFaturamentoBase = useCallback((tourReservations: Reservation[], participantsData: ParticipantData[] = []) => {
    return tourReservations.reduce((sum, r) => {
      const rawPago = r.valor_pago || 0;
      const valorTotalReserva = calcValorTotalReserva(r, participantsData);
      
      // Se não pagou nada, usar valor esperado
      if (rawPago === 0) return sum + valorTotalReserva;
      
      // Se pagou, usar valor pago (descontando taxa de cartão)
      let pagoBase = rawPago;
      if (isCardPaymentMethod(r.payment_method)) {
        const cardFee = r.card_fee_amount || 0;
        if (cardFee > 0) {
          pagoBase = Math.max(0, rawPago - cardFee);
        } else {
          // Sem taxa registrada: valor_pago inclui juros de parcelamento, usar valor real
          pagoBase = valorTotalReserva;
        }
      }
      return sum + pagoBase;
    }, 0);
  }, [isCardPaymentMethod, calcValorTotalReserva]);

  // All useCallback hooks must be before any conditional returns
  const updateTourCost = useCallback(async (id: string, field: string, value: any) => {
    try {
      const {
        error
      } = await supabase.from('tour_costs').update({
        [field]: value
      }).eq('id', id);
      if (error) throw error;
      setTourCosts(prev => prev.map(c => c.id === id ? {
        ...c,
        [field]: value
      } : c));
      setAllTourCosts(prev => prev.map(c => c.id === id ? {
        ...c,
        [field]: value
      } : c));
    } catch (error) {
      console.error('Error updating tour cost:', error);
    }
  }, []);
  const updateMonthlyGeneralCost = useCallback(async (id: string, field: string, value: any) => {
    try {
      const {
        error
      } = await supabase.from('monthly_general_costs').update({
        [field]: value
      }).eq('id', id);
      if (error) throw error;
      setMonthlyGeneralCosts(prev => prev.map(c => c.id === id ? {
        ...c,
        [field]: value
      } : c));
    } catch (error) {
      console.error('Error updating monthly cost:', error);
    }
  }, []);

  // Fetch data
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
    if (!isUnlocked) return;
    fetchReservations();
    fetchAllTourCosts();
    fetchAllMonthlyGeneralCosts();
    fetchClientes();
    fetchRecurringCosts();
    fetchAllParticipants();
    fetchAllCostPayments();
    fetchAllParcelas();
  }, [isUnlocked]);
  useEffect(() => {
    if (!isUnlocked) return;
    if (selectedTourId) {
      fetchTourCosts(selectedTourId);
      fetchTourOptionalItems(selectedTourId);
      fetchTourPricingOptions(selectedTourId);
      fetchTourParticipants(selectedTourId);
    }
  }, [selectedTourId, isUnlocked]);
  useEffect(() => {
    if (!isUnlocked) return;
    fetchMonthlyGeneralCosts(selectedMonth);
  }, [selectedMonth, isUnlocked]);

  // Password gate - MUST be after all hooks
  if (!isUnlocked) {
    return <PasswordGate onUnlock={() => setIsUnlocked(true)} />;
  }
  const fetchReservations = async () => {
    try {
      const {
        data,
        error
      } = await supabase
        .from('reservas')
        .select('id, tour_id, status, payment_status, valor_pago, valor_passeio, valor_total_com_opcionais, data_pagamento, payment_method, cliente_id, capture_method, numero_participantes, refund_amount, card_fee_amount, adicionais, selected_optional_items');
      if (error) throw error;
      setReservations((data || []) as Reservation[]);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };
  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from('clientes').select('id, nome_completo');
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };
  const fetchTourCosts = async (tourId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('tour_costs').select('*').eq('tour_id', tourId).order('order_index');
      if (error) throw error;
      setTourCosts(data || []);
    } catch (error) {
      console.error('Error fetching tour costs:', error);
    }
  };
  
  // Fetch tour optional items for the selected tour
  const fetchTourOptionalItems = async (tourId: string) => {
    try {
      const { data, error } = await supabase
        .from('tour_optional_items')
        .select('id, name, price')
        .eq('tour_id', tourId)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      setTourOptionalItems(data || []);
    } catch (error) {
      console.error('Error fetching tour optional items:', error);
    }
  };
  
  // Fetch tour pricing options for the selected tour
  const fetchTourPricingOptions = async (tourId: string) => {
    try {
      const { data, error } = await supabase
        .from('tour_pricing_options')
        .select('id, option_name, pix_price, card_price')
        .eq('tour_id', tourId);
      if (error) throw error;
      setTourPricingOptions(data || []);
    } catch (error) {
      console.error('Error fetching tour pricing options:', error);
    }
  };
  
  // Fetch participants for the selected tour (to count optionals and packages)
  const fetchTourParticipants = async (tourId: string) => {
    try {
      // Get all reservas for this tour that are confirmed
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('id')
        .eq('tour_id', tourId)
        .in('status', ['confirmada', 'confirmado']);
      if (reservasError) throw reservasError;
      
      if (!reservasData || reservasData.length === 0) {
        setTourParticipants([]);
        return;
      }
      
      const reservaIds = reservasData.map(r => r.id);
      
      // Get all participants for these reservas
      const { data, error } = await supabase
        .from('reservation_participants')
        .select('id, reserva_id, pricing_option_id, pricing_option_name, selected_optionals')
        .in('reserva_id', reservaIds);
      if (error) throw error;
      setTourParticipants((data || []).map(p => ({
        ...p,
        selected_optionals: Array.isArray(p.selected_optionals) ? p.selected_optionals : null
      })));
    } catch (error) {
      console.error('Error fetching tour participants:', error);
    }
  };
  const fetchAllTourCosts = async () => {
    try {
      const { data, error } = await supabase.from('tour_costs').select('*').order('order_index');
      if (error) throw error;
      setAllTourCosts(data || []);
    } catch (error) {
      console.error('Error fetching all tour costs:', error);
    }
  };
  const fetchAllCostPayments = async () => {
    try {
      const { data, error } = await supabase.from('tour_cost_payments').select('id, tour_cost_id, amount, payment_date');
      if (error) throw error;
      setAllCostPayments(data || []);
    } catch (error) {
      console.error('Error fetching cost payments:', error);
    }
  };
  const fetchAllParcelas = async () => {
    try {
      const { data, error } = await supabase.from('reserva_parcelas').select('reserva_id, valor, data_pagamento, forma_pagamento');
      if (error) throw error;
      setAllParcelas(data || []);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  const fetchAllParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('reservation_participants')
        .select('id, reserva_id, pricing_option_id, pricing_option_name, selected_optionals');
      if (error) throw error;
      setAllParticipants((data || []).map(p => ({
        ...p,
        selected_optionals: Array.isArray(p.selected_optionals) ? p.selected_optionals : null
      })));
    } catch (error) {
      console.error('Error fetching all participants:', error);
    }
  };
  const fetchMonthlyGeneralCosts = async (month: string) => {
    try {
      const [year, monthNum] = month.split('-');
      const {
        data,
        error
      } = await supabase.from('monthly_general_costs').select('*').eq('month', month).eq('year', parseInt(year)).order('order_index');
      if (error) throw error;
      setMonthlyGeneralCosts((data || []).map(d => ({
        ...d,
        expense_type: d.expense_type as 'manutencao' | 'pro_labore' | 'outros'
      })));
    } catch (error) {
      console.error('Error fetching monthly costs:', error);
    }
  };
  const fetchAllMonthlyGeneralCosts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('monthly_general_costs').select('*').order('year', {
        ascending: true
      }).order('month', {
        ascending: true
      });
      if (error) throw error;
      setAllMonthlyGeneralCosts((data || []).map(d => ({
        ...d,
        expense_type: d.expense_type as 'manutencao' | 'pro_labore' | 'outros'
      })));
    } catch (error) {
      console.error('Error fetching all monthly costs:', error);
    }
  };
  const fetchRecurringCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_costs')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setRecurringCosts((data || []) as RecurringCost[]);
    } catch (error) {
      console.error('Error fetching recurring costs:', error);
    }
  };

  // Tour costs CRUD
  const addTourCost = async () => {
    if (!selectedTourId) return;
    try {
      const newIndex = tourCosts.length;
      const {
        error
      } = await supabase.from('tour_costs').insert({
        tour_id: selectedTourId,
        product_service: 'Novo item',
        quantity: 1,
        unit_value: 0,
        order_index: newIndex
      });
      if (error) throw error;
      fetchTourCosts(selectedTourId);
      fetchAllTourCosts();
    } catch (error) {
      console.error('Error adding tour cost:', error);
      toast({
        title: "Erro ao adicionar custo",
        variant: "destructive"
      });
    }
  };
  const deleteTourCost = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('tour_costs').delete().eq('id', id);
      if (error) throw error;
      setTourCosts(prev => prev.filter(c => c.id !== id));
      setAllTourCosts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting tour cost:', error);
    }
  };

  // Monthly general costs CRUD
  const addMonthlyGeneralCost = async (expenseType: 'manutencao' | 'pro_labore' | 'outros' = 'outros', defaultName?: string, defaultValue?: number) => {
    try {
      const [year, monthNum] = selectedMonth.split('-');
      const newIndex = monthlyGeneralCosts.length;
      const {
        error
      } = await supabase.from('monthly_general_costs').insert({
        month: selectedMonth,
        year: parseInt(year),
        expense_name: defaultName || 'Nova despesa',
        quantity: 1,
        unit_value: defaultValue || 0,
        expense_type: expenseType,
        order_index: newIndex
      });
      if (error) throw error;
      fetchMonthlyGeneralCosts(selectedMonth);
      toast({
        title: expenseType === 'pro_labore' ? "Pró-labore adicionado" : "Despesa adicionada"
      });
    } catch (error) {
      console.error('Error adding monthly cost:', error);
      toast({
        title: "Erro ao adicionar despesa",
        variant: "destructive"
      });
    }
  };

  // Add pro-labore with default value
  const addProLabore = async () => {
    const existingProLabore = monthlyGeneralCosts.find(c => c.expense_type === 'pro_labore');
    if (existingProLabore) {
      toast({
        title: "Pró-labore já existe",
        description: "Edite o valor existente na tabela abaixo.",
        variant: "destructive"
      });
      return;
    }
    await addMonthlyGeneralCost('pro_labore', 'Pró-Labore', 3243);
  };

  // Repeat pro-labore for remaining months until end of year
  const repeatProLaboreToEndOfYear = async () => {
    const proLaboreEntry = monthlyGeneralCosts.find(c => c.expense_type === 'pro_labore');
    if (!proLaboreEntry) return;
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const currentMonth = parseInt(monthStr);
    const value = proLaboreEntry.unit_value;
    
    let addedCount = 0;
    for (let m = currentMonth + 1; m <= 12; m++) {
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      
      // Check if pro-labore already exists for that month
      const existing = allMonthlyGeneralCosts.find(
        c => c.expense_type === 'pro_labore' && c.month === monthKey
      );
      if (existing) continue;
      
      const { error } = await supabase.from('monthly_general_costs').insert({
        month: monthKey,
        year,
        expense_name: 'Pró-Labore',
        quantity: 1,
        unit_value: value,
        expense_type: 'pro_labore',
        order_index: 0
      });
      if (error) {
        console.error('Error adding pro-labore for month', monthKey, error);
      } else {
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      toast({ title: `Pró-labore replicado para ${addedCount} meses restantes` });
      fetchAllMonthlyGeneralCosts();
    } else {
      toast({ title: 'Pró-labore já existe em todos os meses restantes', variant: 'destructive' });
    }
  };
  const deleteMonthlyGeneralCost = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('monthly_general_costs').delete().eq('id', id);
      if (error) throw error;
      setMonthlyGeneralCosts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting monthly cost:', error);
    }
  };

  // Calculate tour financials
  // Note: This function should only be called for the selectedTourId
  // since tourCosts and tourParticipants are loaded specifically for that tour
  const calculateTourFinancials = (tourId: string) => {
    const tourReservations = reservations.filter(r => r.tour_id === tourId && isConfirmed(r.status));
    // Use tourCosts directly since it's already filtered by selectedTourId in fetchTourCosts
    const tourCostsFiltered = tourCosts;
    const numClientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0) || 1;
    
    // Calculate valor total (faturamento esperado) e recebidos
    // - valorRecebidoTotal: soma de tudo que foi pago (valor_pago)
    // - valorRecebidoBase: valor pago sem juros/taxa de cartão (igual ao "Valor Pago" em Passeios)
    // - valorEmAberto: igual ao "Em Aberto" em Passeios (valorTotal - valorPagoBase)
    let faturamento = 0;
    let valorRecebidoTotal = 0;
    let valorRecebidoBase = 0;
    let valorEmAbertoRaw = 0;

    const isCardPaymentMethod = (method?: string | null) => {
      const m = (method || '').toLowerCase();
      return m === 'credit_card' || m === 'cartao' || m === 'card';
    };

    tourReservations.forEach(r => {
      const valorTotalReserva = calcValorTotalReserva(r, tourParticipants);

      const rawPago = r.valor_pago || 0;
      valorRecebidoTotal += rawPago;

      // Calcular valor pago base (sem taxa de cartão)
      let pagoBase = rawPago;
      if (isCardPaymentMethod(r.payment_method) && rawPago > 0) {
        const cardFee = r.card_fee_amount || 0;
        if (cardFee > 0) {
          pagoBase = Math.max(0, rawPago - cardFee);
        } else {
          pagoBase = valorTotalReserva;
        }
      }

      // Faturamento = valor pago sem taxas (ou valor esperado se não pagou)
      if (rawPago === 0) {
        faturamento += valorTotalReserva;
      } else {
        faturamento += pagoBase;
      }

      valorRecebidoBase += pagoBase;
      valorEmAbertoRaw += (valorTotalReserva - pagoBase);
    });

    const valorEmAberto = Math.max(0, valorEmAbertoRaw);
    
    // Helper to count optionals and pricing options
    const getOptionalItemCountForCalc = (optionalItemId: string): number => {
      let count = 0;
      tourParticipants.forEach(participant => {
        if (participant.selected_optionals && Array.isArray(participant.selected_optionals)) {
          const hasOptional = participant.selected_optionals.some((opt: any) => 
            opt.id === optionalItemId || opt.optional_id === optionalItemId
          );
          if (hasOptional) count++;
        }
      });
      tourReservations.forEach(reserva => {
        const items = reserva.selected_optional_items || [];
        if (Array.isArray(items)) {
          items.forEach((opt: any) => {
            if (opt.id === optionalItemId) {
              count += opt.quantity || 1;
            }
          });
        }
      });
      return count || 0;
    };
    
    const getPricingOptionCountForCalc = (pricingOptionId: string): number => {
      return tourParticipants.filter(p => p.pricing_option_id === pricingOptionId).length;
    };
    
    const gastosViagem = tourCostsFiltered.reduce((sum, c) => {
      let effectiveQty = c.quantity;
      if (c.auto_scale_optional_item_id) {
        effectiveQty = getOptionalItemCountForCalc(c.auto_scale_optional_item_id);
      } else if (c.auto_scale_pricing_option_id) {
        effectiveQty = getPricingOptionCountForCalc(c.auto_scale_pricing_option_id);
      } else if (c.auto_scale_participants) {
        effectiveQty = numClientes;
      }
      return sum + effectiveQty * c.unit_value;
    }, 0);
    
    // Cálculos baseados no valor RECEBIDO (atual) — usar BASE (sem juros/taxa)
    const lucroBrutoAtual = valorRecebidoBase - gastosViagem;
    const impostoRendaAtual = valorRecebidoBase * IR_RATE;
    const gastosTotaisAtual = gastosViagem + impostoRendaAtual;
    const lucroLiquidoAtual = valorRecebidoBase - gastosTotaisAtual;

    // Cálculos baseados no FATURAMENTO TOTAL (projetado, incluindo em aberto)
    const lucroBrutoProjetado = faturamento - gastosViagem;
    const impostoRendaProjetado = faturamento * IR_RATE;
    const gastosTotaisProjetado = gastosViagem + impostoRendaProjetado;
    const lucroLiquidoProjetado = faturamento - gastosTotaisProjetado;

    const clientCount = numClientes;
    return {
      faturamento,
      valorRecebidoTotal,
      valorRecebidoBase,
      valorEmAberto,
      gastosViagem,
      // Valores atuais (baseados no que foi recebido)
      lucroBruto: lucroBrutoAtual,
      impostoRenda: impostoRendaAtual,
      gastosTotais: gastosTotaisAtual,
      lucroLiquido: lucroLiquidoAtual,
      // Valores projetados (incluindo em aberto)
      lucroBrutoProjetado,
      impostoRendaProjetado,
      gastosTotaisProjetado,
      lucroLiquidoProjetado,
      numClientes: clientCount,
      faturamentoPorCliente: clientCount > 0 ? valorRecebidoBase / clientCount : 0,
      lucroBrutoPorCliente: clientCount > 0 ? lucroBrutoAtual / clientCount : 0,
      lucroLiquidoPorCliente: clientCount > 0 ? lucroLiquidoAtual / clientCount : 0,
      gastosTotaisPorCliente: clientCount > 0 ? gastosTotaisAtual / clientCount : 0,
      gastosViagemPorCliente: clientCount > 0 ? gastosViagem / clientCount : 0
    };
  };

  // Calculate monthly financials
  const calculateMonthlyFinancials = () => {
    const [year, month] = selectedMonth.split('-');
    const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const monthEnd = endOfMonth(monthStart);
    const monthTours = tours.filter(t => {
      const tourDate = new Date(t.start_date);
      return tourDate >= monthStart && tourDate <= monthEnd;
    });
    
    // Build a map of cost_id -> payments for quick lookup
    const costPaymentsMap = new Map<string, { amount: number; payment_date: string | null }[]>();
    allCostPayments.forEach(cp => {
      const arr = costPaymentsMap.get(cp.tour_cost_id) || [];
      arr.push(cp);
      costPaymentsMap.set(cp.tour_cost_id, arr);
    });
    
    // Helper: calculate the effective total value of a cost (considering auto-scale)
    const calcCostTotalValue = (cost: TourCost, tourReservations: Reservation[], tourParticipantsForCalc: ParticipantData[]) => {
      let effectiveQty = cost.quantity;
      const numClientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0) || 1;
      
      if (cost.auto_scale_optional_item_id) {
        let count = 0;
        tourParticipantsForCalc.forEach(p => {
          if (p.selected_optionals && Array.isArray(p.selected_optionals)) {
            if (p.selected_optionals.some((opt: any) => opt.id === cost.auto_scale_optional_item_id || opt.optional_id === cost.auto_scale_optional_item_id)) count++;
          }
        });
        tourReservations.forEach(r => {
          (r.selected_optional_items || []).forEach((opt: any) => {
            if (opt.id === cost.auto_scale_optional_item_id) count += opt.quantity || 1;
          });
        });
        effectiveQty = count || 0;
      } else if (cost.auto_scale_pricing_option_id) {
        effectiveQty = tourParticipantsForCalc.filter(p => p.pricing_option_id === cost.auto_scale_pricing_option_id).length;
      } else if (cost.auto_scale_participants) {
        effectiveQty = numClientes;
      }
      return effectiveQty * cost.unit_value;
    };
    
    // Calculate tour costs allocated to this month by TOUR START DATE (operational cost)
    let gastosViagemMes = 0;
    const tourCostInMonth = new Map<string, number>();
    const gastosViagemDetails: { name: string; value: number; tourName: string }[] = [];
    
    const tourMap = new Map<string, typeof tours[0]>();
    tours.forEach(t => tourMap.set(t.id, t));
    
    allTourCosts.forEach(cost => {
      const tour = tourMap.get(cost.tour_id);
      if (!tour) return;
      
      // Allocate operational cost to the tour's start_date month
      const tourDate = new Date(tour.start_date + 'T12:00:00');
      if (tourDate >= monthStart && tourDate <= monthEnd) {
        const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
        const tourReservaIds = tourReservations.map(r => r.id);
        const tourParticipantsForCalc = allParticipants.filter(p => tourReservaIds.includes(p.reserva_id));
        const totalValue = calcCostTotalValue(cost, tourReservations, tourParticipantsForCalc);
        gastosViagemMes += totalValue;
        tourCostInMonth.set(cost.tour_id, (tourCostInMonth.get(cost.tour_id) || 0) + totalValue);
        if (totalValue > 0) gastosViagemDetails.push({ name: cost.product_service, value: totalValue, tourName: tour.name });
      }
    });
    
    // Helper: calcRealTourValue for cash-basis
    const calcRealTourValueLocal = (r: Reservation): number => {
      const baseValue = r.valor_passeio || 0;
      let optionalsTotal = 0;
      if (r.selected_optional_items && Array.isArray(r.selected_optional_items)) {
        optionalsTotal = (r.selected_optional_items as any[]).reduce((sum: number, opt: any) => {
          return sum + ((opt.price || 0) * (opt.quantity || 1));
        }, 0);
      }
      return baseValue + optionalsTotal;
    };

    const tourSummary = monthTours.map(tour => {
      const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
      const clientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
      const faturamento = calcFaturamentoBase(tourReservations, allParticipants);
      const despesas = tourCostInMonth.get(tour.id) || 0;
      const lucroBruto = faturamento - despesas;
      return {
        id: tour.id,
        destino: tour.name,
        data: tour.start_date,
        faturamento,
        despesas,
        lucroBruto,
        clientes
      };
    });
    
    // FATURAMENTO TOTAL: regime de caixa - soma das parcelas pagas no mês
    let faturamentoTotal = 0;
    reservations.forEach(r => {
      if (!isConfirmed(r.status)) return;
      const parcelas = parcelasMap.get(r.id);
      
      if (parcelas && parcelas.length > 0) {
        // Sum actual parcela values paid in this month
        parcelas.forEach(p => {
          const payDate = new Date(p.data_pagamento + 'T12:00:00');
          if (payDate >= monthStart && payDate <= monthEnd) {
            faturamentoTotal += Number(p.valor);
          }
        });
      } else {
        if (!r.data_pagamento) return;
        const payDate = new Date(r.data_pagamento);
        if (payDate >= monthStart && payDate <= monthEnd) {
          faturamentoTotal += calcRealTourValueLocal(r);
        }
      }
    });
    
    const gastosViagem = gastosViagemMes;
    const lucroBrutoMes = faturamentoTotal - gastosViagem;
    const clientesMes = tourSummary.reduce((sum, t) => sum + t.clientes, 0);
    
    // Custos mensais gerais (pontuais + parcelados) exceto pró-labore
    const custosVariadosList = monthlyGeneralCosts.filter(c => c.expense_type !== 'pro_labore');
    const custosPontuais = custosVariadosList.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
    const custosVariadosDetails = custosVariadosList.filter(c => c.quantity * c.unit_value > 0).map(c => ({ name: c.expense_name, value: c.quantity * c.unit_value }));
    
    const proLaboreList = monthlyGeneralCosts.filter(c => c.expense_type === 'pro_labore');
    const proLabore = proLaboreList.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
    const proLaboreDetails = proLaboreList.filter(c => c.quantity * c.unit_value > 0).map(c => ({ name: c.expense_name, value: c.quantity * c.unit_value }));
    
    // Custos recorrentes ativos para este mês
    const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
    const monthDate = new Date(yearNum, monthNum - 1, 15);
    const activeRecurringList = recurringCosts.filter(c => {
      if (c.status !== 'ativo') return false;
      const startDate = new Date(c.start_date + 'T12:00:00');
      if (startDate > monthDate) return false;
      if (c.end_date) {
        const endDate = new Date(c.end_date + 'T12:00:00');
        if (endDate < new Date(yearNum, monthNum - 1, 1)) return false;
      }
      return true;
    });
    const activeRecurringTotal = activeRecurringList.reduce((sum, c) => sum + Number(c.unit_value), 0);
    const custosFixosDetails = activeRecurringList.map(c => ({ name: c.expense_name, value: Number(c.unit_value) }));
    
    const custosVariados = custosPontuais;
    const custosRecorrentes = activeRecurringTotal;
    const manutencao = custosVariados + custosRecorrentes;
    const outrosCustos = 0;
    const custosMensaisGerais = manutencao + proLabore;
    const impostoRenda = faturamentoTotal * IR_RATE;
    const gastosTotais = gastosViagem + custosMensaisGerais + impostoRenda;
    const lucroLiquido = faturamentoTotal - gastosTotais;
    return {
      tourSummary,
      faturamentoTotal,
      gastosViagem,
      lucroBrutoMes,
      clientesMes,
      manutencao,
      custosVariados,
      custosRecorrentes,
      proLabore,
      outrosCustos,
      custosMensaisGerais,
      activeRecurringTotal,
      impostoRenda,
      gastosTotais,
      lucroLiquido,
      // Detail breakdowns
      gastosViagemDetails,
      custosVariadosDetails,
      custosFixosDetails,
      proLaboreDetails,
      // Per client
      faturamentoPorCliente: clientesMes > 0 ? faturamentoTotal / clientesMes : 0,
      lucroBrutoPorCliente: clientesMes > 0 ? lucroBrutoMes / clientesMes : 0,
      lucroLiquidoPorCliente: clientesMes > 0 ? lucroLiquido / clientesMes : 0,
      gastosTotaisPorCliente: clientesMes > 0 ? gastosTotais / clientesMes : 0,
      irPorCliente: clientesMes > 0 ? impostoRenda / clientesMes : 0,
      custosVariadosPorCliente: clientesMes > 0 ? custosVariados / clientesMes : 0,
      custosRecorrentesPorCliente: clientesMes > 0 ? custosRecorrentes / clientesMes : 0,
      gastosViagemPorCliente: clientesMes > 0 ? gastosViagem / clientesMes : 0,
      proLaborePorCliente: clientesMes > 0 ? proLabore / clientesMes : 0
    };
  };
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  const formatPercent = (value: number) => value.toLocaleString('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1
  });

  // Compact pie chart component for financial distribution
  const FinancialPieChart = ({
    faturamento,
    gastosViagem,
    custosVariados,
    custosRecorrentes,
    proLabore,
    impostoRenda,
    lucroLiquido
  }: {
    faturamento: number;
    gastosViagem: number;
    custosVariados: number;
    custosRecorrentes: number;
    proLabore: number;
    impostoRenda: number;
    lucroLiquido: number;
  }) => {
    if (faturamento === 0) return null;
    const data = [
      { name: 'Gastos Viagens', value: gastosViagem, color: '#DC2626' },
      { name: 'Custos Variados', value: custosVariados, color: '#F97316' },
      { name: 'Custos Fixos', value: custosRecorrentes, color: '#3B82F6' },
      { name: 'Pró-Labore', value: proLabore, color: '#8B5CF6' },
      { name: 'IR (6%)', value: impostoRenda, color: '#6B7280' },
      { name: 'Lucro Líquido', value: Math.max(0, lucroLiquido), color: '#22C55E' },
    ].filter(d => d.value > 0);

    return <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" label={({
          percent
        }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>;
  };

  // Tour costs table - Excel-like layout
  const TourCostsTable = () => {
    const tourReservations = reservations.filter(r => r.tour_id === selectedTourId && isConfirmed(r.status));
    // Count total participants, not just reservations
    const numClientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0) || 1;
    
    // Count participants who selected a specific optional item
    const getOptionalItemCount = (optionalItemId: string): number => {
      let count = 0;
      
      // Check participant-level optionals
      tourParticipants.forEach(participant => {
        if (participant.selected_optionals && Array.isArray(participant.selected_optionals)) {
          const hasOptional = participant.selected_optionals.some((opt: any) => 
            opt.id === optionalItemId || opt.optional_id === optionalItemId
          );
          if (hasOptional) count++;
        }
      });
      
      // Also check reservation-level optionals (legacy + direct selections)
      tourReservations.forEach(reserva => {
        const items = reserva.selected_optional_items || [];
        if (Array.isArray(items)) {
          items.forEach((opt: any) => {
            if (opt.id === optionalItemId) {
              count += opt.quantity || 1;
            }
          });
        }
      });
      
      return count || 0;
    };
    
    // Count participants who selected a specific pricing option/package
    const getPricingOptionCount = (pricingOptionId: string): number => {
      return tourParticipants.filter(p => p.pricing_option_id === pricingOptionId).length;
    };
    
    // Get the name of an optional item by ID
    const getOptionalItemName = (id: string): string => {
      const item = tourOptionalItems.find(o => o.id === id);
      return item?.name || 'Opcional';
    };
    
    // Get the name of a pricing option by ID
    const getPricingOptionName = (id: string): string => {
      const option = tourPricingOptions.find(o => o.id === id);
      return option?.option_name || 'Pacote';
    };
    
    // Calculate effective quantity (auto-scale if enabled)
    const getEffectiveQuantity = (cost: TourCost): number => {
      // Priority: optional item > pricing option > participants > manual
      if (cost.auto_scale_optional_item_id) {
        return getOptionalItemCount(cost.auto_scale_optional_item_id);
      }
      if (cost.auto_scale_pricing_option_id) {
        return getPricingOptionCount(cost.auto_scale_pricing_option_id);
      }
      if (cost.auto_scale_participants) {
        return numClientes;
      }
      return cost.quantity;
    };
    
    // Get auto-scale label for display
    const getAutoScaleLabel = (cost: TourCost): string | null => {
      if (cost.auto_scale_optional_item_id) {
        return getOptionalItemName(cost.auto_scale_optional_item_id);
      }
      if (cost.auto_scale_pricing_option_id) {
        return getPricingOptionName(cost.auto_scale_pricing_option_id);
      }
      if (cost.auto_scale_participants) {
        return 'Participantes';
      }
      return null;
    };
    
    const totalCosts = tourCosts.reduce((sum, c) => sum + getEffectiveQuantity(c) * c.unit_value, 0);
    const totalPago = tourCosts.reduce((sum, c) => sum + (c.valor_pago || 0), 0);
    const totalFalta = totalCosts - totalPago;
    
    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState('1');
    const [newItemValue, setNewItemValue] = useState('');
    const [newItemType, setNewItemType] = useState('outros');
    const [newItemAutoScale, setNewItemAutoScale] = useState(false);
    const [showCostsChart, setShowCostsChart] = useState(false);
    const [paymentDetailsCostId, setPaymentDetailsCostId] = useState<string | null>(null);
    const [paymentDetailsCostName, setPaymentDetailsCostName] = useState('');
    const [paymentDetailsTotalExpected, setPaymentDetailsTotalExpected] = useState(0);
    
    // Chart data by expense type
    const chartDataByType = useMemo(() => {
      const grouped: Record<string, number> = {};
      tourCosts.forEach(cost => {
        const effectiveQty = getEffectiveQuantity(cost);
        const total = effectiveQty * cost.unit_value;
        const type = cost.expense_type || 'outros';
        grouped[type] = (grouped[type] || 0) + total;
      });
      return Object.entries(grouped).map(([type, value]) => ({
        name: EXPENSE_TYPES.find(t => t.value === type)?.label || type,
        value,
        type
      })).sort((a, b) => b.value - a.value);
    }, [tourCosts, numClientes]);
    
    // Chart data by individual item
    const chartDataByItem = useMemo(() => {
      return tourCosts.map(cost => {
        const effectiveQty = getEffectiveQuantity(cost);
        return {
          name: cost.product_service.length > 20 ? cost.product_service.substring(0, 17) + '...' : cost.product_service,
          fullName: cost.product_service,
          value: effectiveQty * cost.unit_value,
          type: cost.expense_type
        };
      }).sort((a, b) => b.value - a.value);
    }, [tourCosts, numClientes]);
    
    const CHART_COLORS = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#a855f7'
    ];
    
    const handleQuickAdd = async () => {
      if (!selectedTourId || !newItemName.trim()) return;
      try {
        const newIndex = tourCosts.length;
        const { error } = await supabase.from('tour_costs').insert({
          tour_id: selectedTourId,
          product_service: newItemName.trim(),
          quantity: newItemAutoScale ? 1 : (parseFloat(newItemQty) || 1),
          unit_value: parseFloat(newItemValue) || 0,
          order_index: newIndex,
          valor_pago: 0,
          expense_type: newItemType,
          auto_scale_participants: newItemAutoScale
        });
        if (error) throw error;
        fetchTourCosts(selectedTourId);
        fetchAllTourCosts();
        setNewItemName('');
        setNewItemQty('1');
        setNewItemValue('');
        setNewItemType('outros');
        setNewItemAutoScale(false);
        toast({ title: "Custo adicionado" });
      } catch (error) {
        console.error('Error adding tour cost:', error);
        toast({ title: "Erro ao adicionar custo", variant: "destructive" });
      }
    };

    const getExpenseTypeLabel = (value: string) => {
      return EXPENSE_TYPES.find(t => t.value === value)?.label || value;
    };

    const getExpenseTypeColor = (type: string) => {
      const colors: Record<string, string> = {
        transporte: 'bg-blue-100 text-blue-700',
        equipe: 'bg-purple-100 text-purple-700',
        operacional: 'bg-gray-100 text-gray-700',
        alimentacao: 'bg-orange-100 text-orange-700',
        seguro: 'bg-green-100 text-green-700',
        hospedagem: 'bg-rose-100 text-rose-700',
        gratificacao: 'bg-yellow-100 text-yellow-700',
        trafego_pago: 'bg-cyan-100 text-cyan-700',
        servico_bordo: 'bg-indigo-100 text-indigo-700',
        taxas_entradas: 'bg-amber-100 text-amber-700',
        outros: 'bg-slate-100 text-slate-700',
      };
      return colors[type] || colors.outros;
    };

    return (
      <>
      <Card className="overflow-hidden">
        <CardHeader className="py-3 border-b bg-muted/30">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-red-600" />
                <CardTitle className="text-sm font-medium">Custos do Passeio</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCostsChart(true)}
                className="h-7 text-xs gap-1"
              >
                <PieChartIcon className="h-3 w-3" />
                Gráficos
              </Button>
            </div>
            {/* Quick add form */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newItemType} onValueChange={setNewItemType}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                placeholder="Produto/Serviço" 
                value={newItemName} 
                onChange={e => setNewItemName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} 
                className="h-7 text-xs w-40"
              />
              <Input 
                type="number" 
                placeholder="Qtd" 
                value={newItemQty} 
                onChange={e => setNewItemQty(e.target.value)} 
                className="h-7 text-xs w-14 text-center"
                disabled={newItemAutoScale}
              />
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Valor" 
                value={newItemValue} 
                onChange={e => setNewItemValue(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} 
                className="h-7 text-xs w-20 text-right"
              />
              <div className="flex items-center gap-1">
                <Checkbox 
                  id="auto-scale-new" 
                  checked={newItemAutoScale} 
                  onCheckedChange={(checked) => setNewItemAutoScale(checked as boolean)} 
                  className="h-4 w-4"
                />
                <label htmlFor="auto-scale-new" className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <Link2 className="h-3 w-3" />
                  Auto
                </label>
              </div>
              <Button size="sm" onClick={handleQuickAdd} disabled={!newItemName.trim()} className="h-7 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tourCosts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum custo cadastrado
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[32px_100px_minmax(150px,1fr)_70px_50px_80px_90px_50px_80px_90px_90px_32px] gap-0 text-[9px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground">
                <div className="p-1.5 text-center border-r border-primary-foreground/20">#</div>
                <div className="p-1.5 border-r border-primary-foreground/20">Tipo</div>
                <div className="p-1.5 border-r border-primary-foreground/20">Produto/Serviço</div>
                <div className="p-1.5 text-center border-r border-primary-foreground/20" title="Vincular quantidade a participantes, opcionais ou pacotes">
                  <Link2 className="h-3 w-3 mx-auto" />
                </div>
                <div className="p-1.5 text-center border-r border-primary-foreground/20">Quant</div>
                <div className="p-1.5 text-right border-r border-primary-foreground/20">Valor</div>
                <div className="p-1.5 text-right border-r border-primary-foreground/20">Total</div>
                <div className="p-1.5 text-center border-r border-primary-foreground/20">%</div>
                <div className="p-1.5 text-right border-r border-primary-foreground/20">P/Pessoa</div>
                <div className="p-1.5 text-right border-r border-primary-foreground/20 bg-emerald-600">Pago</div>
                <div className="p-1.5 text-right border-r border-primary-foreground/20 bg-amber-500">Falta</div>
                <div className="p-1.5"></div>
              </div>
              
              {/* Table rows */}
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {tourCosts.map((cost, index) => {
                  const effectiveQty = getEffectiveQuantity(cost);
                  const valorTotal = effectiveQty * cost.unit_value;
                  const porcentagem = totalCosts > 0 ? (valorTotal / totalCosts) * 100 : 0;
                  const porPessoa = valorTotal / numClientes;
                  const valorPago = cost.valor_pago || 0;
                  const falta = valorTotal - valorPago;
                  
                  return (
                    <div 
                      key={cost.id} 
                      className="grid grid-cols-[32px_100px_minmax(150px,1fr)_70px_50px_80px_90px_50px_80px_90px_90px_32px] gap-0 items-center group hover:bg-muted/30 text-sm"
                    >
                      {/* # */}
                      <div className="p-1 text-center text-xs text-muted-foreground border-r">{index + 1}</div>
                      
                      {/* Tipo */}
                      <div className="p-0.5 border-r">
                        <Select 
                          value={cost.expense_type || 'outros'} 
                          onValueChange={val => updateTourCost(cost.id, 'expense_type', val)}
                        >
                          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-1">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px]", getExpenseTypeColor(cost.expense_type || 'outros'))}>
                              {getExpenseTypeLabel(cost.expense_type || 'outros')}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value} className="text-xs">
                                <span className={cn("px-1.5 py-0.5 rounded", getExpenseTypeColor(type.value))}>
                                  {type.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Produto ou Serviço */}
                      <div className="p-0.5 border-r">
                        <EditableInput 
                          value={cost.product_service} 
                          onChange={val => updateTourCost(cost.id, 'product_service', val)} 
                          className="h-6 text-xs border-transparent bg-transparent hover:bg-white focus:bg-white px-1"
                        />
                      </div>
                      
                      {/* Auto-scale selector */}
                      <div className="p-0.5 border-r">
                        <Select 
                          value={
                            cost.auto_scale_optional_item_id ? `opt_${cost.auto_scale_optional_item_id}` :
                            cost.auto_scale_pricing_option_id ? `pkg_${cost.auto_scale_pricing_option_id}` :
                            cost.auto_scale_participants ? 'participants' : 'none'
                          }
                          onValueChange={(val) => {
                            if (val === 'none') {
                              // Clear all auto-scale options
                              updateTourCost(cost.id, 'auto_scale_participants', false);
                              updateTourCost(cost.id, 'auto_scale_optional_item_id', null);
                              updateTourCost(cost.id, 'auto_scale_pricing_option_id', null);
                            } else if (val === 'participants') {
                              updateTourCost(cost.id, 'auto_scale_participants', true);
                              updateTourCost(cost.id, 'auto_scale_optional_item_id', null);
                              updateTourCost(cost.id, 'auto_scale_pricing_option_id', null);
                            } else if (val.startsWith('opt_')) {
                              const optId = val.replace('opt_', '');
                              updateTourCost(cost.id, 'auto_scale_participants', false);
                              updateTourCost(cost.id, 'auto_scale_optional_item_id', optId);
                              updateTourCost(cost.id, 'auto_scale_pricing_option_id', null);
                            } else if (val.startsWith('pkg_')) {
                              const pkgId = val.replace('pkg_', '');
                              updateTourCost(cost.id, 'auto_scale_participants', false);
                              updateTourCost(cost.id, 'auto_scale_optional_item_id', null);
                              updateTourCost(cost.id, 'auto_scale_pricing_option_id', pkgId);
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0.5 w-full">
                            {getAutoScaleLabel(cost) ? (
                              <span className="truncate text-primary font-medium flex items-center gap-0.5">
                                <Link2 className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{getAutoScaleLabel(cost)?.substring(0, 6)}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </SelectTrigger>
                          <SelectContent align="start" className="min-w-48">
                            <SelectItem value="none" className="text-xs">
                              <span className="text-muted-foreground">Nenhum (manual)</span>
                            </SelectItem>
                            <SelectItem value="participants" className="text-xs">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
                                Participantes ({numClientes})
                              </span>
                            </SelectItem>
                            
                            {/* Optional Items section */}
                            {tourOptionalItems.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1">
                                  Opcionais
                                </div>
                                {tourOptionalItems.map(opt => (
                                  <SelectItem key={opt.id} value={`opt_${opt.id}`} className="text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <span className="truncate">{opt.name}</span>
                                      <span className="text-muted-foreground">({getOptionalItemCount(opt.id)})</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            
                            {/* Pricing Options section */}
                            {tourPricingOptions.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1">
                                  Pacotes
                                </div>
                                {tourPricingOptions.map(pkg => (
                                  <SelectItem key={pkg.id} value={`pkg_${pkg.id}`} className="text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <span className="truncate">{pkg.option_name}</span>
                                      <span className="text-muted-foreground">({getPricingOptionCount(pkg.id)})</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Quant */}
                      <div className="p-0.5 border-r">
                        {(cost.auto_scale_participants || cost.auto_scale_optional_item_id || cost.auto_scale_pricing_option_id) ? (
                          <div className="h-6 text-xs text-center flex items-center justify-center text-primary font-medium" title={getAutoScaleLabel(cost) || ''}>
                            {getEffectiveQuantity(cost)}
                          </div>
                        ) : (
                          <EditableInput 
                            type="number" 
                            value={cost.quantity} 
                            onChange={val => updateTourCost(cost.id, 'quantity', parseFloat(val) || 0)} 
                            className="h-6 text-xs text-center border-transparent bg-transparent hover:bg-white focus:bg-white"
                          />
                        )}
                      </div>
                      
                      {/* Valor unitário */}
                      <div className="p-0.5 border-r">
                        <EditableInput 
                          type="number" 
                          step="0.01" 
                          value={cost.unit_value} 
                          onChange={val => updateTourCost(cost.id, 'unit_value', parseFloat(val) || 0)} 
                          className="h-6 text-xs text-right border-transparent bg-transparent hover:bg-white focus:bg-white"
                        />
                      </div>
                      
                      {/* Valor Total */}
                      <div className="p-1 text-right font-semibold text-xs border-r bg-amber-50">
                        {formatCurrency(valorTotal)}
                      </div>
                      
                      {/* Porcentagem */}
                      <div className="p-1 text-center text-[10px] text-muted-foreground border-r">
                        {porcentagem.toFixed(1)}%
                      </div>
                      
                      {/* Por Pessoa */}
                      <div className="p-1 text-right text-xs border-r bg-violet-50">
                        {formatCurrency(porPessoa)}
                      </div>
                      
                      {/* Valor Pago - clickable to open details */}
                      <div 
                        className="p-0.5 border-r bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
                        onClick={() => {
                          setPaymentDetailsCostId(cost.id);
                          setPaymentDetailsCostName(cost.product_service);
                          setPaymentDetailsTotalExpected(valorTotal);
                        }}
                        title="Clique para detalhar pagamentos"
                      >
                        <div className="h-6 text-xs text-right px-1 flex items-center justify-end gap-1 text-emerald-700 font-medium">
                          <Receipt className="h-2.5 w-2.5 opacity-50" />
                          {formatCurrency(valorPago)}
                        </div>
                      </div>
                      
                      {/* Falta */}
                      <div className={cn(
                        "p-1 text-right text-xs font-medium border-r",
                        falta > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {formatCurrency(falta)}
                      </div>
                      
                      {/* Delete button */}
                      <div className="p-0.5 flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600" 
                          onClick={() => deleteTourCost(cost.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Totals footer */}
              <div className="border-t-2 border-primary bg-muted/50">
                <div className="grid grid-cols-[32px_100px_minmax(150px,1fr)_70px_50px_80px_90px_50px_80px_90px_90px_32px] gap-0 items-center font-bold text-sm">
                  <div className="p-1.5 border-r"></div>
                  <div className="p-1.5 border-r"></div>
                  <div className="p-1.5 border-r text-right uppercase text-xs">Totais</div>
                  <div className="p-1.5 border-r"></div>
                  <div className="p-1.5 border-r"></div>
                  <div className="p-1.5 border-r"></div>
                  <div className="p-1.5 text-right border-r bg-amber-100 text-amber-800 text-xs">
                    {formatCurrency(totalCosts)}
                  </div>
                  <div className="p-1.5 border-r text-center text-[10px]">100%</div>
                  <div className="p-1.5 text-right border-r bg-violet-100 text-violet-800 text-[10px]">
                    {formatCurrency(totalCosts / numClientes)}
                  </div>
                  <div className="p-1.5 text-right border-r bg-emerald-100 text-emerald-800 text-xs">
                    {formatCurrency(totalPago)}
                  </div>
                  <div className={cn(
                    "p-1.5 text-right border-r text-xs",
                    totalFalta > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  )}>
                    {formatCurrency(totalFalta)}
                  </div>
                  <div className="p-1.5"></div>
                </div>
                
                {/* Summary labels */}
                <div className="grid grid-cols-[32px_100px_minmax(180px,1fr)_40px_60px_80px_90px_50px_80px_90px_90px_32px] gap-0 text-[9px] text-muted-foreground border-t">
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 text-center border-r">Total</div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 border-r"></div>
                  <div className="p-1 text-center border-r">Pago</div>
                  <div className="p-1 text-center border-r">Falta</div>
                  <div className="p-1"></div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Charts Modal */}
      <Dialog open={showCostsChart} onOpenChange={setShowCostsChart}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Análise Gráfica dos Custos
            </DialogTitle>
            <DialogDescription>
              Visualização dos custos do passeio por categoria e por item
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Bar Chart by Type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartDataByType}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartDataByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend with values */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {chartDataByType.map((entry, index) => {
                    const total = chartDataByType.reduce((acc, e) => acc + e.value, 0);
                    const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{entry.name}</span>
                        <span className="ml-auto font-medium">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Bar Chart by Item */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Custos por Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartDataByItem}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => chartDataByItem.find(d => d.name === label)?.fullName || label}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {chartDataByItem.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Summary Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {chartDataByType.map((item, index) => {
                  const percent = totalCosts > 0 ? (item.value / totalCosts * 100).toFixed(1) : '0';
                  return (
                    <div 
                      key={item.type}
                      className="p-3 rounded-lg border"
                      style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length], borderLeftWidth: '4px' }}
                    >
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                      <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-muted-foreground">{percent}% do total</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Total de Custos</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(totalCosts)}</span>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      
      {/* Cost Payment Details Modal */}
      <CostPaymentDetailsModal
        open={!!paymentDetailsCostId}
        onOpenChange={(open) => { if (!open) setPaymentDetailsCostId(null); }}
        tourCostId={paymentDetailsCostId || ''}
        costName={paymentDetailsCostName}
        totalExpected={paymentDetailsTotalExpected}
        onTotalPaidChange={(costId, newTotal) => {
          setTourCosts(prev => prev.map(c => c.id === costId ? { ...c, valor_pago: newTotal } : c));
          setAllTourCosts(prev => prev.map(c => c.id === costId ? { ...c, valor_pago: newTotal } : c));
          fetchAllCostPayments();
        }}
      />
      </>
    );
  };


  // Monthly general costs table - clean minimalist design with installment support
  const MonthlyGeneralCostsTable = () => {
    const costsWithoutProLabore = monthlyGeneralCosts.filter(c => c.expense_type !== 'pro_labore');
    const totalCosts = costsWithoutProLabore.reduce((sum, c) => sum + c.quantity * c.unit_value, 0);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseValue, setNewExpenseValue] = useState('');
    const [newExpenseType, setNewExpenseType] = useState<string>('outros');
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>('avista');
    const [newInstallments, setNewInstallments] = useState<string>('1');
    const [isAddingInstallments, setIsAddingInstallments] = useState(false);
    
    const handleQuickAddExpense = async () => {
      if (!newExpenseName.trim()) return;
      setIsAddingInstallments(true);
      
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const totalValue = parseFloat(newExpenseValue) || 0;
        const installmentsCount = newPaymentMethod === 'cartao' ? Math.max(1, parseInt(newInstallments) || 1) : 1;
        const installmentValue = totalValue / installmentsCount;
        
        // Create first installment (the parent)
        const { data: firstInstallment, error: firstError } = await supabase
          .from('monthly_general_costs')
          .insert({
            month: selectedMonth,
            year: year,
            expense_name: newPaymentMethod === 'cartao' && installmentsCount > 1 
              ? `${newExpenseName.trim()} (1/${installmentsCount})`
              : newExpenseName.trim(),
            quantity: 1,
            unit_value: installmentValue,
            expense_type: newExpenseType,
            order_index: monthlyGeneralCosts.length,
            payment_method: newPaymentMethod,
            total_installments: installmentsCount,
            current_installment: 1,
            total_value: totalValue,
            purchase_date: new Date().toISOString().split('T')[0]
          })
          .select('id')
          .single();
          
        if (firstError) throw firstError;
        
        // If it's installment payment, create future installments
        if (newPaymentMethod === 'cartao' && installmentsCount > 1 && firstInstallment) {
          const futureInstallments = [];
          
          for (let i = 2; i <= installmentsCount; i++) {
            // Calculate future month
            let futureMonth = month + (i - 1);
            let futureYear = year;
            
            while (futureMonth > 12) {
              futureMonth -= 12;
              futureYear += 1;
            }
            
            const futureMonthStr = `${futureYear}-${String(futureMonth).padStart(2, '0')}`;
            
            futureInstallments.push({
              month: futureMonthStr,
              year: futureYear,
              expense_name: `${newExpenseName.trim()} (${i}/${installmentsCount})`,
              quantity: 1,
              unit_value: installmentValue,
              expense_type: newExpenseType,
              order_index: 0,
              payment_method: 'cartao',
              total_installments: installmentsCount,
              current_installment: i,
              total_value: totalValue,
              parent_expense_id: firstInstallment.id,
              purchase_date: new Date().toISOString().split('T')[0]
            });
          }
          
          if (futureInstallments.length > 0) {
            const { error: futureError } = await supabase
              .from('monthly_general_costs')
              .insert(futureInstallments);
              
            if (futureError) throw futureError;
          }
        }
        
        fetchMonthlyGeneralCosts(selectedMonth);
        setNewExpenseName('');
        setNewExpenseValue('');
        setNewInstallments('1');
        setNewPaymentMethod('avista');
        
        const successMsg = newPaymentMethod === 'cartao' && installmentsCount > 1
          ? `Despesa parcelada em ${installmentsCount}x adicionada`
          : "Despesa adicionada com sucesso";
        toast({ title: successMsg });
        
      } catch (error) {
        console.error('Error adding monthly cost:', error);
        toast({ title: "Erro ao adicionar despesa", variant: "destructive" });
      } finally {
        setIsAddingInstallments(false);
      }
    };

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Custos Mensais Gerais
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalCosts)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Quick Add Form */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            {/* Row 1: Name and Category */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-7">
                <Input 
                  placeholder="Nome da despesa..." 
                  value={newExpenseName} 
                  onChange={e => setNewExpenseName(e.target.value)} 
                  className="h-9 bg-background" 
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <Select value={newExpenseType} onValueChange={v => setNewExpenseType(v)}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="imposto">Imposto</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Row 2: Value, Payment Method, Installments, Button */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 sm:col-span-3">
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Valor total (R$)" 
                  value={newExpenseValue} 
                  onChange={e => setNewExpenseValue(e.target.value)} 
                  className="h-9 bg-background text-right" 
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Select value={newPaymentMethod} onValueChange={v => {
                  setNewPaymentMethod(v);
                  if (v === 'avista') setNewInstallments('1');
                }}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À Vista</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPaymentMethod === 'cartao' && (
                <div className="col-span-6 sm:col-span-3">
                  <Select value={newInstallments} onValueChange={setNewInstallments}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn("col-span-6", newPaymentMethod === 'cartao' ? "sm:col-span-3" : "sm:col-span-6")}>
                <Button 
                  onClick={handleQuickAddExpense} 
                  disabled={!newExpenseName.trim() || isAddingInstallments} 
                  className="w-full h-9" 
                  size="sm"
                >
                  {isAddingInstallments ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Installment preview */}
            {newPaymentMethod === 'cartao' && parseInt(newInstallments) > 1 && newExpenseValue && (
              <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border">
                <span className="font-medium">{parseInt(newInstallments)}x</span> de{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency((parseFloat(newExpenseValue) || 0) / parseInt(newInstallments))}
                </span>
                {' '}• Será distribuído nos próximos {parseInt(newInstallments)} meses a partir de {format(new Date(selectedMonth + '-01'), 'MMM/yy', { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Costs List */}
          {costsWithoutProLabore.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-lg">
              <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {costsWithoutProLabore.map((cost, index) => {
                const valorTotal = cost.quantity * cost.unit_value;
                const percent = totalCosts > 0 ? valorTotal / totalCosts * 100 : 0;
                const isInstallment = cost.total_installments && cost.total_installments > 1;
                
                return (
                  <div key={cost.id} className="group flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-medium text-amber-700 shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <EditableInput 
                          value={cost.expense_name} 
                          onChange={val => updateMonthlyGeneralCost(cost.id, 'expense_name', val)} 
                          className="h-8 bg-transparent border-transparent hover:bg-background hover:border-border focus:bg-background text-sm font-medium" 
                        />
                        {isInstallment && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap" title={`Valor total: ${formatCurrency(cost.total_value || 0)}`}>
                            💳 {cost.current_installment}/{cost.total_installments}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {(cost.expense_type as string) === 'manutencao' ? 'Manutenção' : 
                       (cost.expense_type as string) === 'investimento' ? 'Investimento' :
                       (cost.expense_type as string) === 'equipamento' ? 'Equipamento' :
                       (cost.expense_type as string) === 'marketing' ? 'Marketing' :
                       (cost.expense_type as string) === 'administrativo' ? 'Administrativo' :
                       (cost.expense_type as string) === 'imposto' ? 'Imposto' : 'Outros'}
                    </Badge>
                    <div className="w-24 shrink-0">
                      <EditableInput 
                        type="number" 
                        step="0.01" 
                        value={cost.unit_value} 
                        onChange={val => updateMonthlyGeneralCost(cost.id, 'unit_value', parseFloat(val) || 0)} 
                        className="h-8 bg-transparent border-transparent hover:bg-background hover:border-border focus:bg-background text-sm text-right font-semibold" 
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{percent.toFixed(0)}%</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-600 hover:bg-rose-50 shrink-0" 
                      onClick={() => deleteMonthlyGeneralCost(cost.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Tour summary table for monthly view - clean minimalist design
  const TourSummaryTable = ({
    summary
  }: {
    summary: any[];
  }) => {
    const totalFaturamento = summary.reduce((sum, t) => sum + t.faturamento, 0);
    const totalDespesas = summary.reduce((sum, t) => sum + t.despesas, 0);
    const totalLucro = summary.reduce((sum, t) => sum + t.lucroBruto, 0);
    const totalClientes = summary.reduce((sum, t) => sum + t.clientes, 0);
    
    // Calculate days until event
    const getDaysUntil = (dateStr: string) => {
      const eventDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
    
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Passeios do Mês
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">{totalClientes} clientes</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {summary.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-lg">
              <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum passeio neste mês</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-xs font-medium text-muted-foreground w-8">#</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Destino</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground text-center">Faltam</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground text-right">Faturamento</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground text-right">Despesas</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground text-right">Lucro</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground text-right">Clientes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((tour, index) => {
                      const lucro = tour.lucroBruto;
                      const daysUntil = getDaysUntil(tour.data);
                      const isPast = daysUntil < 0;
                      return (
                        <TableRow key={tour.id} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="py-3">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="font-medium text-sm text-foreground">{tour.destino}</p>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={cn(
                              "text-sm font-medium",
                              isPast ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {daysUntil}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-sm font-medium text-emerald-600">
                              {formatCurrency(tour.faturamento)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-sm font-medium text-rose-500">
                              {formatCurrency(tour.despesas)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className={cn(
                              "text-sm font-medium",
                              lucro >= 0 ? "text-emerald-600" : "text-rose-500"
                            )}>
                              {formatCurrency(lucro)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-sm font-medium text-foreground">
                              {tour.clientes}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-medium tracking-wide">Faturamento</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalFaturamento)}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-medium tracking-wide">Despesas</p>
                  <p className="font-bold text-rose-700 dark:text-rose-300">{formatCurrency(totalDespesas)}</p>
                </div>
                <div className={cn(
                  "rounded-lg p-3 text-center",
                  totalLucro >= 0 
                    ? "bg-emerald-50 dark:bg-emerald-950/30" 
                    : "bg-rose-50 dark:bg-rose-950/30"
                )}>
                  <p className={cn(
                    "text-[10px] uppercase font-medium tracking-wide",
                    totalLucro >= 0 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-rose-600 dark:text-rose-400"
                  )}>Lucro</p>
                  <p className={cn(
                    "font-bold",
                    totalLucro >= 0 
                      ? "text-emerald-700 dark:text-emerald-300" 
                      : "text-rose-700 dark:text-rose-300"
                  )}>{formatCurrency(totalLucro)}</p>
                </div>
                <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-medium tracking-wide">Clientes</p>
                  <p className="font-bold text-violet-700 dark:text-violet-300">{totalClientes}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Pro-Labore section - clean minimalist design
  const ProLaboreSection = ({
    clientesMes
  }: {
    clientesMes: number;
  }) => {
    const proLaboreEntry = monthlyGeneralCosts.find(c => c.expense_type === 'pro_labore');
    const proLaboreValue = proLaboreEntry ? proLaboreEntry.quantity * proLaboreEntry.unit_value : 0;
    const proLaborePorCliente = clientesMes > 0 ? proLaboreValue / clientesMes : 0;
    const hasProLabore = !!proLaboreEntry;
    
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Pró-Labore do Mês
            </CardTitle>
            <div className="flex gap-2">
              {!hasProLabore && (
                <Button size="sm" variant="outline" onClick={addProLabore}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar (R$3.243)
                </Button>
              )}
              {hasProLabore && (
                <Button size="sm" variant="outline" onClick={repeatProLaboreToEndOfYear}>
                  <Calendar className="h-4 w-4 mr-1" />
                  Repetir até Dez
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {hasProLabore && proLaboreEntry ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Valor Editável */}
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Valor Mensal</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <EditableInput 
                      type="number" 
                      step="0.01" 
                      value={proLaboreEntry.unit_value} 
                      onChange={val => updateMonthlyGeneralCost(proLaboreEntry.id, 'unit_value', parseFloat(val) || 0)} 
                      className="h-10 text-lg font-semibold bg-background border pl-10 text-foreground" 
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" 
                    onClick={() => deleteMonthlyGeneralCost(proLaboreEntry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Valor Total */}
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Valor Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(proLaboreValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Custo fixo mensal</p>
              </div>
              
              {/* Por Cliente */}
              <div className="bg-violet-50 rounded-lg p-4">
                <p className="text-xs text-violet-600 uppercase tracking-wide mb-2">Por Cliente ({clientesMes})</p>
                <p className="text-2xl font-bold text-violet-700">{formatCurrency(proLaborePorCliente)}</p>
                <p className="text-xs text-violet-500 mt-1">Custo por pessoa atendida</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg">
              <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pró-labore cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Clique no botão acima para adicionar</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Tour View - Clean and functional redesign
  const TourView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState<'all' | 'future' | 'past'>('all');
    const [monthFilter, setMonthFilter] = useState<string>('all');
    
    // Available years from tours
    const availableYears = useMemo(() => {
      const years = new Set<number>();
      tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
      years.add(new Date().getFullYear());
      return Array.from(years).sort((a, b) => b - a);
    }, [tours]);

    // Months for filter
    const MONTHS = [
      { value: 'all', label: 'Todos os Meses' },
      { value: '01', label: 'Janeiro' },
      { value: '02', label: 'Fevereiro' },
      { value: '03', label: 'Março' },
      { value: '04', label: 'Abril' },
      { value: '05', label: 'Maio' },
      { value: '06', label: 'Junho' },
      { value: '07', label: 'Julho' },
      { value: '08', label: 'Agosto' },
      { value: '09', label: 'Setembro' },
      { value: '10', label: 'Outubro' },
      { value: '11', label: 'Novembro' },
      { value: '12', label: 'Dezembro' },
    ];
    
    // Filter tours based on year, month, and status
    const filteredTours = useMemo(() => {
      return allToursSorted.filter(t => {
        const tourDate = new Date(t.start_date);
        const tourYear = tourDate.getFullYear();
        const tourMonth = String(tourDate.getMonth() + 1).padStart(2, '0');
        const isPast = new Date(t.end_date || t.start_date) < today;
        
        // Year filter
        if (tourYear !== yearFilter) return false;
        
        // Month filter
        if (monthFilter !== 'all' && tourMonth !== monthFilter) return false;
        
        // Status filter
        if (statusFilter === 'future' && isPast) return false;
        if (statusFilter === 'past' && !isPast) return false;
        
        return true;
      }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [allToursSorted, yearFilter, monthFilter, statusFilter, today]);
    
    // Separate future and past from filtered tours
    const futureTours = filteredTours.filter(t => new Date(t.end_date || t.start_date) >= today);
    const pastTours = filteredTours.filter(t => new Date(t.end_date || t.start_date) < today);

    // Helper function for card payment method detection (same as calculateTourFinancials)
    // Using shared calcFaturamentoBase and isCardPaymentMethod from component scope

    // Calculate totals using consistent logic
    const totalFaturamentoFuture = futureTours.reduce((sum, tour) => {
      const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
      return sum + calcFaturamentoBase(tourReservations, allParticipants);
    }, 0);
    const totalFaturamentoPast = pastTours.reduce((sum, tour) => {
      const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
      return sum + calcFaturamentoBase(tourReservations, allParticipants);
    }, 0);
    const totalClientesFuture = futureTours.reduce((sum, tour) => {
      return sum + reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status)).reduce((s, r) => s + (r.numero_participantes || 1), 0);
    }, 0);
    const totalClientesPast = pastTours.reduce((sum, tour) => {
      return sum + reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status)).reduce((s, r) => s + (r.numero_participantes || 1), 0);
    }, 0);

    // Calculate tour duration in days
    const getTourDuration = (tour: Tour) => {
      if (!tour.end_date) return 1;
      const start = new Date(tour.start_date);
      const end = new Date(tour.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    // Tour card component matching the screenshot design
    // Uses same calculation logic as calculateTourFinancials for consistency
    const TourCard = ({ tour }: { tour: Tour }) => {
      const tourReservations = reservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
      const clientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
      const numClientesForCalc = clientes || 1;
      
      // Use shared helper for consistent faturamento calculation
      const faturamento = calcFaturamentoBase(tourReservations, allParticipants);
      
      const tourCostsFiltered = allTourCosts.filter(c => c.tour_id === tour.id);
      const custos = tourCostsFiltered.reduce((sum, c) => {
        const effectiveQty = c.auto_scale_participants ? numClientesForCalc : c.quantity;
        return sum + effectiveQty * c.unit_value;
      }, 0);
      const lucro = faturamento - custos - (faturamento * IR_RATE);
      const tourDate = new Date(tour.start_date);
      const duration = getTourDuration(tour);
      
      return (
        <Card 
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-border/50"
          onClick={() => setSelectedTourId(tour.id)}
        >
          <CardContent className="p-4">
            {/* Header with badges and date */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-white text-xs px-2 py-0.5">
                  {duration}d
                </Badge>
                {tour.is_exclusive && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                    Exclusivo
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Calendar className="h-3 w-3" />
                  <span className="font-semibold">{format(tourDate, 'dd/MM')}</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {format(tourDate, 'MMM yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Tour name and location */}
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{tour.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">{tour.city}, {tour.state}</p>

            {/* Stats boxes */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                <p className="text-[10px] text-emerald-600 font-medium uppercase">Faturamento</p>
                <p className={cn("text-sm font-bold", faturamento > 0 ? "text-emerald-700" : "text-emerald-600")}>
                  {faturamento > 0 ? formatCurrency(faturamento) : 'R$ 0'}
                </p>
              </div>
              <div className={cn(
                "rounded-lg p-2 text-center border",
                lucro > 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"
              )}>
                <p className={cn("text-[10px] font-medium uppercase", lucro > 0 ? "text-blue-600" : "text-red-600")}>Lucro</p>
                <p className={cn("text-sm font-bold", lucro > 0 ? "text-blue-700" : "text-red-700")}>
                  {formatCurrency(lucro)}
                </p>
              </div>
              <div className="bg-violet-50 rounded-lg p-2 text-center border border-violet-200">
                <p className="text-[10px] text-violet-600 font-medium uppercase">Clientes</p>
                <p className="text-sm font-bold text-violet-700">{clientes}</p>
              </div>
            </div>

            {/* Footer link */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Clique para detalhes</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      );
    };

    if (!selectedTourId) {
      return (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ano:</span>
                  <Select value={String(yearFilter)} onValueChange={v => setYearFilter(parseInt(v))}>
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mês:</span>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {MONTHS.map(month => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select value={statusFilter} onValueChange={(v: 'all' | 'future' | 'past') => setStatusFilter(v)}>
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="future">Futuros</SelectItem>
                      <SelectItem value="past">Realizados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Badge variant="secondary" className="ml-auto">
                  {filteredTours.length} passeio{filteredTours.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-blue-100 text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="uppercase font-medium">Próximos</span>
              </div>
              <p className="text-3xl font-bold">{futureTours.length}</p>
              <p className="text-xs text-blue-100">passeios agendados</p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-emerald-100 text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="uppercase font-medium">Previsto</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalFaturamentoFuture)}</p>
              <p className="text-xs text-emerald-100">{totalClientesFuture} clientes confirmados</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-gray-300 text-xs mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="uppercase font-medium">Realizados</span>
              </div>
              <p className="text-3xl font-bold">{pastTours.length}</p>
              <p className="text-xs text-gray-300">passeios concluídos</p>
            </div>
            
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-violet-100 text-xs mb-1">
                <Wallet className="h-3.5 w-3.5" />
                <span className="uppercase font-medium">Faturado</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalFaturamentoPast)}</p>
              <p className="text-xs text-violet-100">{totalClientesPast} clientes atendidos</p>
            </div>
          </div>

          {/* Tours Grid */}
          {filteredTours.length > 0 ? (
            <div className="space-y-4">
              {futureTours.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-primary rounded" />
                    <div>
                      <h3 className="font-semibold text-foreground">Próximos Passeios</h3>
                      <p className="text-xs text-muted-foreground">{futureTours.length} passeios agendados</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {futureTours.map(tour => <TourCard key={tour.id} tour={tour} />)}
                  </div>
                </div>
              )}

              {pastTours.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-muted-foreground rounded" />
                    <div>
                      <h3 className="font-semibold text-muted-foreground">Passeios Realizados</h3>
                      <p className="text-xs text-muted-foreground">{pastTours.length} passeios concluídos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastTours.map(tour => <TourCard key={tour.id} tour={tour} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calculator className="h-12 w-12 mb-4 opacity-30" />
              <p className="font-medium">Nenhum passeio encontrado</p>
              <p className="text-sm">Ajuste os filtros para visualizar passeios</p>
            </div>
          )}
        </div>
      );
    }

    // Tour detail view
    const financials = calculateTourFinancials(selectedTourId);
    const selectedTour = tours.find(t => t.id === selectedTourId);
    const tourDate = selectedTour ? new Date(selectedTour.start_date) : new Date();
    const isPastTour = tourDate < today;
    
    return (
      <div className="space-y-6">
        {/* Back button and tour header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTourId(null)} className="shrink-0">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{selectedTour?.name}</h2>
            <p className="text-sm text-muted-foreground">
              {format(tourDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {selectedTour?.city}, {selectedTour?.state}
            </p>
          </div>
          <Badge variant={isPastTour ? "secondary" : "default"} className="shrink-0">
            {financials.numClientes} clientes
          </Badge>
        </div>

        {/* Key metrics - clean grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xs text-emerald-600 font-medium">Valor Pago</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(financials.valorRecebidoBase)}</p>
          </div>
          <div className={cn(
            "p-4 rounded-lg border",
            financials.lucroLiquido >= 0 
              ? "bg-blue-50 border-blue-200" 
              : "bg-red-50 border-red-200"
          )}>
            <p className={cn("text-xs font-medium", financials.lucroLiquido >= 0 ? "text-blue-600" : "text-red-600")}>Lucro Líquido</p>
            <p className={cn("text-xl font-bold", financials.lucroLiquido >= 0 ? "text-blue-700" : "text-red-700")}>
              {formatCurrency(financials.lucroLiquido)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 font-medium">Custos Viagem</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(financials.gastosViagem)}</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-600 font-medium">IR (6%)</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(financials.impostoRenda)}</p>
          </div>
          {financials.valorEmAberto > 0 && (
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Em Aberto</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(financials.valorEmAberto)}</p>
            </div>
          )}
        </div>


        {/* Per client indicators - moved here, right below metrics */}
        {financials.numClientes > 0 && (
          <div className="grid grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Fat./Cliente</p>
              <p className="font-semibold text-sm">{formatCurrency(financials.faturamentoPorCliente)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase">L. Bruto</p>
              <p className="font-semibold text-sm">{formatCurrency(financials.lucroBrutoPorCliente)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase">L. Líquido</p>
              <p className="font-semibold text-sm">{formatCurrency(financials.lucroLiquidoPorCliente)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Custos</p>
              <p className="font-semibold text-sm">{formatCurrency(financials.gastosViagemPorCliente)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase">IR</p>
              <p className="font-semibold text-sm">{formatCurrency(financials.impostoRenda / Math.max(1, financials.numClientes))}</p>
            </div>
          </div>
        )}

        {/* Charts section - side by side */}
        {financials.faturamento > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart - Distribution */}
            <Card>
              <CardHeader className="py-3 pb-0">
                <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-center">
                  <div className="w-44 h-44">
                    <FinancialPieChart 
                      faturamento={financials.faturamento} 
                      gastosViagem={financials.gastosViagem} 
                      custosVariados={0}
                      custosRecorrentes={0}
                      proLabore={0}
                      impostoRenda={0}
                      lucroLiquido={financials.lucroLiquido} 
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Custos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <span>IR</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Lucro</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart - Breakdown comparison */}
            <Card>
              <CardHeader className="py-3 pb-0">
                <CardTitle className="text-sm font-medium">Comparativo</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart 
                    data={[
                      { name: 'Fat.', value: financials.faturamento, fill: '#10b981' },
                      { name: 'Custos', value: financials.gastosViagem, fill: '#ef4444' },
                      { name: 'IR', value: financials.impostoRenda, fill: '#6b7280' },
                      { name: 'Lucro', value: Math.max(0, financials.lucroLiquido), fill: '#3b82f6' },
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={10} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={45} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tour costs table */}
        <TourCostsTable />
      </div>
    );
  };

  // Monthly View - completely redesigned with minimalist approach
  const MonthlyView = () => {
    const financials = calculateMonthlyFinancials();
    const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
    const [year, month] = selectedMonth.split('-');
    const monthLabel = format(new Date(parseInt(year), parseInt(month) - 1), "MMMM 'de' yyyy", {
      locale: ptBR
    });

    // Calculate margin percentage
    const marginPercent = financials.faturamentoTotal > 0 ? financials.lucroLiquido / financials.faturamentoTotal * 100 : 0;

    // Simulated values based on cost toggles
    const allTogglesActive = Object.values(costToggles).every(v => v);
    const simGastosViagem = costToggles.gastosViagem ? financials.gastosViagem : 0;
    const simCustosVariados = costToggles.custosVariados ? financials.custosVariados : 0;
    const simCustosFixos = costToggles.custosFixos ? financials.custosRecorrentes : 0;
    const simProLabore = costToggles.proLabore ? financials.proLabore : 0;
    const simIR = costToggles.impostoRenda ? financials.impostoRenda : 0;
    const simGastosTotais = simGastosViagem + simCustosVariados + simCustosFixos + simProLabore + simIR;
    const simLucro = financials.faturamentoTotal - simGastosTotais;
    const simMargin = financials.faturamentoTotal > 0 ? (simLucro / financials.faturamentoTotal) * 100 : 0;
    
    return (
      <div className="space-y-6">
        {/* Clean Month Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-9 w-9 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold capitalize text-foreground">{monthLabel}</h2>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {financials.tourSummary.length} passeios
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {financials.clientesMes} clientes
                </span>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-9 w-9 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clean KPI Cards - recalculated based on toggles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Faturamento</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(financials.faturamentoTotal)}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-0 shadow-sm bg-card", !allTogglesActive && "ring-2 ring-blue-200")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {allTogglesActive ? 'Lucro Líquido' : '📊 Lucro Simulado'}
              </p>
              <p className={cn("text-2xl font-bold", simLucro >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatCurrency(simLucro)}
              </p>
            </CardContent>
          </Card>
          <Card className={cn("border-0 shadow-sm bg-card", !allTogglesActive && "ring-2 ring-blue-200")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {allTogglesActive ? 'Gastos Totais' : '📊 Gastos Simulados'}
              </p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(simGastosTotais)}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-0 shadow-sm bg-card", !allTogglesActive && "ring-2 ring-blue-200")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {allTogglesActive ? 'Margem' : '📊 Margem Simulada'}
              </p>
              <p className={cn("text-2xl font-bold", simMargin >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {simMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Distribuição do Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {financials.faturamentoTotal > 0 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="flex-1 w-full min-h-[200px]">
                    <FinancialPieChart 
                      faturamento={financials.faturamentoTotal} 
                      gastosViagem={simGastosViagem} 
                      custosVariados={simCustosVariados}
                      custosRecorrentes={simCustosFixos}
                      proLabore={simProLabore}
                      impostoRenda={simIR}
                      lucroLiquido={simLucro} 
                    />
                  </div>
                  <div className="flex flex-row md:flex-col gap-4 flex-wrap justify-center">
                    {[
                      { label: 'Viagens', color: 'bg-rose-500' },
                      { label: 'C. Variados', color: 'bg-amber-500' },
                      { label: 'Recorrentes', color: 'bg-blue-500' },
                      { label: 'Pró-Labore', color: 'bg-violet-500' },
                      { label: 'IR (6%)', color: 'bg-slate-400' },
                      { label: 'Lucro', color: 'bg-emerald-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        <div className={cn("w-3 h-3 rounded-full", item.color)} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Percent className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                Detalhamento de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[
                  { label: 'Gastos em Viagens', value: financials.gastosViagem, color: 'rose', toggleKey: 'gastosViagem' as const, percent: financials.faturamentoTotal > 0 ? financials.gastosViagem / financials.faturamentoTotal * 100 : 0, details: financials.gastosViagemDetails },
                  { label: 'Custos Variados', value: financials.custosVariados, color: 'amber', toggleKey: 'custosVariados' as const, percent: financials.faturamentoTotal > 0 ? financials.custosVariados / financials.faturamentoTotal * 100 : 0, details: financials.custosVariadosDetails },
                  { label: 'Custos Fixos', value: financials.custosRecorrentes, color: 'blue', toggleKey: 'custosFixos' as const, percent: financials.faturamentoTotal > 0 ? financials.custosRecorrentes / financials.faturamentoTotal * 100 : 0, details: financials.custosFixosDetails },
                  { label: 'Pró-Labore', value: financials.proLabore, color: 'violet', toggleKey: 'proLabore' as const, percent: financials.faturamentoTotal > 0 ? financials.proLabore / financials.faturamentoTotal * 100 : 0, details: financials.proLaboreDetails },
                  { label: 'IR (6%)', value: financials.impostoRenda, color: 'slate', toggleKey: 'impostoRenda' as const, percent: financials.faturamentoTotal > 0 ? financials.impostoRenda / financials.faturamentoTotal * 100 : 0, details: [] },
                ].map((item, index) => {
                  const isExpanded = expandedBreakdown === item.toggleKey;
                  const hasDetails = item.details && item.details.length > 0;
                  return (
                  <div key={index} className={cn("relative transition-opacity", !costToggles[item.toggleKey] && "opacity-40")}>
                    <div 
                      className={cn(
                        "absolute inset-y-0 left-0 opacity-[0.08]",
                        item.color === 'rose' && "bg-rose-500",
                        item.color === 'amber' && "bg-amber-500",
                        item.color === 'blue' && "bg-blue-500",
                        item.color === 'violet' && "bg-violet-500",
                        item.color === 'slate' && "bg-slate-500"
                      )} 
                      style={{ width: costToggles[item.toggleKey] ? `${Math.min(item.percent, 100)}%` : '0%' }} 
                    />
                    <div className="relative flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={costToggles[item.toggleKey]} 
                          onCheckedChange={(checked) => setCostToggles(prev => ({ ...prev, [item.toggleKey]: !!checked }))}
                          className={cn(
                            "h-4 w-4",
                            item.color === 'rose' && "data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
                            item.color === 'amber' && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                            item.color === 'blue' && "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
                            item.color === 'violet' && "data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500",
                            item.color === 'slate' && "data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500"
                          )}
                        />
                        <span 
                          className={cn("text-sm text-foreground", hasDetails && "cursor-pointer hover:underline")}
                          onClick={() => hasDetails && setExpandedBreakdown(isExpanded ? null : item.toggleKey)}
                        >
                          {item.label}
                        </span>
                        {hasDetails && (
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform cursor-pointer", isExpanded && "rotate-180")} onClick={() => setExpandedBreakdown(isExpanded ? null : item.toggleKey)} />
                        )}
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          item.color === 'rose' && "text-rose-600",
                          item.color === 'amber' && "text-amber-600",
                          item.color === 'blue' && "text-blue-600",
                          item.color === 'violet' && "text-violet-600",
                          item.color === 'slate' && "text-slate-600"
                        )}>{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">{item.percent.toFixed(1)}%</p>
                      </div>
                    </div>
                    {isExpanded && item.details && item.details.length > 0 && (
                      <div className="relative bg-muted/30 border-t border-border/30">
                        {item.details.map((detail, dIdx) => (
                          <div key={dIdx} className="flex items-center justify-between px-6 py-1.5 text-xs border-b border-border/20 last:border-b-0">
                            <span className="text-muted-foreground truncate max-w-[60%]">
                              {'tourName' in detail ? `${detail.name} — ${(detail as any).tourName}` : detail.name}
                            </span>
                            <span className="font-medium text-foreground">{formatCurrency(detail.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              
              {/* Lucro Bruto Footer */}
              <div className="px-4 py-3 bg-emerald-50 border-t flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium text-sm">Lucro Bruto</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(financials.lucroBrutoMes)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per Client Indicators - Clean version */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Indicadores por Cliente
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{financials.clientesMes} clientes</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { label: 'Faturamento', value: financials.faturamentoPorCliente, color: 'text-emerald-600' },
                { label: 'Lucro Líq.', value: financials.lucroLiquidoPorCliente, color: financials.lucroLiquidoPorCliente >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { label: 'Lucro Bruto', value: financials.lucroBrutoPorCliente, color: financials.lucroBrutoPorCliente >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { label: 'Gastos Tot.', value: financials.gastosTotaisPorCliente, color: 'text-rose-600' },
                { label: 'Viagens', value: financials.gastosViagemPorCliente, color: 'text-muted-foreground' },
                { label: 'C. Variados', value: financials.custosVariadosPorCliente, color: 'text-muted-foreground' },
                { label: 'Recorrentes', value: financials.custosRecorrentesPorCliente, color: 'text-muted-foreground' },
                { label: 'IR', value: financials.irPorCliente, color: 'text-muted-foreground' },
              ].map((item, index) => (
                <div key={index} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className={cn("text-sm font-semibold", item.color)}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tour summary table */}
        <TourSummaryTable summary={financials.tourSummary} />

        {/* Pró-Labore section */}
        <ProLaboreSection clientesMes={financials.clientesMes} />

        {/* Monthly general costs table */}
        <MonthlyGeneralCostsTable />

        {/* Recurring costs */}
        <RecurringCostsManager recurringCosts={recurringCosts} onRefresh={fetchRecurringCosts} />
      </div>
    );
  };
  // Balanço View
  // Balanco view
  const BalancoView = () => {
    const availableYears = useMemo(() => {
      const years = new Set<number>([2023, 2024, 2025]);
      tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
      allMonthlyGeneralCosts.forEach(c => years.add(c.year));
      const currentYear = new Date().getFullYear();
      years.add(currentYear);
      return Array.from(years).sort((a, b) => b - a);
    }, [tours, allMonthlyGeneralCosts]);
    return <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Balanço Anual - {selectedYear}</h3>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32 bg-white text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {availableYears.map(year => <SelectItem key={year} value={String(year)} className="text-foreground">{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <BalancoAnual tours={tours} reservations={reservations} allTourCosts={allTourCosts} allMonthlyGeneralCosts={allMonthlyGeneralCosts} recurringCosts={recurringCosts} allCostPayments={allCostPayments} selectedYear={selectedYear} showAnaliseGrafica={false} useHistoricalOnly={selectedYear < new Date().getFullYear()} />
      </div>;
  };

  // Analise Grafica view (separate tab)
  const AnaliseGraficaView = () => {
    const availableYears = useMemo(() => {
      const years = new Set<number>([2023, 2024, 2025]);
      tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
      allMonthlyGeneralCosts.forEach(c => years.add(c.year));
      const currentYear = new Date().getFullYear();
      years.add(currentYear);
      return Array.from(years).sort((a, b) => b - a);
    }, [tours, allMonthlyGeneralCosts]);
    return <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Análise Gráfica - {selectedYear}</h3>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32 bg-white text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {availableYears.map(year => <SelectItem key={year} value={String(year)} className="text-foreground">{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <BalancoAnaliseGrafica tours={tours} reservations={reservations} allTourCosts={allTourCosts} allMonthlyGeneralCosts={allMonthlyGeneralCosts} selectedYear={selectedYear} />
      </div>;
  };
  // Dashboard view
  const DashboardView = () => {
    const availableYears = useMemo(() => {
      const years = new Set<number>([2023, 2024, 2025]);
      tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
      allMonthlyGeneralCosts.forEach(c => years.add(c.year));
      const currentYear = new Date().getFullYear();
      years.add(currentYear);
      return Array.from(years).sort((a, b) => b - a);
    }, [tours, allMonthlyGeneralCosts]);
    return <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dashboard Financeiro - {selectedYear}</h3>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32 bg-white text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {availableYears.map(year => <SelectItem key={year} value={String(year)} className="text-primary">{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <FinanceiroDashboard tours={tours} reservations={reservations} allTourCosts={allTourCosts} allMonthlyGeneralCosts={allMonthlyGeneralCosts} recurringCosts={recurringCosts} selectedYear={selectedYear} />
      </div>;
  };
  // Historico View
  const HistoricoView = () => {
    const availableYears = useMemo(() => {
      const years = new Set<number>([2023, 2024, 2025]);
      tours.forEach(t => years.add(new Date(t.start_date).getFullYear()));
      allMonthlyGeneralCosts.forEach(c => years.add(c.year));
      const currentYear = new Date().getFullYear();
      years.add(currentYear);
      return Array.from(years).sort((a, b) => b - a);
    }, [tours, allMonthlyGeneralCosts]);
    return <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Histórico de Passeios - {selectedYear}</h3>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32 bg-white text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {availableYears.map(year => <SelectItem key={year} value={String(year)} className="text-foreground">{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <FinanceiroHistorico tours={tours} reservations={reservations} allTourCosts={allTourCosts} selectedYear={selectedYear} />
      </div>;
  };

  return <div className="space-y-4">
      {/* Content */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        {viewMode === 'diario' ? <FinanceiroDiario tours={tours} reservations={reservations} clientes={clientes} /> :
         viewMode === 'analise' ? <FinanceiroAnaliseInteligente tours={tours} reservations={reservations} allTourCosts={allTourCosts} allMonthlyGeneralCosts={allMonthlyGeneralCosts} /> :
         viewMode === 'comparacao' ? <FinanceiroComparacao tours={tours} reservations={reservations} allTourCosts={allTourCosts} allMonthlyGeneralCosts={allMonthlyGeneralCosts} /> :
         viewMode === 'dashboard' ? <DashboardView /> : 
         viewMode === 'passeio' ? <TourView /> : 
         viewMode === 'balanco' ? <BalancoView /> : 
         viewMode === 'grafica' ? <AnaliseGraficaView /> :
         viewMode === 'historico' ? <HistoricoView /> :
         <MonthlyView />}
      </ScrollArea>
    </div>;
};
export default FinanceiroTab;