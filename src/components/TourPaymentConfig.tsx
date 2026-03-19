import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, MessageCircle, Wallet, Loader2 } from 'lucide-react';

interface TourPaymentConfigProps {
  tourId: string;
  onConfigChange?: (config: {
    payment_mode: string;
  }) => void;
}

export const TourPaymentConfig = ({
  tourId,
  onConfigChange
}: TourPaymentConfigProps) => {
  const [paymentMode, setPaymentMode] = useState<string>('whatsapp');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch current config from database on mount
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('payment_mode')
        .eq('id', tourId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setPaymentMode(data.payment_mode || 'whatsapp');
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tours')
        .update({
          payment_mode: paymentMode
        })
        .eq('id', tourId);

      if (error) throw error;

      toast({ title: "Configurações de pagamento salvas" });
      
      if (onConfigChange) {
        onConfigChange({
          payment_mode: paymentMode
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5" />
          Configurações de Pagamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina como o cliente pode pagar por este passeio
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Método de Pagamento</Label>
          <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="space-y-2">
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="whatsapp" id="whatsapp" />
              <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer flex-1">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Combinar pagamento pelo WhatsApp (PIX parcelado)</p>
                  <p className="text-xs text-muted-foreground">Cliente combina parcelamento via WhatsApp com nossa atendente</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="mercadopago" id="mercadopago" />
              <Label htmlFor="mercadopago" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Apenas InfinitePay</p>
                  <p className="text-xs text-muted-foreground">Cliente paga diretamente via PIX ou Cartão</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer flex-1">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">+</span>
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Ambos (Cliente escolhe)</p>
                  <p className="text-xs text-muted-foreground">Cliente pode pagar via InfinitePay ou combinar pagamento pelo WhatsApp (PIX parcelado)</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Salvando...' : 'Salvar Configurações de Pagamento'}
        </Button>
      </CardContent>
    </Card>
  );
};
