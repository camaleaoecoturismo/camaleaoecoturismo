import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * InfinitePay Checkout Link Generator
 * 
 * Creates a payment link via InfinitePay API
 * The link is generated with the order details and redirects to the payment page
 * 
 * Endpoint: POST /functions/v1/create-infinitepay-link
 * Body: { reserva_id: string }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INFINITEPAY_HANDLE = 'camaleaoecoturismo';
const REDIRECT_URL = 'https://agenda.camaleaoecoturismo.com/pagamento/sucesso';
const WEBHOOK_URL = 'https://guwplwuwriixgvkjlutg.supabase.co/functions/v1/infinitepay-webhook';

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
      selected_optionals, 
      selected_shop_items,
      coupon_code: overrideCouponCode, 
      coupon_discount: overrideCouponDiscount 
    } = body;

    if (!reserva_id) {
      throw new Error('reserva_id is required');
    }

    console.log('Creating InfinitePay link for reserva:', reserva_id);
    console.log('Optionals passed directly:', JSON.stringify(selected_optionals));
    console.log('Shop items passed directly:', JSON.stringify(selected_shop_items));

    // Fetch reservation with all related data
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select(`
        *,
        clientes!fk_reservas_cliente (nome_completo, email, whatsapp),
        tours!fk_reservas_tour (id, name, valor_padrao)
      `)
      .eq('id', reserva_id)
      .single();

    if (reservaError || !reserva) {
      console.error('Error fetching reserva:', reservaError);
      throw new Error('Reserva not found');
    }

    // Fetch tour optional items for price validation
    const { data: optionalItemsDB } = await supabase
      .from('tour_optional_items')
      .select('id, name, price')
      .eq('tour_id', reserva.tour_id)
      .eq('is_active', true);

    const optionalItemsMap = new Map((optionalItemsDB || []).map(item => [item.id, item]));

    // Build items array for InfinitePay
    const items: Array<{ quantity: number; price: number; description: string }> = [];

    // Use valor_passeio from reservation (calculated with pricing options) or fallback to valor_padrao * participants
    // valor_passeio already contains the correct total for all participants based on their selected packages
    const tourPrice = reserva.valor_passeio || (reserva.tours?.valor_padrao || 0) * (reserva.numero_participantes || 1);
    
    // Get coupon discount - prefer values passed directly, fallback to reservation data
    const couponDiscount = overrideCouponDiscount !== undefined ? Number(overrideCouponDiscount) : (Number(reserva.coupon_discount) || 0);
    const couponCode = overrideCouponCode !== undefined ? overrideCouponCode : (reserva.coupon_code || null);
    
    // Add main tour as single item with total price
    items.push({
      quantity: 1,
      price: Math.round(tourPrice * 100), // Convert to centavos
      description: `${reserva.tours?.name || 'Passeio'} (${reserva.numero_participantes || 1} participante${(reserva.numero_participantes || 1) > 1 ? 's' : ''})`
    });

    console.log('Tour price from reservation:', tourPrice, 'valor_passeio:', reserva.valor_passeio);
    console.log('Coupon discount:', couponDiscount, 'Coupon code:', couponCode);

    // Add optional items - prefer directly passed optionals, fallback to reservation data
    // This avoids race conditions where optionals haven't been saved yet
    const optionalsToProcess: Array<{ id: string; name: string; price: number; quantity: number }> = 
      (selected_optionals && Array.isArray(selected_optionals) && selected_optionals.length > 0)
        ? selected_optionals
        : (reserva.selected_optional_items as Array<{ id: string; name: string; price: number; quantity: number }> || []);
    
    console.log('Selected optionals to process:', JSON.stringify(optionalsToProcess));
    
    for (const optional of optionalsToProcess) {
      const dbOptional = optionalItemsMap.get(optional.id);
      if (dbOptional) {
        items.push({
          quantity: optional.quantity,
          price: Math.round(dbOptional.price * 100), // Use DB price for security, convert to centavos
          description: dbOptional.name
        });
        console.log('Added optional item:', dbOptional.name, 'price:', dbOptional.price, 'qty:', optional.quantity);
      } else {
        console.log('Optional item not found in DB:', optional.id, optional.name);
      }
    }

    // Add shop items (products from the store)
    const shopItemsToProcess: Array<{ 
      product_id: string; 
      product_name: string; 
      variation_id?: string | null;
      variation_label?: string | null;
      quantity: number; 
      unit_price: number; 
      subtotal: number;
    }> = selected_shop_items && Array.isArray(selected_shop_items) ? selected_shop_items : [];
    
    console.log('Shop items to process:', JSON.stringify(shopItemsToProcess));
    
    for (const shopItem of shopItemsToProcess) {
      const description = shopItem.variation_label 
        ? `${shopItem.product_name} (${shopItem.variation_label})`
        : shopItem.product_name;
      
      items.push({
        quantity: shopItem.quantity,
        price: Math.round(shopItem.unit_price * 100), // Convert to centavos
        description: description
      });
      console.log('Added shop item:', description, 'price:', shopItem.unit_price, 'qty:', shopItem.quantity);
    }

    // Calculate total from items (server-side validation)
    const itemsTotalCentavos = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Apply coupon discount
    const discountCentavos = Math.round(couponDiscount * 100);
    const totalCentavos = Math.max(0, itemsTotalCentavos - discountCentavos);
    const totalReais = totalCentavos / 100;

    console.log('Items for InfinitePay:', JSON.stringify(items));
    console.log('Items total (centavos):', itemsTotalCentavos, 'Discount (centavos):', discountCentavos, 'Final total (centavos):', totalCentavos);
    
    // If there's a discount, add it as a negative item for transparency in InfinitePay
    if (discountCentavos > 0 && couponCode) {
      items.push({
        quantity: 1,
        price: -discountCentavos, // Negative price for discount
        description: `Desconto cupom ${couponCode}`
      });
    }

    // Generate order_nsu - use the reserva ID
    const orderNsu = reserva_id;

    // Build the payload for InfinitePay
    const payload: Record<string, unknown> = {
      handle: INFINITEPAY_HANDLE,
      items: items,
      order_nsu: orderNsu,
      redirect_url: REDIRECT_URL,
      webhook_url: WEBHOOK_URL
    };

    // Add customer data if available
    const cliente = reserva.clientes as { nome_completo?: string; email?: string; whatsapp?: string } | null;
    if (cliente) {
      const customerData: Record<string, string> = {};
      if (cliente.nome_completo) customerData.name = cliente.nome_completo;
      if (cliente.email) customerData.email = cliente.email;
      if (cliente.whatsapp) {
        // Format phone with country code
        let phone = cliente.whatsapp.replace(/\D/g, '');
        if (phone.length === 11 || phone.length === 10) {
          phone = '+55' + phone;
        } else if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }
        customerData.phone_number = phone;
      }
      if (Object.keys(customerData).length > 0) {
        payload.customer = customerData;
      }
    }

    console.log('InfinitePay payload:', JSON.stringify(payload));

    // Call InfinitePay API
    const infinitePayResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!infinitePayResponse.ok) {
      const errorText = await infinitePayResponse.text();
      console.error('InfinitePay API error:', infinitePayResponse.status, errorText);
      throw new Error(`InfinitePay API error: ${infinitePayResponse.status} - ${errorText}`);
    }

    const infinitePayData = await infinitePayResponse.json();
    console.log('InfinitePay response:', JSON.stringify(infinitePayData));

    // Extract checkout URL from response
    // The API returns the link in a field (check exact format)
    const checkoutUrl = infinitePayData.url || infinitePayData.checkout_url || infinitePayData.link;

    if (!checkoutUrl) {
      console.error('No checkout URL in response:', infinitePayData);
      throw new Error('InfinitePay did not return a checkout URL');
    }

    // Update reservation with InfinitePay data, recalculated total, AND selected optionals
    // CRITICAL: Save optionals here server-side to avoid race conditions with client-side updates
    const updateData: Record<string, unknown> = {
      infinitepay_checkout_url: checkoutUrl,
      order_nsu: orderNsu,
      valor_total_com_opcionais: totalReais,
      payment_method: 'infinitepay',
      updated_at: new Date().toISOString()
    };

    // Save selected optionals server-side (authoritative source)
    if (optionalsToProcess.length > 0) {
      updateData.selected_optional_items = optionalsToProcess.map(o => ({
        id: o.id,
        name: o.name || (optionalItemsMap.get(o.id)?.name) || '',
        price: optionalItemsMap.get(o.id)?.price || o.price || 0,
        quantity: o.quantity || 1
      }));
    }

    // Save shop items to reservation for reference
    if (shopItemsToProcess.length > 0) {
      updateData.selected_shop_items = shopItemsToProcess;
    }

    // Save coupon info
    if (couponCode) {
      updateData.coupon_code = couponCode;
      updateData.coupon_discount = couponDiscount;
    }

    const { error: updateError } = await supabase
      .from('reservas')
      .update(updateData)
      .eq('id', reserva_id);

    if (updateError) {
      console.error('Error updating reserva:', updateError);
      // Don't throw - we still want to return the URL
    } else {
      console.log('Reservation updated with optionals and total:', totalReais);
    }

    // Log the payment attempt
    await supabase.from('payment_logs').insert({
      reserva_id: reserva_id,
      event_type: 'infinitepay_link_created',
      event_status: 'pending',
      event_message: 'Checkout link created',
      amount: totalReais,
      payment_method: 'infinitepay',
      raw_data: { checkout_url: checkoutUrl, items: items }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkout_url: checkoutUrl,
        total: totalReais,
        order_nsu: orderNsu
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating InfinitePay link:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
