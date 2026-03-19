import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReservationConfirmationRequest {
  reserva_id: string;
}

// Format date in Portuguese
function formatDatePT(dateStr: string): string {
  // Add T12:00:00 to avoid timezone issues that show previous day
  const date = new Date(dateStr + 'T12:00:00');
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Fetch PDF file from Supabase storage
async function fetchPdfFromStorage(supabase: any, pdfPath: string): Promise<string | null> {
  try {
    console.log(`Fetching PDF from storage: ${pdfPath}`);
    
    const { data, error } = await supabase.storage
      .from('tour-pdfs')
      .download(pdfPath);
    
    if (error) {
      console.error('Error downloading PDF:', error);
      return null;
    }
    
    const arrayBuffer = await data.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log(`PDF fetched successfully, size: ${base64.length} chars`);
    return base64;
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return null;
  }
}

// Generate real QR Code as data URL
async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    const url = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a placeholder if QR generation fails
    return '';
  }
}

// Fetch image and convert to base64 data URL for email embedding
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    
    console.log(`Fetching image for email embedding: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log(`Image fetched successfully, size: ${base64.length} chars, type: ${contentType}`);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    return null;
  }
}

// Generate ticket HTML from actual ticket data with real QR code
// This MUST match the TicketPreview component layout exactly
async function generateTicketHTML(ticket: any, tour: any, template: any, reserva: any): Promise<string> {
  const qrUrl = `https://camaleaoecoturismo.com.br/checkin/${ticket.qr_token}`;
  const qrCodeDataUrl = await generateQRCodeDataURL(qrUrl);
  
  const tripDate = formatDatePT(ticket.trip_date);
  const backgroundColor = template?.background_color || '#7C12D1';
  const textColor = template?.text_color || '#FFFFFF';
  const accentColor = template?.accent_color || '#FFD700';
  
  // Fetch tour image and convert to base64 for reliable email display
  const tourImageUrl = tour.image_url ? await fetchImageAsBase64(tour.image_url) : null;
  const logoUrl = template?.logo_url ? await fetchImageAsBase64(template.logo_url) : null;
  
  // Payment details from reserva
  const valorPago = reserva?.valor_pago || 0;
  const valorPasseio = reserva?.valor_passeio || 0;
  const paymentMethod = reserva?.payment_method || reserva?.capture_method || '';
  const installments = reserva?.installments || 1;
  const cardFeeAmount = reserva?.card_fee_amount || 0;
  const selectedOptionalItems = reserva?.selected_optional_items || [];
  
  // Format payment method
  let paymentMethodText = '';
  if (paymentMethod === 'pix') {
    paymentMethodText = 'PIX';
  } else if (paymentMethod === 'cartao' || paymentMethod === 'credit_card') {
    paymentMethodText = 'Cartão de Crédito';
    if (installments > 1) {
      paymentMethodText += ` (${installments}x)`;
    }
  } else if (paymentMethod) {
    paymentMethodText = paymentMethod;
  }
  
  // Generate optional items HTML
  let optionalItemsHtml = '';
  if (selectedOptionalItems && selectedOptionalItems.length > 0) {
    const items = selectedOptionalItems.filter((item: any) => item.quantity > 0);
    if (items.length > 0) {
      optionalItemsHtml = items.map((item: any) => 
        `<div style="margin-left: 8px;">• ${item.name} (${item.quantity}x) - ${formatCurrency(item.price * item.quantity)}</div>`
      ).join('');
    }
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
    }
    .ticket { 
      max-width: 600px; 
      margin: 0 auto; 
      background: ${backgroundColor}; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.2); 
      color: ${textColor};
    }
    .cover-image {
      position: relative;
      height: 200px;
      overflow: hidden;
    }
    .cover-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent 50%, ${backgroundColor} 100%);
    }
    .cover-logo {
      position: absolute;
      top: 16px;
      left: 16px;
      height: 48px;
      width: auto;
    }
    .header-no-cover { 
      background: ${accentColor}; 
      color: ${backgroundColor}; 
      padding: 24px; 
      text-align: center; 
    }
    .header-no-cover h1 { 
      font-size: 24px; 
    }
    .content { 
      padding: 24px; 
    }
    .title-section {
      text-align: center;
      margin-bottom: 20px;
    }
    .title-section h2 { 
      font-size: 24px; 
      font-weight: 700; 
      color: ${accentColor};
      margin-bottom: 4px;
    }
    .title-section p { 
      font-size: 14px; 
      opacity: 0.8; 
    }
    .main-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
    }
    .qr-section { 
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: white;
      border-radius: 12px;
    }
    .qr-code { 
      width: 140px; 
      height: 140px; 
    }
    .qr-label {
      font-size: 11px;
      color: #666;
      text-align: center;
      margin-top: 8px;
    }
    .details-section { 
      flex: 1;
      font-size: 14px;
    }
    .detail-item {
      margin-bottom: 12px;
    }
    .detail-label { 
      font-size: 11px; 
      opacity: 0.7; 
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .detail-value { 
      font-size: 15px; 
      font-weight: 600; 
    }
    .ticket-number-value {
      color: ${accentColor};
    }
    .seat-value {
      font-size: 20px;
      font-weight: 700;
      color: ${accentColor};
    }
    .divider { 
      border-top: 2px dashed rgba(255,255,255,0.3); 
      margin: 20px 0; 
    }
    .payment-section {
      font-size: 12px;
      margin-bottom: 16px;
    }
    .payment-title {
      font-size: 12px;
      font-weight: 600;
      color: ${accentColor};
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .payment-item {
      display: flex;
      justify-content: space-between;
    }
    .payment-item-full {
      grid-column: 1 / -1;
    }
    .payment-label {
      opacity: 0.7;
    }
    .payment-value {
      font-weight: 600;
    }
    .payment-total {
      font-weight: 700;
      color: ${accentColor};
    }
    .rules { 
      font-size: 11px; 
      opacity: 0.9; 
      line-height: 1.6;
    }
    .rules-title {
      font-size: 12px;
      font-weight: 600;
      color: ${accentColor};
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .footer { 
      text-align: center;
      font-size: 12px;
      opacity: 0.7;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .footer-order {
      margin-top: 4px;
    }
    .status-badge {
      display: inline-block;
      background: #10B981;
      color: white;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="ticket">
    ${tourImageUrl ? `
    <!-- Cover Image Section (same as TicketPreview) -->
    <div class="cover-image">
      <img src="${tourImageUrl}" alt="Capa do passeio"/>
      <div class="cover-gradient"></div>
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="cover-logo"/>` : ''}
    </div>
    ` : `
    <!-- Header without cover image -->
    <div class="header-no-cover">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 48px; margin-bottom: 12px;"/>` : '<span style="font-size: 32px;">🦎</span>'}
      <h1>CAMALEÃO ECOTURISMO</h1>
    </div>
    `}
    
    <div class="content">
      <!-- Title Section -->
      <div class="title-section">
        <h2>${tour.name}</h2>
        <p>${template?.subtitle_text || 'Ingresso Individual'}</p>
      </div>

      <!-- Main Grid: QR + Details (same layout as TicketPreview) -->
      <div class="main-grid">
        <div class="qr-section">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code"/>` : '<div style="width:140px;height:140px;display:flex;align-items:center;justify-content:center;color:#666;font-size:48px;">📱</div>'}
          ${template?.show_qr_label !== false ? `<p class="qr-label">${template?.qr_label_text || 'Apresente este QR Code no embarque'}</p>` : ''}
        </div>
        
        <div class="details-section">
          <div class="detail-item">
            <div class="detail-label">Participante</div>
            <div class="detail-value">${ticket.participant_name}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Data</div>
            <div class="detail-value">${tripDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Embarque</div>
            <div class="detail-value">${ticket.boarding_time || '05:30'}</div>
            <div style="font-size: 12px; opacity: 0.8;">${ticket.boarding_point_name || 'A confirmar'}</div>
          </div>
          ${ticket.seat_label ? `
          <div class="detail-item">
            <div class="detail-label">Poltrona</div>
            <div class="seat-value">${ticket.seat_label}</div>
          </div>
          ` : ''}
          <div class="detail-item">
            <div class="detail-label">Ingresso</div>
            <div class="detail-value ticket-number-value">${ticket.ticket_number}</div>
            <div class="status-badge">✓ PAGO</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Payment Details Section -->
      <div class="payment-section">
        <div class="payment-title">DETALHES DO PAGAMENTO</div>
        <div class="payment-grid">
          ${valorPasseio > 0 ? `
          <div class="payment-item">
            <span class="payment-label">Valor do passeio:</span>
            <span class="payment-value">${formatCurrency(valorPasseio)}</span>
          </div>
          ` : ''}
          ${optionalItemsHtml ? `
          <div class="payment-item payment-item-full">
            <span class="payment-label">Adicionais:</span>
          </div>
          <div class="payment-item-full" style="font-size: 11px;">
            ${optionalItemsHtml}
          </div>
          ` : ''}
          ${cardFeeAmount > 0 ? `
          <div class="payment-item">
            <span class="payment-label">Taxa do cartão:</span>
            <span class="payment-value">${formatCurrency(cardFeeAmount)}</span>
          </div>
          ` : ''}
          ${paymentMethodText ? `
          <div class="payment-item">
            <span class="payment-label">Forma:</span>
            <span class="payment-value">${paymentMethodText}</span>
          </div>
          ` : ''}
          <div class="payment-item">
            <span class="payment-label">Total pago:</span>
            <span class="payment-total">${formatCurrency(valorPago)}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Rules Section -->
      <div class="rules">
        <div class="rules-title">INFORMAÇÕES IMPORTANTES</div>
        ${template?.rules_text ? `<div>${template.rules_text}</div>` : `
        <ul style="padding-left: 16px;">
          <li>O ingresso é pessoal e intransferível.</li>
          <li>Apresente este ingresso no embarque (impresso ou digital).</li>
          <li>Chegue no horário especificado. Tolerância de 10 minutos.</li>
          <li>Para cancelamentos, consulte nossa política ou entre em contato.</li>
        </ul>
        <p style="margin-top: 12px; text-align: center;">Dúvidas? WhatsApp: (82) 99364-9454</p>
        `}
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>${template?.footer_text || 'Camaleão Ecoturismo - Sua aventura começa aqui!'}</p>
        <p class="footer-order">Pedido: ${ticket.reservation_number || '-'}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Replace template variables with support for conditional blocks
function replaceTemplateVariables(template: string, data: Record<string, string>): string {
  let result = template;
  
  // Handle conditional blocks: {{#variable}}...content...{{/variable}}
  // If variable is empty, remove the entire block including the content
  // If variable has a value, remove the tags but keep the content
  for (const [key, value] of Object.entries(data)) {
    const conditionalRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
    if (value && value.trim() !== '') {
      // Keep the content, remove the conditional tags
      result = result.replace(conditionalRegex, '$1');
    } else {
      // Remove the entire block including content
      result = result.replace(conditionalRegex, '');
    }
  }
  
  // Replace simple variables
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reserva_id }: ReservationConfirmationRequest = await req.json();
    
    if (!reserva_id) {
      console.error('Missing reserva_id');
      return new Response(
        JSON.stringify({ success: false, error: "reserva_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`=== SEND RESERVATION CONFIRMATION START ===`);
    console.log(`Processing confirmation email for reservation: ${reserva_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    console.log(`Supabase URL configured: ${!!supabaseUrl}`);
    console.log(`Supabase Key configured: ${!!supabaseKey}`);
    console.log(`Resend API Key configured: ${!!resendApiKey}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch reservation with related data
    console.log('Fetching reservation data...');
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select(`
        *,
        cliente:clientes!fk_reservas_cliente(*),
        tour:tours!fk_reservas_tour(*),
        ponto_embarque:tour_boarding_points!fk_reservas_ponto_embarque(*)
      `)
      .eq("id", reserva_id)
      .single();

    if (reservaError) {
      console.error("Error fetching reservation:", reservaError);
      return new Response(
        JSON.stringify({ success: false, error: "Reservation not found", details: reservaError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reserva) {
      console.error("Reservation not found");
      return new Response(
        JSON.stringify({ success: false, error: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Reservation found: ${reserva.reserva_numero || reserva_id.slice(0, 8)}`);
    console.log(`Client email: ${reserva.cliente?.email}`);
    console.log(`Tour: ${reserva.tour?.name}`);

    // Fetch email template from database using trigger_event
    console.log('Fetching email template for trigger: payment_approved');
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("trigger_event", "payment_approved")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Email template not found:", templateError);
      // Fallback to template_key search
      console.log('Trying fallback: template_key = reservation_confirmation');
      const { data: fallbackTemplate, error: fallbackError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_key", "reservation_confirmation")
        .eq("is_active", true)
        .single();
      
      if (fallbackError || !fallbackTemplate) {
        console.error("Fallback template also not found:", fallbackError);
        return new Response(
          JSON.stringify({ success: false, error: "Email template not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Using fallback template: ${fallbackTemplate.name}`);
      // Use the fallback template
      Object.assign(template || {}, fallbackTemplate);
    }

    console.log(`Using template: ${template?.name || 'reservation_confirmation'}`);

    // Prepare template variables
    const tourDate = formatDatePT(reserva.tour.start_date);
    const embarqueTime = reserva.ponto_embarque?.horario || '05:30';
    const embarqueNome = reserva.ponto_embarque?.nome || 'A confirmar';
    
    // Fetch participants to show individual details
    const { data: participants } = await supabase
      .from("reservation_participants")
      .select("*")
      .eq("reserva_id", reserva_id)
      .order("participant_index", { ascending: true });
    
    // Build detailed participant breakdown for email
    let participantDetailsHtml = '';
    let participantDetailsText = '';
    if (participants && participants.length > 0) {
      participantDetailsHtml = '<table style="width:100%; border-collapse:collapse; margin:16px 0;">';
      participantDetailsHtml += '<tr style="background:#f5f5f5;"><th style="padding:8px; text-align:left; border:1px solid #ddd;">Participante</th><th style="padding:8px; text-align:left; border:1px solid #ddd;">Pacote</th><th style="padding:8px; text-align:left; border:1px solid #ddd;">Opcionais</th><th style="padding:8px; text-align:right; border:1px solid #ddd;">Valor</th></tr>';
      
      for (const p of participants) {
        if (!p.nome_completo) continue;
        
        // Get package price
        let packagePrice = 0;
        if (p.pricing_option_id) {
          const { data: priceOpt } = await supabase
            .from("tour_pricing_options")
            .select("pix_price")
            .eq("id", p.pricing_option_id)
            .single();
          packagePrice = priceOpt?.pix_price || 0;
        }
        
        // Get participant's optionals
        let optionalsTotal = 0;
        let optionalsList: string[] = [];
        if (p.selected_optionals && Array.isArray(p.selected_optionals)) {
          p.selected_optionals.forEach((opt: any) => {
            const qty = opt.quantity || 1;
            const price = opt.price || 0;
            optionalsTotal += price * qty;
            optionalsList.push(qty > 1 ? `${opt.name} (x${qty})` : opt.name);
          });
        }
        
        const participantTotal = packagePrice + optionalsTotal;
        const optionalsStr = optionalsList.length > 0 ? optionalsList.join(', ') : '-';
        
        participantDetailsHtml += `<tr>`;
        participantDetailsHtml += `<td style="padding:8px; border:1px solid #ddd;">${p.nome_completo}</td>`;
        participantDetailsHtml += `<td style="padding:8px; border:1px solid #ddd;">${p.pricing_option_name || '-'}</td>`;
        participantDetailsHtml += `<td style="padding:8px; border:1px solid #ddd;">${optionalsStr}</td>`;
        participantDetailsHtml += `<td style="padding:8px; border:1px solid #ddd; text-align:right;">${formatCurrency(participantTotal)}</td>`;
        participantDetailsHtml += `</tr>`;
        
        participantDetailsText += `• ${p.nome_completo}: ${p.pricing_option_name || 'Pacote'}`;
        if (optionalsList.length > 0) {
          participantDetailsText += ` + ${optionalsList.join(', ')}`;
        }
        participantDetailsText += ` = ${formatCurrency(participantTotal)}\n`;
      }
      participantDetailsHtml += '</table>';
    }
    
    let optionalItemsText = '';
    if (reserva.selected_optional_items && Array.isArray(reserva.selected_optional_items)) {
      const items = reserva.selected_optional_items.filter((item: any) => item.quantity > 0);
      if (items.length > 0) {
        optionalItemsText = items.map((i: any) => `${i.name} (${i.quantity}x)`).join(', ');
      }
    }

    // Map template variables to match both old format and new template format
    const valorPagoFormatted = formatCurrency(reserva.valor_pago || 0);
    const valorPagoNumber = (reserva.valor_pago || 0).toFixed(2).replace('.', ',');
    
    // Fetch the first ticket for this reservation to get a valid qr_token for download link
    console.log('Fetching ticket for download link...');
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("qr_token")
      .eq("reserva_id", reserva_id)
      .eq("status", "active")
      .limit(1)
      .single();
    
    // Generate ticket download link using the ticket's qr_token
    const ticketQrToken = ticketData?.qr_token;
    const ticketDownloadLink = ticketQrToken 
      ? `https://agendadacamaleao.lovable.app/ticket/${ticketQrToken}`
      : `https://agendadacamaleao.lovable.app/pagamento-sucesso?reserva=${reserva_id}`;
    
    console.log(`Ticket download link: ${ticketDownloadLink}`);
    
    // Generate itinerary/roteiro link - if tour has a PDF, use storage URL; otherwise use tour page
    let roteiroLink = '';
    if (reserva.tour.pdf_roteiro_path) {
      // Get public URL for the PDF from storage
      const { data: pdfData } = supabase.storage.from('tour-pdfs').getPublicUrl(reserva.tour.pdf_roteiro_path);
      roteiroLink = pdfData?.publicUrl || '';
    }
    // If no PDF, link to tour page (if available)
    if (!roteiroLink && reserva.tour.slug) {
      roteiroLink = `https://camaleaoecoturismo.com.br/passeio/${reserva.tour.slug}`;
    }
    
    // Cancellation policy link
    const politicaCancelamentoLink = 'https://agenda.camaleaoecoturismo.com/cancelamento';
    
    const templateData: Record<string, string> = {
      // New template format variables (used in admin templates)
      'nome': reserva.cliente.nome_completo.split(' ')[0],
      'tour_nome': reserva.tour.name,
      'tour_data': tourDate,
      'ponto_embarque': embarqueNome,
      'num_participantes': String(reserva.numero_participantes || 1),
      'valor_pago': valorPagoNumber,
      'reserva_numero': reserva.reserva_numero || reserva_id.slice(0, 8).toUpperCase(),
      'link_ingresso': ticketDownloadLink,
      'link_roteiro': roteiroLink,
      'link_politica_cancelamento': politicaCancelamentoLink,
      // Participant details - shows each participant with their package + optionals + individual total
      'detalhes_participantes': participantDetailsHtml,
      'detalhes_participantes_texto': participantDetailsText,
      // Legacy variables for backwards compatibility
      'nome_cliente': reserva.cliente.nome_completo,
      'primeiro_nome': reserva.cliente.nome_completo.split(' ')[0],
      'nome_passeio': reserva.tour.name,
      'data_passeio': tourDate,
      'horario_embarque': embarqueTime,
      'local_embarque': embarqueNome,
      'numero_reserva': reserva.reserva_numero || reserva_id.slice(0, 8).toUpperCase(),
      'itens_opcionais': optionalItemsText || 'Nenhum',
      'cidade': reserva.tour.city,
      'estado': reserva.tour.state,
      'email_cliente': reserva.cliente.email,
      'whatsapp_cliente': reserva.cliente.whatsapp,
    };

    // Replace variables in subject and body
    const emailSubject = template?.subject 
      ? replaceTemplateVariables(template.subject, templateData)
      : `Reserva Confirmada - ${reserva.tour.name}`;
    
    const emailBody = template?.body_html 
      ? replaceTemplateVariables(template.body_html, templateData)
      : `<p>Olá ${reserva.cliente.nome_completo}, sua reserva foi confirmada!</p>`;

    // Send email WITHOUT attachments - tickets are accessed via link
    console.log(`Sending email to: ${reserva.cliente.email}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Ticket download link: ${templateData['link_ingresso']}`);
    
    const result = await resend.emails.send({
      from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
      to: [reserva.cliente.email],
      subject: emailSubject,
      html: emailBody
      // No attachments - user downloads ticket via link
    });

    console.log("Resend response:", JSON.stringify(result, null, 2));

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update reservation to mark ticket as sent
    console.log('Updating reservation ticket_enviado = true');
    const { error: updateReservaError } = await supabase
      .from("reservas")
      .update({ ticket_enviado: true })
      .eq("id", reserva_id);

    if (updateReservaError) {
      console.error('Error updating reservation:', updateReservaError);
    }

    // Update template send count and last_sent_at
    if (template?.id) {
      await supabase
        .from("email_templates")
        .update({ 
          send_count: (template.send_count || 0) + 1,
          last_sent_at: new Date().toISOString()
        })
        .eq("id", template.id);
    }

    console.log("=== CONFIRMATION EMAIL SENT SUCCESSFULLY ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent",
        email_id: result.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== ERROR IN SEND-RESERVATION-CONFIRMATION ===");
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
