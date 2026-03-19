import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  Users, Star, Award, Wallet, Search, ArrowUpDown, Eye, Send, Loader2,
  TrendingUp, Crown, Medal, Trophy
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ClientReport {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  whatsapp: string;
  tours_count: number;
  total_spent: number;
  total_points: number;
  badges_count: number;
  level_name: string | null;
  level_color: string | null;
  has_account: boolean;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  is_active: boolean;
}

interface LevelDefinition {
  id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  icon: string;
  color: string;
  benefits: string;
  order_index: number;
}

interface ClientReportsTabProps {
  viewMode?: string;
}

const ClientReportsTab = ({ viewMode = 'niveis' }: ClientReportsTabProps) => {
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'tours_count' | 'total_spent' | 'total_points'>('total_spent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all clients with reservations
    const { data: clientes } = await supabase
      .from('clientes')
      .select(`
        id,
        nome_completo,
        cpf,
        email,
        whatsapp
      `)
      .order('nome_completo');

    // Fetch client accounts
    const { data: accounts } = await supabase
      .from('client_accounts')
      .select('cliente_id, total_points');

    // Fetch all reservations grouped by client
    const { data: reservas } = await supabase
      .from('reservas')
      .select('cliente_id, valor_pago, status, payment_status');

    // Fetch badges
    const { data: badgesData } = await supabase
      .from('badge_definitions')
      .select('*')
      .order('requirement_value');

    // Fetch levels
    const { data: levelsData } = await supabase
      .from('level_definitions')
      .select('*')
      .order('order_index');

    // Fetch client badges count
    const { data: clientBadges } = await supabase
      .from('client_badges')
      .select('client_account_id');

    if (clientes && reservas) {
      const accountsMap = new Map(accounts?.map(a => [a.cliente_id, a]) || []);
      const badgesCountMap = new Map<string, number>();
      
      // Count badges per account
      if (clientBadges && accounts) {
        accounts.forEach(acc => {
          const count = clientBadges.filter(b => b.client_account_id === acc.cliente_id).length;
          badgesCountMap.set(acc.cliente_id, count);
        });
      }

      const clientReports: ClientReport[] = clientes.map(cliente => {
        const clienteReservas = reservas.filter(r => 
          r.cliente_id === cliente.id && 
          ['confirmada', 'confirmado'].includes(r.status) && 
          r.payment_status === 'pago'
        );
        
        const toursCount = clienteReservas.length;
        const totalSpent = clienteReservas.reduce((sum, r) => sum + (Number(r.valor_pago) || 0), 0);
        const account = accountsMap.get(cliente.id);
        const totalPoints = account?.total_points || 0;
        
        // Get level
        let levelName = null;
        let levelColor = null;
        if (levelsData) {
          const level = levelsData.find(l => 
            l.min_points <= totalPoints && (l.max_points === null || l.max_points >= totalPoints)
          );
          if (level) {
            levelName = level.name;
            levelColor = level.color;
          }
        }

        return {
          id: cliente.id,
          nome_completo: cliente.nome_completo,
          cpf: cliente.cpf,
          email: cliente.email,
          whatsapp: cliente.whatsapp,
          tours_count: toursCount,
          total_spent: totalSpent,
          total_points: totalPoints,
          badges_count: badgesCountMap.get(cliente.id) || 0,
          level_name: levelName,
          level_color: levelColor,
          has_account: !!account
        };
      }).filter(c => c.tours_count > 0); // Only show clients with completed tours

      setClients(clientReports);
    }

    if (badgesData) setBadges(badgesData);
    if (levelsData) setLevels(levelsData);
    setLoading(false);
  };

  const handleSort = (field: 'tours_count' | 'total_spent' | 'total_points') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredClients = clients
    .filter(c => 
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  const sendCommunication = async (clienteId: string) => {
    // Find client account
    const { data: account } = await supabase
      .from('client_accounts')
      .select('id')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (!account) {
      toast({
        title: "Cliente sem conta",
        description: "Este cliente ainda não criou uma conta na área do cliente.",
        variant: "destructive"
      });
      return;
    }

    // Send a sample communication
    const { error } = await supabase
      .from('client_communications')
      .insert({
        client_account_id: account.id,
        title: 'Obrigado por fazer parte!',
        message: 'Estamos muito felizes em ter você como cliente. Continue acompanhando nossos passeios!',
        type: 'info'
      });

    if (error) {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a comunicação.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Comunicação enviada!",
        description: "O cliente receberá a mensagem na área do cliente."
      });
    }
  };

  // Summary stats
  const totalClients = clients.length;
  const totalRevenue = clients.reduce((sum, c) => sum + c.total_spent, 0);
  const avgRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;
  const topClients = clients.filter(c => c.total_spent >= 1000).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render clients report
  const renderClientsReport = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  R$ {avgRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{topClients}</p>
                <p className="text-xs text-muted-foreground">Clientes Top</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Clientes</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('tours_count')}
                      className="h-8 px-2"
                    >
                      Passeios
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('total_spent')}
                      className="h-8 px-2"
                    >
                      Valor Gasto
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('total_points')}
                      className="h-8 px-2"
                    >
                      Pontos
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Selos</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.tours_count}</Badge>
                    </TableCell>
                    <TableCell>
                      R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {client.level_name ? (
                        <Badge style={{ backgroundColor: client.level_color + '20', color: client.level_color }}>
                          {client.level_name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {client.total_points}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-purple-500" />
                        {client.badges_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.has_account ? (
                        <Badge className="bg-emerald-500">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Sem conta</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => sendCommunication(client.id)}
                        title="Enviar comunicação"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render badges management
  const renderBadges = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Selos Configurados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div 
              key={badge.id}
              className="p-4 border rounded-lg flex items-start gap-3"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: badge.color + '20' }}
              >
                <Award className="w-6 h-6" style={{ color: badge.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{badge.name}</p>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {badge.requirement_type}: {badge.requirement_value}
                  </Badge>
                  <Badge className="bg-amber-500 text-xs">
                    +{badge.points_reward} pts
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Render levels management
  const renderLevels = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Níveis Configurados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {levels.map((level, idx) => (
            <div 
              key={level.id}
              className="p-4 border rounded-lg flex items-center gap-4"
              style={{ borderColor: level.color }}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: level.color }}
              >
                <span className="text-white font-bold">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: level.color }}>
                  {level.name}
                </p>
                <p className="text-sm text-muted-foreground">{level.benefits}</p>
                <Badge variant="outline" className="mt-1">
                  {level.min_points} - {level.max_points || '∞'} pontos
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Render points info
  const renderPoints = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Sistema de Pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Como funciona</h4>
          <p className="text-sm text-muted-foreground">
            Cada R$10 gastos em passeios = 1 ponto. Os pontos são automaticamente calculados quando o pagamento é confirmado.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <p className="text-2xl font-bold text-primary">{clients.reduce((sum, c) => sum + c.total_points, 0)}</p>
            <p className="text-sm text-muted-foreground">Total de pontos distribuídos</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-2xl font-bold text-primary">{clients.filter(c => c.total_points > 0).length}</p>
            <p className="text-sm text-muted-foreground">Clientes com pontos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render rewards info
  const renderRewards = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Recompensas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Sistema de Recompensas</h4>
          <p className="text-sm text-muted-foreground">
            Clientes acumulam pontos e selos ao participar de passeios. Os níveis desbloqueiam benefícios exclusivos.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <Trophy className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="font-semibold">{levels.length}</p>
            <p className="text-sm text-muted-foreground">Níveis disponíveis</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <Award className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <p className="font-semibold">{badges.length}</p>
            <p className="text-sm text-muted-foreground">Selos disponíveis</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <Star className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="font-semibold">{badges.reduce((sum, b) => sum + b.points_reward, 0)}</p>
            <p className="text-sm text-muted-foreground">Pontos em selos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render content based on viewMode
  const renderContent = () => {
    switch (viewMode) {
      case 'niveis':
        return renderLevels();
      case 'selos':
        return renderBadges();
      case 'pontos':
        return renderPoints();
      case 'recompensas':
        return renderRewards();
      default:
        return renderLevels();
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default ClientReportsTab;
