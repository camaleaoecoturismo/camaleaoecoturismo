import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, ArrowRightLeft, Lock, Unlock, Shield, X } from 'lucide-react';
import { SeatMap, Seat } from './SeatMap';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TourSeatMapManagerProps {
  tourId: string;
  tourName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SeatAssignment {
  id: string;
  seat_id: string;
  participant_id: string | null;
  reserva_id: string | null;
  assignment_type: string;
  participant?: {
    nome_completo: string;
    cpf: string;
  };
  cliente?: {
    nome_completo: string;
  };
}

interface ExtendedSeat extends Seat {
  assignment?: SeatAssignment;
}

export const TourSeatMapManager: React.FC<TourSeatMapManagerProps> = ({
  tourId,
  tourName,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<ExtendedSeat[]>([]);
  const [transportConfig, setTransportConfig] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<ExtendedSeat | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [actionMode, setActionMode] = useState<'view' | 'assign' | 'swap' | 'type'>('view');
  const [swapSource, setSwapSource] = useState<ExtendedSeat | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && tourId) {
      fetchData();
    }
  }, [isOpen, tourId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get transport config
      const { data: config, error: configError } = await supabase
        .from('tour_transport_config')
        .select('*, transport_vehicles(*)')
        .eq('tour_id', tourId)
        .single();

      if (configError) {
        if (configError.code === 'PGRST116') {
          toast({ title: 'Nenhum transporte configurado para este passeio', variant: 'destructive' });
          onClose();
          return;
        }
        throw configError;
      }

      setTransportConfig(config);
      setVehicle(config.transport_vehicles);

      // Get seats with assignments
      const { data: vehicleSeats, error: seatsError } = await supabase
        .from('vehicle_seats')
        .select('*')
        .eq('vehicle_id', config.vehicle_id)
        .order('row_number')
        .order('seat_letter');

      if (seatsError) throw seatsError;

      // Get assignments
      const { data: assignments, error: assignError } = await supabase
        .from('participant_seat_assignments')
        .select(`
          *,
          reservation_participants(nome_completo, cpf)
        `)
        .eq('transport_config_id', config.id);

      if (assignError) throw assignError;

      // Get client names for assignments without participant data
      const reservaIds = assignments?.filter(a => a.reserva_id && !a.participant_id).map(a => a.reserva_id) || [];
      let clientNames: Record<string, string> = {};
      
      if (reservaIds.length > 0) {
        const { data: reservas } = await supabase
          .from('reservas')
          .select('id, clientes!fk_reservas_cliente(nome_completo)')
          .in('id', reservaIds);
        
        reservas?.forEach((r: any) => {
          if (r.clientes?.nome_completo) {
            clientNames[r.id] = r.clientes.nome_completo;
          }
        });
      }

      // Merge seats with assignments
      const extendedSeats: ExtendedSeat[] = vehicleSeats.map(seat => {
        const assignment = assignments?.find(a => a.seat_id === seat.id);
        return {
          ...seat,
          seat_type: seat.seat_type as 'standard' | 'preferential' | 'crew' | 'blocked',
          is_occupied: !!assignment,
          occupant_name: assignment?.reservation_participants?.nome_completo || 
                        (assignment?.reserva_id ? clientNames[assignment.reserva_id] : null) ||
                        (assignment?.assignment_type === 'crew' ? 'Equipe' : 
                         assignment?.assignment_type === 'blocked' ? 'Bloqueado' : ''),
          assignment
        };
      });

      setSeats(extendedSeats);

      // Get participants without seats
      const { data: allParticipants, error: partError } = await supabase
        .from('reservation_participants')
        .select(`
          *,
          reservas!inner(tour_id, status, payment_status, clientes(nome_completo))
        `)
        .eq('reservas.tour_id', tourId)
        .eq('reservas.status', 'confirmada')
        .eq('reservas.payment_status', 'pago');

      if (partError) throw partError;

      // Filter out participants who already have seats
      const assignedParticipantIds = assignments?.map(a => a.participant_id).filter(Boolean) || [];
      const unassignedParticipants = allParticipants?.filter(
        p => !assignedParticipantIds.includes(p.id)
      ) || [];

      setParticipants(unassignedParticipants);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: ExtendedSeat) => {
    if (actionMode === 'swap' && swapSource) {
      handleSwap(seat);
    } else {
      setSelectedSeat(seat);
    }
  };

  const handleAssignParticipant = async (participantId: string) => {
    if (!selectedSeat || !transportConfig) return;

    try {
      const { error } = await supabase
        .from('participant_seat_assignments')
        .upsert({
          tour_id: tourId,
          transport_config_id: transportConfig.id,
          seat_id: selectedSeat.id,
          participant_id: participantId,
          assignment_type: 'participant'
        }, {
          onConflict: 'transport_config_id,seat_id'
        });

      if (error) throw error;

      toast({ title: 'Assento atribuído com sucesso!' });
      setSelectedSeat(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleReleaseSeat = async () => {
    if (!selectedSeat?.assignment) return;

    try {
      const { error } = await supabase
        .from('participant_seat_assignments')
        .delete()
        .eq('id', selectedSeat.assignment.id);

      if (error) throw error;

      toast({ title: 'Assento liberado!' });
      setSelectedSeat(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleSeatType = async (type: 'blocked' | 'crew' | 'standard') => {
    if (!selectedSeat || !transportConfig) return;

    try {
      if (type === 'standard') {
        // Remove any existing assignment
        if (selectedSeat.assignment) {
          await supabase
            .from('participant_seat_assignments')
            .delete()
            .eq('id', selectedSeat.assignment.id);
        }
      } else {
        // Create or update assignment with type
        await supabase
          .from('participant_seat_assignments')
          .upsert({
            tour_id: tourId,
            transport_config_id: transportConfig.id,
            seat_id: selectedSeat.id,
            assignment_type: type
          }, {
            onConflict: 'transport_config_id,seat_id'
          });
      }

      toast({ title: `Assento marcado como ${type === 'blocked' ? 'bloqueado' : type === 'crew' ? 'equipe' : 'disponível'}` });
      setSelectedSeat(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleSwap = async (targetSeat: ExtendedSeat) => {
    if (!swapSource || !transportConfig) return;

    try {
      // Swap assignments
      const sourceAssignment = swapSource.assignment;
      const targetAssignment = targetSeat.assignment;

      if (sourceAssignment) {
        await supabase
          .from('participant_seat_assignments')
          .update({ seat_id: targetSeat.id })
          .eq('id', sourceAssignment.id);
      }

      if (targetAssignment && targetAssignment.assignment_type === 'participant') {
        await supabase
          .from('participant_seat_assignments')
          .update({ seat_id: swapSource.id })
          .eq('id', targetAssignment.id);
      }

      toast({ title: 'Assentos trocados com sucesso!' });
      setSwapSource(null);
      setActionMode('view');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const startSwap = () => {
    if (selectedSeat?.is_occupied) {
      setSwapSource(selectedSeat);
      setActionMode('swap');
      setSelectedSeat(null);
    }
  };

  const occupiedCount = seats.filter(s => s.is_occupied).length;
  const crewCount = seats.filter(s => s.assignment?.assignment_type === 'crew').length;
  const blockedCount = seats.filter(s => s.assignment?.assignment_type === 'blocked').length;
  const availableCount = seats.length - occupiedCount - crewCount - blockedCount;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mapa de Assentos - {tourName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !vehicle ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum transporte configurado para este passeio.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Card className="p-2">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{seats.length}</p>
              </Card>
              <Card className="p-2">
                <p className="text-xs text-muted-foreground">Ocupados</p>
                <p className="text-lg font-bold text-amber-600">{occupiedCount}</p>
              </Card>
              <Card className="p-2">
                <p className="text-xs text-muted-foreground">Disponíveis</p>
                <p className="text-lg font-bold text-emerald-600">{availableCount}</p>
              </Card>
              <Card className="p-2">
                <p className="text-xs text-muted-foreground">Equipe</p>
                <p className="text-lg font-bold text-blue-600">{crewCount}</p>
              </Card>
            </div>

            {/* Action Mode Indicator */}
            {actionMode === 'swap' && (
              <div className="bg-amber-100 text-amber-800 p-3 rounded-lg mb-4 flex items-center justify-between">
                <span>
                  <ArrowRightLeft className="h-4 w-4 inline mr-2" />
                  Modo Troca: Selecione o assento de destino para <strong>{swapSource?.occupant_name}</strong>
                </span>
                <Button size="sm" variant="ghost" onClick={() => { setActionMode('view'); setSwapSource(null); }}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              </div>
            )}

            {/* Seat Map */}
            <div className="flex justify-center mb-4">
              <SeatMap
                seats={seats}
                rows={vehicle.rows_count}
                seatsPerRow={vehicle.seats_per_row}
                aislePosition={vehicle.aisle_position}
                onSeatClick={handleSeatClick}
                showOccupantNames
                editable
                compact
              />
            </div>

            {/* Unassigned Participants */}
            {participants.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Participantes sem assento ({participants.length})</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex flex-wrap gap-2">
                    {participants.map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs">
                        {p.nome_completo || p.reservas?.clientes?.nome_completo || 'Sem nome'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Seat Actions Panel */}
        {selectedSeat && (
          <Card className="mt-4 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-lg">Assento {selectedSeat.seat_label}</p>
                  {selectedSeat.is_occupied && (
                    <p className="text-sm text-muted-foreground">{selectedSeat.occupant_name}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSeat(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSeat.is_occupied && selectedSeat.assignment?.assignment_type === 'participant' && (
                  <>
                    <Button size="sm" variant="outline" onClick={startSwap}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" />
                      Trocar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReleaseSeat}>
                      <Unlock className="h-4 w-4 mr-1" />
                      Liberar
                    </Button>
                  </>
                )}

                {!selectedSeat.is_occupied && participants.length > 0 && (
                  <Select onValueChange={handleAssignParticipant}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Atribuir participante..." />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome_completo || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button 
                  size="sm" 
                  variant={selectedSeat.assignment?.assignment_type === 'blocked' ? 'default' : 'outline'}
                  onClick={() => handleToggleSeatType(selectedSeat.assignment?.assignment_type === 'blocked' ? 'standard' : 'blocked')}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  {selectedSeat.assignment?.assignment_type === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                </Button>

                <Button 
                  size="sm" 
                  variant={selectedSeat.assignment?.assignment_type === 'crew' ? 'default' : 'outline'}
                  onClick={() => handleToggleSeatType(selectedSeat.assignment?.assignment_type === 'crew' ? 'standard' : 'crew')}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  {selectedSeat.assignment?.assignment_type === 'crew' ? 'Remover Equipe' : 'Marcar Equipe'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TourSeatMapManager;
