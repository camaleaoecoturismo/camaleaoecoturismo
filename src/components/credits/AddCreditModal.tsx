import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserPlus, User, Calendar, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatarCPF, formatarTelefone, validarCPF, validarTelefone } from '@/lib/utils';

interface Cliente {
  id: string;
  nome_completo: string;
  cpf: string;
  whatsapp: string;
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
}

interface AddCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClient?: { id: string; nome_completo: string } | null;
  onSuccess: () => void;
}

export const AddCreditModal: React.FC<AddCreditModalProps> = ({
  open,
  onOpenChange,
  preselectedClient,
  onSuccess
}) => {
  const [step, setStep] = useState<'search' | 'create' | 'form'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [allClients, setAllClients] = useState<Cliente[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');

  // Credit form
  const [selectedTourId, setSelectedTourId] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [percentageApplied, setPercentageApplied] = useState('100');
  const [reason, setReason] = useState('');

  const calculatedCredit = React.useMemo(() => {
    const original = parseFloat(originalValue) || 0;
    const percentage = parseFloat(percentageApplied) || 100;
    return (original * percentage) / 100;
  }, [originalValue, percentageApplied]);

  useEffect(() => {
    if (open) {
      fetchTours();
      fetchAllClients();
      if (preselectedClient) {
        setSelectedClient({
          id: preselectedClient.id,
          nome_completo: preselectedClient.nome_completo,
          cpf: '',
          whatsapp: ''
        });
        setStep('form');
      } else {
        resetForm();
      }
    }
  }, [open, preselectedClient]);

  // Filter clients when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(allClients);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, '');

    const filtered = allClients.filter(client => {
      const nome = client.nome_completo?.toLowerCase() || '';
      const cpf = client.cpf?.replace(/\D/g, '') || '';
      const whatsapp = client.whatsapp?.replace(/\D/g, '') || '';

      return nome.includes(term) || 
             (cleanTerm && cpf.includes(cleanTerm)) || 
             (cleanTerm && whatsapp.includes(cleanTerm));
    });

    setFilteredClients(filtered);
  }, [searchTerm, allClients]);

  const fetchAllClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_completo, cpf, whatsapp')
        .order('nome_completo', { ascending: true });

      if (error) throw error;
      setAllClients(data || []);
      setFilteredClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSearchTerm('');
    setSelectedClient(null);
    setNewClientName('');
    setNewClientWhatsapp('');
    setNewClientCpf('');
    setSelectedTourId('');
    setCancellationDate('');
    setOriginalValue('');
    setPercentageApplied('100');
    setReason('');
  };

  const fetchTours = async () => {
    const { data } = await supabase
      .from('tours')
      .select('id, name, start_date')
      .order('start_date', { ascending: false });
    setTours(data || []);
  };

  const handleSelectClient = (client: Cliente) => {
    setSelectedClient(client);
    setStep('form');
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientWhatsapp.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Nome e WhatsApp são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    if (!validarTelefone(newClientWhatsapp)) {
      toast({
        title: 'WhatsApp inválido',
        description: 'Informe um número válido.',
        variant: 'destructive'
      });
      return;
    }

    if (newClientCpf && !validarCPF(newClientCpf)) {
      toast({
        title: 'CPF inválido',
        description: 'Informe um CPF válido ou deixe em branco.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Generate a placeholder CPF if not provided (required field)
      const cpfToUse = newClientCpf.replace(/\D/g, '') || `TEMP${Date.now()}`;
      
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome_completo: newClientName.trim(),
          whatsapp: newClientWhatsapp.replace(/\D/g, ''),
          cpf: cpfToUse,
          email: `placeholder-${Date.now()}@temp.com`,
          data_nascimento: '2000-01-01'
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedClient(data);
      setStep('form');
      toast({
        title: 'Cliente criado',
        description: 'Cliente cadastrado com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredit = async () => {
    if (!selectedClient) return;

    if (!originalValue || parseFloat(originalValue) <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe o valor original pago.',
        variant: 'destructive'
      });
      return;
    }

    if (calculatedCredit <= 0) {
      toast({
        title: 'Crédito inválido',
        description: 'O valor do crédito deve ser maior que zero.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get tour name if selected
      let tourName = null;
      if (selectedTourId) {
        const tour = tours.find(t => t.id === selectedTourId);
        tourName = tour?.name || null;
      }

      const { error } = await supabase
        .from('client_credits')
        .insert({
          cliente_id: selectedClient.id,
          tour_id: selectedTourId || null,
          tour_name: tourName,
          transaction_type: 'credit',
          amount: calculatedCredit,
          original_value: parseFloat(originalValue),
          percentage_applied: parseFloat(percentageApplied),
          cancellation_date: cancellationDate || null,
          reason: reason.trim() || null,
          created_by: user?.id || null
        });

      if (error) throw error;

      toast({
        title: 'Crédito adicionado',
        description: `R$ ${calculatedCredit.toFixed(2)} de crédito adicionado para ${selectedClient.nome_completo}.`
      });
      
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar crédito',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' && 'Selecionar Cliente'}
            {step === 'create' && 'Cadastrar Novo Cliente'}
            {step === 'form' && 'Adicionar Crédito'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome, CPF ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando clientes...
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredClients.slice(0, 50).map((client) => (
                  <Card
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectClient(client)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{client.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.cpf && formatarCPF(client.cpf)}
                            {client.cpf && client.whatsapp && ' • '}
                            {client.whatsapp && formatarTelefone(client.whatsapp)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredClients.length > 50 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    Mostrando 50 de {filteredClients.length} clientes. Use a busca para filtrar.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep('create')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar Novo Cliente
            </Button>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={newClientWhatsapp}
                onChange={(e) => setNewClientWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>CPF (opcional)</Label>
              <Input
                value={newClientCpf}
                onChange={(e) => setNewClientCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('search')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleCreateClient} disabled={saving} className="flex-1">
                {saving ? 'Salvando...' : 'Cadastrar e Continuar'}
              </Button>
            </div>
          </div>
        )}

        {step === 'form' && selectedClient && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedClient.nome_completo}</p>
                    {!preselectedClient && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setStep('search')}
                      >
                        Trocar cliente
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Passeio Relacionado</Label>
              <Select value={selectedTourId} onValueChange={setSelectedTourId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o passeio (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.name} - {new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data do Cancelamento
              </Label>
              <Input
                type="date"
                value={cancellationDate}
                onChange={(e) => setCancellationDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Pago Original (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={originalValue}
                  onChange={(e) => setOriginalValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Percentual Aplicado
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={percentageApplied}
                  onChange={(e) => setPercentageApplied(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Valor do Crédito</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {calculatedCredit.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Motivo / Observação</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo do crédito..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCredit}
                disabled={saving || calculatedCredit <= 0}
                className="flex-1"
              >
                {saving ? 'Salvando...' : 'Salvar Crédito'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
