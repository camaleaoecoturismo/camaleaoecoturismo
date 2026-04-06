import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Download, Loader2, ExternalLink, RefreshCw, Clock, AlertCircle, Calendar, MapPin, Users, Ticket, Mail, MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import logoImage from "@/assets/logo.png";
import camaleaoVideo from "@/assets/camaleao-correndo.mp4";
import joinhaImage from "@/assets/joinha-camaleao.png";

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
  valor_bruto: number;
  numero_participantes: number;
  status: string;
  payment_status: string;
  receipt_url: string | null;
  ponto_embarque: string | null;
  ponto_embarque_horario: string | null;
  tickets: TicketData[];
  whatsapp_group_link: string | null;
  capture_method: string | null;
  payment_method: string | null;
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
  const ticketsEnsuredRef = useRef(false);

  // Splash screen state
  const [splashDone, setSplashDone] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const orderNsu = searchParams.get('order_nsu');
  const receiptUrl = searchParams.get('receipt_url');
  const transactionNsu = searchParams.get('transaction_nsu');
  const captureMethod = searchParams.get('capture_method');
  const slug = searchParams.get('slug');
  const paidAmount = searchParams.get('paid_amount');
  const reservaIdParam = searchParams.get('reserva');

  const initialPaidAmount = paidAmount ? parseInt(paidAmount) / 100 : null;

  // Skip splash
  const skipSplash = useCallback(() => {
    setSplashFading(true);
    setTimeout(() => setSplashDone(true), 500);
  }, []);

  // Try to play with sound, fallback to muted
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, []);

  const verifyPaymentWithInfinitePay = useCallback(async (reservaId: string) => {
    if (!transactionNsu) return false;
    try {
      const { data, error } = await supabase.functions.invoke('check-infinitepay-payment', {
        body: {
          reserva_id: reservaId,
          transaction_nsu: transactionNsu,
          slug,
          receipt_url: receiptUrl,
          capture_method: captureMethod,
          paid_amount: paidAmount ? parseInt(paidAmount) : null,
        },
      });
      if (error) return false;
      return data?.verified === true || data?.already_confirmed === true;
    } catch {
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
          if (reservaBySlug) reservaId = reservaBySlug.id;
        }
      } else if (slug) {
        const { data: reservaBySlug } = await supabase
          .from('reservas')
          .select('id')
          .eq('infinitepay_invoice_slug', slug)
          .single();
        if (reservaBySlug) reservaId = reservaBySlug.id;
      }

      if (!reservaId) {
        setLoading(false);
        return null;
      }

      if (transactionNsu) {
        await verifyPaymentWithInfinitePay(reservaId);
      } else if (receiptUrl || captureMethod) {
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (receiptUrl) updateData.receipt_url = receiptUrl;
        if (captureMethod) updateData.capture_method = captureMethod;
        await supabase.from('reservas').update(updateData).eq('id', reservaId);
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
          ponto_embarque_id,
          capture_method,
          payment_method,
          clientes!fk_reservas_cliente(nome_completo, email),
          tours!fk_reservas_tour(name, start_date, whatsapp_group_link)
        `)
        .eq('id', reservaId)
        .single();

      if (error) throw error;

      let pontoEmbarque: { nome?: string; horario?: string } | null = null;
      if (data.ponto_embarque_id) {
        const { data: bpData } = await supabase
          .from('tour_boarding_points')
          .select('nome, horario')
          .eq('id', data.ponto_embarque_id)
          .single();
        pontoEmbarque = bpData;
      }

      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, ticket_number, participant_name, qr_token, status')
        .eq('reserva_id', reservaId)
        .eq('status', 'active');

      const cliente = data.clientes as { nome_completo?: string; email?: string } | null;
      const tour = data.tours as { name?: string; start_date?: string; whatsapp_group_link?: string } | null;

      const valorBruto = data.valor_total_com_opcionais || data.valor_pago || 0;
      let valorPago = data.valor_pago || valorBruto;
      if (valorPago === 0 && initialPaidAmount) valorPago = initialPaidAmount;

      if (tickets && tickets.length > 0) setLoadingTickets(false);

      const reservaDetails: ReservaDetails = {
        id: data.id,
        reserva_numero: data.reserva_numero || '',
        tour_name: tour?.name || '',
        tour_date: tour?.start_date || null,
        client_name: cliente?.nome_completo || '',
        client_email: cliente?.email || '',
        valor_pago: valorPago,
        valor_bruto: valorBruto,
        numero_participantes: data.numero_participantes || 1,
        status: data.status,
        payment_status: data.payment_status,
        receipt_url: data.receipt_url,
        ponto_embarque: pontoEmbarque?.nome || null,
        ponto_embarque_horario: pontoEmbarque?.horario || null,
        tickets: tickets || [],
        whatsapp_group_link: tour?.whatsapp_group_link || null,
        capture_method: (data as any).capture_method || captureMethod || null,
        payment_method: (data as any).payment_method || null,
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

  useEffect(() => { fetchReservaDetails(); }, [fetchReservaDetails]);

  const isConfirmedByRedirect = !!(transactionNsu || captureMethod);

  useEffect(() => {
    if (!reserva || reserva.payment_status === 'pago' || isConfirmedByRedirect || pollCount >= 20) return;
    const pollInterval = setInterval(async () => {
      const updated = await fetchReservaDetails();
      setPollCount(prev => prev + 1);
      if (updated?.payment_status === 'pago') clearInterval(pollInterval);
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [reserva, pollCount, fetchReservaDetails, isConfirmedByRedirect]);

  // Ensure tickets are generated: call check-infinitepay-payment once when paid but no tickets
  useEffect(() => {
    const isPaid = reserva?.payment_status === 'pago' || reserva?.status === 'confirmada' || isConfirmedByRedirect;
    if (!reserva || !isPaid || reserva.tickets.length > 0 || ticketsEnsuredRef.current) return;
    ticketsEnsuredRef.current = true;

    supabase.functions.invoke('check-infinitepay-payment', {
      body: {
        reserva_id: reserva.id,
        ...(transactionNsu && { transaction_nsu: transactionNsu }),
        ...(slug && { slug }),
        ...(receiptUrl && { receipt_url: receiptUrl }),
        ...(captureMethod && { capture_method: captureMethod }),
      }
    }).then(() => {
      // Re-fetch after a short delay to pick up generated tickets
      setTimeout(() => fetchReservaDetails(), 1500);
    }).catch(() => {
      setTimeout(() => fetchReservaDetails(), 1500);
    });
  }, [reserva, isConfirmedByRedirect, transactionNsu, slug, receiptUrl, captureMethod, fetchReservaDetails]);

  // Poll for tickets (max 15 attempts = ~30s)
  useEffect(() => {
    const isPaid = reserva?.payment_status === 'pago' || reserva?.status === 'confirmada' || isConfirmedByRedirect;
    if (!reserva || !isPaid || (reserva.tickets && reserva.tickets.length > 0) || ticketPollCount >= 15) {
      if (reserva?.tickets && reserva.tickets.length > 0) setLoadingTickets(false);
      return;
    }
    const ticketPoll = setInterval(async () => {
      const updated = await fetchReservaDetails();
      setTicketPollCount(prev => prev + 1);
      if (updated && updated.tickets && updated.tickets.length > 0) {
        setLoadingTickets(false);
        clearInterval(ticketPoll);
      }
    }, 2000);
    return () => clearInterval(ticketPoll);
  }, [reserva, ticketPollCount, fetchReservaDetails, isConfirmedByRedirect]);

  useEffect(() => {
    if (ticketPollCount >= 15) setLoadingTickets(false);
  }, [ticketPollCount]);

  const handleManualCheck = async () => {
    setManualCheckLoading(true);
    await fetchReservaDetails();
    setManualCheckLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${day} de ${months[month - 1]} de ${year}`;
  };

  const openTicket = (qrToken: string) => window.open(`/ticket/${qrToken}`, '_blank');

  const openWhatsAppSupport = () => {
    const tourDate = reserva?.tour_date ? formatDate(reserva.tour_date) : '';
    const message = encodeURIComponent(`Olá! Acabei de fazer uma reserva (${reserva?.reserva_numero}) para o passeio "${reserva?.tour_name}" no dia ${tourDate} e tenho uma dúvida.`);
    window.open(`https://wa.me/${WHATSAPP_SUPPORT}?text=${message}`, '_blank');
  };

  const isPaid = reserva?.payment_status === 'pago' || reserva?.status === 'confirmada' || isConfirmedByRedirect;

  // Payment breakdown logic
  const getPaymentInfo = () => {
    if (!reserva) return null;
    const valorBruto = reserva.valor_bruto;
    const valorPago = reserva.valor_pago;
    const juros = Math.max(0, valorPago - valorBruto);
    const isCartao = reserva.capture_method === 'credit_card' || reserva.payment_method === 'credit_card';
    return { valorBruto, valorPago, juros, isCartao };
  };

  return (
    <>
      {/* Splash screen */}
      {!splashDone && (
        <div
          className={`fixed inset-0 z-50 bg-black transition-opacity duration-500 ${splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <video
            ref={videoRef}
            src="/video-camaleao.mp4"
            playsInline
            onEnded={skipSplash}
            className="w-full h-full object-cover"
          />
          <button
            onClick={skipSplash}
            className="absolute bottom-8 right-6 text-white/80 hover:text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm transition-colors"
          >
            Pular →
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900">
        <div className="max-w-md w-full">

          {/* Logo */}
          <div className="text-center mb-6">
            <img src={logoImage} alt="Camaleao Ecoturismo" className="h-10 mx-auto drop-shadow-lg" />
          </div>

          {loading ? (
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-8 flex flex-col items-center">
              <video src={camaleaoVideo} autoPlay loop muted playsInline className="w-28 h-28 object-contain" />
              <p className="text-muted-foreground mt-3 text-sm">Carregando sua reserva...</p>
            </div>

          ) : !reserva ? (
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl px-6 py-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-9 w-9 text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Reserva não encontrada</h1>
              <p className="text-sm text-muted-foreground mb-6">Não foi possível localizar os dados da sua reserva.</p>
              <Button onClick={() => navigate('/')} className="w-full">
                <Home className="h-4 w-4 mr-2" /> Voltar ao Início
              </Button>
            </div>

          ) : !isPaid ? (
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl px-6 py-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-9 w-9 text-amber-600 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Confirmando Pagamento...</h1>
              <p className="text-sm text-muted-foreground mb-5">Estamos aguardando a confirmação do seu pagamento.</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 bg-muted/50 py-2 px-3 rounded-lg">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Verificando automaticamente...</span>
              </div>
              <Button onClick={handleManualCheck} variant="outline" className="w-full mb-2" disabled={manualCheckLoading}>
                {manualCheckLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Verificar Novamente
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-muted-foreground">
                <Home className="h-4 w-4 mr-2" /> Voltar ao Início
              </Button>
            </div>

          ) : (
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-7 pb-6 text-white text-center">
                <div className="w-20 h-20 mx-auto mb-3">
                  <img src={joinhaImage} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
                <h1 className="text-2xl font-bold">Reserva Confirmada!</h1>
                {reserva.client_name && (
                  <p className="text-emerald-100 text-sm mt-1">Olá, {reserva.client_name.split(' ')[0]}! Boa aventura.</p>
                )}
              </div>

              <div className="px-5 py-5 space-y-4">

                {/* Tour info */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="font-bold text-base text-foreground mb-3">{reserva.tour_name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {reserva.tour_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{formatDate(reserva.tour_date)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{reserva.numero_participantes} {reserva.numero_participantes === 1 ? 'pessoa' : 'pessoas'}</span>
                    </div>
                    {reserva.ponto_embarque && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{reserva.ponto_embarque}{reserva.ponto_embarque_horario && ` · ${reserva.ponto_embarque_horario}`}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment breakdown */}
                  {(() => {
                    const pi = getPaymentInfo();
                    if (!pi) return null;
                    const { valorBruto, valorPago, juros, isCartao } = pi;
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        {isCartao && juros > 0.01 ? (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Valor bruto</span>
                              <span>{formatCurrency(valorBruto)}</span>
                            </div>
                            <div className="flex justify-between text-amber-600">
                              <span>Juros do cartão</span>
                              <span>+ {formatCurrency(juros)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200 mt-1">
                              <span className="font-semibold text-sm">Total pago</span>
                              <span className="text-emerald-600 font-bold text-lg">{formatCurrency(valorPago)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {isCartao ? 'Total pago (cartão)' : 'Total pago (Pix)'}
                            </span>
                            <span className="text-emerald-600 font-bold text-lg">{formatCurrency(valorBruto)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Próximos passos */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Próximos passos</p>
                  <div className="space-y-2.5">
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-emerald-600" /> Ingresso enviado por e-mail
                        </p>
                        <p className="text-xs text-muted-foreground">{reserva.client_email || 'Verifique sua caixa de entrada'}</p>
                      </div>
                    </div>

                    {reserva.whatsapp_group_link && (
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Entre no grupo do WhatsApp
                          </p>
                          <p className="text-xs text-muted-foreground">Informações e atualizações sobre o passeio</p>
                        </div>
                      </div>
                    )}

                    {reserva.ponto_embarque && (
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{reserva.whatsapp_group_link ? '3' : '2'}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Chegue 15 min antes do embarque
                          </p>
                          <p className="text-xs text-muted-foreground">{reserva.ponto_embarque}{reserva.ponto_embarque_horario && ` · ${reserva.ponto_embarque_horario}`}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tickets */}
                {loadingTickets ? (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <video src={camaleaoVideo} autoPlay loop muted playsInline className="w-10 h-10 object-contain" />
                      <div>
                        <p className="font-medium text-sm">Gerando seus ingressos...</p>
                        <p className="text-xs text-muted-foreground">Aguarde um momento</p>
                      </div>
                    </div>
                  </div>
                ) : reserva.tickets.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                      <Ticket className="h-3.5 w-3.5 inline mr-1" />Seus Ingressos
                    </p>
                    <div className="space-y-1.5">
                      {reserva.tickets.map(ticket => (
                        <Button
                          key={ticket.id}
                          onClick={() => openTicket(ticket.qr_token)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-10 px-3 hover:bg-emerald-50 hover:border-emerald-400 border rounded-lg transition-all"
                        >
                          <span className="truncate text-sm">{ticket.participant_name}</span>
                          <div className="flex items-center gap-1 text-emerald-600 shrink-0">
                            <Download className="h-3.5 w-3.5" />
                            <span className="text-xs">Ver</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  {reserva.whatsapp_group_link && (
                    <Button
                      onClick={() => window.open(reserva.whatsapp_group_link!, '_blank')}
                      className="w-full bg-green-600 hover:bg-green-700 font-semibold"
                    >
                      <FaWhatsapp className="h-4 w-4 mr-2" /> Entrar no Grupo
                    </Button>
                  )}
                  <Button onClick={openWhatsAppSupport} variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50">
                    <FaWhatsapp className="h-4 w-4 mr-2" /> Tirar dúvidas
                  </Button>
                  {reserva.receipt_url && (
                    <Button onClick={() => window.open(reserva.receipt_url!, '_blank')} variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" /> Ver Comprovante
                    </Button>
                  )}
                  <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-muted-foreground">
                    <Home className="h-4 w-4 mr-2" /> Início
                  </Button>
                </div>

              </div>
            </div>
          )}

          <p className="text-center text-white/40 text-xs mt-5">
            Camaleão Ecoturismo © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}
