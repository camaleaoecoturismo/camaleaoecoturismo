import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCog } from 'lucide-react';

interface BoardingPoint {
  id: string;
  nome: string;
  endereco?: string;
}

interface AddStaffMemberModalProps {
  open: boolean;
  onClose: () => void;
  tourId: string;
  boardingPoints: BoardingPoint[];
  onSaved: () => void;
}

const STAFF_ROLES = [
  { value: 'guia', label: 'Guia de Turismo' },
  { value: 'motorista', label: 'Motorista' },
  { value: 'bombeiro', label: 'Bombeiro' },
  { value: 'fotografo', label: 'Fotógrafo' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'outro', label: 'Outro' },
];

const AddStaffMemberModal: React.FC<AddStaffMemberModalProps> = ({
  open,
  onClose,
  tourId,
  boardingPoints,
  onSaved
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    staff_role: '',
    whatsapp: '',
    ponto_embarque_id: ''
  });

  const handleSubmit = async () => {
    if (!formData.nome_completo || !formData.staff_role) {
      toast({ title: "Preencha nome e função", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Find any existing reservation for this tour to link the staff member
      const { data: existingReserva } = await supabase
        .from('reservas')
        .select('id, ponto_embarque_id')
        .eq('tour_id', tourId)
        .limit(1)
        .maybeSingle();

      let staffReservaId: string;
      let defaultBoardingPointId: string | null = formData.ponto_embarque_id || boardingPoints[0]?.id || null;

      if (existingReserva) {
        // Use existing reservation to attach staff member
        staffReservaId = existingReserva.id;
        if (!defaultBoardingPointId) {
          defaultBoardingPointId = existingReserva.ponto_embarque_id;
        }
      } else {
        // No reservations exist - we need to get/create a staff placeholder reservation
        // First, get an existing staff client or create one
        const { data: existingStaffClient } = await supabase
          .from('clientes')
          .select('id')
          .eq('email', 'equipe@camaleaoecoturismo.com.br')
          .maybeSingle();

        let staffClientId: string;
        
        if (existingStaffClient) {
          staffClientId = existingStaffClient.id;
        } else {
          // Create staff client with unique CPF based on timestamp
          const uniqueCpf = `999${Date.now().toString().slice(-8)}`;
          const { data: newClient, error: clientError } = await supabase
            .from('clientes')
            .insert({
              cpf: uniqueCpf,
              nome_completo: 'Equipe Camaleão',
              email: 'equipe@camaleaoecoturismo.com.br',
              whatsapp: '82999999999',
              data_nascimento: '2000-01-01'
            })
            .select('id')
            .single();

          if (clientError) {
            console.error('Error creating staff client:', clientError);
            throw new Error('Erro ao criar cliente de equipe');
          }
          staffClientId = newClient.id;
        }

        // Create staff-only reservation
        const { data: newReserva, error: reservaError } = await supabase
          .from('reservas')
          .insert({
            tour_id: tourId,
            cliente_id: staffClientId,
            ponto_embarque_id: defaultBoardingPointId,
            status: 'confirmada',
            payment_status: 'pago',
            valor_passeio: 0,
            valor_pago: 0,
            valor_total_com_opcionais: 0,
            numero_participantes: 0
          })
          .select('id')
          .single();

        if (reservaError) {
          console.error('Error creating staff reservation:', reservaError);
          throw new Error('Erro ao criar reserva de equipe');
        }
        staffReservaId = newReserva.id;
      }

      // Get next participant index (count existing + 1)
      const { count } = await supabase
        .from('reservation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('reserva_id', staffReservaId);
      
      const nextIndex = (count || 0) + 1;

      // Add staff member directly to reservation_participants (NO CPF needed)
      const { data: newStaffParticipant, error: participantError } = await supabase
        .from('reservation_participants')
        .insert({
          reserva_id: staffReservaId,
          participant_index: nextIndex,
          nome_completo: formData.nome_completo,
          whatsapp: formData.whatsapp || null,
          ponto_embarque_id: defaultBoardingPointId,
          is_staff: true,
          staff_role: formData.staff_role
        })
        .select('id')
        .single();

      if (participantError) {
        console.error('Error adding staff participant:', participantError);
        throw new Error('Erro ao adicionar participante de equipe');
      }

      // Get tour and boarding point info for ticket
      const { data: tourData } = await supabase
        .from('tours')
        .select('start_date')
        .eq('id', tourId)
        .single();

      let boardingPointName = '';
      let boardingPointAddress = '';
      if (defaultBoardingPointId) {
        const { data: bpData } = await supabase
          .from('tour_boarding_points')
          .select('nome, endereco')
          .eq('id', defaultBoardingPointId)
          .single();
        if (bpData) {
          boardingPointName = bpData.nome;
          boardingPointAddress = bpData.endereco || '';
        }
      }

      // Get reserva info
      const { data: reservaData } = await supabase
        .from('reservas')
        .select('reserva_numero')
        .eq('id', staffReservaId)
        .single();

      // Create ticket for staff member
      const ticketNumber = `TKT${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await supabase
        .from('tickets')
        .insert([{
          reserva_id: staffReservaId,
          participant_id: newStaffParticipant.id,
          tour_id: tourId,
          participant_name: formData.nome_completo,
          boarding_point_name: boardingPointName,
          boarding_point_address: boardingPointAddress,
          trip_date: tourData?.start_date || new Date().toISOString().split('T')[0],
          amount_paid: 0,
          reservation_number: reservaData?.reserva_numero,
          ticket_number: ticketNumber,
          status: 'active'
        }]);

      toast({ title: "Membro da equipe adicionado" });
      setFormData({ nome_completo: '', staff_role: '', whatsapp: '', ponto_embarque_id: '' });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error adding staff member:', error);
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-teal-600" />
            Adicionar Membro da Equipe
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="Nome do membro da equipe"
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Função *</Label>
            <Select
              value={formData.staff_role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, staff_role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp (opcional)</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={formData.whatsapp}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
            />
          </div>

          {boardingPoints.length > 0 && (
            <div className="space-y-2">
              <Label>Ponto de Embarque (opcional)</Label>
              <Select
                value={formData.ponto_embarque_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, ponto_embarque_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {boardingPoints.map((point) => (
                    <SelectItem key={point.id} value={point.id}>
                      {point.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
            <p>Membros da equipe ocupam lugar na lista mas não pagam e aparecem destacados em cor diferente.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffMemberModal;
