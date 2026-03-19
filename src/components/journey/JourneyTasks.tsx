import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, JourneyPhase, ClientJourneyTask, getPhaseConfig } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListTodo, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const JourneyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<ClientJourneyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  useEffect(() => { fetchTasks(); }, [statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase
      .from('client_journey_tasks' as any)
      .select('*, clientes!inner(nome_completo), tours(name)')
      .order('due_date', { ascending: true });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query as any;
    if (error) console.error(error);
    setTasks(data || []);
    setLoading(false);
  };

  const toggleTask = async (task: ClientJourneyTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await (supabase.from('client_journey_tasks' as any).update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', task.id) as any);
    toast.success(newStatus === 'completed' ? 'Tarefa concluída' : 'Tarefa reaberta');
    fetchTasks();
  };

  const isOverdue = (task: ClientJourneyTask) =>
    task.status === 'pending' && task.due_date && new Date(task.due_date) < new Date();

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando tarefas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{tasks.length} tarefas</Badge>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma tarefa {statusFilter === 'pending' ? 'pendente' : ''}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const pc = getPhaseConfig(task.phase);
            const overdue = isOverdue(task);
            return (
              <Card key={task.id} className={`p-3 ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTask(task)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" style={{ borderColor: pc.color, color: pc.color }} className="text-[10px]">
                        {pc.icon} {pc.label}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Atrasada
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{task.clientes?.nome_completo}</span>
                      {task.tours && <span>• {(task.tours as any).name}</span>}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JourneyTasks;
