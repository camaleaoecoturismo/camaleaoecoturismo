import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 22;
const SNAP_MINUTES = 15;
const MIN_DURATION = 15;
const MAX_DURATION = 480;

const ASSIGNEES = [
  { id: 'isaias', name: 'Isaias', initials: 'IS', color: 'bg-blue-500' },
  { id: 'amanda', name: 'Amanda', initials: 'AM', color: 'bg-pink-500' },
];

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  quadrant: string;
  tour_id: string | null;
  order_index: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  assignee: string | null;
  amanda_status: string | null;
  duration_minutes: number | null;
}

interface AgendaViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  fetchTasks: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask: (defaults: { due_date: string; duration_minutes?: number }) => void;
  currentWeek: Date;
  setCurrentWeek: React.Dispatch<React.SetStateAction<Date>>;
  draggedTaskId: string | null;
  setDraggedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  handleDragStart: (e: React.DragEvent, taskId: string) => void;
  handleDragEnd: () => void;
  getTourName: (tourId: string | null) => string | null;
  currentProfile?: { id: string; isAdmin?: boolean } | null;
  tours: Tour[];
}

const snapToGrid = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

const formatLocalDateTime = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

const hasTimeComponent = (dueDate: string) => {
  return dueDate.includes('T') && !dueDate.endsWith('T00:00:00') && !dueDate.endsWith('T00:00');
};

const yToTime = (y: number) => {
  const totalMinutes = (y / HOUR_HEIGHT) * 60;
  const snapped = snapToGrid(totalMinutes);
  const hour = Math.floor(snapped / 60) + START_HOUR;
  const minute = snapped % 60;
  return { hour: Math.max(START_HOUR, Math.min(END_HOUR - 1, hour)), minute };
};

