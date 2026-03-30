import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação e role admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    }).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: corsHeaders });
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      throw new Error('Mercado Pago access token not configured');
    }

    const { reserva_id, mp_payment_id, amount, reason } = await req.json();
    
    console.log('Processing refund for reservation:', reserva_id);
    console.log('MP Payment ID:', mp_payment_id);
    console.log('Amount:', amount);
    console.log('Reason:', reason);

    if (!reserva_id || !amount) {
      throw new Error('Missing required fields: reserva_id and amount');
    }

    let refundResult = null;

    // If we have a Mercado Pago payment ID, try to refund via MP API
    if (mp_payment_id) {
      console.log('Calling Mercado Pago refund API...');
      
      const refundResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mp_payment_id}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-${reserva_id}-${Date.now()}`
        },
        body: JSON.stringify({
          amount: amount
        })
      });

      refundResult = await refundResponse.json();
      console.log('MP Refund response:', refundResult);

      if (!refundResponse.ok && refundResult.status !== 'approved') {
        console.error('Mercado Pago refund failed:', refundResult);
        // Don't throw - we'll still record the refund manually if MP fails
        console.log('Recording manual refund since MP API failed');
      }
    } else {
      console.log('No MP payment ID - recording manual refund');
    }

    // Update reservation with refund info
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        refund_amount: amount,
        refund_date: new Date().toISOString(),
        refund_reason: reason,
        payment_status: amount >= (await getReservaValorPago(supabase, reserva_id)) ? 'reembolsado' : 'reembolso_parcial',
        updated_at: new Date().toISOString()
      })
      .eq('id', reserva_id);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      throw updateError;
    }

    // Log the refund event
    await supabase.from('payment_logs').insert({
      reserva_id,
      event_type: 'refund',
      event_status: refundResult?.status || 'manual',
      event_message: reason,
      amount: amount,
      refund_amount: amount,
      mp_payment_id: mp_payment_id,
      raw_data: refundResult
    });

    console.log('Refund processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        status: refundResult?.status || 'manual',
        refund_id: refundResult?.id,
        amount: amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function getReservaValorPago(supabase: any, reservaId: string): Promise<number> {
  const { data } = await supabase
    .from('reservas')
    .select('valor_pago')
    .eq('id', reservaId)
    .single();
  return data?.valor_pago || 0;
}
