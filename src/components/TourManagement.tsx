import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, Users, Target, Plus, Settings, CreditCard, Calendar, UserPlus, Download, RefreshCw, Trash2, Link, Check, X, Edit, MessageCircle, Clock, Copy, Lock, LockOpen, Building2, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WaitlistManagement } from '@/components/WaitlistManagement';
import { InteressadosManagement } from '@/components/InteressadosManagement';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Tour } from '@/hooks/useTours';
import BulkParticipantUpload from '@/components/BulkParticipantUpload';
import { CustomColumnsManager, CustomColumn, CustomColumnInput } from '@/components/CustomColumnsManager';
import ParticipantsTable, { Reserva } from '@/components/ParticipantsTable';
import ParticipantDetailsModal from '@/components/ParticipantDetailsModal';
import CancelReservationModal, { CancelReservationData } from '@/components/CancelReservationModal';
import { RoomDistributionManager } from '@/components/accommodation';
import { TourRocaPanel } from '@/components/roca';
import { BoardingExportTemplateModal } from '@/components/BoardingExportTemplateModal';
import * as XLSX from 'xlsx';

interface Pagamento {
  id: string;
  valor: number;
  data: string;
  forma: string;
  isNew?: boolean; // Flag to indicate if this is a new parcela not yet in the database
}

interface TourManagementProps {
  tour: Tour;
  onBack: () => void;
  /**
   * Chamado após atualizar dados do passeio (ex.: vagas), para refazer o fetch em telas externas.
   */
  onTourUpdated?: () => void;
}

