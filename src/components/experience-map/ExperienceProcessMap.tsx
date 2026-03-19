import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Zap,
  User,
  MoreHorizontal,
  Loader2,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

interface Task {
  id: string;
  subprocess_id: string;
  name: string;
  description: string | null;
  responsible: string | null;
  priority: string;
  status: string;
  is_automatic: boolean;
  trigger_event: string | null;
  due_days: number | null;
  order_index: number;
  completed_at: string | null;
}

interface Subprocess {
  id: string;
  process_id: string;
  name: string;
  description: string | null;
  trigger_event: string | null;
  order_index: number;
  tasks: Task[];
}

interface Process {
  id: string;
  stage_id: string;
  name: string;
  description: string | null;
  order_index: number;
  subprocesses: Subprocess[];
}

interface Stage {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  icon: string | null;
  color: string | null;
  processes: Process[];
}

const TRIGGER_EVENTS = [
  { value: 'pagamento_confirmado', label: 'Pagamento confirmado' },
  { value: 'reserva_criada', label: 'Reserva criada' },
  { value: 'cliente_cadastrado', label: 'Cliente cadastrado' },
  { value: 'viagem_finalizada', label: 'Viagem finalizada' },
  { value: 'checkin_realizado', label: 'Check-in realizado' },
  { value: 'ticket_enviado', label: 'Ticket enviado' },
];

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  baixa: { label: 'Baixa', class: 'bg-muted text-muted-foreground' },
  media: { label: 'Média', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  alta: { label: 'Alta', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  urgente: { label: 'Urgente', class: 'bg-destructive/10 text-destructive' },
};

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
};

// Helper to update a task deep in stages without refetching
const updateTaskInStages = (stages: Stage[], taskId: string, updates: Partial<Task>): Stage[] => {
  return stages.map(stage => ({
    ...stage,
    processes: stage.processes.map(proc => ({
      ...proc,
      subprocesses: proc.subprocesses.map(sub => ({
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
      })),
    })),
  }));
};

const removeTaskInStages = (stages: Stage[], taskId: string): Stage[] => {
  return stages.map(stage => ({
    ...stage,
    processes: stage.processes.map(proc => ({
      ...proc,
      subprocesses: proc.subprocesses.map(sub => ({
        ...sub,
        tasks: sub.tasks.filter(t => t.id !== taskId),
      })),
    })),
  }));
};

const removeSubprocessInStages = (stages: Stage[], subId: string): Stage[] => {
  return stages.map(stage => ({
    ...stage,
    processes: stage.processes.map(proc => ({
      ...proc,
      subprocesses: proc.subprocesses.filter(s => s.id !== subId),
    })),
  }));
};

const removeProcessInStages = (stages: Stage[], procId: string): Stage[] => {
  return stages.map(stage => ({
    ...stage,
    processes: stage.processes.filter(p => p.id !== procId),
  }));
};