const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  setTasks,
  fetchTasks,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  currentWeek,
  setCurrentWeek,
  draggedTaskId,
  setDraggedTaskId,
  handleDragStart,
  handleDragEnd,
  getTourName,
  currentProfile,
  tours,
}) => {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const today = new Date();
  const { toast } = useToast();

  // === Resize State ===
  const [resizing, setResizing] = useState<{
    taskId: string;
    edge: 'top' | 'bottom';
    startY: number;
    initialDuration: number;
    initialDueDate: string;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ taskId: string; top: number; height: number } | null>(null);

  // === Click-drag to create State ===
  const [creating, setCreating] = useState<{
    dayIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);
  const gridRefs = useRef<(HTMLDivElement | null)[]>([]);

  // === Quick-add popup state ===
  const [quickAdd, setQuickAdd] = useState<{
    dayIndex: number;
    due_date: string;
    duration_minutes: number;
    top: number;
    title: string;
    description: string;
    status: string;
    quadrant: string;
    tour_id: string | null;
    assignee: string | null;
  } | null>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const activeTours = useMemo(() => tours.filter(t => t.is_active), [tours]);

  const KANBAN_COLUMNS = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'todo', label: 'A Fazer' },
    { id: 'in_progress', label: 'Em Andamento' },
    { id: 'done', label: 'Concluído' },
  ];
  const EISENHOWER_QUADRANTS = [
    { id: 'urgent_important', label: 'Urgente e Importante' },
    { id: 'not_urgent_important', label: 'Importante, Não Urgente' },
    { id: 'urgent_not_important', label: 'Urgente, Não Importante' },
    { id: 'not_urgent_not_important', label: 'Nem Urgente, Nem Importante' },
  ];

  // Task helpers
  const getTaskDuration = (task: Task) => task.duration_minutes || 60;

  const unscheduledTasks = tasks.filter(t => !t.due_date);

  const getAllDayTasks = (date: Date) =>
    tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), date) && !hasTimeComponent(t.due_date!));

  const getScheduledTasks = (date: Date) =>
    tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), date) && hasTimeComponent(t.due_date!));

  const getTaskPosition = (task: Task) => {
    if (!task.due_date || !hasTimeComponent(task.due_date)) return null;
    const taskDate = parseISO(task.due_date);
    const totalMinutes = (taskDate.getHours() - START_HOUR) * 60 + taskDate.getMinutes();
    const top = Math.max(0, (totalMinutes / 60) * HOUR_HEIGHT);

    let duration = getTaskDuration(task);
    if (resizePreview?.taskId === task.id) {
      return { top: resizePreview.top, height: resizePreview.height, startTime: taskDate };
    }
    const height = (duration / 60) * HOUR_HEIGHT;
    return { top, height, startTime: taskDate };
  };

  // === Resize handlers ===
  const onResizeStart = (e: React.MouseEvent, task: Task, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      taskId: task.id,
      edge,
      startY: e.clientY,
      initialDuration: getTaskDuration(task),
      initialDueDate: task.due_date!,
    });
    const pos = getTaskPosition(task);
    if (pos) setResizePreview({ taskId: task.id, top: pos.top, height: pos.height });
  };

  useEffect(() => {
    if (!resizing) return;
    const task = tasks.find(t => t.id === resizing.taskId);
    if (!task) return;
    const initialPos = (() => {
      const taskDate = parseISO(resizing.initialDueDate);
      const totalMin = (taskDate.getHours() - START_HOUR) * 60 + taskDate.getMinutes();
      const top = Math.max(0, (totalMin / 60) * HOUR_HEIGHT);
      const height = (resizing.initialDuration / 60) * HOUR_HEIGHT;
      return { top, height };
    })();

    const onMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizing.startY;
      if (resizing.edge === 'bottom') {
        const newHeight = Math.max((MIN_DURATION / 60) * HOUR_HEIGHT, initialPos.height + deltaY);
        const snappedHeight = snapToGrid((newHeight / HOUR_HEIGHT) * 60) / 60 * HOUR_HEIGHT;
        setResizePreview({ taskId: resizing.taskId, top: initialPos.top, height: Math.max((MIN_DURATION / 60) * HOUR_HEIGHT, snappedHeight) });
      } else {
        const newTop = Math.max(0, initialPos.top + deltaY);
        const snappedTop = snapToGrid((newTop / HOUR_HEIGHT) * 60) / 60 * HOUR_HEIGHT;
        const newHeight = initialPos.top + initialPos.height - snappedTop;
        if (newHeight >= (MIN_DURATION / 60) * HOUR_HEIGHT) {
          setResizePreview({ taskId: resizing.taskId, top: snappedTop, height: newHeight });
        }
      }
    };

    const onUp = async () => {
      if (resizePreview) {
        const newDurationMinutes = Math.round(Math.min(MAX_DURATION, Math.max(MIN_DURATION, (resizePreview.height / HOUR_HEIGHT) * 60)));
        const updates: any = { duration_minutes: newDurationMinutes };

        if (resizing.edge === 'top') {
          const newTimeMinutes = (resizePreview.top / HOUR_HEIGHT) * 60;
          const { hour, minute } = yToTime(resizePreview.top);
          const oldDate = parseISO(resizing.initialDueDate);
          const newDate = new Date(oldDate);
          newDate.setHours(hour, minute, 0, 0);
          updates.due_date = formatLocalDateTime(newDate);
        }

        setTasks(prev => prev.map(t =>
          t.id === resizing.taskId
            ? { ...t, duration_minutes: newDurationMinutes, ...(updates.due_date ? { due_date: updates.due_date } : {}) }
            : t
        ));

        try {
          await (supabase.from('tasks' as any).update(updates).eq('id', resizing.taskId) as any);
        } catch {
          fetchTasks();
        }
      }
      setResizing(null);
      setResizePreview(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing, resizePreview]);

  // === Click-drag to create handlers ===
  const onGridMouseDown = (e: React.MouseEvent, dayIndex: number) => {
    // Only on empty area (not on tasks)
    if ((e.target as HTMLElement).closest('[data-task]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setCreating({ dayIndex, startY: y, currentY: y });
  };

  useEffect(() => {
    if (!creating) return;

    const onMove = (e: MouseEvent) => {
      const ref = gridRefs.current[creating.dayIndex];
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const y = Math.max(0, Math.min(hours.length * HOUR_HEIGHT, e.clientY - rect.top));
      setCreating(prev => prev ? { ...prev, currentY: y } : null);
    };

    const onUp = () => {
      if (!creating) return;
      const minY = Math.min(creating.startY, creating.currentY);
      const maxY = Math.max(creating.startY, creating.currentY);
      const diffPx = maxY - minY;

      const { hour: startHour, minute: startMinute } = yToTime(minY);
      const durationMin = Math.max(MIN_DURATION, snapToGrid((diffPx / HOUR_HEIGHT) * 60));

      const day = weekDays[creating.dayIndex];
      const newDate = new Date(day);
      newDate.setHours(startHour, startMinute, 0, 0);

      const snappedTop = snapToGrid((minY / HOUR_HEIGHT) * 60) / 60 * HOUR_HEIGHT;

      setCreating(null);
      setQuickAdd({
        dayIndex: creating.dayIndex,
        due_date: formatLocalDateTime(newDate),
        duration_minutes: durationMin,
        top: snappedTop,
        title: '',
        description: '',
        status: 'todo',
        quadrant: 'not_urgent_important',
        tour_id: null,
        assignee: null,
      });
      // Focus the input after render
      setTimeout(() => quickAddInputRef.current?.focus(), 50);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [creating, weekDays]);

  // === Drag & Drop to move tasks ===
  const handleAgendaDrop = async (e: React.DragEvent, date: Date, offsetY: number) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const { hour, minute } = yToTime(offsetY);
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    const newDueDate = formatLocalDateTime(newDate);

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDueDate } : t));
    try {
      await (supabase.from('tasks' as any).update({ due_date: newDueDate }).eq('id', taskId) as any);
    } catch {
      fetchTasks();
    }
    setDraggedTaskId(null);
  };

  // Overlap logic
  const getOverlapColumns = (scheduledTasks: Task[]) => {
    const positions = scheduledTasks.map(t => ({ task: t, pos: getTaskPosition(t) })).filter(p => p.pos);
    const columns: { task: Task; pos: NonNullable<ReturnType<typeof getTaskPosition>>; col: number }[] = [];

    positions.forEach(({ task, pos }) => {
      let col = 0;
      while (columns.some(c =>
        c.col === col &&
        pos!.top < c.pos.top + c.pos.height &&
        pos!.top + pos!.height > c.pos.top
      )) { col++; }
      columns.push({ task, pos: pos!, col });
    });

    const maxCol = columns.length > 0 ? Math.max(...columns.map(c => c.col)) + 1 : 1;
    return columns.map(c => ({ ...c, totalCols: maxCol }));
  };

  // === Quick-add save handler ===
  const handleQuickAddSave = async () => {
    if (!quickAdd || !quickAdd.title.trim()) {
      if (!quickAdd?.title.trim()) {
        toast({ title: "Digite um título para a tarefa", variant: "destructive" });
      }
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      let finalAssignee = quickAdd.assignee;
      if (!finalAssignee && currentProfile && !currentProfile.isAdmin) {
        finalAssignee = currentProfile.id;
      }
      const { error } = await (supabase.from('tasks' as any).insert({
        title: quickAdd.title.trim(),
        description: quickAdd.description.trim() || null,
        status: quickAdd.status,
        quadrant: quickAdd.quadrant,
        tour_id: quickAdd.tour_id || null,
        due_date: quickAdd.due_date,
        duration_minutes: quickAdd.duration_minutes,
        assignee: finalAssignee,
        user_id: userData.user?.id,
      }) as any);
      if (error) throw error;
      toast({ title: "Tarefa adicionada!" });
      setQuickAdd(null);
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col select-none">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {format(currentWeek, "dd MMM", { locale: ptBR })} - {format(addDays(currentWeek, 6), "dd MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoje
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Unscheduled sidebar */}
        <div
          className="w-36 flex-shrink-0 bg-gray-50 rounded-lg p-2 transition-colors"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('bg-primary/10', 'ring-2', 'ring-primary/30'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/10', 'ring-2', 'ring-primary/30'); }}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('bg-primary/10', 'ring-2', 'ring-primary/30');
            const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
            if (taskId) {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: null } : t));
              try { await (supabase.from('tasks' as any).update({ due_date: null }).eq('id', taskId) as any); } catch { fetchTasks(); }
            }
            setDraggedTaskId(null);
          }}
        >
          <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Sem Data ({unscheduledTasks.length})
          </h4>
          <ScrollArea className="h-[calc(100%-24px)]">
            <div className="space-y-1.5 pr-2">
              {unscheduledTasks.map(task => (
                <MiniTaskCard
                  key={task.id}
                  task={task}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={onEditTask}
                  isDragging={draggedTaskId === task.id}
                  getTourName={getTourName}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Calendar Grid */}
        <ScrollArea className="flex-1">
          <div className="min-w-[650px]">
            {/* Day headers */}
            <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px bg-gray-200 sticky top-0 z-20">
              <div className="bg-gray-50 p-1" />
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                return (
                  <div key={i} className={cn("bg-gray-50 p-1.5 text-center", isToday && "bg-primary/10")}>
                    <div className={cn("text-[10px] font-medium uppercase", isToday ? "text-primary" : "text-gray-500")}>
                      {format(day, "EEE", { locale: ptBR })}
                    </div>
                    <div className={cn("text-base font-bold", isToday ? "bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto" : "text-gray-900")}>
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All-day row */}
            <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px bg-gray-100 border-b border-gray-200">
              <div className="bg-gray-50 p-1 text-[9px] text-gray-400 text-right pr-1">dia</div>
              {weekDays.map((day, i) => {
                const allDayTasks = getAllDayTasks(day);
                return (
                  <div
                    key={i}
                    className={cn("min-h-[28px] p-0.5 flex flex-wrap gap-0.5", isSameDay(day, today) && "bg-primary/5")}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
                      if (taskId) {
                        const newDate = format(day, 'yyyy-MM-dd');
                        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t));
                        supabase.from('tasks' as any).update({ due_date: newDate }).eq('id', taskId);
                      }
                      setDraggedTaskId(null);
                    }}
                  >
                    {allDayTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEditTask(task)}
                        className={cn(
                          "flex-1 min-w-0 bg-primary/80 text-white text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary",
                          draggedTaskId === task.id && "opacity-50"
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[40px_repeat(7,1fr)] bg-white">
              {/* Hours */}
              <div className="bg-gray-50 border-r border-gray-200">
                {hours.map(hour => (
                  <div key={hour} className="text-[10px] text-gray-400 text-right pr-1 border-t border-gray-100" style={{ height: HOUR_HEIGHT }}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIndex) => {
                const scheduledTasks = getScheduledTasks(day);
                const isToday = isSameDay(day, today);
                const overlapData = getOverlapColumns(scheduledTasks);

                return (
                  <div
                    key={dayIndex}
                    ref={el => { gridRefs.current[dayIndex] = el; }}
                    className={cn("relative border-r border-gray-100 cursor-crosshair", isToday && "bg-primary/5")}
                    style={{ height: hours.length * HOUR_HEIGHT }}
                    onMouseDown={(e) => onGridMouseDown(e, dayIndex)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleAgendaDrop(e, day, e.clientY - rect.top);
                    }}
                  >
                    {/* Hour lines */}
                    {hours.map((hour, i) => (
                      <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
                    ))}
                    {/* Half-hour lines */}
                    {hours.map((hour, i) => (
                      <div key={`${hour}-30`} className="absolute w-full border-t border-dashed border-gray-50" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                    ))}

                    {/* Click-drag creation preview */}
                    {creating && creating.dayIndex === dayIndex && (() => {
                      const minY = Math.min(creating.startY, creating.currentY);
                      const maxY = Math.max(creating.startY, creating.currentY);
                      const snappedTop = snapToGrid((minY / HOUR_HEIGHT) * 60) / 60 * HOUR_HEIGHT;
                      const snappedHeight = Math.max(
                        (MIN_DURATION / 60) * HOUR_HEIGHT,
                        snapToGrid(((maxY - minY) / HOUR_HEIGHT) * 60) / 60 * HOUR_HEIGHT
                      );
                      const { hour: sH, minute: sM } = yToTime(snappedTop);
                      const endMin = sH * 60 + sM + (snappedHeight / HOUR_HEIGHT) * 60;
                      const eH = Math.floor(endMin / 60);
                      const eM = Math.round(endMin % 60);
                      return (
                        <div
                          className="absolute left-1 right-1 bg-primary/30 border-2 border-primary/60 rounded-md z-40 pointer-events-none flex items-start p-1"
                          style={{ top: snappedTop, height: snappedHeight }}
                        >
                          <span className="text-[10px] font-medium text-primary">
                            {`${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} - ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Quick-add popup - full form */}
                    {quickAdd && quickAdd.dayIndex === dayIndex && (
                      <div
                        className="fixed z-50"
                        style={{ 
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '400px',
                          maxWidth: 'calc(100vw - 32px)',
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="bg-background border border-border rounded-xl shadow-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-foreground">Nova Tarefa</h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuickAdd(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground">Título *</Label>
                            <Input
                              ref={quickAddInputRef}
                              value={quickAdd.title}
                              onChange={(e) => setQuickAdd(prev => prev ? { ...prev, title: e.target.value } : null)}
                              placeholder="O que precisa ser feito?"
                              className="h-8 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setQuickAdd(null);
                              }}
                              autoFocus
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground">Descrição</Label>
                            <Textarea
                              value={quickAdd.description}
                              onChange={(e) => setQuickAdd(prev => prev ? { ...prev, description: e.target.value } : null)}
                              placeholder="Detalhes adicionais..."
                              rows={2}
                              className="text-sm resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-foreground">Status (Kanban)</Label>
                              <Select value={quickAdd.status} onValueChange={v => setQuickAdd(prev => prev ? { ...prev, status: v } : null)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {KANBAN_COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-foreground">Quadrante (Eisenhower)</Label>
                              <Select value={quickAdd.quadrant} onValueChange={v => setQuickAdd(prev => prev ? { ...prev, quadrant: v } : null)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {EISENHOWER_QUADRANTS.map(q => <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-foreground">Passeio Vinculado</Label>
                              <Select value={quickAdd.tour_id || 'none'} onValueChange={v => setQuickAdd(prev => prev ? { ...prev, tour_id: v === 'none' ? null : v } : null)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {activeTours.map(tour => (
                                    <SelectItem key={tour.id} value={tour.id}>
                                      {tour.name} — {tour.start_date ? format(new Date(tour.start_date + 'T12:00:00'), "dd/MM/yyyy") : 'Sem data'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-foreground">Data e Hora Limite</Label>
                              <Input
                                type="datetime-local"
                                value={quickAdd.due_date}
                                onChange={(e) => setQuickAdd(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          {(!currentProfile || currentProfile.isAdmin) && (
                            <div className="space-y-1">
                              <Label className="text-xs text-foreground">Responsável</Label>
                              <Select value={quickAdd.assignee || 'none'} onValueChange={v => setQuickAdd(prev => prev ? { ...prev, assignee: v === 'none' ? null : v } : null)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {ASSIGNEES.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium", a.color)}>
                                          {a.initials}
                                        </div>
                                        {a.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-1">
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQuickAdd(null)}>Cancelar</Button>
                            <Button size="sm" className="h-8 text-xs" onClick={handleQuickAddSave}>Salvar</Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {overlapData.map(({ task, pos, col, totalCols }) => {
                      const assignee = ASSIGNEES.find(a => a.id === task.assignee);
                      const isDragging = draggedTaskId === task.id;
                      const tourName = getTourName(task.tour_id);
                      const colWidth = 100 / totalCols;

                      return (
                        <div
                          key={task.id}
                          data-task
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, task.id); }}
                          onDragEnd={handleDragEnd}
                          onMouseDown={(e) => e.stopPropagation()} // prevent create-drag
                          onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                          className={cn(
                            "absolute rounded-md px-1.5 py-0.5 cursor-grab active:cursor-grabbing overflow-hidden",
                            "bg-primary text-white text-[10px] leading-tight shadow-sm hover:shadow-md transition-shadow",
                            "border-l-4 border-primary-foreground/30",
                            isDragging && "opacity-50 z-50",
                            resizing?.taskId === task.id && "z-50"
                          )}
                          style={{
                            top: pos.top,
                            height: Math.max(20, pos.height - 2),
                            left: `calc(${col * colWidth}% + 2px)`,
                            width: `calc(${colWidth}% - 4px)`,
                            zIndex: isDragging ? 30 : 10,
                          }}
                        >
                          <div className="flex items-start gap-1 h-full">
                            {assignee && pos.height > 30 && (
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold mt-0.5">
                                {assignee.initials}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{task.title}</div>
                              {pos.height > 35 && (
                                <div className="text-[9px] text-white/70">
                                  {format(pos.startTime, "HH:mm")} - {format(new Date(pos.startTime.getTime() + getTaskDuration(task) * 60000), "HH:mm")}
                                </div>
                              )}
                              {pos.height > 55 && tourName && (
                                <div className="text-[9px] text-white/60 truncate">📍 {tourName}</div>
                              )}
                            </div>
                          </div>

                          {/* Top resize handle */}
                          <div
                            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
                            onMouseDown={(e) => onResizeStart(e, task, 'top')}
                          />
                          {/* Bottom resize handle */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 flex items-center justify-center"
                            onMouseDown={(e) => onResizeStart(e, task, 'bottom')}
                          >
                            <div className="w-8 h-0.5 bg-white/40 rounded-full" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Current time indicator */}
                    {isToday && (() => {
                      const now = new Date();
                      const h = now.getHours();
                      const m = now.getMinutes();
                      if (h >= START_HOUR && h < END_HOUR) {
                        const top = ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT;
                        return (
                          <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                              <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Mini card for unscheduled sidebar
const MiniTaskCard: React.FC<{
  task: Task;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onEdit: (task: Task) => void;
  isDragging: boolean;
  getTourName: (id: string | null) => string | null;
}> = ({ task, onDragStart, onDragEnd, onEdit, isDragging, getTourName }) => {
  const tourName = getTourName(task.tour_id);
  const assignee = ASSIGNEES.find(a => a.id === task.assignee);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className={cn(
        "bg-white rounded-md p-1.5 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none text-[11px]",
        isDragging && "opacity-50"
      )}
    >
      <div className="font-medium text-gray-900 leading-tight truncate">{task.title}</div>
      <div className="flex items-center justify-between mt-1">
        {tourName && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 truncate max-w-[80px]">{tourName}</span>
        )}
        {assignee && (
          <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0", assignee.color)}>
            {assignee.initials}
          </span>
        )}
      </div>
    </div>
  );
};

export default AgendaView;
