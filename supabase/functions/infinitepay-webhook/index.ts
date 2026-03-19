import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * InfinitePay Webhook Handler
 * 
 * Receives payment confirmations from InfinitePay
 * Updates reservation status and generates tickets
 * 
 * Webhook payload example:
 * {
 *   "invoice_slug": "abc123",
 *   "amount": 1000,
 *   "paid_amount": 1010,
 *   "installments": 1,
 *   "capture_method": "credit_card" | "pix",
 *   "transaction_nsu": "UUID",
 *   "order_nsu": "UUID-do-pedido",
 *   "receipt_url": "https://comprovante.com/123",
 *   "items": [...]
 * }
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

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook body
    const body = await req.json();
    console.log('InfinitePay webhook received:', JSON.stringify(body, null, 2));

    const {
      invoice_slug,
      amount,
      paid_amount,
      installments,
      capture_method,
      transaction_nsu,
      order_nsu,
      receipt_url,
      items
    } = body;

    // order_nsu is our reserva_id
    const reservaId = order_nsu;

    if (!reservaId) {
      console.log('No order_nsu in webhook, cannot process');
      return new Response(JSON.stringify({ error: 'Missing order_nsu' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Fetch the reservation to validate - do this BEFORE idempotency check
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('id, order_nsu, valor_total_com_opcionais, tickets_generated, status, payment_status')
      .eq('id', reservaId)
      .single();

    if (reservaError || !reserva) {
      console.error('Reserva not found:', reservaId, reservaError);
      return new Response(JSON.stringify({ error: 'Reserva not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Idempotency check - only skip if ALREADY confirmed AND paid
    if (reserva.status === 'confirmada' && reserva.payment_status === 'pago') {
      console.log('Reserva already confirmed and paid, skipping:', reservaId);
      return new Response(JSON.stringify({ received: true, already_confirmed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // IMPORTANT: Process payment regardless of current status (even if expired)
    // When payment is confirmed, the reservation should ALWAYS be activated
    console.log(`Processing payment for reserva ${reservaId}, current status: ${reserva.status}/${reserva.payment_status} - will update to confirmed`);

    // Validate order_nsu matches (reserva was already fetched above)
    if (reserva.order_nsu && reserva.order_nsu !== order_nsu) {
      console.error('Order NSU mismatch:', reserva.order_nsu, '!=', order_nsu);
      return new Response(JSON.stringify({ error: 'Order NSU mismatch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Convert paid_amount from centavos to reais (for logging purposes)
    const paidAmountFromGateway = (paid_amount || amount || 0) / 100;
    
    // IMPORTANT: Use valor_total_com_opcionais from the reservation as the authoritative valor_pago
    // BUT cross-check: if gateway amount is higher, it means optionals weren't saved to reservation
    let valorPagoFinal = reserva.valor_total_com_opcionais || paidAmountFromGateway;
    
    // If gateway charged more than what reservation shows, check the creation log
    if (paidAmountFromGateway > valorPagoFinal) {
      console.log(`WARNING: Gateway amount (${paidAmountFromGateway}) > valor_total_com_opcionais (${valorPagoFinal}). Checking payment creation log...`);
      
      const { data: creationLog } = await supabase
        .from('payment_logs')
        .select('amount')
        .eq('reserva_id', reservaId)
        .eq('event_type', 'infinitepay_link_created')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (creationLog?.amount && creationLog.amount > valorPagoFinal) {
        console.log(`Using amount from link creation log: ${creationLog.amount}`);
        valorPagoFinal = creationLog.amount;
        
        // Fix valor_total_com_opcionais
        await supabase.from('reservas').update({ 
          valor_total_com_opcionais: creationLog.amount 
        }).eq('id', reservaId);
      } else {
        // Use gateway amount as it's the actual amount charged
        valorPagoFinal = paidAmountFromGateway;
      }
    }
    
    console.log(`valor_pago calculation: valor_total_com_opcionais=${reserva.valor_total_com_opcionais}, gateway=${paidAmountFromGateway}, final=${valorPagoFinal}`);

    // Update reservation with payment confirmation
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        status: 'confirmada',
        payment_status: 'pago',
        // Normalize payment method based on what InfinitePay actually captured
        payment_method: capture_method === 'credit_card' ? 'cartao' : 'pix',
        infinitepay_invoice_slug: invoice_slug,
        infinitepay_transaction_nsu: transaction_nsu,
        receipt_url: receipt_url,
        capture_method: capture_method,
        installments: installments || 1,
        valor_pago: valorPagoFinal,
        data_confirmacao: new Date().toISOString(),
        data_pagamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reservaId);

    if (updateError) {
      console.error('Error updating reserva:', updateError);
      throw updateError;
    }

    console.log(`Reserva ${reservaId} updated to 'confirmada'`);

    // Log the payment for audit trail
    await supabase.from('payment_logs').insert({
      reserva_id: reservaId,
      event_type: 'infinitepay_webhook_approved',
      event_status: 'approved',
      event_message: `Payment confirmed via ${capture_method}`,
      amount: valorPagoFinal,
      payment_method: capture_method === 'credit_card' ? 'cartao' : 'pix',
      raw_data: { ...body, valor_total_com_opcionais: reserva.valor_total_com_opcionais }
    });

    // Generate tickets (idempotent - check flag first)
    if (!reserva.tickets_generated) {
      console.log('Generating tickets for reservation');
      try {
        const { error: ticketError } = await supabase.rpc('create_tickets_for_reservation', {
          p_reserva_id: reservaId
        });

        if (ticketError) {
          console.error('Error generating tickets:', ticketError);
        } else {
          // Mark tickets as generated
          await supabase
            .from('reservas')
            .update({ tickets_generated: true })
            .eq('id', reservaId);
          console.log('Tickets generated successfully');
        }
      } catch (ticketGenError) {
        console.error('Failed to generate tickets:', ticketGenError);
      }
    } else {
      console.log('Tickets already generated for this reservation');
    }

    // Process loyalty points
    console.log('Processing loyalty points');
    try {
      const { error: loyaltyError } = await supabase.rpc('process_completed_tour', {
        p_reserva_id: reservaId
      });

      if (loyaltyError) {
        console.error('Error processing loyalty:', loyaltyError);
      }
    } catch (loyaltyErr) {
      console.error('Failed to process loyalty:', loyaltyErr);
    }

    // Send confirmation email
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
    }

    // Send admin notification email
    console.log('Sending admin notification email');
    try {
      const { data: reservaData } = await supabase
        .from('reservas')
        .select(`
          *,
          clientes:cliente_id (nome_completo, cpf, whatsapp, email),
          tours:tour_id (name, start_date),
          tour_boarding_points:ponto_embarque_id (nome)
        `)
        .eq('id', reservaId)
        .single();

      if (reservaData) {
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('pt-BR');
        };

        const formatCurrency = (value: number) => {
          return value.toFixed(2).replace('.', ',');
        };

        await fetch(`${supabaseUrl}/functions/v1/trigger-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            trigger_event: 'new_subscriber',
            to_email: 'contato@camaleaoecoturismo.com.br',
            data: {
              nome_participante: (reservaData.clientes as { nome_completo?: string })?.nome_completo || 'N/A',
              cpf: (reservaData.clientes as { cpf?: string })?.cpf || 'N/A',
              whatsapp: (reservaData.clientes as { whatsapp?: string })?.whatsapp || 'N/A',
              email: (reservaData.clientes as { email?: string })?.email || 'N/A',
              nome_passeio: (reservaData.tours as { name?: string })?.name || 'N/A',
              data_passeio: (reservaData.tours as { start_date?: string })?.start_date ? formatDate((reservaData.tours as { start_date: string }).start_date) : 'N/A',
              numero_participantes: reservaData.numero_participantes?.toString() || '1',
              ponto_embarque: (reservaData.tour_boarding_points as { nome?: string })?.nome || 'N/A',
              valor_pago: formatCurrency(valorPagoFinal),
              metodo_pagamento: capture_method === 'credit_card' ? 'Cartao de Credito' : 'PIX',
              reserva_numero: reservaData.reserva_numero || reservaId
            }
          })
        });
        console.log('Admin notification email sent');
      }
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    const elapsed = Date.now() - startTime;
    console.log(`Webhook processed successfully in ${elapsed}ms`);

    // Return 200 quickly to InfinitePay
    return new Response(
      JSON.stringify({ received: true, success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    // Return 400 so InfinitePay will retry
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
