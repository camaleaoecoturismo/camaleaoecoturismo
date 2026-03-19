// Room Distribution Manager - Accommodation management
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { 
  Building2, Users, DoorOpen, User, X, Check, AlertCircle, Settings, RefreshCw, 
  LayoutGrid, List, Download, FileText, FileSpreadsheet, ChevronDown, Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AccommodationRoom, 
  RoomAssignment, 
  ParticipantForRoom,
  AccommodationWithRooms,
  RoomWithOccupancy
} from './types';
import { AccommodationConfigModal } from './AccommodationConfigModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface RoomDistributionManagerProps {
  tourId: string;
  tourName: string;
}

// Cores para diferenciar hospedagens
const ACCOMMODATION_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100', text: 'text-blue-700', accent: 'bg-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-100', text: 'text-emerald-700', accent: 'bg-emerald-500' },
  { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100', text: 'text-purple-700', accent: 'bg-purple-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-100', text: 'text-amber-700', accent: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', header: 'bg-rose-100', text: 'text-rose-700', accent: 'bg-rose-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', header: 'bg-cyan-100', text: 'text-cyan-700', accent: 'bg-cyan-500' },
];

type ViewMode = 'cards' | 'list';

export const RoomDistributionManager: React.FC<RoomDistributionManagerProps> = ({
  tourId,
  tourName,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accommodations, setAccommodations] = useState<AccommodationWithRooms[]>([]);
  const [unassignedParticipants, setUnassignedParticipants] = useState<ParticipantForRoom[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantForRoom[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState<ParticipantForRoom | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [editingRoomNotes, setEditingRoomNotes] = useState<string | null>(null);
  const [roomNotesInput, setRoomNotesInput] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch accommodations with rooms
      const { data: accData, error: accError } = await supabase
        .from('tour_accommodations')
        .select('*')
        .eq('tour_id', tourId)
        .order('order_index');

      if (accError) throw accError;

      // Fetch rooms
      const accIds = (accData || []).map(a => a.id);
      let roomsData: AccommodationRoom[] = [];
      if (accIds.length > 0) {
        const { data: rData, error: rError } = await supabase
          .from('accommodation_rooms')
          .select('*')
          .in('accommodation_id', accIds)
          .order('order_index');
        if (rError) throw rError;
        roomsData = rData || [];
      }

      // Fetch room assignments
      const roomIds = roomsData.map(r => r.id);
      let assignmentsData: RoomAssignment[] = [];
      if (roomIds.length > 0) {
        const { data: aData, error: aError } = await supabase
          .from('room_assignments')
          .select('*')
          .in('room_id', roomIds);
        if (aError) throw aError;
        assignmentsData = aData || [];
      }

      // Fetch reservas do tour (vamos filtrar confirmadas/pagas no client)
      const { data: reservasRaw, error: reservasError } = await supabase
        .from('reservas')
        .select(`
          id,
          numero_participantes,
          status,
          payment_status,
          observacoes,
          valor_passeio,
          clientes!fk_reservas_cliente (
            nome_completo,
            cpf,
            whatsapp
          )
        `)
        .eq('tour_id', tourId);

      if (reservasError) throw reservasError;

      // Opções de pacote (pricing) do tour (para fallback quando participant não tem pricing_option)
      const { data: pricingOptionsRaw, error: pricingOptionsError } = await supabase
        .from('tour_pricing_options')
        .select('id, option_name, pix_price, card_price')
        .eq('tour_id', tourId);

      if (pricingOptionsError) throw pricingOptionsError;

      const pricingOptions = pricingOptionsRaw || [];

      const getPackageNameFromReserva = (reserva: any) => {
        const reservaPrice = Number(reserva?.valor_passeio);
        if (!Number.isFinite(reservaPrice) || reservaPrice <= 0) return undefined;

        const match = pricingOptions.find((opt: any) => {
          const pix = Number(opt?.pix_price);
          const card = Number(opt?.card_price);
          const eps = 0.01;
          return (
            (Number.isFinite(pix) && Math.abs(reservaPrice - pix) < eps) ||
            (Number.isFinite(card) && Math.abs(reservaPrice - card) < eps)
          );
        });

        return match?.option_name || undefined;
      };

      // Mesma regra da lista de confirmados do admin (excluir cancelado/reembolsado/transferido)
      const reservasData = (reservasRaw || []).filter((r: any) => {
        const isCancelado = r.status === 'cancelado' || r.status === 'cancelada';
        const isTransferido = r.status === 'transferido';
        const isReembolsado = r.payment_status === 'reembolsado' || r.payment_status === 'reembolso_parcial';

        if (isCancelado || isTransferido || isReembolsado) return false;

        return r.status === 'confirmado' || r.status === 'confirmada' || r.payment_status === 'pago';
      });

      // Fetch additional participants with pricing option
      const reservaIds = (reservasData || []).map((r: any) => r.id);
      let additionalParticipants: any[] = [];
      if (reservaIds.length > 0) {
        const { data: apData, error: apError } = await supabase
          .from('reservation_participants')
          .select('*, tour_pricing_options(option_name)')
          .in('reserva_id', reservaIds)
          .eq('is_staff', false);

        if (apError) throw apError;
        additionalParticipants = apData || [];
      }

      // Build participant list
      const participants: ParticipantForRoom[] = [];
      (reservasData || []).forEach((reserva: any) => {
        const numPart = reserva.numero_participantes || 1;
        const cliente = reserva.clientes as any;
        const reservaPackageName = getPackageNameFromReserva(reserva);

        // Find titular in additional participants (index 1) for observacoes / pacote
        const titularParticipant = additionalParticipants.find(
          ap => ap.reserva_id === reserva.id && ap.participant_index === 1
        );

        const titularPackage =
          titularParticipant?.tour_pricing_options?.option_name ||
          titularParticipant?.pricing_option_name ||
          reservaPackageName;

        // Titular (index 1) - observacoes comes from reservation or participant
        participants.push({
          id: `${reserva.id}_1`,
          reserva_id: reserva.id,
          participant_id: titularParticipant?.id,
          participant_index: 1,
          nome_completo: cliente?.nome_completo || 'Titular',
          cpf: cliente?.cpf,
          whatsapp: cliente?.whatsapp,
          observacoes: titularParticipant?.observacoes || reserva.observacoes || undefined,
          isTitular: true,
          pricing_option_name: titularPackage,
        });

        // Additional participants
        for (let i = 2; i <= numPart; i++) {
          const additional = additionalParticipants.find(
            ap => ap.reserva_id === reserva.id && ap.participant_index === i
          );

          const additionalPackage =
            additional?.tour_pricing_options?.option_name ||
            additional?.pricing_option_name ||
            reservaPackageName;

          participants.push({
            id: `${reserva.id}_${i}`,
            reserva_id: reserva.id,
            participant_id: additional?.id,
            participant_index: i,
            nome_completo: additional?.nome_completo || `Participante ${i}`,
            cpf: additional?.cpf,
            whatsapp: additional?.whatsapp,
            observacoes: additional?.observacoes || undefined,
            isTitular: false,
            pricing_option_name: additionalPackage,
          });
        }
      });

      setAllParticipants(participants);

      // Build accommodation structure with assignments
      const assignmentMap = new Map<string, RoomAssignment[]>();
      assignmentsData.forEach(a => {
        const key = a.room_id;
        if (!assignmentMap.has(key)) assignmentMap.set(key, []);
        assignmentMap.get(key)!.push(a);
      });

      const assignedParticipantIds = new Set(
        assignmentsData.map(a => `${a.reserva_id}_${a.participant_index}`)
      );

      const accsWithRooms: AccommodationWithRooms[] = (accData || []).map(acc => {
        const accRooms = roomsData.filter(r => r.accommodation_id === acc.id);
        const roomsWithOccupancy: RoomWithOccupancy[] = accRooms.map(room => {
          const roomAssignments = assignmentMap.get(room.id) || [];
          const roomParticipants = roomAssignments.map(assignment => {
            const participant = participants.find(
              p => p.reserva_id === assignment.reserva_id && p.participant_index === assignment.participant_index
            );
            return participant!;
          }).filter(Boolean);

          return {
            ...room,
            assignments: roomAssignments,
            occupancy: roomAssignments.length,
            participants: roomParticipants,
          };
        });

        return {
          ...acc,
          rooms: roomsWithOccupancy,
        };
      });

      setAccommodations(accsWithRooms);
      setUnassignedParticipants(participants.filter(p => !assignedParticipantIds.has(p.id)));
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [tourId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragStart = (e: React.DragEvent, participant: ParticipantForRoom) => {
    setDraggedParticipant(participant);
    e.dataTransfer.setData('text/plain', participant.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnRoom = async (e: React.DragEvent, room: RoomWithOccupancy) => {
    e.preventDefault();
    if (!draggedParticipant) return;

    // Check capacity
    if (room.occupancy >= room.capacity) {
      toast({ title: 'Quarto cheio', description: 'Este quarto já atingiu a capacidade máxima.', variant: 'destructive' });
      setDraggedParticipant(null);
      return;
    }

    setSavingAssignment(true);
    try {
      // Remove any existing assignment for this participant
      await supabase
        .from('room_assignments')
        .delete()
        .eq('reserva_id', draggedParticipant.reserva_id)
        .eq('participant_index', draggedParticipant.participant_index);

      // Create new assignment
      const { error } = await supabase.from('room_assignments').insert({
        room_id: room.id,
        reserva_id: draggedParticipant.reserva_id,
        participant_id: draggedParticipant.participant_id || null,
        participant_index: draggedParticipant.participant_index,
        assigned_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Participante alocado', description: `${draggedParticipant.nome_completo} → ${room.name}` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao alocar', description: error.message, variant: 'destructive' });
    } finally {
      setSavingAssignment(false);
      setDraggedParticipant(null);
    }
  };

  const handleDropOnUnassigned = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedParticipant) return;

    setSavingAssignment(true);
    try {
      const { error } = await supabase
        .from('room_assignments')
        .delete()
        .eq('reserva_id', draggedParticipant.reserva_id)
        .eq('participant_index', draggedParticipant.participant_index);

      if (error) throw error;

      toast({ title: 'Participante removido do quarto' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } finally {
      setSavingAssignment(false);
      setDraggedParticipant(null);
    }
  };

  const handleRemoveFromRoom = async (participant: ParticipantForRoom) => {
    setSavingAssignment(true);
    try {
      const { error } = await supabase
        .from('room_assignments')
        .delete()
        .eq('reserva_id', participant.reserva_id)
        .eq('participant_index', participant.participant_index);

      if (error) throw error;

      toast({ title: 'Participante removido do quarto' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleSaveRoomNotes = async (roomId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('accommodation_rooms')
        .update({ notes: notes.trim() || null })
        .eq('id', roomId);

      if (error) throw error;
      
      toast({ title: 'Legenda salva' });
      setEditingRoomNotes(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar legenda', description: error.message, variant: 'destructive' });
    }
  };

  const handleDownloadCSV = () => {
    let csvContent = "Hospedagem;Quarto;Tipo;Capacidade;Ocupação;Participante;Pacote;Legenda\n";
    
    accommodations.forEach(acc => {
      acc.rooms.forEach(room => {
        if (room.participants.length > 0) {
          room.participants.forEach(p => {
            csvContent += `"${acc.name}";"${room.name}";"${room.room_type}";${room.capacity};${room.occupancy};"${p.nome_completo}";"${p.pricing_option_name || ''}";"${room.notes || ''}"\n`;
          });
        } else {
          csvContent += `"${acc.name}";"${room.name}";"${room.room_type}";${room.capacity};${room.occupancy};"";"";"${room.notes || ''}"\n`;
        }
      });
    });

    if (unassignedParticipants.length > 0) {
      csvContent += "\n\nNão Alocados\n";
      csvContent += "Nome;CPF;Pacote;Observações\n";
      unassignedParticipants.forEach(p => {
        csvContent += `"${p.nome_completo}";"${p.cpf || ''}";"${p.pricing_option_name || ''}";"${p.observacoes || ''}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hospedagem-${tourName.replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({ title: 'Download CSV iniciado' });
  };

  const handleDownloadXLSX = () => {
    const rows: any[] = [];
    
    accommodations.forEach(acc => {
      acc.rooms.forEach(room => {
        if (room.participants.length > 0) {
          room.participants.forEach(p => {
            rows.push({
              Hospedagem: acc.name,
              Quarto: room.name,
              Tipo: room.room_type,
              Capacidade: room.capacity,
              Ocupação: room.occupancy,
              Participante: p.nome_completo,
              Pacote: p.pricing_option_name || '',
              Legenda: room.notes || ''
            });
          });
        } else {
          rows.push({
            Hospedagem: acc.name,
            Quarto: room.name,
            Tipo: room.room_type,
            Capacidade: room.capacity,
            Ocupação: room.occupancy,
            Participante: '',
            Pacote: '',
            Legenda: room.notes || ''
          });
        }
      });
    });

    // Add unassigned
    if (unassignedParticipants.length > 0) {
      rows.push({}); // Empty row
      rows.push({ Hospedagem: 'NÃO ALOCADOS' });
      unassignedParticipants.forEach(p => {
        rows.push({
          Hospedagem: '',
          Quarto: '',
          Tipo: '',
          Capacidade: '',
          Ocupação: '',
          Participante: p.nome_completo,
          Pacote: p.pricing_option_name || '',
          Legenda: p.observacoes || ''
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hospedagem');
    XLSX.writeFile(workbook, `hospedagem-${tourName.replace(/\s+/g, '-')}.xlsx`);
    
    toast({ title: 'Download XLSX iniciado' });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Distribuição de Quartos - ${tourName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    let yPos = 35;

    accommodations.forEach((acc, accIndex) => {
      // Accommodation header
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(acc.name, 14, yPos);
      yPos += 6;

      const tableData = acc.rooms.map(room => [
        room.name,
        room.room_type,
        `${room.occupancy}/${room.capacity}`,
        room.participants.map(p => p.nome_completo).join(', ') || '—',
        room.notes || ''
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Quarto', 'Tipo', 'Ocupação', 'Participantes', 'Legenda']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 100, 100] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18 },
          3: { cellWidth: 70 },
          4: { cellWidth: 40 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Check if we need a new page
      if (yPos > 270 && accIndex < accommodations.length - 1) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Unassigned participants
    if (unassignedParticipants.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(180, 100, 0);
      doc.text(`Não Alocados (${unassignedParticipants.length})`, 14, yPos);
      yPos += 6;

      const unassignedData = unassignedParticipants.map(p => [
        p.nome_completo,
        p.pricing_option_name || '',
        p.observacoes || ''
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Participante', 'Pacote', 'Observações']],
        body: unassignedData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [180, 100, 0] }
      });
    }

    doc.save(`hospedagem-${tourName.replace(/\s+/g, '-')}.pdf`);
    toast({ title: 'Download PDF iniciado' });
  };

  // Summary stats
  const totalParticipants = allParticipants.length;
  const assignedCount = totalParticipants - unassignedParticipants.length;
  const totalRooms = accommodations.reduce((sum, a) => sum + a.rooms.length, 0);
  const totalCapacity = accommodations.reduce((sum, a) => a.rooms.reduce((s, r) => s + r.capacity, sum), 0);
  const fullRooms = accommodations.reduce((sum, a) => a.rooms.filter(r => r.occupancy >= r.capacity).length + sum, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (accommodations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma hospedagem configurada</h3>
          <p className="text-muted-foreground mb-4">
            Configure as pousadas e quartos antes de distribuir os participantes.
          </p>
          <Button onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Hospedagens
          </Button>
          <AccommodationConfigModal
            open={showConfig}
            onClose={() => { setShowConfig(false); fetchData(); }}
            tourId={tourId}
            tourName={tourName}
          />
        </CardContent>
      </Card>
    );
  }

  const getAccommodationColor = (index: number) => ACCOMMODATION_COLORS[index % ACCOMMODATION_COLORS.length];

  return (
    <div className="space-y-4" ref={contentRef}>
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm bg-white">
            <Users className="h-3 w-3 mr-1" />
            {assignedCount}/{totalParticipants} alocados
          </Badge>
          <Badge variant="outline" className="text-sm bg-white">
            <DoorOpen className="h-3 w-3 mr-1" />
            {fullRooms}/{totalRooms} quartos completos
          </Badge>
          <Badge variant="outline" className="text-sm bg-white">
            Capacidade: {totalCapacity} vagas
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button 
              size="sm" 
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              className="rounded-none h-8"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="rounded-none h-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Baixar
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <span className="text-muted-foreground font-medium">Hospedagens:</span>
        {accommodations.map((acc, index) => {
          const color = getAccommodationColor(index);
          return (
            <div key={acc.id} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${color.accent}`} />
              <span className="text-xs">{acc.name}</span>
            </div>
          );
        })}
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-12 gap-4">
          {/* Unassigned participants sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <Card 
              className={`h-full border-2 ${draggedParticipant ? 'border-primary border-dashed bg-primary/5' : 'border-dashed border-muted-foreground/30'}`}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
            >
              <CardHeader className="pb-2 bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Não Alocados ({unassignedParticipants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-1">
                    {unassignedParticipants.map(participant => (
                      <TooltipProvider key={participant.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              draggable
                              onDragStart={e => handleDragStart(e, participant)}
                              className="p-2 bg-white border rounded-lg cursor-grab hover:shadow-md active:cursor-grabbing flex items-center gap-2 transition-all"
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{participant.nome_completo}</p>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {participant.isTitular && (
                                    <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">Titular</Badge>
                                  )}
                                  {participant.pricing_option_name && (
                                    <Badge variant="outline" className="text-[10px] h-4 bg-indigo-50 text-indigo-700 border-indigo-200">
                                      {participant.pricing_option_name}
                                    </Badge>
                                  )}
                                  {participant.observacoes && (
                                    <Badge variant="secondary" className="text-[10px] h-4 max-w-[100px] truncate">
                                      {participant.observacoes}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p className="font-medium">{participant.nome_completo}</p>
                            {participant.cpf && <p className="text-xs">CPF: {participant.cpf}</p>}
                            {participant.pricing_option_name && (
                              <p className="text-xs text-indigo-600">Pacote: {participant.pricing_option_name}</p>
                            )}
                            {participant.observacoes && (
                              <p className="text-xs mt-1 text-amber-600">Obs: {participant.observacoes}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {unassignedParticipants.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-green-700">Todos alocados!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Accommodations and rooms */}
          <div className="col-span-12 lg:col-span-9">
            <ScrollArea className="h-[560px]">
              <div className="space-y-4 pr-4">
                {accommodations.map((acc, accIndex) => {
                  const color = getAccommodationColor(accIndex);
                  return (
                    <Card key={acc.id} className={`${color.bg} ${color.border} border-2 overflow-hidden`}>
                      <CardHeader className={`pb-2 ${color.header}`}>
                        <CardTitle className={`text-base flex items-center gap-2 ${color.text}`}>
                          <div className={`w-2 h-6 rounded ${color.accent}`} />
                          <Building2 className="h-4 w-4" />
                          {acc.name}
                          <Badge variant="outline" className="ml-auto bg-white/80">
                            {acc.rooms.reduce((sum, r) => sum + r.occupancy, 0)}/{acc.rooms.reduce((sum, r) => sum + r.capacity, 0)} ocupados
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {acc.rooms.map(room => {
                            const isFull = room.occupancy >= room.capacity;
                            const occupancyPercent = (room.occupancy / room.capacity) * 100;
                            return (
                              <Card
                                key={room.id}
                                className={`transition-all bg-white shadow-sm hover:shadow-md ${
                                  isFull ? 'ring-2 ring-green-400' : ''
                                } ${draggedParticipant && !isFull ? 'ring-2 ring-primary ring-dashed' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={e => handleDropOnRoom(e, room)}
                              >
                                <CardHeader className="pb-1 pt-3 px-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm">{room.name}</span>
                                    <Badge 
                                      variant={isFull ? 'default' : 'secondary'} 
                                      className={`text-xs ${isFull ? 'bg-green-500' : ''}`}
                                    >
                                      {room.occupancy}/{room.capacity}
                                    </Badge>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${isFull ? 'bg-green-500' : 'bg-primary'}`}
                                      style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      {room.room_type}
                                    </Badge>
                                    {room.gender_restriction && room.gender_restriction !== 'none' && (
                                      <Badge variant="outline" className="text-[10px] h-4">
                                        {room.gender_restriction}
                                      </Badge>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                  <div className="space-y-1 min-h-[60px]">
                                    {room.participants.map(participant => (
                                      <TooltipProvider key={participant.id}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              draggable
                                              onDragStart={e => handleDragStart(e, participant)}
                                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-grab hover:shadow-sm transition-all ${color.bg} ${color.border}`}
                                            >
                                              <div className="flex-1 min-w-0">
                                                <span className="truncate block font-medium">
                                                  {participant.nome_completo}
                                                </span>
                                                {participant.pricing_option_name && (
                                                  <span className="text-[10px] text-indigo-600 truncate block">
                                                    {participant.pricing_option_name}
                                                  </span>
                                                )}
                                                {participant.observacoes && (
                                                  <span className="text-[10px] text-amber-600 truncate block">
                                                    {participant.observacoes}
                                                  </span>
                                                )}
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-5 w-5 p-0 ml-1 flex-shrink-0 hover:bg-red-100 hover:text-red-600"
                                                onClick={() => handleRemoveFromRoom(participant)}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-[300px]">
                                            <p className="font-medium">{participant.nome_completo}</p>
                                            {participant.cpf && <p className="text-xs">CPF: {participant.cpf}</p>}
                                            {participant.pricing_option_name && (
                                              <p className="text-xs text-indigo-600">Pacote: {participant.pricing_option_name}</p>
                                            )}
                                            {participant.observacoes && (
                                              <p className="text-xs mt-1 text-amber-600">Obs: {participant.observacoes}</p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ))}
                                    {room.participants.length === 0 && (
                                      <p className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                                        Arraste participantes aqui
                                      </p>
                                    )}
                                  </div>
                                  {/* Room notes/legend - discrete */}
                                  <div className="mt-2 pt-2 border-t border-dashed">
                                    {editingRoomNotes === room.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={roomNotesInput}
                                          onChange={e => setRoomNotesInput(e.target.value)}
                                          placeholder="Legenda do quarto..."
                                          className="h-6 text-xs"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              handleSaveRoomNotes(room.id, roomNotesInput);
                                            } else if (e.key === 'Escape') {
                                              setEditingRoomNotes(null);
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleSaveRoomNotes(room.id, roomNotesInput)}
                                        >
                                          <Check className="h-3 w-3 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => setEditingRoomNotes(null)}
                                        >
                                          <X className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="flex items-center gap-1 cursor-pointer group"
                                        onClick={() => {
                                          setEditingRoomNotes(room.id);
                                          setRoomNotesInput(room.notes || '');
                                        }}
                                      >
                                        <Edit3 className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
                                        {room.notes ? (
                                          <span className="text-[10px] text-muted-foreground italic truncate">
                                            {room.notes}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground">
                                            Adicionar legenda...
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Hospedagem</TableHead>
                  <TableHead>Quarto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Ocupação</TableHead>
                  <TableHead>Participantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accommodations.map((acc, accIndex) => {
                  const color = getAccommodationColor(accIndex);
                  return acc.rooms.map((room, roomIndex) => (
                    <TableRow key={room.id} className={room.occupancy >= room.capacity ? 'bg-green-50' : ''}>
                      {roomIndex === 0 ? (
                        <TableCell 
                          rowSpan={acc.rooms.length} 
                          className={`font-medium ${color.bg} border-l-4 ${color.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-8 rounded ${color.accent}`} />
                            <div>
                              <p className={color.text}>{acc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {acc.rooms.reduce((sum, r) => sum + r.occupancy, 0)}/{acc.rooms.reduce((sum, r) => sum + r.capacity, 0)} ocupados
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {room.room_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={room.occupancy >= room.capacity ? 'default' : 'secondary'}
                          className={room.occupancy >= room.capacity ? 'bg-green-500' : ''}
                        >
                          {room.occupancy}/{room.capacity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {room.participants.map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs flex items-center gap-1">
                              {p.nome_completo}
                              {p.pricing_option_name && (
                                <span className="text-indigo-600 font-normal">({p.pricing_option_name})</span>
                              )}
                            </Badge>
                          ))}
                          {room.participants.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })}
                {/* Unassigned section */}
                {unassignedParticipants.length > 0 && (
                  <TableRow className="bg-amber-50">
                    <TableCell colSpan={4} className="font-medium text-amber-700 border-l-4 border-amber-400">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Não Alocados ({unassignedParticipants.length})
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {unassignedParticipants.map(p => (
                          <Badge key={p.id} variant="outline" className="text-xs bg-white flex items-center gap-1">
                            {p.nome_completo}
                            {p.pricing_option_name && (
                              <span className="text-indigo-600 font-normal">({p.pricing_option_name})</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AccommodationConfigModal
        open={showConfig}
        onClose={() => { setShowConfig(false); fetchData(); }}
        tourId={tourId}
        tourName={tourName}
      />
    </div>
  );
};