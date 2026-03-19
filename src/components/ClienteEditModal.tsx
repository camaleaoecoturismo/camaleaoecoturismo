import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, X } from "lucide-react";

interface Cliente {
  id: string;
  cpf: string;
  nome_completo: string;
  whatsapp: string;
  data_nascimento: string;
  email: string;
}

interface ClienteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onClienteUpdated: () => void;
}

export function ClienteEditModal({ isOpen, onClose, cliente, onClienteUpdated }: ClienteEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    whatsapp: '',
    whatsapp_country_code: '+55',
    data_nascimento: '',
    email: ''
  });
  const { toast } = useToast();

  React.useEffect(() => {
    if (cliente) {
      setFormData({
        nome_completo: cliente.nome_completo,
        whatsapp: cliente.whatsapp,
        whatsapp_country_code: (cliente as any).whatsapp_country_code || '+55',
        data_nascimento: cliente.data_nascimento,
        email: cliente.email
      });
    }
  }, [cliente]);


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!cliente) return;

    if (!formData.nome_completo || !formData.whatsapp || !formData.data_nascimento || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome_completo: formData.nome_completo,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          data_nascimento: formData.data_nascimento,
          email: formData.email
        })
        .eq('id', cliente.id);

      if (error) throw error;

      toast({
        title: "Cliente atualizado",
        description: "Os dados do cliente foram atualizados com sucesso.",
      });

      onClienteUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>CPF</Label>
            <Input value={cliente.cpf} disabled className="bg-muted" />
          </div>

          <div>
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => handleInputChange('nome_completo', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <PhoneInput
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(value) => handleInputChange('whatsapp', value)}
              countryCode={formData.whatsapp_country_code}
              onCountryCodeChange={(code) => handleInputChange('whatsapp_country_code', code)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}