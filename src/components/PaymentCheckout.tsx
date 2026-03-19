import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, MessageCircle, Loader2, Plus, Minus, 
  ArrowRight, Copy, CheckCircle, AlertCircle, ArrowLeft, Shield, Lock, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { PixIcon } from '@/components/icons/PixIcon';
import { cn } from '@/lib/utils';
import { INSTALLMENT_FEES, calculateInstallmentTotal } from '@/components/MercadoPagoCheckout';
import { addMonths, parseISO, isBefore } from 'date-fns';
import { ShopCheckoutGallery, CheckoutShopItem } from '@/components/shop';

interface OptionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface SelectedOptional {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface PaymentCheckoutProps {
  tourId: string;
  tourName: string;
  reservaId: string;
  clientName: string;
  clientEmail: string;
  clientCpf: string;
  basePrice: number;
  quantity: number;
  paymentMode: 'whatsapp' | 'mercadopago' | 'both';
  cardFeePercent: number;
  installmentsMax: number;
  onWhatsAppRedirect: () => void;
  onPaymentSuccess?: () => void;
}

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
}

export const PaymentCheckout = ({
  tourId,
  tourName,
  reservaId,
  clientName,
  clientEmail,
  clientCpf,
  basePrice,
  quantity,
  paymentMode,
  cardFeePercent,
  installmentsMax,
  onWhatsAppRedirect,
  onPaymentSuccess
}: PaymentCheckoutProps) => {
  const [optionalItems, setOptionalItems] = useState<OptionalItem[]>([]);
  const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptional[]>([]);
  const [selectedShopItems, setSelectedShopItems] = useState<CheckoutShopItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'whatsapp'>('pix');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  
  // PIX state
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState(1);
  
  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'waiting_pix' | 'approved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Installment simulation
  const [showInstallmentSimulation, setShowInstallmentSimulation] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchOptionalItems();
    if (paymentMode === 'whatsapp') {
      setPaymentMethod('whatsapp');
    }
  }, [tourId, paymentMode]);

  // Poll for payment status when waiting for PIX
  useEffect(() => {
    if (paymentStatus !== 'waiting_pix') return;
    
    let active = true;
    
    const checkPayment = async () => {
      try {
        const { data } = await supabase
          .from('reservas')
          .select('payment_status, status, mp_status')
          .eq('id', reservaId)
          .maybeSingle();
        
        if (data && (
          data.payment_status === 'pago' || 
          data.mp_status === 'approved' || 
          data.status === 'confirmada'
        )) {
          if (active) {
            setPaymentStatus('approved');
            toast({
              title: "Pagamento confirmado! ✓",
              description: "Sua reserva foi confirmada com sucesso."
            });
            setTimeout(() => onPaymentSuccess?.(), 2000);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking payment:', error);
        return false;
      }
    };

    checkPayment();
    const interval = setInterval(async () => {
      const paid = await checkPayment();
      if (paid) clearInterval(interval);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paymentStatus, reservaId, toast, onPaymentSuccess]);

  const fetchOptionalItems = async () => {
    try {
      const { data } = await supabase
        .from('tour_optional_items')
        .select('*')
        .eq('tour_id', tourId)
        .eq('is_active', true)
        .order('order_index');

      setOptionalItems(data || []);
    } catch (error) {
      console.error('Error fetching optional items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOptional = (item: OptionalItem) => {
    const existing = selectedOptionals.find(o => o.id === item.id);
    if (existing) {
      setSelectedOptionals(selectedOptionals.filter(o => o.id !== item.id));
    } else {
      setSelectedOptionals([...selectedOptionals, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url
      }]);
    }
  };

  const updateOptionalQuantity = (itemId: string, delta: number) => {
    setSelectedOptionals(selectedOptionals.map(o => {
      if (o.id === itemId) {
        const newQty = Math.max(1, Math.min(10, o.quantity + delta));
        return { ...o, quantity: newQty };
      }
      return o;
    }));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch coupon and tour start_date in parallel
      const [couponRes, tourRes] = await Promise.all([
        supabase
          .from('coupons')
          .select('*')
          .eq('codigo', couponCode.toUpperCase().trim())
          .eq('ativo', true)
          .maybeSingle(),
        supabase
          .from('tours')
          .select('start_date')
          .eq('id', tourId)
          .maybeSingle()
      ]);
      
      if (couponRes.error) throw couponRes.error;
      
      const coupon = couponRes.data;
      const tourStartDate = tourRes.data?.start_date;
      
      if (!coupon) {
        toast({ title: "Cupom inválido ou inexistente", variant: "destructive" });
        return;
      }
      
      if (coupon.data_inicio && coupon.data_inicio > today) {
        toast({ title: "Cupom ainda não está válido", variant: "destructive" });
        return;
      }
      if (coupon.data_fim && coupon.data_fim < today) {
        toast({ title: "Cupom expirado", variant: "destructive" });
        return;
      }
      
      if (coupon.maximo_usos && coupon.usos_atual >= coupon.maximo_usos) {
        toast({ title: "Cupom atingiu o limite de usos", variant: "destructive" });
        return;
      }
      
      if (coupon.tour_id && coupon.tour_id !== tourId) {
        toast({ title: "Cupom não aplicável a este passeio", variant: "destructive" });
        return;
      }
      
      // Check months restriction
      if (coupon.meses_validade && tourStartDate) {
        const maxDate = addMonths(new Date(), coupon.meses_validade);
        const tourDate = parseISO(tourStartDate);
        
        if (!isBefore(tourDate, maxDate)) {
          toast({ 
            title: "Cupom não aplicável", 
            description: `Este cupom só é válido para passeios nos próximos ${coupon.meses_validade} meses.`,
            variant: "destructive" 
          });
          return;
        }
      }
      
      let discount = 0;
      if (coupon.tipo === 'porcentagem') {
        discount = baseTotal * (coupon.valor / 100);
      } else {
        discount = Math.min(coupon.valor, baseTotal);
      }
      
      setCouponDiscount(discount);
      setCouponApplied(true);
      setAppliedCouponCode(coupon.codigo);
      
      await supabase
        .from('coupons')
        .update({ usos_atual: coupon.usos_atual + 1 })
        .eq('id', coupon.id);
      
      toast({ 
        title: "Cupom aplicado!", 
        description: `Desconto de ${formatCurrency(discount)}` 
      });
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      toast({ title: "Erro ao validar cupom", description: error.message, variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };
  
  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponApplied(false);
    setAppliedCouponCode('');
  };

  // Calculate totals
  const subtotal = basePrice * quantity;
  const optionalsTotal = selectedOptionals.reduce((sum, o) => sum + (o.price * o.quantity), 0);
  const shopItemsTotal = selectedShopItems.reduce((sum, item) => sum + item.subtotal, 0);
  const baseTotal = subtotal + optionalsTotal + shopItemsTotal;
  const afterDiscount = baseTotal - couponDiscount;
  const cardFee = paymentMethod === 'credit_card' ? afterDiscount * (cardFeePercent / 100) : 0;
  const total = afterDiscount + cardFee;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const generatePixPayment = async () => {
    setProcessing(true);
    setPaymentStatus('processing');
    
    try {
      await supabase.from('reservas').update({
        selected_optional_items: JSON.parse(JSON.stringify(selectedOptionals)),
        valor_total_com_opcionais: total,
        payment_method: 'pix'
      }).eq('id', reservaId);
      
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          reserva_id: reservaId,
          tour_name: tourName,
          tour_id: tourId,
          client_name: clientName,
          client_email: clientEmail,
          client_cpf: clientCpf,
          transaction_amount: total,
          description: `Reserva ${tourName}`
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setPixData({
        payment_id: data.payment_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64
      });
      setPaymentStatus('waiting_pix');
      
    } catch (error: any) {
      console.error('PIX error:', error);
      setPaymentStatus('error');
      setErrorMessage(error.message || 'Erro ao gerar PIX');
      toast({ title: "Erro ao gerar PIX", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco." });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length && i < 16; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) return v.substring(0, 2) + '/' + v.substring(2, 4);
    return v;
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');

    try {
      await supabase.from('reservas').update({
        selected_optional_items: JSON.parse(JSON.stringify(selectedOptionals)),
        valor_total_com_opcionais: total,
        card_fee_amount: cardFee,
        payment_method: 'cartao',
        installments: cardInstallments
      }).eq('id', reservaId);

      const [expiryMonth, expiryYear] = cardExpiry.split('/');
      
      const { data, error } = await supabase.functions.invoke('process-mp-payment', {
        body: {
          reserva_id: reservaId,
          card_number: cardNumber.replace(/\s/g, ''),
          card_holder_name: cardName,
          card_expiration_month: expiryMonth,
          card_expiration_year: `20${expiryYear}`,
          card_cvv: cardCvv,
          installments: cardInstallments,
          payer_email: clientEmail,
          payer_cpf: clientCpf.replace(/\D/g, ''),
          transaction_amount: total,
          description: `Reserva ${tourName}`
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      if (data.status === 'approved' || data.status === 'pending' || data.status === 'in_process') {
        setPaymentStatus('approved');
        toast({ title: "Pagamento aprovado!", description: "Sua reserva foi confirmada." });
        setTimeout(() => onPaymentSuccess?.(), 2000);
      } else {
        throw new Error(data.status_detail || 'Pagamento não aprovado');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      setErrorMessage(error.message || 'Erro ao processar pagamento');
      toast({ title: "Erro no pagamento", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Save shop order items to database
  const saveShopOrderItems = async () => {
    if (selectedShopItems.length === 0) return;
    
    try {
      // Delete any existing shop items for this reservation
      await supabase
        .from('shop_order_items')
        .delete()
        .eq('reserva_id', reservaId);
      
      // Insert new items
      const items = selectedShopItems.map(item => ({
        reserva_id: reservaId,
        product_id: item.product.id,
        variation_id: item.variation?.id || null,
        product_name: item.product.name,
        variation_label: item.variation 
          ? Object.values(item.selectedVariationValues).join(', ')
          : null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal
      }));
      
      const { error } = await supabase.from('shop_order_items').insert(items);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving shop items:', error);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'whatsapp') {
      await supabase.from('reservas').update({
        selected_optional_items: JSON.parse(JSON.stringify(selectedOptionals)),
        valor_total_com_opcionais: total,
        coupon_code: appliedCouponCode || null,
        coupon_discount: couponDiscount
      }).eq('id', reservaId);
      await saveShopOrderItems();
      onWhatsAppRedirect();
      return;
    }

    // Update reservation with selected items, payment info, and coupon data
    await supabase.from('reservas').update({
      selected_optional_items: JSON.parse(JSON.stringify(selectedOptionals)),
      valor_total_com_opcionais: total,
      card_fee_amount: paymentMethod === 'credit_card' ? cardFee : 0,
      payment_method: paymentMethod === 'pix' ? 'pix' : 'cartao',
      coupon_code: appliedCouponCode || null,
      coupon_discount: couponDiscount
    }).eq('id', reservaId);
    
    await saveShopOrderItems();

    // Set showPaymentForm to true FIRST to trigger form display
    setShowPaymentForm(true);
    
    // For PIX, generate the QR code immediately
    if (paymentMethod === 'pix') {
      await generatePixPayment();
    }
    // For credit_card, the form will be displayed and user fills card data
  };

  const handleBack = () => {
    setShowPaymentForm(false);
    setPaymentStatus('idle');
    setPixData(null);
    setErrorMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Success state
  if (paymentStatus === 'approved') {
    return (
      <div className="bg-emerald-50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold text-emerald-800 mb-2">Pagamento Aprovado!</h3>
        <p className="text-emerald-600">Sua reserva foi confirmada com sucesso.</p>
      </div>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <div className="bg-red-50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">Erro no Pagamento</h3>
        <p className="text-red-600 mb-6">{errorMessage}</p>
        <Button onClick={handleBack} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // PIX checkout view
  if (showPaymentForm && paymentMethod === 'pix') {
    if (processing || !pixData) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Gerando código PIX...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <PixIcon size={16} />
            Pagamento via PIX
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(total)}</p>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-sm border">
            <img 
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code PIX"
              className="w-52 h-52"
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Escaneie o QR Code</span> com o app do seu banco
          </p>
          <p className="text-xs text-muted-foreground">
            ou copie o código abaixo e cole na opção "PIX Copia e Cola"
          </p>
        </div>

        <Button 
          onClick={copyPixCode} 
          variant="outline" 
          className="w-full h-12 text-base border-2"
        >
          <Copy className="h-4 w-4 mr-2" />
          {copied ? 'Código copiado!' : 'Copiar código PIX'}
        </Button>

        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
            <span className="text-amber-700 font-medium text-sm">Aguardando pagamento...</span>
          </div>
          <p className="text-xs text-amber-600">
            Após pagar, a confirmação aparecerá automaticamente aqui.
          </p>
        </div>
      </div>
    );
  }

  // Credit card checkout view
  if (showPaymentForm && paymentMethod === 'credit_card') {
    return (
      <div className="space-y-6">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <CreditCard className="h-4 w-4" />
            Cartão de Crédito
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(total)}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-500" />
              Pagamento seguro
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-500" />
              Dados criptografados
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número do Cartão</Label>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="mt-1.5 h-12 text-base bg-white"
            />
          </div>
          
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome no Cartão</Label>
            <Input
              placeholder="NOME COMO ESTÁ NO CARTÃO"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="mt-1.5 h-12 text-base bg-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Validade</Label>
              <Input
                placeholder="MM/AA"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                maxLength={5}
                className="mt-1.5 h-12 text-base bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CVV</Label>
              <Input
                placeholder="123"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                type="password"
                className="mt-1.5 h-12 text-base bg-white"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parcelas</Label>
            <select
              value={cardInstallments}
              onChange={(e) => setCardInstallments(Number(e.target.value))}
              className="mt-1.5 w-full h-12 rounded-md border border-input bg-white px-3 text-base"
            >
              {Array.from({ length: installmentsMax }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {n}x de {formatCurrency(total / n)} {n === 1 ? '(à vista)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Button 
          onClick={handleCardPayment}
          disabled={processing}
          className="w-full h-14 text-base font-semibold"
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processando...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Pagar {formatCurrency(total)}
            </>
          )}
        </Button>
        
        <div className="flex justify-center gap-3">
          {['Visa', 'Mastercard', 'Elo', 'Amex'].map(brand => (
            <span key={brand} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-500 font-medium">
              {brand}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Selection view - Main checkout
  return (
    <div className="space-y-6">
      {/* Optional Items */}
      {optionalItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            Itens Adicionais
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Adicione itens extras para complementar sua experiência.
          </p>
          <div className="space-y-2">
            {optionalItems.map(item => {
              const selected = selectedOptionals.find(o => o.id === item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                    selected 
                      ? "bg-primary/10 ring-2 ring-primary/30" 
                      : "bg-gray-50 hover:bg-gray-100"
                  )}
                  onClick={() => toggleOptional(item)}
                >
                  <Checkbox checked={!!selected} className="flex-shrink-0" />
                  
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tag className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{formatCurrency(item.price)}</span>
                    
                    {selected && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          onClick={() => updateOptionalQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{selected.quantity}</span>
                        <button 
                          className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          onClick={() => updateOptionalQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shop Products Gallery */}
      <ShopCheckoutGallery
        tourId={tourId}
        selectedItems={selectedShopItems}
        onItemsChange={setSelectedShopItems}
      />

      {/* Coupon */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Cupom de Desconto
        </h3>
        {couponApplied ? (
          <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{appliedCouponCode}</span>
              <span className="text-sm text-emerald-600">(-{formatCurrency(couponDiscount)})</span>
            </div>
            <button 
              onClick={removeCoupon} 
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Digite seu cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 h-11 bg-white"
              disabled={couponLoading}
            />
            <Button 
              variant="outline" 
              onClick={applyCoupon} 
              disabled={!couponCode.trim() || couponLoading}
              className="h-11 px-5"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Forma de Pagamento</h3>
        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-2">
          {(paymentMode === 'mercadopago' || paymentMode === 'both') && (
            <>
              <label
                htmlFor="pix"
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                  paymentMethod === 'pix' 
                    ? "bg-emerald-50 ring-2 ring-emerald-200" 
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                <RadioGroupItem value="pix" id="pix" className="sr-only" />
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  paymentMethod === 'pix' ? "bg-emerald-100" : "bg-gray-200"
                )}>
                  <PixIcon size={20} className={
                    paymentMethod === 'pix' ? "text-emerald-600" : "text-gray-500"
                  } />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">PIX</p>
                  <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                </div>
                <span className="font-bold text-emerald-600">{formatCurrency(afterDiscount)}</span>
              </label>

              <div className="space-y-2">
                <label
                  htmlFor="credit_card"
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                    paymentMethod === 'credit_card' 
                      ? "bg-blue-50 ring-2 ring-blue-200" 
                      : "bg-gray-50 hover:bg-gray-100"
                  )}
                >
                  <RadioGroupItem value="credit_card" id="credit_card" className="sr-only" />
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    paymentMethod === 'credit_card' ? "bg-blue-100" : "bg-gray-200"
                  )}>
                    <CreditCard className={cn(
                      "h-5 w-5",
                      paymentMethod === 'credit_card' ? "text-blue-600" : "text-gray-500"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Cartão de Crédito</p>
                    <p className="text-xs text-muted-foreground">Em até {installmentsMax}x</p>
                  </div>
                  <span className="font-bold text-blue-600">{formatCurrency(afterDiscount + (afterDiscount * cardFeePercent / 100))}</span>
                </label>
                
                {paymentMethod === 'credit_card' && (
                  <div className="ml-14">
                    <button
                      type="button"
                      onClick={() => setShowInstallmentSimulation(!showInstallmentSimulation)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showInstallmentSimulation ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Ocultar simulação de parcelas
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Ver simulação de parcelas
                        </>
                      )}
                    </button>
                    
                    {showInstallmentSimulation && (
                      <div className="mt-2 bg-blue-50/50 rounded-lg p-3 space-y-1.5">
                        <p className="text-xs font-medium text-blue-800 mb-2">Simulação de Parcelamento</p>
                        {Array.from({ length: Math.min(installmentsMax, 12) }, (_, i) => i + 1).map(n => {
                          const totalWithFee = calculateInstallmentTotal(afterDiscount, n);
                          const installmentValue = totalWithFee / n;
                          const feePercent = INSTALLMENT_FEES[n] || 0;
                          return (
                            <div key={n} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {n}x de {formatCurrency(installmentValue)}
                                {n > 1 && <span className="text-[10px] ml-1">({feePercent}% juros)</span>}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(totalWithFee)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {(paymentMode === 'whatsapp' || paymentMode === 'both') && (
            <label
              htmlFor="whatsapp"
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                paymentMethod === 'whatsapp' 
                  ? "bg-green-50 ring-2 ring-green-200" 
                  : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <RadioGroupItem value="whatsapp" id="whatsapp" className="sr-only" />
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                paymentMethod === 'whatsapp' ? "bg-green-100" : "bg-gray-200"
              )}>
                <MessageCircle className={cn(
                  "h-5 w-5",
                  paymentMethod === 'whatsapp' ? "text-green-600" : "text-gray-500"
                )} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Finalizar pagamento</p>
              </div>
            </label>
          )}
        </RadioGroup>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Passeio ({quantity}x)</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        {selectedOptionals.map(opt => (
          <div key={opt.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{opt.name} ({opt.quantity}x)</span>
            <span className="font-medium">{formatCurrency(opt.price * opt.quantity)}</span>
          </div>
        ))}

        {selectedShopItems.map((item, idx) => (
          <div key={`shop-${item.product.id}-${item.variation?.id || 'no-var'}-${idx}`} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product.name}
              {item.variation && Object.keys(item.selectedVariationValues).length > 0 && (
                <span className="ml-1">({Object.values(item.selectedVariationValues).join(', ')})</span>
              )}
              {item.quantity > 1 && ` (${item.quantity}x)`}
            </span>
            <span className="font-medium">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Desconto</span>
            <span className="font-medium">-{formatCurrency(couponDiscount)}</span>
          </div>
        )}
        
        {paymentMethod === 'credit_card' && cardFee > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Taxa cartão ({cardFeePercent}%)</span>
            <span>{formatCurrency(cardFee)}</span>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <Button 
        onClick={handlePayment} 
        disabled={processing} 
        className="w-full h-14 text-base font-semibold rounded-xl"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processando...
          </>
        ) : paymentMethod === 'whatsapp' ? (
          <>
            <MessageCircle className="h-5 w-5 mr-2" />
            Finalizar via WhatsApp
          </>
        ) : (
          <>
            Pagar {formatCurrency(total)}
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};
