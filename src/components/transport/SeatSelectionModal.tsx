import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, MapPin } from 'lucide-react';
import { SeatMap, Seat } from './SeatMap';
import { Badge } from '@/components/ui/badge';

interface SeatSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  reservaId: string;
  participantIds: string[];
  participantNames: string[];
  onComplete?: () => void;
}

export const SeatSelectionModal: React.FC<SeatSelectionModalProps> = ({
  isOpen,
  onClose,
  tourId,
  reservaId,
  participantIds,
  participantNames,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [transportConfig, setTransportConfig] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [seatAssignments, setSeatAssignments] = useState<Record<string, string>>({}); // participantId -> seatId
  const { toast } = useToast();

  const requiredSeats = participantIds.length;

  useEffect(() => {
    if (isOpen) {
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

      if (configError) throw configError;

      setTransportConfig(config);
      setVehicle(config.transport_vehicles);

      // Get seats with current occupancy
      const { data: vehicleSeats, error: seatsError } = await supabase
        .from('vehicle_seats')
        .select('*')
        .eq('vehicle_id', config.vehicle_id)
        .eq('is_active', true)
        .order('row_number')
        .order('seat_letter');

      if (seatsError) throw seatsError;

      // Get existing assignments
      const { data: assignments, error: assignError } = await supabase
        .from('participant_seat_assignments')
        .select('seat_id, assignment_type')
        .eq('transport_config_id', config.id);

      if (assignError) throw assignError;

      // Merge occupancy info
      const occupiedSeatIds = new Set(assignments?.map(a => a.seat_id) || []);
      const blockedAssignments = new Map(
        assignments?.filter(a => a.assignment_type !== 'participant').map(a => [a.seat_id, a.assignment_type]) || []
      );

      const extendedSeats: Seat[] = vehicleSeats.map(seat => ({
        ...seat,
        is_occupied: occupiedSeatIds.has(seat.id),
        seat_type: blockedAssignments.get(seat.id) as any || seat.seat_type
      }));

      setSeats(extendedSeats);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar mapa', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.is_occupied || seat.seat_type === 'blocked' || seat.seat_type === 'crew') return;

    const currentParticipantId = participantIds[currentParticipantIndex];
    
    // Check if this seat is already selected by another participant
    const existingParticipant = Object.entries(seatAssignments).find(([_, seatId]) => seatId === seat.id);
    
    if (existingParticipant) {
      // Deselect if clicking on already selected seat
      const newAssignments = { ...seatAssignments };
      delete newAssignments[existingParticipant[0]];
      setSeatAssignments(newAssignments);
      setSelectedSeats(Object.values(newAssignments));
      return;
    }

    // Assign to current participant
    const newAssignments = { ...seatAssignments };
    
    // Remove previous selection for current participant if exists
    if (newAssignments[currentParticipantId]) {
      // Just update
    }
    
    newAssignments[currentParticipantId] = seat.id;
    setSeatAssignments(newAssignments);
    setSelectedSeats(Object.values(newAssignments));

    // Auto-advance to next participant
    if (currentParticipantIndex < participantIds.length - 1) {
      setCurrentParticipantIndex(currentParticipantIndex + 1);
    }
  };

  const handleConfirm = async () => {
    if (Object.keys(seatAssignments).length !== requiredSeats) {
      toast({ title: `Selecione ${requiredSeats} assento(s)`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Create assignments for each participant
      const assignmentsToInsert = Object.entries(seatAssignments).map(([participantId, seatId]) => ({
        tour_id: tourId,
        transport_config_id: transportConfig.id,
        seat_id: seatId,
        participant_id: participantId,
        reserva_id: reservaId,
        assignment_type: 'participant'
      }));

      const { error } = await supabase
        .from('participant_seat_assignments')
        .insert(assignmentsToInsert);

      if (error) throw error;

      toast({ title: 'Assentos selecionados com sucesso!' });
      onComplete?.();
      onClose();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!transportConfig?.auto_assign_seats) {
      onComplete?.();
      onClose();
      return;
    }

    // Auto-assign seats
    setSaving(true);
    try {
      const availableSeats = seats.filter(s => !s.is_occupied && s.seat_type === 'standard');
      
      if (availableSeats.length < requiredSeats) {
        toast({ title: 'Não há assentos suficientes disponíveis', variant: 'destructive' });
        onComplete?.();
        onClose();
        return;
      }

      const assignmentsToInsert = participantIds.map((participantId, index) => ({
        tour_id: tourId,
        transport_config_id: transportConfig.id,
        seat_id: availableSeats[index].id,
        participant_id: participantId,
        reserva_id: reservaId,
        assignment_type: 'participant'
      }));

      const { error } = await supabase
        .from('participant_seat_assignments')
        .insert(assignmentsToInsert);

      if (error) throw error;

      toast({ title: 'Assentos atribuídos automaticamente!' });
      onComplete?.();
      onClose();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      onComplete?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getSelectedSeatLabel = (participantId: string) => {
    const seatId = seatAssignments[participantId];
    if (!seatId) return null;
    return seats.find(s => s.id === seatId)?.seat_label;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Escolha seus Assentos
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !vehicle ? (
          <div className="text-center py-8">
            <p>Configuração de transporte não encontrada.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Participant Selection Indicator */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Selecione {requiredSeats} assento{requiredSeats > 1 ? 's' : ''} para:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {participantNames.map((name, index) => {
                  const seatLabel = getSelectedSeatLabel(participantIds[index]);
                  const isActive = currentParticipantIndex === index;
                  
                  return (
                    <Badge
                      key={index}
                      variant={seatLabel ? 'default' : isActive ? 'secondary' : 'outline'}
                      className={`cursor-pointer ${isActive ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setCurrentParticipantIndex(index)}
                    >
                      {name}
                      {seatLabel && (
                        <span className="ml-1 font-bold">({seatLabel})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Seat Map */}
            <div className="flex justify-center">
              <SeatMap
                seats={seats}
                rows={vehicle.rows_count}
                seatsPerRow={vehicle.seats_per_row}
                aislePosition={vehicle.aisle_position}
                onSeatClick={handleSeatClick}
                selectedSeats={selectedSeats}
                maxSelectable={requiredSeats}
                editable
                compact
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleSkip} disabled={saving}>
            {transportConfig?.auto_assign_seats ? 'Deixar automático' : 'Pular'}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={saving || Object.keys(seatAssignments).length !== requiredSeats}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Check className="h-4 w-4 mr-2" />
            Confirmar Assentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeatSelectionModal;
