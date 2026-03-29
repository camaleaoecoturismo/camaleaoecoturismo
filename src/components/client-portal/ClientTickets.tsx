import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Ticket, Calendar, MapPin, Clock, QrCode, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientTicket {
  id: string;
  ticket_number: string;
  participant_name: string;
  boarding_point_name: string | null;
  boarding_time: string | null;
  trip_date: string;
  status: string;
  qr_token: string;
  tour_name: string;
  tour_image_url: string | null;
}

export default function ClientTickets({ cpf }: { cpf: string }) {
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id, ticket_number, participant_name, boarding_point_name,
          boarding_time, trip_date, status, qr_token,
          tours!tickets_tour_id_fkey (name, image_url)
        `)
        .eq('participant_cpf', cpf.replace(/\D/g, ''))
        .order('trip_date', { ascending: false });

      if (error) { setError(true); setLoading(false); return; }

      setTickets(
        (data || []).map((t: any) => ({
          ...t,
          tour_name: t.tours?.name || '—',
          tour_image_url: t.tours?.image_url || null,
        }))
      );
      setLoading(false);
    };
    fetchTickets();
  }, [cpf]);

  const statusConfig = (status: string) => {
    if (status === 'used') return { label: 'Utilizado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (status === 'cancelled') return { label: 'Cancelado', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' };
    return { label: 'Ativo', icon: Ticket, color: 'text-primary', bg: 'bg-primary/5' };
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12 text-muted-foreground">
      <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Não foi possível carregar seus tickets.</p>
    </div>
  );

  if (tickets.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Ticket className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium">Nenhum ticket encontrado</p>
      <p className="text-sm mt-1">Seus ingressos aparecerão aqui após a confirmação da reserva.</p>
    </div>
  );

  const upcoming = tickets.filter((t) => t.status === 'active' && t.trip_date >= new Date().toISOString().slice(0, 10));
  const past = tickets.filter((t) => t.status !== 'active' || t.trip_date < new Date().toISOString().slice(0, 10));

  const TicketCard = ({ t }: { t: ClientTicket }) => {
    const cfg = statusConfig(t.status);
    const StatusIcon = cfg.icon;
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex">
          {t.tour_image_url ? (
            <img src={t.tour_image_url} alt={t.tour_name} className="w-20 h-full object-cover shrink-0" />
          ) : (
            <div className="w-20 shrink-0 bg-primary/10 flex items-center justify-center">
              <Ticket className="h-6 w-6 text-primary/40" />
            </div>
          )}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground truncate">{t.tour_name}</p>
              <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(t.trip_date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              {t.boarding_point_name && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {t.boarding_point_name}
                  {t.boarding_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.boarding_time}</span>}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <QrCode className="h-3 w-3" />
                #{t.ticket_number}
              </p>
            </div>
            <a
              href={`/ticket/${t.qr_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-medium"
            >
              Ver ingresso <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Próximos</p>
          <div className="space-y-3">
            {upcoming.map((t) => <TicketCard key={t.id} t={t} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Histórico</p>
          <div className="space-y-3 opacity-75">
            {past.map((t) => <TicketCard key={t.id} t={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
