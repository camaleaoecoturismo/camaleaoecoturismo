import React from 'react';
import { ProcessElement, ProcessStage, ProcessTaskConfig } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ListTodo } from 'lucide-react';

interface ProcessTaskConfigPanelProps {
  element: ProcessElement;
  stages: ProcessStage[];
  onUpdate: (id: string, updates: Partial<ProcessElement>) => void;
}

const ASSIGNEES = [
  { id: 'isaias', name: 'Isaias' },
  { id: 'amanda', name: 'Amanda' },
];

const QUADRANTS = [
  { id: 'urgent_important', label: 'Urgente e Importante' },
  { id: 'not_urgent_important', label: 'Importante, Não Urgente' },
  { id: 'urgent_not_important', label: 'Urgente, Não Importante' },
  { id: 'not_urgent_not_important', label: 'Nem Urgente, Nem Importante' },
];

const ProcessTaskConfigPanel: React.FC<ProcessTaskConfigPanelProps> = ({
  element,
  stages,
  onUpdate,
}) => {
  if (element.type !== 'process') return null;

  const config = element.task_config || {
    task_name: element.text,
    task_description: '',
    task_priority: 'not_urgent_important',
    task_assignee: undefined,
    stage_id: undefined,
  };

  const updateConfig = (updates: Partial<ProcessTaskConfig>) => {
    onUpdate(element.id, {
      task_config: { ...config, ...updates },
    });
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Gerar Tarefa</Label>
        </div>
        <Switch
          checked={element.generates_task || false}
          onCheckedChange={(checked) => {
            onUpdate(element.id, { 
              generates_task: checked,
              task_config: checked ? { 
                task_name: element.text, 
                task_priority: 'not_urgent_important' 
              } : undefined,
            });
          }}
        />
      </div>

      {element.generates_task && (
        <div className="space-y-2.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome da tarefa</Label>
            <Input
              value={config.task_name || ''}
              onChange={e => updateConfig({ task_name: e.target.value })}
              placeholder="Nome da tarefa..."
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea
              value={config.task_description || ''}
              onChange={e => updateConfig({ task_description: e.target.value })}
              placeholder="Detalhes..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select 
                value={config.task_priority || 'not_urgent_important'} 
                onValueChange={v => updateConfig({ task_priority: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUADRANTS.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select 
                value={config.task_assignee || 'none'} 
                onValueChange={v => updateConfig({ task_assignee: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {ASSIGNEES.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {stages.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Etapa do processo</Label>
              <Select 
                value={config.stage_id || 'none'} 
                onValueChange={v => updateConfig({ stage_id: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Nenhuma etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma etapa</SelectItem>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessTaskConfigPanel;
