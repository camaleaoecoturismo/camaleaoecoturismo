import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Trash2, Check, X, ZoomIn, ZoomOut, Link, Circle, Square, Diamond, Hexagon, Clock, ListChecks
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ──
export interface FlowNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end';
  text: string;
  color: string;
  completed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  days_offset?: number | null; // relative to tour start_date (negative = before)
  offset_time?: string | null; // HH:mm
  subtasks?: string[]; // checklist items for this node
}

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
}

interface MiniFlowEditorProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  onChange: (nodes: FlowNode[], connections: FlowConnection[]) => void;
  tourStartDate?: string | null; // ISO date string e.g. '2025-03-07'
}

// ── Constants ──
const NODE_TYPES = [
  { id: 'start', label: 'Início', icon: Circle },
  { id: 'process', label: 'Processo', icon: Square },
  { id: 'decision', label: 'Decisão', icon: Diamond },
  { id: 'end', label: 'Fim', icon: Hexagon },
] as const;

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280',
];

const genId = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const MIN_NODE_W = 60;
const MIN_NODE_H = 28;

// ── SVG Connection Path ──
const ConnectionPath: React.FC<{
  from: FlowNode;
  to: FlowNode;
  onDelete: () => void;
}> = ({ from, to, onDelete }) => {
  const x1 = from.x + from.width / 2;
  const y1 = from.y + from.height;
  const x2 = to.x + to.width / 2;
  const y2 = to.y;

  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <g className="group/conn cursor-pointer" onClick={onDelete}>
      {/* Invisible wider path for easier clicking */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={d}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        strokeDasharray="none"
        className="group-hover/conn:stroke-destructive transition-colors"
      />
      {/* Arrow */}
      <circle cx={x2} cy={y2} r={3} fill="hsl(var(--border))" className="group-hover/conn:fill-destructive transition-colors" />
    </g>
  );
};

