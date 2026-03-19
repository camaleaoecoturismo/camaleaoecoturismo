import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, User, Phone, Edit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ClienteEditModal } from '@/components/ClienteEditModal';

interface Cliente {
  id: string;
  nome_completo: string;
  whatsapp: string;
  email: string;
  cpf: string;
  data_nascimento: string;
}

interface Reserva {
  id: string;
  status: string;
  data_reserva: string;
  cliente: Cliente;
  tour: {
    id: string;
    name: string;
    start_date: string;
  };
  ponto_embarque: {
    nome: string;
  };
  problema_saude: boolean;
  descricao_problema_saude?: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
}

interface Tour {
  id: string;
  name: string;
}

const ReservasAdmin = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [filteredReservas, setFilteredReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteEditModal, setClienteEditModal] = useState<{ isOpen: boolean; cliente: Cliente | null }>({
    isOpen: false,
    cliente: null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReservas();
    fetchTours();
  }, []);

  useEffect(() => {
    filterReservas();
  }, [reservas, selectedTour, searchTerm]);

  const fetchReservas = async () => {
    try {
      // Use the secure function instead of the view
      const { data, error } = await supabase.rpc('get_reservas_completa');

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = data?.map(reserva => ({
        id: reserva.id,
        status: reserva.status,
        data_reserva: reserva.data_reserva,
        problema_saude: reserva.problema_saude,
        descricao_problema_saude: reserva.descricao_problema_saude,
        contato_emergencia_nome: reserva.contato_emergencia_nome,
        contato_emergencia_telefone: reserva.contato_emergencia_telefone,
        cliente: {
          id: reserva.id,
          nome_completo: reserva.nome_completo,
          whatsapp: reserva.cliente_whatsapp,
          email: reserva.email,
          cpf: reserva.cpf,
          data_nascimento: reserva.data_nascimento
        },
        tour: {
          id: reserva.id,
          name: reserva.tour_nome,
          start_date: reserva.tour_data_inicio
        },
        ponto_embarque: {
          nome: reserva.ponto_embarque_nome
        }
      })) || [];
      
      setReservas(transformedData as any);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar reservas",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTours(data || []);
    } catch (error) {
      console.error('Erro ao carregar tours:', error);
    }
  };

  const filterReservas = () => {
    let filtered = reservas;

    // Filtro por passeio
    if (selectedTour !== 'all') {
      filtered = filtered.filter(reserva => reserva.tour.id === selectedTour);
    }

    // Filtro por busca (nome, email ou CPF)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(reserva => 
        reserva.cliente.nome_completo.toLowerCase().includes(term) ||
        reserva.cliente.email.toLowerCase().includes(term) ||
        reserva.cliente.cpf.includes(term) ||
        reserva.tour.name.toLowerCase().includes(term)
      );
    }

    setFilteredReservas(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pendente': 'pending' as const,
      'confirmado': 'confirmed' as const,
      'cancelado': 'cancelled' as const,
    };
    return variants[status as keyof typeof variants] || 'pending';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg">Carregando reservas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservas.filter(r => r.status === 'pendente').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservas.filter(r => r.status === 'confirmado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservas.filter(r => {
                const today = new Date().toDateString();
                return new Date(r.data_reserva).toDateString() === today;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Passeio</label>
              <Select value={selectedTour} onValueChange={setSelectedTour}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os passeios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os passeios</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Reservas */}
      {filteredReservas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {reservas.length === 0 
                ? "Nenhuma reserva encontrada." 
                : "Nenhuma reserva corresponde aos filtros aplicados."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Reservas dos Clientes ({filteredReservas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Passeio</TableHead>
                    <TableHead>Data da Reserva</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Ponto Embarque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Saúde</TableHead>
                    <TableHead>Emergência</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservas.map((reserva) => (
                    <TableRow key={reserva.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{reserva.cliente.nome_completo}</div>
                          <div className="text-sm text-muted-foreground">{reserva.cliente.email}</div>
                          <div className="text-sm text-muted-foreground">CPF: {reserva.cliente.cpf}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{reserva.tour.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(reserva.tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(reserva.data_reserva).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a 
                            href={`https://wa.me/55${reserva.cliente.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:underline text-sm"
                          >
                            <Phone className="h-3 w-3" />
                            {reserva.cliente.whatsapp}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{reserva.ponto_embarque.nome}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(reserva.status)}>
                          {reserva.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reserva.problema_saude ? (
                          <div className="space-y-1">
                            <Badge variant="late">Sim</Badge>
                            {reserva.descricao_problema_saude && (
                              <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={reserva.descricao_problema_saude}>
                                {reserva.descricao_problema_saude}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="paid">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{reserva.contato_emergencia_nome} - {reserva.contato_emergencia_telefone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                                onClick={() => setClienteEditModal({ isOpen: true, cliente: reserva.cliente })}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar dados do participante</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição de Cliente */}
      <ClienteEditModal
        isOpen={clienteEditModal.isOpen}
        onClose={() => setClienteEditModal({ isOpen: false, cliente: null })}
        cliente={clienteEditModal.cliente}
        onClienteUpdated={fetchReservas}
      />
    </div>
  );
};

export default ReservasAdmin;