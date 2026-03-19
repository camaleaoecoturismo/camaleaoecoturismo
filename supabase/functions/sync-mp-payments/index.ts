import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all reservations with pending/aguardando status that have mp_payment_id
    // Also include reservations where mp_status doesn't match expected state
    const { data: pendingReservas, error: fetchError } = await supabase
      .from('reservas')
      .select('id, mp_payment_id, mp_status, payment_status, status')
      .not('mp_payment_id', 'is', null)
      .or('payment_status.in.(pendente,aguardando),mp_status.in.(pending,in_process,authorized)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingReservas?.length || 0} reservations to sync with MP`);

    const results: any[] = [];

    for (const reserva of pendingReservas || []) {
      try {
        console.log(`Checking payment ${reserva.mp_payment_id} for reserva ${reserva.id}`);

        // Fetch current status from Mercado Pago
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${reserva.mp_payment_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!paymentResponse.ok) {
          console.error(`Error fetching payment ${reserva.mp_payment_id}: ${paymentResponse.status}`);
          results.push({ id: reserva.id, error: `HTTP ${paymentResponse.status}` });
          continue;
        }

        const payment = await paymentResponse.json();
        console.log(`Payment ${reserva.mp_payment_id} status: ${payment.status} (${payment.status_detail})`);

        // Map MP status to our status - MUST be consistent with mp-webhook
        let paymentStatus = 'pendente';
        let reservaStatus = 'pendente';

        switch (payment.status) {
          case 'approved':
            paymentStatus = 'pago';
            reservaStatus = 'confirmada';
            break;
          case 'pending':
          case 'in_process':
          case 'authorized':
            paymentStatus = 'aguardando';
            reservaStatus = 'pendente';
            break;
          case 'rejected':
            paymentStatus = 'rejeitado';
            reservaStatus = 'pendente';
            break;
          case 'cancelled':
          case 'refunded':
          case 'charged_back':
            paymentStatus = 'cancelado';
            reservaStatus = 'cancelada';
            break;
        }

        // Only update if status changed
        if (paymentStatus !== reserva.payment_status || payment.status !== reserva.mp_status) {
          console.log(`Updating reserva ${reserva.id}: payment_status ${reserva.payment_status} -> ${paymentStatus}, mp_status ${reserva.mp_status} -> ${payment.status}`);

          const updateData: any = {
            mp_status: payment.status,
            payment_status: paymentStatus,
            status: reservaStatus,
            updated_at: new Date().toISOString()
          };

          if (payment.status === 'approved') {
            updateData.data_pagamento = payment.date_approved || new Date().toISOString();
            updateData.data_confirmacao = payment.date_approved || new Date().toISOString();
            updateData.valor_pago = payment.transaction_amount;
            updateData.payment_method = payment.payment_type_id === 'credit_card' ? 'cartao' : 'pix';
            updateData.installments = payment.installments || 1;
          } else if (payment.status === 'cancelled' || payment.status === 'refunded' || payment.status === 'charged_back') {
            updateData.data_cancelamento = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from('reservas')
            .update(updateData)
            .eq('id', reserva.id);

          if (updateError) {
            console.error(`Error updating reserva ${reserva.id}:`, updateError);
            results.push({ id: reserva.id, error: updateError.message });
          } else {
            // Log to payment_logs for audit trail
            try {
              await supabase.from('payment_logs').insert({
                reserva_id: reserva.id,
                event_type: 'sync_' + payment.status,
                event_status: payment.status,
                event_message: `Synced from MP: ${reserva.payment_status} -> ${paymentStatus}`,
                mp_payment_id: reserva.mp_payment_id,
                amount: payment.transaction_amount,
                payment_method: payment.payment_type_id === 'credit_card' ? 'cartao' : 'pix',
                raw_data: { 
                  old_status: reserva.payment_status, 
                  new_status: paymentStatus,
                  mp_status: payment.status,
                  status_detail: payment.status_detail
                }
              });
            } catch (logError) {
              console.error('Error creating payment log:', logError);
            }

            results.push({ 
              id: reserva.id, 
              mp_payment_id: reserva.mp_payment_id,
              old_status: reserva.payment_status,
              new_status: paymentStatus,
              mp_status: payment.status,
              status_detail: payment.status_detail
            });

            // If approved, process loyalty points
            if (payment.status === 'approved') {
              try {
                await supabase.rpc('process_completed_tour', { p_reserva_id: reserva.id });
                console.log(`Loyalty points processed for reserva ${reserva.id}`);
              } catch (e) {
                console.error('Error processing loyalty:', e);
              }
            }
          }
        } else {
          results.push({ 
            id: reserva.id, 
            status: 'no_change',
            current_status: paymentStatus,
            mp_status: payment.status
          });
        }
      } catch (err: any) {
        console.error(`Error processing reserva ${reserva.id}:`, err);
        results.push({ id: reserva.id, error: err.message });
      }
    }

    const updated = results.filter(r => r.new_status).length;
    const unchanged = results.filter(r => r.status === 'no_change').length;
    const errors = results.filter(r => r.error).length;

    console.log(`Sync complete: ${updated} updated, ${unchanged} unchanged, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        checked: pendingReservas?.length || 0,
        updated,
        unchanged,
        errors,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
