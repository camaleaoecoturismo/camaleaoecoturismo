import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Home, Download, Loader2 } from 'lucide-react';
import logoImage from "@/assets/logo.png";

interface ParticipantDetail {
  nome: string;
  pacote: string;
  opcionais: string[];
  valorTotal: number;
}

interface ReservaDetails {
  id: string;
  reserva_numero: string;
  tour_name: string;
  client_name: string;
  valor_pago: number;
  data_pagamento: string;
  participants: ParticipantDetail[];
}

export default function ReservaSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState<ReservaDetails | null>(null);

  const reservaId = searchParams.get('reserva');

  useEffect(() => {
    if (reservaId) {
      fetchReservaDetails();
    }
  }, [reservaId]);

  const fetchReservaDetails = async () => {
    try {
      // Fetch reservation data
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          reserva_numero,
          valor_pago,
          data_pagamento,
          clientes!inner(nome_completo),
          tours!inner(name)
        `)
        .eq('id', reservaId)
        .single();

      if (error) throw error;

      // Fetch participants with their individual details
      const { data: participants, error: participantsError } = await supabase
        .from('reservation_participants')
        .select('*')
        .eq('reserva_id', reservaId)
        .order('participant_index', { ascending: true });

      // Fetch pricing options for this tour
      let pricingMap: Record<string, number> = {};
      if (participants && participants.length > 0) {
        const pricingIds = [...new Set(participants.map(p => p.pricing_option_id).filter(Boolean))];
        if (pricingIds.length > 0) {
          const { data: pricingData } = await supabase
            .from('tour_pricing_options')
            .select('id, pix_price')
            .in('id', pricingIds);
          
          (pricingData || []).forEach((p: any) => {
            pricingMap[p.id] = p.pix_price;
          });
        }
      }

      // Build participant details
      const participantDetails: ParticipantDetail[] = (participants || [])
        .filter(p => p.nome_completo)
        .map(p => {
          const packagePrice = p.pricing_option_id ? (pricingMap[p.pricing_option_id] || 0) : 0;
          
          let optionalsTotal = 0;
          const optionalsList: string[] = [];
          if (p.selected_optionals && Array.isArray(p.selected_optionals)) {
            (p.selected_optionals as any[]).forEach(opt => {
              const qty = opt.quantity || 1;
              const price = opt.price || 0;
              optionalsTotal += price * qty;
              optionalsList.push(qty > 1 ? `${opt.name} (x${qty})` : opt.name);
            });
          }

          return {
            nome: p.nome_completo,
            pacote: p.pricing_option_name || '-',
            opcionais: optionalsList,
            valorTotal: packagePrice + optionalsTotal
          };
        });

      setReserva({
        id: data.id,
        reserva_numero: data.reserva_numero || '',
        tour_name: (data.tours as any)?.name || '',
        client_name: (data.clientes as any)?.nome_completo || '',
        valor_pago: data.valor_pago || 0,
        data_pagamento: data.data_pagamento || '',
        participants: participantDetails
      });
    } catch (error) {
      console.error('Error fetching reserva:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#8d00da' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src={logoImage} alt="Camaleão Ecoturismo" className="h-10 mx-auto mb-4" />
        </div>

        {loading ? (
          <Card className="bg-white">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Pagamento Confirmado!
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Sua reserva foi confirmada com sucesso
              </p>

              {reserva && (
                <div className="space-y-4 mb-6">
                  {/* Basic reservation info */}
                  <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Reserva</span>
                      <span className="font-medium text-sm">{reserva.reserva_numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Passeio</span>
                      <span className="font-medium text-sm">{reserva.tour_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Data</span>
                      <span className="font-medium text-sm">{formatDate(reserva.data_pagamento)}</span>
                    </div>
                  </div>

                  {/* Participant details - show individual breakdown */}
                  {reserva.participants.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4 text-left">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Detalhes por participante:</p>
                      <div className="space-y-3">
                        {reserva.participants.map((p, idx) => (
                          <div key={idx} className="border-b border-muted last:border-0 pb-2 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{p.nome}</p>
                                <p className="text-xs text-muted-foreground">{p.pacote}</p>
                                {p.opcionais.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    + {p.opcionais.join(', ')}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-sm text-green-600">
                                {formatCurrency(p.valorTotal)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total paid */}
                  <div className="bg-green-50 rounded-lg p-4 text-left">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Pago</span>
                      <span className="font-bold text-xl text-green-600">{formatCurrency(reserva.valor_pago)}</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-6">
                Você receberá um e-mail de confirmação com todos os detalhes da sua reserva.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}