const TourManagement: React.FC<TourManagementProps> = ({
  tour,
  onBack,
  onTourUpdated,
}) => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [filteredReservas, setFilteredReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Reserva | null>(null);
  const [editingReserva, setEditingReserva] = useState<string | null>(null);
  const [tempInputValues, setTempInputValues] = useState<{
    [key: string]: string;
  }>({});
  const [vagasTotal, setVagasTotal] = useState<number>(tour.vagas ?? 20);
  const [vagasFechadas, setVagasFechadas] = useState<boolean>(tour.vagas_fechadas ?? false);
  const [editingVagas, setEditingVagas] = useState(false);

  // Save vagas to database
  const saveVagas = async (newVagas: number) => {
    if (newVagas < 1) {
      toast({ title: "Vagas deve ser pelo menos 1", variant: "destructive" });
      return;
    }
    try {
      console.log('Saving vagas:', newVagas, 'for tour:', tour.id);
      const { error } = await supabase
        .from('tours')
        .update({ vagas: newVagas })
        .eq('id', tour.id);
      
      if (error) {
        console.error('Error saving vagas:', error);
        throw error;
      }
      console.log('Vagas saved successfully');
      setVagasTotal(newVagas);
      setEditingVagas(false);
      toast({ title: `Vagas atualizadas para ${newVagas}` });

      // Atualiza o resto do painel (lista de passeios, dashboard, etc.)
      onTourUpdated?.();
    } catch (error: any) {
      console.error('Error saving vagas:', error);
      toast({ title: "Erro ao salvar vagas", description: error.message, variant: "destructive" });
    }
  };

  // Fetch fresh vagas from database on mount
  useEffect(() => {
    const fetchVagas = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('vagas, vagas_fechadas')
        .eq('id', tour.id)
        .single();
      
      if (!error && data) {
        setVagasTotal(data.vagas ?? 20);
        setVagasFechadas(data.vagas_fechadas ?? false);
      }
    };
    fetchVagas();
  }, [tour.id]);

  // Toggle vagas fechadas
  const toggleVagasFechadas = async () => {
    try {
      const newValue = !vagasFechadas;
      const { error } = await supabase
        .from('tours')
        .update({ vagas_fechadas: newValue })
        .eq('id', tour.id);
      
      if (error) throw error;
      
      setVagasFechadas(newValue);
      toast({ 
        title: newValue ? "Vagas fechadas" : "Vagas reabertas",
        description: newValue 
          ? "O passeio agora aparece como 'Vagas encerradas'" 
          : "O passeio está aberto para novas reservas"
      });
      onTourUpdated?.();
    } catch (error: any) {
      toast({ 
        title: "Erro ao atualizar vagas", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };
  const [valorPadrao, setValorPadrao] = useState(tour.valor_padrao || 0);
  const [editingValorPadrao, setEditingValorPadrao] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [pagamentos, setPagamentos] = useState<{
    [key: string]: Pagamento[];
  }>({});
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    whatsapp: '',
    data_nascimento: '',
    ponto_embarque_id: '',
    contato_emergencia_nome: '',
    contato_emergencia_telefone: '',
    valor_passeio: valorPadrao,
    pricing_option_id: '',
    pricing_option_name: '',
    nivel_condicionamento: '',
    problema_saude: false,
    descricao_problema_saude: '',
    plano_saude: false,
    nome_plano_saude: '',
    assistencia_diferenciada: false,
    descricao_assistencia_diferenciada: ''
  });
  const [pricingOptions, setPricingOptions] = useState<Array<{ id: string; option_name: string; pix_price: number }>>([]);
  const [boardingPoints, setBoardingPoints] = useState<Array<{
    id: string;
    nome: string;
    endereco?: string;
    horario?: string;
  }>>([]);
  const [editingParticipant, setEditingParticipant] = useState<Reserva | null>(null);

  // Bulk payment state for exclusive tours
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('');
  const [applyingBulkPayment, setApplyingBulkPayment] = useState(false);

  // Custom columns state
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customColumnValues, setCustomColumnValues] = useState<Record<string, Record<string, string>>>({});

  // Tour optional items
  const [tourOptionalItems, setTourOptionalItems] = useState<Array<{ id: string; name: string; price: number; description?: string }>>([]);

  // View mode: participants, waitlist, accommodation, or interessados
  const [viewMode, setViewMode] = useState<'participants' | 'waitlist' | 'accommodation' | 'interessados' | 'seguro-roca'>('participants');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [interessadosCount, setInteressadosCount] = useState(0);
  const [hasAccommodation, setHasAccommodation] = useState<boolean>(tour.has_accommodation ?? false);
  const [staffCount, setStaffCount] = useState(0);
  const [participantsMap, setParticipantsMap] = useState<Record<string, any[]>>({});

  // Cancellation modal state
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    reservaId: string;
    participantName: string;
    valorPago: number;
  }>({ open: false, reservaId: '', participantName: '', valorPago: 0 });

  // Copy boarding points modal state
  const [copyBoardingModal, setCopyBoardingModal] = useState<{ open: boolean; text: string }>({ open: false, text: '' });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Boarding export template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Fetch waitlist count
  const fetchWaitlistCount = async () => {
    try {
      const { count, error } = await supabase
        .from('waitlist_entries')
        .select('*', { count: 'exact', head: true })
        .eq('tour_id', tour.id);
      
      if (!error && count !== null) {
        setWaitlistCount(count);
      }
    } catch (error) {
      console.error('Error fetching waitlist count:', error);
    }
  };

  // Fetch interessados count
  const fetchInteressadosCount = async () => {
    try {
      const { count, error } = await supabase
        .from('interessados')
        .select('*', { count: 'exact', head: true })
        .eq('passeio_id', tour.id);
      
      if (!error && count !== null) {
        setInteressadosCount(count);
      }
    } catch (error) {
      console.error('Error fetching interessados count:', error);
    }
  };

  useEffect(() => {
    fetchWaitlistCount();
    fetchInteressadosCount();
  }, [tour.id]);

  // Fetch all participants for export functions
  const fetchAllParticipantsForExport = async () => {
    const reservaIds = reservasConfirmadas.map(r => r.id);
    if (reservaIds.length === 0) return [];
    
    const { data: participants } = await supabase
      .from('reservation_participants')
      .select('*')
      .in('reserva_id', reservaIds)
      .eq('is_staff', false)
      .order('reserva_id')
      .order('participant_index');
    
    return participants || [];
  };

  // Build flat list of all participants for exports
  const buildExportParticipants = async () => {
    const allParticipants = await fetchAllParticipantsForExport();
    const participantsByReserva: Record<string, any[]> = {};
    
    allParticipants.forEach(p => {
      if (!participantsByReserva[p.reserva_id]) {
        participantsByReserva[p.reserva_id] = [];
      }
      participantsByReserva[p.reserva_id].push(p);
    });
    
    const exportList: Array<{
      nome_completo: string;
      cpf: string;
      email: string;
      whatsapp: string;
      data_nascimento: string;
      ponto_embarque_nome: string;
      valor_passeio: number;
      valor_pago: number;
      payment_status: string;
      contato_emergencia_nome: string;
      contato_emergencia_telefone: string;
      nivel_condicionamento: string;
    }> = [];
    
    reservasConfirmadas.forEach(r => {
      const reservaParticipants = participantsByReserva[r.id] || [];
      const numParticipantes = r.numero_participantes || 1;
      
      for (let i = 1; i <= numParticipantes; i++) {
        const participant = reservaParticipants.find(p => p.participant_index === i);
        
        if (participant && participant.nome_completo && !participant.nome_completo.startsWith('Participante ')) {
          // Get boarding point name
          let pontoEmbarqueNome = r.ponto_embarque?.nome || '';
          if (participant.ponto_embarque_id) {
            const bp = boardingPoints.find(b => b.id === participant.ponto_embarque_id);
            if (bp) pontoEmbarqueNome = bp.nome;
          }
          
          exportList.push({
            nome_completo: participant.nome_completo,
            cpf: participant.cpf || '',
            email: participant.email || '',
            whatsapp: participant.whatsapp || '',
            data_nascimento: participant.data_nascimento || '',
            ponto_embarque_nome: pontoEmbarqueNome,
            valor_passeio: r.valor_passeio || 0,
            valor_pago: r.valor_pago || 0,
            payment_status: r.payment_status,
            contato_emergencia_nome: participant.contato_emergencia_nome || '',
            contato_emergencia_telefone: participant.contato_emergencia_telefone || '',
            nivel_condicionamento: participant.nivel_condicionamento || ''
          });
        }
      }
    });
    
    return exportList;
  };

  // Funções de download de lista
  const downloadListaCompleta = async () => {
    const participants = await buildExportParticipants();
    let csv = 'Nº,Nome,CPF,Email,WhatsApp,Data Nascimento,Ponto Embarque,Valor Passeio,Valor Pago,Status Pagamento,Contato Emergência,Tel Emergência,Condicionamento\n';
    participants.forEach((p, i) => {
      csv += `${i + 1},"${p.nome_completo}","${p.cpf}","${p.email}","${p.whatsapp}","${p.data_nascimento}","${p.ponto_embarque_nome}",${p.valor_passeio},${p.valor_pago},"${p.payment_status}","${p.contato_emergencia_nome}","${p.contato_emergencia_telefone}","${p.nivel_condicionamento}"\n`;
    });
    downloadFile(csv, `lista-completa-${tour.name}.csv`);
    toast({ title: `Lista exportada com ${participants.length} participantes` });
  };

  const downloadListaNomesEmbarque = async () => {
    const participants = await buildExportParticipants();
    let csv = 'Nº,Nome,Ponto de Embarque\n';
    participants.forEach((p, i) => {
      csv += `${i + 1},"${p.nome_completo}","${p.ponto_embarque_nome}"\n`;
    });
    downloadFile(csv, `lista-nomes-embarque-${tour.name}.csv`);
    toast({ title: `Lista exportada com ${participants.length} participantes` });
  };

  // Download para Seguro-Aventura (formato exato da planilha de importação)
  const downloadSeguroAventura = async () => {
    const participants = await buildExportParticipants();

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Criar worksheet vazia
    const ws: XLSX.WorkSheet = {};

    // Definir a estrutura exata do modelo Seguro-Aventura
    // Linha 1: Título na coluna B
    ws['B1'] = {
      t: 's',
      v: 'PLANILHA IMPORTAÇÃO PARTICIPANTES SEGURO AVENTURA'
    };

    // Linha 3: Instrução na coluna C
    ws['C3'] = {
      t: 's',
      v: 'Estrangeiros somente podem ser adicionados via sistema'
    };

    // Linha 4: Instrução na coluna C
    ws['C4'] = {
      t: 's',
      v: 'Para menores de 14 anos sem cpf pode informar 000.000.000-00'
    };

    // Linha 5: Instrução na coluna C
    ws['C5'] = {
      t: 's',
      v: '* Campos Obrigatórios'
    };

    // Linha 7: Cabeçalhos (começando na coluna B)
    ws['B7'] = {
      t: 's',
      v: 'CPF (000.000.000-00) *'
    };
    ws['C7'] = {
      t: 's',
      v: 'NOME PARTICIPANTE *'
    };
    ws['D7'] = {
      t: 's',
      v: 'DATA NASCIMENTO (01/01/2001) *'
    };
    ws['E7'] = {
      t: 's',
      v: 'E-MAIL'
    };
    ws['F7'] = {
      t: 's',
      v: 'TELEFONE (00)000000000'
    };

    // Adicionar dados dos participantes a partir da linha 8 (começando na coluna B)
    participants.forEach((p, index) => {
      const row = 8 + index;

      // CPF com formatação (000.000.000-00) - formato aceito pelo sistema
      const cpfLimpo = (p.cpf || '').replace(/\D/g, '');
      let cpfFormatado = cpfLimpo;
      if (cpfLimpo.length === 11) {
        cpfFormatado = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9, 11)}`;
      }
      ws[`B${row}`] = {
        t: 's',
        v: cpfFormatado
      };

      // Nome do participante
      ws[`C${row}`] = {
        t: 's',
        v: p.nome_completo || ''
      };

      // Data nascimento: DD/MM/YYYY
      let dataFormatada = '';
      if (p.data_nascimento) {
        const date = new Date(p.data_nascimento + 'T12:00:00');
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        dataFormatada = `${dia}/${mes}/${ano}`;
      }
      ws[`D${row}`] = {
        t: 's',
        v: dataFormatada
      };

      // Email
      ws[`E${row}`] = {
        t: 's',
        v: p.email || ''
      };

      // Telefone apenas números
      const telLimpo = (p.whatsapp || '').replace(/\D/g, '');
      ws[`F${row}`] = {
        t: 's',
        v: telLimpo
      };
    });

    // Definir range da planilha
    const lastRow = 7 + participants.length;
    ws['!ref'] = `A1:F${lastRow}`;

    // Definir larguras das colunas
    ws['!cols'] = [{
      wch: 5
    },
    // A - Vazia
    {
      wch: 22
    },
    // B - CPF
    {
      wch: 40
    },
    // C - Nome
    {
      wch: 28
    },
    // D - Data Nascimento
    {
      wch: 30
    },
    // E - E-mail
    {
      wch: 22
    } // F - Telefone
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

    // Gerar e baixar arquivo
    XLSX.writeFile(wb, `seguro-aventura-${tour.name}.xlsx`);
    toast({ title: `Planilha exportada com ${participants.length} participantes` });
  };
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Funções de ação dos participantes
  const abrirWhatsApp = (whatsapp: string, nome: string) => {
    const numero = whatsapp.replace(/\D/g, '');
    const mensagem = `Olá ${nome}!`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };
  // Open cancellation modal instead of direct cancellation
  const openCancelModal = (reservaId: string) => {
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) return;
    
    setCancelModal({
      open: true,
      reservaId,
      participantName: reserva.cliente.nome_completo,
      valorPago: reserva.valor_pago || 0
    });
  };

  // Process cancellation with reason and refund info
  const processCancellation = async (data: CancelReservationData) => {
    const reservaId = cancelModal.reservaId;
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) return;

    try {
      // Determine payment_status based on refund
      let newPaymentStatus = reserva.payment_status;
      if (data.refund_type === 'total') {
        newPaymentStatus = 'reembolsado';
      } else if (data.refund_type === 'parcial') {
        newPaymentStatus = 'reembolso_parcial';
      }

      // Build the motivo string with details if present
      const motivoLabel = MOTIVOS_CANCELAMENTO.find(m => m.value === data.motivo_cancelamento)?.label || data.motivo_cancelamento;
      const motivoFinal = data.motivo_detalhes 
        ? `${motivoLabel}: ${data.motivo_detalhes}` 
        : motivoLabel;

      // Update reservation
      const updates: any = {
        status: 'cancelado',
        motivo_cancelamento: motivoFinal,
        data_cancelamento: new Date().toISOString(),
        payment_status: newPaymentStatus,
      };

      if (data.refund_amount > 0) {
        updates.refund_amount = data.refund_amount;
        updates.refund_date = new Date().toISOString();
        updates.refund_reason = `${motivoFinal}${data.refund_method ? ` (via ${data.refund_method})` : ''}`;
      }

      const { error } = await supabase
        .from('reservas')
        .update(updates)
        .eq('id', reservaId);

      if (error) throw error;

      // Log refund in payment_logs if there was a refund
      if (data.refund_amount > 0) {
        await supabase.from('payment_logs').insert({
          reserva_id: reservaId,
          event_type: 'refund_manual',
          event_status: data.refund_type === 'total' ? 'refunded' : 'partial_refund',
          event_message: `Reembolso ${data.refund_type === 'total' ? 'total' : 'parcial'} - ${motivoFinal}`,
          amount: reserva.valor_pago || 0,
          refund_amount: data.refund_amount,
          payment_method: data.refund_method || null,
        });
      }

      // Update local state
      setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, ...updates } : r));

      toast({
        title: "Reserva cancelada",
        description: data.refund_amount > 0 
          ? `Cancelada com reembolso de ${formatarValor(data.refund_amount)}`
          : "A reserva foi cancelada sem reembolso"
      });

      setCancelModal({ open: false, reservaId: '', participantName: '', valorPago: 0 });
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Motivos de cancelamento options (for label lookup)
  const MOTIVOS_CANCELAMENTO = [
    { value: 'desistencia_cliente', label: 'Desistência do cliente' },
    { value: 'problemas_saude', label: 'Problemas de saúde' },
    { value: 'conflito_agenda', label: 'Conflito de agenda' },
    { value: 'problemas_financeiros', label: 'Problemas financeiros' },
    { value: 'transferencia_passeio', label: 'Transferência para outro passeio' },
    { value: 'passeio_cancelado', label: 'Passeio cancelado pela empresa' },
    { value: 'clima', label: 'Condições climáticas' },
    { value: 'nao_compareceu', label: 'Não compareceu (no-show)' },
    { value: 'outro', label: 'Outro motivo' },
  ];
  const toggleTicketEnviado = async (reservaId: string, enviado: boolean) => {
    try {
      const {
        error
      } = await supabase.from('reservas').update({
        ticket_enviado: enviado
      }).eq('id', reservaId);
      if (error) throw error;
      setReservas(prev => prev.map(r => r.id === reservaId ? {
        ...r,
        ticket_enviado: enviado
      } : r));
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Funções para gerenciar pagamentos
  const calcularTotalPago = (reservaId: string) => {
    const pagamentosReserva = pagamentos[reservaId] || [];
    return pagamentosReserva.reduce((sum, p) => sum + p.valor, 0);
  };

  // Load parcelas from database
  const carregarParcelas = async (reservaId: string) => {
    try {
      const { data, error } = await supabase
        .from('reserva_parcelas')
        .select('*')
        .eq('reserva_id', reservaId)
        .order('data_pagamento', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const parcelasCarregadas: Pagamento[] = data.map(p => ({
          id: p.id,
          valor: Number(p.valor),
          data: p.data_pagamento,
          forma: p.forma_pagamento,
          isNew: false
        }));
        setPagamentos(prev => ({ ...prev, [reservaId]: parcelasCarregadas }));
      } else {
        // If no parcelas in DB but has valor_pago, create one entry as legacy data
        const reserva = reservas.find(r => r.id === reservaId);
        if (reserva?.valor_pago && reserva.valor_pago > 0) {
          // IMPORTANTE: usar o valor gravado no momento do pagamento (estático),
          // NÃO recalcular dinamicamente, para que opcionais adicionados depois não afetem o valor pago.
          const valorSalvoNoPagamento = reserva.valor_total_com_opcionais || reserva.valor_passeio || 0;
          const isCartao = reserva.payment_method?.toLowerCase().includes('cartao') || 
                          reserva.payment_method?.toLowerCase().includes('cartão') ||
                          reserva.payment_method?.toLowerCase().includes('card') ||
                          reserva.payment_method?.toLowerCase() === 'credit_card';
          
          // Para cartão, usar o valor gravado no pagamento (sem juros). Para outros, usar valor_pago direto.
          const valorParcela = isCartao ? valorSalvoNoPagamento : reserva.valor_pago;
          
          // Usar a data de pagamento real se existir, senão a data atual
          const dataPagamento = reserva.data_pagamento 
            ? new Date(reserva.data_pagamento).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          setPagamentos(prev => ({
            ...prev,
            [reservaId]: [{
              id: `legacy-${Date.now()}`,
              valor: valorParcela,
              data: dataPagamento,
              forma: reserva.payment_method || 'pix',
              isNew: true // Mark as new so it gets saved to the new table
            }]
          }));
        } else {
          setPagamentos(prev => ({ ...prev, [reservaId]: [] }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
      setPagamentos(prev => ({ ...prev, [reservaId]: [] }));
    }
  };

  const adicionarPagamento = (reservaId: string) => {
    const novoPagamento: Pagamento = {
      id: `new-${Date.now()}`,
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      forma: 'pix',
      isNew: true
    };
    setPagamentos(prev => ({
      ...prev,
      [reservaId]: [...(prev[reservaId] || []), novoPagamento]
    }));
  };

  const atualizarPagamento = (reservaId: string, pagamentoId: string, campo: keyof Pagamento, valor: any) => {
    setPagamentos(prev => {
      const novoPagamentos = {
        ...prev,
        [reservaId]: (prev[reservaId] || []).map(p => p.id === pagamentoId ? {
          ...p,
          [campo]: valor
        } : p)
      };
      return novoPagamentos;
    });
  };

  const removerPagamento = async (reservaId: string, pagamentoId: string) => {
    const pagamento = pagamentos[reservaId]?.find(p => p.id === pagamentoId);
    
    // If it's not a new parcela (already in DB), delete from database
    if (pagamento && !pagamento.isNew && !pagamento.id.startsWith('new-') && !pagamento.id.startsWith('legacy-')) {
      try {
        const { error } = await supabase
          .from('reserva_parcelas')
          .delete()
          .eq('id', pagamentoId);
        
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao remover parcela:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover parcela do banco",
          variant: "destructive"
        });
        return;
      }
    }
    
    setPagamentos(prev => ({
      ...prev,
      [reservaId]: (prev[reservaId] || []).filter(p => p.id !== pagamentoId)
    }));
  };

  const salvarPagamentos = async (reservaId: string) => {
    try {
      const parcelasReserva = pagamentos[reservaId] || [];
      const totalPago = parcelasReserva.reduce((sum, p) => sum + p.valor, 0);

      // Separate new and existing parcelas
      const novasParcelas = parcelasReserva.filter(p => p.isNew || p.id.startsWith('new-') || p.id.startsWith('legacy-'));
      const parcelasExistentes = parcelasReserva.filter(p => !p.isNew && !p.id.startsWith('new-') && !p.id.startsWith('legacy-'));

      // Insert new parcelas
      if (novasParcelas.length > 0) {
        const { error: insertError } = await supabase
          .from('reserva_parcelas')
          .insert(novasParcelas.map(p => ({
            reserva_id: reservaId,
            valor: p.valor,
            data_pagamento: p.data,
            forma_pagamento: p.forma
          })));
        
        if (insertError) throw insertError;
      }

      // Update existing parcelas
      for (const parcela of parcelasExistentes) {
        const { error: updateError } = await supabase
          .from('reserva_parcelas')
          .update({
            valor: parcela.valor,
            data_pagamento: parcela.data,
            forma_pagamento: parcela.forma
          })
          .eq('id', parcela.id);
        
        if (updateError) throw updateError;
      }

      // Update reserva total + data_pagamento + payment_method for financial views
      // Use FIRST parcela date (earliest) for data_pagamento - financial views will use
      // individual parcela dates from reserva_parcelas for cash-basis distribution
      const firstParcela = parcelasReserva.length > 0 
        ? parcelasReserva.reduce((earliest, p) => (p.data && (!earliest.data || p.data < earliest.data)) ? p : earliest, parcelasReserva[0])
        : null;
      
      const updateData: Record<string, any> = {
        valor_pago: totalPago,
        payment_status: totalPago > 0 ? 'pago' : 'pendente'
      };
      
      // Set data_pagamento from earliest parcela date, or now if none
      if (totalPago > 0) {
        if (firstParcela?.data) {
          updateData.data_pagamento = firstParcela.data;
        } else {
          updateData.data_pagamento = new Date().toISOString();
        }
        // Set payment_method based on first parcela
        if (firstParcela?.forma) {
          updateData.payment_method = firstParcela.forma === 'cartao' ? 'credit_card' : firstParcela.forma;
        }
      }
      
      const { error } = await supabase.from('reservas').update(updateData).eq('id', reservaId);
      
      if (error) throw error;

      // Update local state
      setReservas(prev => prev.map(r => r.id === reservaId ? {
        ...r,
        ...updateData
      } : r));
      
      setShowPaymentModal(null);
      toast({
        title: "Sucesso",
        description: "Pagamentos salvos com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchReservas();
    fetchBoardingPoints();
    fetchCustomColumns();
    fetchTourOptionalItems();
    fetchPricingOptions();
  }, [tour.id]);
  useEffect(() => {
    filterReservas();
  }, [reservas, searchTerm, statusFilter, paymentFilter]);

  // Fetch custom columns for this tour
  const fetchCustomColumns = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tour_custom_columns').select('*').eq('tour_id', tour.id).order('order_index');
      if (error) throw error;
      setCustomColumns(data as CustomColumn[] || []);
    } catch (error: any) {
      console.error('Erro ao buscar colunas personalizadas:', error);
    }
  };

  // Fetch custom column values when reservas change
  useEffect(() => {
    if (reservas.length > 0 && customColumns.length > 0) {
      fetchCustomColumnValues();
    }
  }, [reservas, customColumns]);
  const fetchCustomColumnValues = async () => {
    try {
      const reservaIds = reservas.map(r => r.id);
      const {
        data,
        error
      } = await supabase.from('reservation_custom_column_values').select('*').in('reserva_id', reservaIds);
      if (error) throw error;

      // Transform to nested object: { reserva_id: { column_id: value } }
      const valuesMap: Record<string, Record<string, string>> = {};
      (data || []).forEach(item => {
        if (!valuesMap[item.reserva_id]) {
          valuesMap[item.reserva_id] = {};
        }
        valuesMap[item.reserva_id][item.column_id] = item.value || '';
      });
      setCustomColumnValues(valuesMap);
    } catch (error: any) {
      console.error('Erro ao buscar valores das colunas:', error);
    }
  };
  const saveCustomColumnValue = async (reservaId: string, columnId: string, value: string) => {
    try {
      // Handle special case for select clear
      const finalValue = value === '_clear_' ? '' : value;
      const {
        error
      } = await supabase.from('reservation_custom_column_values').upsert({
        reserva_id: reservaId,
        column_id: columnId,
        value: finalValue
      }, {
        onConflict: 'reserva_id,column_id'
      });
      if (error) throw error;

      // Update local state
      setCustomColumnValues(prev => ({
        ...prev,
        [reservaId]: {
          ...prev[reservaId],
          [columnId]: finalValue
        }
      }));
    } catch (error: any) {
      toast({
        title: "Erro ao salvar valor",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const fetchBoardingPoints = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tour_boarding_points').select('id, nome, endereco, horario').eq('tour_id', tour.id).order('order_index');
      if (error) throw error;
      setBoardingPoints(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar pontos de embarque:', error);
    }
  };

  // Generate and copy boarding points text for WhatsApp
  const copyBoardingPointsText = async () => {
    // Get all participants including additional ones from reservation_participants
    const { data: participants, error } = await supabase
      .from('reservation_participants')
      .select(`
        id,
        nome_completo,
        ponto_embarque_id,
        ponto_embarque_personalizado,
        reserva_id,
        is_staff,
        participant_index
      `)
      .in('reserva_id', reservasConfirmadas.map(r => r.id));

    if (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Erro ao buscar participantes",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    // Create a map of boarding point ID to participant names
    const boardingPointParticipants: Record<string, string[]> = {};
    // Map for custom boarding points (ponto_embarque_personalizado)
    const customBoardingPoints: Record<string, string[]> = {};
    
    // Helper to get participant name (fallback to client name for index 1)
    const getParticipantName = (participant: any): string | null => {
      if (participant.nome_completo) return participant.nome_completo;
      if (participant.participant_index === 1) {
        const reserva = reservasConfirmadas.find(r => r.id === participant.reserva_id);
        return reserva?.cliente?.nome_completo || null;
      }
      return null;
    };
    
    // Process main reservations (primary participants) - only for those WITHOUT participant records
    reservasConfirmadas.forEach(reserva => {
      // Check if this reservation has participant records
      const hasParticipantRecords = participants?.some(p => p.reserva_id === reserva.id);
      if (hasParticipantRecords) return; // Skip - will be handled in participants loop
      
      const bpId = reserva.ponto_embarque?.nome ? 
        boardingPoints.find(bp => bp.nome === reserva.ponto_embarque.nome)?.id : 
        null;
      
      const boardingPointId = bpId || 
        boardingPoints.find(bp => bp.nome === reserva.ponto_embarque?.nome)?.id;
      
      if (boardingPointId && reserva.cliente?.nome_completo) {
        if (!boardingPointParticipants[boardingPointId]) {
          boardingPointParticipants[boardingPointId] = [];
        }
        boardingPointParticipants[boardingPointId].push(reserva.cliente.nome_completo);
      }
    });

    // Process all participants from reservation_participants
    participants?.forEach(participant => {
      if (participant.is_staff) return;
      
      const participantName = getParticipantName(participant);
      if (!participantName) return;
      
      // Check for custom boarding point first
      if (participant.ponto_embarque_personalizado) {
        const customKey = participant.ponto_embarque_personalizado.trim();
        if (customKey) {
          if (!customBoardingPoints[customKey]) {
            customBoardingPoints[customKey] = [];
          }
          if (!customBoardingPoints[customKey].includes(participantName)) {
            customBoardingPoints[customKey].push(participantName);
          }
          return; // Skip normal processing
        }
      }
      
      // Regular boarding point processing
      const bpId = participant.ponto_embarque_id || 
        (reservasConfirmadas.find(r => r.id === participant.reserva_id)?.ponto_embarque?.nome ?
        boardingPoints.find(bp => 
          bp.nome === reservasConfirmadas.find(r => r.id === participant.reserva_id)?.ponto_embarque?.nome
        )?.id : null);
      
      if (bpId) {
        if (!boardingPointParticipants[bpId]) {
          boardingPointParticipants[bpId] = [];
        }
        if (!boardingPointParticipants[bpId].includes(participantName)) {
          boardingPointParticipants[bpId].push(participantName);
        }
      }
    });

    // Sort boarding points by time (horario)
    const sortedBoardingPoints = [...boardingPoints].sort((a, b) => {
      if (!a.horario && !b.horario) return 0;
      if (!a.horario) return 1;
      if (!b.horario) return -1;
      return a.horario.localeCompare(b.horario);
    });

    // Fetch the template from database
    const { data: templateData } = await supabase
      .from('boarding_export_templates')
      .select('*')
      .eq('is_default', true)
      .single();

    // Use template or fallback to defaults
    const headerTemplate = templateData?.header_template || '🚸 *Pontos de embarque:*';
    const bpTemplate = templateData?.boarding_point_template || '📍 *{{nome}}*\n\n🕕 _{{horario}}_';
    const participantTemplate = templateData?.participant_template || '▪️ {{nome}}';

    // Build the formatted text using template
    let text = headerTemplate;

    // First, regular boarding points
    sortedBoardingPoints.forEach(bp => {
      const participantNames = boardingPointParticipants[bp.id];
      if (participantNames && participantNames.length > 0) {
        // Empty line before each boarding point
        text += '\n\n';
        
        // Apply boarding point template
        let bpText = bpTemplate
          .replace(/\{\{nome\}\}/g, bp.nome || '')
          .replace(/\{\{horario\}\}/g, bp.horario || '')
          .replace(/\{\{endereco\}\}/g, bp.endereco || '');
        
        text += bpText;
        
        // Blank line before participants, then list them alphabetically
        text += '\n';
        participantNames.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        participantNames.forEach(name => {
          text += '\n' + participantTemplate.replace(/\{\{nome\}\}/g, name);
        });
      }
    });

    // Then, custom boarding points at the end
    const customKeys = Object.keys(customBoardingPoints).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    customKeys.forEach(customName => {
      const participantNames = customBoardingPoints[customName];
      if (participantNames && participantNames.length > 0) {
        text += '\n\n';
        
        // Apply boarding point template with custom name
        let bpText = bpTemplate
          .replace(/\{\{nome\}\}/g, customName)
          .replace(/\{\{horario\}\}/g, '')
          .replace(/\{\{endereco\}\}/g, '');
        
        text += bpText;
        
        text += '\n';
        participantNames.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        participantNames.forEach(name => {
          text += '\n' + participantTemplate.replace(/\{\{nome\}\}/g, name);
        });
      }
    });

    // Open modal with the text for easy copying
    setCopyBoardingModal({ open: true, text });
  };

  // Handle select all text in modal
  const handleSelectAllText = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
      toast({
        title: "Texto selecionado!",
        description: "Agora pressione Ctrl+C (ou Cmd+C) para copiar.",
      });
    }
  };

  const fetchTourOptionalItems = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_optional_items')
        .select('id, name, price, description')
        .eq('tour_id', tour.id)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      setTourOptionalItems(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar itens opcionais:', error);
    }
  };

  const fetchPricingOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_pricing_options')
        .select('id, option_name, pix_price')
        .eq('tour_id', tour.id)
        .order('pix_price', { ascending: true });
      if (error) throw error;
      setPricingOptions(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar opções de preço:', error);
    }
  };
  const addParticipant = async () => {
    try {
      if (!newParticipant.nome_completo || !newParticipant.cpf || !newParticipant.email || !newParticipant.whatsapp || !newParticipant.data_nascimento || !newParticipant.ponto_embarque_id) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Check if client already exists
      const {
        data: existingClient
      } = await supabase.from('clientes').select('id').eq('cpf', newParticipant.cpf).maybeSingle();
      let clienteId: string;
      if (existingClient) {
        // Use existing client
        clienteId = existingClient.id;
      } else {
        // Create new client
        const {
          data: clienteData,
          error: clienteError
        } = await supabase.from('clientes').insert({
          nome_completo: newParticipant.nome_completo,
          cpf: newParticipant.cpf,
          email: newParticipant.email,
          whatsapp: newParticipant.whatsapp,
          data_nascimento: newParticipant.data_nascimento,
          capture_method: 'admin_manual'
        }).select().single();
        if (clienteError) throw clienteError;
        clienteId = clienteData.id;
      }

      // Create reservation
      const {
        data: reservaData,
        error: reservaError
      } = await supabase.from('reservas').insert({
        cliente_id: clienteId,
        tour_id: tour.id,
        ponto_embarque_id: newParticipant.ponto_embarque_id,
        contato_emergencia_nome: newParticipant.contato_emergencia_nome || null,
        contato_emergencia_telefone: newParticipant.contato_emergencia_telefone || null,
        valor_passeio: newParticipant.valor_passeio || 0,
        problema_saude: newParticipant.problema_saude,
        descricao_problema_saude: newParticipant.descricao_problema_saude || null,
        plano_saude: newParticipant.plano_saude,
        nome_plano_saude: newParticipant.nome_plano_saude || null,
        status: 'confirmado',
        payment_status: 'pendente',
        capture_method: 'admin_manual',
        numero_participantes: 1
      }).select('id').single();
      if (reservaError) throw reservaError;

      // Create participant record with additional fields
      const { error: participantError } = await supabase.from('reservation_participants').insert({
        reserva_id: reservaData.id,
        participant_index: 1,
        nome_completo: newParticipant.nome_completo,
        cpf: newParticipant.cpf,
        email: newParticipant.email,
        whatsapp: newParticipant.whatsapp,
        data_nascimento: newParticipant.data_nascimento,
        ponto_embarque_id: newParticipant.ponto_embarque_id,
        contato_emergencia_nome: newParticipant.contato_emergencia_nome || null,
        contato_emergencia_telefone: newParticipant.contato_emergencia_telefone || null,
        nivel_condicionamento: newParticipant.nivel_condicionamento || null,
        problema_saude: newParticipant.problema_saude,
        descricao_problema_saude: newParticipant.descricao_problema_saude || null,
        plano_saude: newParticipant.plano_saude,
        nome_plano_saude: newParticipant.nome_plano_saude || null,
        assistencia_diferenciada: newParticipant.assistencia_diferenciada,
        descricao_assistencia_diferenciada: newParticipant.descricao_assistencia_diferenciada || null,
        pricing_option_id: newParticipant.pricing_option_id || null,
        pricing_option_name: newParticipant.pricing_option_name || null
      });
      if (participantError) {
        console.error('Error creating participant record:', participantError);
      }
      toast({
        title: "Sucesso",
        description: "Participante adicionado com sucesso"
      });
      setShowAddParticipantModal(false);
      setNewParticipant({
        nome_completo: '',
        cpf: '',
        email: '',
        whatsapp: '',
        data_nascimento: '',
        ponto_embarque_id: '',
        contato_emergencia_nome: '',
        contato_emergencia_telefone: '',
        valor_passeio: valorPadrao,
        pricing_option_id: '',
        pricing_option_name: '',
        nivel_condicionamento: '',
        problema_saude: false,
        descricao_problema_saude: '',
        plano_saude: false,
        nome_plano_saude: '',
        assistencia_diferenciada: false,
        descricao_assistencia_diferenciada: ''
      });
      fetchReservas();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar participante",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const fetchReservas = async () => {
    try {
      setLoading(true);

      // Direct query to reservas table with joins - bypasses RPC admin check
      const {
        data,
        error
      } = await supabase.from('reservas').select(`
          *,
          clientes!fk_reservas_cliente (
            id,
            nome_completo,
            cpf,
            email,
            whatsapp,
            data_nascimento
          ),
          tour_boarding_points!fk_reservas_ponto_embarque (
            nome,
            endereco
          )
        `).eq('tour_id', tour.id).order('data_reserva', {
        ascending: false
      });
      if (error) throw error;

      // Transform the data to match our interface
      const processedData = (data || []).map((reserva: any) => ({
        id: reserva.id,
        reserva_numero: reserva.reserva_numero,
        data_reserva: reserva.data_reserva,
        data_pagamento: reserva.data_pagamento,
        valor_passeio: reserva.valor_passeio,
        valor_pago: reserva.valor_pago,
        valor_total_com_opcionais: reserva.valor_total_com_opcionais,
        numero_participantes: reserva.numero_participantes,
        adicionais: Array.isArray(reserva.adicionais) ? reserva.adicionais : [],
        selected_optional_items: Array.isArray(reserva.selected_optional_items) ? reserva.selected_optional_items : [],
        payment_status: reserva.payment_status,
        payment_method: reserva.payment_method,
        mp_status: reserva.mp_status,
        installments: reserva.installments,
        card_fee_amount: reserva.card_fee_amount,
        status: reserva.status,
        problema_saude: reserva.problema_saude,
        descricao_problema_saude: reserva.descricao_problema_saude,
        contato_emergencia_nome: reserva.contato_emergencia_nome,
        contato_emergencia_telefone: reserva.contato_emergencia_telefone,
        ticket_enviado: reserva.ticket_enviado,
        observacoes: reserva.observacoes,
        cliente: {
          id: reserva.clientes?.id || reserva.id,
          nome_completo: reserva.clientes?.nome_completo || '',
          cpf: reserva.clientes?.cpf || '',
          email: reserva.clientes?.email || '',
          whatsapp: reserva.clientes?.whatsapp || '',
          data_nascimento: reserva.clientes?.data_nascimento || ''
        },
        ponto_embarque: {
          nome: reserva.tour_boarding_points?.nome || '',
          endereco: reserva.tour_boarding_points?.endereco || ''
        }
      }));
      setReservas(processedData as any);
      
      // Fetch all participants for all reservations (needed for optionals calculation)
      const reservaIds = (data || []).map(r => r.id);
      if (reservaIds.length > 0) {
        const { data: participantsData } = await supabase
          .from('reservation_participants')
          .select('*')
          .in('reserva_id', reservaIds);
        
        // Group participants by reserva_id
        const grouped: Record<string, any[]> = {};
        let staffTotal = 0;
        (participantsData || []).forEach(p => {
          if (!grouped[p.reserva_id]) grouped[p.reserva_id] = [];
          grouped[p.reserva_id].push(p);
          if (p.is_staff) staffTotal++;
        });
        setParticipantsMap(grouped);
        setStaffCount(staffTotal);
      } else {
        setParticipantsMap({});
        setStaffCount(0);
      }
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      toast({
        title: "Erro ao carregar reservas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const filterReservas = () => {
    let filtered = [...reservas];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.cliente.nome_completo.toLowerCase().includes(term) || r.cliente.email.toLowerCase().includes(term) || r.cliente.cpf.includes(term));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(r => r.payment_status === paymentFilter);
    }
    setFilteredReservas(filtered);
  };

  // Separar reservas por status - Agora sem pendentes pois pagamento é automático
  // Reservas com payment_status 'pago' ou status 'confirmado'/'confirmada' vão para confirmados
  // EXCETO: cancelados, reembolsados (total ou parcial), transferidos
  const reservasConfirmadas = filteredReservas.filter(r => {
    // First, exclude canceled/refunded/transferred
    const isCancelado = r.status === 'cancelado' || r.status === 'cancelada';
    const isReembolsado = r.payment_status === 'reembolsado' || r.payment_status === 'reembolso_parcial';
    const isTransferido = r.status === 'transferido';
    
    if (isCancelado || isReembolsado || isTransferido) {
      return false;
    }
    
    // Include if confirmed or paid
    return r.status === 'confirmado' || r.status === 'confirmada' || r.payment_status === 'pago';
  });
  
  // Lista de não-confirmados: cancelados, reembolsados (total ou parcial), transferidos
  const reservasNaoConfirmadas = filteredReservas.filter(r => 
    r.status === 'cancelado' || 
    r.status === 'cancelada' ||
    r.payment_status === 'reembolsado' ||
    r.payment_status === 'reembolso_parcial' ||
    r.status === 'transferido'
  );
  const cancelarReserva = async (reservaId: string) => {
    await updateReserva(reservaId, {
      status: 'cancelado'
    });
    toast({
      title: "Reserva cancelada",
      description: "A reserva foi cancelada"
    });
  };
  const calcularValorTotal = (reserva: Reserva) => {
    const valorBase = reserva.valor_passeio || 0;
    
    // Legacy format: adicionais (manual additions)
    const valorAdicionais = (reserva.adicionais || []).reduce((sum, add) => sum + Number(add.valor || 0), 0);
    
    // Check if participants have specific optionals assigned
    const participants = participantsMap[reserva.id] || [];
    const hasParticipantOptionals = participants.some(
      (p) => !p.is_staff && Array.isArray(p.selected_optionals) && p.selected_optionals.length > 0
    );
    
    // Calculate optionals from participants
    const totalFromParticipants = participants
      .filter((p) => !p.is_staff)
      .reduce((sum, p) => {
        if (!Array.isArray(p.selected_optionals)) return sum;
        const opts = p.selected_optionals as any[];
        return sum + opts.reduce((s, opt) => {
          const price = Number(opt?.price ?? opt?.valor ?? 0);
          const qty = Number(opt?.quantity ?? opt?.quantidade ?? 1) || 1;
          return s + price * qty;
        }, 0);
      }, 0);
    
    // Calculate optionals from reservation level (legacy)
    const totalFromReserva = (reserva.selected_optional_items || []).reduce((sum, opt) => {
      const price = Number((opt as any)?.price ?? (opt as any)?.valor ?? 0);
      const qty = Number((opt as any)?.quantity ?? (opt as any)?.quantidade ?? 1) || 1;
      return sum + price * qty;
    }, 0);
    
    // Use participant optionals if they exist, otherwise use reservation optionals
    const opcionaisTotal = hasParticipantOptionals ? totalFromParticipants : totalFromReserva;
    
    return valorBase + valorAdicionais + opcionaisTotal;
  };

  const isCardPaymentMethod = (method?: string | null) => {
    const m = (method || '').toLowerCase();
    return m === 'credit_card' || m === 'cartao' || m === 'card';
  };

  // Valor pago SEM juros/taxa do cartão (mostra apenas o valor bruto do passeio)
  const calcularValorPagoBruto = (reserva: Reserva) => {
    const valorPago = reserva.valor_pago || 0;
    if (!isCardPaymentMethod(reserva.payment_method) || valorPago <= 0) return valorPago;

    const cardFee = reserva.card_fee_amount || 0;
    if (cardFee > 0) return Math.max(0, valorPago - cardFee);

    // Fallback: usar valor salvo no momento do pagamento (não recalcular com opcionais novos)
    return reserva.valor_total_com_opcionais || reserva.valor_passeio || valorPago;
  };

  const formatarValor = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const handleInputChange = (key: string, value: string) => {
    setTempInputValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const handleInputBlur = async (reservaId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    await updateReserva(reservaId, {
      [field]: numValue
    });
    setTempInputValues(prev => {
      const newValues = {
        ...prev
      };
      delete newValues[`${reservaId}_${field}`];
      return newValues;
    });
  };
  const updateReserva = async (reservaId: string, updates: any) => {
    try {
      const {
        error
      } = await supabase.from('reservas').update(updates).eq('id', reservaId);
      if (error) throw error;

      // Update local state directly instead of re-fetching
      setReservas(prev => prev.map(r => r.id === reservaId ? {
        ...r,
        ...updates
      } : r));
      toast({
        title: "Sucesso",
        description: "Reserva atualizada com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const updateStatusReserva = async (reservaId: string, novoStatus: string) => {
    await updateReserva(reservaId, {
      status: novoStatus
    });
  };
  const adicionarAdicional = async (reservaId: string) => {
    const nome = prompt('Nome do adicional:');
    const valor = prompt('Valor do adicional:');
    if (nome && valor) {
      const reserva = reservas.find(r => r.id === reservaId);
      if (!reserva) return;
      const novosAdicionais = [...(reserva.adicionais || []), {
        nome,
        valor: parseFloat(valor)
      }];
      await updateReserva(reservaId, {
        adicionais: novosAdicionais
      });
    }
  };
  const removerAdicional = async (reservaId: string, indexToRemove: number) => {
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) return;
    const novosAdicionais = reserva.adicionais.filter((_, index) => index !== indexToRemove);
    await updateReserva(reservaId, {
      adicionais: novosAdicionais
    });
  };
  const getStatusBadge = (status: string) => {
    const variants = {
      'pendente': 'pending' as const,
      'confirmado': 'confirmed' as const,
      'cancelado': 'cancelled' as const
    };
    return variants[status as keyof typeof variants] || 'pending';
  };
  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      'pago': 'paid' as const,
      'pendente': 'pending' as const
    };
    return variants[status as keyof typeof variants] || 'pending';
  };

  // Apply bulk payment for exclusive tours
  const applyBulkPayment = async () => {
    const amount = parseFloat(bulkPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor válido para o pagamento total.",
        variant: "destructive"
      });
      return;
    }
    if (reservasConfirmadas.length === 0) {
      toast({
        title: "Sem participantes",
        description: "Não há participantes confirmados para aplicar o pagamento.",
        variant: "destructive"
      });
      return;
    }
    setApplyingBulkPayment(true);
    try {
      // Update all confirmed reservations with their proportional share or equal distribution
      const updates = reservasConfirmadas.map(reserva => supabase.from('reservas').update({
        valor_pago: amount / reservasConfirmadas.length,
        payment_status: 'pago'
      }).eq('id', reserva.id));
      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) {
        throw new Error('Erro ao atualizar algumas reservas');
      }

      // Update local state
      setReservas(prev => prev.map(r => {
        const isConfirmed = reservasConfirmadas.some(rc => rc.id === r.id);
        if (isConfirmed) {
          return {
            ...r,
            valor_pago: amount / reservasConfirmadas.length,
            payment_status: 'pago'
          };
        }
        return r;
      }));
      setBulkPaymentAmount('');
      toast({
        title: "Pagamento aplicado",
        description: `Valor total de ${formatarValor(amount)} distribuído entre ${reservasConfirmadas.length} participantes.`
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setApplyingBulkPayment(false);
    }
  };
  const participantesConfirmados = reservasConfirmadas.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
  const ocupacao = participantesConfirmados + staffCount; // Include staff in occupation
  const percentualOcupacao = vagasTotal > 0 ? (ocupacao / vagasTotal * 100) : 0;
  const ocupacaoExcedida = ocupacao > vagasTotal;
  const vagasDisponiveis = Math.max(0, vagasTotal - ocupacao);
  const saveValorPadrao = async (novoValor: number) => {
    try {
      const {
        error
      } = await supabase.from('tours').update({
        valor_padrao: novoValor
      }).eq('id', tour.id);
      if (error) throw error;
      setValorPadrao(novoValor);
      setEditingValorPadrao(false);
      toast({
        title: "Sucesso",
        description: "Valor padrão atualizado"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar valor padrão",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleCopyReservationLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/reserva/${tour.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de reserva foi copiado para a área de transferência."
    });
  };
  return <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{tour.name}</h2>
            <p className="text-muted-foreground">
              {tour.city}, {tour.state} • {new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchReservas();
              fetchBoardingPoints();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <div className="flex rounded-lg border overflow-hidden">
            <Button 
              variant={viewMode === 'participants' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('participants')}
              className="rounded-none"
            >
              <Users className="h-4 w-4 mr-2" />
              Participantes
            </Button>
            {hasAccommodation && (
              <Button 
                variant={viewMode === 'accommodation' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('accommodation')}
                className="rounded-none"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Hospedagem
              </Button>
            )}
            <Button 
              variant={viewMode === 'waitlist' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setViewMode('waitlist'); fetchWaitlistCount(); }}
              className="rounded-none"
            >
              <Clock className="h-4 w-4 mr-2" />
              Lista de Espera
              {waitlistCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                  {waitlistCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant={viewMode === 'interessados' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setViewMode('interessados'); fetchInteressadosCount(); }}
              className="rounded-none"
            >
              <Target className="h-4 w-4 mr-2" />
              Interessados
              {interessadosCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                  {interessadosCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant={viewMode === 'seguro-roca' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('seguro-roca')}
              className="rounded-none"
            >
              <Shield className="h-4 w-4 mr-2" />
              Seguro
            </Button>
          </div>
          <Button variant="outline" onClick={handleCopyReservationLink} className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Copiar Link
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleVagasFechadas}
                  className={vagasFechadas ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-muted-foreground hover:text-foreground"}
                >
                  {vagasFechadas ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {vagasFechadas ? "Vagas fechadas - Clique para reabrir" : "Fechar vagas"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* View based on mode */}
      {viewMode === 'waitlist' ? (
        <WaitlistManagement tourId={tour.id} tourName={tour.name} />
      ) : viewMode === 'accommodation' ? (
        <RoomDistributionManager tourId={tour.id} tourName={tour.name} />
      ) : viewMode === 'interessados' ? (
        <InteressadosManagement tourId={tour.id} tourName={tour.name} />
      ) : viewMode === 'seguro-roca' ? (
        <TourRocaPanel 
          tourId={tour.id}
          tourName={tour.name}
          tourStartDate={tour.start_date}
          tourEndDate={tour.end_date}
          tourCity={tour.city}
          tourState={tour.state}
          tourDescription={tour.about}
        />
      ) : (
        <>
      {/* Estatísticas do Passeio - Compacto */}
      <div className="grid gap-2 md:grid-cols-5">

        <Card className={`py-2 ${ocupacaoExcedida ? 'border-red-500 bg-red-50' : ''}`}>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vagas Ocupadas</p>
                <div className="text-lg font-bold flex items-center gap-1">
                  <span className={ocupacaoExcedida ? 'text-red-600' : ''}>{ocupacao}</span>
                  <span>/</span>
                  {editingVagas ? (
                    <Input 
                      type="number" 
                      value={vagasTotal} 
                      onChange={e => setVagasTotal(parseInt(e.target.value) || 0)} 
                      onBlur={e => saveVagas(parseInt(e.target.value) || vagasTotal)} 
                      onKeyDown={e => { 
                        if (e.key === 'Enter') {
                          saveVagas(parseInt(e.currentTarget.value) || vagasTotal);
                        }
                        if (e.key === 'Escape') {
                          setEditingVagas(false);
                        }
                      }} 
                      className="inline-block w-16 h-6 text-lg font-bold border-primary/30 p-1" 
                      autoFocus 
                    />
                  ) : (
                    <span>{vagasTotal}</span>
                  )}
                  <span className={`text-xs ml-1 ${ocupacaoExcedida ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                    ({percentualOcupacao.toFixed(0)}%)
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${vagasFechadas ? 'text-red-600 font-medium' : vagasDisponiveis <= 0 ? 'text-red-600 font-medium' : vagasDisponiveis <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {vagasFechadas ? 'Vagas fechadas manualmente' : vagasDisponiveis <= 0 ? 'Esgotado' : `${vagasDisponiveis} disponíveis`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Button variant="ghost" size="sm" onClick={() => setEditingVagas(!editingVagas)} className="h-5 w-5 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="py-2 border-primary/30 bg-primary/5">
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Valor Padrão</p>
                {editingValorPadrao ? <Input type="number" step="0.01" value={valorPadrao} onChange={e => setValorPadrao(parseFloat(e.target.value) || 0)} onBlur={e => saveValorPadrao(parseFloat(e.target.value) || 0)} onKeyDown={e => {
                if (e.key === 'Enter') {
                  saveValorPadrao(parseFloat(e.currentTarget.value) || 0);
                }
              }} className="w-24 h-6 text-lg font-bold border-primary/30 p-1" autoFocus /> : <div className="text-lg font-bold text-primary">
                    {formatarValor(valorPadrao)}
                  </div>}
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-primary" />
                <Button variant="ghost" size="sm" onClick={() => setEditingValorPadrao(!editingValorPadrao)} className="h-5 w-5 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="py-2">
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <div className="text-lg font-bold">
                  {formatarValor(reservasConfirmadas.reduce((sum, r) => sum + calcularValorTotal(r), 0))}
                </div>
              </div>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Pago</p>
                <div className="text-lg font-bold text-green-600">
                  {formatarValor(reservasConfirmadas.reduce((sum, r) => sum + calcularValorPagoBruto(r), 0))}
                </div>
              </div>
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Aberto</p>
                <div className="text-lg font-bold text-red-600">
                  {formatarValor(reservasConfirmadas.reduce((sum, r) => sum + (calcularValorTotal(r) - calcularValorPagoBruto(r)), 0))}
                </div>
              </div>
              <X className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status da Reserva" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabelas de Participantes */}
      {loading ? <div className="text-center py-12">
          <div className="text-lg">Carregando participantes...</div>
        </div> : <div className="space-y-6">

          {/* Tabela de Reservas Confirmadas */}
          <Card>
            <CardHeader className="bg-green-50 py-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="confirmed" className="text-sm">
                      {reservasConfirmadas.length}
                    </Badge>
                    Participantes Confirmados
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyBoardingPointsText}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar Embarques
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1 text-card" />
                          Baixar Lista
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={downloadListaCompleta}>
                          Lista Completa (todos os dados)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={downloadListaNomesEmbarque}>
                          Nomes e Pontos de Embarque
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={downloadSeguroAventura}>
                          Dados do Seguro-Aventura
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" onClick={() => setShowAddParticipantModal(true)} className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Participante
                    </Button>
                    <BulkParticipantUpload tourId={tour.id} boardingPoints={boardingPoints} onSuccess={fetchReservas} valorPadrao={valorPadrao} />
                    <Button size="sm" variant="outline" onClick={fetchReservas} title="Atualizar lista">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CustomColumnsManager tourId={tour.id} columns={customColumns} onColumnsChange={setCustomColumns} />
                </div>
                {/* Bulk payment option for exclusive tours */}
                {tour.is_exclusive && <div className="flex items-center gap-2 pt-2 border-t border-green-200 mt-2">
                    <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Pagamento em Lote:</span>
                      <Input type="number" step="0.01" placeholder="Valor total pago" value={bulkPaymentAmount} onChange={e => setBulkPaymentAmount(e.target.value)} className="w-36 h-8" />
                      <Button size="sm" onClick={applyBulkPayment} disabled={applyingBulkPayment || !bulkPaymentAmount} className="bg-green-600 hover:bg-green-700">
                        {applyingBulkPayment ? 'Aplicando...' : 'Aplicar para Todos'}
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      O valor será dividido igualmente entre os {reservasConfirmadas.length} participantes
                    </span>
                  </div>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ParticipantsTable
                reservas={reservasConfirmadas}
                customColumns={customColumns}
                customColumnValues={customColumnValues}
                onViewDetails={setSelectedParticipant}
                onEditReserva={updateReserva}
                onToggleTicket={toggleTicketEnviado}
                onExcluir={openCancelModal}
                onWhatsApp={abrirWhatsApp}
                tourOptionalItems={tourOptionalItems}
                boardingPoints={boardingPoints}
                tourId={tour.id}
                tourName={tour.name}
                tourDate={tour.start_date}
                tourEndDate={tour.end_date}
                tourCity={tour.city}
                tourState={tour.state}
                tourVagas={tour.vagas}
                onOpenPayments={async (reservaId) => {
                  await carregarParcelas(reservaId);
                  setShowPaymentModal(reservaId);
                }}
                onSaveCustomColumn={saveCustomColumnValue}
                onRefreshReservas={fetchReservas}
              />
            </CardContent>
          </Card>

          {/* Tabela de Reservas Não Confirmadas (Cancelados, Reembolsados, Transferidos) */}
          {reservasNaoConfirmadas.length > 0 && (
            <Card className="border-gray-300">
              <CardHeader className="bg-gray-50 py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="destructive" className="text-sm">
                    {reservasNaoConfirmadas.length}
                  </Badge>
                  Não Participantes (Cancelados / Reembolsados / Transferidos)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ParticipantsTable
                  reservas={reservasNaoConfirmadas}
                  customColumns={customColumns}
                  customColumnValues={customColumnValues}
                  onViewDetails={setSelectedParticipant}
                  onEditReserva={updateReserva}
                  onToggleTicket={toggleTicketEnviado}
                  onExcluir={openCancelModal}
                  onWhatsApp={abrirWhatsApp}
                  tourOptionalItems={tourOptionalItems}
                  boardingPoints={boardingPoints}
                  onOpenPayments={async (reservaId) => {
                    await carregarParcelas(reservaId);
                    setShowPaymentModal(reservaId);
                  }}
                  onSaveCustomColumn={saveCustomColumnValue}
                  showCancelled
                  onRefreshReservas={fetchReservas}
                />
              </CardContent>
            </Card>
          )}
        </div>}

      {/* Modal de Cancelamento */}
      <CancelReservationModal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, reservaId: '', participantName: '', valorPago: 0 })}
        onConfirm={processCancellation}
        reservaId={cancelModal.reservaId}
        participantName={cancelModal.participantName}
        valorPago={cancelModal.valorPago}
      />

      {/* Modal de Detalhes do Participante */}
      <ParticipantDetailsModal
        reserva={selectedParticipant}
        open={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        onEdit={(reserva) => {
          setEditingParticipant(reserva);
          setSelectedParticipant(null);
        }}
        onWhatsApp={abrirWhatsApp}
      />

      {/* Modal de Gerenciamento de Pagamentos */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Pagamentos</DialogTitle>
          </DialogHeader>
          
          {showPaymentModal && <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Parcelas de Pagamento</h4>
                <Button onClick={() => adicionarPagamento(showPaymentModal)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Parcela
                </Button>
              </div>

              {/* Lista de Pagamentos */}
              <div className="space-y-3">
                {(pagamentos[showPaymentModal] || []).map((pagamento, index) => <div key={pagamento.id} className="grid grid-cols-5 gap-3 items-center p-3 border rounded-lg">
                    <div>
                      <label className="text-sm font-medium">Parcela {index + 1}</label>
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted-foreground">Valor</label>
                      <Input type="number" step="0.01" value={pagamento.valor} onChange={e => atualizarPagamento(showPaymentModal, pagamento.id, 'valor', parseFloat(e.target.value) || 0)} placeholder="R$ 0,00" />
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted-foreground">Data</label>
                      <Input type="date" value={pagamento.data} onChange={e => atualizarPagamento(showPaymentModal, pagamento.id, 'data', e.target.value)} />
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted-foreground">Forma</label>
                      <Select value={pagamento.forma} onValueChange={value => atualizarPagamento(showPaymentModal, pagamento.id, 'forma', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="destructive" size="sm" onClick={() => removerPagamento(showPaymentModal, pagamento.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>)}

                {/* Resumo dos Pagamentos */}
                <div className="border-t pt-4 space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 font-medium">Total Pago</span>
                      <div className="text-lg font-bold text-green-800">
                        {formatarValor(calcularTotalPago(showPaymentModal))}
                      </div>
                      <div className="text-xs text-green-600">
                        {(pagamentos[showPaymentModal] || []).length} parcela(s)
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium">Valor Total</span>
                      <div className="text-lg font-bold text-blue-800">
                        {formatarValor(calcularValorTotal(filteredReservas.find(r => r.id === showPaymentModal)!))}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700 font-medium">Saldo Restante</span>
                      <div className="text-lg font-bold text-red-800">
                        {formatarValor(calcularValorTotal(filteredReservas.find(r => r.id === showPaymentModal)!) - calcularTotalPago(showPaymentModal))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPaymentModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => salvarPagamentos(showPaymentModal)}>
                  Salvar Pagamentos
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar Participante */}
      <Dialog open={showAddParticipantModal} onOpenChange={setShowAddParticipantModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Participante
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh] overflow-auto pr-4">
            <div className="space-y-4">
              {/* Pacote */}
              {pricingOptions.length > 0 && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="text-purple-800">Pacote *</Label>
                  <Select 
                    value={newParticipant.pricing_option_id} 
                    onValueChange={value => {
                      const selected = pricingOptions.find(p => p.id === value);
                      setNewParticipant(prev => ({
                        ...prev,
                        pricing_option_id: value,
                        pricing_option_name: selected?.option_name || '',
                        valor_passeio: selected?.pix_price || prev.valor_passeio
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.option_name} - R$ {option.pix_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input id="nome" value={newParticipant.nome_completo} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    nome_completo: e.target.value
                  }))} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" value={newParticipant.cpf} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    cpf: e.target.value
                  }))} onBlur={async e => {
                    const cpf = e.target.value.trim();
                    if (cpf.length >= 11) {
                      const { data } = await supabase.from('clientes').select('*').eq('cpf', cpf).maybeSingle();
                      if (data) {
                        setNewParticipant(prev => ({
                          ...prev,
                          nome_completo: data.nome_completo || prev.nome_completo,
                          email: data.email || prev.email,
                          whatsapp: data.whatsapp || prev.whatsapp,
                          data_nascimento: data.data_nascimento || prev.data_nascimento,
                          contato_emergencia_nome: data.contato_emergencia_nome || prev.contato_emergencia_nome,
                          contato_emergencia_telefone: data.contato_emergencia_telefone || prev.contato_emergencia_telefone,
                          problema_saude: data.problema_saude ?? prev.problema_saude,
                          descricao_problema_saude: data.descricao_problema_saude || prev.descricao_problema_saude
                        }));
                        toast({ title: "Cliente encontrado", description: "Dados preenchidos automaticamente" });
                      }
                    }
                  }} placeholder="000.000.000-00" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={newParticipant.email} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    email: e.target.value
                  }))} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input id="whatsapp" value={newParticipant.whatsapp} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    whatsapp: e.target.value
                  }))} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nascimento">Data de Nascimento *</Label>
                  <Input id="nascimento" type="date" value={newParticipant.data_nascimento} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    data_nascimento: e.target.value
                  }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor do Passeio</Label>
                  <Input id="valor" type="number" step="0.01" value={newParticipant.valor_passeio || ''} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    valor_passeio: parseFloat(e.target.value) || 0
                  }))} placeholder="0,00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ponto">Ponto de Embarque *</Label>
                <Select value={newParticipant.ponto_embarque_id} onValueChange={value => setNewParticipant(prev => ({
                  ...prev,
                  ponto_embarque_id: value
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ponto de embarque" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardingPoints.map(point => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nível de Condicionamento */}
              <div className="space-y-2">
                <Label>Nível de Condicionamento Físico</Label>
                <RadioGroup 
                  value={newParticipant.nivel_condicionamento} 
                  onValueChange={value => setNewParticipant(prev => ({ ...prev, nivel_condicionamento: value }))}
                  className="flex flex-wrap gap-4"
                >
                  {['Sedentário', 'Leve', 'Moderado', 'Ativo', 'Atleta'].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`cond-new-${option}`} />
                      <Label htmlFor={`cond-new-${option}`} className="font-normal cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Problema de Saúde */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="new_problema_saude"
                    checked={newParticipant.problema_saude}
                    onCheckedChange={checked => setNewParticipant(prev => ({ 
                      ...prev, 
                      problema_saude: checked,
                      descricao_problema_saude: checked ? prev.descricao_problema_saude : ''
                    }))}
                  />
                  <Label htmlFor="new_problema_saude" className="cursor-pointer">Possui algum problema de saúde?</Label>
                </div>
                {newParticipant.problema_saude && (
                  <Textarea
                    value={newParticipant.descricao_problema_saude}
                    onChange={e => setNewParticipant(prev => ({ ...prev, descricao_problema_saude: e.target.value }))}
                    placeholder="Descreva o problema de saúde..."
                    rows={2}
                  />
                )}
              </div>

              {/* Plano de Saúde */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="new_plano_saude"
                    checked={newParticipant.plano_saude}
                    onCheckedChange={checked => setNewParticipant(prev => ({ 
                      ...prev, 
                      plano_saude: checked,
                      nome_plano_saude: checked ? prev.nome_plano_saude : ''
                    }))}
                  />
                  <Label htmlFor="new_plano_saude" className="cursor-pointer">Possui plano de saúde?</Label>
                </div>
                {newParticipant.plano_saude && (
                  <Input
                    value={newParticipant.nome_plano_saude}
                    onChange={e => setNewParticipant(prev => ({ ...prev, nome_plano_saude: e.target.value }))}
                    placeholder="Nome do plano de saúde"
                  />
                )}
              </div>

              {/* Assistência Diferenciada */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="new_assistencia_diferenciada"
                    checked={newParticipant.assistencia_diferenciada}
                    onCheckedChange={checked => setNewParticipant(prev => ({ 
                      ...prev, 
                      assistencia_diferenciada: checked,
                      descricao_assistencia_diferenciada: checked ? prev.descricao_assistencia_diferenciada : ''
                    }))}
                  />
                  <Label htmlFor="new_assistencia_diferenciada" className="cursor-pointer">Necessita de assistência diferenciada?</Label>
                </div>
                {newParticipant.assistencia_diferenciada && (
                  <Textarea
                    value={newParticipant.descricao_assistencia_diferenciada}
                    onChange={e => setNewParticipant(prev => ({ ...prev, descricao_assistencia_diferenciada: e.target.value }))}
                    placeholder="Descreva a necessidade de assistência..."
                    rows={2}
                  />
                )}
              </div>

              {/* Contato de Emergência */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencia_nome">Contato Emergência</Label>
                  <Input id="emergencia_nome" value={newParticipant.contato_emergencia_nome} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    contato_emergencia_nome: e.target.value
                  }))} placeholder="Nome do contato" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencia_tel">Telefone Emergência</Label>
                  <Input id="emergencia_tel" value={newParticipant.contato_emergencia_telefone} onChange={e => setNewParticipant(prev => ({
                    ...prev,
                    contato_emergencia_telefone: e.target.value
                  }))} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowAddParticipantModal(false)}>
              Cancelar
            </Button>
            <Button onClick={addParticipant}>
              <UserPlus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Participante */}
      <Dialog open={!!editingParticipant} onOpenChange={() => setEditingParticipant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Participante
            </DialogTitle>
          </DialogHeader>
          
          {editingParticipant && <EditParticipantForm reserva={editingParticipant} boardingPoints={boardingPoints} onSave={async updatedData => {
          try {
            // Update cliente
            const {
              error: clienteError
            } = await supabase.from('clientes').update({
              nome_completo: updatedData.nome_completo,
              email: updatedData.email,
              whatsapp: updatedData.whatsapp,
              data_nascimento: updatedData.data_nascimento
            }).eq('id', editingParticipant.cliente.id);
            if (clienteError) throw clienteError;

            // Update reserva - only include ponto_embarque_id if changed
            const reservaUpdateData: any = {
              contato_emergencia_nome: updatedData.contato_emergencia_nome,
              contato_emergencia_telefone: updatedData.contato_emergencia_telefone,
              problema_saude: updatedData.problema_saude,
              descricao_problema_saude: updatedData.descricao_problema_saude
            };
            if (updatedData.ponto_embarque_id) {
              reservaUpdateData.ponto_embarque_id = updatedData.ponto_embarque_id;
            }
            const {
              error: reservaError
            } = await supabase.from('reservas').update(reservaUpdateData).eq('id', editingParticipant.id);
            if (reservaError) throw reservaError;
            toast({
              title: "Sucesso",
              description: "Dados atualizados com sucesso"
            });
            setEditingParticipant(null);
            fetchReservas();
          } catch (error: any) {
            toast({
              title: "Erro ao atualizar",
              description: error.message,
              variant: "destructive"
            });
          }
        }} onCancel={() => setEditingParticipant(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal de Copiar Embarques */}
      <Dialog open={copyBoardingModal.open} onOpenChange={(open) => setCopyBoardingModal({ open, text: open ? copyBoardingModal.text : '' })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copiar Pontos de Embarque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Edite o texto abaixo se necessário, depois clique em "Selecionar Tudo" e copie (Ctrl+C ou Cmd+C):
            </p>
            <Textarea
              ref={textareaRef}
              value={copyBoardingModal.text}
              onChange={(e) => setCopyBoardingModal(prev => ({ ...prev, text: e.target.value }))}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCopyBoardingModal({ open: false, text: '' })}>
                Fechar
              </Button>
              <Button onClick={handleSelectAllText} className="bg-primary hover:bg-primary/90">
                <Copy className="h-4 w-4 mr-2" />
                Selecionar Tudo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurar Template de Embarques */}
      <BoardingExportTemplateModal 
        open={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
      />
        </>
      )}
    </div>;
};

// Componente de formulário de edição
const EditParticipantForm: React.FC<{
  reserva: Reserva;
  boardingPoints: Array<{
    id: string;
    nome: string;
  }>;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({
  reserva,
  boardingPoints,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    nome_completo: reserva.cliente.nome_completo,
    email: reserva.cliente.email,
    whatsapp: reserva.cliente.whatsapp,
    data_nascimento: reserva.cliente.data_nascimento,
    ponto_embarque_id: '',
    contato_emergencia_nome: reserva.contato_emergencia_nome,
    contato_emergencia_telefone: reserva.contato_emergencia_telefone,
    problema_saude: reserva.problema_saude,
    descricao_problema_saude: reserva.descricao_problema_saude || ''
  });
  return <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome Completo</Label>
          <Input value={formData.nome_completo} onChange={e => setFormData(prev => ({
          ...prev,
          nome_completo: e.target.value
        }))} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={e => setFormData(prev => ({
          ...prev,
          email: e.target.value
        }))} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input value={formData.whatsapp} onChange={e => setFormData(prev => ({
          ...prev,
          whatsapp: e.target.value
        }))} />
        </div>
        <div className="space-y-2">
          <Label>Data de Nascimento</Label>
          <Input type="date" value={formData.data_nascimento} onChange={e => setFormData(prev => ({
          ...prev,
          data_nascimento: e.target.value
        }))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ponto de Embarque</Label>
        <Select value={formData.ponto_embarque_id} onValueChange={value => setFormData(prev => ({
        ...prev,
        ponto_embarque_id: value
      }))}>
          <SelectTrigger>
            <SelectValue placeholder={reserva.ponto_embarque.nome} />
          </SelectTrigger>
          <SelectContent>
            {boardingPoints.map(point => <SelectItem key={point.id} value={point.id}>
                {point.nome}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Contato Emergência</Label>
          <Input value={formData.contato_emergencia_nome} onChange={e => setFormData(prev => ({
          ...prev,
          contato_emergencia_nome: e.target.value
        }))} />
        </div>
        <div className="space-y-2">
          <Label>Telefone Emergência</Label>
          <Input value={formData.contato_emergencia_telefone} onChange={e => setFormData(prev => ({
          ...prev,
          contato_emergencia_telefone: e.target.value
        }))} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="problema_saude" checked={formData.problema_saude} onChange={e => setFormData(prev => ({
          ...prev,
          problema_saude: e.target.checked
        }))} className="rounded" />
          <Label htmlFor="problema_saude">Possui problema de saúde</Label>
        </div>
        {formData.problema_saude && <Input placeholder="Descreva o problema de saúde" value={formData.descricao_problema_saude} onChange={e => setFormData(prev => ({
        ...prev,
        descricao_problema_saude: e.target.value
      }))} />}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)}>
          Salvar Alterações
        </Button>
      </div>
    </div>;
};
export default TourManagement;