import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientExperiencesProps {
  clienteId: string;
}

interface Reserva {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  valor_pago: number | null;
  tour: {
    name: string;
    city: string;
    state: string;
    start_date: string;
    end_date: string | null;
    image_url: string | null;
  };
  ponto_embarque: {
    nome: string;
  };
}

const ClientExperiences = ({ clienteId }: ClientExperiencesProps) => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservas = async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          status,
          payment_status,
          created_at,
          valor_pago,
          tours!reservas_tour_id_fkey (
            name,
            city,
            state,
            start_date,
            end_date,
            image_url
          ),
          tour_boarding_points!reservas_ponto_embarque_id_fkey (
            nome
          )
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReservas(data.map(r => ({
          ...r,
          tour: r.tours as any,
          ponto_embarque: r.tour_boarding_points as any
        })));
      }
      setLoading(false);
    };

    fetchReservas();
  }, [clienteId]);

  const upcomingReservas = reservas.filter(r => 
    !isPast(new Date(r.tour.start_date + 'T12:00:00')) && r.status !== 'cancelada'
  );
  
  const pastReservas = reservas.filter(r => 
    isPast(new Date(r.tour.start_date + 'T12:00:00')) && r.status !== 'cancelada'
  );
  
  const cancelledReservas = reservas.filter(r => r.status === 'cancelada');

  const getStatusBadge = (reserva: Reserva) => {
    if (reserva.status === 'cancelada') {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    if (reserva.payment_status === 'pago') {
      return <Badge className="bg-emerald-500">Confirmada</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const ReservaCard = ({ reserva, isPastEvent }: { reserva: Reserva; isPastEvent?: boolean }) => (
    <Card className={`overflow-hidden ${isPastEvent ? 'opacity-75' : ''}`}>
      <div className="flex flex-col sm:flex-row">
        {reserva.tour.image_url && (
          <div className="sm:w-32 h-24 sm:h-auto">
            <img 
              src={reserva.tour.image_url} 
              alt={reserva.tour.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold">{reserva.tour.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {reserva.tour.city}, {reserva.tour.state}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(reserva.tour.start_date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                Embarque: {reserva.ponto_embarque.nome}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(reserva)}
              {reserva.valor_pago && (
                <span className="text-sm font-medium">
                  R$ {reserva.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Minhas Experiências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                Próximas ({upcomingReservas.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="text-xs sm:text-sm">
                Realizadas ({pastReservas.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
                Canceladas ({cancelledReservas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingReservas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma aventura agendada</p>
                  <a href="/" className="text-primary hover:underline text-sm">
                    Explorar passeios disponíveis →
                  </a>
                </div>
              ) : (
                upcomingReservas.map(reserva => (
                  <ReservaCard key={reserva.id} reserva={reserva} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastReservas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma experiência realizada ainda</p>
                </div>
              ) : (
                pastReservas.map(reserva => (
                  <ReservaCard key={reserva.id} reserva={reserva} isPastEvent />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledReservas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma reserva cancelada</p>
                </div>
              ) : (
                cancelledReservas.map(reserva => (
                  <ReservaCard key={reserva.id} reserva={reserva} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientExperiences;
