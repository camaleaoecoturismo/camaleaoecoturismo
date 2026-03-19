import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Shield, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initMercadoPago, CardNumber, SecurityCode, ExpirationDate, createCardToken } from '@mercadopago/sdk-react';
import mercadoPagoLogo from '@/assets/mercado-pago-logo.png';

// Mercado Pago Public Key
const MP_PUBLIC_KEY = 'APP_USR-2ee2611e-6827-498a-8139-8547b6d9910d';

// Taxas de parcelamento InfinitePay
export const INSTALLMENT_FEES: Record<number, number> = {
  1: 4.4,
  2: 6.5,
  3: 7.5,
  4: 8.6,
  5: 9.6,
  6: 10.7,
  7: 14.4,
  8: 15.5,
  9: 16.6,
  10: 17.7,
  11: 18.9,
  12: 20.0
};

// Função para calcular valor com juros de parcelamento
export const calculateInstallmentTotal = (baseAmount: number, installments: number): number => {
  const feePercent = INSTALLMENT_FEES[installments] || 0;
  return Math.round(baseAmount * (1 + feePercent / 100) * 100) / 100;
};

// Calcula máximo de parcelas baseado no valor mínimo por parcela do MP (R$5)
const MIN_INSTALLMENT_AMOUNT = 5.0;
export const calculateMaxInstallments = (amount: number, configMax: number = 12): number => {
  const maxByAmount = Math.max(1, Math.floor(amount / MIN_INSTALLMENT_AMOUNT));
  return Math.min(maxByAmount, configMax, 12);
};

interface MercadoPagoCheckoutProps {
  reservaId: string;
  baseAmount: number; // valor base sem juros de parcelamento
  clientName: string;
  clientEmail: string;
  clientCpf: string;
  tourId?: string;
  tourName: string;
  tourDescription?: string;
  quantity?: number;
  installmentsMax: number;
  onSuccess: (paidAmount: number) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

// Initialize Mercado Pago SDK once (Secure Fields / PCI Compliance)
let mpInitialized = false;

// Custom styles for Secure Fields to match design
const secureFieldStyle = {
  height: '40px',
  width: '100%',
  padding: '0 12px',
  fontSize: '14px',
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent'
};

export function MercadoPagoCheckout({
  reservaId,
  baseAmount,
  clientName,
  clientEmail,
  clientCpf,
  tourId,
  tourName,
  tourDescription,
  quantity = 1,
  installmentsMax,
  onSuccess,
  onError,
  onBack
}: MercadoPagoCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'approved' | 'pending' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  // Card form state - only for non-sensitive fields
  const [cardName, setCardName] = useState(clientName.toUpperCase());
  const [cardInstallments, setCardInstallments] = useState(1);
  const { toast } = useToast();

  // Calcula o valor total com juros de parcelamento
  const totalAmount = calculateInstallmentTotal(baseAmount, cardInstallments);
  const installmentFee = INSTALLMENT_FEES[cardInstallments] || 0;
  const feeAmount = totalAmount - baseAmount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Initialize Mercado Pago SDK with Secure Fields (PCI Compliance requirement)
  useEffect(() => {
    const initSDK = async () => {
      if (!mpInitialized) {
        try {
          initMercadoPago(MP_PUBLIC_KEY, {
            locale: 'pt-BR',
            advancedFraudPrevention: true
          });
          mpInitialized = true;
          console.log('MercadoPago SDK initialized with Secure Fields (PCI Compliant) and Fraud Prevention');
          
          // Load MP Device Fingerprint script for fraud prevention
          const existingScript = document.querySelector('script[src*="mercadopago.com/v2/security"]');
          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://www.mercadopago.com/v2/security.js?view=checkout&output=deviceId`;
            script.async = true;
            script.onload = () => {
              console.log('MP Device Fingerprint script loaded');
              // Wait for device ID to be generated
              setTimeout(() => {
                const deviceId = (window as any).MP_DEVICE_SESSION_ID;
                if (deviceId) {
                  console.log('Device ID captured:', deviceId.substring(0, 20) + '...');
                }
              }, 1000);
            };
            document.body.appendChild(script);
          }
        } catch (err) {
          console.error('Error initializing MP SDK:', err);
        }
      }
      // Small delay to ensure SDK components are mounted
      setTimeout(() => {
        setSdkReady(true);
        setPaymentStatus('ready');
      }, 500);
    };
    
    initSDK();
  }, []);

