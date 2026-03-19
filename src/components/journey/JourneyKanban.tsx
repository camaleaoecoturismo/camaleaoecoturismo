import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, JourneyPhase, ClientJourney, getPhaseConfig } from './types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Phone, Mail, Clock, ChevronRight, ArrowRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  tourFilter: string;
  onClientClick?: (clienteId: string) => void;
}

const JourneyKanban: React.FC<Props> = ({ tourFilter, onClientClick }) => {
  const [journeys, setJourneys] = useState<ClientJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moveDialog, setMoveDialog] = useState<{ journey: ClientJourney; targetPhase: JourneyPhase } | null>(null);
  const [draggedJourney, setDraggedJourney] = useState<string | null>(null);

  const fetchJourneys = async () => {
    setLoading(true);
    let query = supabase
      .from('client_journey' as any)
      .select('*, clientes!inner(nome_completo, cpf, email, whatsapp), tours(name, start_date)')
      .order('phase_entered_at', { ascending: false });

    if (tourFilter && tourFilter !== 'all') {
      query = query.eq('tour_id', tourFilter);
    }

    const { data, error } = await query as any;
    if (error) {
      console.error('Error fetching journeys:', error);
    } else {
      setJourneys(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchJourneys(); }, [tourFilter]);

  const handleDragStart = (journeyId: string) => setDraggedJourney(journeyId);
  const handleDragEnd = () => setDraggedJourney(null);

  const handleDrop = (phase: JourneyPhase) => {
    if (!draggedJourney) return;
    const journey = journeys.find(j => j.id === draggedJourney);
    if (journey && journey.current_phase !== phase) {
      setMoveDialog({ journey, targetPhase: phase });
    }
    setDraggedJourney(null);
  };

  const confirmMove = async () => {
    if (!moveDialog) return;
    const { journey, targetPhase } = moveDialog;

    const { error } = await supabase.rpc('move_client_journey_phase', {
      p_cliente_id: journey.cliente_id,
      p_to_phase: targetPhase,
      p_tour_id: journey.tour_id,
      p_trigger_type: 'manual',
      p_trigger_description: `Movido manualmente de ${getPhaseConfig(journey.current_phase).label} para ${getPhaseConfig(targetPhase).label}`
    });

    if (error) {
      toast.error('Erro ao mover cliente');
      console.error(error);
    } else {
      toast.success(`Cliente movido para ${getPhaseConfig(targetPhase).label}`);
      fetchJourneys();
    }
    setMoveDialog(null);
  };

  const filtered = journeys.filter(j => {
    if (!search) return true;
    const s = search.toLowerCase();
    return j.clientes?.nome_completo?.toLowerCase().includes(s) ||
           j.clientes?.email?.toLowerCase().includes(s) ||
           j.clientes?.cpf?.includes(s);
  });

  const getPhaseClients = (phase: JourneyPhase) => filtered.filter(j => j.current_phase === phase);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando jornadas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filtered.length} clientes</Badge>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {JOURNEY_PHASES.map(phase => {
          const clients = getPhaseClients(phase.id);
          return (
            <div
              key={phase.id}
              className="flex-shrink-0 w-[220px] flex flex-col rounded-xl border"
              style={{ borderColor: phase.color + '40', backgroundColor: phase.bgColor }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(phase.id)}
            >
              {/* Phase header */}
              <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: phase.color + '30' }}>
                <span className="text-lg">{phase.icon}</span>
                <span className="font-semibold text-sm" style={{ color: phase.color }}>{phase.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs h-5">{clients.length}</Badge>
              </div>

              {/* Client cards */}
              <ScrollArea className="flex-1 p-2" style={{ maxHeight: 600 }}>
                <div className="space-y-2">
                  {clients.map(j => (
                    <Card
                      key={j.id}
                      draggable
                      onDragStart={() => handleDragStart(j.id)}
                      onDragEnd={handleDragEnd}
                      className="p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card"
                      onClick={() => onClientClick?.(j.cliente_id)}
                    >
                      <p className="font-medium text-xs truncate">{j.clientes?.nome_completo}</p>
                      {j.tours && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {(j.tours as any).name}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(j.phase_entered_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </Card>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum cliente</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Move confirmation dialog */}
      <Dialog open={!!moveDialog} onOpenChange={() => setMoveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover cliente de fase</DialogTitle>
          </DialogHeader>
          {moveDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mover <strong>{moveDialog.journey.clientes?.nome_completo}</strong> de{' '}
                <Badge style={{ backgroundColor: getPhaseConfig(moveDialog.journey.current_phase).color, color: '#fff' }}>
                  {getPhaseConfig(moveDialog.journey.current_phase).label}
                </Badge>
                {' '}para{' '}
                <Badge style={{ backgroundColor: getPhaseConfig(moveDialog.targetPhase).color, color: '#fff' }}>
                  {getPhaseConfig(moveDialog.targetPhase).label}
                </Badge>
                ?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMoveDialog(null)}>Cancelar</Button>
                <Button onClick={confirmMove}>Confirmar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JourneyKanban;
