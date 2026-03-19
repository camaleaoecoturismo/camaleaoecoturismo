import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Mercado Pago Preference Creation
 * 
 * This function creates a payment preference following MP quality guidelines:
 * - payer.first_name / payer.last_name (split from full name)
 * - items with: id, title, description, category_id, quantity, unit_price
 * - notification_url pointing to webhook endpoint (HTTPS)
 * - external_reference for payment tracking
 * 
 * Documentation: https://www.mercadopago.com.br/developers/pt/docs
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptionalItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface RequestBody {
  reserva_id: string;
  tour_name: string;
  tour_id: string;
  tour_description?: string;
  client_name: string;
  client_email: string;
  client_cpf: string;
  base_price: number;
  quantity: number;
  optional_items: OptionalItem[];
  payment_method: 'pix' | 'credit_card';
  card_fee_percent: number;
  installments: number;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      throw new Error('Mercado Pago access token not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured');
    }

    const body: RequestBody = await req.json();
    console.log('Creating MP preference for:', body);

    const {
      reserva_id,
      tour_name,
      tour_id,
      tour_description,
      client_name,
      client_email,
      client_cpf,
      base_price,
      quantity,
      optional_items,
      payment_method,
      card_fee_percent,
      installments
    } = body;

    // Split name into first_name and last_name (MP Quality requirement)
    const { firstName, lastName } = splitFullName(client_name);

    // Calculate totals
    let subtotal = base_price * quantity;
    let optionalsTotal = 0;

    // Build items array with all required fields (MP Quality requirement)
    // Required: id, title, description, category_id, quantity, unit_price
    const items: any[] = [
      {
        id: tour_id,
        title: tour_name,
        description: tour_description || `Reserva para ${quantity} pessoa(s) - ${tour_name}`,
        category_id: 'tourism', // MP category for tourism/travel
        quantity: quantity,
        currency_id: 'BRL',
        unit_price: Number(base_price.toFixed(2))
      }
    ];

    // Add optional items with full details
    optional_items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      optionalsTotal += itemTotal;
      items.push({
        id: item.id,
        title: item.name,
        description: `Item adicional: ${item.name}`,
        category_id: 'tourism',
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: Number(item.price.toFixed(2))
      });
    });

    let totalAmount = subtotal + optionalsTotal;
    let cardFeeAmount = 0;

    // Apply card fee for credit card payments
    if (payment_method === 'credit_card') {
      cardFeeAmount = totalAmount * (card_fee_percent / 100);
      totalAmount += cardFeeAmount;

      if (cardFeeAmount > 0) {
        items.push({
          id: 'card_fee',
          title: 'Taxa de processamento cartão',
          description: `Taxa de ${card_fee_percent}% para pagamento com cartão de crédito`,
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(cardFeeAmount.toFixed(2))
        });
      }
    }

    // Webhook notification URL (HTTPS required by MP)
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    // Base URL for redirects (production)
    const baseUrl = 'https://preview--viagens-camaleao-ecoturismo.lovable.app';

    // Create Mercado Pago preference with all required fields
    const preferenceData: any = {
      // Items with full details (MP Quality requirement)
      items,
      
      // Payer with first_name and last_name (MP Quality requirement)
      payer: {
        first_name: firstName,
        last_name: lastName,
        email: client_email,
        identification: {
          type: 'CPF',
          number: client_cpf.replace(/\D/g, '')
        }
      },
      
      // External reference for tracking
      external_reference: reserva_id,
      
      // Webhook notification URL (HTTPS - MP Quality requirement)
      notification_url: notificationUrl,
      
      // Redirect URLs (all HTTPS)
      back_urls: {
        success: `${baseUrl}/reserva/sucesso?reserva=${reserva_id}`,
        failure: `${baseUrl}/reserva/falha?reserva=${reserva_id}`,
        pending: `${baseUrl}/reserva/pendente?reserva=${reserva_id}`
      },
      
      auto_return: 'approved',
      
      // Statement descriptor (appears on card statement)
      statement_descriptor: 'CAMALEAO ECO',
      
      // Metadata for internal tracking
      metadata: {
        reserva_id,
        tour_id,
        payment_method,
        installments,
        card_fee_amount: cardFeeAmount,
        integration_version: '2.0' // Track integration version
      }
    };

    // Configure payment methods
    if (payment_method === 'pix') {
      preferenceData.payment_methods = {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' }
        ],
        default_payment_method_id: 'pix'
      };
    } else if (payment_method === 'credit_card') {
      preferenceData.payment_methods = {
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'bank_transfer' }
        ],
        installments: installments,
        default_installments: 1
      };
    }

    console.log('Creating preference with data:', JSON.stringify(preferenceData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pref-${reserva_id}-${Date.now()}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Mercado Pago error:', errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
    }

    const preference = await mpResponse.json();
    console.log('Preference created:', preference.id);

    return new Response(
      JSON.stringify({
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        total_amount: totalAmount,
        card_fee_amount: cardFeeAmount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error creating preference:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
