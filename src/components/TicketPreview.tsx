import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import logoCamaleao from '@/assets/logo-camaleao.png';
interface TicketTemplate {
  id?: string;
  cover_image_url?: string | null;
  logo_url?: string | null;
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  title_text?: string;
  subtitle_text?: string;
  rules_text?: string;
  footer_text?: string;
  show_qr_label?: boolean;
  qr_label_text?: string;
  // New fields
  website_text?: string;
  phone_text?: string;
  instagram_text?: string;
  price_label?: string;
  passenger_label?: string;
  boarding_label?: string;
  ticket_number_label?: string;
  attention_title?: string;
  attention_items?: string;
  divider_color?: string;
  header_gradient_start?: string;
  header_gradient_end?: string;
}
interface TicketData {
  ticket_number?: string;
  participant_name?: string;
  participant_cpf?: string;
  boarding_point_name?: string;
  boarding_point_address?: string;
  boarding_time?: string;
  trip_date?: string;
  amount_paid?: number;
  reservation_number?: string;
  tour_name?: string;
  qr_token?: string;
  status?: string;
  seat_label?: string;
  tour_image_url?: string;
  payment_method?: string;
  installments?: number;
  card_fee_amount?: number;
  valor_passeio?: number;
  selected_optional_items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}
interface TicketPreviewProps {
  template: TicketTemplate;
  ticketData?: TicketData;
  fullSize?: boolean;
}

