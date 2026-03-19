import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus, ListTodo, Kanban, Grid3X3, Trash2, Edit2, Calendar, Filter, X, Check, Clock, AlertTriangle, Target, Coffee, CalendarDays, LogOut, Send, GripVertical, RefreshCw, Link2, Unlink, MapPin, Play, GitBranch, Maximize2, Minimize2, AlignJustify, List, LayoutList, ArrowUpNarrowWide, ArrowDownNarrowWide, Lightbulb } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
import { cn } from "@/lib/utils";
import TaskProfileSelector, { TASK_PROFILES, TaskProfile } from "./tasks/TaskProfileSelector";
import AgendaView from "./tasks/AgendaView";
import TaskStepsExpander from "./tasks/TaskStepsExpander";
import { preloadTaskSteps } from "@/hooks/useTaskSteps";
import StartProcessDialog from "./processes/StartProcessDialog";
import ProcessProgressIndicator from "./processes/ProcessProgressIndicator";
import { ProcessStage } from "./processes/types";
import TourProcessesView from "./tasks/TourProcessesView";

// Avatars configuration
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
  isaias_status: string | null;
  duration_minutes: number | null;
  process_map_id: string | null;
  process_instance_id: string | null;
  process_stage: string | null;
  process_element_id: string | null;
}
interface TaskPanelProps {
  tours: Tour[];
}

// Status especial para repassar tarefas
const KANBAN_COLUMNS = [{
  id: 'backlog',
  label: 'Backlog',
  color: 'bg-gray-100'
}, {
  id: 'todo',
  label: 'A Fazer',
  color: 'bg-blue-100'
}, {
  id: 'in_progress',
  label: 'Em Andamento',
  color: 'bg-amber-100'
}, {
  id: 'done',
  label: 'Concluído',
  color: 'bg-green-100'
}];
const EISENHOWER_QUADRANTS = [{
  id: 'urgent_important',
  label: 'Urgente e Importante',
  color: 'bg-red-100 border-red-300',
  icon: AlertTriangle,
  description: 'Fazer imediatamente'
}, {
  id: 'not_urgent_important',
  label: 'Importante, Não Urgente',
  color: 'bg-blue-100 border-blue-300',
  icon: Target,
  description: 'Agendar para fazer'
}, {
  id: 'urgent_not_important',
  label: 'Urgente, Não Importante',
  color: 'bg-amber-100 border-amber-300',
  icon: Clock,
  description: 'Delegar se possível'
}, {
  id: 'not_urgent_not_important',
  label: 'Nem Urgente, Nem Importante',
  color: 'bg-gray-100 border-gray-300',
  icon: Coffee,
  description: 'Eliminar ou deixar para depois'
}];

// Separate TaskForm component to prevent re-renders losing focus
interface TaskFormData {
  title: string;
  description: string;
  status: string;
  quadrant: string;
  tour_id: string | null;
  due_date: string | null;
  assignee: string | null;
}

