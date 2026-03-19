import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Mercado Pago PIX Payment Creation
 * 
 * This function creates a PIX payment following MP quality guidelines:
 * - payer.first_name / payer.last_name (split from full name)
 * - additional_info.items with: id, title, description, category_id, quantity, unit_price
 * - notification_url pointing to webhook endpoint (HTTPS)
 * - external_reference for payment tracking
 * 
 * Documentation: https://www.mercadopago.com.br/developers/pt/docs
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  reserva_id: string;
  tour_name: string;
  tour_id: string;
  tour_description?: string;
  client_name: string;
  client_email: string;
  client_cpf: string;
  transaction_amount: number;
  description: string;
  quantity?: number;
}

/**
 * Splits a full name into first_name and last_name
 * Required by Mercado Pago quality panel
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || fullName;
  const lastName = parts.slice(1).join(' ') || firstName;
  return { firstName, lastName };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      throw new Error('Mercado Pago access token not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    console.log('Creating PIX payment for reservation:', body.reserva_id);
    console.log('Amount:', body.transaction_amount);

    const {
      reserva_id,
      tour_name,
      tour_id,
      tour_description,
      client_name,
      client_email,
      client_cpf,
      transaction_amount,
      description,
      quantity = 1
    } = body;

    // Split name into first_name and last_name (MP Quality requirement)
    const { firstName, lastName } = splitFullName(client_name);
    const cleanCpf = client_cpf.replace(/\D/g, '');

    // Webhook notification URL (HTTPS required by MP)
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    // Create PIX payment with all required fields (MP Quality requirement)
    const paymentData = {
      transaction_amount: Number(transaction_amount.toFixed(2)),
      description: description || `Reserva ${tour_name}`,
      payment_method_id: 'pix',
      
      // External reference for webhook tracking
      external_reference: reserva_id,
      
      // Payer with first_name and last_name (MP Quality requirement)
      payer: {
        email: client_email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cleanCpf
        }
      },
      
      // Additional info with items (MP Quality requirement)
      additional_info: {
        items: [
          {
            id: tour_id,
            title: tour_name,
            description: tour_description || `Reserva para ${quantity} pessoa(s) - ${tour_name}`,
            category_id: 'tourism',
            quantity: quantity,
            unit_price: Number((transaction_amount / quantity).toFixed(2))
          }
        ],
        payer: {
          first_name: firstName,
          last_name: lastName
        }
      },
      
      // Metadata for internal tracking
      metadata: {
        reserva_id,
        tour_id,
        integration_version: '2.0'
      },
      
      // Webhook notification URL (HTTPS - MP Quality requirement)
      notification_url: notificationUrl,
      
      // Statement descriptor
      statement_descriptor: 'CAMALEAO ECO'
    };

    console.log('Creating PIX payment:', JSON.stringify(paymentData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${reserva_id}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();
    console.log('Mercado Pago PIX response:', JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpResult);
      const errorMessage = mpResult.message || mpResult.cause?.[0]?.description || 'Erro ao criar pagamento PIX';
      throw new Error(errorMessage);
    }

    // Extract PIX data
    const pixData = mpResult.point_of_interaction?.transaction_data;
    
    if (!pixData?.qr_code || !pixData?.qr_code_base64) {
      console.error('PIX data not found in response');
      throw new Error('Dados do PIX não retornados pelo Mercado Pago');
    }

    // Update reservation with payment info
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        mp_payment_id: mpResult.id?.toString(),
        mp_status: mpResult.status,
        payment_status: 'pendente',
        payment_method: 'pix',
        updated_at: new Date().toISOString()
      })
      .eq('id', reserva_id);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
    }

    console.log('PIX payment created successfully:', mpResult.id);

    return new Response(
      JSON.stringify({
        payment_id: mpResult.id,
        status: mpResult.status,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        ticket_url: pixData.ticket_url,
        expiration_date: mpResult.date_of_expiration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error creating PIX payment:', error);
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
