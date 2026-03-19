import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Home, Download, Loader2, ExternalLink, RefreshCw, Clock, AlertCircle, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import logoImage from "@/assets/logo.png";
import camaleaoVideo from "@/assets/camaleao-correndo.mp4";

interface TicketData {
  id: string;
  ticket_number: string;
  participant_name: string;
  qr_token: string;
  status: string;
}

interface ReservaDetails {
  id: string;
  reserva_numero: string;
  tour_name: string;
  tour_date: string | null;
  client_name: string;
  client_email: string;
  valor_pago: number;
  numero_participantes: number;
  status: string;
  payment_status: string;
  receipt_url: string | null;
  ponto_embarque: string | null;
  ponto_embarque_horario: string | null;
  tickets: TicketData[];
  whatsapp_group_link: string | null;
}

const WHATSAPP_SUPPORT = '5582993649454';

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState<ReservaDetails | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [ticketPollCount, setTicketPollCount] = useState(0);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const orderNsu = searchParams.get('order_nsu');
  const receiptUrl = searchParams.get('receipt_url');
  const transactionNsu = searchParams.get('transaction_nsu');
  const captureMethod = searchParams.get('capture_method');
  const slug = searchParams.get('slug');
  const paidAmount = searchParams.get('paid_amount');
  const reservaIdParam = searchParams.get('reserva');
  
  // Get initial paid amount from URL params immediately (before any fetch)
  const initialPaidAmount = paidAmount ? parseInt(paidAmount) / 100 : null;

  // Call edge function to verify payment with InfinitePay API
  const verifyPaymentWithInfinitePay = useCallback(async (reservaId: string) => {
    if (!transactionNsu) return false;
    
    try {
      console.log('Verifying payment with InfinitePay for reserva:', reservaId);
      
      const { data, error } = await supabase.functions.invoke('check-infinitepay-payment', {
        body: {
          reserva_id: reservaId,
          transaction_nsu: transactionNsu,
          slug: slug,
          receipt_url: receiptUrl,
          capture_method: captureMethod,
          paid_amount: paidAmount ? parseInt(paidAmount) : null
        }
      });

      if (error) {
        console.error('Error verifying payment:', error);
        return false;
      }

      console.log('Payment verification result:', data);
      return data?.verified === true || data?.already_confirmed === true;
    } catch (err) {
      console.error('Failed to verify payment:', err);
      return false;
    }
  }, [transactionNsu, slug, receiptUrl, captureMethod, paidAmount]);

  const fetchReservaDetails = useCallback(async () => {
    try {
      let reservaId = orderNsu || reservaIdParam;
      
      if (reservaId) {
        const { data: reservaById } = await supabase
          .from('reservas')
          .select('id')
          .eq('id', reservaId)
          .single();
        
        if (!reservaById && slug) {
          const { data: reservaBySlug } = await supabase
            .from('reservas')
            .select('id')
            .eq('infinitepay_invoice_slug', slug)
            .single();
          
          if (reservaBySlug) {
            reservaId = reservaBySlug.id;
          }
        }
      } else if (slug) {
        const { data: reservaBySlug } = await supabase
          .from('reservas')
          .select('id')
          .eq('infinitepay_invoice_slug', slug)
          .single();
        
        if (reservaBySlug) {
          reservaId = reservaBySlug.id;
        }
      }
      
      if (!reservaId) {
        console.error('No reserva ID found in URL params');
        setLoading(false);
        return null;
      }

      // If we have transaction_nsu, verify payment with InfinitePay API first
      // This handles cases where webhook didn't arrive
      if (transactionNsu) {
        await verifyPaymentWithInfinitePay(reservaId);
      } else if (receiptUrl || captureMethod) {
        // Fallback: update with redirect params if no transaction_nsu
        // NOTE: Do NOT update valor_pago from URL params - valor_total_com_opcionais is authoritative
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        };
        if (receiptUrl) updateData.receipt_url = receiptUrl;
        if (captureMethod) updateData.capture_method = captureMethod;
        
        await supabase
          .from('reservas')
          .update(updateData)
          .eq('id', reservaId);
      }

      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          reserva_numero,
          valor_pago,
          valor_total_com_opcionais,
          numero_participantes,
          status,
          payment_status,
          receipt_url,
          clientes!fk_reservas_cliente(nome_completo, email),
          tours!fk_reservas_tour(name, start_date, whatsapp_group_link),
          tour_boarding_points!fk_reservas_ponto_embarque(nome, horario)
        `)
        .eq('id', reservaId)
        .single();

      if (error) throw error;

      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, ticket_number, participant_name, qr_token, status')
        .eq('reserva_id', reservaId)
        .eq('status', 'active');

      const cliente = data.clientes as { nome_completo?: string; email?: string } | null;
      const tour = data.tours as { name?: string; start_date?: string; whatsapp_group_link?: string } | null;
      const pontoEmbarque = data.tour_boarding_points as { nome?: string; horario?: string } | null;

      console.log('Client data from DB:', { cliente, clienteRaw: data.clientes });

      // Priority for valor_pago: 1) valor_total_com_opcionais (authoritative), 2) valor_pago from DB, 3) URL param
      let valorPago = data.valor_total_com_opcionais || data.valor_pago || 0;
      if (valorPago === 0 && initialPaidAmount) {
        valorPago = initialPaidAmount;
      }

      // Stop loading tickets if we got them
      if (tickets && tickets.length > 0) {
        setLoadingTickets(false);
      }

      const reservaDetails: ReservaDetails = {
        id: data.id,
        reserva_numero: data.reserva_numero || '',
        tour_name: tour?.name || '',
        tour_date: tour?.start_date || null,
        client_name: cliente?.nome_completo || '',
        client_email: cliente?.email || '',
        valor_pago: valorPago,
        numero_participantes: data.numero_participantes || 1,
        status: data.status,
        payment_status: data.payment_status,
        receipt_url: data.receipt_url,
        ponto_embarque: pontoEmbarque?.nome || null,
        ponto_embarque_horario: pontoEmbarque?.horario || null,
        tickets: tickets || [],
        whatsapp_group_link: tour?.whatsapp_group_link || null,
      };

      setReserva(reservaDetails);
      return reservaDetails;
    } catch (error) {
      console.error('Error fetching reserva:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderNsu, reservaIdParam, receiptUrl, transactionNsu, captureMethod, slug, paidAmount, initialPaidAmount, verifyPaymentWithInfinitePay]);

  // Initial fetch
  useEffect(() => {
    fetchReservaDetails();
  }, [fetchReservaDetails]);

  const isConfirmedByRedirect = !!(transactionNsu || captureMethod);

  // Poll for payment confirmation
  useEffect(() => {
    if (!reserva || reserva.payment_status === 'pago' || isConfirmedByRedirect || pollCount >= 20) return;

    const pollInterval = setInterval(async () => {
      const updated = await fetchReservaDetails();
      setPollCount(prev => prev + 1);
      
      if (updated?.payment_status === 'pago') {
        clearInterval(pollInterval);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [reserva, pollCount, fetchReservaDetails, isConfirmedByRedirect]);

  // Poll for tickets
  useEffect(() => {
    const isPaid = reserva?.payment_status === 'pago' || reserva?.status === 'confirmada' || isConfirmedByRedirect;
    
    console.log('Ticket poll check:', { 
      isPaid, 
      ticketsCount: reserva?.tickets?.length, 
      ticketPollCount,
      paymentStatus: reserva?.payment_status,
      status: reserva?.status
    });
    
    if (!reserva || !isPaid || (reserva.tickets && reserva.tickets.length > 0) || ticketPollCount >= 60) {
      if (reserva?.tickets && reserva.tickets.length > 0) {
        setLoadingTickets(false);
      }
      return;
    }

    const ticketPoll = setInterval(async () => {
      const updated = await fetchReservaDetails();
      setTicketPollCount(prev => prev + 1);
      
      console.log('Ticket poll result:', { ticketsFound: updated?.tickets?.length });
      
      if (updated && updated.tickets && updated.tickets.length > 0) {
        setLoadingTickets(false);
        clearInterval(ticketPoll);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(ticketPoll);
  }, [reserva, ticketPollCount, fetchReservaDetails, isConfirmedByRedirect]);

  // Stop loading tickets after max polls (2 minutes)
  useEffect(() => {
    if (ticketPollCount >= 60) {
      setLoadingTickets(false);
    }
  }, [ticketPollCount]);

  const handleManualCheck = async () => {
    setManualCheckLoading(true);
    await fetchReservaDetails();
    setManualCheckLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Parse date parts directly to avoid timezone issues
    // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss' formats
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${day} de ${months[month - 1]} de ${year}`;
  };

  const openTicket = (qrToken: string) => {
    window.open(`/ticket/${qrToken}`, '_blank');
  };

  const openWhatsAppSupport = () => {
    const tourDate = reserva?.tour_date ? formatDate(reserva.tour_date) : '';
    const message = encodeURIComponent(`Olá! Acabei de fazer uma reserva (${reserva?.reserva_numero}) para o passeio "${reserva?.tour_name}" no dia ${tourDate} e tenho uma dúvida.`);
    window.open(`https://wa.me/${WHATSAPP_SUPPORT}?text=${message}`, '_blank');
  };

  const isPaid = reserva?.payment_status === 'pago' || reserva?.status === 'confirmada' || isConfirmedByRedirect;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary via-primary to-purple-900">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-4">
          <img src={logoImage} alt="Camaleao Ecoturismo" className="h-10 mx-auto drop-shadow-lg" />
        </div>

        {loading ? (
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <video 
                src={camaleaoVideo} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-32 h-32 object-contain"
              />
              <p className="text-muted-foreground mt-2 text-sm">Carregando informações...</p>
            </CardContent>
          </Card>
        ) : !reserva ? (
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <AlertCircle className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Reserva não encontrada
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Não foi possível localizar os dados da sua reserva.
              </p>
              <Button onClick={() => navigate('/')} className="w-full h-10 text-sm">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        ) : !isPaid ? (
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
              </div>
              
              <h1 className="text-xl font-bold text-foreground mb-2">
                Confirmando Pagamento...
              </h1>
              
              <p className="text-sm text-muted-foreground mb-6">
                Estamos aguardando a confirmação do seu pagamento.
              </p>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6 bg-muted/50 py-2 px-3 rounded-lg">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Verificando automaticamente...</span>
              </div>

              <Button 
                onClick={handleManualCheck} 
                variant="outline" 
                className="w-full h-10 text-sm mb-2"
                disabled={manualCheckLoading}
              >
                {manualCheckLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar Novamente
              </Button>

              <Button onClick={() => navigate('/')} variant="ghost" className="w-full h-10 text-sm">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
            <CardContent className="pt-6 pb-5 px-4">
              {/* Success Header - Compact */}
              <div className="text-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                
                <h1 className="text-xl font-bold text-foreground">
                  Pagamento Confirmado!
                </h1>
              </div>

              {/* Reservation Info - Compact */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                <h3 className="font-bold text-lg text-foreground mb-2">{reserva.tour_name}</h3>
                
                <div className="space-y-1.5 text-sm">
                  {reserva.tour_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(reserva.tour_date)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{reserva.numero_participantes} {reserva.numero_participantes === 1 ? 'pessoa' : 'pessoas'}</span>
                  </div>
                  
                  {reserva.ponto_embarque && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{reserva.ponto_embarque} {reserva.ponto_embarque_horario && `às ${reserva.ponto_embarque_horario}`}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total pago</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(reserva.valor_pago)}</span>
                </div>
              </div>

              {/* Tickets Section */}
              {loadingTickets ? (
                <div className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <video 
                      src={camaleaoVideo} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className="w-12 h-12 object-contain"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Gerando seus ingressos...</p>
                      <p className="text-xs text-muted-foreground">Aguarde um momento</p>
                    </div>
                  </div>
                </div>
              ) : reserva.tickets.length > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Seus Ingressos</span>
                  </div>
                  <div className="space-y-1.5">
                    {reserva.tickets.map((ticket) => (
                      <Button
                        key={ticket.id}
                        onClick={() => openTicket(ticket.qr_token)}
                        variant="outline"
                        size="sm"
                        className="w-full justify-between h-10 px-3 hover:bg-primary/5 hover:border-primary border rounded-lg transition-all"
                      >
                        <span className="truncate text-sm">{ticket.participant_name}</span>
                        <div className="flex items-center gap-1 text-primary shrink-0">
                          <Download className="h-3 w-3" />
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Email Notice - Compact */}
              <div className="text-center mb-4 p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Enviamos o ingresso para <span className="font-medium text-foreground">{reserva.client_email || 'seu e-mail'}</span>
                </p>
              </div>

              {/* Action Buttons - Compact */}
              <div className="flex flex-col items-center gap-2">
                {reserva.whatsapp_group_link && (
                  <Button
                    onClick={() => window.open(reserva.whatsapp_group_link!, '_blank')}
                    className="h-9 text-sm font-semibold bg-green-600 hover:bg-green-700 px-6"
                  >
                    <FaWhatsapp className="h-4 w-4 mr-2" />
                    Entrar no Grupo
                  </Button>
                )}

                <Button
                  onClick={openWhatsAppSupport}
                  variant="outline"
                  className="h-9 text-sm border-green-600 text-green-700 hover:bg-green-50 px-6"
                >
                  <FaWhatsapp className="h-4 w-4 mr-2" />
                  Tirar dúvidas
                </Button>

                {reserva.receipt_url && (
                  <Button
                    onClick={() => window.open(reserva.receipt_url!, '_blank')}
                    variant="outline"
                    className="h-9 text-sm px-6"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Comprovante
                  </Button>
                )}

                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="h-9 text-sm text-muted-foreground"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Início
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-4">
          Camaleão Ecoturismo © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
