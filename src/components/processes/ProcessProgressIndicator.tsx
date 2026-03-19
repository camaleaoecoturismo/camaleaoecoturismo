import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GitBranch, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ELEMENT_COLORS } from './types';

interface ProcessInstance {
  instanceId: string;
  processName: string;
  totalTasks: number;
  completedTasks: number;
  stages: {
    name: string;
    color?: string;
    total: number;
    completed: number;
  }[];
}

interface ProcessProgressIndicatorProps {
  instances: ProcessInstance[];
  compact?: boolean;
}

const ProcessProgressIndicator: React.FC<ProcessProgressIndicatorProps> = ({ instances, compact = false }) => {
  if (instances.length === 0) return null;

  return (
    <div className="space-y-2">
      {instances.map(inst => {
        const pct = inst.totalTasks > 0 ? Math.round((inst.completedTasks / inst.totalTasks) * 100) : 0;
        const isComplete = pct === 100;

        if (compact) {
          return (
            <div key={inst.instanceId} className="flex items-center gap-2">
              <GitBranch className={cn("h-3 w-3 flex-shrink-0", isComplete ? "text-green-500" : "text-primary")} />
              <span className="text-[10px] truncate max-w-[80px]">{inst.processName}</span>
              <Progress value={pct} className="h-1.5 flex-1 max-w-[60px]" />
              <span className="text-[10px] text-muted-foreground">{pct}%</span>
            </div>
          );
        }

        return (
          <div key={inst.instanceId} className="bg-muted/30 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <GitBranch className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm font-medium">{inst.processName}</span>
              </div>
              <Badge variant={isComplete ? 'default' : 'secondary'} className="text-xs">
                {inst.completedTasks}/{inst.totalTasks}
              </Badge>
            </div>
            
            <Progress value={pct} className="h-2" />

            {inst.stages.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {inst.stages.map((stage, i) => {
                  const stagePct = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0;
                  const stageComplete = stagePct === 100;
                  return (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 gap-1",
                        stageComplete && "bg-green-50 border-green-200"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: ELEMENT_COLORS[stage.color || 'blue']?.bg || '#3b82f6' }}
                      />
                      {stage.name} {stage.completed}/{stage.total}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProcessProgressIndicator;
