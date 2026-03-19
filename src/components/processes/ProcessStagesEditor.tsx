import React, { useState } from 'react';
import { ProcessStage, ELEMENT_COLORS, DEFAULT_STAGES } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessStagesEditorProps {
  stages: ProcessStage[];
  onChange: (stages: ProcessStage[]) => void;
}

const ProcessStagesEditor: React.FC<ProcessStagesEditorProps> = ({ stages, onChange }) => {
  const [newStageName, setNewStageName] = useState('');

  const addStage = () => {
    if (!newStageName.trim()) return;
    const newStage: ProcessStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      order_index: stages.length,
      color: Object.keys(ELEMENT_COLORS)[stages.length % Object.keys(ELEMENT_COLORS).length],
    };
    onChange([...stages, newStage]);
    setNewStageName('');
  };

  const removeStage = (id: string) => {
    onChange(stages.filter(s => s.id !== id).map((s, i) => ({ ...s, order_index: i })));
  };

  const updateStage = (id: string, updates: Partial<ProcessStage>) => {
    onChange(stages.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const loadDefaults = () => {
    onChange(DEFAULT_STAGES);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Etapas do Processo</h4>
        {stages.length === 0 && (
          <Button variant="outline" size="sm" onClick={loadDefaults} className="gap-1">
            <Wand2 className="h-3 w-3" />
            Carregar Padrão
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5">
            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: ELEMENT_COLORS[stage.color || 'blue']?.bg || '#3b82f6' }}
            />
            <Input
              value={stage.name}
              onChange={e => updateStage(stage.id, { name: e.target.value })}
              className="h-7 text-sm flex-1"
            />
            <div className="flex gap-0.5">
              {Object.entries(ELEMENT_COLORS).slice(0, 5).map(([key, val]) => (
                <button
                  key={key}
                  className={cn(
                    "w-4 h-4 rounded-full border",
                    stage.color === key ? "ring-1 ring-offset-1 ring-primary" : ""
                  )}
                  style={{ backgroundColor: val.bg, borderColor: val.border }}
                  onClick={() => updateStage(stage.id, { color: key })}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStage(stage.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nova etapa..."
          value={newStageName}
          onChange={e => setNewStageName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStage()}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={addStage} disabled={!newStageName.trim()} className="gap-1">
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>
    </div>
  );
};

export default ProcessStagesEditor;
