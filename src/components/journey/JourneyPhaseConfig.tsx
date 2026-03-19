import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, JourneyPhase, JourneyPhaseProcess, JourneyTaskTemplate, getPhaseConfig } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Settings, ListTodo, Zap } from 'lucide-react';
import { toast } from 'sonner';

const JourneyPhaseConfig: React.FC = () => {
  const [processes, setProcesses] = useState<JourneyPhaseProcess[]>([]);
  const [templates, setTemplates] = useState<JourneyTaskTemplate[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<JourneyPhase>('descobre');
  const [newProcessName, setNewProcessName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProcessId, setNewTaskProcessId] = useState<string>('');
  const [newTaskType, setNewTaskType] = useState('manual');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: procs }, { data: tmps }] = await Promise.all([
      supabase.from('journey_phase_processes' as any).select('*').order('order_index') as any,
      supabase.from('journey_task_templates' as any).select('*').order('order_index') as any,
    ]);
    setProcesses(procs || []);
    setTemplates(tmps || []);
    setLoading(false);
  };

  const addProcess = async () => {
    if (!newProcessName.trim()) return;
    const { error } = await (supabase.from('journey_phase_processes' as any).insert({
      phase: selectedPhase,
      name: newProcessName.trim(),
      order_index: processes.filter(p => p.phase === selectedPhase).length,
    }) as any);
    if (error) { toast.error('Erro ao adicionar processo'); return; }
    toast.success('Processo adicionado');
    setNewProcessName('');
    fetchData();
  };

  const deleteProcess = async (id: string) => {
    await (supabase.from('journey_phase_processes' as any).delete().eq('id', id) as any);
    toast.success('Processo removido');
    fetchData();
  };

  const addTaskTemplate = async () => {
    if (!newTaskTitle.trim()) return;
    const { error } = await (supabase.from('journey_task_templates' as any).insert({
      phase: selectedPhase,
      process_id: newTaskProcessId || null,
      title: newTaskTitle.trim(),
      task_type: newTaskType,
      order_index: templates.filter(t => t.phase === selectedPhase).length,
    }) as any);
    if (error) { toast.error('Erro ao adicionar tarefa'); return; }
    toast.success('Template de tarefa adicionado');
    setNewTaskTitle('');
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    await (supabase.from('journey_task_templates' as any).delete().eq('id', id) as any);
    toast.success('Template removido');
    fetchData();
  };

  const phaseProcesses = processes.filter(p => p.phase === selectedPhase);
  const phaseTasks = templates.filter(t => t.phase === selectedPhase);
  const pc = getPhaseConfig(selectedPhase);

  return (
    <div className="space-y-6">
      {/* Phase selector */}
      <div className="flex gap-2 flex-wrap">
        {JOURNEY_PHASES.map(phase => (
          <Button
            key={phase.id}
            variant={selectedPhase === phase.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPhase(phase.id)}
            style={selectedPhase === phase.id ? { backgroundColor: phase.color } : {}}
          >
            {phase.icon} {phase.label}
          </Button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Processes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Processos - {pc.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phaseProcesses.map(proc => (
              <div key={proc.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="flex-1 text-sm font-medium">{proc.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteProcess(proc.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Novo processo..."
                value={newProcessName}
                onChange={e => setNewProcessName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProcess()}
                className="text-sm"
              />
              <Button size="sm" onClick={addProcess}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Task templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Templates de Tarefas - {pc.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phaseTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className="text-[10px]">
                  {task.task_type === 'automatic' ? <Zap className="h-3 w-3 mr-1" /> : null}
                  {task.task_type === 'automatic' ? 'Auto' : 'Manual'}
                </Badge>
                <span className="flex-1 text-sm">{task.title}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTemplate(task.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tarefa..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTaskTemplate()}
                  className="text-sm"
                />
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automática</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addTaskTemplate}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JourneyPhaseConfig;
