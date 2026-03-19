import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Loader2, 
  Search, 
  Download, 
  Eye, 
  Send, 
  RefreshCw,
  Ticket,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketPreview } from "./TicketPreview";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketData {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf: string | null;
  boarding_point_name: string | null;
  boarding_time: string | null;
  trip_date: string;
  amount_paid: number | null;
  reservation_number: string | null;
  status: string;
  checkin_at: string | null;
  qr_token: string;
  tour_id: string;
  tour_name?: string;
  tour_image_url?: string;
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
  image_url: string | null;
}

export function TicketManagement() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewTicket, setPreviewTicket] = useState<TicketData | null>(null);
  const [template, setTemplate] = useState<any>(null);
  const [generatingTickets, setGeneratingTickets] = useState(false);

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [selectedTour, statusFilter]);

  const fetchTours = async () => {
    const { data, error } = await supabase
      .from('tours')
      .select('id, name, start_date, image_url')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setTours(data);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          tours:tour_id (name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (selectedTour !== 'all') {
        query = query.eq('tour_id', selectedTour);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTickets(
        (data || []).map((t) => ({
          ...t,
          tour_name: (t.tours as any)?.name,
          tour_image_url: (t.tours as any)?.image_url
        }))
      );
    } catch (error: any) {
      toast.error('Erro ao carregar tickets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateTicketsForTour = async (tourId: string) => {
    setGeneratingTickets(true);
    try {
      // Get all confirmed reservations for the tour that don't have tickets yet
      const { data: reservations, error: resError } = await supabase
        .from('reservas')
        .select('id')
        .eq('tour_id', tourId)
        .in('status', ['confirmada', 'confirmado'])
        .eq('payment_status', 'pago');

      if (resError) throw resError;

      for (const res of reservations || []) {
        // Check if tickets already exist
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('reserva_id', res.id);

        if (!existingTickets || existingTickets.length === 0) {
          // Call the database function to create tickets
          await supabase.rpc('create_tickets_for_reservation', { p_reserva_id: res.id });
        }
      }

      toast.success('Tickets gerados com sucesso!');
      fetchTickets();
    } catch (error: any) {
      toast.error('Erro ao gerar tickets: ' + error.message);
    } finally {
      setGeneratingTickets(false);
    }
  };

  const openPreview = async (ticket: TicketData) => {
    setPreviewTicket(ticket);

    // Fetch template
    const { data: tourTemplate } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('tour_id', ticket.tour_id)
      .single();

    if (tourTemplate) {
      setTemplate(tourTemplate);
    } else {
      const { data: defaultTemplate } = await supabase
        .from('ticket_templates')
        .select('*')
        .eq('is_default', true)
        .single();
      setTemplate(defaultTemplate);
    }
  };

  const copyTicketLink = (token: string) => {
    const link = `${window.location.origin}/ticket/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.participant_name?.toLowerCase().includes(query) ||
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.reservation_number?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
      case 'used':
        return <Badge className="bg-blue-100 text-blue-700">Utilizado</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700">Cancelado</Badge>;
      case 'invalid':
        return <Badge className="bg-red-100 text-red-700">Inválido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tickets Gerados
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os ingressos individuais dos participantes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, ticket ou pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedTour} onValueChange={setSelectedTour}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Filtrar por passeio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os passeios</SelectItem>
            {tours.map((tour) => (
              <SelectItem key={tour.id} value={tour.id}>
                {tour.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="used">Utilizado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {selectedTour !== 'all' && (
          <Button 
            onClick={() => generateTicketsForTour(selectedTour)}
            disabled={generatingTickets}
            className="gap-2"
          >
            {generatingTickets ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Gerar Tickets
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'active').length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'used').length}</p>
              <p className="text-xs text-muted-foreground">Utilizados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'cancelled').length}</p>
              <p className="text-xs text-muted-foreground">Cancelados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhum ticket encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Selecione um passeio e clique em "Gerar Tickets" para criar os ingressos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Participante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Passeio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm">{ticket.ticket_number}</p>
                      <p className="text-xs text-muted-foreground">{ticket.reservation_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{ticket.participant_name}</p>
                      {ticket.boarding_point_name && (
                        <p className="text-xs text-muted-foreground">{ticket.boarding_point_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{ticket.tour_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {format(new Date(ticket.trip_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {ticket.checkin_at && (
                        <p className="text-xs text-muted-foreground">
                          Check-in: {format(new Date(ticket.checkin_at), "HH:mm")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPreview(ticket)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyTicketLink(ticket.qr_token)}
                          title="Copiar link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/ticket/${ticket.qr_token}`, '_blank')}
                          title="Abrir ticket"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTicket} onOpenChange={() => setPreviewTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévia do Ticket</DialogTitle>
          </DialogHeader>
          {previewTicket && template && (
            <TicketPreview template={template} ticketData={previewTicket} fullSize />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
