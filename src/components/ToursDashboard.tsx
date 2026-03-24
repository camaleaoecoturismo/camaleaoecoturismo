import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, Clock, TrendingUp, MapPin, Search, ArrowUpDown, BarChart3, CheckSquare, Gift, PartyPopper, UserPlus, Check, CheckCheck, Bell, ClipboardList, MessageCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { differenceInYears, format, parseISO, getMonth, getYear, setYear, differenceInDays, isSameDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
interface ToursDashboardProps {
  tours: Tour[];
}
interface NovoInscrito {
  id: string;
  tour_id: string;
  data_reserva: string;
  payment_status: string;
  valor_pago: number | null;
  valor_total_com_opcionais: number | null;
  numero_participantes: number;
  selected_optional_items: any;
  adicionais: any;
  tour: {
    name: string;
    start_date: string;
  };
  cliente: {
    nome_completo: string;
    whatsapp: string;
  };
  // Abandonment tracking info
  abandonment_info?: {
    step_reached: number;
    last_field: string | null;
  } | null;
}
interface Reserva {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  data_reserva: string;
  numero_participantes: number;
  valor_passeio?: number;
  valor_pago?: number;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }>;
  card_fee_amount?: number;
  payment_method?: string;
}
interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  quadrant: string;
  tour_id: string | null;
  assignee: string | null;
  amanda_status: string | null;
}
interface Cliente {
  id: string;
  nome_completo: string;
  whatsapp: string;
  data_nascimento: string;
}
interface WaitlistEntry {
  id: string;
  tour_id: string;
  nome_completo: string;
  numero_vagas: number;
  whatsapp: string;
  status: string;
  created_at: string;
  tour?: {
    name: string;
  };
}
type SortField = 'name' | 'start_date' | 'vagas_restantes' | 'ocupacao' | 'dias_restantes';
type SortDirection = 'asc' | 'desc';
const ToursDashboard: React.FC<ToursDashboardProps> = ({
  tours
}) => {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [comparisonMode, setComparisonMode] = useState<'prev_month' | 'same_month_last_year' | 'avg_3months' | 'avg_all'>('prev_month');
  const [periodFilter, setPeriodFilter] = useState('proximos_30');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [daysFilter, setDaysFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [markingAsSeen, setMarkingAsSeen] = useState<string | null>(null);
  const [markingAllAsSeen, setMarkingAllAsSeen] = useState(false);

  // Fetch new subscribers (unseen reservations - only PAID ones)
  const {
    data: novosInscritos = [],
    refetch: refetchNovosInscritos
  } = useQuery({
    queryKey: ['novos-inscritos'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('reservas').select(`
          id,
          tour_id,
          data_reserva,
          payment_status,
          valor_pago,
          valor_total_com_opcionais,
          numero_participantes,
          selected_optional_items,
          adicionais,
          tour:tours!fk_reservas_tour(name, start_date),
          cliente:clientes!fk_reservas_cliente(nome_completo, whatsapp)
        `)
        .eq('seen_by_admin', false)
        .eq('payment_status', 'pago')
        .order('data_reserva', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as NovoInscrito[];
    }
  });

  // Fetch form abandonment attempts (people who started but didn't complete/pay)
  // Only show attempts where we have at least nome AND whatsapp
  const {
    data: tentativasInscricao = [],
    refetch: refetchTentativas
  } = useQuery({
    queryKey: ['tentativas-inscricao'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('form_abandonment_tracking')
        .select('*')
        .eq('completed', false)
        .eq('seen_by_admin', false)
        .not('nome', 'is', null)
        .not('whatsapp', 'is', null)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('last_activity_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      // Also filter out empty strings
      return (data || []).filter(item => item.nome?.trim() && item.whatsapp?.trim());
    }
  });

  const [markingTentativaAsSeen, setMarkingTentativaAsSeen] = useState<string | null>(null);

  // Mark single abandonment attempt as seen
  const markTentativaAsSeen = async (tentativaId: string) => {
    setMarkingTentativaAsSeen(tentativaId);
    try {
      const { error } = await supabase
        .from('form_abandonment_tracking')
        .update({ seen_by_admin: true })
        .eq('id', tentativaId);
      if (error) throw error;
      refetchTentativas();
    } catch (error: any) {
      toast({
        title: "Erro ao marcar como visto",
        variant: "destructive"
      });
    } finally {
      setMarkingTentativaAsSeen(null);
    }
  };

  // Mark single reservation as seen
  const markAsSeen = async (reservaId: string) => {
    setMarkingAsSeen(reservaId);
    try {
      const {
        error
      } = await supabase.from('reservas').update({
        seen_by_admin: true
      }).eq('id', reservaId);
      if (error) throw error;
      refetchNovosInscritos();
    } catch (error: any) {
      toast({
        title: "Erro ao marcar como visto",
        variant: "destructive"
      });
    } finally {
      setMarkingAsSeen(null);
    }
  };

  // Mark all reservations as seen
  const markAllAsSeen = async () => {
    if (novosInscritos.length === 0) return;
    setMarkingAllAsSeen(true);
    try {
      const ids = novosInscritos.map(r => r.id);
      const {
        error
      } = await supabase.from('reservas').update({
        seen_by_admin: true
      }).in('id', ids);
      if (error) throw error;
      refetchNovosInscritos();
      toast({
        title: `${ids.length} inscrito(s) marcado(s) como visto(s)`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao marcar todos como vistos",
        variant: "destructive"
      });
    } finally {
      setMarkingAllAsSeen(false);
    }
  };

  // Fetch all reservations
  const {
    data: reservas = [],
    refetch: refetchReservas
  } = useQuery({
    queryKey: ['all-reservas-dashboard'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('reservas').select('id, tour_id, status, payment_status, data_reserva, numero_participantes, valor_passeio, valor_pago, selected_optional_items, card_fee_amount, payment_method');
      if (error) throw error;
      return data as Reserva[];
    }
  });

  // Real-time subscription for reservas updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-reservas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas'
        },
        () => {
          console.log('Dashboard: Reservas updated, refetching...');
          refetchReservas();
          refetchNovosInscritos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchReservas, refetchNovosInscritos]);

  // Fetch all tasks
  const {
    data: tasks = []
  } = useQuery({
    queryKey: ['all-tasks-dashboard'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('tasks').select('id, title, status, due_date, quadrant, tour_id, assignee, amanda_status');
      if (error) throw error;
      return data as Task[];
    }
  });

  // Fetch all clients for birthdays
  const {
    data: clientes = []
  } = useQuery({
    queryKey: ['all-clientes-birthdays'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('clientes').select('id, nome_completo, whatsapp, data_nascimento');
      if (error) throw error;
      return data as Cliente[];
    }
  });

  // Fetch waitlist entries
  const {
    data: waitlistEntries = []
  } = useQuery({
    queryKey: ['waitlist-entries-dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const {
        data,
        error
      } = await supabase.from('waitlist_entries').select(`
          id,
          tour_id,
          nome_completo,
          numero_vagas,
          whatsapp,
          status,
          created_at,
          tour:tours!waitlist_entries_tour_id_fkey(name, start_date)
        `).eq('status', 'pendente').order('created_at', {
        ascending: true
      });
      if (error) throw error;
      // Filter to only include entries for future tours
      const filtered = (data || []).filter((entry: any) => {
        const tourStartDate = entry.tour?.start_date;
        return tourStartDate && tourStartDate >= today;
      });
      return filtered as unknown as WaitlistEntry[];
    }
  });

  // Filter future tours only
  const futureTours = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      return startDate >= today && tour.is_active;
    });
  }, [tours]);

  // Filter past tours from the current year
  const pastTours = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    return tours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      return startDate < today && startDate.getFullYear() === currentYear;
    }).sort((a, b) => new Date(b.start_date + 'T12:00:00').getTime() - new Date(a.start_date + 'T12:00:00').getTime());
  }, [tours]);

  // Calculate past tour statistics
  const pastTourStats = useMemo(() => {
    return pastTours.map(tour => {
      const tourReservas = reservas.filter(r => r.tour_id === tour.id);
      const reservasConfirmadas = tourReservas.filter(r => r.status === 'confirmada' || r.status === 'confirmado');
      const confirmados = reservasConfirmadas.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
      
      const isCardPaymentMethod = (method?: string | null) => {
        const m = (method || '').toLowerCase();
        return m === 'credit_card' || m === 'cartao' || m === 'card';
      };
      
      const faturamentoReal = reservasConfirmadas.reduce((sum, r) => {
        const rawPago = r.valor_pago || 0;
        if (rawPago === 0) {
          const valorBase = r.valor_passeio || 0;
          const valorOpcionais = Array.isArray(r.selected_optional_items) 
            ? r.selected_optional_items.reduce((optSum: number, opt: any) => optSum + ((opt.price || 0) * (opt.quantity || 1)), 0)
            : 0;
          return sum + valorBase + valorOpcionais;
        }
        const cardFee = r.card_fee_amount || 0;
        let pagoBase = rawPago;
        if (isCardPaymentMethod(r.payment_method) && cardFee > 0) {
          pagoBase = Math.max(0, rawPago - cardFee);
        }
        return sum + pagoBase;
      }, 0);
      
      const capacidade = tour.vagas ?? 40;
      const ocupacao = capacidade > 0 ? confirmados / capacidade * 100 : 0;

      return {
        ...tour,
        confirmados,
        capacidade,
        ocupacao,
        faturamentoReal
      };
    });
  }, [pastTours, reservas]);

  // Calculate tour statistics
  const tourStats = useMemo(() => {
    return futureTours.map(tour => {
      const tourReservas = reservas.filter(r => r.tour_id === tour.id);
      const reservasConfirmadas = tourReservas.filter(r => r.status === 'confirmada' || r.status === 'confirmado');
      const confirmados = reservasConfirmadas.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
      const aguardando = tourReservas.filter(r => r.status === 'pendente').reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
      
      // Calculate real revenue from confirmed reservations (paid amounts)
      // Uses same logic as FinanceiroTab.calculateTourFinancials for consistency
      const isCardPaymentMethod = (method?: string | null) => {
        const m = (method || '').toLowerCase();
        return m === 'credit_card' || m === 'cartao' || m === 'card';
      };
      
      const faturamentoReal = reservasConfirmadas.reduce((sum, r) => {
        const rawPago = r.valor_pago || 0;
        if (rawPago === 0) {
          // No payment yet, use expected value
          const valorBase = r.valor_passeio || 0;
          const valorOpcionais = Array.isArray(r.selected_optional_items) 
            ? r.selected_optional_items.reduce((optSum: number, opt: any) => optSum + ((opt.price || 0) * (opt.quantity || 1)), 0)
            : 0;
          return sum + valorBase + valorOpcionais;
        }
        
        // Has payment - calculate base (without card fees)
        const cardFee = r.card_fee_amount || 0;
        let pagoBase = rawPago;
        if (isCardPaymentMethod(r.payment_method) && cardFee > 0) {
          pagoBase = Math.max(0, rawPago - cardFee);
        }
        
        return sum + pagoBase;
      }, 0);
      
      // Use tour.vagas from database, fallback to 40 if not defined
      const capacidade = tour.vagas ?? 40;
      const vagasRestantes = Math.max(0, capacidade - confirmados);
      const ocupacao = capacidade > 0 ? confirmados / capacidade * 100 : 0;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const diasRestantes = todayStr === tour.start_date ? 0 : Math.round((new Date(tour.start_date + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
      let status = 'aberto';
      if (vagasRestantes === 0) status = 'lotado';else if (vagasRestantes <= 5) status = 'quase_lotado';else if (!tour.is_active) status = 'encerrado';
      return {
        ...tour,
        confirmados,
        aguardando,
        capacidade,
        vagasRestantes,
        ocupacao,
        diasRestantes,
        statusOcupacao: status,
        faturamentoReal
      };
    });
  }, [futureTours, reservas]);

  // Apply filters
  const filteredTours = useMemo(() => {
    let filtered = [...tourStats];

    // Status filter
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(t => t.statusOcupacao === statusFilter);
    }

    // Days filter
    if (daysFilter !== 'todos') {
      const days = parseInt(daysFilter);
      filtered = filtered.filter(t => t.diasRestantes <= days);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || t.city.toLowerCase().includes(search));
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'start_date':
          comparison = new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime();
          break;
        case 'vagas_restantes':
          comparison = a.vagasRestantes - b.vagasRestantes;
          break;
        case 'ocupacao':
          comparison = a.ocupacao - b.ocupacao;
          break;
        case 'dias_restantes':
          comparison = a.diasRestantes - b.diasRestantes;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [tourStats, statusFilter, daysFilter, searchTerm, sortField, sortDirection]);

  // Summary metrics
  const metrics = useMemo(() => {
    const totalConfirmados = tourStats.reduce((sum, t) => sum + t.confirmados, 0);
    const totalAguardando = tourStats.reduce((sum, t) => sum + t.aguardando, 0);
    const totalVagasRestantes = tourStats.reduce((sum, t) => sum + t.vagasRestantes, 0);
    const totalCapacidade = tourStats.reduce((sum, t) => sum + t.capacidade, 0);
    const mediaOcupacao = totalCapacidade > 0 ? totalConfirmados / totalCapacidade * 100 : 0;
    const proximoPasseio = tourStats.length > 0 ? Math.min(...tourStats.map(t => t.diasRestantes)) : 0;

    const now = new Date();
    const mesAtualStats = tourStats.filter(t => {
      const d = new Date(t.start_date + 'T12:00:00');
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const mesAtualConfirmados = mesAtualStats.reduce((sum, t) => sum + t.confirmados, 0);
    const mesAtualCapacidade = mesAtualStats.reduce((sum, t) => sum + t.capacidade, 0);
    const ocupacaoMesAtual = mesAtualCapacidade > 0 ? mesAtualConfirmados / mesAtualCapacidade * 100 : 0;

    return {
      totalPasseios: tourStats.length,
      totalVagasRestantes,
      totalConfirmados,
      totalAguardando,
      mediaOcupacao,
      ocupacaoMesAtual,
      proximoPasseio
    };
  }, [tourStats]);

  // Alerts
  const alerts = useMemo(() => {
    const poucasVagas = tourStats.filter(t => t.vagasRestantes > 0 && t.vagasRestantes <= 5);
    const muitosPendentes = tourStats.filter(t => t.aguardando >= 5);
    const proximosComVagas = tourStats.filter(t => t.diasRestantes <= 7 && t.vagasRestantes > 10);
    return {
      poucasVagas,
      muitosPendentes,
      proximosComVagas
    };
  }, [tourStats]);

  // Task Alerts - Apenas tarefas da Amanda
  const taskAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Filtra apenas tarefas da Amanda (assignee === 'amanda' ou status === 'para_amanda')
    const amandaTasks = tasks.filter(t => t.assignee === 'amanda' || t.status === 'para_amanda');
    const pendingTasks = amandaTasks.filter(t => t.amanda_status !== 'concluido' && t.status !== 'concluido');
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    const dueTodayTasks = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });
    const dueThisWeekTasks = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7;
    });
    const urgentImportant = pendingTasks.filter(t => t.quadrant === 'urgent_important');
    const noDeadlineTasks = pendingTasks.filter(t => !t.due_date && t.status !== 'concluido');
    return {
      total: pendingTasks.length,
      overdue: overdueTasks,
      dueToday: dueTodayTasks,
      dueThisWeek: dueThisWeekTasks,
      urgentImportant,
      noDeadline: noDeadlineTasks
    };
  }, [tasks]);

  // Birthday Alerts
  const birthdayAlerts = useMemo(() => {
    const today = new Date();
    const currentYear = getYear(today);
    interface UpcomingBirthday {
      cliente: Cliente;
      daysUntil: number;
      age: number;
    }
    const todaysBirthdays: UpcomingBirthday[] = [];
    const upcomingBirthdays: UpcomingBirthday[] = [];
    clientes.forEach(cliente => {
      if (!cliente.data_nascimento) return;
      try {
        const birthDate = parseISO(cliente.data_nascimento);
        let birthdayThisYear = setYear(birthDate, currentYear);
        if (isBefore(birthdayThisYear, today) && !isSameDay(birthdayThisYear, today)) {
          birthdayThisYear = setYear(birthDate, currentYear + 1);
        }
        const daysUntil = differenceInDays(birthdayThisYear, today);
        const age = differenceInYears(birthdayThisYear, birthDate);
        if (isSameDay(birthdayThisYear, today)) {
          todaysBirthdays.push({
            cliente,
            daysUntil: 0,
            age
          });
        } else if (daysUntil > 0 && daysUntil <= 2) {
          upcomingBirthdays.push({
            cliente,
            daysUntil,
            age
          });
        }
      } catch {}
    });
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    return {
      today: todaysBirthdays,
      upcoming: upcomingBirthdays
    };
  }, [clientes]);

  // Waitlist Alerts
  const waitlistAlerts = useMemo(() => {
    // Group waitlist entries by tour
    const byTour: Record<string, {
      tourName: string;
      tourDate: string;
      entries: WaitlistEntry[];
      totalVagas: number;
    }> = {};
    waitlistEntries.forEach(entry => {
      const tourId = entry.tour_id;
      const tourData = entry.tour as {
        name: string;
        start_date: string;
      } | null;
      const tourName = tourData?.name || 'Tour desconhecido';
      const tourDate = tourData?.start_date || '';
      if (!byTour[tourId]) {
        byTour[tourId] = {
          tourName,
          tourDate,
          entries: [],
          totalVagas: 0
        };
      }
      byTour[tourId].entries.push(entry);
      byTour[tourId].totalVagas += entry.numero_vagas;
    });
    return {
      total: waitlistEntries.length,
      totalVagas: waitlistEntries.reduce((sum, e) => sum + e.numero_vagas, 0),
      byTour: Object.values(byTour).sort((a, b) => b.entries.length - a.entries.length)
    };
  }, [waitlistEntries]);
  const chartDataParticipants = useMemo(() => {
    return filteredTours.slice(0, 10).map(tour => ({
      name: tour.name.length > 20 ? tour.name.substring(0, 20) + '...' : tour.name,
      confirmados: tour.confirmados,
      vagasDisponiveis: tour.vagasRestantes
    }));
  }, [filteredTours]);

  // Chart data - current month vs comparison (configurable)
  const { chartDataComparacao, currentMonthName, compareLabelName } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDay = now.getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const currentMonthName = MONTHS_PT[currentMonth];

    // Build current month counts
    const currentCounts: Record<number, number> = {};
    for (let d = 1; d <= daysInCurrentMonth; d++) currentCounts[d] = 0;
    reservas.forEach(r => {
      const date = new Date(r.data_reserva);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth)
        currentCounts[date.getDate()] = (currentCounts[date.getDate()] || 0) + (r.numero_participantes || 1);
    });

    let compareCounts: Record<number, number> = {};
    let compareLabelName = '';
    let maxDays = daysInCurrentMonth;

    if (comparisonMode === 'prev_month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);
      for (let d = 1; d <= maxDays; d++) compareCounts[d] = 0;
      reservas.forEach(r => {
        const date = new Date(r.data_reserva);
        if (date.getFullYear() === prevYear && date.getMonth() === prevMonth)
          compareCounts[date.getDate()] = (compareCounts[date.getDate()] || 0) + (r.numero_participantes || 1);
      });
      compareLabelName = MONTHS_PT[prevMonth];

    } else if (comparisonMode === 'same_month_last_year') {
      const lastYear = currentYear - 1;
      const daysInThatMonth = new Date(lastYear, currentMonth + 1, 0).getDate();
      maxDays = Math.max(daysInCurrentMonth, daysInThatMonth);
      for (let d = 1; d <= maxDays; d++) compareCounts[d] = 0;
      reservas.forEach(r => {
        const date = new Date(r.data_reserva);
        if (date.getFullYear() === lastYear && date.getMonth() === currentMonth)
          compareCounts[date.getDate()] = (compareCounts[date.getDate()] || 0) + (r.numero_participantes || 1);
      });
      compareLabelName = `${MONTHS_PT[currentMonth]} ${lastYear}`;

    } else if (comparisonMode === 'avg_3months') {
      // Average of last 3 months per day
      const months3: { y: number; m: number }[] = [];
      for (let i = 1; i <= 3; i++) {
        const m = ((currentMonth - i) % 12 + 12) % 12;
        const y = currentMonth - i < 0 ? currentYear - 1 : currentYear;
        months3.push({ y, m });
      }
      const daySums: Record<number, number> = {};
      const dayCounts: Record<number, number> = {};
      reservas.forEach(r => {
        const date = new Date(r.data_reserva);
        const ry = date.getFullYear(); const rm = date.getMonth(); const rd = date.getDate();
        if (months3.some(x => x.y === ry && x.m === rm)) {
          daySums[rd] = (daySums[rd] || 0) + (r.numero_participantes || 1);
          dayCounts[rd] = (dayCounts[rd] || 0) + 1;
        }
      });
      for (let d = 1; d <= daysInCurrentMonth; d++)
        compareCounts[d] = daySums[d] ? Math.round((daySums[d] / 3) * 10) / 10 : 0;
      compareLabelName = 'Média 3 meses';

    } else if (comparisonMode === 'avg_all') {
      // Overall daily average across all months in data
      const monthBuckets: Record<string, Record<number, number>> = {};
      reservas.forEach(r => {
        const date = new Date(r.data_reserva);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (`${currentYear}-${currentMonth}` === key) return; // exclude current month
        if (!monthBuckets[key]) monthBuckets[key] = {};
        const d = date.getDate();
        monthBuckets[key][d] = (monthBuckets[key][d] || 0) + (r.numero_participantes || 1);
      });
      const numMonths = Object.keys(monthBuckets).length || 1;
      const daySums: Record<number, number> = {};
      Object.values(monthBuckets).forEach(bucket => {
        Object.entries(bucket).forEach(([d, v]) => { daySums[+d] = (daySums[+d] || 0) + v; });
      });
      for (let d = 1; d <= daysInCurrentMonth; d++)
        compareCounts[d] = daySums[d] ? Math.round((daySums[d] / numMonths) * 10) / 10 : 0;
      compareLabelName = 'Média geral';
    }

    const chartDataComparacao = Array.from({ length: maxDays }, (_, i) => {
      const day = i + 1;
      return {
        dia: day,
        mesAtual: day <= daysInCurrentMonth && day <= todayDay ? currentCounts[day] : null,
        mesAnterior: day <= maxDays ? (compareCounts[day] ?? null) : null,
      };
    });

    return { chartDataComparacao, currentMonthName, compareLabelName };
  }, [reservas, comparisonMode]);
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      weekday: 'short'
    });
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lotado':
        return <Badge className="bg-red-500 text-white">Lotado</Badge>;
      case 'quase_lotado':
        return <Badge className="bg-yellow-500 text-white">Quase Lotado</Badge>;
      case 'encerrado':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return <Badge className="bg-green-500 text-white">Aberto</Badge>;
    }
  };
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['novosInscritos'] });
    queryClient.invalidateQueries({ queryKey: ['reservas'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['waitlistEntries'] });
    toast({
      title: "Dados atualizados",
      description: "Todas as informações foram recarregadas."
    });
  };

  return <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Passeios</h1>
            <p className="text-muted-foreground">Visão geral dos próximos passeios</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultimos_7">Últimos 7 dias</SelectItem>
              <SelectItem value="ultimos_30">Últimos 30 dias</SelectItem>
              <SelectItem value="ultimos_90">Últimos 90 dias</SelectItem>
              <SelectItem value="este_mes">Este mês</SelectItem>
              <SelectItem value="proximos_30">Próximos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="quase_lotado">Quase Lotado</SelectItem>
              <SelectItem value="lotado">Lotado</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Novos Inscritos (Pagos) */}
      <Card>
        <CardHeader className="pb-[6px]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Novos Inscritos (Pagos)
              {novosInscritos.length > 0 && <Badge className="bg-green-500 text-white">{novosInscritos.length}</Badge>}
            </CardTitle>
            {novosInscritos.length > 0 && <Button size="sm" variant="outline" onClick={markAllAsSeen} disabled={markingAllAsSeen} className="gap-1">
                <CheckCheck className="h-4 w-4" />
                {markingAllAsSeen ? 'Marcando...' : 'OK em todos'}
              </Button>}
          </div>
        </CardHeader>
        <CardContent>
          {novosInscritos.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum novo inscrito pago desde seu último acesso.
            </p> : <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {novosInscritos.map(inscrito => {
            const tourData = inscrito.tour as { name: string; start_date: string; } | null;
            const clienteData = inscrito.cliente as { nome_completo: string; whatsapp: string; } | null;
            const dataReserva = new Date(inscrito.data_reserva);
            
            const whatsappNumber = clienteData?.whatsapp?.replace(/\D/g, '') || '';
            const whatsappFormatted = whatsappNumber ? 
              `(${whatsappNumber.slice(0,2)}) ${whatsappNumber.slice(2,7)}-${whatsappNumber.slice(7)}` : '-';
            const whatsappLink = whatsappNumber ? 
              `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(`Olá ${clienteData?.nome_completo || ''}, sua reserva para ${tourData?.name || ''} foi confirmada! 🎉`)}` : '';
            
            return <div key={inscrito.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border gap-3">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">Passeio</span>
                        <span className="font-medium text-xs sm:text-sm">{tourData?.name || '-'}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">Participante</span>
                        <span className="text-xs sm:text-sm">{clienteData?.nome_completo || '-'}</span>
                        {inscrito.numero_participantes > 1 && <span className="text-xs text-muted-foreground ml-1">(+{inscrito.numero_participantes - 1})</span>}
                      </div>
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">WhatsApp</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm">{whatsappFormatted}</span>
                          {whatsappLink && (
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors" title="Abrir WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Valor</span>
                        <span className="text-green-600 font-medium text-xs sm:text-sm">
                          {(inscrito.valor_pago || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Reserva em</span>
                        <span className="text-xs">
                          {dataReserva.toLocaleDateString('pt-BR')} {dataReserva.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => markAsSeen(inscrito.id)} disabled={markingAsSeen === inscrito.id} className="shrink-0 h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 self-end sm:self-center">
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>;
          })}
            </div>}
        </CardContent>
      </Card>

      {/* Tentativas de Inscrição (Abandonos) */}
      <Card>
        <CardHeader className="pb-[6px]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Tentativas de Inscrição
              {tentativasInscricao.length > 0 && <Badge variant="secondary" className="text-orange-600 bg-orange-50 border border-orange-200">{tentativasInscricao.length}</Badge>}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Pessoas que iniciaram mas não concluíram o formulário</p>
        </CardHeader>
        <CardContent>
          {tentativasInscricao.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma tentativa de inscrição nos últimos 30 dias.
            </p> : <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {tentativasInscricao.map(tentativa => {
            const getStepName = (step: number) => {
              const stepNames: Record<number, string> = {
                1: 'Escolha do Pacote',
                2: 'Dados Pessoais', 
                3: 'Política de Cancelamento',
                4: 'Termos e Condições',
                5: 'Pagamento'
              };
              return stepNames[step] || `Etapa ${step}`;
            };
            
            const whatsappNumber = tentativa.whatsapp?.replace(/\D/g, '') || '';
            const whatsappFormatted = whatsappNumber ? 
              `(${whatsappNumber.slice(0,2)}) ${whatsappNumber.slice(2,7)}-${whatsappNumber.slice(7)}` : '-';
            const whatsappLink = whatsappNumber ? 
              `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(`Olá ${tentativa.nome || ''}, tudo bem? Vi que você iniciou uma reserva para o passeio ${tentativa.tour_name || ''}. Posso ajudar a concluir?`)}` : '';
            
            const lastActivity = new Date(tentativa.last_activity_at);
            
            return <div key={tentativa.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border gap-3">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">Passeio</span>
                        <span className="font-medium text-xs sm:text-sm">{tentativa.tour_name || '-'}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">Nome</span>
                        <span className="text-xs sm:text-sm">{tentativa.nome || '-'}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-muted-foreground text-xs block">WhatsApp</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm">{whatsappFormatted}</span>
                          {whatsappLink && (
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors" title="Resgatar pelo WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Desistiu em</span>
                        <div className="text-xs">
                          <span className="text-orange-600 font-medium">{getStepName(tentativa.step_reached)}</span>
                          {tentativa.last_field && (
                            <span className="text-muted-foreground block text-[10px]">
                              Campo: {tentativa.last_field}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Última atividade</span>
                        <span className="text-xs">
                          {lastActivity.toLocaleDateString('pt-BR')} {lastActivity.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => markTentativaAsSeen(tentativa.id)} disabled={markingTentativaAsSeen === tentativa.id} className="shrink-0 h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 self-end sm:self-center">
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>;
          })}
            </div>}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          
          
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Box 1: Passeios */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Passeios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {alerts.poucasVagas.length > 0 ? (
                <div className="pl-3 border-l-2 border-red-400 space-y-1">
                  <p className="text-xs font-semibold text-red-600">Poucas vagas (≤5)</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {alerts.poucasVagas.slice(0, 3).map(t => <p key={t.id}>{t.name}</p>)}
                    {alerts.poucasVagas.length > 3 && <p>+{alerts.poucasVagas.length - 3} mais</p>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum passeio com poucas vagas</p>
              )}

              {alerts.proximosComVagas.length > 0 && (
                <div className="pl-3 border-l-2 border-blue-400 space-y-1">
                  <p className="text-xs font-semibold text-blue-600">Próximos com vagas</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {alerts.proximosComVagas.slice(0, 3).map(t => <p key={t.id}>{t.name} · {t.diasRestantes}d</p>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Box 2: Tarefas */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-3.5 w-3.5" />
                Tarefas {taskAlerts.total > 0 && `· ${taskAlerts.total}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {taskAlerts.overdue.length > 0 && (
                <div className="pl-3 border-l-2 border-red-400 space-y-1">
                  <p className="text-xs font-semibold text-red-600">Atrasadas ({taskAlerts.overdue.length})</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {taskAlerts.overdue.slice(0, 3).map(t => <p key={t.id} className="truncate">{t.title}</p>)}
                    {taskAlerts.overdue.length > 3 && <p>+{taskAlerts.overdue.length - 3} mais</p>}
                  </div>
                </div>
              )}
              {taskAlerts.dueToday.length > 0 && (
                <div className="pl-3 border-l-2 border-orange-400 space-y-1">
                  <p className="text-xs font-semibold text-orange-600">Vencem hoje ({taskAlerts.dueToday.length})</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {taskAlerts.dueToday.slice(0, 3).map(t => <p key={t.id} className="truncate">{t.title}</p>)}
                  </div>
                </div>
              )}
              {taskAlerts.dueThisWeek.length > 0 && (
                <div className="pl-3 border-l-2 border-amber-400 space-y-1">
                  <p className="text-xs font-semibold text-amber-600">Esta semana ({taskAlerts.dueThisWeek.length})</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {taskAlerts.dueThisWeek.slice(0, 3).map(t => <p key={t.id} className="truncate">{t.title}</p>)}
                  </div>
                </div>
              )}
              {taskAlerts.urgentImportant.length > 0 && (
                <div className="pl-3 border-l-2 border-purple-400 space-y-1">
                  <p className="text-xs font-semibold text-purple-600">Urgente ({taskAlerts.urgentImportant.length})</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {taskAlerts.urgentImportant.slice(0, 2).map(t => <p key={t.id} className="truncate">{t.title}</p>)}
                  </div>
                </div>
              )}
              {taskAlerts.overdue.length === 0 && taskAlerts.dueToday.length === 0 && taskAlerts.dueThisWeek.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa urgente</p>
              )}
            </CardContent>
          </Card>

          {/* Box 3: Aniversários */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Gift className="h-3.5 w-3.5" />
                Aniversários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {birthdayAlerts.today.length > 0 && (
                <div className="pl-3 border-l-2 border-yellow-400 space-y-1">
                  <p className="text-xs font-semibold text-yellow-600">Hoje ({birthdayAlerts.today.length})</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {birthdayAlerts.today.map(({ cliente, age }) => (
                      <p key={cliente.id}>{cliente.nome_completo} · {age} anos</p>
                    ))}
                  </div>
                </div>
              )}
              {birthdayAlerts.upcoming.length > 0 && (
                <div className="pl-3 border-l-2 border-pink-300 space-y-1">
                  <p className="text-xs font-semibold text-pink-600">Próximos 2 dias</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {birthdayAlerts.upcoming.map(({ cliente, daysUntil, age }) => (
                      <p key={cliente.id}>
                        {cliente.nome_completo} · {age} anos
                        <span className="ml-1 text-[10px] text-muted-foreground/60">
                          {daysUntil === 1 ? 'amanhã' : `${daysUntil}d`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {birthdayAlerts.today.length === 0 && birthdayAlerts.upcoming.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum aniversário nos próximos 2 dias</p>
              )}
            </CardContent>
          </Card>

          {/* Box 4: Lista de Espera */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" />
                Lista de Espera {waitlistAlerts.total > 0 && `· ${waitlistAlerts.total}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {waitlistAlerts.byTour.length > 0 ? waitlistAlerts.byTour.slice(0, 5).map(({
                tourName,
                tourDate,
                entries,
                totalVagas
              }) => {
                const formattedDate = tourDate ? new Date(tourDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
                return (
                  <div key={tourName} className="pl-3 border-l-2 border-cyan-400 space-y-0.5">
                    <p className="text-xs font-medium text-foreground truncate">{tourName} {formattedDate && <span className="text-muted-foreground font-normal">· {formattedDate}</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{entries.length} pessoa{entries.length > 1 ? 's' : ''}</p>
                  </div>
                );
              }) : <p className="text-xs text-muted-foreground">Nenhuma pessoa na lista de espera</p>}
              {waitlistAlerts.byTour.length > 5 && <p className="text-xs text-muted-foreground">
                  +{waitlistAlerts.byTour.length - 5} passeios
                </p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Passeios Ativos</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">{metrics.totalPasseios}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Vagas Restantes</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">{metrics.totalVagasRestantes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Confirmados</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">{metrics.totalConfirmados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Tarefas Pendentes</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">{taskAlerts.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Ocupação Mês Atual</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">{metrics.ocupacaoMesAtual.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Próximo em</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-center">
              {metrics.proximoPasseio === 0 ? 'Hoje' : metrics.proximoPasseio === 1 ? '1 dia' : `${metrics.proximoPasseio} dias`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Participants per tour */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Inscritos por Passeio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[420px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataParticipants}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  barCategoryGap="38%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={95}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={value => value.length > 15 ? value.substring(0, 15) + '…' : value}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="confirmados" name="Confirmados" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="vagasDisponiveis" name="Vagas Disponíveis" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Current month vs comparison */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Inscrições por Mês
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentMonthName} vs {compareLabelName}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {([
                  { key: 'prev_month', label: 'Mês anterior' },
                  { key: 'same_month_last_year', label: 'Ano anterior' },
                  { key: 'avg_3months', label: 'Média 3m' },
                  { key: 'avg_all', label: 'Média geral' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setComparisonMode(opt.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      comparisonMode === opt.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[300px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataComparacao} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any, name: string) => [value ?? '-', name]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="mesAnterior"
                    name={compareLabelName}
                    stroke="#c4b5fd"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="mesAtual"
                    name={currentMonthName}
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tours Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-lg">Próximos Passeios</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Quick filters */}
              <div className="flex flex-wrap gap-1">
                {['todos', '7', '15', '30'].map(days => <Button key={days} variant={daysFilter === days ? 'default' : 'outline'} size="sm" onClick={() => setDaysFilter(days)} className="h-7 px-2 text-xs">
                    {days === 'todos' ? 'Todos' : `Até ${days}d`}
                  </Button>)}
              </div>
              
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar passeio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 w-full sm:w-[180px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Passeio
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('start_date')}>
                    <div className="flex items-center gap-1">
                      Data
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-center">Capacidade</TableHead>
                  <TableHead className="text-center">Confirmados</TableHead>
                  <TableHead className="text-center">Faturamento</TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('vagas_restantes')}>
                    <div className="flex items-center justify-center gap-1">
                      Vagas
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('ocupacao')}>
                    <div className="flex items-center justify-center gap-1">
                      Ocupação
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dias_restantes')}>
                    <div className="flex items-center justify-center gap-1">
                      Dias
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTours.length === 0 ? <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum passeio encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow> : filteredTours.map(tour => <TableRow key={tour.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {tour.name}
                        {tour.is_exclusive && <Badge variant="outline" className="ml-2 text-xs border-teal-500 text-teal-600">
                            Exclusivo
                          </Badge>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tour.start_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tour.city}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{tour.capacidade}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-medium">{tour.confirmados}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-medium">
                          {(tour.faturamentoReal || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={tour.vagasRestantes <= 5 ? 'text-red-600 font-medium' : ''}>
                          {tour.vagasRestantes}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{
                        width: `${Math.min(tour.ocupacao, 100)}%`
                      }} />
                          </div>
                          <span className="text-sm">{tour.ocupacao.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {tour.diasRestantes === 0 ? <Badge className="bg-red-500">Hoje</Badge> : tour.diasRestantes === 1 ? <Badge className="bg-orange-500">Amanhã</Badge> : <span className="text-sm">{tour.diasRestantes}d</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(tour.statusOcupacao)}
                      </TableCell>
                    </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Past Tours Table */}
      {pastTourStats.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">Passeios Realizados em {new Date().getFullYear()}</CardTitle>
              <p className="text-sm text-muted-foreground">{pastTourStats.length} passeios realizados</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passeio</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-center">Capacidade</TableHead>
                    <TableHead className="text-center">Confirmados</TableHead>
                    <TableHead className="text-center">Faturamento</TableHead>
                    <TableHead className="text-center">Ocupação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastTourStats.map(tour => (
                    <TableRow key={tour.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {tour.name}
                        {tour.is_exclusive && (
                          <Badge variant="outline" className="ml-2 text-xs border-teal-500 text-teal-600">
                            Exclusivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tour.start_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tour.city}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{tour.capacidade}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-medium">{tour.confirmados}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-medium">
                          {(tour.faturamentoReal || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{
                              width: `${Math.min(tour.ocupacao, 100)}%`
                            }} />
                          </div>
                          <span className="text-sm">{tour.ocupacao.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>;
};
export default ToursDashboard;