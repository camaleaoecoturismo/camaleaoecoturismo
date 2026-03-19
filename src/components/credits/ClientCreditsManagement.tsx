import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Plus, FileText, Tag, Wallet, Phone, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatarCPF, formatarTelefone } from '@/lib/utils';
import { AddCreditModal } from './AddCreditModal';
import { CreditHistoryModal } from './CreditHistoryModal';
import { GenerateCouponModal } from './GenerateCouponModal';

interface ClientWithCredits {
  id: string;
  nome_completo: string;
  cpf: string;
  whatsapp: string;
  credit_balance: number;
  last_transaction_date: string | null;
}

const ClientCreditsManagement: React.FC = () => {
  const [clients, setClients] = useState<ClientWithCredits[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithCredits[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithCredits | null>(null);
  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientsWithCredits();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

  const fetchClientsWithCredits = async () => {
    try {
      setLoading(true);
      
      // Fetch all clients that have credit transactions
      const { data: creditsData, error: creditsError } = await supabase
        .from('client_credits')
        .select(`
          cliente_id,
          amount,
          transaction_type,
          created_at,
          clientes!client_credits_cliente_id_fkey (
            id,
            nome_completo,
            cpf,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (creditsError) throw creditsError;

      // Calculate balance per client
      const clientMap = new Map<string, ClientWithCredits>();
      
      (creditsData || []).forEach((credit: any) => {
        if (!credit.clientes) return;
        
        const clientId = credit.cliente_id;
        const existing = clientMap.get(clientId);
        
        const amountDelta = credit.transaction_type === 'credit' 
          ? Number(credit.amount) 
          : -Number(credit.amount);
        
        if (existing) {
          existing.credit_balance += amountDelta;
          if (!existing.last_transaction_date || credit.created_at > existing.last_transaction_date) {
            existing.last_transaction_date = credit.created_at;
          }
        } else {
          clientMap.set(clientId, {
            id: credit.clientes.id,
            nome_completo: credit.clientes.nome_completo,
            cpf: credit.clientes.cpf,
            whatsapp: credit.clientes.whatsapp,
            credit_balance: amountDelta,
            last_transaction_date: credit.created_at
          });
        }
      });
      
      const clientsArray = Array.from(clientMap.values())
        .sort((a, b) => {
          // Sort by last transaction date, most recent first
          if (!a.last_transaction_date) return 1;
          if (!b.last_transaction_date) return -1;
          return new Date(b.last_transaction_date).getTime() - new Date(a.last_transaction_date).getTime();
        });
      
      setClients(clientsArray);
    } catch (error: any) {
      console.error('Error fetching clients with credits:', error);
      toast({
        title: 'Erro ao carregar créditos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = clients.filter(client => {
      const nome = client.nome_completo?.toLowerCase() || '';
      const cpf = client.cpf?.replace(/\D/g, '') || '';
      const whatsapp = client.whatsapp?.replace(/\D/g, '') || '';
      const searchCpf = term.replace(/\D/g, '');
      
      return nome.includes(term) || 
             cpf.includes(searchCpf) || 
             whatsapp.includes(searchCpf);
    });
    
    setFilteredClientes(filtered);
  };

  const setFilteredClientes = setFilteredClients;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleAddCreditClick = (client?: ClientWithCredits) => {
    setSelectedClient(client || null);
    setAddCreditOpen(true);
  };

  const handleHistoryClick = (client: ClientWithCredits) => {
    setSelectedClient(client);
    setHistoryOpen(true);
  };

  const handleGenerateCouponClick = (client: ClientWithCredits) => {
    if (client.credit_balance <= 0) {
      toast({
        title: 'Sem saldo',
        description: 'Este cliente não possui saldo de crédito disponível.',
        variant: 'destructive'
      });
      return;
    }
    setSelectedClient(client);
    setCouponOpen(true);
  };

  const totalCreditsAvailable = clients.reduce((sum, c) => sum + Math.max(0, c.credit_balance), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Créditos</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCreditsAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes com Crédito</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.credit_balance > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={() => handleAddCreditClick()}
              className="w-full h-full min-h-[60px]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Crédito
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search and List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Créditos de Clientes</span>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum crédito cadastrado ainda.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.nome_completo}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                      {client.cpf && (
                        <span>{formatarCPF(client.cpf)}</span>
                      )}
                      {client.whatsapp && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatarTelefone(client.whatsapp)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Última movimentação: {formatDate(client.last_transaction_date)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={client.credit_balance > 0 ? 'default' : 'secondary'}
                      className="text-base px-3 py-1"
                    >
                      {formatCurrency(client.credit_balance)}
                    </Badge>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHistoryClick(client)}
                        title="Ver extrato"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCreditClick(client)}
                        title="Adicionar crédito"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateCouponClick(client)}
                        title="Gerar cupom"
                        disabled={client.credit_balance <= 0}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddCreditModal
        open={addCreditOpen}
        onOpenChange={setAddCreditOpen}
        preselectedClient={selectedClient}
        onSuccess={() => {
          fetchClientsWithCredits();
          setAddCreditOpen(false);
        }}
      />

      {selectedClient && (
        <>
          <CreditHistoryModal
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            clientId={selectedClient.id}
            clientName={selectedClient.nome_completo}
            onDataChange={fetchClientsWithCredits}
          />
          
          <GenerateCouponModal
            open={couponOpen}
            onOpenChange={setCouponOpen}
            client={selectedClient}
            onSuccess={() => {
              fetchClientsWithCredits();
              setCouponOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
};

export default ClientCreditsManagement;
