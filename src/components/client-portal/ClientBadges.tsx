import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Award, Flag, Compass, Map, Mountain, Trophy, Wallet, Gem, Crown, Lock, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientBadgesProps {
  clientAccountId: string;
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
}

interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  flag: Flag,
  compass: Compass,
  map: Map,
  mountain: Mountain,
  trophy: Trophy,
  wallet: Wallet,
  gem: Gem,
  crown: Crown,
  award: Award
};

const ClientBadges = ({ clientAccountId }: ClientBadgesProps) => {
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      // Fetch all badge definitions
      const { data: badges } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('requirement_value', { ascending: true });

      // Fetch earned badges
      const { data: earned } = await supabase
        .from('client_badges')
        .select('badge_id, earned_at')
        .eq('client_account_id', clientAccountId);

      if (badges) setAllBadges(badges);
      if (earned) setEarnedBadges(earned);
      setLoading(false);
    };

    fetchBadges();
  }, [clientAccountId]);

  const isEarned = (badgeId: string) => earnedBadges.some(e => e.badge_id === badgeId);
  const getEarnedDate = (badgeId: string) => {
    const earned = earnedBadges.find(e => e.badge_id === badgeId);
    return earned ? earned.earned_at : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const earned = allBadges.filter(b => isEarned(b.id));
  const locked = allBadges.filter(b => !isEarned(b.id));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            <Award className="w-12 h-12 text-amber-600" />
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-800">{earned.length}</p>
              <p className="text-sm text-amber-700">
                de {allBadges.length} selos conquistados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earned Badges */}
      {earned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Trophy className="w-5 h-5" />
              Selos Conquistados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {earned.map(badge => {
                const IconComponent = iconMap[badge.icon] || Award;
                const earnedDate = getEarnedDate(badge.id);
                return (
                  <div 
                    key={badge.id}
                    className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-b from-white to-muted/50 border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{ backgroundColor: badge.color + '20' }}
                    >
                      <IconComponent 
                        className="w-8 h-8" 
                        style={{ color: badge.color }} 
                      />
                    </div>
                    <p className="font-semibold text-center text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {badge.description}
                    </p>
                    {earnedDate && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {format(new Date(earnedDate), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    )}
                    {badge.points_reward > 0 && (
                      <p className="text-xs text-amber-600 mt-1">+{badge.points_reward} pts</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Badges */}
      {locked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              Selos a Conquistar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {locked.map(badge => {
                const IconComponent = iconMap[badge.icon] || Award;
                return (
                  <div 
                    key={badge.id}
                    className="flex flex-col items-center p-4 rounded-lg bg-muted/30 border border-dashed opacity-60"
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-muted relative"
                    >
                      <IconComponent className="w-8 h-8 text-muted-foreground" />
                      <Lock className="w-4 h-4 absolute bottom-0 right-0 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-center text-sm text-muted-foreground">
                      {badge.name}
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {badge.description}
                    </p>
                    {badge.points_reward > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">+{badge.points_reward} pts</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientBadges;