// Default values
const defaults = {
  website_text: 'camaleaoecoturismo.com.br',
  phone_text: '(82) 99364-9454',
  instagram_text: '@camaleaoecoturismo',
  price_label: 'Tipo de ingresso',
  passenger_label: 'Passageiro',
  boarding_label: 'Embarque',
  ticket_number_label: 'Nº do ingresso',
  attention_title: 'ATENÇÃO:',
  attention_items: '<ul><li>Chegue com 15 minutos de antecedência ao ponto de embarque</li><li>Tolerância máxima de 10 minutos para saída do ônibus</li><li>Não nos responsabilizamos por atrasos</li><li>Leve documento com foto</li><li>Use roupas e calçados confortáveis</li><li>Leve protetor solar e repelente</li><li>Não é permitido o consumo de bebidas alcoólicas durante o trajeto</li></ul>',
  divider_color: '#F59E0B',
  header_gradient_start: '#7C12D1',
  header_gradient_end: '#6309A8',
  text_color: '#FFFFFF'
};
export function TicketPreview({
  template,
  ticketData,
  fullSize = false
}: TicketPreviewProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Merge template with defaults
  const t = {
    ...defaults,
    ...template
  };
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = ticketData?.qr_token ? `${window.location.origin}/checkin/${ticketData.qr_token}` : 'https://camaleaoecoturismo.com.br/checkin/EXEMPLO';
        const url = await QRCode.toDataURL(qrData, {
          width: 140,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };
    generateQR();
  }, [ticketData?.qr_token]);
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '15 de janeiro de 2025';
    // Add T12:00:00 to avoid timezone issues that show previous day
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  const data = ticketData || {
    participant_name: 'João Silva',
    tour_name: 'Trilha do Cacau',
    trip_date: '2025-01-15',
    boarding_time: '06:00',
    boarding_point_name: 'Shopping Center Recife',
    boarding_point_address: 'Av. República do Líbano, 251',
    amount_paid: 150,
    reservation_number: 'RES20250115-0001',
    ticket_number: 'TKT20250115-00001',
    status: 'active'
  };
  const handleCopyTicketCode = async () => {
    if (data.ticket_number) {
      await navigator.clipboard.writeText(data.ticket_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const getPaymentTypeLabel = () => {
    if (!ticketData?.payment_method) return '';
    if (ticketData.payment_method === 'pix') {
      return 'PIX';
    } else if (ticketData.payment_method === 'cartao' || ticketData.payment_method === 'credit_card') {
      return 'CARTÃO';
    }
    return ticketData.payment_method.toUpperCase();
  };
  const getPriceLabel = () => {
    const paymentType = getPaymentTypeLabel();
    const amount = formatCurrency(ticketData?.amount_paid || data.amount_paid);
    if (paymentType) {
      return `${paymentType} – ${amount}`;
    }
    return amount;
  };

  // Use tour cover image, or template cover if set
  const coverImage = ticketData?.tour_image_url || t.cover_image_url;

  // Use template logo or default
  const logoUrl = t.logo_url || logoCamaleao;

  // Sanitize HTML content for safe rendering
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'],
      ALLOWED_ATTR: []
    });
  };
  return <div className="w-full max-w-lg mx-auto" style={{
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  }}>
      {/* Main Ticket Card */}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        
        {/* Header with Cover Image and QR Code */}
        <div className="relative">
          {/* Cover Image with Gradient Overlay - Only if has image */}
          {coverImage ? <div className="relative h-44 overflow-hidden">
              <img src={coverImage} alt={data.tour_name} className="w-full h-full object-cover" />
              
              {/* Gradient Overlay - Left Side */}
              <div className="absolute inset-0" style={{
            background: `linear-gradient(90deg, ${t.header_gradient_start}F2 0%, ${t.header_gradient_start}D9 40%, ${t.header_gradient_start}66 70%, transparent 100%)`
          }} />

              {/* Logo in Top Left */}
              <div className="absolute top-3 left-3">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
              </div>

              {/* Tour Name - Left Side */}
              <div className="absolute bottom-3 left-3 right-32 pr-2">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-lg" style={{
              color: t.text_color
            }}>
                  {data.tour_name || 'Nome do Passeio'}
                </h1>
              </div>

              {/* QR Code - Right Side */}
              <div className="absolute top-3 right-3 bottom-3 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-lg">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code para check-in" className="w-24 h-24 sm:w-28 sm:h-28" />}
                </div>
              </div>
            </div> : (/* Header without image - just gradient background */
        <div className="relative h-36 overflow-hidden" style={{
          background: `linear-gradient(135deg, ${t.header_gradient_start} 0%, ${t.header_gradient_end} 100%)`
        }}>
              {/* Logo in Top Left */}
              <div className="absolute top-3 left-3">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
              </div>

              {/* Tour Name - Left Side */}
              <div className="absolute bottom-3 left-3 right-32 pr-2">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-lg" style={{
              color: t.text_color
            }}>
                  {data.tour_name || 'Nome do Passeio'}
                </h1>
              </div>

              {/* QR Code - Right Side */}
              <div className="absolute top-3 right-3 bottom-3 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-lg">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code para check-in" className="w-24 h-24 sm:w-28 sm:h-28" />}
                </div>
              </div>
            </div>)}

          {/* Info Section Below Image */}
          <div className="px-3 py-2" style={{
          background: `linear-gradient(135deg, ${t.header_gradient_start} 0%, ${t.header_gradient_end} 100%)`
        }}>
            {/* Price and Type + Purchased By */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{
                color: `${t.text_color}B3`
              }}>
                  {t.price_label}
                </p>
                <p className="text-xs font-medium" style={{
                color: t.text_color
              }}>
                  {getPriceLabel()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{
                color: `${t.text_color}B3`
              }}>
                  {t.passenger_label}
                </p>
                <p className="text-xs font-medium" style={{
                color: t.text_color
              }}>
                  {data.participant_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="px-3 py-3 bg-white">
          <div className="grid grid-cols-2 gap-3">
            {/* Horário e local */}
            <div>
              <p className="text-primary font-bold text-[10px] uppercase tracking-wide mb-0.5">
                {t.boarding_label}
              </p>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {formatDate(data.trip_date)} às {data.boarding_time || '06:00'}
              </p>
              <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">
                {data.boarding_point_name}
                {data.boarding_point_address && ` - ${data.boarding_point_address}`}
              </p>
            </div>

            {/* N.° do pedido e ingresso */}
            <div className="text-right">
              <p className="text-primary font-bold text-[10px] uppercase tracking-wide mb-0.5">
                {t.ticket_number_label}
              </p>
              <div className="flex items-center justify-end gap-1">
                <p className="text-slate-700 text-[11px] font-mono">{data.ticket_number?.slice(-12) || 'N/A'}</p>
                <button onClick={handleCopyTicketCode} className="p-0.5 hover:bg-slate-100 rounded transition-colors flex-shrink-0" title="Copiar código">
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
              <p className="text-slate-500 text-[10px] mt-1">Pedido: {data.reservation_number?.slice(-8) || 'N/A'}</p>
            </div>
          </div>

          {/* Seat Label if available */}
          {ticketData?.seat_label && <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-full">
                <span className="text-primary font-bold text-[10px] uppercase">Poltrona:</span>
                <span className="text-primary font-bold text-sm">{ticketData.seat_label}</span>
              </div>
            </div>}
        </div>

        {/* Divider Line */}
        <div className="h-0.5" style={{
        backgroundColor: t.divider_color
      }} />

        {/* Important Information Section */}
        <div className="px-3 py-3 bg-white">
          <p className="font-semibold text-slate-700 text-[11px] mb-2">{t.attention_title}</p>
          <div className="ticket-content text-slate-600 text-[10px] leading-relaxed" dangerouslySetInnerHTML={{
          __html: sanitizeHtml(t.attention_items || '')
        }} />

          {t.rules_text && <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="ticket-content text-slate-600 text-[10px] leading-relaxed" dangerouslySetInnerHTML={{
            __html: sanitizeHtml(t.rules_text)
          }} />
            </div>}
        </div>

        {/* Footer with Contact Info */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            
            <span className="text-slate-300">|</span>
            <span className="text-[10px] text-slate-500">{t.website_text}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] text-slate-500">{t.phone_text}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] text-slate-500">{t.instagram_text}</span>
          </div>
        </div>
      </div>
    </div>;
}