  const getPaymentMethodId = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5')) return 'master';
    if (cleanNumber.startsWith('6')) return 'elo';
    if (cleanNumber.startsWith('3')) return 'amex';
    return 'visa';
  };

  const handleSubmit = async () => {
    if (!cardName) {
      toast({
        title: "Preencha o nome do titular do cartão",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const cleanCpf = clientCpf.replace(/\D/g, '');

      /**
       * Create card token using Mercado Pago Secure Fields SDK
       * PCI Compliance: Card data (number, CVV, expiry) is captured directly by MP Secure Fields
       * and never touches our servers. Only the secure token is sent to backend.
       */
      console.log('Creating card token with MP Secure Fields SDK (PCI Compliant)...');
      
      const tokenResponse = await createCardToken({
        cardholderName: cardName,
        identificationType: 'CPF',
        identificationNumber: cleanCpf
      });

      console.log('Token created:', tokenResponse?.id ? 'success' : 'failed');
      
      if (!tokenResponse?.id) {
        throw new Error('Erro ao processar dados do cartão. Verifique as informações e tente novamente.');
      }

      // Update reservation with payment method and installment fee
      await supabase.from('reservas').update({
        payment_method: 'cartao',
        installments: cardInstallments,
        card_fee_amount: feeAmount,
        valor_total_com_opcionais: totalAmount
      }).eq('id', reservaId);

      const transactionAmount = Math.round(totalAmount * 100) / 100;
      
      // Detect card issuer from token first_six_digits if available
      const paymentMethodId = tokenResponse.first_six_digits 
        ? getPaymentMethodId(tokenResponse.first_six_digits) 
        : 'visa';

      // Get Device ID for fraud prevention (CRITICAL for automatic approval - prevents pending_review_manual)
      // Try multiple sources as MP SDK stores it in different places
      let deviceId = (window as any).MP_DEVICE_SESSION_ID || 
                     (window as any).deviceId || 
                     (window as any).MELI_DEVICE_ID ||
                     document.querySelector<HTMLInputElement>('input[name="deviceId"]')?.value ||
                     document.getElementById('deviceId')?.getAttribute('value') ||
                     null;
      
      // If still no device ID, try to get from MP SDK
      if (!deviceId) {
        try {
          const mpInstance = (window as any).MercadoPago;
          if (mpInstance && typeof mpInstance.getDeviceId === 'function') {
            deviceId = mpInstance.getDeviceId();
          }
        } catch (e) {
          console.warn('Could not get device ID from MP SDK:', e);
        }
      }
      
      console.log('Device ID for fraud prevention:', deviceId ? `captured (${deviceId.substring(0, 15)}...)` : 'NOT AVAILABLE - payment may go to manual review');

      // Send only the TOKEN to our backend - card data is secure (PCI compliant)
      const { data, error } = await supabase.functions.invoke('process-mp-payment', {
        body: {
          reserva_id: reservaId,
          token: tokenResponse.id,
          payment_method_id: paymentMethodId,
          installments: cardInstallments,
          payer_email: clientEmail,
          payer_name: clientName,
          payer_identification: {
            type: 'CPF',
            number: cleanCpf
          },
          transaction_amount: transactionAmount,
          description: `Reserva ${tourName}`,
          tour_id: tourId,
          tour_name: tourName,
          tour_description: tourDescription,
          quantity: quantity,
          unit_price: baseAmount / quantity,
          installment_fee_amount: feeAmount,
          installment_fee_percent: installmentFee,
          device_id: deviceId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      if (data.error) {
        console.error('Payment processing error:', data);
        throw new Error(translatePaymentError(data.error));
      }

      console.log('Payment response:', data);

      if (data.status === 'approved') {
        setPaymentStatus('approved');
        toast({
          title: "Pagamento aprovado!",
          description: "Sua reserva foi confirmada com sucesso."
        });
        setTimeout(() => onSuccess(totalAmount), 2000);
      } else if (data.status === 'pending' || data.status === 'in_process') {
        // Payment is under review - show pending status but allow user to close modal
        // Reservation was created but payment is not yet confirmed
        setPaymentStatus('pending');
        toast({
          title: "Pagamento em análise",
          description: "Seu pagamento está sendo analisado pelo Mercado Pago. Você receberá uma confirmação por e-mail quando for aprovado.",
          duration: 8000
        });
        // Do NOT auto-return to form - let user see confirmation and close manually
      } else if (data.status === 'rejected') {
        throw new Error(translatePaymentError(data.status_detail || 'Pagamento recusado'));
      } else {
        throw new Error(translatePaymentError(data.status_detail || 'Erro ao processar pagamento'));
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const message = error.message || 'Erro ao processar pagamento';
      setErrorMessage(translatePaymentError(message));
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const translatePaymentError = (error: string): string => {
    const translations: Record<string, string> = {
      'cc_rejected_high_risk': 'Pagamento recusado por segurança. Tente outro cartão ou entre em contato com seu banco.',
      'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão.',
      'cc_rejected_bad_filled_card_number': 'Número do cartão inválido.',
      'cc_rejected_bad_filled_date': 'Data de validade inválida.',
      'cc_rejected_bad_filled_security_code': 'Código de segurança (CVV) inválido.',
      'cc_rejected_bad_filled_other': 'Verifique os dados do cartão.',
      'cc_rejected_call_for_authorize': 'Ligue para sua operadora para autorizar esta compra.',
      'cc_rejected_card_disabled': 'Cartão desabilitado. Contate sua operadora.',
      'cc_rejected_duplicated_payment': 'Pagamento duplicado detectado. Aguarde alguns minutos.',
      'cc_rejected_max_attempts': 'Limite de tentativas excedido. Tente mais tarde.',
      'cc_rejected_other_reason': 'Cartão recusado. Tente outro cartão.',
      'diff_param_bins': 'Número do cartão inválido.',
      'Invalid transaction_amount': 'Valor mínimo para cartão é R$ 5,00.',
      'Parameter cardNumber can not be null/empty': 'Digite o número do cartão.',
      'invalid parameter cardExpirationYear': 'Ano de validade inválido.'
    };

    for (const [key, value] of Object.entries(translations)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return error;
  };

  const resetAndRetry = () => {
    setPaymentStatus('ready');
    setErrorMessage('');
  };

  if (paymentStatus === 'approved') {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-700 mb-2">Pagamento Aprovado!</h3>
          <p className="text-green-600">Sua reserva foi confirmada com sucesso.</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'pending') {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <Info className="h-10 w-10 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-amber-700 mb-2">Pagamento em Análise</h3>
          <p className="text-amber-600 mb-3">Seu pagamento está sendo analisado pelo Mercado Pago.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Sua reserva foi registrada!</strong><br />
              Você receberá um e-mail de confirmação assim que o pagamento for aprovado.
            </p>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Este processo geralmente leva alguns minutos. Em casos raros, pode levar até 24 horas.
          </p>
          <Button onClick={onBack} variant="outline" className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-2">Erro no Pagamento</h3>
          <p className="text-red-600 mb-4">{errorMessage}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline">Voltar</Button>
            <Button onClick={resetAndRetry}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando sistema de pagamento seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with MP Logo */}
      <div className="text-center space-y-2 pb-3 border-b">
        <div className="flex items-center justify-center gap-2 text-primary">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg font-bold">Pagamento com Cartão</h2>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
        {feeAmount > 0 && (
          <p className="text-xs text-amber-600">
            Valor base: {formatCurrency(baseAmount)} + Juros parcelamento: {formatCurrency(feeAmount)} ({installmentFee}%)
          </p>
        )}
        <p className="text-sm text-muted-foreground">{tourName}</p>
      </div>

      {/* Security badges + MP Logo */}
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <Shield className="h-4 w-4 text-green-600" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="h-4 w-4 text-green-600" />
          <span>Dados Seguros</span>
        </div>
        {/* Mercado Pago Official Logo */}
        <img 
          src={mercadoPagoLogo}
          alt="Mercado Pago" 
          className="h-6"
        />
      </div>

      {/* Card Form with Secure Fields */}
      <div className="space-y-4 relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="font-medium">Processando pagamento...</p>
              <p className="text-sm text-muted-foreground">Não feche esta página</p>
            </div>
          </div>
        )}

        {/* Card Number - Secure Field (PCI Compliance) */}
        <div>
          <Label className="text-sm text-gray-700">Número do Cartão</Label>
          <div className="mt-1 border border-input rounded-md bg-white h-10 relative [&>div]:absolute [&>div]:inset-0 [&>div>iframe]:!h-full [&>div>iframe]:!w-full">
            {sdkReady && (
              <CardNumber 
                placeholder="0000 0000 0000 0000"
                style={secureFieldStyle}
              />
            )}
          </div>
        </div>
        
        {/* Cardholder Name - Regular field (not sensitive) */}
        <div>
          <Label className="text-sm text-gray-700">Nome no Cartão</Label>
          <Input 
            placeholder="NOME COMO ESTÁ NO CARTÃO" 
            value={cardName} 
            onChange={e => setCardName(e.target.value.toUpperCase())} 
            className="mt-1 bg-white h-10" 
            autoComplete="cc-name" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Expiration Date - Secure Field (PCI Compliance) */}
          <div>
            <Label className="text-sm text-gray-700">Validade</Label>
            <div className="mt-1 border border-input rounded-md bg-white h-10 relative [&>div]:absolute [&>div]:inset-0 [&>div>iframe]:!h-full [&>div>iframe]:!w-full">
              {sdkReady && (
                <ExpirationDate 
                  placeholder="MM/AA"
                  style={secureFieldStyle}
                />
              )}
            </div>
          </div>
          
          {/* Security Code (CVV) - Secure Field (PCI Compliance) */}
          <div>
            <Label className="text-sm text-gray-700">CVV</Label>
            <div className="mt-1 border border-input rounded-md bg-white h-10 relative [&>div]:absolute [&>div]:inset-0 [&>div>iframe]:!h-full [&>div>iframe]:!w-full">
              {sdkReady && (
                <SecurityCode 
                  placeholder="123"
                  style={secureFieldStyle}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Installments - Regular field */}
        <div>
          <Label className="text-sm text-gray-700">Parcelas</Label>
          {(() => {
            const effectiveMaxInstallments = calculateMaxInstallments(baseAmount, installmentsMax);
            return (
              <>
                <select 
                  value={cardInstallments} 
                  onChange={e => setCardInstallments(Number(e.target.value))} 
                  className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  {Array.from({ length: effectiveMaxInstallments }, (_, i) => i + 1).map(n => {
                    const fee = INSTALLMENT_FEES[n] || 0;
                    const total = calculateInstallmentTotal(baseAmount, n);
                    const installmentValue = total / n;
                    const feeText = fee > 0 ? ` (+${fee}% juros)` : ' (sem juros)';
                    return (
                      <option key={n} value={n}>
                        {n}x de {formatCurrency(installmentValue)} = {formatCurrency(total)}{feeText}
                      </option>
                    );
                  })}
                </select>
                {effectiveMaxInstallments < installmentsMax && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Valor mínimo por parcela: R$ 5,00
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        className="w-full" 
        disabled={isProcessing || !cardName}
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          `Pagar ${formatCurrency(totalAmount)}`
        )}
      </Button>

      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="w-full" 
        onClick={onBack}
        disabled={isProcessing}
      >
        ← Voltar
      </Button>

      {/* Footer with MP branding */}
      <div className="text-center pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          Pagamento processado com segurança por
        </p>
        <img 
          src={mercadoPagoLogo}
          alt="Mercado Pago - Pagamento Seguro" 
          className="h-8 mx-auto mt-1"
        />
      </div>
    </div>
  );
}