interface TaskFormProps {
  initialData: TaskFormData;
  onSave: (data: TaskFormData) => void;
  onCancel: () => void;
  tours: Tour[];
  isNew?: boolean;
  currentProfile?: TaskProfile | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onCancel, tours, isNew = false, currentProfile }) => {
  // Filter only active tours
  const activeTours = useMemo(() => tours.filter(t => t.is_active), [tours]);
  const [formData, setFormData] = useState<TaskFormData>(initialData);

  // Get visible columns for status dropdown based on profile
  const visibleStatusColumns = useMemo(() => {
    const cols = [...KANBAN_COLUMNS];
    // Add para_amanda option for admin (Isaias)
    if (currentProfile?.isAdmin) {
      cols.splice(1, 0, { id: 'para_amanda', label: 'Para Amanda', color: 'bg-pink-100' });
    }
    // Add para_isaias option for non-admin (Amanda)
    if (currentProfile && !currentProfile.isAdmin) {
      cols.splice(1, 0, { id: 'para_isaias', label: 'Para Isaias', color: 'bg-blue-100' });
    }
    return cols;
  }, [currentProfile]);

  const handleChange = (field: keyof TaskFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if current profile can change assignee
  const canChangeAssignee = !currentProfile || currentProfile.isAdmin;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="space-y-2">
        <Label className="text-gray-900">Título *</Label>
        <Input 
          value={formData.title} 
          onChange={e => handleChange('title', e.target.value)} 
          placeholder="O que precisa ser feito?" 
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label className="text-gray-900">Descrição</Label>
        <Textarea 
          value={formData.description || ''} 
          onChange={e => handleChange('description', e.target.value)} 
          placeholder="Detalhes adicionais..." 
          rows={2} 
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-gray-900">Status (Kanban)</Label>
          <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleStatusColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900">Quadrante (Eisenhower)</Label>
          <Select value={formData.quadrant} onValueChange={value => handleChange('quadrant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EISENHOWER_QUADRANTS.map(q => <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-gray-900">Passeio Vinculado</Label>
          <Select value={formData.tour_id || 'none'} onValueChange={value => handleChange('tour_id', value === 'none' ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {activeTours.map(tour => <SelectItem key={tour.id} value={tour.id}>{tour.name} — {tour.start_date ? format(new Date(tour.start_date + 'T12:00:00'), "dd/MM/yyyy") : 'Sem data'}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900">Data e Hora Limite</Label>
          <Input 
            type="datetime-local" 
            value={formData.due_date || ''} 
            onChange={e => handleChange('due_date', e.target.value || null)} 
          />
        </div>
      </div>

      {canChangeAssignee && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-gray-900">Responsável</Label>
            <Select value={formData.assignee || 'none'} onValueChange={value => handleChange('assignee', value === 'none' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {ASSIGNEES.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium", a.color)}>
                        {a.initials}
                      </div>
                      {a.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(formData)}>
          {isNew ? 'Adicionar' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
};
const TaskPanel: React.FC<TaskPanelProps> = ({
  tours
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'eisenhower' | 'agenda' | 'passeios' | 'processos' | 'para_amanda' | 'para_isaias' | 'ideias'>('kanban');
  const [filterTourId, setFilterTourId] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('taskCardSize') as 'sm' | 'md' | 'lg') || 'md';
  });
  const [kanbanSort, setKanbanSort] = useState<'none' | 'date_asc' | 'date_desc'>('none');
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Profile system
  const [currentProfile, setCurrentProfile] = useState<TaskProfile | null>(() => {
    const saved = localStorage.getItem('taskCurrentProfile');
    if (saved) {
      const profile = TASK_PROFILES.find(p => p.id === saved);
      // Se tem senha, precisa reautenticar
      if (profile?.hasPassword) return null;
      return profile || null;
    }
    return null;
  });

  // Draggable button state
  const [buttonY, setButtonY] = useState<number>(() => {
    const saved = localStorage.getItem('taskButtonY');
    return saved ? parseInt(saved, 10) : 50; // 50% default
  });
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Panel width state for horizontal resizing
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('taskPanelWidth');
    return saved ? parseInt(saved, 10) : 800; // 800px default
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // TickTick integration state - only for Isaias (admin)
  const [ticktickConnected, setTicktickConnected] = useState(false);
  const [ticktickSyncing, setTicktickSyncing] = useState(false);
  const showTicktick = currentProfile?.isAdmin === true;

  // Task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'backlog',
    quadrant: 'not_urgent_important',
    tour_id: '',
    due_date: '',
    assignee: ''
  });

  // Process integration state
  const [startProcessTourId, setStartProcessTourId] = useState<string | null>(null);
  const [startProcessTourName, setStartProcessTourName] = useState('');

  const handleProfileSelect = (profile: TaskProfile) => {
    setCurrentProfile(profile);
    localStorage.setItem('taskCurrentProfile', profile.id);
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    localStorage.removeItem('taskCurrentProfile');
  };

  // Get columns visible for current profile
  const visibleKanbanColumns = KANBAN_COLUMNS;

  // Handle button drag
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingButton(true);
  };

  // Handle panel resize
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isDraggingButton) return;

    const handleMouseMove = (e: MouseEvent) => {
      const vh = window.innerHeight;
      const newY = Math.max(10, Math.min(90, (e.clientY / vh) * 100));
      setButtonY(newY);
    };

    const handleMouseUp = () => {
      setIsDraggingButton(false);
      localStorage.setItem('taskButtonY', buttonY.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingButton, buttonY]);

  // Handle panel resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const newWidth = vw - e.clientX;
      // Min 400px, max 90% of viewport
      const clampedWidth = Math.max(400, Math.min(vw * 0.9, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('taskPanelWidth', panelWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelWidth]);
  
  // Filter only active tours for dropdowns
  const activeTours = useMemo(() => tours.filter(t => t.is_active), [tours]);
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      checkTicktickConnection();
    }
  }, [isOpen]);

  // Check if TickTick is connected
  const checkTicktickConnection = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('ticktick-sync', {
        body: { action: 'get_projects', userId: currentProfile?.id || 'default' },
      });

      const connected = !error && !(data as any)?.needsAuth;
      setTicktickConnected(connected);
      return connected;
    } catch {
      setTicktickConnected(false);
      return false;
    }
  };

  // Connect to TickTick via OAuth
  const handleConnectTicktick = () => {
    const TICKTICK_CLIENT_ID = 'cc16JV7eq4sMpR6zDO';
    const REDIRECT_URI = `https://guwplwuwriixgvkjlutg.supabase.co/functions/v1/ticktick-oauth-callback`;
    const STATE = currentProfile?.id || 'default';
    const authUrl = `https://ticktick.com/oauth/authorize?client_id=${TICKTICK_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=tasks:read%20tasks:write&state=${STATE}`;
    
    // Listen for popup success message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ticktick_connected') {
        window.removeEventListener('message', handleMessage);
        setTicktickConnected(true);
        toast({ title: 'TickTick conectado com sucesso!' });
      }
    };
    window.addEventListener('message', handleMessage);
    
    window.open(authUrl, 'ticktick_oauth', 'width=600,height=700');
  };

  // Sync tasks with TickTick
  const handleSyncTicktick = async () => {
    setTicktickSyncing(true);

    try {
      const connected = await checkTicktickConnection();
      if (!connected) {
        toast({
          title: 'TickTick não conectado',
          description: 'Clique em "Conectar TickTick" e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Sync local tasks to TickTick
      for (const task of tasks) {
        const { data, error } = await supabase.functions.invoke('ticktick-sync', {
          body: {
            action: 'update_task',
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              quadrant: task.quadrant,
              status: task.status,
            },
            userId: currentProfile?.id || 'default',
          },
        });

        if (error || (data as any)?.needsAuth) {
          setTicktickConnected(false);
          toast({
            title: 'TickTick não conectado',
            description: 'Clique em "Conectar TickTick" e tente novamente.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Import tasks from TickTick
      const { data: importData, error: importError } = await supabase.functions.invoke('ticktick-sync', {
        body: { action: 'sync_from_ticktick', userId: currentProfile?.id || 'default' },
      });

      if (importError || (importData as any)?.needsAuth) {
        setTicktickConnected(false);
        toast({
          title: 'TickTick não conectado',
          description: 'Clique em "Conectar TickTick" e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Sincronizado com TickTick!' });
      fetchTasks();
    } catch (error) {
      console.error('TickTick sync error:', error);
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' });
    } finally {
      setTicktickSyncing(false);
    }
  };
  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const {
        data,
        error
      } = await (supabase.from('tasks' as any).select('*').order('order_index', {
        ascending: true
      }) as any);
      if (error) throw error;
      setTasks(data || []);
      // Preload steps for all tasks
      if (data?.length) {
        preloadTaskSteps(data.map((t: any) => t.id));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    // Profile-based filtering
    if (currentProfile) {
      if (currentProfile.isAdmin) {
        // Admin (Isaias) sees all tasks
        // No filter applied
      } else {
        // Non-admin (Amanda) only sees:
        // 1. Tasks assigned to her
        // 2. Tasks in "para_amanda" status (appear as backlog for her)
        // 3. Tasks in "para_isaias" status (tasks she delegated to Isaias)
        result = result.filter(t => 
          t.assignee === currentProfile.id || 
          t.status === 'para_amanda' ||
          t.status === 'para_isaias' ||
          !!(t as any).process_map_id // Tasks from processes are shared
        );
      }
    }
    
    // Filter by tour
    if (filterTourId && filterTourId !== 'all') {
      if (filterTourId === 'none') {
        result = result.filter(t => !t.tour_id);
      } else {
        result = result.filter(t => t.tour_id === filterTourId);
      }
    }
    
    // Filter by assignee
    if (filterAssignee && filterAssignee !== 'all') {
      result = result.filter(t => t.assignee === filterAssignee);
    }
    
    return result;
  }, [tasks, filterTourId, filterAssignee, currentProfile]);
  const handleAddTask = async (formData: TaskFormData) => {
    if (!formData.title.trim()) {
      toast({
        title: "Digite um título para a tarefa",
        variant: "destructive"
      });
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Determine assignee: use form value, or default to current profile for non-admins
      let finalAssignee = formData.assignee || null;
      if (!finalAssignee && currentProfile && !currentProfile.isAdmin) {
        finalAssignee = currentProfile.id;
      }
      
      const { error } = await (supabase.from('tasks' as any).insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        quadrant: formData.quadrant,
        tour_id: formData.tour_id || null,
        due_date: formData.due_date || null,
        assignee: finalAssignee,
        user_id: userData.user?.id
      }) as any);
      if (error) throw error;
      toast({ title: "Tarefa adicionada!" });
      setNewTask({
        title: '',
        description: '',
        status: 'backlog',
        quadrant: 'not_urgent_important',
        tour_id: '',
        due_date: '',
        assignee: ''
      });
      setIsAddingTask(false);
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
    }
  };

  const handleUpdateTask = async (formData: TaskFormData) => {
    if (!editingTask) return;
    const completedAt = formData.status === 'done' && !editingTask.completed_at ? new Date().toISOString() : editingTask.completed_at;
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === editingTask.id ? {
      ...t, title: formData.title, description: formData.description,
      status: formData.status, quadrant: formData.quadrant,
      tour_id: formData.tour_id, due_date: formData.due_date,
      assignee: formData.assignee, completed_at: completedAt,
    } : t));
    setEditingTask(null);
    try {
      const { error } = await (supabase.from('tasks' as any).update({
        title: formData.title, description: formData.description,
        status: formData.status, quadrant: formData.quadrant,
        tour_id: formData.tour_id, due_date: formData.due_date,
        assignee: formData.assignee, completed_at: completedAt,
      }).eq('id', editingTask.id) as any);
      if (error) throw error;
      toast({ title: "Tarefa atualizada!" });

      // Sync changes to process map if linked
      if (editingTask.process_map_id && editingTask.process_element_id) {
        try {
          const { data: procData } = await supabase.from('process_maps').select('elements').eq('id', editingTask.process_map_id).single();
          if (procData && Array.isArray(procData.elements)) {
            const isCompleted = formData.status === 'done';
            // Extract node text from task title (remove " — TourName" suffix)
            const nodeText = formData.title.includes(' — ') ? formData.title.split(' — ')[0] : formData.title;
            const updatedElements = (procData.elements as any[]).map((n: any) =>
              n.id === editingTask.process_element_id
                ? { ...n, completed: isCompleted, text: nodeText }
                : n
            );
            await supabase.from('process_maps').update({ elements: updatedElements as any }).eq('id', editingTask.process_map_id);
          }
        } catch (syncErr) {
          console.error('Error syncing edit to process map:', syncErr);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
      fetchTasks();
    }
  };
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    const task = tasks.find(t => t.id === id);
    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const { error } = await (supabase.from('tasks' as any).delete().eq('id', id) as any);
      if (error) throw error;
      toast({ title: "Tarefa excluída!" });

      // Sync to process map: remove the node from the process
      if (task?.process_map_id && task?.process_element_id) {
        try {
          const { data: procData } = await supabase.from('process_maps').select('elements, connections').eq('id', task.process_map_id).single();
          if (procData) {
            const updatedElements = (Array.isArray(procData.elements) ? procData.elements : []).filter(
              (n: any) => n.id !== task.process_element_id
            );
            const updatedConnections = (Array.isArray(procData.connections) ? procData.connections : []).filter(
              (c: any) => c.from !== task.process_element_id && c.to !== task.process_element_id
            );
            await supabase.from('process_maps').update({
              elements: updatedElements as any,
              connections: updatedConnections as any,
            }).eq('id', task.process_map_id);
          }
        } catch (syncErr) {
          console.error('Error syncing delete to process map:', syncErr);
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
      fetchTasks();
    }
  };
  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

    // Optimistic update first
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (currentProfile && !currentProfile.isAdmin && t.status === 'para_amanda') {
        return { ...t, amanda_status: newStatus, completed_at: completedAt };
      }
      if (currentProfile?.isAdmin && t.status === 'para_isaias') {
        return { ...t, isaias_status: newStatus, completed_at: completedAt };
      }
      return { ...t, status: newStatus, completed_at: completedAt };
    }));

    try {
      if (currentProfile && !currentProfile.isAdmin && task?.status === 'para_amanda') {
        const { error } = await (supabase.from('tasks' as any).update({
          amanda_status: newStatus, completed_at: completedAt
        }).eq('id', taskId) as any);
        if (error) throw error;
      } else if (currentProfile?.isAdmin && task?.status === 'para_isaias') {
        const { error } = await (supabase.from('tasks' as any).update({
          isaias_status: newStatus, completed_at: completedAt
        }).eq('id', taskId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('tasks' as any).update({
          status: newStatus, completed_at: completedAt
        }).eq('id', taskId) as any);
        if (error) throw error;
      }

      // Sync to process map if task is linked
      if (task?.process_map_id && task?.process_element_id) {
        const isCompleted = newStatus === 'done';
        try {
          const { data: procData } = await supabase.from('process_maps').select('elements').eq('id', task.process_map_id).single();
          if (procData && Array.isArray(procData.elements)) {
            const updatedElements = (procData.elements as any[]).map((n: any) =>
              n.id === task.process_element_id ? { ...n, completed: isCompleted } : n
            );
            await supabase.from('process_maps').update({ elements: updatedElements as any }).eq('id', task.process_map_id);
          }
        } catch (syncErr) {
          console.error('Error syncing to process map:', syncErr);
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchTasks();
    }
  };
  
  const handleQuickQuadrantChange = async (taskId: string, newQuadrant: string) => {
    try {
      const { error } = await (supabase.from('tasks' as any).update({
        quadrant: newQuadrant
      }).eq('id', taskId) as any);
      if (error) throw error;
      // Não refetch - usar apenas update otimista para evitar "piscar"
    } catch (error) {
      console.error('Error updating task quadrant:', error);
      // Em caso de erro, refetch para sincronizar
      fetchTasks();
    }
  };
  
  const getTourName = (tourId: string | null) => {
    if (!tourId) return null;
    const tour = tours.find(t => t.id === tourId);
    return tour?.name || 'Passeio não encontrado';
  };
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('application/task-id', taskId);
    // Defer state update to avoid interrupting native drag on first click
    requestAnimationFrame(() => setDraggedTaskId(taskId));
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDropStatus = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      
      // Se é Amanda e a tarefa está em "para_amanda", atualizar amanda_status
      if (currentProfile && !currentProfile.isAdmin && task?.status === 'para_amanda') {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, amanda_status: newStatus } : t));
      } else if (currentProfile?.isAdmin && task?.status === 'para_isaias') {
        // Se é Isaias e a tarefa está em "para_isaias", atualizar isaias_status
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isaias_status: newStatus } : t));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
      await handleQuickStatusChange(taskId, newStatus);
    }
    setDraggedTaskId(null);
  };
  const handleDropQuadrant = async (e: React.DragEvent, newQuadrant: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (taskId) {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        quadrant: newQuadrant
      } : t));
      await handleQuickQuadrantChange(taskId, newQuadrant);
    }
    setDraggedTaskId(null);
  };
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && draggedTaskId) {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: newStatus
      } : t));
      await handleQuickStatusChange(taskId, newStatus);
    }
    setDraggedTaskId(null);
  };
  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };
  const TaskCard = ({
    task
  }: {
    task: Task;
  }) => {
    const tourName = getTourName(task.tour_id);
    const isDragging = draggedTaskId === task.id;
    const assignee = ASSIGNEES.find(a => a.id === task.assignee);
    
    // Para Isaias, mostrar o status da Amanda em tarefas "para_amanda"
    const showAmandaStatus = currentProfile?.isAdmin && task.status === 'para_amanda' && task.amanda_status;
    const amandaStatusLabel = showAmandaStatus 
      ? KANBAN_COLUMNS.find(c => c.id === task.amanda_status)?.label || task.amanda_status
      : null;
    
    // Para Amanda, mostrar o status do Isaias em tarefas "para_isaias"
    const showIsaiasStatus = currentProfile && !currentProfile.isAdmin && task.status === 'para_isaias' && task.isaias_status;
    const isaiasStatusLabel = showIsaiasStatus 
      ? KANBAN_COLUMNS.find(c => c.id === task.isaias_status)?.label || task.isaias_status
      : null;
    
    // Calculate due date info
    const getDueDateInfo = () => {
      if (!task.due_date) return null;
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0;
      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;
      return { dueDate, diffDays, isOverdue, isToday, isTomorrow };
    };
    
    const dueDateInfo = getDueDateInfo();
    
    return (
      <TooltipProvider>
        <div 
          draggable 
          onDragStart={e => handleDragStart(e, task.id)} 
          onDragEnd={handleDragEnd}
          className={cn(
            "bg-white rounded-lg shadow-sm border-2 group hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative select-none",
            isDragging && "opacity-50 scale-95",
            "border-gray-200",
            cardSize === 'sm' ? "p-1.5" : cardSize === 'lg' ? "p-3" : "p-2.5"
          )}
        >
          {/* Action buttons - absolute positioned */}
          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={() => setEditingTask(task)} className="p-0.5 hover:bg-gray-100 rounded bg-white/80">
              <Edit2 className="h-3 w-3 text-gray-500" />
            </button>
            <button onClick={() => handleDeleteTask(task.id)} className="p-0.5 hover:bg-red-100 rounded bg-white/80">
              <Trash2 className="h-3 w-3 text-red-500" />
            </button>
          </div>
          
          {/* Title */}
          <h4 className={cn(
            "font-medium text-gray-900 leading-tight pr-6",
            cardSize === 'sm' ? "text-[11px]" : cardSize === 'lg' ? "text-sm" : "text-sm"
          )}>{task.title}</h4>
          
          {/* Description - hidden in sm */}
          {task.description && cardSize !== 'sm' && (
            <p className={cn(
              "text-gray-500 mt-1 leading-tight",
              cardSize === 'lg' ? "text-xs line-clamp-4" : "text-[11px] line-clamp-2"
            )}>{task.description}</p>
          )}
          
          {/* Amanda status indicator for Isaias */}
          {showAmandaStatus && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
              <span className="font-medium">Status Amanda:</span>
              <span>{amandaStatusLabel}</span>
            </div>
          )}
          
          {/* Isaias status indicator for Amanda */}
          {showIsaiasStatus && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <span className="font-medium">Status Isaias:</span>
              <span>{isaiasStatusLabel}</span>
            </div>
          )}
          
          {/* Footer: metadata row */}
          <div className={cn("flex items-center justify-between gap-1", cardSize === 'sm' ? "mt-1" : "mt-2")}>
            <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
              {tourName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium truncate max-w-[100px]">
                  {tourName}
                </span>
              )}
              {dueDateInfo && cardSize !== 'sm' && (
                <span className={cn(
                  "text-[10px] flex items-center gap-0.5",
                  dueDateInfo.isOverdue ? "text-red-500" : "text-gray-400"
                )}>
                  <Calendar className="h-2.5 w-2.5" />
                  {dueDateInfo.dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  {dueDateInfo.dueDate.getHours() !== 0 && (
                    <span className="text-gray-300">
                      {dueDateInfo.dueDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className={cn(
                    "font-medium ml-0.5",
                    dueDateInfo.isOverdue ? "text-red-500" : dueDateInfo.isToday ? "text-amber-600" : dueDateInfo.isTomorrow ? "text-amber-500" : "text-gray-400"
                  )}>
                    {dueDateInfo.isOverdue 
                      ? `(${Math.abs(dueDateInfo.diffDays)}d)` 
                      : dueDateInfo.isToday 
                        ? "(hoje)" 
                        : dueDateInfo.isTomorrow 
                          ? "(amanhã)" 
                          : `(${dueDateInfo.diffDays}d)`}
                  </span>
                </span>
              )}
              {dueDateInfo && cardSize === 'sm' && dueDateInfo.isOverdue && (
                <span className="text-[9px] text-red-500 font-medium">⚠ {Math.abs(dueDateInfo.diffDays)}d</span>
              )}
            </div>
            
            {/* Avatar - right side */}
            {assignee && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-4 w-4 flex-shrink-0">
                    <AvatarFallback className={cn("text-[8px] text-white font-medium", assignee.color)}>
                      {assignee.initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  <p>{assignee.name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {/* Gamified Steps - hidden in sm */}
          {cardSize !== 'sm' && (
            <TaskStepsExpander taskId={task.id} onAutoComplete={() => handleQuickStatusChange(task.id, 'done')} />
          )}
        </div>
      </TooltipProvider>
    );
  };
  const handleColumnClick = (status: string) => {
    // Open new task form for this column
    setNewTask(prev => ({ ...prev, status }));
    setIsAddingTask(true);
  };

  const handleQuadrantClick = (quadrant: string) => {
    // Open new task form for this quadrant
    setNewTask(prev => ({ ...prev, quadrant }));
    setIsAddingTask(true);
  };

  const KanbanView = () => {
    const sortByDate = (tasks: typeof filteredTasks) => {
      if (kanbanSort === 'none') return tasks;
      return [...tasks].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : (kanbanSort === 'date_asc' ? Infinity : -Infinity);
        const dateB = b.due_date ? new Date(b.due_date).getTime() : (kanbanSort === 'date_asc' ? Infinity : -Infinity);
        return kanbanSort === 'date_asc' ? dateA - dateB : dateB - dateA;
      });
    };

    const getColumnTasks = (columnId: string) => {
      let result: typeof filteredTasks;
      if (currentProfile && !currentProfile.isAdmin) {
        result = filteredTasks.filter(t => {
          if (t.status === 'para_isaias') return false;
          if (t.status === 'para_amanda') {
            const effectiveStatus = t.amanda_status || 'backlog';
            return effectiveStatus === columnId;
          }
          return t.status === columnId;
        });
      } else {
        result = filteredTasks.filter(t => {
          if (t.status === 'para_amanda') return false;
          if (t.status === 'para_isaias') {
            const effectiveStatus = t.isaias_status || 'backlog';
            return effectiveStatus === columnId;
          }
          return t.status === columnId;
        });
      }
      return sortByDate(result);
    };

    const columnsCount = visibleKanbanColumns.length;
    
    return (
      <div className={cn("grid gap-3 h-full", `grid-cols-${columnsCount}`)} style={{ gridTemplateColumns: `repeat(${columnsCount}, 1fr)` }}>
        {visibleKanbanColumns.map(column => {
          const columnTasks = getColumnTasks(column.id);
          
          return (
            <div 
              key={column.id} 
              className={cn(
                "rounded-lg p-2 transition-all", 
                column.color,
                draggedTaskId && "ring-2 ring-primary/30"
              )} 
              onDragOver={handleDragOver} 
              onDrop={e => handleDropStatus(e, column.id)}
              onDoubleClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-column-area]')) {
                  handleColumnClick(column.id);
                }
              }}
            >
              <div className="flex items-center justify-between mb-2" data-column-area>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-gray-700">{column.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-320px)]" data-column-area>
                <div className="space-y-2 pr-2 min-h-[100px]" data-column-area onDragOver={handleDragOver} onDrop={e => handleDropStatus(e, column.id)}>
                  {columnTasks.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
                  {columnTasks.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-8 pointer-events-none">
                      Arraste tarefas aqui ou duplo clique para adicionar
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    );
  };
  const EisenhowerView = () => <div className="grid grid-cols-2 gap-3 h-full">
      {EISENHOWER_QUADRANTS.map(quadrant => {
      const quadrantTasks = filteredTasks.filter(t => t.quadrant === quadrant.id && t.status !== 'done');
      const Icon = quadrant.icon;
      return <div 
            key={quadrant.id} 
            className={cn(
              "rounded-lg p-3 border-2 transition-all", 
              quadrant.color,
              draggedTaskId && "ring-2 ring-primary/30"
            )}
            onDragOver={handleDragOver}
            onDrop={e => handleDropQuadrant(e, quadrant.id)}
            onDoubleClick={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-quadrant-area]')) {
                handleQuadrantClick(quadrant.id);
              }
            }}
          >
            <div className="flex items-center gap-2 mb-2" data-quadrant-area>
              <Icon className="h-4 w-4" />
              <div>
                <h3 className="font-semibold text-sm text-gray-700">{quadrant.label}</h3>
                <p className="text-xs text-gray-500">{quadrant.description}</p>
              </div>
              <Badge variant="secondary" className="text-xs ml-auto">{quadrantTasks.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(50vh-180px)]" data-quadrant-area>
              <div className="space-y-2 pr-2 min-h-[60px]" data-quadrant-area onDragOver={handleDragOver} onDrop={e => handleDropQuadrant(e, quadrant.id)}>
                {quadrantTasks.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
                {quadrantTasks.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-6 pointer-events-none">
                    Arraste tarefas aqui ou duplo clique para adicionar
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>;
    })}
    </div>;

  // Passeios View - Group tasks by tour (horizontal columns like Kanban)
  const PasseiosView = () => {
    // Get unique tours that have tasks + include all active tours
    const allColumns = useMemo(() => {
      const tourIds = new Set(filteredTasks.filter(t => t.tour_id).map(t => t.tour_id));
      // Also include active tours even if they don't have tasks yet
      activeTours.forEach(t => tourIds.add(t.id));
      
      const toursData = Array.from(tourIds).map(tourId => {
        const tour = tours.find(t => t.id === tourId);
        return tour ? { id: tour.id, name: tour.name, start_date: tour.start_date } : null;
      }).filter(Boolean) as { id: string; name: string; start_date: string }[];
      
      // Sort by start_date (nearest first)
      return toursData.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [filteredTasks, tours, activeTours]);

    // Tasks without tour
    const tasksWithoutTour = filteredTasks.filter(t => !t.tour_id);

    const getTasksForTour = (tourId: string) => filteredTasks.filter(t => t.tour_id === tourId);

    // Include "Sem Passeio" as first column if there are tasks without tour
    const columnsCount = allColumns.length + (tasksWithoutTour.length > 0 ? 1 : 0);

    const handleDropOnTour = async (e: React.DragEvent, tourId: string | null) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
      if (taskId) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, tour_id: tourId } : t));
        try {
          await (supabase.from('tasks' as any).update({ tour_id: tourId }).eq('id', taskId) as any);
        } catch (error) {
          fetchTasks();
        }
      }
      setDraggedTaskId(null);
    };

    return (
      <div className="grid gap-3 h-full" style={{ gridTemplateColumns: `repeat(${Math.max(columnsCount, 1)}, minmax(200px, 1fr))` }}>
        {/* Tasks without tour column */}
        {tasksWithoutTour.length > 0 && (
          <div 
            className={cn(
              "rounded-lg p-2 transition-all bg-gray-100",
              draggedTaskId && "ring-2 ring-primary/30"
            )}
            onDragOver={handleDragOver}
            onDrop={e => handleDropOnTour(e, null)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-gray-700">Sem Passeio</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{tasksWithoutTour.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-2 min-h-[100px]" onDragOver={handleDragOver} onDrop={e => handleDropOnTour(e, null)}>
                {tasksWithoutTour.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Tour columns */}
        {allColumns.map(tour => {
          const tourTasks = getTasksForTour(tour.id);
          
          return (
            <div 
              key={tour.id}
              className={cn(
                "rounded-lg p-2 transition-all bg-amber-50",
                draggedTaskId && "ring-2 ring-primary/30"
              )}
              onDragOver={handleDragOver}
              onDrop={e => handleDropOnTour(e, tour.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <h3 className="font-semibold text-sm text-amber-800 truncate" title={tour.name}>{tour.name}</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] text-amber-600">
                    {format(new Date(tour.start_date), "dd/MM")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Iniciar Processo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartProcessTourId(tour.id);
                      setStartProcessTourName(tour.name);
                    }}
                  >
                    <Play className="h-3 w-3 text-primary" />
                  </Button>
                  <Badge variant="secondary" className="text-xs bg-amber-100">{tourTasks.length}</Badge>
                </div>
              </div>

              {/* Process Progress */}
              {(() => {
                const instanceIds = [...new Set(tourTasks.filter(t => t.process_instance_id).map(t => t.process_instance_id!))];
                if (instanceIds.length === 0) return null;
                const instances = instanceIds.map(instId => {
                  const instTasks = tourTasks.filter(t => t.process_instance_id === instId);
                  const mapName = instTasks[0]?.process_map_id ? 'Processo' : 'Processo';
                  const stageMap = new Map<string, { name: string; color?: string; total: number; completed: number }>();
                  instTasks.forEach(t => {
                    if (t.process_stage) {
                      const existing = stageMap.get(t.process_stage) || { name: t.process_stage, total: 0, completed: 0 };
                      existing.total++;
                      if (t.status === 'done') existing.completed++;
                      stageMap.set(t.process_stage, existing);
                    }
                  });
                  return {
                    instanceId: instId,
                    processName: mapName,
                    totalTasks: instTasks.length,
                    completedTasks: instTasks.filter(t => t.status === 'done').length,
                    stages: Array.from(stageMap.values()),
                  };
                });
                return <div className="mb-2"><ProcessProgressIndicator instances={instances} compact /></div>;
              })()}
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pr-2 min-h-[100px]" onDragOver={handleDragOver} onDrop={e => handleDropOnTour(e, tour.id)}>
                  {tourTasks.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
                  {tourTasks.length === 0 && (
                    <div className="text-center text-amber-400 text-xs py-8 pointer-events-none">
                      Arraste tarefas aqui
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}

        {/* Empty state */}
        {allColumns.length === 0 && tasksWithoutTour.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-12">
            Nenhum passeio ativo encontrado
          </div>
        )}
      </div>
    );
  };
  // Para Amanda view - shows tasks with status 'para_amanda' in a kanban-like layout
  const ParaAmandaView = () => {
    const amandaTasks = filteredTasks.filter(t => t.status === 'para_amanda');
    const amandaStatusColumns = [
      { id: 'backlog', label: 'Pendente', color: 'bg-pink-50' },
      { id: 'todo', label: 'A Fazer', color: 'bg-blue-50' },
      { id: 'in_progress', label: 'Em Andamento', color: 'bg-amber-50' },
      { id: 'done', label: 'Concluído', color: 'bg-green-50' },
    ];

    const getAmandaColumnTasks = (colId: string) => {
      if (colId === 'backlog') {
        return amandaTasks.filter(t => !t.amanda_status || t.amanda_status === 'backlog');
      }
      return amandaTasks.filter(t => t.amanda_status === colId);
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Send className="h-5 w-5 text-pink-500" />
          <h2 className="font-semibold text-pink-700">Tarefas delegadas para Amanda</h2>
          <Badge className="bg-pink-100 text-pink-700">{amandaTasks.length}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-3 h-[calc(100%-40px)]">
          {amandaStatusColumns.map(col => {
            const colTasks = getAmandaColumnTasks(col.id);
            return (
              <div key={col.id} className={cn("rounded-lg p-2", col.color)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-700">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-2 pr-2 min-h-[100px]">
                    {colTasks.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
                    {colTasks.length === 0 && (
                      <div className="text-center text-gray-400 text-xs py-8 pointer-events-none">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Para Isaias view - shows tasks with status 'para_isaias' in a kanban-like layout
  const ParaIsaiasView = () => {
    const isaiasTasks = filteredTasks.filter(t => t.status === 'para_isaias');
    const isaiasStatusColumns = [
      { id: 'backlog', label: 'Pendente', color: 'bg-blue-50' },
      { id: 'todo', label: 'A Fazer', color: 'bg-blue-100' },
      { id: 'in_progress', label: 'Em Andamento', color: 'bg-amber-50' },
      { id: 'done', label: 'Concluído', color: 'bg-green-50' },
    ];

    const getIsaiasColumnTasks = (colId: string) => {
      if (colId === 'backlog') {
        return isaiasTasks.filter(t => !t.isaias_status || t.isaias_status === 'backlog');
      }
      return isaiasTasks.filter(t => t.isaias_status === colId);
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Send className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-blue-700">Tarefas delegadas para Isaias</h2>
          <Badge className="bg-blue-100 text-blue-700">{isaiasTasks.length}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-3 h-[calc(100%-40px)]">
          {isaiasStatusColumns.map(col => {
            const colTasks = getIsaiasColumnTasks(col.id);
            return (
              <div key={col.id} className={cn("rounded-lg p-2", col.color)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-700">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-2 pr-2 min-h-[100px]">
                    {colTasks.map(task => <div key={task.id}><TaskCard task={task} /></div>)}
                    {colTasks.length === 0 && (
                      <div className="text-center text-gray-400 text-xs py-8 pointer-events-none">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AgendaViewWrapper = () => (
    <AgendaView
      tasks={filteredTasks}
      setTasks={setTasks}
      fetchTasks={fetchTasks}
      onEditTask={(task) => setEditingTask(task as Task)}
      onDeleteTask={handleDeleteTask}
      onCreateTask={(defaults) => {
        setNewTask(prev => ({
          ...prev,
          due_date: defaults.due_date,
        }));
        setIsAddingTask(true);
      }}
      currentWeek={currentWeek}
      setCurrentWeek={setCurrentWeek}
      draggedTaskId={draggedTaskId}
      setDraggedTaskId={setDraggedTaskId}
      handleDragStart={handleDragStart}
      handleDragEnd={handleDragEnd}
      getTourName={getTourName}
      currentProfile={currentProfile}
      tours={tours}
    />
  );

  // Ideas View - simple brainstorm notes
  const IdeasView = () => {
    const [ideas, setIdeas] = useState<{id: string; content: string; color: string; created_at: string}[]>([]);
    const [newIdea, setNewIdea] = useState('');
    const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [loadingIdeas, setLoadingIdeas] = useState(true);

    const ideaColors = ['#FEF7CD', '#F2FCE2', '#D3E4FD', '#FFDEE2', '#E5DEFF', '#FDE1D3'];

    const fetchIdeas = async () => {
      let query = supabase.from('task_ideas' as any).select('*').order('created_at', { ascending: false });
      if (currentProfile) {
        query = query.eq('profile_id', currentProfile.id);
      }
      const { data } = await query;
      setIdeas((data as any) || []);
      setLoadingIdeas(false);
    };

    useEffect(() => { fetchIdeas(); }, []);

    const addIdea = async () => {
      if (!newIdea.trim()) return;
      const color = ideaColors[Math.floor(Math.random() * ideaColors.length)];
      await supabase.from('task_ideas' as any).insert({ content: newIdea.trim(), color, profile_id: currentProfile?.id || null } as any);
      setNewIdea('');
      fetchIdeas();
    };

    const deleteIdea = async (id: string) => {
      await supabase.from('task_ideas' as any).delete().eq('id', id);
      fetchIdeas();
    };

    const saveEdit = async (id: string) => {
      if (!editingContent.trim()) return;
      await supabase.from('task_ideas' as any).update({ content: editingContent.trim() } as any).eq('id', id);
      setEditingIdeaId(null);
      fetchIdeas();
    };

    if (loadingIdeas) return <div className="flex items-center justify-center py-10 text-muted-foreground">Carregando ideias...</div>;

    return (
      <div className="space-y-4 h-full">
        <div className="flex gap-2">
          <Input
            placeholder="Nova ideia... 💡"
            value={newIdea}
            onChange={e => setNewIdea(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIdea()}
            className="flex-1"
          />
          <Button size="sm" onClick={addIdea} disabled={!newIdea.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-2">
            {ideas.map(idea => (
              <div
                key={idea.id}
                className="rounded-lg p-3 shadow-sm border border-border/50 relative group min-h-[80px] flex flex-col"
                style={{ backgroundColor: idea.color }}
              >
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {editingIdeaId === idea.id ? (
                  <div className="flex flex-col gap-2 flex-1">
                    <textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(idea.id); } }}
                    />
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingIdeaId(null)}>Cancelar</Button>
                      <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveEdit(idea.id)}>Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-foreground whitespace-pre-wrap cursor-pointer flex-1"
                    onClick={() => { setEditingIdeaId(idea.id); setEditingContent(idea.content); }}
                  >
                    {idea.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {format(new Date(idea.created_at), "dd/MM/yy HH:mm")}
                </p>
              </div>
            ))}
            {ideas.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma ideia ainda. Comece seu brainstorm!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Removed inline TaskForm - now using TaskFormComponent below
  return <>
      {/* Toggle Button - Draggable vertically on right side */}
      <button 
        ref={buttonRef}
        onClick={() => !isDraggingButton && setIsOpen(!isOpen)} 
        onMouseDown={handleButtonMouseDown}
        style={{ top: `${buttonY}%`, transform: 'translateY(-50%)' }}
        className={cn(
          "fixed right-0 z-50 bg-primary text-primary-foreground p-2 rounded-l-lg shadow-lg hover:bg-primary/90 transition-opacity duration-300 select-none",
          isOpen && "translate-x-full opacity-0",
          isDraggingButton && "cursor-grabbing"
        )}
        title="Arraste para mover, clique para abrir"
      >
        <div className="flex items-center gap-1">
          <ChevronLeft className="h-5 w-5" />
          <ListTodo className="h-5 w-5" />
        </div>
      </button>

      {/* Slide-out Panel */}
      <div 
        style={{ width: isOpen ? (isFullscreen ? '100vw' : `${panelWidth}px`) : undefined }}
        className={cn(
          "fixed right-0 top-0 h-full bg-background border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          isResizing && "transition-none select-none"
        )}
      >
        {/* Resize Handle */}
        {!isFullscreen && (
          <div
            onMouseDown={handleResizeMouseDown}
            className={cn(
              "absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-primary/20 transition-colors z-10 flex items-center justify-center group",
              isResizing && "bg-primary/30"
            )}
          >
            <div className="w-1 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>
        )}
        
        {/* Profile Selection Screen */}
        {!currentProfile ? (
          <div className="h-full">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                <ListTodo className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-primary">Tarefas</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <TaskProfileSelector onSelectProfile={handleProfileSelect} />
          </div>
        ) : (
          <>
            {/* Header with Profile Info */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm",
                  currentProfile.color
                )}>
                  {currentProfile.initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary leading-none">{currentProfile.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {currentProfile.isAdmin ? 'Visualizando todas as tarefas' : 'Minhas tarefas'}
                  </span>
                </div>
                <Badge variant="secondary">{filteredTasks.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* TickTick Integration Buttons - Only for Isaias (admin) */}
                {showTicktick && (
                  <TooltipProvider>
                    {ticktickConnected ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSyncTicktick}
                            disabled={ticktickSyncing}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className={cn("h-4 w-4", ticktickSyncing && "animate-spin")} />
                            {ticktickSyncing ? 'Sincronizando...' : 'Sync TickTick'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sincronizar tarefas com TickTick</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleConnectTicktick}
                            className="flex items-center gap-1"
                          >
                            <Link2 className="h-4 w-4" />
                            Conectar TickTick
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Conectar ao TickTick para sincronizar tarefas</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                )}
                
                <Button variant="default" size="sm" onClick={() => setIsAddingTask(true)} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Trocar perfil</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? 'Reduzir' : 'Tela cheia'}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); setIsFullscreen(false); }}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-background">
              <Tabs value={viewMode === 'para_amanda' || viewMode === 'para_isaias' ? 'kanban' : viewMode} onValueChange={v => setViewMode(v as any)} className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="kanban" className="flex items-center gap-1">
                    <Kanban className="h-4 w-4" />
                    Kanban
                  </TabsTrigger>
                  <TabsTrigger value="eisenhower" className="flex items-center gap-1">
                    <Grid3X3 className="h-4 w-4" />
                    Eisenhower
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="passeios" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Passeios
                  </TabsTrigger>
                  <TabsTrigger value="processos" className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    Processos
                  </TabsTrigger>
                  <TabsTrigger value="ideias" className="flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" />
                    Ideias
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {currentProfile.isAdmin && (
                <Button
                  variant={viewMode === 'para_amanda' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex items-center gap-1.5 ml-2",
                    viewMode === 'para_amanda' 
                      ? "bg-pink-500 hover:bg-pink-600 text-white" 
                      : "border-pink-300 text-pink-600 hover:bg-pink-50"
                  )}
                  onClick={() => setViewMode(viewMode === 'para_amanda' ? 'kanban' : 'para_amanda')}
                >
                  <Send className="h-4 w-4" />
                  Para Amanda
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-pink-100 text-pink-700">
                    {tasks.filter(t => t.status === 'para_amanda').length}
                  </Badge>
                </Button>
              )}

              {!currentProfile.isAdmin && (
                <Button
                  variant={viewMode === 'para_isaias' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex items-center gap-1.5 ml-2",
                    viewMode === 'para_isaias' 
                      ? "bg-blue-500 hover:bg-blue-600 text-white" 
                      : "border-blue-300 text-blue-600 hover:bg-blue-50"
                  )}
                  onClick={() => setViewMode(viewMode === 'para_isaias' ? 'kanban' : 'para_isaias')}
                >
                  <Send className="h-4 w-4" />
                  Para Isaias
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">
                    {tasks.filter(t => t.status === 'para_isaias').length}
                  </Badge>
                </Button>
              )}

              <div className="flex items-center gap-2">
                {/* Card size toggle */}
                {(viewMode === 'kanban' || viewMode === 'para_amanda' || viewMode === 'para_isaias') && (
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <button
                      onClick={() => { setCardSize('sm'); localStorage.setItem('taskCardSize', 'sm'); }}
                      className={cn("p-1.5 transition-colors", cardSize === 'sm' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      title="Compacto"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setCardSize('md'); localStorage.setItem('taskCardSize', 'md'); }}
                      className={cn("p-1.5 transition-colors", cardSize === 'md' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      title="Médio"
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setCardSize('lg'); localStorage.setItem('taskCardSize', 'lg'); }}
                      className={cn("p-1.5 transition-colors", cardSize === 'lg' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      title="Grande"
                    >
                      <AlignJustify className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Sort by date toggle */}
                {(viewMode === 'kanban' || viewMode === 'para_amanda' || viewMode === 'para_isaias') && (
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <button
                      onClick={() => setKanbanSort(s => s === 'date_asc' ? 'none' : 'date_asc')}
                      className={cn("p-1.5 transition-colors", kanbanSort === 'date_asc' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      title="Data mais próxima primeiro"
                    >
                      <ArrowUpNarrowWide className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setKanbanSort(s => s === 'date_desc' ? 'none' : 'date_desc')}
                      className={cn("p-1.5 transition-colors", kanbanSort === 'date_desc' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      title="Data mais distante primeiro"
                    >
                      <ArrowDownNarrowWide className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <Filter className="h-4 w-4 text-muted-foreground" />
                {currentProfile.isAdmin && (
                  <Select value={filterAssignee || 'all'} onValueChange={value => setFilterAssignee(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-2">Todos</span>
                      </SelectItem>
                      {ASSIGNEES.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium", a.color)}>
                              {a.initials}
                            </div>
                            {a.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filterTourId || 'all'} onValueChange={value => setFilterTourId(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por passeio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os passeios</SelectItem>
                    <SelectItem value="none">Sem passeio vinculado</SelectItem>
                    {activeTours.map(tour => <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 h-[calc(100%-140px)] overflow-hidden">
              {isAddingTask && <Dialog open={isAddingTask} onOpenChange={open => !open && setIsAddingTask(false)}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nova Tarefa</DialogTitle>
                    </DialogHeader>
                    <TaskForm 
                      initialData={{ 
                        title: newTask.title, 
                        description: newTask.description, 
                        status: newTask.status, 
                        quadrant: newTask.quadrant, 
                        tour_id: newTask.tour_id || null, 
                        due_date: newTask.due_date || null,
                        assignee: currentProfile.isAdmin ? (newTask.assignee || null) : currentProfile.id
                      }} 
                      onSave={handleAddTask}
                      onCancel={() => setIsAddingTask(false)} 
                      tours={tours}
                      isNew 
                      currentProfile={currentProfile}
                    />
                  </DialogContent>
                </Dialog>}

              {editingTask && <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Editar Tarefa</DialogTitle>
                    </DialogHeader>
                    <TaskForm 
                      initialData={{ 
                        title: editingTask.title, 
                        description: editingTask.description || '', 
                        status: editingTask.status, 
                        quadrant: editingTask.quadrant, 
                        tour_id: editingTask.tour_id, 
                        due_date: editingTask.due_date,
                        assignee: editingTask.assignee 
                      }}
                      onSave={handleUpdateTask} 
                      onCancel={() => setEditingTask(null)} 
                      tours={tours}
                      currentProfile={currentProfile}
                    />
                  </DialogContent>
                </Dialog>}

              {loading ? <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Carregando tarefas...</p>
                </div> : <>
                  {viewMode === 'kanban' && <KanbanView />}
                  {viewMode === 'eisenhower' && <EisenhowerView />}
                  {viewMode === 'agenda' && <AgendaViewWrapper />}
                  {viewMode === 'passeios' && <PasseiosView />}
                  {viewMode === 'processos' && <TourProcessesView tours={tours} tasks={tasks} fetchTasks={fetchTasks} />}
                  {viewMode === 'para_amanda' && <ParaAmandaView />}
                  {viewMode === 'para_isaias' && <ParaIsaiasView />}
                  {viewMode === 'ideias' && <IdeasView />}
                </>}
            </div>
          </>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsOpen(false)} />}

      {/* Start Process Dialog */}
      <StartProcessDialog
        open={!!startProcessTourId}
        onOpenChange={(open) => { if (!open) setStartProcessTourId(null); }}
        tourId={startProcessTourId || ''}
        tourName={startProcessTourName}
        onProcessStarted={fetchTasks}
      />
    </>;
};
export default TaskPanel;