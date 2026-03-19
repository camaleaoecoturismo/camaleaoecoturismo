import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Trash2, Trophy, Flame, Star, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTaskSteps } from '@/hooks/useTaskSteps';

interface TaskStepsExpanderProps {
  taskId: string;
  onAutoComplete?: () => void;
}

const TaskStepsExpander: React.FC<TaskStepsExpanderProps> = ({ taskId, onAutoComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { steps, addStep, toggleStep, deleteStep, completedCount, totalCount, progress, isAllDone } = useTaskSteps(taskId, onAutoComplete);

  // Close on click outside
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handleAddStep = async () => {
    if (!newStepTitle.trim()) return;
    await addStep(newStepTitle.trim());
    setNewStepTitle('');
  };

  if (totalCount === 0 && !isExpanded) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
        className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
        <span>Etapas</span>
      </button>
    );
  }

  // Progress bar color based on completion
  const getProgressColor = () => {
    if (isAllDone) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-amber-400';
    if (progress >= 50) return 'bg-blue-400';
    if (progress > 0) return 'bg-primary/60';
    return 'bg-gray-200';
  };

  // Achievement badge
  const getAchievementIcon = () => {
    if (isAllDone) return <Trophy className="h-3 w-3 text-amber-500" />;
    if (progress >= 75) return <Flame className="h-3 w-3 text-orange-500" />;
    if (progress >= 50) return <Star className="h-3 w-3 text-blue-400" />;
    if (progress > 0) return <Sparkles className="h-3 w-3 text-purple-400" />;
    return null;
  };

  return (
    <div className="mt-1.5" onClick={(e) => e.stopPropagation()} ref={containerRef}>
      {/* Progress bar + expand trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 group/steps"
      >
        {/* Mini progress bar */}
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              getProgressColor(),
              isAllDone && "animate-pulse"
            )}
            style={{ width: `${Math.max(progress, totalCount > 0 ? 3 : 0)}%` }}
          />
        </div>

        {/* Count + icon */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {getAchievementIcon()}
          <span className={cn(
            "text-[10px] font-bold tabular-nums",
            isAllDone ? "text-emerald-600" : "text-muted-foreground"
          )}>
            {completedCount}/{totalCount}
          </span>
          <ChevronDown className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded steps list */}
      {isExpanded && (
        <div className="mt-2 space-y-1 animate-fade-in">
          {/* All done celebration */}
          {isAllDone && totalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200 mb-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-emerald-700">
                Missão concluída! 🎉
              </span>
            </div>
          )}

          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all duration-200 group/step",
                step.is_completed
                  ? "bg-emerald-50/50"
                  : "hover:bg-gray-50"
              )}
            >
              {/* Checkbox with gamified animation */}
              <button
                onClick={() => toggleStep(step.id)}
                className={cn(
                  "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  step.is_completed
                    ? "bg-emerald-500 border-emerald-500 scale-110"
                    : "border-gray-300 hover:border-primary hover:scale-110"
                )}
              >
                {step.is_completed && (
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                )}
              </button>

              {/* Step title */}
              <span className={cn(
                "text-[11px] flex-1 leading-tight transition-all",
                step.is_completed
                  ? "line-through text-gray-400"
                  : "text-gray-700"
              )}>
                {step.title}
              </span>

              {/* XP badge on completion */}
              {step.is_completed && (
                <span className="text-[8px] font-bold text-emerald-500 bg-emerald-100 px-1 rounded-sm flex-shrink-0">
                  +XP
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteStep(step.id)}
                className="opacity-0 group-hover/step:opacity-100 p-0.5 hover:bg-red-100 rounded transition-opacity flex-shrink-0"
              >
                <Trash2 className="h-2.5 w-2.5 text-red-400" />
              </button>
            </div>
          ))}

          {/* Add step input */}
          {isAdding ? (
            <div className="flex items-center gap-1 mt-1">
              <Input
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStep();
                  if (e.key === 'Escape') { setIsAdding(false); setNewStepTitle(''); }
                }}
                placeholder="Nova etapa..."
                className="h-6 text-[11px] px-2"
                autoFocus
              />
              <button
                onClick={handleAddStep}
                className="p-1 bg-primary text-white rounded hover:bg-primary/90 flex-shrink-0"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5"
            >
              <Plus className="h-3 w-3" />
              <span>Adicionar etapa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskStepsExpander;
