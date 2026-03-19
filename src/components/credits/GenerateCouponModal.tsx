import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GenerateCouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    nome_completo: string;
    credit_balance: number;
  };
  onSuccess: () => void;
}

export const GenerateCouponModal: React.FC<GenerateCouponModalProps> = ({
  open,
  onOpenChange,
  client,
  onSuccess
}) => {
  const [couponValue, setCouponValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const maxValue = client.credit_balance;

  const generateCouponCode = () => {
    const prefix = 'CRED';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  const handleGenerate = async () => {
    const value = parseFloat(couponValue);
    
    if (!value || value <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero.',
        variant: 'destructive'
      });
      return;
    }

    if (value > maxValue) {
      toast({
        title: 'Saldo insuficiente',
        description: `O valor máximo disponível é R$ ${maxValue.toFixed(2)}.`,
        variant: 'destructive'
      });
      return;
    }

    const code = couponCode.trim().toUpperCase() || generateCouponCode();

    setGenerating(true);
    try {
      // Check if code already exists
      const { data: existingCoupon } = await supabase
        .from('coupons')
        .select('id')
        .eq('codigo', code)
        .single();

      if (existingCoupon) {
        toast({
          title: 'Código já existe',
          description: 'Este código de cupom já está em uso. Escolha outro.',
          variant: 'destructive'
        });
        setGenerating(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Create the coupon (linked to client, but NO debit yet - debit happens when coupon is used)
      const { data: newCoupon, error: couponError } = await supabase
        .from('coupons')
        .insert({
          codigo: code,
          tipo: 'valor_fixo',
          valor: value,
          ativo: true,
          cliente_id: client.id,
          is_credit_coupon: true,
          credit_remaining: value
        })
        .select()
        .single();

      if (couponError) throw couponError;

      setGeneratedCoupon(code);
      toast({
        title: 'Cupom gerado!',
        description: `Cupom ${code} criado com valor de R$ ${value.toFixed(2)}. O crédito será debitado quando o cupom for usado.`
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar cupom',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedCoupon) {
      navigator.clipboard.writeText(generatedCoupon);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Código do cupom copiado para a área de transferência.'
      });
    }
  };

  const handleClose = () => {
    if (generatedCoupon) {
      onSuccess();
    }
    setCouponValue('');
    setCouponCode('');
    setGeneratedCoupon(null);
    setCopied(false);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerar Cupom de Crédito
          </DialogTitle>
          <DialogDescription>
            Gere um cupom de desconto exclusivo para {client.nome_completo}
          </DialogDescription>
        </DialogHeader>

        {!generatedCoupon ? (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo Disponível:</span>
                  <Badge variant="default" className="text-base">
                    {formatCurrency(maxValue)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Valor do Cupom (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={maxValue}
                value={couponValue}
                onChange={(e) => setCouponValue(e.target.value)}
                placeholder={`Máximo: ${maxValue.toFixed(2)}`}
              />
              {parseFloat(couponValue) > maxValue && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Valor excede o saldo disponível
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Código do Cupom (opcional)</Label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Deixe em branco para gerar automaticamente"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Se não informado, um código será gerado automaticamente.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !couponValue || parseFloat(couponValue) > maxValue}
                className="flex-1"
              >
                {generating ? 'Gerando...' : 'Gerar Cupom'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-700 mb-2">
                  Cupom Gerado com Sucesso!
                </p>
                <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border">
                  <span className="text-2xl font-mono font-bold">{generatedCoupon}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Valor: {formatCurrency(parseFloat(couponValue))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este cupom é exclusivo para {client.nome_completo}
                </p>
              </CardContent>
            </Card>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
