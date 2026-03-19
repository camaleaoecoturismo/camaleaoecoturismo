import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, JourneyPhase, getPhaseConfig } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Users, AlertTriangle, ArrowRight, Percent } from 'lucide-react';

const JourneyMetrics: React.FC = () => {
  const [phaseCounts, setPhaseCounts] = useState<Record<JourneyPhase, number>>({} as any);
  const [loading, setLoading] = useState(true);
  const [stuckClients, setStuckClients] = useState<{ phase: JourneyPhase; count: number }[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);

    // Count per phase
    const { data: journeys } = await supabase
      .from('client_journey' as any)
      .select('current_phase, phase_entered_at') as any;

    const counts: Record<string, number> = {};
    const stuck: Record<string, number> = {};
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    (journeys || []).forEach((j: any) => {
      counts[j.current_phase] = (counts[j.current_phase] || 0) + 1;
      if (new Date(j.phase_entered_at) < threeDaysAgo && j.current_phase !== 'volta') {
        stuck[j.current_phase] = (stuck[j.current_phase] || 0) + 1;
      }
    });

    setPhaseCounts(counts as any);
    setStuckClients(
      Object.entries(stuck).map(([phase, count]) => ({ phase: phase as JourneyPhase, count }))
        .sort((a, b) => b.count - a.count)
    );
    setLoading(false);
  };

  const totalClients = Object.values(phaseCounts).reduce((a, b) => a + b, 0);

  const getConversionRate = (from: JourneyPhase, to: JourneyPhase) => {
    const fromCount = phaseCounts[from] || 0;
    const toCount = phaseCounts[to] || 0;
    // Accumulate all phases after 'to' as well
    const toIndex = JOURNEY_PHASES.findIndex(p => p.id === to);
    let advanced = 0;
    for (let i = toIndex; i < JOURNEY_PHASES.length; i++) {
      advanced += phaseCounts[JOURNEY_PHASES[i].id] || 0;
    }
    const total = fromCount + advanced;
    if (total === 0) return 0;
    return Math.round((advanced / total) * 100);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Calculando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Phase funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funil da Jornada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 flex-wrap">
            {JOURNEY_PHASES.map((phase, i) => {
              const count = phaseCounts[phase.id] || 0;
              const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
              return (
                <React.Fragment key={phase.id}>
                  <div className="text-center min-w-[80px]">
                    <div
                      className="rounded-lg px-3 py-2 text-white font-bold text-lg"
                      style={{ backgroundColor: phase.color }}
                    >
                      {count}
                    </div>
                    <p className="text-xs font-medium mt-1">{phase.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pct}%</p>
                  </div>
                  {i < JOURNEY_PHASES.length - 1 && (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-[10px]">{getConversionRate(phase.id, JOURNEY_PHASES[i + 1].id)}%</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" /> Total na Jornada
          </div>
          <p className="text-2xl font-bold">{totalClients}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Percent className="h-4 w-4" /> Conversão Confia→Compra
          </div>
          <p className="text-2xl font-bold">{getConversionRate('confia', 'compra')}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" /> Taxa Recompra
          </div>
          <p className="text-2xl font-bold">{phaseCounts['volta'] || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" /> Clientes Parados (3d+)
          </div>
          <p className="text-2xl font-bold text-destructive">
            {stuckClients.reduce((a, b) => a + b.count, 0)}
          </p>
        </Card>
      </div>

      {/* Stuck clients by phase */}
      {stuckClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Gargalos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stuckClients.map(s => {
                const pc = getPhaseConfig(s.phase);
                return (
                  <div key={s.phase} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <Badge style={{ backgroundColor: pc.color, color: '#fff' }}>{pc.label}</Badge>
                    <span className="text-sm"><strong>{s.count}</strong> clientes parados há mais de 3 dias</span>
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

export default JourneyMetrics;
