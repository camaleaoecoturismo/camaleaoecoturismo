import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourName: string;
}

export function WaitlistModal({ open, onOpenChange, tourId, tourName }: WaitlistModalProps) {
  const [step, setStep] = useState<'info' | 'form' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    numero_vagas: 1,
    whatsapp: ''
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setStep('info');
      setFormData({ nome_completo: '', numero_vagas: 1, whatsapp: '' });
    }
    onOpenChange(newOpen);
  };

  const formatWhatsApp = (value: string) => {
    // Remove non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_completo.trim()) {
      toast.error('Por favor, informe seu nome completo');
      return;
    }
    
    if (formData.numero_vagas < 1) {
      toast.error('Por favor, informe o número de vagas desejadas');
      return;
    }
    
    const whatsappNumbers = formData.whatsapp.replace(/\D/g, '');
    if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) {
      toast.error('Por favor, informe um WhatsApp válido com DDD');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist_entries')
        .insert({
          tour_id: tourId,
          nome_completo: formData.nome_completo.trim(),
          numero_vagas: formData.numero_vagas,
          whatsapp: whatsappNumbers,
          status: 'pendente'
        });

      if (error) throw error;

      setStep('success');
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      toast.error('Erro ao entrar na lista de espera. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {step === 'info' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-center text-xl">Vagas Encerradas</DialogTitle>
              <DialogDescription className="text-center pt-2">
                As vagas para <strong className="text-foreground">{tourName}</strong> estão encerradas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-center text-muted-foreground text-sm">
                Caso surjam vagas, podemos entrar em contato com você!
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setStep('form')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Entrar na lista de espera
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Lista de Espera</DialogTitle>
              <DialogDescription className="text-center pt-2">
                Preencha seus dados para entrar na lista de espera de <strong className="text-foreground">{tourName}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome completo *</Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-center block">Número de vagas desejadas *</Label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, numero_vagas: Math.max(1, prev.numero_vagas - 1) }))}
                    className="w-12 h-12 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-bold text-2xl transition-colors flex items-center justify-center"
                    disabled={formData.numero_vagas <= 1}
                  >
                    −
                  </button>
                  <div className="text-center min-w-[60px]">
                    <span className="text-3xl font-bold text-primary">{formData.numero_vagas}</span>
                    <p className="text-sm text-muted-foreground">{formData.numero_vagas === 1 ? 'vaga' : 'vagas'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, numero_vagas: Math.min(20, prev.numero_vagas + 1) }))}
                    className="w-12 h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-2xl transition-colors flex items-center justify-center"
                    disabled={formData.numero_vagas >= 20}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (com DDD) *</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: formatWhatsApp(e.target.value) }))}
                  placeholder="(82) 99999-9999"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Confirmar entrada na lista'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setStep('info')}
                  className="w-full"
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="text-center text-xl">Você está na lista!</DialogTitle>
              <DialogDescription className="text-center pt-2">
                Você entrou na lista de espera para <strong className="text-foreground">{tourName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-center text-muted-foreground text-sm">
                Caso surjam vagas, entraremos em contato pelo WhatsApp informado.
              </p>
              <Button 
                onClick={() => handleOpenChange(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
