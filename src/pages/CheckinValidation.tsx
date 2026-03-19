import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Ticket as TicketIcon
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf?: string | null; // Made optional - not returned by public RPC for security
  boarding_point_name: string | null;
  boarding_time: string | null;
  trip_date: string;
  reservation_number: string | null;
  status: string;
  checkin_at: string | null;
  tour_name?: string;
}

export default function CheckinValidation() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuthAndFetchTicket();
  }, [qrToken]);

  const checkAuthAndFetchTicket = async () => {
    try {
      // Check if user is admin
      let userIsAdmin = false;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.rpc('get_current_user_role');
        userIsAdmin = roleData === 'admin';
        setIsAdmin(userIsAdmin);
      }

      // Use secure RPC function for ticket lookup (admins use direct query for full data)
      if (userIsAdmin) {
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            tours:tour_id (name)
          `)
          .eq('qr_token', qrToken)
          .single();

        if (ticketError || !ticketData) {
          setError('Ticket não encontrado');
          return;
        }

        setTicket({
          ...ticketData,
          tour_name: (ticketData.tours as any)?.name
        });
      } else {
        // Use secure RPC for non-admin users (public ticket viewing)
        const { data: ticketResults, error: ticketError } = await supabase
          .rpc('get_ticket_by_qr', { qr_token_param: qrToken });

        if (ticketError || !ticketResults || ticketResults.length === 0) {
          setError('Ticket não encontrado');
          return;
        }

        const ticketData = ticketResults[0];
        // Fetch tour name separately
        const { data: tourData } = await supabase
          .from('tours')
          .select('name')
          .eq('id', ticketData.tour_id)
          .single();

        setTicket({
          ...ticketData,
          tour_name: tourData?.name
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!ticket || !isAdmin) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'used', 
          checkin_at: new Date().toISOString() 
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setTicket({ ...ticket, status: 'used', checkin_at: new Date().toISOString() });
      toast.success('Check-in realizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao realizar check-in: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <XCircle className="h-20 w-20 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-800 mb-2">Ticket Inválido</h1>
        <p className="text-red-600 text-center mb-6">
          {error || 'Este ticket não existe ou o QR Code está incorreto.'}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const renderStatusContent = () => {
    if (ticket.status === 'used') {
      return (
        <div className="bg-yellow-50 min-h-screen p-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-yellow-500 p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-white mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-white">Ticket Já Utilizado</h1>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center text-yellow-600 bg-yellow-100 rounded-lg p-3">
                  <p className="text-sm">Check-in realizado em:</p>
                  <p className="font-bold">
                    {ticket.checkin_at 
                      ? format(new Date(ticket.checkin_at), "dd/MM/yyyy 'às' HH:mm")
                      : 'Data não disponível'}
                  </p>
                </div>
                <TicketDetails ticket={ticket} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (ticket.status === 'cancelled') {
      return (
        <div className="bg-gray-100 min-h-screen p-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gray-500 p-6 text-center">
                <XCircle className="h-16 w-16 text-white mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-white">Ticket Cancelado</h1>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-center text-gray-600">
                  Este ticket foi cancelado e não pode ser utilizado.
                </p>
                <TicketDetails ticket={ticket} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Active ticket
    return (
      <div className="bg-green-50 min-h-screen p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-green-500 p-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-white mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-white">Ticket Válido</h1>
            </div>
            <div className="p-6 space-y-4">
              <TicketDetails ticket={ticket} />
              
              {isAdmin && (
                <Button 
                  onClick={handleCheckin} 
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Check-in
                </Button>
              )}

              {!isAdmin && (
                <p className="text-center text-sm text-muted-foreground">
                  Apresente este ticket ao guia para realizar o check-in.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return renderStatusContent();
}

function TicketDetails({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <User className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-xs text-gray-500">Participante</p>
          <p className="font-semibold">{ticket.participant_name}</p>
        </div>
      </div>

      {ticket.tour_name && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <TicketIcon className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Passeio</p>
            <p className="font-semibold">{ticket.tour_name}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Calendar className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-xs text-gray-500">Data</p>
          <p className="font-semibold">
            {format(new Date(ticket.trip_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {ticket.boarding_point_name && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <MapPin className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Embarque</p>
            <p className="font-semibold">{ticket.boarding_point_name}</p>
            {ticket.boarding_time && (
              <p className="text-sm text-gray-600">{ticket.boarding_time}</p>
            )}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2 border-t">
        <p>Ticket: {ticket.ticket_number}</p>
        <p>Pedido: {ticket.reservation_number}</p>
      </div>
    </div>
  );
}
