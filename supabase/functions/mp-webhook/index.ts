import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Mercado Pago Webhook Handler
 * 
 * This endpoint receives payment notifications from Mercado Pago.
 * 
 * Webhook URL: https://[project-id].supabase.co/functions/v1/mp-webhook
 * 
 * Handled notification types:
 * - payment.created: New payment created
 * - payment.updated: Payment status changed
 * 
 * Status mapping:
 * - approved -> payment_status: 'pago', status: 'confirmada'
 * - pending/in_process/authorized -> payment_status: 'aguardando', status: 'pendente'
 * - rejected -> payment_status: 'rejeitado', status: 'pendente'
 * - cancelled/refunded/charged_back -> payment_status: 'cancelado', status: 'cancelada'
 * 
 * Idempotency: Uses payment_logs table to prevent duplicate processing
 * 
 * Documentation: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate Mercado Pago webhook HMAC-SHA256 signature
  // Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
  const mpWebhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
  if (mpWebhookSecret) {
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    if (!xSignature) {
      console.error('Missing x-signature header from Mercado Pago');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Parse x-signature: "ts=TIMESTAMP,v1=HASH"
    const sigParts: Record<string, string> = {};
    for (const part of xSignature.split(',')) {
      const [k, v] = part.split('=');
      if (k && v) sigParts[k.trim()] = v.trim();
    }
    const ts = sigParts['ts'];
    const v1 = sigParts['v1'];

    if (!ts || !v1) {
      console.error('Invalid x-signature format');
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';

    // Build manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const manifestParts: string[] = [];
    if (dataId) manifestParts.push(`id:${dataId}`);
    if (xRequestId) manifestParts.push(`request-id:${xRequestId}`);
    manifestParts.push(`ts:${ts}`);
    const manifest = manifestParts.join(';') + ';';

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(mpWebhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(manifest));
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash !== v1) {
      console.error('Invalid Mercado Pago webhook signature. Expected:', computedHash, 'Got:', v1);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the webhook data
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Mercado Pago sends different notification types
    if (body.type === 'payment' || body.action === 'payment.created' || body.action === 'payment.updated') {
      const paymentId = body.data?.id;
      
      if (!paymentId) {
        console.log('No payment ID in webhook, ignoring');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Idempotency check: Verify if this payment update was already processed
      const { data: existingLog } = await supabase
        .from('payment_logs')
        .select('id')
        .eq('mp_payment_id', paymentId.toString())
        .eq('event_type', `webhook_${body.action || body.type}`)
        .single();

      if (existingLog) {
        console.log('Webhook already processed for payment:', paymentId);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      console.log('Fetching payment details for:', paymentId);

      // Fetch payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Error fetching payment:', errorText);
        throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
      }

      const payment = await paymentResponse.json();
      console.log('Payment details:', JSON.stringify(payment, null, 2));

      // Get reserva_id from external_reference OR metadata (fallback for older payments)
      const reservaId = payment.external_reference || payment.metadata?.reserva_id;
      const status = payment.status; // approved, pending, rejected, cancelled, etc.
      const statusDetail = payment.status_detail;

      if (!reservaId) {
        console.log('No reserva_id found in external_reference or metadata, ignoring');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      console.log(`Updating reserva ${reservaId} with status ${status}`);

      // Map MP status to our status - MUST be consistent across all functions
      let paymentStatus = 'pendente';
      let reservaStatus = 'pendente';

      if (status === 'approved') {
        paymentStatus = 'pago';
        reservaStatus = 'confirmada';
      } else if (status === 'pending' || status === 'in_process' || status === 'authorized') {
        paymentStatus = 'aguardando';
        reservaStatus = 'pendente';
      } else if (status === 'rejected') {
        paymentStatus = 'rejeitado';
        reservaStatus = 'pendente';
      } else if (status === 'cancelled' || status === 'refunded' || status === 'charged_back') {
        paymentStatus = 'cancelado';
        reservaStatus = 'cancelada';
      }

      console.log(`Mapping MP status '${status}' to payment_status='${paymentStatus}', reserva_status='${reservaStatus}'`);

      // Update the reservation
      const updateData: any = {
        mp_payment_id: paymentId.toString(),
        mp_status: status,
        payment_status: paymentStatus,
        status: reservaStatus,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.data_confirmacao = new Date().toISOString();
        updateData.data_pagamento = new Date().toISOString();
        updateData.valor_pago = payment.transaction_amount;
        updateData.payment_method = payment.payment_type_id === 'credit_card' ? 'cartao' : 'pix';
        updateData.installments = payment.installments || 1;
      } else if (status === 'rejected') {
        // Log rejection details for debugging
        console.log(`Payment rejected - status_detail: ${statusDetail}`);
      } else if (status === 'cancelled' || status === 'refunded' || status === 'charged_back') {
        updateData.data_cancelamento = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('reservas')
        .update(updateData)
        .eq('id', reservaId);

      if (updateError) {
        console.error('Error updating reserva:', updateError);
        throw updateError;
      }

      console.log(`Reserva ${reservaId} updated successfully with payment_status=${paymentStatus}`);

      // Log to payment_logs for audit trail and idempotency
      try {
        // Determine event type to match process-mp-payment format
        let eventType = 'payment_pending';
        if (status === 'approved') {
          eventType = 'payment_approved';
        } else if (status === 'rejected') {
          eventType = 'payment_rejected';
        } else if (status === 'cancelled' || status === 'refunded' || status === 'charged_back') {
          eventType = 'payment_cancelled';
        }

        // Determine payment method - PIX can be 'pix' or 'bank_transfer' in MP API
        const paymentMethod = (payment.payment_type_id === 'credit_card' || payment.payment_type_id === 'debit_card') ? 'cartao' : 'pix';

        await supabase.from('payment_logs').insert({
          reserva_id: reservaId,
          event_type: eventType,
          event_status: status,
          event_message: statusDetail || `Payment ${status}`,
          mp_payment_id: paymentId.toString(),
          amount: payment.transaction_amount,
          payment_method: paymentMethod,
          raw_data: { 
            mp_status: status, 
            status_detail: statusDetail, 
            webhook_action: body.action || body.type,
            webhook_id: body.id
          }
        });
        console.log('Payment log created successfully with event_type:', eventType, 'payment_method:', paymentMethod);
      } catch (logError) {
        console.error('Error creating payment log:', logError);
      }

      // If approved, process loyalty points and send confirmation email
      if (status === 'approved') {
        console.log('Processing loyalty points for approved payment');
        const { error: loyaltyError } = await supabase.rpc('process_completed_tour', {
          p_reserva_id: reservaId
        });

        if (loyaltyError) {
          console.error('Error processing loyalty:', loyaltyError);
          // Don't throw, just log - payment was successful
        }

        // Generate tickets for the reservation
        console.log('Generating tickets for reservation');
        try {
          const { error: ticketError } = await supabase.rpc('create_tickets_for_reservation', {
            p_reserva_id: reservaId
          });

          if (ticketError) {
            console.error('Error generating tickets:', ticketError);
          } else {
            console.log('Tickets generated successfully');
          }
        } catch (ticketGenError) {
          console.error('Failed to generate tickets:', ticketGenError);
        }

        // Send confirmation email with ticket
        console.log('Sending confirmation email');
        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ reserva_id: reservaId })
          });
          
          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Error sending confirmation email:', errorText);
          } else {
            console.log('Confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't throw - email failure shouldn't affect payment confirmation
        }

        // Send admin notification email for new subscriber
        console.log('Sending admin notification email');
        try {
          // Fetch complete reservation data for the notification
          const { data: reservaData, error: reservaError } = await supabase
            .from('reservas')
            .select(`
              *,
              clientes:cliente_id (nome_completo, cpf, whatsapp, email),
              tours:tour_id (name, start_date),
              tour_boarding_points:ponto_embarque_id (nome)
            `)
            .eq('id', reservaId)
            .single();

          if (reservaError || !reservaData) {
            console.error('Error fetching reserva data for admin notification:', reservaError);
          } else {
            const formatDate = (dateStr: string) => {
              const date = new Date(dateStr);
              return date.toLocaleDateString('pt-BR');
            };

            const formatCurrency = (value: number) => {
              return value.toFixed(2).replace('.', ',');
            };

            const adminNotificationResponse = await fetch(`${supabaseUrl}/functions/v1/trigger-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                trigger_event: 'new_subscriber',
                to_email: 'contato@camaleaoecoturismo.com.br',
                data: {
                  nome_participante: reservaData.clientes?.nome_completo || 'N/A',
                  cpf: reservaData.clientes?.cpf || 'N/A',
                  whatsapp: reservaData.clientes?.whatsapp || 'N/A',
                  email: reservaData.clientes?.email || 'N/A',
                  nome_passeio: reservaData.tours?.name || 'N/A',
                  data_passeio: reservaData.tours?.start_date ? formatDate(reservaData.tours.start_date) : 'N/A',
                  numero_participantes: reservaData.numero_participantes?.toString() || '1',
                  ponto_embarque: reservaData.tour_boarding_points?.nome || 'N/A',
                  valor_pago: formatCurrency(reservaData.valor_pago || payment.transaction_amount || 0),
                  metodo_pagamento: payment.payment_type_id === 'credit_card' ? 'Cartão de Crédito' : 'PIX',
                  reserva_numero: reservaData.reserva_numero || reservaId
                }
              })
            });

            if (!adminNotificationResponse.ok) {
              const errorText = await adminNotificationResponse.text();
              console.error('Error sending admin notification email:', errorText);
            } else {
              console.log('Admin notification email sent successfully');
            }
          }
        } catch (adminEmailError) {
          console.error('Failed to send admin notification email:', adminEmailError);
          // Don't throw - email failure shouldn't affect payment confirmation
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Always return 200 to MP to avoid retries for our errors
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
