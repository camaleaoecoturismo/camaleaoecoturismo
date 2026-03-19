import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Star, Award, Wallet, ArrowRight, Calendar, TrendingUp,
  Trophy, Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDashboardProps {
  clientData: {
    id: string;
    cliente_id: string;
    total_points: number;
    cliente: {
      nome_completo: string;
    };
    level: {
      name: string;
      color: string;
      benefits: string;
    } | null;
  };
  onNavigate: (tab: string) => void;
}

interface Stats {
  toursCount: number;
  totalSpent: number;
  badgesCount: number;
  nextTour: {
    name: string;
    date: string;
  } | null;
  recentBadge: {
    name: string;
    color: string;
  } | null;
}

const ClientDashboard = ({ clientData, onNavigate }: ClientDashboardProps) => {
  const [stats, setStats] = useState<Stats>({
    toursCount: 0,
    totalSpent: 0,
    badgesCount: 0,
    nextTour: null,
    recentBadge: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Get completed tours
      const { data: reservas } = await supabase
        .from('reservas')
        .select(`
          valor_pago,
          tours!reservas_tour_id_fkey (
            name,
            start_date
          )
        `)
        .eq('cliente_id', clientData.cliente_id)
        .in('status', ['confirmada', 'confirmado'])
        .eq('payment_status', 'pago');

      const toursCount = reservas?.length || 0;
      const totalSpent = reservas?.reduce((sum, r) => sum + (Number(r.valor_pago) || 0), 0) || 0;

      // Get badges count
      const { count: badgesCount } = await supabase
        .from('client_badges')
        .select('id', { count: 'exact', head: true })
        .eq('client_account_id', clientData.id);

      // Get next upcoming tour
      const { data: upcomingReservas } = await supabase
        .from('reservas')
        .select(`
          tours!reservas_tour_id_fkey (
            name,
            start_date
          )
        `)
        .eq('cliente_id', clientData.cliente_id)
        .in('status', ['confirmada', 'confirmado', 'pendente'])
        .gte('tours.start_date', new Date().toISOString().split('T')[0])
        .order('tours(start_date)', { ascending: true })
        .limit(1);

      const nextTour = upcomingReservas && upcomingReservas.length > 0 && upcomingReservas[0].tours
        ? {
            name: (upcomingReservas[0].tours as any).name,
            date: (upcomingReservas[0].tours as any).start_date
          }
        : null;

      // Get most recent badge
      const { data: recentBadges } = await supabase
        .from('client_badges')
        .select(`
          badge_definitions!client_badges_badge_id_fkey (
            name,
            color
          )
        `)
        .eq('client_account_id', clientData.id)
        .order('earned_at', { ascending: false })
        .limit(1);

      const recentBadge = recentBadges && recentBadges.length > 0 && recentBadges[0].badge_definitions
        ? {
            name: (recentBadges[0].badge_definitions as any).name,
            color: (recentBadges[0].badge_definitions as any).color
          }
        : null;

      setStats({
        toursCount,
        totalSpent,
        badgesCount: badgesCount || 0,
        nextTour,
        recentBadge
      });
      setLoading(false);
    };

    fetchStats();
  }, [clientData.id, clientData.cliente_id]);

  // Calculate progress to next level
  const levels = [
    { name: 'Explorador', min: 0, max: 99 },
    { name: 'Aventureiro', min: 100, max: 299 },
    { name: 'Desbravador', min: 300, max: 599 },
    { name: 'Expedicionário', min: 600, max: 999 },
    { name: 'Lenda Camaleão', min: 1000, max: null }
  ];

  const currentLevelIndex = levels.findIndex(l => 
    l.min <= clientData.total_points && (l.max === null || l.max >= clientData.total_points)
  );
  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1];
  
  let progressPercent = 100;
  let pointsToNextLevel = 0;
  if (nextLevel && currentLevel.max) {
    const levelRange = currentLevel.max - currentLevel.min;
    const pointsInLevel = clientData.total_points - currentLevel.min;
    progressPercent = Math.min(100, (pointsInLevel / levelRange) * 100);
    pointsToNextLevel = nextLevel.min - clientData.total_points;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                Olá, {clientData.cliente.nome_completo.split(' ')[0]}! 👋
              </h1>
              <p className="text-primary-foreground/80 mt-1">
                Bem-vindo à sua área do cliente
              </p>
            </div>
            {clientData.level && (
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
                <Trophy className="w-8 h-8" />
                <div>
                  <p className="text-xs opacity-80">Seu nível</p>
                  <p className="font-bold">{clientData.level.name}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('experiencias')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.toursCount}</p>
                <p className="text-xs text-muted-foreground">Passeios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('pontuacao')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientData.total_points}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('selos')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.badgesCount}</p>
                <p className="text-xs text-muted-foreground">Selos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('pagamentos')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">Investido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Next Level */}
      {nextLevel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Progresso para o próximo nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{currentLevel.name}</span>
                <span className="font-medium">{nextLevel.name}</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                Faltam <span className="font-semibold text-primary">{pointsToNextLevel} pontos</span> para o próximo nível
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Next Tour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Próxima Aventura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.nextTour ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{stats.nextTour.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(stats.nextTour.date), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigate('experiencias')}>
                  Ver detalhes
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">Nenhuma aventura agendada</p>
                <Button size="sm" className="mt-2" onClick={() => window.location.href = '/'}>
                  Explorar passeios
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Conquista Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentBadge ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: stats.recentBadge.color + '20' }}
                  >
                    <Award className="w-5 h-5" style={{ color: stats.recentBadge.color }} />
                  </div>
                  <p className="font-medium">{stats.recentBadge.name}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigate('selos')}>
                  Ver todos
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">Complete seu primeiro passeio para ganhar selos!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Benefits */}
      {clientData.level?.benefits && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Star className="w-4 h-4" />
              Benefícios do seu nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-900">{clientData.level.benefits}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;
