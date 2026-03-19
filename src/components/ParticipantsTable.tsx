import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Trash2, MessageCircle, Eye, UserPlus, AlertCircle, Plus, UserCog, Download, Loader2, Ticket, Bus, ArrowRightLeft, X, CheckSquare, Square, RefreshCw, Search, Contact, Copy, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CustomColumn } from '@/components/CustomColumnsManager';
import AdditionalParticipantModal from '@/components/AdditionalParticipantModal';
import AddStaffMemberModal from '@/components/AddStaffMemberModal';
import ColumnConfigDropdown, { ColumnConfig } from '@/components/ColumnConfigDropdown';
import TourSeatMapManager from '@/components/transport/TourSeatMapManager';
import EditOptionalsModal from '@/components/EditOptionalsModal';
import ParticipantsFilteredExport from '@/components/ParticipantsFilteredExport';
import ParticipantAnalysis from '@/components/ParticipantAnalysis';
import { Checkbox } from '@/components/ui/checkbox';

export interface Reserva {
  id: string;
  reserva_numero?: string;
  data_reserva: string;
  data_pagamento?: string;
  valor_passeio: number;
  valor_pago: number;
  valor_total_com_opcionais: number;
  numero_participantes?: number;
  adicionais: Array<{ nome: string; valor: number }>;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }>;
  payment_status: string;
  payment_method?: string;
  capture_method?: string;
  mp_status?: string;
  installments?: number;
  card_fee_amount?: number;
  status: string;
  problema_saude: boolean;
  descricao_problema_saude?: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  ticket_enviado?: boolean;
  observacoes?: string;
  motivo_cancelamento?: string;
  data_cancelamento?: string;
  refund_amount?: number;
  refund_date?: string;
  refund_reason?: string;
  cliente: {
    id: string;
    nome_completo: string;
    cpf: string;
    email: string;
    whatsapp: string;
    data_nascimento: string;
  };
  ponto_embarque: {
    nome: string;
    endereco?: string;
  };
}

interface AdditionalParticipant {
  id: string;
  reserva_id: string;
  participant_index: number;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  problema_saude: boolean;
  descricao_problema_saude: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  nivel_condicionamento: string | null;
  assistencia_diferenciada: boolean;
  descricao_assistencia_diferenciada: string | null;
  plano_saude?: boolean;
  nome_plano_saude?: string | null;
  como_conheceu?: string | null;
  como_conheceu_outro?: string | null;
  ticket_enviado: boolean;
  observacoes: string | null;
  ponto_embarque_id: string | null;
  ponto_embarque_personalizado?: string | null;
  is_staff?: boolean;
  staff_role?: string | null;
  pricing_option_id?: string | null;
  pricing_option_name?: string | null;
  selected_optionals?: unknown;
}

interface TourCustomQuestion {
  id: string;
  question_text: string;
  standard_field_key: string | null;
  is_active: boolean;
}

interface TourOptionalItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface BoardingPoint {
  id: string;
  nome: string;
  endereco?: string;
}

interface ParticipantsTableProps {
  reservas: Reserva[];
  customColumns: CustomColumn[];
  customColumnValues: Record<string, Record<string, string>>;
  onViewDetails: (reserva: Reserva) => void;
  onEditReserva: (reservaId: string, updates: any) => Promise<void>;
  onToggleTicket: (reservaId: string, enviado: boolean) => void;
  onExcluir: (reservaId: string) => void;
  onWhatsApp: (whatsapp: string, nome: string) => void;
  onOpenPayments: (reservaId: string) => void;
  onSaveCustomColumn: (reservaId: string, columnId: string, value: string) => void;
  showCancelled?: boolean;
  tourOptionalItems?: TourOptionalItem[];
  boardingPoints?: BoardingPoint[];
  tourId?: string;
  tourName?: string;
  tourDate?: string;
  tourEndDate?: string | null;
  tourCity?: string;
  tourState?: string;
  tourVagas?: number | null;
  onRefreshReservas?: () => void;
}

interface ParticipantRow {
  type: 'titular' | 'additional' | 'staff';
  reserva: Reserva;
  participantIndex: number;
  additionalData?: AdditionalParticipant;
  globalIndex: number;
  isStaff?: boolean;
}

// Default column configuration - VERSION 6 (with como_conheceu column)
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'index', label: '#', visible: true, order: 0 },
  { id: 'ticket', label: 'Ticket', visible: true, order: 1 },
  { id: 'download_ticket', label: 'Ingresso', visible: true, order: 2 },
  { id: 'nome', label: 'Nome', visible: true, order: 3 },
  { id: 'pacote', label: 'Pacote', visible: true, order: 4 },
  { id: 'poltrona', label: 'Poltrona', visible: true, order: 5 },
  { id: 'cpf', label: 'CPF', visible: true, order: 6 },
  { id: 'email', label: 'Email', visible: true, order: 7 },
  { id: 'whatsapp', label: 'WhatsApp', visible: true, order: 8 },
  { id: 'data_nascimento', label: 'Nascimento', visible: true, order: 9 },
  { id: 'idade', label: 'Idade', visible: true, order: 10 },
  { id: 'condicionamento', label: 'Condicionamento', visible: true, order: 11 },
  { id: 'embarque', label: 'Embarque', visible: true, order: 12 },
  { id: 'valor_base', label: 'Valor Base', visible: true, order: 13 },
  { id: 'opcionais', label: 'Opcionais', visible: true, order: 14 },
  { id: 'valor_total', label: 'Valor Total', visible: true, order: 15 },
  { id: 'valor_pago', label: 'Valor Pago', visible: true, order: 16 },
  { id: 'saldo', label: 'Saldo', visible: true, order: 17 },
  { id: 'metodo', label: 'Método Pag.', visible: false, order: 18 },
  { id: 'parcelas', label: 'Parcelas', visible: false, order: 19 },
  { id: 'status_pagamento', label: 'Status Pag.', visible: true, order: 20 },
  { id: 'data_reserva', label: 'Inscrito em', visible: false, order: 21 },
  { id: 'emergencia_nome', label: 'Contato Emerg.', visible: false, order: 22 },
  { id: 'emergencia_telefone', label: 'Tel. Emerg.', visible: false, order: 23 },
  { id: 'problema_saude', label: 'Prob. Saúde', visible: false, order: 24 },
  { id: 'plano_saude', label: 'Plano Saúde', visible: false, order: 25 },
  { id: 'assistencia_diferenciada', label: 'Assist. Diferenciada', visible: false, order: 26 },
  { id: 'como_conheceu', label: 'Como Conheceu', visible: false, order: 27 },
  { id: 'observacoes', label: 'Observações', visible: false, order: 28 },
  { id: 'acoes', label: 'Ações', visible: true, order: 29 },
];

const STORAGE_KEY = 'participants_table_columns_v10';

const mergeColumnsWithDefaults = (incoming: ColumnConfig[]): ColumnConfig[] => {
  const incomingMap = new Map(incoming.map(c => [c.id, c]));

  const mergedBase = DEFAULT_COLUMNS.map(def => {
    const inc = incomingMap.get(def.id);
    if (!inc) return def;

    // Keep the current label from code; preserve user config (order/visible/styles)
    return { ...def, ...inc, label: def.label };
  });

  // Keep any extra columns that aren't part of our fixed defaults (e.g., dynamic custom columns)
  const extras = incoming.filter(c => !DEFAULT_COLUMNS.some(def => def.id === c.id));

  return [...mergedBase, ...extras];
};

const applyPresetToDefaults = (
  presetColumns: ColumnConfig[],
  existingCustomCols: ColumnConfig[]
): ColumnConfig[] => {
  const presetFixed = presetColumns.filter(c => !c.id.startsWith('custom_'));
  const presetMap = new Map(presetFixed.map(c => [c.id, c]));

  // Start from the full fixed defaults; if a column isn't in the preset, keep it but hide it.
  const fixedApplied = DEFAULT_COLUMNS.map(def => {
    const p = presetMap.get(def.id);
    if (p) return { ...def, ...p, label: def.label };
    return { ...def, visible: false };
  });

  // Preserve any unexpected fixed columns coming from preset (future-proof)
  const extras = presetFixed.filter(c => !DEFAULT_COLUMNS.some(def => def.id === c.id));

  // Merge dynamic custom columns (keep them available in the dropdown)
  const presetCustom = presetColumns.filter(c => c.id.startsWith('custom_'));
  const presetCustomMap = new Map(presetCustom.map(c => [c.id, c]));
  const mergedCustom = existingCustomCols.map(def => {
    const p = presetCustomMap.get(def.id);
    return p ? { ...def, ...p, label: def.label } : def;
  });

  // Include any preset custom columns we don't currently know about
  const missingCustom = presetCustom.filter(pc => !mergedCustom.some(mc => mc.id === pc.id));

  return [...fixedApplied, ...extras, ...mergedCustom, ...missingCustom];
};

