import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, TrendingUp, TrendingDown, Gift, Award, Target, Loader2,
  Compass, Map, Mountain, Globe, Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPointsProps {
  clientAccountId: string;
  totalPoints: number;
  level: {
    name: string;
    color: string;
    benefits: string;
  } | null;
}

interface PointsHistory {
  id: string;
  points: number;
  description: string;
  transaction_type: string;
  created_at: string;
}

interface LevelDefinition {
  name: string;
  min_points: number;
  max_points: number | null;
  icon: string;
  color: string;
  benefits: string;
}

const levelIconMap: Record<string, React.ComponentType<any>> = {
  compass: Compass,
  map: Map,
  mountain: Mountain,
  globe: Globe,
  crown: Crown,
  star: Star
};

const ClientPoints = ({ clientAccountId, totalPoints, level }: ClientPointsProps) => {
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch points history
      const { data: pointsData } = await supabase
        .from('client_points_history')
        .select('*')
        .eq('client_account_id', clientAccountId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch level definitions
      const { data: levelsData } = await supabase
        .from('level_definitions')
        .select('*')
        .order('order_index', { ascending: true });

      if (pointsData) setHistory(pointsData);
      if (levelsData) setLevels(levelsData);
      setLoading(false);
    };

    fetchData();
  }, [clientAccountId]);

  const getCurrentLevelIndex = () => {
    return levels.findIndex(l => 
      l.min_points <= totalPoints && (l.max_points === null || l.max_points >= totalPoints)
    );
  };

  const getTransactionIcon = (type: string, points: number) => {
    if (points > 0) {
      return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'earned':
        return <Badge className="bg-emerald-500 text-xs">Passeio</Badge>;
      case 'bonus':
        return <Badge className="bg-amber-500 text-xs">Bônus</Badge>;
      case 'redeemed':
        return <Badge className="bg-blue-500 text-xs">Resgate</Badge>;
      case 'adjusted':
        return <Badge variant="secondary" className="text-xs">Ajuste</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentLevelIndex = getCurrentLevelIndex();
  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1];

  return (
    <div className="space-y-6">
      {/* Points Summary */}
      <Card className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            <Star className="w-16 h-16" />
            <div className="text-center">
              <p className="text-5xl font-bold">{totalPoints}</p>
              <p className="text-lg opacity-90">pontos acumulados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Seu Nível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Level Display */}
          {currentLevel && (
            <div className="flex items-center justify-center gap-4 p-4 rounded-lg" style={{ backgroundColor: currentLevel.color + '15' }}>
              {(() => {
                const IconComponent = levelIconMap[currentLevel.icon] || Star;
                return <IconComponent className="w-12 h-12" style={{ color: currentLevel.color }} />;
              })()}
              <div>
                <p className="text-2xl font-bold" style={{ color: currentLevel.color }}>
                  {currentLevel.name}
                </p>
                <p className="text-sm text-muted-foreground">{currentLevel.benefits}</p>
              </div>
            </div>
          )}

          {/* Progress to Next Level */}
          {nextLevel && currentLevel?.max_points && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentLevel.name}</span>
                <span>{nextLevel.name}</span>
              </div>
              <Progress 
                value={((totalPoints - currentLevel.min_points) / (currentLevel.max_points - currentLevel.min_points)) * 100} 
                className="h-4"
              />
              <p className="text-center text-sm text-muted-foreground">
                Faltam <span className="font-bold text-primary">{nextLevel.min_points - totalPoints}</span> pontos
              </p>
            </div>
          )}

          {/* All Levels */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Todos os Níveis:</p>
            <div className="grid gap-2">
              {levels.map((lvl, idx) => {
                const IconComponent = levelIconMap[lvl.icon] || Star;
                const isCurrentLevel = idx === currentLevelIndex;
                const isLocked = idx > currentLevelIndex;
                
                return (
                  <div 
                    key={lvl.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCurrentLevel ? 'border-2 bg-muted' : ''
                    } ${isLocked ? 'opacity-50' : ''}`}
                    style={isCurrentLevel ? { borderColor: lvl.color } : {}}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: lvl.color + '20' }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: lvl.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{lvl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lvl.min_points} - {lvl.max_points || '∞'} pontos
                      </p>
                    </div>
                    {isCurrentLevel && (
                      <Badge style={{ backgroundColor: lvl.color }}>Atual</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Histórico de Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum histórico de pontos ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(item.transaction_type, item.points)}
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTransactionBadge(item.transaction_type)}
                    <span className={`font-bold ${item.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientPoints;
