import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  MapPin, GitBranch, Plus, Copy, Trash2, FileText, X, Circle, Square, Diamond, Hexagon, Clock, History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tour } from '@/hooks/useTours';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import MiniFlowEditor, { FlowNode, FlowConnection } from './MiniFlowEditor';

// ── Types ──
interface TourProcess {
  id: string;
  name: string;
  tour_id: string | null;
  is_template: boolean;
  nodes: FlowNode[];
  connections: FlowConnection[];
  created_at: string;
  updated_at: string;
}

interface TourProcessesViewProps {
  tours: Tour[];
  tasks: any[];
  fetchTasks: (silent?: boolean) => void;
}

const NODE_TYPES = [
  { id: 'start', label: 'Início', icon: Circle },
  { id: 'process', label: 'Processo', icon: Square },
  { id: 'decision', label: 'Decisão', icon: Diamond },
  { id: 'end', label: 'Fim', icon: Hexagon },
] as const;

const genId = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const TourProcessesView: React.FC<TourProcessesViewProps> = ({ tours, fetchTasks: refreshTasks }) => {
  const [processes, setProcesses] = useState<TourProcess[]>([]);
  const processesRef = useRef<TourProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  // Template
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TourProcess | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateNodes, setTemplateNodes] = useState<FlowNode[]>([]);
  const [templateConns, setTemplateConns] = useState<FlowConnection[]>([]);

  // Apply template
  const [applyTourId, setApplyTourId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const today = useMemo(() => startOfDay(new Date()), []);

  const allActiveTours = useMemo(() => tours.filter(t => t.is_active).sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  ), [tours]);

  const upcomingTours = useMemo(() => allActiveTours.filter(t => {
    const endDate = t.end_date ? new Date(t.end_date + 'T23:59:59') : new Date(t.start_date + 'T23:59:59');
    return !isBefore(endDate, today);
  }), [allActiveTours, today]);

  const pastTours = useMemo(() => allActiveTours.filter(t => {
    const endDate = t.end_date ? new Date(t.end_date + 'T23:59:59') : new Date(t.start_date + 'T23:59:59');
    return isBefore(endDate, today);
  }), [allActiveTours, today]);

  const displayedTours = showPast ? allActiveTours : upcomingTours;

  const fetchProcesses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('process_maps').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setProcesses((data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        tour_id: item.tour_id,
        is_template: item.is_template,
        nodes: Array.isArray(item.elements) ? item.elements : [],
        connections: Array.isArray(item.connections) ? item.connections : [],
        created_at: item.created_at,
        updated_at: item.updated_at,
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  // Keep ref in sync with state for use in saveFlow
  useEffect(() => { processesRef.current = processes; }, [processes]);

  const templates = useMemo(() => processes.filter(p => p.is_template), [processes]);
  const getProc = (tourId: string) => processes.find(p => p.tour_id === tourId && !p.is_template);

  const getProgress = (nodes: FlowNode[]) => {
    if (!nodes.length) return null;
    const done = nodes.filter(n => n.completed).length;
    return { done, total: nodes.length, pct: Math.round((done / nodes.length) * 100) };
  };

  // ── Track pending task creation to avoid duplicates ──
  const pendingCreationsRef = useRef<Set<string>>(new Set());

  // ── Save flow changes ──
  const saveFlow = useCallback(async (processId: string, nodes: FlowNode[], connections: FlowConnection[]) => {
    const prevProcess = processesRef.current.find(p => p.id === processId);
    
    // Optimistic update
    const updatedProcesses = processesRef.current.map(p => p.id === processId ? { ...p, nodes, connections } : p);
    setProcesses(updatedProcesses);
    processesRef.current = updatedProcesses;
    
    // Save to DB
    await supabase.from('process_maps').update({
      elements: nodes as any,
      connections: connections as any,
    }).eq('id', processId);

    if (!prevProcess) return;

    // Check if this is just a position/size change (no structural diff)
    const prevIds = new Set(prevProcess.nodes.map(n => n.id));
    const currIds = new Set(nodes.map(n => n.id));
    const sameNodeSet = prevIds.size === currIds.size && [...prevIds].every(id => currIds.has(id));
    const hasCompletionChange = sameNodeSet && nodes.some(n => {
      const prev = prevProcess.nodes.find(pn => pn.id === n.id);
      return prev && prev.completed !== n.completed;
    });
    const hasTextChange = sameNodeSet && nodes.some(n => {
      const prev = prevProcess.nodes.find(pn => pn.id === n.id);
      return prev && prev.text !== n.text;
    });
    const hasSubtaskChange = sameNodeSet && nodes.some(n => {
      const prev = prevProcess.nodes.find(pn => pn.id === n.id);
      if (!prev) return false;
      return JSON.stringify(prev.subtasks || []) !== JSON.stringify(n.subtasks || []);
    });

    // If only positions changed, skip task sync
    if (sameNodeSet && !hasCompletionChange && !hasTextChange && !hasSubtaskChange) return;

    let needsRefresh = false;

    // Detect DELETED nodes → delete linked tasks
    const deletedNodes = prevProcess.nodes.filter(pn => !nodes.find(n => n.id === pn.id));
    for (const deleted of deletedNodes) {
      await (supabase.from('tasks' as any)
        .delete()
        .eq('process_map_id', processId)
        .eq('process_element_id', deleted.id) as any);
      needsRefresh = true;
    }

    // Detect NEW nodes → create linked tasks (with dedup guard)
    const newNodes = nodes.filter(n => !prevProcess.nodes.find(pn => pn.id === n.id));
    if (newNodes.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      const tour = tours.find(t => t.id === prevProcess.tour_id);
      const tourName = tour?.name || '';
      const tourStartDate = tour?.start_date ? new Date(tour.start_date + 'T12:00:00') : null;

      for (const node of newNodes) {
        // Skip if already being created
        const creationKey = `${processId}:${node.id}`;
        if (pendingCreationsRef.current.has(creationKey)) continue;
        pendingCreationsRef.current.add(creationKey);

        try {
          let dueDateStr: string | null = null;
          if (tourStartDate && node.days_offset != null) {
            const taskDate = addDays(tourStartDate, node.days_offset);
            dueDateStr = format(taskDate, 'yyyy-MM-dd') + 'T' + (node.offset_time || '09:00');
          }

          const { data: taskData, error: insertError } = await (supabase.from('tasks' as any).insert({
            title: tourName ? `${node.text} — ${tourName}` : node.text,
            description: `Tarefa do processo`,
            status: node.completed ? 'done' : 'todo',
            quadrant: 'not_urgent_not_important',
            tour_id: prevProcess.tour_id,
            due_date: dueDateStr,
            process_map_id: processId,
            process_element_id: node.id,
            user_id: user?.id,
            completed_at: node.completed ? new Date().toISOString() : null,
          }).select('id').single() as any);

          if (insertError) {
            console.error('Erro ao criar tarefa do processo:', insertError);
          } else if (taskData?.id && node.subtasks && node.subtasks.length > 0) {
            const steps = node.subtasks.map((title: string, idx: number) => ({
              task_id: taskData.id,
              title,
              order_index: idx,
              is_completed: false,
            }));
            await (supabase.from('task_steps' as any).insert(steps) as any);
          }
          needsRefresh = true;
        } finally {
          pendingCreationsRef.current.delete(creationKey);
        }
      }
    }

    for (const node of nodes) {
      const prevNode = prevProcess.nodes.find(n => n.id === node.id);
      if (!prevNode) continue;

      // Sync completion toggle → update task status
      if (prevNode.completed !== node.completed) {
        const newStatus = node.completed ? 'done' : 'todo';
        const completedAt = node.completed ? new Date().toISOString() : null;
        await (supabase.from('tasks' as any)
          .update({ status: newStatus, completed_at: completedAt })
          .eq('process_map_id', processId)
          .eq('process_element_id', node.id) as any);
        needsRefresh = true;
      }

      // Sync text change → update task title
      if (prevNode.text !== node.text) {
        const tour = tours.find(t => t.id === prevProcess.tour_id);
        const tourName = tour?.name || '';
        const newTitle = tourName ? `${node.text} — ${tourName}` : node.text;
        await (supabase.from('tasks' as any)
          .update({ title: newTitle })
          .eq('process_map_id', processId)
          .eq('process_element_id', node.id) as any);
        needsRefresh = true;
      }

      // Sync subtask changes → update task_steps
      const prevSubs = JSON.stringify(prevNode?.subtasks || []);
      const currSubs = JSON.stringify(node.subtasks || []);
      if (prevSubs !== currSubs) {
        // Find the linked task
        let { data: linkedTask } = await (supabase.from('tasks' as any)
          .select('id')
          .eq('process_map_id', processId)
          .eq('process_element_id', node.id)
          .maybeSingle() as any);

        // If no linked task exists, create one
        if (!linkedTask?.id) {
          const { data: { user } } = await supabase.auth.getUser();
          const tour = tours.find(t => t.id === prevProcess.tour_id);
          const tourName = tour?.name || '';
          const tourStartDate = tour?.start_date ? new Date(tour.start_date + 'T12:00:00') : null;
          let dueDateStr: string | null = null;
          if (tourStartDate && node.days_offset != null) {
            const taskDate = addDays(tourStartDate, node.days_offset);
            dueDateStr = format(taskDate, 'yyyy-MM-dd') + 'T' + (node.offset_time || '09:00');
          }
          const { data: newTask } = await (supabase.from('tasks' as any).insert({
            title: tourName ? `${node.text} — ${tourName}` : node.text,
            description: `Tarefa do processo`,
            status: node.completed ? 'done' : 'todo',
            quadrant: 'not_urgent_not_important',
            tour_id: prevProcess.tour_id,
            due_date: dueDateStr,
            process_map_id: processId,
            process_element_id: node.id,
            user_id: user?.id,
          }).select('id').single() as any);
          linkedTask = newTask;
        }

        if (linkedTask?.id) {
          // Delete existing steps and recreate from current subtasks
          await (supabase.from('task_steps' as any).delete().eq('task_id', linkedTask.id) as any);
          
          const subtasks = node.subtasks || [];
          if (subtasks.length > 0) {
            const steps = subtasks.map((title: string, idx: number) => ({
              task_id: linkedTask.id,
              title: title.startsWith('✓ ') ? title.slice(2) : title,
              order_index: idx,
              is_completed: title.startsWith('✓ '),
              completed_at: title.startsWith('✓ ') ? new Date().toISOString() : null,
            }));
            await (supabase.from('task_steps' as any).insert(steps) as any);
          }
          needsRefresh = true;
        }
      }
    }

    if (needsRefresh) refreshTasks(true);
  }, [refreshTasks, tours]);

  // ── Create blank ──
  const createBlank = async (tourId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tourName = tours.find(t => t.id === tourId)?.name || '';
      const startNode: FlowNode = {
        id: genId(), type: 'start', text: 'Início', color: '#22c55e',
        completed: false, x: 60, y: 10, width: 100, height: 32,
      };

      const { data, error } = await supabase.from('process_maps').insert({
        name: `Processo — ${tourName}`, area: 'Operação', status: 'Ativo',
        elements: [startNode] as any, connections: [] as any,
        tour_id: tourId, is_template: false, updated_by: user?.id,
      } as any).select().single();
      if (error) throw error;

      setProcesses(prev => [{
        id: (data as any).id, name: (data as any).name, tour_id: tourId,
        is_template: false, nodes: [startNode], connections: [],
        created_at: (data as any).created_at, updated_at: (data as any).updated_at,
      }, ...prev]);
      toast.success('Processo criado!');
    } catch { toast.error('Erro ao criar'); }
  };

  // ── Apply template ──
  const applyTemplate = async () => {
    if (!selectedTemplateId || !applyTourId) return;
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const existing = getProc(applyTourId);
      if (existing) {
        if (!confirm('Substituir processo existente?')) return;
        await supabase.from('process_maps').delete().eq('id', existing.id);
        // Also delete previously generated tasks for this process
        await (supabase.from('tasks' as any).delete().eq('process_map_id', existing.id) as any);
      }
      const tour = tours.find(t => t.id === applyTourId);
      const tourName = tour?.name || '';

      // Clone nodes with new IDs, build ID mapping for connections
      const idMap: Record<string, string> = {};
      const freshNodes = tpl.nodes.map(n => {
        const newId = genId();
        idMap[n.id] = newId;
        return { ...n, id: newId, completed: false };
      });
      const freshConns = tpl.connections.map(c => ({
        id: genId(), from: idMap[c.from] || c.from, to: idMap[c.to] || c.to,
      }));

      const { data, error } = await supabase.from('process_maps').insert({
        name: `${tpl.name} — ${tourName}`, area: 'Operação', status: 'Ativo',
        elements: freshNodes as any, connections: freshConns as any,
        tour_id: applyTourId, is_template: false, updated_by: user?.id,
      } as any).select().single();
      if (error) throw error;

      const processMapId = (data as any).id;

      // Generate tasks for ALL nodes (not just scheduled ones)
      {
        const tourStartDate = tour?.start_date ? new Date(tour.start_date + 'T12:00:00') : null;
        const taskNodes = freshNodes.filter(n => n.type !== 'start' && n.type !== 'end');
        
        for (const node of taskNodes) {
          let dueDateStr: string | null = null;
          if (tourStartDate && node.days_offset != null) {
            const taskDate = addDays(tourStartDate, node.days_offset);
            dueDateStr = format(taskDate, 'yyyy-MM-dd') + 'T' + (node.offset_time || '09:00');
          }
          
          const { data: taskData } = await (supabase.from('tasks' as any).insert({
            title: `${node.text} — ${tourName}`,
            description: `Tarefa automática do processo "${tpl.name}"`,
            status: 'todo',
            quadrant: 'not_urgent_not_important',
            tour_id: applyTourId,
            due_date: dueDateStr,
            process_map_id: processMapId,
            process_element_id: node.id,
            user_id: user?.id,
          }).select('id').single() as any);

          // Create task_steps from node subtasks
          if (taskData?.id && node.subtasks && node.subtasks.length > 0) {
            const steps = node.subtasks.map((title: string, idx: number) => ({
              task_id: taskData.id,
              title: title.startsWith('✓ ') ? title.slice(2) : title,
              order_index: idx,
              is_completed: title.startsWith('✓ '),
              completed_at: title.startsWith('✓ ') ? new Date().toISOString() : null,
            }));
            await (supabase.from('task_steps' as any).insert(steps) as any);
          }
        }
        
        if (taskNodes.length > 0) {
          toast.success(`${taskNodes.length} tarefa(s) criada(s) no Kanban!`);
        }
      }

      setProcesses(prev => [{
        id: processMapId, name: (data as any).name, tour_id: applyTourId,
        is_template: false, nodes: freshNodes, connections: freshConns,
        created_at: (data as any).created_at, updated_at: (data as any).updated_at,
      }, ...prev.filter(p => p.id !== existing?.id)]);
      setApplyTourId(null);
      setSelectedTemplateId('');
      toast.success('Template aplicado!');
      refreshTasks(true);
    } catch { toast.error('Erro ao aplicar'); }
  };

  // ── Delete process ──
  const deleteProcess = async (id: string) => {
    if (!confirm('Remover processo?')) return;
    // Optimistic: update state first so buttons reappear immediately
    setProcesses(prev => prev.filter(p => p.id !== id));
    toast.success('Removido');
    await supabase.from('process_maps').delete().eq('id', id);
    // Also delete associated tasks
    await (supabase.from('tasks' as any).delete().eq('process_map_id', id) as any);
  };

  // ── Template CRUD ──
  const openNewTemplate = () => {
    setEditingTemplate(null); setTemplateName('');
    setTemplateNodes([]); setTemplateConns([]);
    setShowTemplateDialog(true);
  };
  const openEditTemplate = (tpl: TourProcess) => {
    setEditingTemplate(tpl); setTemplateName(tpl.name);
    setTemplateNodes([...tpl.nodes]); setTemplateConns([...tpl.connections]);
    setShowTemplateDialog(true);
  };
  const saveTemplate = async () => {
    if (!templateName.trim() || !templateNodes.length) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (editingTemplate) {
        await supabase.from('process_maps').update({
          name: templateName.trim(), elements: templateNodes as any,
          connections: templateConns as any, updated_by: user?.id,
        }).eq('id', editingTemplate.id);
        setProcesses(prev => prev.map(p => p.id === editingTemplate.id
          ? { ...p, name: templateName.trim(), nodes: templateNodes, connections: templateConns } : p));
        toast.success('Template atualizado!');
      } else {
        const { data, error } = await supabase.from('process_maps').insert({
          name: templateName.trim(), area: 'Operação', status: 'Ativo',
          elements: templateNodes as any, connections: templateConns as any,
          is_template: true, updated_by: user?.id,
        } as any).select().single();
        if (error) throw error;
        setProcesses(prev => [{
          id: (data as any).id, name: templateName.trim(), tour_id: null,
          is_template: true, nodes: templateNodes, connections: templateConns,
          created_at: (data as any).created_at, updated_at: (data as any).updated_at,
        }, ...prev]);
        toast.success('Template criado!');
      }
      setShowTemplateDialog(false);
    } catch { toast.error('Erro ao salvar'); }
  };
  const deleteTemplate = async (id: string) => {
    if (!confirm('Excluir template?')) return;
    await supabase.from('process_maps').delete().eq('id', id);
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Processos</h2>
          <Badge variant="secondary" className="text-[10px]">
            {upcomingTours.length} próximo(s)
          </Badge>
          {pastTours.length > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {pastTours.length} passado(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pastTours.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <History className="h-3.5 w-3.5" />
              <span>Passados</span>
              <Switch checked={showPast} onCheckedChange={setShowPast} className="scale-75" />
            </label>
          )}
          {templates.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Templates ({templates.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {templates.map(tpl => (
                  <DropdownMenuItem key={tpl.id} className="flex justify-between" onClick={() => openEditTemplate(tpl)}>
                    <span className="truncate">{tpl.name}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge variant="secondary" className="text-[10px] h-5">{tpl.nodes.length}</Badge>
                      <button onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" onClick={openNewTemplate} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Template
          </Button>
        </div>
      </div>

      {/* Tour columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 pb-4 h-full" style={{ minWidth: 'max-content' }}>
            {displayedTours.map(tour => {
              const proc = getProc(tour.id);
              const progress = proc ? getProgress(proc.nodes) : null;

              const isPast = isBefore(new Date((tour.end_date || tour.start_date) + 'T23:59:59'), today);

              return (
                <div key={tour.id} className={cn("w-[280px] flex-shrink-0 rounded-xl border flex flex-col", isPast ? "bg-muted/10 border-border/50 opacity-75" : "bg-muted/20 border-border")} style={{ height: 'calc(100vh - 220px)' }}>
                  {/* Header */}
                  <div className="p-2.5 border-b border-border/40 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="font-medium text-xs truncate">{tour.name}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-1">
                        {isPast && <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">Passado</Badge>}
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(tour.start_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {progress && progress.total > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Progress value={progress.pct} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{progress.pct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Flow editor or empty state */}
                  {proc ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <MiniFlowEditor
                        nodes={proc.nodes}
                        connections={proc.connections}
                        onChange={(nodes, conns) => saveFlow(proc.id, nodes, conns)}
                        tourStartDate={tour.start_date}
                      />
                      <div className="px-2 py-1.5 pb-3 border-t border-border/30 flex-shrink-0">
                        <button
                          onClick={() => deleteProcess(proc.id)}
                          className="text-[10px] text-muted-foreground/50 hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> remover processo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
                      <GitBranch className="h-6 w-6 text-muted-foreground/20" />
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={() => createBlank(tour.id)}>
                        <Plus className="h-3 w-3" /> Criar Processo
                      </Button>
                      {templates.length > 0 && (
                        <Button variant="default" size="sm" className="w-full h-7 text-xs gap-1" onClick={() => { setApplyTourId(tour.id); setSelectedTemplateId(''); }}>
                          <Copy className="h-3 w-3" /> Usar Template
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!displayedTours.length && (
              <div className="flex items-center justify-center w-full text-muted-foreground py-12 text-sm">
                Nenhum passeio ativo
              </div>
            )}
          </div>
      </div>

      {/* Template Dialog - with embedded flow editor */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome do template"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex-1 min-h-[300px] border border-border rounded-lg overflow-hidden">
            <MiniFlowEditor
              nodes={templateNodes}
              connections={templateConns}
              onChange={(nodes, conns) => { setTemplateNodes(nodes); setTemplateConns(conns); }}
            />
          </div>
          {templateNodes.filter(n => n.days_offset != null).length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              <Clock className="h-3 w-3" />
              {templateNodes.filter(n => n.days_offset != null).length} nó(s) com agendamento — serão criadas tarefas automáticas ao aplicar
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveTemplate} disabled={!templateName.trim() || !templateNodes.length}>
              {editingTemplate ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={!!applyTourId} onOpenChange={o => { if (!o) setApplyTourId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Copy className="h-4 w-4 text-primary" /> Aplicar Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Template para <strong>{tours.find(t => t.id === applyTourId)?.name}</strong>
            </p>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.nodes.length} nós)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApplyTourId(null)}>Cancelar</Button>
            <Button size="sm" onClick={applyTemplate} disabled={!selectedTemplateId}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TourProcessesView;
