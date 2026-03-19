import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { GitBranch, ListTodo, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessMap, ProcessElement, ProcessStage } from './types';
import { toast } from 'sonner';
import { ELEMENT_COLORS } from './types';

interface StartProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourName: string;
  onProcessStarted: () => void;
}

const StartProcessDialog: React.FC<StartProcessDialogProps> = ({
  open,
  onOpenChange,
  tourId,
  tourName,
  onProcessStarted,
}) => {
  const [maps, setMaps] = useState<ProcessMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (open) fetchMaps();
  }, [open]);

  const fetchMaps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_maps')
        .select('*')
        .in('status', ['Validado', 'Ativo'])
        .order('name');
      
      if (error) throw error;
      
      const typedMaps: ProcessMap[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        area: item.area as ProcessMap['area'],
        status: item.status as ProcessMap['status'],
        elements: (item.elements as unknown as ProcessElement[]) || [],
        connections: (item.connections as unknown as any[]) || [],
        stages: (item.stages as unknown as ProcessStage[]) || [],
        canvas_settings: (item.canvas_settings as unknown as ProcessMap['canvas_settings']) || { width: 1200, height: 800 },
        created_at: item.created_at,
        updated_at: item.updated_at,
        updated_by: item.updated_by || undefined,
      }));
      
      setMaps(typedMaps);
    } catch (error) {
      console.error('Error fetching process maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMap = maps.find(m => m.id === selectedMapId);
  const taskElements = selectedMap?.elements.filter(el => el.type === 'process' && el.generates_task) || [];

  const handleStartProcess = async () => {
    if (!selectedMap || taskElements.length === 0) return;
    setStarting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const instanceId = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Create tasks for each process element marked as "generates_task"
      const tasksToInsert = taskElements.map((el, idx) => ({
        title: el.task_config?.task_name || el.text,
        description: el.task_config?.task_description || null,
        status: 'todo',
        quadrant: el.task_config?.task_priority || 'not_urgent_important',
        tour_id: tourId,
        assignee: el.task_config?.task_assignee || null,
        user_id: userData.user?.id,
        process_map_id: selectedMap.id,
        process_instance_id: instanceId,
        process_stage: el.task_config?.stage_id || null,
        process_element_id: el.id,
        order_index: idx,
      }));

      const { error } = await (supabase.from('tasks' as any).insert(tasksToInsert) as any);
      if (error) throw error;

      toast.success(`${tasksToInsert.length} tarefas criadas do processo "${selectedMap.name}"`);
      onProcessStarted();
      onOpenChange(false);
      setSelectedMapId('');
    } catch (error) {
      console.error('Error starting process:', error);
      toast.error('Erro ao iniciar processo');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Iniciar Processo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Selecione um processo template para gerar tarefas vinculadas ao passeio <strong>{tourName}</strong>.
          </div>

          <div className="space-y-2">
            <Label>Processo Template</Label>
            <Select value={selectedMapId} onValueChange={setSelectedMapId}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Carregando..." : "Selecione um processo"} />
              </SelectTrigger>
              <SelectContent>
                {maps.map(map => (
                  <SelectItem key={map.id} value={map.id}>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      {map.name}
                      <Badge variant="outline" className="text-[10px]">{map.area}</Badge>
                    </div>
                  </SelectItem>
                ))}
                {maps.length === 0 && !loading && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Nenhum processo com status "Validado" ou "Ativo" encontrado
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedMap && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tarefas a serem criadas:</span>
                <Badge>{taskElements.length}</Badge>
              </div>
              
              {taskElements.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Este processo não possui nós com "Gerar tarefa" ativado. Edite o processo para configurar.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-auto">
                  {taskElements.map(el => {
                    const stage = selectedMap.stages.find(s => s.id === el.task_config?.stage_id);
                    return (
                      <div key={el.id} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1.5">
                        <ListTodo className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="flex-1 truncate">{el.task_config?.task_name || el.text}</span>
                        {stage && (
                          <Badge variant="outline" className="text-[9px] px-1">
                            <div 
                              className="w-2 h-2 rounded-full mr-1" 
                              style={{ backgroundColor: ELEMENT_COLORS[stage.color || 'blue']?.bg }}
                            />
                            {stage.name}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleStartProcess} 
            disabled={!selectedMapId || taskElements.length === 0 || starting}
            className="gap-1"
          >
            <Play className="h-4 w-4" />
            {starting ? 'Criando tarefas...' : 'Iniciar Processo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartProcessDialog;
