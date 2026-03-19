import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Users, 
  Receipt, 
  Ticket, 
  CreditCard,
  MessageCircle,
  Download,
  Home,
  QrCode
} from 'lucide-react';
import { PixIcon } from '@/components/icons/PixIcon';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImage from "@/assets/logo.png";

interface ReservaPreview {
  id: string;
  reserva_numero: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  numero_participantes: number | null;
  data_pagamento: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  installments: number | null;
  card_fee_amount: number | null;
  selected_optional_items: Array<{ name: string; quantity: number; price: number }> | null;
  clientes: { nome_completo: string; email: string } | null;
  tours: { name: string; start_date: string; whatsapp_group_link: string | null } | null;
  tour_boarding_points: { nome: string; endereco: string | null; horario: string | null } | null;
  tickets: Array<{ id: string; ticket_number: string; participant_name: string; qr_token: string; status: string }>;
}

interface ReservaListItem {
  id: string;
  reserva_numero: string;
  status: string;
  payment_status: string;
  created_at: string;
  clientes: { nome_completo: string } | null;
  tours: { name: string } | null;
}

export function SuccessPagePreview() {
  const [reservasList, setReservasList] = useState<ReservaListItem[]>([]);
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<ReservaPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservas();
  }, []);

  useEffect(() => {
    if (selectedReservaId) {
      fetchReservaDetails(selectedReservaId);
    }
  }, [selectedReservaId]);

  const fetchReservas = async () => {
    try {
      // Only fetch reservations with confirmed payment
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          reserva_numero,
          status,
          payment_status,
          created_at,
          clientes!fk_reservas_cliente(nome_completo),
          tours!fk_reservas_tour(name)
        `)
        .or('payment_status.eq.pago,status.eq.confirmada')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        clientes: item.clientes as { nome_completo: string } | null,
        tours: item.tours as { name: string } | null
      }));
      
      setReservasList(typedData);
      
      // Select the first reservation
      if (typedData.length > 0) {
        setSelectedReservaId(typedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservaDetails = async (reservaId: string) => {
    try {
      const { data: reservaData, error: reservaError } = await supabase
        .from('reservas')
        .select(`
          id,
          reserva_numero,
          valor_pago,
          valor_passeio,
          valor_total_com_opcionais,
          numero_participantes,
          data_pagamento,
          status,
          payment_status,
          payment_method,
          installments,
          card_fee_amount,
          selected_optional_items,
          clientes!fk_reservas_cliente(nome_completo, email),
          tours!fk_reservas_tour(name, start_date, whatsapp_group_link),
          tour_boarding_points!fk_reservas_ponto_embarque(nome, endereco, horario)
        `)
        .eq('id', reservaId)
        .single();

      if (reservaError) throw reservaError;

      // Fetch tickets
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('id, ticket_number, participant_name, qr_token, status')
        .eq('reserva_id', reservaId);

      const fullReserva: ReservaPreview = {
        ...reservaData,
        clientes: reservaData.clientes as ReservaPreview['clientes'],
        tours: reservaData.tours as ReservaPreview['tours'],
        tour_boarding_points: reservaData.tour_boarding_points as ReservaPreview['tour_boarding_points'],
        selected_optional_items: reservaData.selected_optional_items as ReservaPreview['selected_optional_items'],
        tickets: ticketsData || []
      };

      setSelectedReserva(fullReserva);
    } catch (error) {
      console.error('Error fetching reserva details:', error);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getPaymentBreakdown = () => {
    if (!selectedReserva) return null;

    const numParticipants = selectedReserva.numero_participantes || 1;
    const valorPasseio = selectedReserva.valor_passeio || 0;
    const valorPasseioTotal = valorPasseio * numParticipants;
    const opcionais = selectedReserva.selected_optional_items || [];
    const opcionaisTotal = opcionais.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cardFee = selectedReserva.card_fee_amount || 0;
    const total = selectedReserva.valor_pago || selectedReserva.valor_total_com_opcionais || (valorPasseioTotal + opcionaisTotal + cardFee);

    return {
      valorPasseioUnitario: valorPasseio,
      valorPasseio: valorPasseioTotal,
      opcionais,
      opcionaisTotal,
      cardFee,
      total,
      isCard: selectedReserva.payment_method === 'credit_card' || (selectedReserva.installments && selectedReserva.installments > 1),
      installments: selectedReserva.installments || 1
    };
  };

  const breakdown = getPaymentBreakdown();
  const isPago = selectedReserva?.payment_status === 'pago' || selectedReserva?.status === 'confirmada';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Página de Confirmação de Pagamento</h2>
          <p className="text-muted-foreground">
            Preview de como os clientes veem a página após o pagamento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedReservaId || ''} onValueChange={setSelectedReservaId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione uma reserva" />
            </SelectTrigger>
            <SelectContent>
              {reservasList.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">#{r.reserva_numero || r.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="truncate max-w-[150px]">{r.clientes?.nome_completo || 'Cliente'}</span>
                    <Badge variant={r.payment_status === 'pago' ? 'default' : 'secondary'} className="text-xs">
                      {r.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedReserva && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/pagamento/sucesso?reserva=${selectedReserva.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Página Real
            </Button>
          )}
        </div>
      </div>

      {/* Preview Container */}
      {selectedReserva && breakdown && (
        <div className="border border-border rounded-xl overflow-hidden bg-slate-100">
          {/* Browser mockup header */}
          <div className="bg-slate-200 border-b border-slate-300 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white rounded px-3 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-green-600">🔒</span>
                <span>/pagamento/sucesso?reserva={selectedReserva.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Page Preview */}
          <div className="max-h-[700px] overflow-y-auto p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 30%)' }}>
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Success Header */}
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-4 shadow-lg shadow-green-500/30">
                      <CheckCircle className="h-12 w-12 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-green-700">
                    Pagamento Confirmado!
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Sua reserva foi confirmada com sucesso
                  </p>
                </div>
              </div>

              {/* Main Card */}
              <Card className="border-0 shadow-xl bg-white/95 backdrop-blur">
                <CardContent className="p-0">
                  {/* Tour Header */}
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Passeio</p>
                        <h2 className="text-xl font-bold">{selectedReserva.tours?.name || 'Passeio'}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Reserva</p>
                        <p className="font-mono font-bold">#{selectedReserva.reserva_numero || selectedReserva.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 space-y-6">
                    {/* Client & Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Cliente
                        </p>
                        <p className="font-medium">{selectedReserva.clientes?.nome_completo}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data do Passeio
                        </p>
                        <p className="font-medium">{formatDate(selectedReserva.tours?.start_date)}</p>
                      </div>
                    </div>

                    {/* Boarding */}
                    {selectedReserva.tour_boarding_points && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">
                              {selectedReserva.tour_boarding_points.nome}
                              {selectedReserva.tour_boarding_points.horario && (
                                <span className="ml-2 text-amber-600">• {selectedReserva.tour_boarding_points.horario}</span>
                              )}
                            </p>
                            {selectedReserva.tour_boarding_points.endereco && (
                              <p className="text-sm text-amber-700 mt-1">{selectedReserva.tour_boarding_points.endereco}</p>
                            )}
                            <p className="text-xs text-amber-600 mt-2">
                              Chegue com 15 minutos de antecedência
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Payment Breakdown */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Detalhes do Pagamento</h3>
                        <Badge variant="outline" className="ml-auto">
                          {breakdown.isCard ? (
                            <><CreditCard className="h-3 w-3 mr-1" /> Cartão {breakdown.installments}x</>
                          ) : (
                            <><PixIcon className="h-3 w-3 mr-1" /> PIX</>
                          )}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Valor do passeio ({selectedReserva.numero_participantes}x {formatCurrency(breakdown.valorPasseioUnitario)})
                          </span>
                          <span className="font-medium">{formatCurrency(breakdown.valorPasseio)}</span>
                        </div>

                        {breakdown.opcionais.length > 0 && breakdown.opcionais.map((item, i) => (
                          <div key={i} className="flex justify-between text-muted-foreground">
                            <span>{item.name} ({item.quantity}x)</span>
                            <span>+ {formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}

                        {breakdown.isCard && breakdown.cardFee > 0 && (
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Taxa do cartão ({breakdown.installments}x)</span>
                            <span className="text-orange-600">+ {formatCurrency(breakdown.cardFee)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-3 mt-2 border-t-2 border-slate-200">
                          <span className="font-bold text-base">Total Pago</span>
                          <span className="text-2xl font-bold text-green-600">{formatCurrency(breakdown.total)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Tickets */}
                    {selectedReserva.tickets.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">Seus Ingressos ({selectedReserva.tickets.length})</h3>
                        </div>
                        <div className="grid gap-2">
                          {selectedReserva.tickets.map((ticket) => (
                            <div 
                              key={ticket.id} 
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <QrCode className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{ticket.participant_name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">#{ticket.ticket_number}</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="h-8">
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t p-6 bg-slate-50/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Comprovante
                      </Button>
                      <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Grupo WhatsApp
                      </Button>
                    </div>
                    <Button className="w-full" variant="default">
                      <Home className="h-4 w-4 mr-2" />
                      Voltar ao Início
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Logo Footer */}
              <div className="flex justify-center pt-4">
                <img src={logoImage} alt="Logo" className="h-12 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedReserva && (
        <Card className="p-8 text-center">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma reserva selecionada</h3>
          <p className="text-muted-foreground mt-2">
            Selecione uma reserva acima para visualizar como a página de confirmação aparece para o cliente.
          </p>
        </Card>
      )}
    </div>
  );
}