const ExperienceProcessMap: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [expandedSubprocesses, setExpandedSubprocesses] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<{ type: string; parentId: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, processesRes, subprocessesRes, tasksRes] = await Promise.all([
        supabase.from('experience_journey_stages').select('*').order('order_index'),
        supabase.from('experience_processes').select('*').order('order_index'),
        supabase.from('experience_subprocesses').select('*').order('order_index'),
        supabase.from('experience_tasks').select('*').order('order_index'),
      ]);

      if (stagesRes.error) throw stagesRes.error;

      const tasksMap = new Map<string, Task[]>();
      (tasksRes.data || []).forEach((t: Task) => {
        if (!tasksMap.has(t.subprocess_id)) tasksMap.set(t.subprocess_id, []);
        tasksMap.get(t.subprocess_id)!.push(t);
      });

      const subMap = new Map<string, Subprocess[]>();
      (subprocessesRes.data || []).forEach((s: any) => {
        const sub: Subprocess = { ...s, tasks: tasksMap.get(s.id) || [] };
        if (!subMap.has(s.process_id)) subMap.set(s.process_id, []);
        subMap.get(s.process_id)!.push(sub);
      });

      const procMap = new Map<string, Process[]>();
      (processesRes.data || []).forEach((p: any) => {
        const proc: Process = { ...p, subprocesses: subMap.get(p.id) || [] };
        if (!procMap.has(p.stage_id)) procMap.set(p.stage_id, []);
        procMap.get(p.stage_id)!.push(proc);
      });

      const built: Stage[] = (stagesRes.data || []).map((s: any) => ({
        ...s,
        processes: procMap.get(s.id) || [],
      }));

      setStages(built);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar mapa de processos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleSet = (set: Set<string>, id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  // Expand / collapse all
  const allIds = useCallback(() => {
    const stageIds: string[] = [];
    const processIds: string[] = [];
    const subprocessIds: string[] = [];
    stages.forEach(s => {
      stageIds.push(s.id);
      s.processes.forEach(p => {
        processIds.push(p.id);
        p.subprocesses.forEach(sp => subprocessIds.push(sp.id));
      });
    });
    return { stageIds, processIds, subprocessIds };
  }, [stages]);

  const expandAll = () => {
    const { stageIds, processIds, subprocessIds } = allIds();
    setExpandedStages(new Set(stageIds));
    setExpandedProcesses(new Set(processIds));
    setExpandedSubprocesses(new Set(subprocessIds));
  };

  const collapseAll = () => {
    setExpandedStages(new Set());
    setExpandedProcesses(new Set());
    setExpandedSubprocesses(new Set());
  };

  const expandStageAll = (stage: Stage) => {
    setExpandedStages(prev => new Set([...prev, stage.id]));
    const pIds: string[] = [];
    const spIds: string[] = [];
    stage.processes.forEach(p => { pIds.push(p.id); p.subprocesses.forEach(sp => spIds.push(sp.id)); });
    setExpandedProcesses(prev => new Set([...prev, ...pIds]));
    setExpandedSubprocesses(prev => new Set([...prev, ...spIds]));
  };

  const isAllExpanded = expandedStages.size === stages.length && stages.length > 0;

  const getStageProgress = (stage: Stage) => {
    let total = 0, done = 0;
    stage.processes.forEach(p => p.subprocesses.forEach(s => s.tasks.forEach(t => {
      total++; if (t.status === 'concluida') done++;
    })));
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const getProcessProgress = (proc: Process) => {
    let total = 0, done = 0;
    proc.subprocesses.forEach(s => s.tasks.forEach(t => {
      total++; if (t.status === 'concluida') done++;
    }));
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const getPendingCount = (stage: Stage) => {
    let count = 0;
    stage.processes.forEach(p => p.subprocesses.forEach(s => s.tasks.forEach(t => {
      if (t.status !== 'concluida') count++;
    })));
    return count;
  };

  // Optimistic CRUD — update local state first, then persist
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const fullUpdates = { ...updates };
    if (updates.status === 'concluida') fullUpdates.completed_at = new Date().toISOString();
    if (updates.status && updates.status !== 'concluida') fullUpdates.completed_at = null;

    // Optimistic update
    setStages(prev => updateTaskInStages(prev, taskId, fullUpdates));

    const { error } = await supabase.from('experience_tasks').update(fullUpdates).eq('id', taskId);
    if (error) {
      toast.error('Erro ao atualizar tarefa');
      fetchAll(); // rollback
    }
  };

  const addProcess = async (stageId: string) => {
    if (!newItemName.trim()) return;
    const maxOrder = stages.find(s => s.id === stageId)?.processes.length || 0;
    const { data, error } = await supabase.from('experience_processes').insert({
      stage_id: stageId, name: newItemName.trim(), order_index: maxOrder
    }).select().single();
    if (error || !data) { toast.error('Erro ao criar processo'); return; }
    // Optimistic add
    setStages(prev => prev.map(s => s.id === stageId ? {
      ...s, processes: [...s.processes, { ...data, subprocesses: [] }]
    } : s));
    setNewItemName(''); setAddingTo(null);
  };

  const addSubprocess = async (processId: string) => {
    if (!newItemName.trim()) return;
    const { data, error } = await supabase.from('experience_subprocesses').insert({
      process_id: processId, name: newItemName.trim(), order_index: 0
    }).select().single();
    if (error || !data) { toast.error('Erro ao criar subprocesso'); return; }
    setStages(prev => prev.map(s => ({
      ...s, processes: s.processes.map(p => p.id === processId ? {
        ...p, subprocesses: [...p.subprocesses, { ...data, tasks: [] }]
      } : p)
    })));
    setNewItemName(''); setAddingTo(null);
  };

  const addTask = async (subprocessId: string) => {
    if (!newItemName.trim()) return;
    const { data, error } = await supabase.from('experience_tasks').insert({
      subprocess_id: subprocessId, name: newItemName.trim(), order_index: 0
    }).select().single();
    if (error || !data) { toast.error('Erro ao criar tarefa'); return; }
    setStages(prev => prev.map(s => ({
      ...s, processes: s.processes.map(p => ({
        ...p, subprocesses: p.subprocesses.map(sp => sp.id === subprocessId ? {
          ...sp, tasks: [...sp.tasks, data]
        } : sp)
      }))
    })));
    setNewItemName(''); setAddingTo(null);
  };

  const deleteProcess = async (id: string) => {
    setStages(prev => removeProcessInStages(prev, id));
    const { error } = await supabase.from('experience_processes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchAll(); }
  };

  const deleteSubprocess = async (id: string) => {
    setStages(prev => removeSubprocessInStages(prev, id));
    const { error } = await supabase.from('experience_subprocesses').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchAll(); }
  };

  const deleteTask = async (id: string) => {
    setStages(prev => removeTaskInStages(prev, id));
    const { error } = await supabase.from('experience_tasks').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchAll(); }
  };

  const handleAdd = () => {
    if (!addingTo) return;
    if (addingTo.type === 'process') addProcess(addingTo.parentId);
    else if (addingTo.type === 'subprocess') addSubprocess(addingTo.parentId);
    else if (addingTo.type === 'task') addTask(addingTo.parentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPending = stages.reduce((a, s) => a + getPendingCount(s), 0);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{stages.length} etapas</span>
          <span>·</span>
          <span>{stages.reduce((a, s) => a + s.processes.length, 0)} processos</span>
          <span>·</span>
          <span>{totalPending} tarefas pendentes</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 h-7"
          onClick={isAllExpanded ? collapseAll : expandAll}
        >
          {isAllExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
          {isAllExpanded ? 'Recolher tudo' : 'Expandir tudo'}
        </Button>
      </div>

      {/* Horizontal scrollable layout */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
        {stages.map((stage) => {
          const isExpanded = expandedStages.has(stage.id);
          const progress = getStageProgress(stage);
          const pending = getPendingCount(stage);

          return (
            <div
              key={stage.id}
              className={cn(
                "border border-border rounded-lg flex-shrink-0 snap-start transition-all",
                isExpanded ? "w-[380px]" : "w-[200px]"
              )}
            >
              {/* Stage header */}
              <div className="p-3 bg-card rounded-t-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('w-2 h-6 rounded-full flex-shrink-0', COLOR_MAP[stage.color || 'blue'])} />
                  <button
                    onClick={() => toggleSet(expandedStages, stage.id, setExpandedStages)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-sm">{stage.name}</div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => expandStageAll(stage)}>
                        <ChevronsUpDown className="h-3.5 w-3.5 mr-2" /> Expandir tudo nesta etapa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{progress}%</span>
                </div>
                {pending > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">{pending} pendente{pending !== 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Content */}
              {isExpanded && (
                <div className="border-t border-border max-h-[calc(100vh-260px)] overflow-y-auto">
                  {stage.processes.map((proc) => {
                    const procExpanded = expandedProcesses.has(proc.id);
                    const procProgress = getProcessProgress(proc);

                    return (
                      <div key={proc.id} className="border-b border-border last:border-b-0">
                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors group">
                          <button onClick={() => toggleSet(expandedProcesses, proc.id, setExpandedProcesses)} className="flex items-center gap-1.5 flex-1 text-left min-w-0">
                            {procExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                            <span className="text-sm truncate">{proc.name}</span>
                          </button>
                          <div className="w-12 flex-shrink-0">
                            <Progress value={procProgress} className="h-1" />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-6 text-right flex-shrink-0">{procProgress}%</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex-shrink-0">
                                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => deleteProcess(proc.id)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir processo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {procExpanded && (
                          <div className="pl-6 pr-2 pb-2">
                            {proc.subprocesses.map((sub) => {
                              const subExpanded = expandedSubprocesses.has(sub.id);
                              const subDone = sub.tasks.filter(t => t.status === 'concluida').length;
                              const subTotal = sub.tasks.length;

                              return (
                                <div key={sub.id} className="mb-0.5">
                                  <div className="flex items-center gap-1.5 py-1 hover:bg-muted/20 rounded px-1.5 group">
                                    <button onClick={() => toggleSet(expandedSubprocesses, sub.id, setExpandedSubprocesses)} className="flex items-center gap-1.5 flex-1 text-left min-w-0">
                                      {subExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                      <span className="text-xs text-muted-foreground truncate">{sub.name}</span>
                                    </button>
                                    {sub.trigger_event && (
                                      <Badge variant="outline" className="text-[9px] gap-0.5 font-normal h-4 px-1 flex-shrink-0">
                                        <Zap className="h-2 w-2" /> Auto
                                      </Badge>
                                    )}
                                    {subTotal > 0 && (
                                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{subDone}/{subTotal}</span>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex-shrink-0">
                                          <MoreHorizontal className="h-2.5 w-2.5 text-muted-foreground" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => deleteSubprocess(sub.id)} className="text-destructive">
                                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir subprocesso
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {subExpanded && (
                                    <div className="pl-4 space-y-0.5 mt-0.5">
                                      {sub.tasks.map((task) => (
                                        <div key={task.id}>
                                          <div
                                            className={cn(
                                              "flex items-center gap-1.5 py-1 px-1.5 rounded text-xs group/task hover:bg-muted/20 transition-colors",
                                              task.status === 'concluida' && "opacity-50"
                                            )}
                                          >
                                            <button
                                              onClick={() => updateTask(task.id, {
                                                status: task.status === 'concluida' ? 'pendente' : 'concluida'
                                              })}
                                              className={cn(
                                                "w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                                task.status === 'concluida'
                                                  ? "bg-primary border-primary text-primary-foreground"
                                                  : "border-border hover:border-primary"
                                              )}
                                            >
                                              {task.status === 'concluida' && <Check className="h-2 w-2" />}
                                            </button>

                                            <span className={cn("flex-1 truncate", task.status === 'concluida' && "line-through")}>
                                              {task.name}
                                            </span>

                                            {task.is_automatic && (
                                              <Zap className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                                            )}

                                            {task.responsible && (
                                              <span className="text-[9px] text-muted-foreground flex-shrink-0 max-w-[60px] truncate">
                                                {task.responsible}
                                              </span>
                                            )}

                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button className="p-0.5 rounded opacity-0 group-hover/task:opacity-100 hover:bg-muted transition-all flex-shrink-0">
                                                  <MoreHorizontal className="h-2.5 w-2.5 text-muted-foreground" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}>
                                                  Editar detalhes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
                                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>

                                          {/* Inline editing */}
                                          {editingTask === task.id && (
                                            <div className="bg-muted/30 rounded p-2 space-y-1.5 text-xs ml-5 mt-0.5">
                                              <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                  <label className="text-[9px] text-muted-foreground">Responsável</label>
                                                  <Input
                                                    defaultValue={task.responsible || ''}
                                                    placeholder="Nome"
                                                    className="h-6 text-[11px]"
                                                    onBlur={(e) => updateTask(task.id, { responsible: e.target.value || null })}
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] text-muted-foreground">Prioridade</label>
                                                  <Select defaultValue={task.priority} onValueChange={(v) => updateTask(task.id, { priority: v })}>
                                                    <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="baixa">Baixa</SelectItem>
                                                      <SelectItem value="media">Média</SelectItem>
                                                      <SelectItem value="alta">Alta</SelectItem>
                                                      <SelectItem value="urgente">Urgente</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div>
                                                  <label className="text-[9px] text-muted-foreground">Status</label>
                                                  <Select defaultValue={task.status} onValueChange={(v) => updateTask(task.id, { status: v })}>
                                                    <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="pendente">Pendente</SelectItem>
                                                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                                                      <SelectItem value="concluida">Concluída</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div>
                                                  <label className="text-[9px] text-muted-foreground">Tipo</label>
                                                  <Select
                                                    defaultValue={task.is_automatic ? 'auto' : 'manual'}
                                                    onValueChange={(v) => updateTask(task.id, { is_automatic: v === 'auto' })}
                                                  >
                                                    <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="manual">Manual</SelectItem>
                                                      <SelectItem value="auto">Automática</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                              {task.is_automatic && (
                                                <div>
                                                  <label className="text-[9px] text-muted-foreground">Evento gatilho</label>
                                                  <Select
                                                    defaultValue={task.trigger_event || ''}
                                                    onValueChange={(v) => updateTask(task.id, { trigger_event: v })}
                                                  >
                                                    <SelectTrigger className="h-6 text-[11px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                      {TRIGGER_EVENTS.map(e => (
                                                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                              <Button size="sm" variant="ghost" className="h-5 text-[10px]" onClick={() => setEditingTask(null)}>
                                                Fechar
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {/* Add task */}
                                      {addingTo?.type === 'task' && addingTo.parentId === sub.id ? (
                                        <div className="flex items-center gap-1.5 px-1.5">
                                          <Input
                                            autoFocus
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingTo(null); }}
                                            placeholder="Nome da tarefa"
                                            className="h-6 text-[11px] flex-1"
                                          />
                                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleAdd}>OK</Button>
                                          <button className="text-muted-foreground text-xs" onClick={() => setAddingTo(null)}>✕</button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => { setAddingTo({ type: 'task', parentId: sub.id }); setNewItemName(''); }}
                                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
                                        >
                                          <Plus className="h-2.5 w-2.5" /> tarefa
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Add subprocess */}
                            {addingTo?.type === 'subprocess' && addingTo.parentId === proc.id ? (
                              <div className="flex items-center gap-1.5 px-1.5 py-1">
                                <Input
                                  autoFocus
                                  value={newItemName}
                                  onChange={(e) => setNewItemName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingTo(null); }}
                                  placeholder="Nome do subprocesso"
                                  className="h-6 text-[11px] flex-1"
                                />
                                <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleAdd}>OK</Button>
                                <button className="text-muted-foreground text-xs" onClick={() => setAddingTo(null)}>✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingTo({ type: 'subprocess', parentId: proc.id }); setNewItemName(''); }}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
                              >
                                <Plus className="h-2.5 w-2.5" /> subprocesso
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add process */}
                  <div className="px-3 py-2">
                    {addingTo?.type === 'process' && addingTo.parentId === stage.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingTo(null); }}
                          placeholder="Nome do processo"
                          className="h-6 text-[11px] flex-1"
                        />
                        <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleAdd}>OK</Button>
                        <button className="text-muted-foreground text-xs" onClick={() => setAddingTo(null)}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTo({ type: 'process', parentId: stage.id }); setNewItemName(''); }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" /> processo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceProcessMap;