// ── Main Editor ──
const MiniFlowEditor: React.FC<MiniFlowEditorProps> = ({ nodes, connections, onChange, tourStartDate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{ nodeId: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [editText, setEditText] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editType, setEditType] = useState<FlowNode['type']>('process');
  const [editDaysOffset, setEditDaysOffset] = useState<string>('');
  const [editOffsetTime, setEditOffsetTime] = useState<string>('');
  const [editSubtasks, setEditSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [inlineNewTask, setInlineNewTask] = useState<{ nodeId: string; value: string } | null>(null);

  const toggleExpandNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const addInlineSubtask = (nodeId: string, text: string) => {
    if (!text.trim()) return;
    onChange(
      nodes.map(n => n.id === nodeId ? { ...n, subtasks: [...(n.subtasks || []), text.trim()] } : n),
      connections
    );
    setInlineNewTask(null);
  };

  const removeInlineSubtask = (nodeId: string, idx: number) => {
    onChange(
      nodes.map(n => n.id === nodeId ? { ...n, subtasks: (n.subtasks || []).filter((_, i) => i !== idx) } : n),
      connections
    );
  };

  const toggleInlineSubtaskDone = (nodeId: string, idx: number) => {
    // We'll use a prefix ✓ to mark done inline (simple approach without schema change)
    onChange(
      nodes.map(n => {
        if (n.id !== nodeId) return n;
        const subs = [...(n.subtasks || [])];
        if (subs[idx].startsWith('✓ ')) {
          subs[idx] = subs[idx].slice(2);
        } else {
          subs[idx] = '✓ ' + subs[idx];
        }
        return { ...n, subtasks: subs };
      }),
      connections
    );
  };
  // Compute canvas size
  const canvasW = Math.max(220, ...nodes.map(n => n.x + n.width + 20));
  const canvasH = Math.max(200, ...nodes.map(n => n.y + n.height + 40));

  // ── Mouse coords relative to canvas ──
  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scrollLeft = containerRef.current?.scrollLeft || 0;
    const scrollTop = containerRef.current?.scrollTop || 0;
    return {
      x: (e.clientX - rect.left + scrollLeft) / zoom,
      y: (e.clientY - rect.top + scrollTop) / zoom,
    };
  }, [zoom]);

  // ── Drag ──
  const onMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (connecting) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getCanvasPos(e);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging({ nodeId, offsetX: pos.x - node.x, offsetY: pos.y - node.y });
  }, [nodes, getCanvasPos, connecting]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const pos = getCanvasPos(e);
      const updated = nodes.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: Math.max(0, pos.x - dragging.offsetX), y: Math.max(0, pos.y - dragging.offsetY) }
          : n
      );
      onChange(updated, connections);
    }
    if (resizing) {
      const pos = getCanvasPos(e);
      const dx = pos.x - resizing.startX;
      const dy = pos.y - resizing.startY;
      const updated = nodes.map(n =>
        n.id === resizing.nodeId
          ? { ...n, width: Math.max(MIN_NODE_W, resizing.startW + dx), height: Math.max(MIN_NODE_H, resizing.startH + dy) }
          : n
      );
      onChange(updated, connections);
    }
  }, [dragging, resizing, nodes, connections, onChange, getCanvasPos]);

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  // ── Resize ──
  const onResizeStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getCanvasPos(e);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setResizing({ nodeId, startX: pos.x, startY: pos.y, startW: node.width, startH: node.height });
  }, [nodes, getCanvasPos]);

  // ── Connect ──
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!connecting) return;
    if (connecting === nodeId) {
      setConnecting(null);
      return;
    }
    // Check duplicate
    const exists = connections.some(c => c.from === connecting && c.to === nodeId);
    if (!exists) {
      const newConn: FlowConnection = { id: genId(), from: connecting, to: nodeId };
      onChange(nodes, [...connections, newConn]);
    }
    setConnecting(null);
  }, [connecting, connections, nodes, onChange]);

  // ── Add node ──
  const addNode = (type: FlowNode['type']) => {
    const lastNode = nodes.length > 0 ? nodes.reduce((a, b) => a.y > b.y ? a : b) : null;
    const newNode: FlowNode = {
      id: genId(),
      type,
      text: NODE_TYPES.find(n => n.id === type)?.label || 'Etapa',
      color: type === 'start' ? '#22c55e' : type === 'end' ? '#ef4444' : '#3b82f6',
      completed: false,
      x: 50,
      y: lastNode ? lastNode.y + lastNode.height + 40 : 10,
      width: type === 'decision' ? 100 : 120,
      height: type === 'start' || type === 'end' ? 32 : 36,
    };

    const updatedNodes = [...nodes, newNode];

    // Auto-connect from last node
    let updatedConns = [...connections];
    if (lastNode) {
      updatedConns.push({ id: genId(), from: lastNode.id, to: newNode.id });
    }

    onChange(updatedNodes, updatedConns);
    setEditingNode(newNode);
    setEditText(newNode.text);
    setEditColor(newNode.color);
    setEditType(newNode.type);
    setEditDaysOffset('');
    setEditOffsetTime('');
    setEditSubtasks([]);
  };

  // ── Delete node ──
  const deleteNode = (nodeId: string) => {
    onChange(
      nodes.filter(n => n.id !== nodeId),
      connections.filter(c => c.from !== nodeId && c.to !== nodeId)
    );
  };

  // ── Toggle complete ──
  const toggleComplete = (nodeId: string) => {
    onChange(
      nodes.map(n => n.id === nodeId ? { ...n, completed: !n.completed } : n),
      connections
    );
  };

  // ── Save edit ──
  const saveEdit = () => {
    if (!editingNode || !editText.trim()) return;
    const parsedOffset = editDaysOffset.trim() !== '' ? parseInt(editDaysOffset, 10) : null;
    const filteredSubtasks = editSubtasks.filter(s => s.trim());
    onChange(
      nodes.map(n => n.id === editingNode.id ? {
        ...n, text: editText, color: editColor, type: editType,
        days_offset: !isNaN(parsedOffset as any) ? parsedOffset : null,
        offset_time: editOffsetTime || null,
        subtasks: filteredSubtasks.length > 0 ? filteredSubtasks : undefined,
      } : n),
      connections
    );
    setEditingNode(null);
  };

  // ── Delete connection ──
  const deleteConnection = (connId: string) => {
    onChange(nodes, connections.filter(c => c.id !== connId));
  };

  // ── Node shape style ──
  const getNodeShape = (type: FlowNode['type']): string => {
    switch (type) {
      case 'start':
      case 'end':
        return 'rounded-full';
      case 'decision':
        return 'rounded-md';
      default:
        return 'rounded-lg';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 py-1 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setZoom(z => Math.min(2, z + 0.15))}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <span className="text-[9px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant={connecting ? "default" : "ghost"}
            size="icon"
            className={cn("h-6 w-6", connecting && "bg-primary text-primary-foreground")}
            onClick={() => setConnecting(connecting ? null : '__waiting__')}
            title="Conectar nós"
          >
            <Link className="h-3 w-3" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              {NODE_TYPES.map(nt => (
                <DropdownMenuItem key={nt.id} onClick={() => addNode(nt.id as FlowNode['type'])} className="text-xs">
                  <nt.icon className="h-3 w-3 mr-2" />
                  {nt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-auto relative cursor-default",
          connecting && "cursor-crosshair",
          (dragging || resizing) && "cursor-grabbing select-none"
        )}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={(e) => {
          // Collapse expanded subtask panels when clicking on canvas background
          const target = e.target as HTMLElement;
          if (!target.closest('[data-subtask-panel]') && !target.closest('[data-subtask-badge]') && !target.closest('[data-add-subtask]')) {
            if (expandedNodes.size > 0) {
              setExpandedNodes(new Set());
              setInlineNewTask(null);
            }
          }
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: canvasW,
            height: canvasH,
            minHeight: '100%',
            position: 'relative',
          }}
        >
          {/* SVG connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW}
            height={canvasH}
            style={{ pointerEvents: 'none' }}
          >
            <g style={{ pointerEvents: 'auto' }}>
              {connections.map(conn => {
                const from = nodes.find(n => n.id === conn.from);
                const to = nodes.find(n => n.id === conn.to);
                if (!from || !to) return null;
                return (
                  <ConnectionPath
                    key={conn.id}
                    from={from}
                    to={to}
                    onDelete={() => deleteConnection(conn.id)}
                  />
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <React.Fragment key={node.id}>
            <div
              className={cn(
                "absolute group/node flex items-center justify-center border-2 select-none transition-shadow",
                getNodeShape(node.type),
                connecting ? "cursor-pointer hover:ring-2 hover:ring-primary" : "cursor-grab",
                connecting === node.id && "ring-2 ring-primary",
                node.completed && "opacity-50"
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                borderColor: node.color,
                backgroundColor: node.completed ? `${node.color}10` : `${node.color}12`,
              }}
              onMouseDown={(e) => {
                if (connecting) {
                  if (connecting === '__waiting__') {
                    setConnecting(node.id);
                  } else {
                    handleNodeClick(node.id);
                  }
                } else {
                  onMouseDown(e, node.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNode(node);
                setEditText(node.text);
                setEditColor(node.color);
                setEditType(node.type);
                setEditDaysOffset(node.days_offset != null ? String(node.days_offset) : '');
                setEditOffsetTime(node.offset_time || '');
                setEditSubtasks(node.subtasks || []);
              }}
            >
              {/* Complete indicator */}
              {node.completed && (
                <div className="absolute -left-1 -top-1 h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: node.color }}>
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}

              {/* Schedule indicator */}
              {node.days_offset != null && (
                <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center" title={`${node.days_offset > 0 ? '+' : ''}${node.days_offset}d`}>
                  <Clock className="h-2.5 w-2.5 text-white" />
                </div>
              )}

              {/* Subtasks indicator - clickable to expand */}
              {node.subtasks && node.subtasks.length > 0 && (
                <button
                  data-subtask-badge
                  className="absolute -left-1 -bottom-1 h-4 min-w-4 px-0.5 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-0.5 transition-colors z-10"
                  title="Expandir tarefas"
                  onClick={(e) => { e.stopPropagation(); toggleExpandNode(node.id); }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ListChecks className="h-2 w-2 text-white" />
                  <span className="text-[7px] text-white font-bold">{node.subtasks.length}</span>
                </button>
              )}

              {/* Quick add subtask button */}
              <button
                data-add-subtask
                className="absolute -left-1 -top-1 h-4 w-4 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover/node:opacity-100 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-10"
                style={{ left: node.completed ? 14 : -4 }}
                title="Adicionar tarefa"
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineNewTask({ nodeId: node.id, value: '' });
                  if (!expandedNodes.has(node.id)) toggleExpandNode(node.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Plus className="h-2.5 w-2.5" />
              </button>

              {/* Text */}
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight text-center px-1 truncate",
                  node.completed && "line-through"
                )}
                style={{ color: node.color }}
              >
                {node.text}
              </span>

              {/* Due date label */}
              {node.days_offset != null && tourStartDate && (() => {
                const tourStart = new Date(tourStartDate + 'T12:00:00');
                const dueDate = addDays(tourStart, node.days_offset!);
                const isOverdue = !node.completed && isBefore(dueDate, startOfDay(new Date()));
                return (
                  <span className={cn(
                    "text-[7px] leading-none mt-0.5 px-1 truncate",
                    isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
                  )}>
                    {isOverdue ? '⚠ ' : ''}{format(dueDate, "dd/MM", { locale: ptBR })}
                    {node.offset_time ? ` ${node.offset_time}` : ''}
                  </span>
                );
              })()}

              {/* Hover actions */}
              <div className="absolute -top-4 right-0 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete(node.id); }}
                  className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent shadow-sm"
                  title="Concluir"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                  title="Excluir"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Resize handle */}
              {!connecting && (
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 cursor-se-resize opacity-0 group-hover/node:opacity-60 transition-opacity"
                  onMouseDown={(e) => onResizeStart(e, node.id)}
                >
                  <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground rounded-br-sm" />
                </div>
              )}
            </div>

            {/* Expanded subtasks panel */}
            {expandedNodes.has(node.id) && (
              <div
                data-subtask-panel
                className="absolute bg-background border border-border rounded-lg shadow-lg p-2 z-20"
                style={{
                  left: node.x,
                  top: node.y + node.height + 4,
                  width: Math.max(node.width, 180),
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tarefas</span>
                  <button
                    onClick={() => toggleExpandNode(node.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(node.subtasks || []).map((st, i) => {
                    const isDone = st.startsWith('✓ ');
                    const label = isDone ? st.slice(2) : st;
                    return (
                      <div key={i} className="flex items-center gap-1.5 group/st">
                        <button
                          onClick={() => toggleInlineSubtaskDone(node.id, i)}
                          className={cn(
                            "h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                            isDone ? "bg-primary border-primary" : "border-border hover:border-primary"
                          )}
                        >
                          {isDone && <Check className="h-2 w-2 text-primary-foreground" />}
                        </button>
                        <span className={cn("text-[10px] flex-1", isDone && "line-through text-muted-foreground")}>{label}</span>
                        <button
                          onClick={() => removeInlineSubtask(node.id, i)}
                          className="opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Inline add */}
                {inlineNewTask?.nodeId === node.id ? (
                  <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border">
                    <Input
                      value={inlineNewTask.value}
                      onChange={e => setInlineNewTask({ ...inlineNewTask, value: e.target.value })}
                      placeholder="Nova tarefa..."
                      className="h-6 text-[10px] flex-1"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') addInlineSubtask(node.id, inlineNewTask.value);
                        if (e.key === 'Escape') setInlineNewTask(null);
                      }}
                    />
                    <button
                      onClick={() => addInlineSubtask(node.id, inlineNewTask.value)}
                      className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setInlineNewTask({ nodeId: node.id, value: '' })}
                    className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border text-[10px] text-muted-foreground hover:text-primary w-full"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Adicionar tarefa</span>
                  </button>
                )}
              </div>
            )}
            </React.Fragment>
          ))}

          {/* Connecting hint */}
          {connecting && connecting !== '__waiting__' && (
            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full">
              Clique no nó destino
            </div>
          )}
          {connecting === '__waiting__' && (
            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full">
              Clique no nó de origem
            </div>
          )}
        </div>
      </div>

      {/* Edit Node Dialog */}
      <Dialog open={!!editingNode} onOpenChange={o => { if (!o) setEditingNode(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar Nó</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Texto"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Tipo:</span>
              <div className="flex gap-1">
                {NODE_TYPES.map(nt => (
                  <button
                    key={nt.id}
                    onClick={() => setEditType(nt.id as FlowNode['type'])}
                    className={cn(
                      "p-1 rounded border transition-colors",
                      editType === nt.id ? "border-primary bg-primary/10" : "border-border"
                    )}
                    title={nt.label}
                  >
                    <nt.icon className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Cor:</span>
              <div className="flex gap-1 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      editColor === c ? "scale-125 border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {/* Scheduling fields */}
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Agendamento relativo ao evento
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Dias (- = antes)</Label>
                  <Input
                    type="number"
                    value={editDaysOffset}
                    onChange={e => setEditDaysOffset(e.target.value)}
                    placeholder="ex: -7"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Horário</Label>
                  <Input
                    type="time"
                    value={editOffsetTime}
                    onChange={e => setEditOffsetTime(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              {editDaysOffset && !isNaN(parseInt(editDaysOffset)) && (
                <p className="text-[10px] text-muted-foreground">
                  {parseInt(editDaysOffset) < 0
                    ? `${Math.abs(parseInt(editDaysOffset))} dia(s) antes do evento`
                    : parseInt(editDaysOffset) === 0
                      ? 'No dia do evento'
                      : `${parseInt(editDaysOffset)} dia(s) após o evento`
                  }
                  {editOffsetTime ? ` às ${editOffsetTime}` : ''}
                </p>
              )}
            </div>

            {/* Subtasks */}
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ListChecks className="h-3 w-3" /> Tarefas desta etapa
              </Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {editSubtasks.map((st, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      value={st}
                      onChange={e => {
                        const updated = [...editSubtasks];
                        updated[i] = e.target.value;
                        setEditSubtasks(updated);
                      }}
                      className="h-7 text-xs flex-1"
                    />
                    <button
                      onClick={() => setEditSubtasks(editSubtasks.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      e.preventDefault();
                      setEditSubtasks([...editSubtasks, newSubtask.trim()]);
                      setNewSubtask('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!newSubtask.trim()}
                  onClick={() => {
                    if (newSubtask.trim()) {
                      setEditSubtasks([...editSubtasks, newSubtask.trim()]);
                      setNewSubtask('');
                    }
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingNode(null)}>Cancelar</Button>
            <Button size="sm" onClick={saveEdit} disabled={!editText.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiniFlowEditor;
