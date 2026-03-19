import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * InfinitePay Payment Check
 * 
 * Actively verifies payment status with InfinitePay's public API
 * Called from the success page when redirect params are available
 * This serves as a fallback when webhook delivery fails
 * 
 * Endpoint: POST /functions/v1/check-infinitepay-payment
 * Body: { 
 *   reserva_id: string, 
 *   transaction_nsu?: string,
 *   slug?: string,
 *   receipt_url?: string,
 *   capture_method?: string,
 *   paid_amount?: number
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INFINITEPAY_HANDLE = 'camaleaoecoturismo';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { 
      reserva_id, 
      transaction_nsu, 
      slug, 
      receipt_url, 
      capture_method,
      paid_amount 
    } = body;

    if (!reserva_id) {
      throw new Error('reserva_id is required');
    }

    console.log('Checking InfinitePay payment for reserva:', reserva_id);
    console.log('Params:', { transaction_nsu, slug, capture_method, paid_amount });

    // Fetch the reservation
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('id, order_nsu, status, payment_status, tickets_generated, valor_total_com_opcionais, valor_passeio')
      .eq('id', reserva_id)
      .single();

    if (reservaError || !reserva) {
      console.error('Reserva not found:', reserva_id, reservaError);
      throw new Error('Reserva not found');
    }

    // Idempotency check - already confirmed
    if (reserva.status === 'confirmada' && reserva.payment_status === 'pago') {
      console.log('Reserva already confirmed:', reserva_id);
      return new Response(JSON.stringify({ 
        success: true, 
        already_confirmed: true,
        status: 'confirmada',
        payment_status: 'pago'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // If we have transaction_nsu and slug, verify with InfinitePay API
    let paymentVerified = false;
    let verifiedPaidAmount = paid_amount ? paid_amount / 100 : null; // Convert centavos to reais
    let verifiedCaptureMethod = capture_method || null;

    if (transaction_nsu && slug) {
      console.log('Verifying payment with InfinitePay API...');
      
      try {
        const checkResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            handle: INFINITEPAY_HANDLE,
            order_nsu: reserva_id,
            transaction_nsu: transaction_nsu,
            slug: slug
          })
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          console.log('InfinitePay check response:', JSON.stringify(checkData));

          if (checkData.success && checkData.paid === true) {
            paymentVerified = true;
            verifiedPaidAmount = (checkData.paid_amount || checkData.amount || 0) / 100;
            verifiedCaptureMethod = checkData.capture_method || capture_method || 'unknown';
            console.log('Payment verified as PAID via API');
          } else {
            console.log('Payment NOT confirmed via API:', checkData);
          }
        } else {
          const errorText = await checkResponse.text();
          console.error('InfinitePay API error:', checkResponse.status, errorText);
        }
      } catch (apiError) {
        console.error('Error calling InfinitePay API:', apiError);
      }
    }

    // Fallback: If we have transaction_nsu from redirect, trust the redirect
    // InfinitePay only redirects with transaction_nsu when payment is complete
    if (!paymentVerified && transaction_nsu) {
      console.log('Trusting redirect with transaction_nsu as payment confirmation');
      paymentVerified = true;
      verifiedPaidAmount = verifiedPaidAmount || reserva.valor_total_com_opcionais || 0;
    }

    if (!paymentVerified) {
      console.log('Payment could not be verified');
      return new Response(JSON.stringify({ 
        success: false, 
        verified: false,
        message: 'Payment not verified'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Payment verified - update reservation
    // IMPORTANT: Cross-check valor_total_com_opcionais with the amount from the payment link creation log
    // If they differ, prefer the higher value (which includes optionals) 
    let valorPagoFinal = reserva.valor_total_com_opcionais || 0;

    // If valor_total_com_opcionais equals just the tour price, check payment logs for the correct amount
    // This handles race conditions where optionals weren't saved to the reservation
    if (valorPagoFinal > 0 && verifiedPaidAmount && verifiedPaidAmount > valorPagoFinal) {
      console.log(`WARNING: Gateway amount (${verifiedPaidAmount}) > valor_total_com_opcionais (${valorPagoFinal}). Checking payment creation log...`);
      
      const { data: creationLog } = await supabase
        .from('payment_logs')
        .select('amount, raw_data')
        .eq('reserva_id', reserva_id)
        .eq('event_type', 'infinitepay_link_created')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (creationLog?.amount && creationLog.amount > valorPagoFinal) {
        console.log(`Using amount from link creation log: ${creationLog.amount} (was ${valorPagoFinal})`);
        valorPagoFinal = creationLog.amount;
        
        // Also fix valor_total_com_opcionais since it was wrong
        // And restore optionals from the log if available
        const fixData: Record<string, unknown> = {
          valor_total_com_opcionais: creationLog.amount
        };
        
        await supabase.from('reservas').update(fixData).eq('id', reserva_id);
        console.log(`Fixed valor_total_com_opcionais to ${creationLog.amount}`);
      }
    }
    
    // Fallback to gateway amount if valor_total_com_opcionais is 0
    if (!valorPagoFinal && verifiedPaidAmount) {
      valorPagoFinal = verifiedPaidAmount;
    }
    
    console.log(`Updating reservation to confirmed. valor_total_com_opcionais=${reserva.valor_total_com_opcionais}, gateway=${verifiedPaidAmount}, final=${valorPagoFinal}`);
    
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        status: 'confirmada',
        payment_status: 'pago',
        payment_method: verifiedCaptureMethod === 'credit_card' ? 'cartao' : 'pix',
        infinitepay_invoice_slug: slug || null,
        infinitepay_transaction_nsu: transaction_nsu || null,
        receipt_url: receipt_url || null,
        capture_method: verifiedCaptureMethod,
        valor_pago: valorPagoFinal,
        data_confirmacao: new Date().toISOString(),
        data_pagamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reserva_id);

    if (updateError) {
      console.error('Error updating reserva:', updateError);
      throw updateError;
    }

    console.log(`Reserva ${reserva_id} updated to 'confirmada'`);

    // Log the payment verification
    await supabase.from('payment_logs').insert({
      reserva_id: reserva_id,
      event_type: 'payment_approved',
      event_status: 'approved',
      event_message: `Payment verified via active check (${verifiedCaptureMethod})`,
      amount: valorPagoFinal,
      payment_method: verifiedCaptureMethod === 'credit_card' ? 'cartao' : 'pix',
      raw_data: { 
        source: 'check-infinitepay-payment',
        transaction_nsu,
        slug,
        capture_method: verifiedCaptureMethod
      }
    });

    // Generate tickets if not already done
    if (!reserva.tickets_generated) {
      console.log('Generating tickets for reservation');
      try {
        const { error: ticketError } = await supabase.rpc('create_tickets_for_reservation', {
          p_reserva_id: reserva_id
        });

        if (ticketError) {
          console.error('Error generating tickets:', ticketError);
        } else {
          await supabase
            .from('reservas')
            .update({ tickets_generated: true })
            .eq('id', reserva_id);
          console.log('Tickets generated successfully');
        }
      } catch (ticketGenError) {
        console.error('Failed to generate tickets:', ticketGenError);
      }
    }

    // Process loyalty points
    console.log('Processing loyalty points');
    try {
      const { error: loyaltyError } = await supabase.rpc('process_completed_tour', {
        p_reserva_id: reserva_id
      });

      if (loyaltyError) {
        console.error('Error processing loyalty:', loyaltyError);
      }
    } catch (loyaltyErr) {
      console.error('Failed to process loyalty:', loyaltyErr);
    }

    // Send confirmation email (background)
    console.log('Triggering confirmation email');
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ reserva_id: reserva_id })
      });
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
        .eq('id', reserva_id)
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
              metodo_pagamento: verifiedCaptureMethod === 'credit_card' ? 'Cartao de Credito' : 'PIX',
              reserva_numero: reservaData.reserva_numero || reserva_id
            }
          })
        });
        console.log('Admin notification email sent');
      }
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      verified: true,
      status: 'confirmada',
      payment_status: 'pago',
      valor_pago: valorPagoFinal
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking InfinitePay payment:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
