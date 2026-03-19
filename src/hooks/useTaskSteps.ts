import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Cache steps by task_id to avoid re-fetching
const stepsCache = new Map<string, TaskStep[]>();

// ── Sync steps back to process map subtasks ──
const syncStepsToProcessMap = async (taskId: string, steps: { title: string; is_completed: boolean }[]) => {
  // Find the task to get process_map_id and process_element_id
  const { data: task } = await (supabase.from('tasks' as any)
    .select('process_map_id, process_element_id')
    .eq('id', taskId)
    .maybeSingle() as any);

  if (!task?.process_map_id || !task?.process_element_id) return;

  // Fetch the process map
  const { data: processMap } = await supabase.from('process_maps')
    .select('elements')
    .eq('id', task.process_map_id)
    .maybeSingle();

  if (!processMap?.elements) return;

  const nodes = processMap.elements as any[];
  const nodeIdx = nodes.findIndex((n: any) => n.id === task.process_element_id);
  if (nodeIdx === -1) return;

  // Convert steps to subtask format (with ✓ prefix for completed)
  const subtasks = steps.map(s => s.is_completed ? `✓ ${s.title}` : s.title);

  // Only update if actually different
  const currentSubs = JSON.stringify(nodes[nodeIdx].subtasks || []);
  const newSubs = JSON.stringify(subtasks);
  if (currentSubs === newSubs) return;

  nodes[nodeIdx] = { ...nodes[nodeIdx], subtasks };

  await supabase.from('process_maps').update({
    elements: nodes as any,
  }).eq('id', task.process_map_id);
};

export const useTaskSteps = (taskId: string | null, onAllCompleted?: () => void) => {
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSteps = useCallback(async () => {
    if (!taskId) { setSteps([]); return; }
    
    // Use cache if available
    const cached = stepsCache.get(taskId);
    if (cached) setSteps(cached);
    
    setLoading(true);
    const { data } = await (supabase
      .from('task_steps' as any)
      .select('*')
      .eq('task_id', taskId)
      .order('order_index') as any);
    
    const result = (data || []) as TaskStep[];
    stepsCache.set(taskId, result);
    setSteps(result);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { fetchSteps(); }, [fetchSteps]);

  const addStep = async (title: string) => {
    if (!taskId) return;
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_index)) + 1 : 0;
    const { error } = await (supabase.from('task_steps' as any).insert({
      task_id: taskId,
      title,
      order_index: maxOrder,
    }) as any);
    if (!error) {
      await fetchSteps();
      // Sync to process map using fresh cache
      const freshSteps = stepsCache.get(taskId) || [];
      syncStepsToProcessMap(taskId, freshSteps.map(s => ({ title: s.title, is_completed: s.is_completed })));
    }
    return error;
  };

  const toggleStep = async (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !taskId) return;
    const newCompleted = !step.is_completed;
    
    // Optimistic update
    const updated = steps.map(s => s.id === stepId
      ? { ...s, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
      : s
    );
    stepsCache.set(taskId, updated);
    setSteps(updated);

    // Check if all steps are now completed
    const allDone = updated.length > 0 && updated.every(s => s.is_completed);
    if (allDone && onAllCompleted) {
      onAllCompleted();
    }
    
    await (supabase.from('task_steps' as any).update({
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq('id', stepId) as any);

    // Sync to process map
    syncStepsToProcessMap(taskId, updated.map(s => ({ title: s.title, is_completed: s.is_completed })));
  };

  const deleteStep = async (stepId: string) => {
    if (!taskId) return;
    const updated = steps.filter(s => s.id !== stepId);
    stepsCache.set(taskId, updated);
    setSteps(updated);
    
    await (supabase.from('task_steps' as any).delete().eq('id', stepId) as any);

    // Sync to process map
    syncStepsToProcessMap(taskId, updated.map(s => ({ title: s.title, is_completed: s.is_completed })));
  };

  const updateStep = async (stepId: string, title: string) => {
    if (!taskId) return;
    const updated = steps.map(s => s.id === stepId ? { ...s, title } : s);
    stepsCache.set(taskId, updated);
    setSteps(updated);
    
    await (supabase.from('task_steps' as any).update({ title }).eq('id', stepId) as any);

    // Sync to process map
    syncStepsToProcessMap(taskId, updated.map(s => ({ title: s.title, is_completed: s.is_completed })));
  };

  const completedCount = steps.filter(s => s.is_completed).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return {
    steps, loading,
    addStep, toggleStep, deleteStep, updateStep,
    completedCount, totalCount, progress, isAllDone,
    refetch: fetchSteps,
  };
};

// Preload steps for multiple tasks at once
export const preloadTaskSteps = async (taskIds: string[]) => {
  if (taskIds.length === 0) return;
  const uncached = taskIds.filter(id => !stepsCache.has(id));
  if (uncached.length === 0) return;
  
  const { data } = await (supabase
    .from('task_steps' as any)
    .select('*')
    .in('task_id', uncached)
    .order('order_index') as any);
  
  if (data) {
    // Group by task_id
    const grouped = new Map<string, TaskStep[]>();
    uncached.forEach(id => grouped.set(id, []));
    (data as TaskStep[]).forEach(step => {
      const arr = grouped.get(step.task_id) || [];
      arr.push(step);
      grouped.set(step.task_id, arr);
    });
    grouped.forEach((steps, taskId) => stepsCache.set(taskId, steps));
  }
};