const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  reservas,
  customColumns,
  customColumnValues,
  onViewDetails,
  onEditReserva,
  onToggleTicket,
  onExcluir,
  onWhatsApp,
  onOpenPayments,
  onSaveCustomColumn,
  showCancelled = false,
  tourOptionalItems = [],
  boardingPoints = [],
   tourId,
   tourName,
   tourDate,
   tourEndDate,
   tourCity,
   tourState,
   tourVagas,
   onRefreshReservas
}) => {
  const { toast } = useToast();
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [editingValueField, setEditingValueField] = useState<string | null>(null);
  const [additionalParticipants, setAdditionalParticipants] = useState<Record<string, AdditionalParticipant[]>>({});
  const [staffMembers, setStaffMembers] = useState<AdditionalParticipant[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [ticketTokens, setTicketTokens] = useState<Record<string, string>>({});
  const [loadingTicketTokens, setLoadingTicketTokens] = useState(false);
  const [generatingTickets, setGeneratingTickets] = useState(false);
  const [seatAssignments, setSeatAssignments] = useState<Record<string, string>>({});
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);
  const [hasTransportConfig, setHasTransportConfig] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<{
    open: boolean;
    reservaId: string;
    participantIndex: number;
    participant: AdditionalParticipant | null;
  }>({ open: false, reservaId: '', participantIndex: 0, participant: null });

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [nameSearch, setNameSearch] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [availableTours, setAvailableTours] = useState<Array<{ id: string; name: string; start_date: string }>>([]);
  const [targetTourId, setTargetTourId] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [addOptionalModal, setAddOptionalModal] = useState<{ 
    open: boolean; 
    reservaId: string;
  }>({ open: false, reservaId: '' });
  const [newOptional, setNewOptional] = useState({ id: '', nome: '', valor: '' });
  const [useCustomOptional, setUseCustomOptional] = useState(false);
  
  // Edit optionals modal state
  const [editOptionalsModal, setEditOptionalsModal] = useState<{
    open: boolean;
    reservaId: string;
    participantId?: string;
    participantName: string;
    currentOptionals: Array<{ id: string; name: string; price: number; quantity: number }>;
  }>({ open: false, reservaId: '', participantName: '', currentOptionals: [] });
  
  // Column widths for resizing
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_widths`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Collapsed columns state (persisted)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_collapsed`);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      localStorage.setItem(`${STORAGE_KEY}_collapsed`, JSON.stringify([...next]));
      return next;
    });
  };

  // Boarding point edit state
  const [editingBoarding, setEditingBoarding] = useState<{
    open: boolean;
    participantId: string | null;
    reservaId: string;
    isTitular: boolean;
    participantIndex: number;
    currentBoardingId: string | null;
    currentCustomBoarding: string | null;
  } | null>(null);
  const [boardingFormData, setBoardingFormData] = useState<{
    ponto_embarque_id: string;
    ponto_embarque_personalizado: string;
  }>({ ponto_embarque_id: '', ponto_embarque_personalizado: '' });

  // Dynamic custom questions and answers state
  const [tourCustomQuestions, setTourCustomQuestions] = useState<TourCustomQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, Record<string, string>>>({}); // reservaId -> questionId -> answer
  
  // Pricing options for the tour
  const [pricingOptions, setPricingOptions] = useState<Array<{ id: string; option_name: string; pix_price: number }>>([]);
  
  // Payment methods from parcelas (installments) per reserva
  const [reservaPaymentMethods, setReservaPaymentMethods] = useState<Record<string, string[]>>({});
  
  // Total paid from parcelas (sum of all installments) per reserva
  const [reservaTotalPago, setReservaTotalPago] = useState<Record<string, number>>({});

  // Column configuration state
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return mergeColumnsWithDefaults(JSON.parse(saved));
      } catch {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });

  // Save to localStorage when columns change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  // Combine static columns with dynamic custom question columns
  const allColumns = useMemo(() => {
    const dynamicCols: ColumnConfig[] = tourCustomQuestions.map((q, index) => ({
      id: `custom_${q.id}`,
      label: q.question_text.length > 20 ? q.question_text.substring(0, 20) + '...' : q.question_text,
      visible: false, // Default to hidden, user can enable
      order: 28 + index // Start after the last fixed column
    }));
    
    // Check if there are saved columns for dynamic questions
    const savedCols = columns.filter(c => c.id.startsWith('custom_'));
    const savedIds = new Set(savedCols.map(c => c.id));
    
    // Only add new dynamic columns that aren't already in saved config
    const newDynamicCols = dynamicCols.filter(dc => !savedIds.has(dc.id));
    
    // Merge: keep all fixed columns + saved dynamic + new dynamic
    const fixedCols = columns.filter(c => !c.id.startsWith('custom_'));
    return [...fixedCols, ...savedCols, ...newDynamicCols];
  }, [columns, tourCustomQuestions]);

  const visibleColumns = useMemo(() => 
    allColumns.filter(c => c.visible).sort((a, b) => a.order - b.order),
    [allColumns]
  );

  useEffect(() => {
    fetchAdditionalParticipants();
    fetchTicketTokens();
    fetchReservaPaymentMethods();
    if (tourId) {
      fetchSeatAssignments();
      checkTransportConfig();
      fetchTourCustomQuestions();
      fetchCustomAnswers();
      fetchPricingOptions();
    }
  }, [reservas, tourId]);

  // Fetch payment methods and total paid from parcelas for all reservas
  const fetchReservaPaymentMethods = async () => {
    const reservaIds = reservas.map(r => r.id);
    if (reservaIds.length === 0) return;

    const { data, error } = await supabase
      .from('reserva_parcelas')
      .select('reserva_id, forma_pagamento, valor')
      .in('reserva_id', reservaIds);
    
    if (!error && data) {
      const methodsMap: Record<string, string[]> = {};
      const totalPagoMap: Record<string, number> = {};
      
      data.forEach((item: { reserva_id: string; forma_pagamento: string; valor: number }) => {
        // Payment methods
        if (!methodsMap[item.reserva_id]) {
          methodsMap[item.reserva_id] = [];
        }
        if (item.forma_pagamento && !methodsMap[item.reserva_id].includes(item.forma_pagamento)) {
          methodsMap[item.reserva_id].push(item.forma_pagamento);
        }
        
        // Sum total paid from parcelas
        if (!totalPagoMap[item.reserva_id]) {
          totalPagoMap[item.reserva_id] = 0;
        }
        totalPagoMap[item.reserva_id] += Number((item as any).valor || 0);
      });
      
      setReservaPaymentMethods(methodsMap);
      setReservaTotalPago(totalPagoMap);
    }
  };

  // Fetch dynamic custom questions for this tour
  const fetchTourCustomQuestions = async () => {
    if (!tourId) return;
    const { data, error } = await supabase
      .from('tour_custom_questions')
      .select('id, question_text, standard_field_key, is_active')
      .eq('tour_id', tourId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    if (!error && data) {
      // Filter out questions that already have standard field keys (already shown in fixed columns)
      const customOnlyQuestions = data.filter(q => !q.standard_field_key);
      setTourCustomQuestions(customOnlyQuestions);
    }
  };

  // Fetch custom answers for all reservas
  const fetchCustomAnswers = async () => {
    if (!tourId) return;
    const reservaIds = reservas.map(r => r.id);
    if (reservaIds.length === 0) return;

    const { data, error } = await supabase
      .from('reservation_custom_answers')
      .select('reserva_id, question_id, answer')
      .in('reserva_id', reservaIds);
    
    if (!error && data) {
      const answersMap: Record<string, Record<string, string>> = {};
      data.forEach((item: any) => {
        if (!answersMap[item.reserva_id]) {
          answersMap[item.reserva_id] = {};
        }
        answersMap[item.reserva_id][item.question_id] = item.answer || '';
      });
      setCustomAnswers(answersMap);
    }
  };

  const checkTransportConfig = async () => {
    if (!tourId) return;
    const { data } = await supabase
      .from('tour_transport_config')
      .select('id')
      .eq('tour_id', tourId)
      .maybeSingle();
    setHasTransportConfig(!!data);
  };

  // Fetch pricing options for the tour
  const fetchPricingOptions = async () => {
    if (!tourId) return;
    const { data, error } = await supabase
      .from('tour_pricing_options')
      .select('id, option_name, pix_price')
      .eq('tour_id', tourId)
      .order('pix_price', { ascending: true });
    
    if (!error && data) {
      setPricingOptions(data);
    }
  };

  // Fetch available tours for transfer
  const fetchAvailableTours = async () => {
    // @ts-ignore - Supabase type instantiation issue
    const result = await supabase
      .from('tours')
      .select('id, name, start_date')
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
    const data = result.data as Array<{ id: string; name: string; start_date: string }> | null;
    if (!result.error && data) {
      // Exclude current tour
      setAvailableTours(data.filter(t => t.id !== tourId));
    }
  };

  // Selection helpers
  const getRowKey = (row: ParticipantRow): string => {
    if (row.additionalData?.id) {
      return `participant_${row.additionalData.id}`;
    }
    return `reserva_${row.reserva.id}_${row.participantIndex}`;
  };

  const toggleRowSelection = (rowKey: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      const reservaIds = new Set<string>();
      const participantIds = new Set<string>();

      selectedRows.forEach(key => {
        if (key.startsWith('participant_')) {
          participantIds.add(key.replace('participant_', ''));
        } else if (key.startsWith('reserva_')) {
          const parts = key.split('_');
          if (parts[2] === '1') {
            // Titular - delete entire reservation
            reservaIds.add(parts[1]);
          }
        }
      });

      // Delete participants
      if (participantIds.size > 0) {
        await supabase
          .from('reservation_participants')
          .delete()
          .in('id', Array.from(participantIds));
      }

      // Delete reservations (and cascade)
      if (reservaIds.size > 0) {
        for (const reservaId of reservaIds) {
          await onExcluir(reservaId);
        }
      }

      toast({ title: `${selectedRows.size} item(ns) excluído(s)` });
      setSelectedRows(new Set());
      setShowDeleteModal(false);
      fetchAdditionalParticipants();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkTransfer = async () => {
    if (!targetTourId) {
      toast({ title: "Selecione um passeio de destino", variant: "destructive" });
      return;
    }

    setBulkLoading(true);
    try {
      const reservaIds = new Set<string>();

      selectedRows.forEach(key => {
        if (key.startsWith('reserva_')) {
          const parts = key.split('_');
          if (parts[2] === '1') {
            reservaIds.add(parts[1]);
          }
        }
      });

      if (reservaIds.size === 0) {
        toast({ title: "Selecione ao menos um titular para transferir", variant: "destructive" });
        return;
      }

      // Update tour_id for selected reservations
      const { error } = await supabase
        .from('reservas')
        .update({ tour_id: targetTourId })
        .in('id', Array.from(reservaIds));

      if (error) throw error;

      toast({ title: `${reservaIds.size} reserva(s) transferida(s)` });
      setSelectedRows(new Set());
      setShowTransferModal(false);
      setTargetTourId('');
      // Parent component should refresh
      window.location.reload();
    } catch (error) {
      console.error('Error bulk transferring:', error);
      toast({ title: "Erro ao transferir", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchSeatAssignments = async () => {
    if (!tourId) return;
    const { data, error } = await supabase
      .from('participant_seat_assignments')
      .select(`
        participant_id,
        reserva_id,
        seat_id,
        vehicle_seats!inner(seat_label)
      `)
      .eq('tour_id', tourId);
    
    if (error) {
      console.error('Error fetching seat assignments:', error);
      return;
    }

    const assignmentMap: Record<string, string> = {};
    (data || []).forEach((assignment: any) => {
      if (assignment.participant_id) {
        assignmentMap[`participant_${assignment.participant_id}`] = assignment.vehicle_seats?.seat_label || '';
      } else if (assignment.reserva_id) {
        assignmentMap[`reserva_${assignment.reserva_id}`] = assignment.vehicle_seats?.seat_label || '';
      }
    });
    setSeatAssignments(assignmentMap);
  };

  const fetchAdditionalParticipants = async () => {
    const reservaIds = reservas.map(r => r.id);
    if (reservaIds.length === 0) return;

    const { data, error } = await supabase
      .from('reservation_participants')
      .select('*')
      .in('reserva_id', reservaIds);

    if (error) {
      console.error('Error fetching additional participants:', error);
      return;
    }

    const grouped: Record<string, AdditionalParticipant[]> = {};
    (data || []).forEach((p: AdditionalParticipant) => {
      if (!grouped[p.reserva_id]) {
        grouped[p.reserva_id] = [];
      }
      grouped[p.reserva_id].push(p);
    });
    setAdditionalParticipants(grouped);
  };

  const fetchTicketTokens = async () => {
    const reservaIds = reservas.map(r => r.id);
    if (reservaIds.length === 0) return;

    setLoadingTicketTokens(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, qr_token, reserva_id, participant_id, participant_name')
        .in('reserva_id', reservaIds);

      if (error) {
        console.error('Error fetching tickets:', error);
        return;
      }

      // Create a map: key is "reservaId_participantId" or "reservaId_participantName" -> qr_token
      const tokenMap: Record<string, string> = {};
      (data || []).forEach((ticket: any) => {
        if (ticket.participant_id) {
          tokenMap[`participant_${ticket.participant_id}`] = ticket.qr_token;
        }
        // Also map by reserva_id + participant_name for titular
        tokenMap[`reserva_${ticket.reserva_id}_${ticket.participant_name}`] = ticket.qr_token;
      });
      setTicketTokens(tokenMap);
    } finally {
      setLoadingTicketTokens(false);
    }
  };

  const getTicketToken = (row: ParticipantRow): string | null => {
    const { reserva, type, additionalData } = row;
    
    // For additional participants with ID
    if (additionalData?.id) {
      const token = ticketTokens[`participant_${additionalData.id}`];
      if (token) return token;
    }
    
    // For titular, match by reserva + name
    if (type === 'titular') {
      const token = ticketTokens[`reserva_${reserva.id}_${reserva.cliente.nome_completo}`];
      if (token) return token;
    }
    
    // For additional with name
    if (additionalData?.nome_completo) {
      const token = ticketTokens[`reserva_${reserva.id}_${additionalData.nome_completo}`];
      if (token) return token;
    }
    
    return null;
  };

  const openTicketInNewTab = (qrToken: string) => {
    window.open(`/ticket/${qrToken}`, '_blank');
  };

  const getParticipantContacts = () => {
    const contacts: { nome: string; whatsapp: string }[] = [];
    const allRows = [...confirmedPaymentRows, ...pendingPaymentRows];
    allRows.forEach(row => {
      const { reserva, type, additionalData } = row;
      const isTitular = type === 'titular';
      const nome = isTitular ? reserva.cliente.nome_completo : (additionalData?.nome_completo || '');
      const whatsapp = isTitular ? reserva.cliente.whatsapp : (additionalData?.whatsapp || '');
      // Only include if nome is a real name (not just digits) and whatsapp exists
      const isValidName = nome && !/^\d+$/.test(nome.replace(/\D/g, '').length > 8 ? '' : 'valid');
      if (nome && whatsapp && !/^\+?\d[\d\s\-().]+$/.test(nome.trim())) {
        contacts.push({ nome: nome.trim(), whatsapp });
      }
    });
    return contacts;
  };

  const downloadContactsVCard = () => {
    const contacts = getParticipantContacts();
    if (contacts.length === 0) {
      toast({ title: 'Nenhum contato', description: 'Não há participantes com dados de contato.', variant: 'destructive' });
      return;
    }
    const vcards = contacts.map(c => {
      const cleanPhone = c.whatsapp.replace(/\D/g, '');
      const phone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
      const fullName = `${c.nome} (camaleao)`;
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${fullName}`,
        `N:${fullName};;;;`,
        `TEL;TYPE=CELL:${phone}`,
        'END:VCARD'
      ].join('\r\n');
    }).join('\r\n');
    const blob = new Blob([vcards], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contatos_participantes.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Contatos baixados!', description: `${contacts.length} contatos exportados em formato vCard.` });
  };

  const copyContactsList = () => {
    const contacts = getParticipantContacts();
    if (contacts.length === 0) {
      toast({ title: 'Nenhum contato', description: 'Não há participantes com dados de contato.', variant: 'destructive' });
      return;
    }
    const formatPhone = (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 12) {
        const ddd = digits.substring(digits.length - 11, digits.length - 9);
        const p1 = digits.substring(digits.length - 9, digits.length - 4);
        const p2 = digits.substring(digits.length - 4);
        return `(${ddd}) ${p1}-${p2}`;
      }
      return phone;
    };
    const text = contacts.map(c => `${c.nome} (camaleao) - ${formatPhone(c.whatsapp)}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${contacts.length} contatos copiados para a área de transferência.` });
  };

  const generateMissingTickets = async () => {
    if (!tourId) return;
    
    setGeneratingTickets(true);
    let ticketsCreated = 0;

    try {
      // Fetch tour data
      const { data: tourData } = await supabase
        .from('tours')
        .select('id, name, start_date')
        .eq('id', tourId)
        .single();

      if (!tourData) {
        toast({ title: "Tour não encontrado", variant: "destructive" });
        return;
      }

      // Build all participants that need tickets
      const allParticipants: Array<{
        reservaId: string;
        participantId?: string;
        name: string;
        cpf?: string;
        boardingPointId?: string;
        reservaNumero?: string;
      }> = [];

      // Add titulars
      for (const reserva of reservas) {
        allParticipants.push({
          reservaId: reserva.id,
          name: reserva.cliente.nome_completo,
          cpf: reserva.cliente.cpf,
          boardingPointId: undefined, // Use reserva's ponto_embarque
          reservaNumero: reserva.reserva_numero
        });

        // Add additional participants (non-staff with name)
        const additionals = additionalParticipants[reserva.id] || [];
        for (const p of additionals) {
          if (p.nome_completo && !p.is_staff) {
            allParticipants.push({
              reservaId: reserva.id,
              participantId: p.id,
              name: p.nome_completo,
              cpf: p.cpf || undefined,
              boardingPointId: p.ponto_embarque_id || undefined,
              reservaNumero: reserva.reserva_numero
            });
          }
        }
      }

      // Check which participants already have tickets
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('participant_id, participant_name, reserva_id')
        .eq('tour_id', tourId);

      const existingSet = new Set<string>();
      (existingTickets || []).forEach((t: any) => {
        if (t.participant_id) {
          existingSet.add(`participant_${t.participant_id}`);
        }
        existingSet.add(`${t.reserva_id}_${t.participant_name}`);
      });

      // Filter participants that don't have tickets
      const needsTicket = allParticipants.filter(p => {
        if (p.participantId && existingSet.has(`participant_${p.participantId}`)) return false;
        if (existingSet.has(`${p.reservaId}_${p.name}`)) return false;
        return true;
      });

      if (needsTicket.length === 0) {
        toast({ title: "Todos os participantes já possuem tickets" });
        return;
      }

      // Get boarding points info
      const bpIds = [...new Set(needsTicket.map(p => p.boardingPointId).filter(Boolean))] as string[];
      let bpMap: Record<string, { nome: string; endereco?: string }> = {};
      
      if (bpIds.length > 0) {
        const { data: bpData } = await supabase
          .from('tour_boarding_points')
          .select('id, nome, endereco')
          .in('id', bpIds);
        
        (bpData || []).forEach((bp: any) => {
          bpMap[bp.id] = { nome: bp.nome, endereco: bp.endereco };
        });
      }

      // Create tickets in batch
      for (const p of needsTicket) {
        const reserva = reservas.find(r => r.id === p.reservaId);
        if (!reserva) continue;

        let bpName = reserva.ponto_embarque?.nome;
        let bpAddress = reserva.ponto_embarque?.endereco;

        if (p.boardingPointId && bpMap[p.boardingPointId]) {
          bpName = bpMap[p.boardingPointId].nome;
          bpAddress = bpMap[p.boardingPointId].endereco;
        }

        const ticketNumber = `TKT${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const { error } = await supabase
          .from('tickets')
          .insert({
            reserva_id: p.reservaId,
            tour_id: tourId,
            participant_id: p.participantId || null,
            participant_name: p.name,
            participant_cpf: p.cpf || null,
            ticket_number: ticketNumber,
            trip_date: tourData.start_date,
            boarding_point_name: bpName,
            boarding_point_address: bpAddress,
            reservation_number: p.reservaNumero,
            status: 'active'
          });

        if (!error) {
          ticketsCreated++;
        }
      }

      await fetchTicketTokens();
      toast({ 
        title: `${ticketsCreated} ticket(s) gerado(s)`,
        description: `Total de ${needsTicket.length} participantes processados`
      });

    } catch (error) {
      console.error('Error generating tickets:', error);
      toast({ title: "Erro ao gerar tickets", variant: "destructive" });
    } finally {
      setGeneratingTickets(false);
    }
  };

  const toggleColumn = (columnId: string) => {
    // Check if it's a dynamic column not yet in saved columns
    const existsInColumns = columns.some(c => c.id === columnId);
    if (!existsInColumns && columnId.startsWith('custom_')) {
      // Add the dynamic column to columns state
      const dynamicCol = allColumns.find(c => c.id === columnId);
      if (dynamicCol) {
        setColumns(prev => [...prev, { ...dynamicCol, visible: true }]);
        return;
      }
    }
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const reorderColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
  };

  const updateColumnStyle = (columnId: string, updates: Partial<ColumnConfig>) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnId] || 100;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };
    
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Save widths
      setColumnWidths(prev => {
        localStorage.setItem(`${STORAGE_KEY}_widths`, JSON.stringify(prev));
        return prev;
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const formatarValor = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Opcionais podem estar em dois lugares:
  // - Novo fluxo (admin por participante): reservation_participants.selected_optionals
  // - Fluxo legado/reserva: reservas.selected_optional_items (+ reservas.adicionais)
  // Para evitar inconsistência (opcional aparece na coluna, mas não entra no total),
  // priorizamos o somatório por participante quando existir.
  const calcularTotalOpcionaisReserva = (reserva: Reserva): number => {
    const valorAdicionais = (reserva.adicionais || []).reduce((sum, add) => sum + Number(add.valor || 0), 0);

    const participants = additionalParticipants[reserva.id] || [];
    const hasParticipantOptionals = participants.some(
      (p) =>
        !p.is_staff &&
        Array.isArray(p.selected_optionals) &&
        (p.selected_optionals as any[]).length > 0
    );

    const totalFromParticipants = participants
      .filter((p) => !p.is_staff)
      .reduce((sum, p) => {
        if (!Array.isArray(p.selected_optionals)) return sum;
        const opts = p.selected_optionals as any[];
        return (
          sum +
          opts.reduce((s, opt) => {
            const price = Number(opt?.price ?? opt?.valor ?? 0);
            const qty = Number(opt?.quantity ?? opt?.quantidade ?? 1) || 1;
            return s + price * qty;
          }, 0)
        );
      }, 0);

    const totalFromReserva = (reserva.selected_optional_items || []).reduce((sum, item) => {
      const price = Number((item as any)?.price ?? (item as any)?.valor ?? 0);
      const qty = Number((item as any)?.quantity ?? (item as any)?.quantidade ?? 1) || 1;
      return sum + price * qty;
    }, 0);

    const opcionaisTotal = hasParticipantOptionals ? totalFromParticipants : totalFromReserva;
    return valorAdicionais + opcionaisTotal;
  };

  const calcularValorTotal = (reserva: Reserva): number => {
    const valorBase = reserva.valor_passeio || 0;
    return valorBase + calcularTotalOpcionaisReserva(reserva);
  };

  // Valor pago "real" (sem juros). Fonte:
  // 1) Se existir parcela em reserva_parcelas: soma das parcelas (assumimos que já é o valor base)
  // 2) Senão: usa reservas.valor_pago e, se for cartão, subtrai card_fee_amount
  const getValorPagoSemJuros = (reserva: Reserva): number => {
    const parcelasSumRaw = reservaTotalPago[reserva.id];
    if (typeof parcelasSumRaw === 'number' && parcelasSumRaw > 0) return parcelasSumRaw;

    const raw = reserva.valor_pago || 0;
    const method = (reserva.payment_method || '').toLowerCase();
    const isCard =
      method.includes('cartao') ||
      method.includes('cartão') ||
      method.includes('card') ||
      method === 'credit_card';

    if (!isCard) return raw;
    const fee = Number(reserva.card_fee_amount || 0);

    // Se a taxa está registrada, removemos do valor pago bruto
    if (fee > 0) return Math.max(0, raw - fee);

    // Fallback IMPORTANTÍSSIMO: quando não existem parcelas salvas e a taxa não está registrada,
    // o valor_pago pode estar vindo com juros do cartão. Nesse caso, usamos o valor_total_com_opcionais
    // (gravado no momento do pagamento) para não ser afetado por opcionais adicionados posteriormente.
    const valorSalvoNoPagamento = reserva.valor_total_com_opcionais || reserva.valor_passeio || 0;
    if (valorSalvoNoPagamento > 0) return valorSalvoNoPagamento;

    // Último fallback: não temos como inferir o valor base.
    return raw;
  };

  const calcularValorOpcionais = (reserva: Reserva): number => {
    return calcularTotalOpcionaisReserva(reserva);
  };

  const handleInputChange = (key: string, value: string) => {
    setTempInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = async (reservaId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    await onEditReserva(reservaId, { [field]: numValue });
    setTempInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[`${reservaId}_${field}`];
      return newValues;
    });
  };

  // Handle text observation update for reserva (titular) or participant
  const handleObservacaoBlur = async (
    reservaId: string, 
    participantId: string | null, 
    value: string
  ) => {
    try {
      if (participantId) {
        // Update reservation_participants table for additional participants
        const { error } = await supabase
          .from('reservation_participants')
          .update({ observacoes: value || null })
          .eq('id', participantId);
        
        if (error) throw error;
        
        // Refresh additional participants to show updated value
        fetchAdditionalParticipants();
      } else {
        // Update reservas table for titular
        await onEditReserva(reservaId, { observacoes: value || null });
      }
      
      toast({ title: 'Observação salva' });
    } catch (error) {
      console.error('Error saving observacao:', error);
      toast({ title: 'Erro ao salvar observação', variant: 'destructive' });
    } finally {
      setTempInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[`${reservaId}_observacoes`];
        return newValues;
      });
    }
  };

  const getPaymentStatusBadge = (status: string): { color: string; label: string } => {
    switch (status) {
      case 'pago':
      case 'approved':
        return { color: 'bg-green-100 text-green-800', label: 'Pago' };
      case 'rejeitado':
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', label: 'Rejeitado' };
      case 'pendente':
        return { color: 'bg-amber-100 text-amber-800', label: 'Pendente' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const getPaymentMethodLabel = (method?: string): string => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'cartao':
      case 'credit_card':
        return 'Cartão';
      case 'whatsapp':
        return 'WhatsApp';
      case 'dinheiro':
        return 'Dinheiro';
      case 'transferencia':
        return 'Transferência';
      default:
        return '';
    }
  };

  const normalizePrimaryPaymentMethod = (reserva: Reserva): string | undefined => {
    // InfinitePay tells us what was actually used via capture_method.
    // If it says credit_card, never show PIX even if some stale value is still present.
    if (reserva.capture_method === 'credit_card') return 'cartao';
    if (reserva.capture_method === 'pix') return 'pix';
    return reserva.payment_method || undefined;
  };

  // Get all payment methods for a reservation (from reservation + parcelas)
  const getAllPaymentMethods = (reserva: Reserva): string => {
    const methods: Set<string> = new Set();

    const primary = normalizePrimaryPaymentMethod(reserva);
    if (primary) {
      const label = getPaymentMethodLabel(primary);
      if (label) methods.add(label);
    }

    // Add payment methods from parcelas
    const parcelaMethods = reservaPaymentMethods[reserva.id] || [];
    parcelaMethods.forEach(method => {
      const label = getPaymentMethodLabel(method);
      if (label) methods.add(label);
    });

    // Return combined methods or dash if none
    return methods.size > 0 ? Array.from(methods).join(', ') : '-';
  };

  const formatDate = (date: string): string => {
    // Parse date string as local date to avoid timezone conversion issues
    // For dates like "1998-09-12", we want to display exactly that date
    if (date.includes('T')) {
      // Full datetime string - use as is
      return new Date(date).toLocaleDateString('pt-BR');
    }
    // Date-only string (YYYY-MM-DD) - parse as local date
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string): string => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularIdade = (dataNascimento: string): number => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const handleAddOptional = async () => {
    const reserva = reservas.find(r => r.id === addOptionalModal.reservaId);
    if (!reserva) return;

    if (useCustomOptional) {
      if (!newOptional.nome || !newOptional.valor) {
        toast({ title: "Preencha nome e valor", variant: "destructive" });
        return;
      }
      
      const customItem = { 
        id: `custom_${Date.now()}`, 
        name: newOptional.nome, 
        price: parseFloat(newOptional.valor) || 0,
        quantity: 1
      };

      try {
        // Always add to reservas.selected_optional_items (unified approach)
        const currentItems = reserva.selected_optional_items || [];
        const updatedItems = [...currentItems, customItem];
        
        const { error } = await supabase
          .from('reservas')
          .update({ selected_optional_items: updatedItems as any })
          .eq('id', addOptionalModal.reservaId);

        if (error) throw error;
        onRefreshReservas?.();
        
        toast({ title: "Item adicionado" });
        setAddOptionalModal({ open: false, reservaId: '' });
        setNewOptional({ id: '', nome: '', valor: '' });
        setUseCustomOptional(false);
      } catch (error) {
        console.error('Error adding optional:', error);
        toast({ title: "Erro ao adicionar item", variant: "destructive" });
      }
    } else {
      if (!newOptional.id) {
        toast({ title: "Selecione um item", variant: "destructive" });
        return;
      }
      const selectedItem = tourOptionalItems.find(item => item.id === newOptional.id);
      if (!selectedItem) return;

      try {
        // Always add to reservas.selected_optional_items (unified approach)
        const currentItems = reserva.selected_optional_items || [];
        const existingItem = currentItems.find(o => o.id === selectedItem.id);
        
        let updatedItems;
        if (existingItem) {
          updatedItems = currentItems.map(o => 
            o.id === selectedItem.id ? { ...o, quantity: (o.quantity || 1) + 1 } : o
          );
        } else {
          updatedItems = [...currentItems, { 
            id: selectedItem.id, 
            name: selectedItem.name, 
            price: selectedItem.price,
            quantity: 1
          }];
        }

        const { error } = await supabase
          .from('reservas')
          .update({ selected_optional_items: updatedItems as any })
          .eq('id', addOptionalModal.reservaId);

        if (error) throw error;
        onRefreshReservas?.();
        
        toast({ title: "Item adicionado" });
        setAddOptionalModal({ open: false, reservaId: '' });
        setNewOptional({ id: '', nome: '', valor: '' });
      } catch (error) {
        console.error('Error adding optional:', error);
        toast({ title: "Erro ao adicionar item", variant: "destructive" });
      }
    }
  };

  const openParticipantModal = (reservaId: string, participantIndex: number, participant: AdditionalParticipant | null) => {
    setEditingParticipant({
      open: true,
      reservaId,
      participantIndex,
      participant
    });
  };

  const handleToggleAdditionalTicket = async (participantId: string, enviado: boolean) => {
    try {
      const { error } = await supabase
        .from('reservation_participants')
        .update({ ticket_enviado: enviado })
        .eq('id', participantId);
      
      if (error) throw error;
      
      fetchAdditionalParticipants();
      toast({ title: enviado ? "Ticket marcado" : "Ticket desmarcado" });
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  // Open boarding point edit modal
  const openBoardingEdit = (
    participantId: string | null, 
    reservaId: string, 
    isTitular: boolean,
    participantIndex: number,
    currentBoardingId: string | null,
    currentCustomBoarding: string | null
  ) => {
    const hasCustom = !currentBoardingId && currentCustomBoarding;
    setEditingBoarding({
      open: true,
      participantId,
      reservaId,
      isTitular,
      participantIndex,
      currentBoardingId,
      currentCustomBoarding
    });
    setBoardingFormData({
      ponto_embarque_id: hasCustom ? 'outro' : (currentBoardingId || ''),
      ponto_embarque_personalizado: currentCustomBoarding || ''
    });
  };

  // Save boarding point change
  const saveBoardingPoint = async () => {
    if (!editingBoarding) return;
    
    const { participantId, reservaId, isTitular, participantIndex } = editingBoarding;
    const isCustom = boardingFormData.ponto_embarque_id === 'outro';

    if (isCustom && !boardingFormData.ponto_embarque_personalizado?.trim()) {
      toast({ title: "Informe o endereço do ponto personalizado", variant: "destructive" });
      return;
    }
    
    // Determine the actual boarding point ID (null for custom or empty, valid UUID otherwise)
    const actualBoardingId = isCustom || !boardingFormData.ponto_embarque_id 
      ? null 
      : boardingFormData.ponto_embarque_id;
    
    const customBoardingText = isCustom 
      ? (boardingFormData.ponto_embarque_personalizado?.trim() || null) 
      : null;
    
    try {
      // Titular keeps reservas.ponto_embarque_id updated (legacy behavior)
      if (isTitular) {
        const { error } = await supabase
          .from('reservas')
          .update({ ponto_embarque_id: actualBoardingId })
          .eq('id', reservaId);

        if (error) throw error;
      }

      // Always persist boarding point (including custom text) in reservation_participants.
      // This is required for "Outro" because reservas has no custom field.
      const targetIndex = isTitular ? 1 : participantIndex;

      if (participantId) {
        const { error } = await supabase
          .from('reservation_participants')
          .update({
            ponto_embarque_id: actualBoardingId,
            ponto_embarque_personalizado: customBoardingText
          })
          .eq('id', participantId);

        if (error) throw error;
      } else {
        // Participant may exist without being loaded/linked in the UI yet; lookup by (reserva_id, participant_index)
        const { data: existing, error: existingError } = await supabase
          .from('reservation_participants')
          .select('id')
          .eq('reserva_id', reservaId)
          .eq('participant_index', targetIndex)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing?.id) {
          const { error } = await supabase
            .from('reservation_participants')
            .update({
              ponto_embarque_id: actualBoardingId,
              ponto_embarque_personalizado: customBoardingText
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('reservation_participants')
            .insert({
              reserva_id: reservaId,
              participant_index: targetIndex,
              ponto_embarque_id: actualBoardingId,
              ponto_embarque_personalizado: customBoardingText
            });

          if (error) throw error;
        }
      }
      
      toast({ title: "Ponto de embarque atualizado!" });
      setEditingBoarding(null);
      fetchAdditionalParticipants();
      
      // Also refresh reservas to update titular's boarding point display
      if (isTitular && onRefreshReservas) {
        onRefreshReservas();
      }
    } catch (error) {
      console.error('Error updating boarding point:', error);
      toast({ title: "Erro ao atualizar ponto de embarque", variant: "destructive" });
    }
  };

  const buildParticipantRows = (): ParticipantRow[] => {
    const rows: ParticipantRow[] = [];
    let globalIndex = 0;
    
    reservas.forEach((reserva) => {
      const numParticipantes = reserva.numero_participantes || 1;
      const existingAdditionals = (additionalParticipants[reserva.id] || []).filter(p => !p.is_staff);
      
      // Find the titular's participant record (index 1) to get their nivel_condicionamento etc.
      const titularParticipant = existingAdditionals.find(p => p.participant_index === 1);
      
      globalIndex++;
      rows.push({
        type: 'titular',
        reserva,
        participantIndex: 1,
        additionalData: titularParticipant || undefined,
        globalIndex
      });
      
      for (let i = 2; i <= numParticipantes; i++) {
        globalIndex++;
        const existing = existingAdditionals.find(p => p.participant_index === i);
        rows.push({
          type: 'additional',
          reserva,
          participantIndex: i,
          additionalData: existing || undefined,
          globalIndex
        });
      }
    });
    
    // Add staff members at the end
    Object.values(additionalParticipants).flat().filter(p => p.is_staff).forEach((staff) => {
      globalIndex++;
      const staffReserva = reservas.find(r => r.id === staff.reserva_id);
      if (staffReserva) {
        rows.push({
          type: 'staff',
          reserva: staffReserva,
          participantIndex: staff.participant_index,
          additionalData: staff,
          globalIndex,
          isStaff: true
        });
      }
    });
    
    return rows;
  };

  const allParticipantRows = buildParticipantRows();

  // Filter by name search
  const participantRows = useMemo(() => {
    if (!nameSearch.trim()) return allParticipantRows;
    const term = nameSearch.toLowerCase().trim();
    return allParticipantRows.filter(row => {
      const name = row.type === 'titular'
        ? row.reserva.cliente.nome_completo
        : row.additionalData?.nome_completo || '';
      return name?.toLowerCase().includes(term);
    });
  }, [allParticipantRows, nameSearch]);
  
  // Separate pending payment rows from confirmed/paid rows
  const pendingPaymentRows = participantRows.filter(row => {
    if (row.type === 'staff' || row.isStaff) return false;
    const paymentStatus = row.reserva.payment_status;
    return paymentStatus !== 'pago' && paymentStatus !== 'approved';
  });
  
  const confirmedPaymentRows = participantRows.filter(row => {
    if (row.type === 'staff' || row.isStaff) return true;
    const paymentStatus = row.reserva.payment_status;
    return paymentStatus === 'pago' || paymentStatus === 'approved';
  });

  // Selection helpers that depend on participantRows
  const selectAll = () => {
    const allKeys = participantRows.map(getRowKey);
    setSelectedRows(new Set(allKeys));
  };

  const isAllSelected = participantRows.length > 0 && selectedRows.size === participantRows.length;

  // Filtered export state
  const [showFilteredExport, setShowFilteredExport] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Build data for filtered export
  const exportParticipantsData = useMemo(() => {
    const getPaymentStatusLabel = (status: string) => {
      switch (status) {
        case 'pago': case 'approved': return 'Pago';
        case 'pendente': return 'Pendente';
        case 'rejeitado': case 'rejected': return 'Rejeitado';
        default: return status;
      }
    };

    const extractCondKey = (val: string | null | undefined): string => {
      if (!val) return '';
      const lv = val.toLowerCase();
      if (lv.startsWith('sedentário') || lv.startsWith('sedentario')) return 'Sedentário';
      if (lv.startsWith('iniciante')) return 'Iniciante';
      if (lv.startsWith('intermediário') || lv.startsWith('intermediario')) return 'Intermediário';
      if (lv.startsWith('avançado') || lv.startsWith('avancado')) return 'Avançado';
      if (lv.startsWith('atleta')) return 'Atleta';
      return val;
    };

    return participantRows.map(row => {
      const { reserva, type, additionalData } = row;
      const isTitular = type === 'titular';
      const isStaffMember = type === 'staff' || row.isStaff;

      // Name
      const nome = isTitular ? reserva.cliente.nome_completo : (additionalData?.nome_completo || '');

      // Package
      let pacote = '';
      if (additionalData?.pricing_option_name) {
        pacote = additionalData.pricing_option_name;
      } else if (isTitular) {
        const titP = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
        pacote = titP?.pricing_option_name || '';
        if (!pacote && reserva.valor_passeio && pricingOptions.length > 0) {
          const match = pricingOptions.find(opt => opt.pix_price === reserva.valor_passeio);
          if (match) pacote = match.option_name;
        }
      }

      // Boarding
      const titP2 = isTitular ? additionalParticipants[reserva.id]?.find(p => p.participant_index === 1) : null;
      const bpId = isTitular ? (titP2?.ponto_embarque_id ?? null) : (additionalData?.ponto_embarque_id ?? null);
      const customBp = isTitular ? (titP2?.ponto_embarque_personalizado ?? null) : (additionalData?.ponto_embarque_personalizado ?? null);
      const embarque = customBp || boardingPoints.find(b => b.id === bpId)?.nome || reserva.ponto_embarque?.nome || '';

      // Optionals
      let optionals: string[] = [];
      if (isTitular) {
        const titPart = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
        if (titPart?.selected_optionals && Array.isArray(titPart.selected_optionals)) {
          optionals = (titPart.selected_optionals as any[]).map(o => o.name || '').filter(Boolean);
        } else if (reserva.selected_optional_items) {
          optionals = reserva.selected_optional_items.map(o => o.name || '').filter(Boolean);
        }
      } else if (additionalData?.selected_optionals && Array.isArray(additionalData.selected_optionals)) {
        optionals = (additionalData.selected_optionals as any[]).map(o => o.name || '').filter(Boolean);
      }

      // Condicionamento
      const cond = extractCondKey(additionalData?.nivel_condicionamento);

      return {
        nome,
        cpf: isTitular ? reserva.cliente.cpf : (additionalData?.cpf || ''),
        email: isTitular ? reserva.cliente.email : (additionalData?.email || ''),
        whatsapp: isTitular ? reserva.cliente.whatsapp : (additionalData?.whatsapp || ''),
        data_nascimento: isTitular ? reserva.cliente.data_nascimento : (additionalData?.data_nascimento || ''),
        pacote,
        embarque,
        status_pagamento: getPaymentStatusLabel(reserva.payment_status),
        valor_base: reserva.valor_passeio || 0,
        valor_pago: reserva.valor_pago || 0,
        opcionais: optionals,
        condicionamento: cond,
        problema_saude: isTitular ? reserva.problema_saude : (additionalData?.problema_saude || false),
        descricao_problema_saude: isTitular ? (reserva.descricao_problema_saude || '') : (additionalData?.descricao_problema_saude || ''),
        contato_emergencia_nome: isTitular ? reserva.contato_emergencia_nome : (additionalData?.contato_emergencia_nome || ''),
        contato_emergencia_telefone: isTitular ? reserva.contato_emergencia_telefone : (additionalData?.contato_emergencia_telefone || ''),
        observacoes: isTitular ? (reserva.observacoes || '') : (additionalData?.observacoes || ''),
        tipo: isStaffMember ? 'equipe' : (isTitular ? 'titular' : 'adicional'),
      };
    });
  }, [participantRows, additionalParticipants, pricingOptions, boardingPoints]);

  const exportAvailableOptionals = useMemo(() => {
    const all = new Set<string>();
    exportParticipantsData.forEach(p => p.opcionais.forEach(o => all.add(o)));
    return Array.from(all).sort();
  }, [exportParticipantsData]);

  const exportAvailablePackages = useMemo(() => {
    const all = new Set<string>();
    exportParticipantsData.forEach(p => { if (p.pacote) all.add(p.pacote); });
    return Array.from(all).sort();
  }, [exportParticipantsData]);

  const exportAvailableBoardingPoints = useMemo(() => {
    const all = new Set<string>();
    exportParticipantsData.forEach(p => { if (p.embarque) all.add(p.embarque); });
    return Array.from(all).sort();
  }, [exportParticipantsData]);

  const exportAvailablePaymentStatuses = useMemo(() => {
    const all = new Set<string>();
    exportParticipantsData.forEach(p => all.add(p.status_pagamento));
    return Array.from(all).sort();
  }, [exportParticipantsData]);

  const getCellValue = (row: ParticipantRow, columnId: string) => {
    const { reserva, type, participantIndex, additionalData, globalIndex, isStaff } = row;
    const isTitular = type === 'titular';
    const isPending = type === 'additional' && !additionalData?.nome_completo;
    const isStaffMember = type === 'staff' || isStaff;

    switch (columnId) {
      case 'index':
        return <span className="font-mono text-muted-foreground">{globalIndex}</span>;

      case 'ticket':
        const ticketEnviado = isTitular 
          ? reserva.ticket_enviado 
          : additionalData?.ticket_enviado || false;
        if (isTitular) {
          return (
            <button
              onClick={() => onToggleTicket(reserva.id, !reserva.ticket_enviado)}
              className={`w-5 h-5 rounded flex items-center justify-center border ${
                ticketEnviado
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
              }`}
            >
              {ticketEnviado && <Check className="h-3 w-3" />}
            </button>
          );
        } else if (additionalData?.id) {
          return (
            <button
              onClick={() => handleToggleAdditionalTicket(additionalData.id, !additionalData.ticket_enviado)}
              className={`w-5 h-5 rounded flex items-center justify-center border ${
                ticketEnviado
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
              }`}
            >
              {ticketEnviado && <Check className="h-3 w-3" />}
            </button>
          );
        }
        return <span className="text-muted-foreground">-</span>;

      case 'download_ticket':
        const ticketToken = getTicketToken(row);
        if (ticketToken) {
          return (
            <button
              onClick={() => openTicketInNewTab(ticketToken)}
              className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Baixar ingresso"
            >
              <Download className="h-4 w-4" />
            </button>
          );
        }
        return <span className="text-muted-foreground text-xs">-</span>;

      case 'nome':
        const nome = isTitular 
          ? reserva.cliente.nome_completo 
          : additionalData?.nome_completo || null;
        if (isPending) {
          return (
            <button
              onClick={() => openParticipantModal(reserva.id, participantIndex, null)}
              className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Cadastrar #{participantIndex}
            </button>
          );
        }
        if (isStaffMember && additionalData) {
          const roleLabel = additionalData.staff_role 
            ? additionalData.staff_role.charAt(0).toUpperCase() + additionalData.staff_role.slice(1)
            : 'Equipe';
          return (
            <div className="flex items-center gap-2">
              <UserCog className="h-3.5 w-3.5 text-teal-600" />
              <span className="font-medium text-teal-800">{nome}</span>
              <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">{roleLabel}</span>
            </div>
          );
        }
        return (
          <button
            onClick={() => {
              if (isTitular) {
                // For titular, find or create participant index 1 and open edit modal
                const titularParticipant = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
                openParticipantModal(reserva.id, 1, titularParticipant || null);
              } else {
                openParticipantModal(reserva.id, participantIndex, additionalData || null);
              }
            }}
            className="font-medium text-foreground hover:text-primary hover:underline text-left"
          >
            {nome}
            {isTitular && <span className="text-primary ml-1 text-xs">(T)</span>}
          </button>
        );

      case 'pacote':
        // For additional participants, get from additionalData
        // For titulars, get from the first participant (participant_index === 1) in additionalParticipants
        // Or try to infer from the reservation's valor_passeio by matching with pricing options
        let pacoteName: string | null = null;
        if (additionalData?.pricing_option_name) {
          pacoteName = additionalData.pricing_option_name;
        } else if (isTitular) {
          // For titular, find the participant with index 1 (which represents the titular in reservation_participants)
          const titularParticipant = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
          pacoteName = titularParticipant?.pricing_option_name || null;
          
          // If still no package name, try to infer from valor_passeio
          if (!pacoteName && reserva.valor_passeio && pricingOptions.length > 0) {
            const matchingOption = pricingOptions.find(opt => opt.pix_price === reserva.valor_passeio);
            if (matchingOption) {
              pacoteName = matchingOption.option_name;
            }
          }
        }
        return pacoteName ? (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{pacoteName}</span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'poltrona':
        // Get seat assignment for this participant
        let seatLabel = '';
        if (additionalData?.id) {
          seatLabel = seatAssignments[`participant_${additionalData.id}`] || '';
        } else if (isTitular) {
          seatLabel = seatAssignments[`reserva_${reserva.id}`] || '';
        }
        return seatLabel ? (
          <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {seatLabel}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case 'cpf':
        const cpf = isTitular ? reserva.cliente.cpf : additionalData?.cpf;
        return cpf || <span className="text-muted-foreground">-</span>;

      case 'email':
        const email = isTitular ? reserva.cliente.email : additionalData?.email;
        return email ? (
          <span className="truncate max-w-[150px] block" title={email}>{email}</span>
        ) : <span className="text-muted-foreground">-</span>;

      case 'whatsapp':
        const whatsapp = isTitular ? reserva.cliente.whatsapp : additionalData?.whatsapp;
        return whatsapp || <span className="text-muted-foreground">-</span>;

      case 'data_nascimento':
        const dataNasc = isTitular ? reserva.cliente.data_nascimento : additionalData?.data_nascimento;
        return dataNasc ? formatDate(dataNasc) : <span className="text-muted-foreground">-</span>;

      case 'idade':
        const dn = isTitular ? reserva.cliente.data_nascimento : additionalData?.data_nascimento;
        return dn ? `${calcularIdade(dn)} anos` : <span className="text-muted-foreground">-</span>;

      case 'condicionamento':
        const nivelCond = additionalData?.nivel_condicionamento;
        // Map both the value and the label to display info
        const condicionamentoMap: Record<string, { label: string; color: string }> = {
          'sedentario': { label: 'Sedentário', color: 'bg-red-100 text-red-800' },
          'iniciante': { label: 'Iniciante', color: 'bg-orange-100 text-orange-800' },
          'intermediario': { label: 'Intermediário', color: 'bg-yellow-100 text-yellow-800' },
          'avancado': { label: 'Avançado', color: 'bg-green-100 text-green-800' },
          'atleta': { label: 'Atleta', color: 'bg-blue-100 text-blue-800' },
        };
        // Helper to extract key from full label (e.g. "SEDENTÁRIO(...)" → "sedentario")
        const extractCondicionamentoKey = (val: string | null | undefined): string | null => {
          if (!val) return null;
          const lowerVal = val.toLowerCase();
          // Check direct match first
          if (condicionamentoMap[lowerVal]) return lowerVal;
          // Check if label starts with one of the keys
          if (lowerVal.startsWith('sedentário') || lowerVal.startsWith('sedentario')) return 'sedentario';
          if (lowerVal.startsWith('iniciante')) return 'iniciante';
          if (lowerVal.startsWith('intermediário') || lowerVal.startsWith('intermediario')) return 'intermediario';
          if (lowerVal.startsWith('avançado') || lowerVal.startsWith('avancado')) return 'avancado';
          if (lowerVal.startsWith('atleta')) return 'atleta';
          return null;
        };
        const condKey = extractCondicionamentoKey(nivelCond);
        if (condKey && condicionamentoMap[condKey]) {
          const nivel = condicionamentoMap[condKey];
          return <span className={`px-2 py-0.5 rounded text-xs ${nivel.color}`}>{nivel.label}</span>;
        }
        // Fallback: show raw value if not recognized
        if (nivelCond) {
          return <span className="text-xs text-muted-foreground">{nivelCond}</span>;
        }
        return <span className="text-muted-foreground">-</span>;

      case 'embarque':
        // For all participants, show editable boarding point.
        // IMPORTANT: For titular we must not rely on `reserva.ponto_embarque` being selected
        // in the reservas query; instead we use participant_index=1 from reservation_participants.
        const titularParticipant = isTitular
          ? additionalParticipants[reserva.id]?.find(p => p.participant_index === 1)
          : null;

        const currentBoardingPointId = isTitular
          ? (titularParticipant?.ponto_embarque_id ?? (reserva as any).ponto_embarque_id)
          : additionalData?.ponto_embarque_id;

        const currentCustomBoarding = isTitular
          ? (titularParticipant?.ponto_embarque_personalizado ?? null)
          : (additionalData?.ponto_embarque_personalizado ?? null);

        // Display value
        const displayBoarding = currentCustomBoarding
          ? currentCustomBoarding
          : (boardingPoints.find(b => b.id === currentBoardingPointId)?.nome || reserva.ponto_embarque?.nome);
        
        return (
          <button
            onClick={() => openBoardingEdit(
              (isTitular ? (titularParticipant?.id || null) : (additionalData?.id || null)),
              reserva.id,
              isTitular,
              participantIndex,
              currentBoardingPointId || null,
              currentCustomBoarding || null
            )}
            className="text-left hover:underline hover:text-primary transition-colors flex items-center gap-1"
            title="Clique para editar ponto de embarque"
          >
            {currentCustomBoarding ? (
              <span className="italic text-amber-700 flex items-center gap-1">
                <span>📍</span>
                <span className="truncate max-w-[120px]" title={currentCustomBoarding}>
                  {currentCustomBoarding}
                </span>
              </span>
            ) : displayBoarding ? (
              <span>{displayBoarding}</span>
            ) : (
              <span className="text-muted-foreground">Clique para definir</span>
            )}
            <Bus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        );

      case 'valor_base':
        // Staff members don't pay - show dash
        if (isStaffMember) {
          return <span className="text-muted-foreground">-</span>;
        }
        // Show individual participant value based on their pricing option
        // Both titular and additional participants show their individual package price
        if (isTitular) {
          // For titular, get the pricing option from participant with index 1
          const titularParticipant = additionalParticipants[reserva.id]?.find(p => p.participant_index === 1);
          const pricingOpt = titularParticipant?.pricing_option_id 
            ? pricingOptions.find(po => po.id === titularParticipant.pricing_option_id)
            : null;
          // Use individual package price, not total reservation value
          const valorIndividual = pricingOpt?.pix_price || 0;
          if (valorIndividual > 0) {
            return <span>{formatarValor(valorIndividual)}</span>;
          }
          return <span className="text-muted-foreground">-</span>;
        } else if (additionalData) {
          // For additional participants, show their individual pricing option value
          const pricingOpt = additionalData.pricing_option_id 
            ? pricingOptions.find(po => po.id === additionalData.pricing_option_id)
            : null;
          const valorIndividual = pricingOpt?.pix_price || 0;
          if (valorIndividual > 0) {
            return <span>{formatarValor(valorIndividual)}</span>;
          }
          return <span className="text-muted-foreground">-</span>;
        }
        return <span className="text-muted-foreground">-</span>;

      case 'opcionais':
        // Staff members don't have optionals - show dash
        if (isStaffMember) {
          return <span className="text-muted-foreground">-</span>;
        }
        // Show optionals per participant - from reservation_participants.selected_optionals
        // For titular (participant_index === 1), get from additionalParticipants array
        // For additional participants, get from additionalData.selected_optionals
        
        let participantOptionals: Array<{ id: string; name: string; price: number; quantity: number }> = [];
        let participantName = '';
        let participantId: string | null = null;
        
        if (isTitular) {
          // For titular, find participant with index 1
          const titularParticipant = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
          participantName = reserva.cliente.nome_completo;
          participantId = titularParticipant?.id || null;
          
          if (titularParticipant?.selected_optionals && Array.isArray(titularParticipant.selected_optionals)) {
            // Use optionals from reservation_participants
            participantOptionals = (titularParticipant.selected_optionals as any[]).map(opt => ({
              id: opt.id || '',
              name: opt.name || '',
              price: opt.price || 0,
              quantity: opt.quantity || 1
            }));
          } else if (!titularParticipant && reserva.selected_optional_items && Array.isArray(reserva.selected_optional_items)) {
            // Fallback: If no participant exists, use optionals from reservas.selected_optional_items
            participantOptionals = reserva.selected_optional_items.map(opt => ({
              id: opt.id || '',
              name: opt.name || '',
              price: opt.price || 0,
              quantity: opt.quantity || 1
            }));
          }
        } else if (additionalData) {
          participantName = additionalData.nome_completo || '';
          participantId = additionalData.id;
          
          if (additionalData.selected_optionals && Array.isArray(additionalData.selected_optionals)) {
            participantOptionals = (additionalData.selected_optionals as any[]).map(opt => ({
              id: opt.id || '',
              name: opt.name || '',
              price: opt.price || 0,
              quantity: opt.quantity || 1
            }));
          }
        }
        
        const valorOpcionaisTotal = participantOptionals.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Group by name for display
        const groupedOptionals: Record<string, { count: number; price: number }> = {};
        participantOptionals.forEach(item => {
          if (!groupedOptionals[item.name]) {
            groupedOptionals[item.name] = { count: 0, price: item.price };
          }
          groupedOptionals[item.name].count += item.quantity;
        });
        
        const opcionaisDisplayItems = Object.entries(groupedOptionals).map(([name, data]) => 
          data.count > 1 ? `${name} (x${data.count})` : name
        );
        
        return (
          <div className="flex items-center gap-1">
            {opcionaisDisplayItems.length > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setEditOptionalsModal({
                        open: true,
                        reservaId: reserva.id,
                        participantId: participantId || undefined,
                        participantName: participantName,
                        currentOptionals: participantOptionals
                      })}
                      className="truncate max-w-[120px] cursor-pointer text-sm hover:text-primary hover:underline"
                    >
                      {opcionaisDisplayItems.join(', ')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <div className="space-y-1">
                      {opcionaisDisplayItems.map((item, idx) => (
                        <div key={idx}>• {item}</div>
                      ))}
                      <div className="font-bold pt-1 border-t mt-1">Total: {formatarValor(valorOpcionaisTotal)}</div>
                      <p className="text-xs text-muted-foreground pt-1">Clique para editar</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
            <button
              onClick={() => setEditOptionalsModal({
                open: true,
                reservaId: reserva.id,
                participantId: participantId || undefined,
                participantName: participantName,
                currentOptionals: participantOptionals
              })}
              className="w-5 h-5 rounded border border-dashed border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary"
              title="Adicionar opcional"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        );

      case 'valor_total':
        // Mostrar valores financeiros apenas no titular para evitar divergência por participante
        if (isStaffMember) return <span className="text-muted-foreground">-</span>;
        if (!isTitular) return <span className="text-muted-foreground">-</span>;
        return <span className="font-medium">{formatarValor(calcularValorTotal(reserva))}</span>;

      case 'valor_pago':
        // Mostrar valores financeiros apenas no titular para evitar divergência por participante
        if (isStaffMember) return <span className="text-muted-foreground">-</span>;
        if (!isTitular) return <span className="text-muted-foreground">-</span>;

        const isPaid = reserva.payment_status === 'pago' || reserva.payment_status === 'approved';
        const valorPago = getValorPagoSemJuros(reserva);

        return (
          <button
            onClick={() => onOpenPayments(reserva.id)}
            className={`font-medium hover:underline ${isPaid ? 'text-green-700' : 'text-amber-700'}`}
          >
            {formatarValor(valorPago)}
          </button>
        );

      case 'saldo':
        // Staff members don't pay - show dash
        if (isStaffMember) {
          return <span className="text-muted-foreground">-</span>;
        }

        // Mostrar valores financeiros apenas no titular para evitar divergência por participante
        if (!isTitular) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        // Saldo = Valor Pago - Valor Total
        // Negativo = devendo, Positivo = pagou a mais
        const valorTotalReserva = calcularValorTotal(reserva);
        const valorPagoReserva = getValorPagoSemJuros(reserva);
        const saldoFinal = valorPagoReserva - valorTotalReserva;
        
        return (
          <span className={`font-medium ${saldoFinal < 0 ? 'text-red-600' : saldoFinal > 0 ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-green-600'}`}>
            {saldoFinal < 0 ? `- ${formatarValor(Math.abs(saldoFinal))}` : saldoFinal > 0 ? `+ ${formatarValor(saldoFinal)}` : formatarValor(0)}
          </span>
        );

      case 'metodo':
        // Show payment method for all participants (same as titular's reservation)
        return getAllPaymentMethods(reserva);

      case 'parcelas':
        if (!isTitular) return <span className="text-muted-foreground">-</span>;
        return reserva.installments && reserva.installments > 1 ? `${reserva.installments}x` : '-';

      case 'status_pagamento':
        if (!isTitular) return <span className="text-muted-foreground">-</span>;
        const statusInfo = getPaymentStatusBadge(reserva.payment_status);
        return <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>{statusInfo.label}</span>;

      case 'data_reserva':
        if (!isTitular) return <span className="text-muted-foreground">-</span>;
        return formatDateTime(reserva.data_reserva);

      case 'emergencia_nome':
        const emergNome = isTitular ? reserva.contato_emergencia_nome : additionalData?.contato_emergencia_nome;
        return emergNome || <span className="text-muted-foreground">-</span>;

      case 'emergencia_telefone':
        const emergTel = isTitular ? reserva.contato_emergencia_telefone : additionalData?.contato_emergencia_telefone;
        return emergTel || <span className="text-muted-foreground">-</span>;

      case 'problema_saude':
        const temProblema = isTitular ? reserva.problema_saude : additionalData?.problema_saude;
        const descProblema = isTitular ? reserva.descricao_problema_saude : additionalData?.descricao_problema_saude;
        if (temProblema && descProblema) {
          return (
            <span className="text-red-600 truncate max-w-[100px] block" title={descProblema}>
              {descProblema}
            </span>
          );
        }
        return temProblema ? <span className="text-red-600">Sim</span> : <span className="text-muted-foreground">Não</span>;

      case 'plano_saude':
        const temPlano = isTitular ? (reserva as any).plano_saude : additionalData?.plano_saude;
        const nomePlano = isTitular ? (reserva as any).nome_plano_saude : additionalData?.nome_plano_saude;
        if (temPlano && nomePlano) {
          return (
            <span className="text-blue-600 truncate max-w-[100px] block" title={nomePlano}>
              {nomePlano}
            </span>
          );
        }
        return temPlano ? <span className="text-blue-600">Sim</span> : <span className="text-muted-foreground">Não</span>;

      case 'assistencia_diferenciada':
        const temAssistencia = additionalData?.assistencia_diferenciada;
        const descAssistencia = additionalData?.descricao_assistencia_diferenciada;
        if (temAssistencia && descAssistencia) {
          return (
            <span className="text-purple-600 truncate max-w-[100px] block" title={descAssistencia}>
              {descAssistencia}
            </span>
          );
        }
        return temAssistencia ? <span className="text-purple-600">Sim</span> : <span className="text-muted-foreground">Não</span>;

      case 'como_conheceu':
        const comoConheceu = additionalData?.como_conheceu;
        if (!comoConheceu) return <span className="text-muted-foreground">-</span>;
        // Check if it's "outro" and has custom value
        const comoConheceuLabel = {
          'instagram': 'Instagram',
          'whatsapp': 'Grupo WhatsApp',
          'indicacao': 'Indicação',
          'google': 'Google',
          'youtube': 'YouTube',
          'outro': 'Outro'
        }[comoConheceu] || comoConheceu;
        return <span className="text-sm">{comoConheceuLabel}</span>;

      case 'observacoes':
        const obs = isTitular ? reserva.observacoes : additionalData?.observacoes;
        const obsKey = isTitular ? `${reserva.id}_observacoes` : `${additionalData?.id}_observacoes`;
        const participantIdForObs = isTitular ? null : (additionalData?.id || null);
        
        return (
          <input
            type="text"
            className="w-full min-w-[120px] px-2 py-1 text-xs border rounded bg-background hover:bg-muted/50 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Clique para adicionar..."
            value={tempInputValues[obsKey] ?? (obs || '')}
            onChange={e => handleInputChange(obsKey, e.target.value)}
            onBlur={e => handleObservacaoBlur(reserva.id, participantIdForObs, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
          />
        );

      case 'acoes':
        // Staff member actions
        if (isStaffMember && additionalData) {
          return (
            <TooltipProvider>
              <div className="flex gap-1 justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => openParticipantModal(reserva.id, additionalData.participant_index, additionalData)}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Ver/Editar</TooltipContent>
                </Tooltip>
                {additionalData.whatsapp && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onWhatsApp(additionalData.whatsapp!, additionalData.nome_completo || 'Equipe')}
                        className="w-6 h-6 rounded flex items-center justify-center text-green-600 hover:bg-green-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        if (confirm(`Remover ${additionalData.nome_completo || 'membro da equipe'} da equipe?`)) {
                          try {
                            const { error } = await supabase
                              .from('reservation_participants')
                              .delete()
                              .eq('id', additionalData.id);
                            
                            if (error) throw error;
                            
                            toast({ title: 'Membro da equipe removido' });
                            fetchAdditionalParticipants();
                            onRefreshReservas?.();
                          } catch (error) {
                            console.error('Error deleting staff member:', error);
                            toast({ title: 'Erro ao remover membro da equipe', variant: 'destructive' });
                          }
                        }
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Remover</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          );
        }
        
        return (
          <TooltipProvider>
            <div className="flex gap-1 justify-center">
              {isTitular ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onViewDetails(reserva)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Detalhes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onWhatsApp(reserva.cliente.whatsapp, reserva.cliente.nome_completo)}
                        className="w-6 h-6 rounded flex items-center justify-center text-green-600 hover:bg-green-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onExcluir(reserva.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Cancelar</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openParticipantModal(reserva.id, participantIndex, additionalData || null)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {isPending ? (
                          <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isPending ? 'Cadastrar' : 'Ver/Editar'}</TooltipContent>
                  </Tooltip>
                  {additionalData?.whatsapp && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onWhatsApp(additionalData.whatsapp!, additionalData.nome_completo || 'Participante')}
                          className="w-6 h-6 rounded flex items-center justify-center text-green-600 hover:bg-green-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>WhatsApp</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </TooltipProvider>
        );

      default:
        // Handle dynamic custom question columns
        if (columnId.startsWith('custom_')) {
          const questionId = columnId.replace('custom_', '');
          // Only show for titular (main reservation holder)
          if (!isTitular) return <span className="text-muted-foreground">-</span>;
          
          const reservaAnswers = customAnswers[reserva.id];
          const answer = reservaAnswers?.[questionId] || '';
          
          if (answer) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate max-w-[100px] block cursor-help">{answer}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    {answer}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span className="text-muted-foreground">-</span>;
        }
        return '-';
    }
  };

  if (reservas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {showCancelled ? 'Nenhuma reserva cancelada' : 'Nenhum participante confirmado'}
      </div>
    );
  }

  return (
    <>
      {/* Column config and staff button */}
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
          {onRefreshReservas && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshReservas}
              className="flex items-center gap-2 text-xs"
              title="Atualizar dados"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          )}
          {tourId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-2 text-xs"
            >
              <UserCog className="h-3.5 w-3.5" />
              Adicionar Equipe
            </Button>
          )}
          {tourId && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateMissingTickets}
              disabled={generatingTickets}
              className="flex items-center gap-2 text-xs"
            >
              {generatingTickets ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ticket className="h-3.5 w-3.5" />
              )}
              Gerar Tickets
            </Button>
          )}
          {tourId && hasTransportConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSeatMapModal(true)}
              className="flex items-center gap-2 text-xs"
            >
              <Bus className="h-3.5 w-3.5" />
              Mapa de Assentos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilteredExport(true)}
            className="flex items-center gap-2 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadContactsVCard}
            className="flex items-center gap-2 text-xs"
          >
            <Contact className="h-3.5 w-3.5" />
            Baixar Contatos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyContactsList}
            className="flex items-center gap-2 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Contatos
          </Button>
          {tourId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalysis(true)}
              className="flex items-center gap-2 text-xs"
            >
              <Brain className="h-3.5 w-3.5" />
              Análise IA
            </Button>
          )}
        </div>
        <div className="flex-1" />
        <ColumnConfigDropdown
          columns={allColumns}
          onToggleColumn={toggleColumn}
          onReorderColumns={reorderColumns}
          onUpdateColumnStyle={updateColumnStyle}
          onApplyPreset={(presetColumns) => {
            const customCols = allColumns.filter(c => c.id.startsWith('custom_'));
            setColumns(applyPresetToDefaults(presetColumns, customCols));
          }}
        />
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">
              {selectedRows.size} selecionado(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="text-xs h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAvailableTours();
                setShowTransferModal(true);
              }}
              className="text-xs h-7"
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Transferir
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs h-7"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* PENDING PAYMENTS SECTION - Highlighted at top */}
      {pendingPaymentRows.length > 0 && (
        <div className="mb-4 border-2 border-amber-400 rounded-lg bg-amber-50/80 overflow-hidden">
          <div className="px-4 py-2 bg-amber-200 border-b border-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <span className="font-semibold text-amber-800 text-sm">
              Pagamentos Pendentes ({pendingPaymentRows.length})
            </span>
            <span className="text-xs text-amber-600 ml-2">
              Estes participantes precisam regularizar o pagamento
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-amber-100/95 backdrop-blur-sm">
                <tr>
                  <th className="px-2 py-2 text-center border-r border-b border-amber-300 w-10 bg-amber-100/95">
                    <Checkbox
                      checked={pendingPaymentRows.length > 0 && pendingPaymentRows.every(row => selectedRows.has(getRowKey(row)))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const pendingKeys = pendingPaymentRows.map(getRowKey);
                          setSelectedRows(prev => new Set([...prev, ...pendingKeys]));
                        } else {
                          const pendingKeys = new Set(pendingPaymentRows.map(getRowKey));
                          setSelectedRows(prev => new Set([...prev].filter(k => !pendingKeys.has(k))));
                        }
                      }}
                    />
                  </th>
                  {visibleColumns.map((col) => {
                    const isCollapsed = collapsedColumns.has(col.id);
                    return (
                      <th 
                        key={col.id} 
                        className={`text-left font-medium text-amber-800 border-r border-b border-amber-300 whitespace-nowrap bg-amber-100/95 cursor-pointer select-none ${isCollapsed ? 'px-0.5 py-2' : 'px-3 py-2'}`}
                        style={{ width: isCollapsed ? '24px' : 'auto', minWidth: isCollapsed ? '24px' : 'auto', maxWidth: isCollapsed ? '24px' : undefined }}
                        onClick={() => toggleColumnCollapse(col.id)}
                        title={isCollapsed ? `Expandir: ${col.label}` : `Minimizar: ${col.label}`}
                      >
                        {isCollapsed ? (
                          <span className="block text-[9px] leading-none" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{col.label}</span>
                        ) : col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pendingPaymentRows.map((row) => {
                  const isPending = row.type === 'additional' && !row.additionalData?.nome_completo;
                  const rowKey = getRowKey(row);
                  const isSelected = selectedRows.has(rowKey);
                  return (
                    <tr 
                      key={`pending-${row.reserva.id}-${row.participantIndex}-${row.type}`}
                      className={`border-b border-amber-200 hover:bg-amber-100/50 ${isPending ? 'bg-amber-100/30' : ''} ${isSelected ? 'bg-amber-200/50' : ''}`}
                    >
                      <td className="px-2 py-2 text-center border-r border-amber-200">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(rowKey)}
                        />
                      </td>
                      {visibleColumns.map((col) => {
                        const isCollapsed = collapsedColumns.has(col.id);
                        return (
                          <td 
                            key={col.id} 
                            className={`border-r border-amber-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'px-0 py-2' : 'px-3 py-2'}`}
                            style={{ width: isCollapsed ? '24px' : undefined, maxWidth: isCollapsed ? '24px' : undefined }}
                          >
                            {isCollapsed ? null : getCellValue(row, col.id)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMED PAYMENTS TABLE */}
      {confirmedPaymentRows.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Check className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">
              Participantes Confirmados ({confirmedPaymentRows.length})
            </span>
            {/* Package summary */}
            {(() => {
              const packageCounts: Record<string, number> = {};
              confirmedPaymentRows.forEach(row => {
                const { reserva, additionalData, type } = row;
                const isTitular = type === 'titular';
                let pacoteName: string | null = null;
                
                if (additionalData?.pricing_option_name) {
                  pacoteName = additionalData.pricing_option_name;
                } else if (isTitular) {
                  const titularParticipant = (additionalParticipants[reserva.id] || []).find(p => p.participant_index === 1);
                  pacoteName = titularParticipant?.pricing_option_name || null;
                  
                  if (!pacoteName && reserva.valor_passeio && pricingOptions.length > 0) {
                    const matchingOption = pricingOptions.find(opt => opt.pix_price === reserva.valor_passeio);
                    if (matchingOption) {
                      pacoteName = matchingOption.option_name;
                    }
                  }
                }
                
                if (pacoteName) {
                  packageCounts[pacoteName] = (packageCounts[pacoteName] || 0) + 1;
                }
              });
              
              const packageEntries = Object.entries(packageCounts);
              if (packageEntries.length === 0) return null;
              
              return (
                <span className="text-xs text-muted-foreground ml-2">
                  ({packageEntries.map(([name, count], idx) => (
                    <span key={name}>
                      {count} {name}{idx < packageEntries.length - 1 ? ', ' : ''}
                    </span>
                  ))})
                </span>
              );
            })()}
          </div>
        </div>
      )}
      <div 
        className="relative border border-border rounded-md bg-background group/table-scroll"
      >
        {/* Scroll arrow buttons */}
        <button
          type="button"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/90 border border-border rounded-r-md shadow-md p-1.5 hover:bg-muted transition-colors"
          onClick={() => {
            const container = document.getElementById('participants-scroll-container');
            if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
          }}
          aria-label="Scroll esquerda"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/90 border border-border rounded-l-md shadow-md p-1.5 hover:bg-muted transition-colors"
          onClick={() => {
            const container = document.getElementById('participants-scroll-container');
            if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
          }}
          aria-label="Scroll direita"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <div 
          id="participants-scroll-container"
          className="overflow-x-auto"
          onWheel={(e) => {
            // Enable horizontal scroll with Shift+wheel
            if (e.shiftKey && Math.abs(e.deltaY) > 0) {
              e.currentTarget.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr>
                {/* Select all checkbox */}
                <th className="px-2 py-2 text-center border-r border-b border-border w-10 bg-muted/95">
                  <Checkbox
                    checked={confirmedPaymentRows.length > 0 && confirmedPaymentRows.every(row => selectedRows.has(getRowKey(row)))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const confirmedKeys = confirmedPaymentRows.map(getRowKey);
                        setSelectedRows(prev => new Set([...prev, ...confirmedKeys]));
                      } else {
                        const confirmedKeys = new Set(confirmedPaymentRows.map(getRowKey));
                        setSelectedRows(prev => new Set([...prev].filter(k => !confirmedKeys.has(k))));
                      }
                    }}
                  />
                </th>
                {visibleColumns.map((col) => {
                  const isCollapsed = collapsedColumns.has(col.id);
                  return (
                    <th 
                      key={col.id} 
                      className={`text-left font-medium border-r border-b border-border whitespace-nowrap bg-muted/95 relative group select-none cursor-pointer ${isCollapsed ? 'px-0.5 py-2' : 'px-3 py-2'}`}
                      style={{ 
                        width: isCollapsed ? '24px' : (columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'auto'),
                        minWidth: isCollapsed ? '24px' : (columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'auto'),
                        maxWidth: isCollapsed ? '24px' : undefined,
                        backgroundColor: col.bgColor || undefined,
                        color: col.textColor || undefined
                      }}
                      onClick={() => toggleColumnCollapse(col.id)}
                      title={isCollapsed ? `Expandir: ${col.label}` : `Minimizar: ${col.label}`}
                    >
                      {isCollapsed ? (
                        <span className="block text-[9px] leading-none" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{col.label}</span>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>{col.label}</span>
                        </div>
                      )}
                      {/* Resize handle - only when expanded */}
                      {!isCollapsed && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-gray-300"
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, col.id); }}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {confirmedPaymentRows.map((row) => {
                const isPending = row.type === 'additional' && !row.additionalData?.nome_completo;
                const isStaff = row.type === 'staff' || row.isStaff;
                const rowKey = getRowKey(row);
                const isSelected = selectedRows.has(rowKey);
                return (
                  <tr 
                    key={`confirmed-${row.reserva.id}-${row.participantIndex}-${row.type}`}
                    className={`border-b border-border hover:bg-muted/30 ${showCancelled ? 'opacity-50' : ''} ${isPending ? 'bg-amber-50/50' : ''} ${isStaff ? 'bg-teal-50 hover:bg-teal-100/50' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    {/* Row checkbox */}
                    <td className="px-2 py-2 text-center border-r border-border">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(rowKey)}
                      />
                    </td>
                    {visibleColumns.map((col) => {
                      const isCollapsed = collapsedColumns.has(col.id);
                      return (
                        <td 
                          key={col.id} 
                          className={`border-r border-border whitespace-nowrap overflow-hidden ${isCollapsed ? 'px-0 py-2' : 'px-3 py-2'}`}
                          style={{ 
                            width: isCollapsed ? '24px' : undefined,
                            maxWidth: isCollapsed ? '24px' : undefined,
                            backgroundColor: col.bgColor || undefined,
                            color: col.textColor || undefined
                          }}
                        >
                          {isCollapsed ? null : getCellValue(row, col.id)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Horizontal scroll hint */}
        <div className="absolute bottom-0 right-0 px-2 py-1 text-[10px] text-muted-foreground bg-muted/80 rounded-tl pointer-events-none">
          Shift + scroll = mover horizontal
        </div>
      </div>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transferir Participantes</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Transferir {selectedRows.size} participante(s) para outro passeio.
              <br />
              <span className="text-xs text-amber-600">
                Nota: Apenas reservas (titulares) serão transferidas com todos os seus participantes.
              </span>
            </p>
            <div className="space-y-2">
              <Label className="text-sm">Passeio de destino</Label>
              <Select value={targetTourId} onValueChange={setTargetTourId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o passeio" />
                </SelectTrigger>
                <SelectContent>
                  {availableTours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.name} - {new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkTransfer} disabled={bulkLoading || !targetTourId}>
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir {selectedRows.size} item(ns).
            </p>
            <p className="text-sm text-destructive mt-2">
              Esta ação não pode ser desfeita. Reservas de titulares serão excluídas junto com todos os participantes vinculados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Additional Participant Modal */}
      <AdditionalParticipantModal
        open={editingParticipant.open}
        onClose={() => setEditingParticipant({ open: false, reservaId: '', participantIndex: 0, participant: null })}
        participant={editingParticipant.participant}
        reservaId={editingParticipant.reservaId}
        participantIndex={editingParticipant.participantIndex}
        onSaved={fetchAdditionalParticipants}
        boardingPoints={boardingPoints}
        tourId={tourId}
      />

      {/* Add Optional Item Modal */}
      <Dialog open={addOptionalModal.open} onOpenChange={(open) => {
        if (!open) {
          setAddOptionalModal({ open: false, reservaId: '' });
          setNewOptional({ id: '', nome: '', valor: '' });
          setUseCustomOptional(false);
        }
      }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {tourOptionalItems.length > 0 && !useCustomOptional && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Selecionar do passeio</Label>
                  <Select
                    value={newOptional.id}
                    onValueChange={(value) => setNewOptional(prev => ({ ...prev, id: value }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tourOptionalItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - {formatarValor(item.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button 
                  onClick={() => setUseCustomOptional(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Adicionar item personalizado
                </button>
              </>
            )}

            {tourOptionalItems.length === 0 && !useCustomOptional && (
              <div className="text-center py-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum item cadastrado</p>
                <button 
                  onClick={() => setUseCustomOptional(true)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Adicionar manualmente
                </button>
              </div>
            )}

            {useCustomOptional && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    placeholder="Ex: Chapéu"
                    value={newOptional.nome}
                    onChange={(e) => setNewOptional(prev => ({ ...prev, nome: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newOptional.valor}
                    onChange={(e) => setNewOptional(prev => ({ ...prev, valor: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                {tourOptionalItems.length > 0 && (
                  <button 
                    onClick={() => setUseCustomOptional(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Voltar para itens do passeio
                  </button>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              setAddOptionalModal({ open: false, reservaId: '' });
              setNewOptional({ id: '', nome: '', valor: '' });
              setUseCustomOptional(false);
            }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddOptional}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Member Modal */}
      {tourId && (
        <AddStaffMemberModal
          open={showAddStaffModal}
          onClose={() => setShowAddStaffModal(false)}
          tourId={tourId}
          boardingPoints={boardingPoints}
          onSaved={() => {
            fetchAdditionalParticipants();
            toast({ title: "Membro da equipe adicionado" });
          }}
        />
      )}

      {/* Seat Map Modal */}
      {tourId && hasTransportConfig && (
        <TourSeatMapManager 
          tourId={tourId}
          tourName=""
          isOpen={showSeatMapModal}
          onClose={() => {
            setShowSeatMapModal(false);
            fetchSeatAssignments();
          }}
        />
      )}

      {/* Edit Boarding Point Modal */}
      <Dialog open={!!editingBoarding?.open} onOpenChange={(open) => {
        if (!open) setEditingBoarding(null);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Editar Ponto de Embarque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Ponto de Embarque</Label>
              <Select 
                value={boardingFormData.ponto_embarque_id} 
                onValueChange={(val) => {
                  setBoardingFormData(prev => ({
                    ...prev,
                    ponto_embarque_id: val,
                    ponto_embarque_personalizado: val === 'outro' ? prev.ponto_embarque_personalizado : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ponto de embarque" />
                </SelectTrigger>
                <SelectContent>
                  {boardingPoints.map((point) => (
                    <SelectItem key={point.id} value={point.id}>
                      {point.nome}
                      {point.endereco && (
                        <span className="text-xs text-muted-foreground ml-1">
                          - {point.endereco}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value="outro" className="text-amber-700 font-medium">
                    📍 Outro local (personalizado)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {boardingFormData.ponto_embarque_id === 'outro' && (
              <div className="space-y-2">
                <Label className="text-sm text-amber-600">Endereço do ponto personalizado</Label>
                <Input
                  value={boardingFormData.ponto_embarque_personalizado}
                  onChange={(e) => setBoardingFormData(prev => ({
                    ...prev,
                    ponto_embarque_personalizado: e.target.value
                  }))}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  className="border-amber-300 focus:border-amber-500"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o endereço completo do ponto de embarque desejado.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoarding(null)}>
              Cancelar
            </Button>
            <Button onClick={saveBoardingPoint}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Optionals Modal */}
      <EditOptionalsModal
        open={editOptionalsModal.open}
        onClose={() => setEditOptionalsModal({ open: false, reservaId: '', participantName: '', currentOptionals: [] })}
        participantId={editOptionalsModal.participantId}
        reservaId={editOptionalsModal.reservaId}
        participantName={editOptionalsModal.participantName}
        currentOptionals={editOptionalsModal.currentOptionals}
        tourOptionalItems={tourOptionalItems}
        onSaved={() => {
          fetchAdditionalParticipants();
          onRefreshReservas?.();
        }}
      />

      {/* Filtered Export Modal */}
      <ParticipantsFilteredExport
        open={showFilteredExport}
        onOpenChange={setShowFilteredExport}
        participants={exportParticipantsData}
        availableOptionals={exportAvailableOptionals}
        availablePackages={exportAvailablePackages}
        availableBoardingPoints={exportAvailableBoardingPoints}
        availablePaymentStatuses={exportAvailablePaymentStatuses}
        tourName={tourName}
        tourDate={tourDate}
        tourEndDate={tourEndDate}
        tourCity={tourCity}
        tourState={tourState}
        tourVagas={tourVagas}
        totalParticipants={exportParticipantsData.length}
      />

      {/* AI Analysis Modal */}
      {tourId && (
        <ParticipantAnalysis
          tourId={tourId}
          tourName={tourName || ''}
          open={showAnalysis}
          onOpenChange={setShowAnalysis}
        />
      )}
    </>
  );
};

export default ParticipantsTable;
