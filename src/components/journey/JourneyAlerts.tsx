import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, JourneyPhase, getPhaseConfig, ClientJourney } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, CheckCircle, User, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertItem {
  id: string;
  type: 'stuck' | 'missing_action' | 'overdue_task' | 'opportunity';
  severity: 'warning' | 'error' | 'info';
  message: string;
  clientName: string;
  clienteId: string;
  phase: JourneyPhase;
  detail?: string;
}

const JourneyAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { generateAlerts(); }, []);

  const generateAlerts = async () => {
    setLoading(true);
    const alertList: AlertItem[] = [];

    // 1. Clients stuck in a phase > 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: stuckJourneys } = await supabase
      .from('client_journey' as any)
      .select('*, clientes!inner(nome_completo)')
      .lt('phase_entered_at', threeDaysAgo.toISOString())
      .neq('current_phase', 'volta') as any;

    (stuckJourneys || []).forEach((j: any) => {
      const pc = getPhaseConfig(j.current_phase);
      const days = formatDistanceToNow(new Date(j.phase_entered_at), { locale: ptBR });
      alertList.push({
        id: `stuck-${j.id}`,
        type: 'stuck',
        severity: j.current_phase === 'confia' ? 'error' : 'warning',
        message: `Parado na fase "${pc.label}" há ${days}`,
        clientName: j.clientes?.nome_completo || 'N/A',
        clienteId: j.cliente_id,
        phase: j.current_phase,
      });
    });

    // 2. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from('client_journey_tasks' as any)
      .select('*, clientes!inner(nome_completo)')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString()) as any;

    (overdueTasks || []).forEach((t: any) => {
      alertList.push({
        id: `task-${t.id}`,
        type: 'overdue_task',
        severity: 'error',
        message: `Tarefa atrasada: "${t.title}"`,
        clientName: t.clientes?.nome_completo || 'N/A',
        clienteId: t.cliente_id,
        phase: t.phase,
      });
    });

    // Sort by severity
    alertList.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    setAlerts(alertList);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Verificando alertas...</div>;
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium">Nenhum alerta ativo</p>
        <p className="text-sm text-muted-foreground mt-1">Todos os clientes estão dentro do fluxo esperado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-5 w-5 text-destructive" />
        <span className="font-semibold">{alerts.length} alertas ativos</span>
      </div>
      {alerts.map(alert => {
        const pc = getPhaseConfig(alert.phase);
        return (
          <Alert
            key={alert.id}
            variant={alert.severity === 'error' ? 'destructive' : 'default'}
            className="flex items-start gap-3"
          >
            {alert.severity === 'error' ? (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <AlertDescription className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{alert.clientName}</span>
                <Badge variant="outline" style={{ borderColor: pc.color, color: pc.color }} className="text-[10px]">
                  {pc.icon} {pc.label}
                </Badge>
              </div>
              <p className="text-xs mt-0.5">{alert.message}</p>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};

export default JourneyAlerts;
