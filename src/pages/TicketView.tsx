import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, AlertTriangle, CheckCircle2, XCircle, Share2 } from "lucide-react";
import { TicketPreview } from "@/components/TicketPreview";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Ticket {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf?: string | null; // Made optional - not returned by public RPC for security
  boarding_point_name: string | null;
  boarding_point_address: string | null;
  boarding_time: string | null;
  trip_date: string;
  amount_paid: number | null;
  reservation_number: string | null;
  status: string;
  qr_token: string;
  tour_id: string;
  reserva_id: string;
}

interface ReservaPaymentInfo {
  valor_pago: number | null;
  valor_passeio: number | null;
  payment_method: string | null;
  installments: number | null;
  card_fee_amount: number | null;
  selected_optional_items: Array<{ name: string; quantity: number; price: number }> | null;
}

interface TourInfo {
  name: string;
  image_url: string | null;
}

interface TicketTemplate {
  id: string;
  cover_image_url: string | null;
  logo_url: string | null;
  background_color: string;
  text_color: string;
  accent_color: string;
  title_text: string;
  subtitle_text: string;
  rules_text: string;
  footer_text: string;
  show_qr_label: boolean;
  qr_label_text: string;
}

export default function TicketView() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [template, setTemplate] = useState<TicketTemplate | null>(null);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<ReservaPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (qrToken) {
      fetchTicket();
    }
  }, [qrToken]);

  const fetchTicket = async () => {
    try {
      // Use secure RPC function for public ticket lookup (no CPF exposed)
      const { data: ticketResults, error: ticketError } = await supabase
        .rpc('get_ticket_by_qr', { qr_token_param: qrToken });

      if (ticketError || !ticketResults || ticketResults.length === 0) {
        setError('Ticket não encontrado');
        return;
      }

      const ticketData = ticketResults[0];
      setTicket(ticketData);

      // Fetch tour name and image
      const { data: tourData } = await supabase
        .from('tours')
        .select('name, image_url')
        .eq('id', ticketData.tour_id)
        .single();

      if (tourData) {
        setTourInfo(tourData);
      }

      // Fetch reservation payment info
      if (ticketData.reserva_id) {
        const { data: reservaData } = await supabase
          .from('reservas')
          .select('valor_pago, valor_passeio, payment_method, installments, card_fee_amount, selected_optional_items')
          .eq('id', ticketData.reserva_id)
          .single();

        if (reservaData) {
          setPaymentInfo({
            valor_pago: reservaData.valor_pago,
            valor_passeio: reservaData.valor_passeio,
            payment_method: reservaData.payment_method,
            installments: reservaData.installments,
            card_fee_amount: reservaData.card_fee_amount,
            selected_optional_items: reservaData.selected_optional_items as Array<{ name: string; quantity: number; price: number }> | null
          });
        }
      }

      // Fetch template (tour-specific or default)
      const { data: tourTemplate } = await supabase
        .from('ticket_templates')
        .select('*')
        .eq('tour_id', ticketData.tour_id)
        .single();

      if (tourTemplate) {
        setTemplate(tourTemplate);
      } else {
        // Get default template
        const { data: defaultTemplate } = await supabase
          .from('ticket_templates')
          .select('*')
          .eq('is_default', true)
          .single();

        if (defaultTemplate) {
          setTemplate(defaultTemplate);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const ticketElement = document.getElementById('ticket-content');
      if (!ticketElement) {
        throw new Error('Elemento do ticket não encontrado');
      }

      const canvas = await html2canvas(ticketElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f1f5f9'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions
      const pdfWidth = 100; // Narrower for mobile-friendly ticket
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ingresso-${ticket?.ticket_number || 'download'}.pdf`);

      toast.success('Ingresso baixado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao baixar ingresso: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Ingresso - ${tourInfo?.name || 'Passeio'}`,
      text: `Meu ingresso para ${tourInfo?.name || 'o passeio'}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-slate-600">Carregando ingresso...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Ingresso Não Encontrado</h1>
          <p className="text-slate-500 text-sm">{error || 'Este ingresso não existe ou foi removido.'}</p>
        </div>
      </div>
    );
  }

  const ticketData = {
    ...ticket,
    tour_name: tourInfo?.name || '',
    tour_image_url: tourInfo?.image_url || undefined,
    amount_paid: paymentInfo?.valor_pago || ticket.amount_paid || undefined,
    valor_passeio: paymentInfo?.valor_passeio || undefined,
    payment_method: paymentInfo?.payment_method || undefined,
    installments: paymentInfo?.installments || undefined,
    card_fee_amount: paymentInfo?.card_fee_amount || undefined,
    selected_optional_items: paymentInfo?.selected_optional_items || undefined
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Status Banners */}
        {ticket.status === 'used' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Check-in Realizado ✓</p>
              <p className="text-sm text-green-600">Este ingresso já foi utilizado</p>
            </div>
          </div>
        )}

        {ticket.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800">Ingresso Cancelado</p>
              <p className="text-sm text-red-600">Este ingresso não é mais válido</p>
            </div>
          </div>
        )}

        {/* Ticket */}
        <div id="ticket-content">
          {template ? (
            <TicketPreview template={template} ticketData={ticketData} fullSize />
          ) : (
            <TicketPreview 
              template={{
                background_color: '#7C12D1',
                text_color: '#FFFFFF',
                accent_color: '#FFD700',
                title_text: '{{nome_passeio}}',
                subtitle_text: 'Ingresso Individual',
                rules_text: '',
                footer_text: 'Camaleão Ecoturismo',
                show_qr_label: true,
                qr_label_text: 'Apresente este QR Code no embarque'
              }} 
              ticketData={ticketData} 
              fullSize 
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="flex-1 gap-2 h-12 text-base font-semibold rounded-xl shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, hsl(270 100% 42%) 0%, hsl(280 90% 35%) 100%)'
            }}
          >
            {downloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            Baixar PDF
          </Button>
          
          <Button 
            onClick={handleShare}
            variant="outline"
            className="h-12 px-4 rounded-xl border-2"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-slate-400">
          Salve o PDF ou adicione esta página aos favoritos para acesso rápido no embarque
        </p>
      </div>
    </div>
  );
}
