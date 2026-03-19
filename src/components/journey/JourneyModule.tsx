import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JOURNEY_PHASES, getPhaseConfig } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, MessageSquare, ChevronDown, ChevronUp, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MapItem {
  id: string;
  text: string;
  comment: string;
}

interface MapEntry {
  id: string;
  phase: string;
  dimension: string;
  content: string;
  mood_score: number;
  items: MapItem[];
}

const DIMENSIONS = [
  { id: 'acoes_cliente', label: 'Ações do Cliente', icon: '🎯', description: 'O que o cliente faz nessa fase' },
  { id: 'pontos_contato', label: 'Pontos de Contato', icon: '📱', description: 'Onde/como a empresa interage' },
  { id: 'sentimentos', label: 'Sentimentos do Cliente', icon: '💭', description: 'Como o cliente se sente' },
  { id: 'humor', label: 'Medidor de Humor', icon: '😊', description: 'Nível de satisfação do cliente' },
  { id: 'oportunidades', label: 'Oportunidades de Melhoria', icon: '💡', description: 'O que pode ser melhorado' },
];

const MOOD_ICONS = [
  { score: 1, icon: '😠', label: 'Muito insatisfeito', color: '#ef4444' },
  { score: 2, icon: '😟', label: 'Insatisfeito', color: '#f97316' },
  { score: 3, icon: '😐', label: 'Neutro', color: '#eab308' },
  { score: 4, icon: '😊', label: 'Satisfeito', color: '#22c55e' },
  { score: 5, icon: '🤩', label: 'Muito satisfeito', color: '#10b981' },
];

const genId = () => Math.random().toString(36).slice(2, 10);

const JourneyModule: React.FC = () => {
  const [entries, setEntries] = useState<MapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null); // "phase-dim-itemId"
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchEntries = useCallback(async () => {
    const { data } = await (supabase
      .from('journey_map_entries' as any)
      .select('*') as any);
    const parsed = ((data || []) as any[]).map(e => ({
      ...e,
      items: Array.isArray(e.items) ? e.items : [],
    })) as MapEntry[];
    setEntries(parsed);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const getEntry = (phase: string, dimension: string): MapEntry | undefined => {
    return entries.find(e => e.phase === phase && e.dimension === dimension);
  };

  // Debounced save for items
  const saveItems = useCallback(async (entryId: string, items: MapItem[]) => {
    if (saveTimerRef.current[entryId]) clearTimeout(saveTimerRef.current[entryId]);
    saveTimerRef.current[entryId] = setTimeout(async () => {
      await (supabase.from('journey_map_entries' as any)
        .update({ items: JSON.stringify(items) })
        .eq('id', entryId) as any);
    }, 600);
  }, []);

  const updateEntryItems = (phase: string, dimension: string, newItems: MapItem[]) => {
    setEntries(prev => prev.map(e => {
      if (e.phase === phase && e.dimension === dimension) {
        saveItems(e.id, newItems);
        return { ...e, items: newItems };
      }
      return e;
    }));
  };

  const addItem = (phase: string, dimension: string) => {
    const key = `${phase}-${dimension}`;
    const text = newItemTexts[key]?.trim();
    if (!text) return;
    const entry = getEntry(phase, dimension);
    if (!entry) return;
    const newItem: MapItem = { id: genId(), text, comment: '' };
    updateEntryItems(phase, dimension, [...entry.items, newItem]);
    setNewItemTexts(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (phase: string, dimension: string, itemId: string) => {
    const entry = getEntry(phase, dimension);
    if (!entry) return;
    updateEntryItems(phase, dimension, entry.items.filter(i => i.id !== itemId));
    if (expandedItem === `${phase}-${dimension}-${itemId}`) setExpandedItem(null);
  };

  const updateItemText = (phase: string, dimension: string, itemId: string, text: string) => {
    const entry = getEntry(phase, dimension);
    if (!entry) return;
    updateEntryItems(phase, dimension, entry.items.map(i => i.id === itemId ? { ...i, text } : i));
  };

  const updateItemComment = (phase: string, dimension: string, itemId: string, comment: string) => {
    const entry = getEntry(phase, dimension);
    if (!entry) return;
    updateEntryItems(phase, dimension, entry.items.map(i => i.id === itemId ? { ...i, comment } : i));
  };

  const updateMood = async (phase: string, score: number) => {
    const entry = getEntry(phase, 'humor');
    if (entry) {
      await (supabase.from('journey_map_entries' as any)
        .update({ mood_score: score })
        .eq('id', entry.id) as any);
    }
    setEntries(prev => prev.map(e =>
      e.phase === phase && e.dimension === 'humor' ? { ...e, mood_score: score } : e
    ));
  };

  const getMoodLine = () => JOURNEY_PHASES.map(p => getEntry(p.id, 'humor')?.mood_score || 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const moodScores = getMoodLine();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Mapa da Jornada do Cliente</h2>
        <p className="text-sm text-muted-foreground">
          Sistematize os processos de cada fase — do primeiro contato ao retorno
        </p>
      </div>

      {/* Mood curve */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Curva de Humor do Cliente</p>
          <div className="relative h-20">
            <svg viewBox={`0 0 ${JOURNEY_PHASES.length * 100} 80`} className="w-full h-full" preserveAspectRatio="none">
              {[1,2,3,4,5].map(i => (
                <line key={i} x1="0" y1={80 - i * 16} x2={JOURNEY_PHASES.length * 100} y2={80 - i * 16}
                  stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
              ))}
              <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"
                points={moodScores.map((s, i) => `${i * 100 + 50},${80 - s * 16}`).join(' ')} />
              {moodScores.map((s, i) => (
                <circle key={i} cx={i * 100 + 50} cy={80 - s * 16} r="6"
                  fill={MOOD_ICONS[s - 1]?.color || '#eab308'} stroke="white" strokeWidth="2" />
              ))}
            </svg>
            <div className="flex justify-around mt-1">
              {JOURNEY_PHASES.map(p => (
                <span key={p.id} className="text-[10px] text-muted-foreground font-medium">{p.icon} {p.label}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline grid */}
      <ScrollArea className="w-full">
        <div className="flex gap-0 min-w-[1400px]">
          {/* Dimension labels */}
          <div className="flex-shrink-0 w-44 pt-16">
            {DIMENSIONS.map(dim => (
              <div key={dim.id} className="min-h-[200px] flex items-start pt-4 px-3 border-b border-border/30">
                <div>
                  <span className="text-lg mr-1.5">{dim.icon}</span>
                  <span className="text-xs font-bold text-foreground leading-tight">{dim.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dim.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Phase columns */}
          {JOURNEY_PHASES.map((phase, phaseIdx) => (
            <div key={phase.id} className="flex-1 min-w-[180px] relative">
              {/* Header */}
              <div className="h-16 flex flex-col items-center justify-center relative">
                <div className="w-full h-1.5 rounded-full mb-2" style={{ backgroundColor: phase.color }} />
                <div className="flex items-center gap-1">
                  <span className="text-base">{phase.icon}</span>
                  <span className="text-sm font-bold" style={{ color: phase.color }}>{phase.label}</span>
                </div>
                {phaseIdx < JOURNEY_PHASES.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-8 h-4 w-4 text-muted-foreground/40 z-10" />
                )}
              </div>

              {/* Cells */}
              {DIMENSIONS.map(dim => {
                const entry = getEntry(phase.id, dim.id);
                const isHumor = dim.id === 'humor';
                const items = entry?.items || [];
                const inputKey = `${phase.id}-${dim.id}`;

                return (
                  <div
                    key={inputKey}
                    className={cn(
                      "min-h-[200px] border border-border/50 p-2 mx-0.5 mb-0.5 rounded-lg",
                      "hover:border-primary/20 transition-colors border-b border-border/30"
                    )}
                    style={{ backgroundColor: `${phase.bgColor}40` }}
                  >
                    {isHumor ? (
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <div className="flex gap-1">
                          <TooltipProvider>
                            {MOOD_ICONS.map(m => (
                              <Tooltip key={m.score}>
                                <TooltipTrigger asChild>
                                  <button onClick={() => updateMood(phase.id, m.score)}
                                    className={cn("text-2xl transition-all rounded-full p-0.5",
                                      entry?.mood_score === m.score ? "scale-125 ring-2 ring-offset-1" : "opacity-40 hover:opacity-80"
                                    )}>
                                    {m.icon}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{m.label}</TooltipContent>
                              </Tooltip>
                            ))}
                          </TooltipProvider>
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: MOOD_ICONS[(entry?.mood_score || 3) - 1]?.color }}>
                          {MOOD_ICONS[(entry?.mood_score || 3) - 1]?.label}
                        </span>
                        {/* Humor also supports items */}
                        <div className="w-full mt-1 space-y-1">
                          {items.map(item => (
                            <ItemRow key={item.id} item={item} phase={phase.id} dimension={dim.id}
                              expanded={expandedItem === `${inputKey}-${item.id}`}
                              onToggle={() => setExpandedItem(expandedItem === `${inputKey}-${item.id}` ? null : `${inputKey}-${item.id}`)}
                              onUpdateText={t => updateItemText(phase.id, dim.id, item.id, t)}
                              onUpdateComment={c => updateItemComment(phase.id, dim.id, item.id, c)}
                              onRemove={() => removeItem(phase.id, dim.id, item.id)}
                            />
                          ))}
                          <AddItemInput value={newItemTexts[inputKey] || ''} onChange={v => setNewItemTexts(p => ({ ...p, [inputKey]: v }))}
                            onAdd={() => addItem(phase.id, dim.id)} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {items.map(item => (
                          <ItemRow key={item.id} item={item} phase={phase.id} dimension={dim.id}
                            expanded={expandedItem === `${inputKey}-${item.id}`}
                            onToggle={() => setExpandedItem(expandedItem === `${inputKey}-${item.id}` ? null : `${inputKey}-${item.id}`)}
                            onUpdateText={t => updateItemText(phase.id, dim.id, item.id, t)}
                            onUpdateComment={c => updateItemComment(phase.id, dim.id, item.id, c)}
                            onRemove={() => removeItem(phase.id, dim.id, item.id)}
                          />
                        ))}
                        <AddItemInput value={newItemTexts[inputKey] || ''} onChange={v => setNewItemTexts(p => ({ ...p, [inputKey]: v }))}
                          onAdd={() => addItem(phase.id, dim.id)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

// --- Sub-components ---

const ItemRow: React.FC<{
  item: MapItem;
  phase: string;
  dimension: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdateText: (text: string) => void;
  onUpdateComment: (comment: string) => void;
  onRemove: () => void;
}> = ({ item, expanded, onToggle, onUpdateText, onUpdateComment, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  return (
    <div className="group rounded-md bg-background/60 border border-border/40 transition-all hover:border-border">
      <div className="flex items-start gap-1 px-1.5 py-1">
        <span className="text-muted-foreground/50 mt-0.5 text-[10px]">•</span>
        {editing ? (
          <Input value={text} onChange={e => setText(e.target.value)} autoFocus
            onBlur={() => { onUpdateText(text); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onUpdateText(text); setEditing(false); } }}
            className="h-5 text-[11px] px-1 py-0 border-none bg-transparent shadow-none focus-visible:ring-0" />
        ) : (
          <button onClick={() => setEditing(true)} className="flex-1 text-left text-[11px] text-foreground leading-snug min-h-[16px]">
            {item.text}
          </button>
        )}
        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onToggle} className={cn("p-0.5 rounded hover:bg-muted", item.comment && "text-primary")}>
            <MessageSquare className="h-3 w-3" />
          </button>
          <button onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-2 pb-1.5 pt-0.5 border-t border-border/30">
          <Textarea value={item.comment} onChange={e => onUpdateComment(e.target.value)}
            placeholder="Adicionar comentário sobre este item..."
            className="text-[10px] min-h-[40px] h-auto resize-none bg-muted/30 border-none focus-visible:ring-1" />
        </div>
      )}
      {!expanded && item.comment && (
        <button onClick={onToggle} className="px-2 pb-1 w-full text-left">
          <p className="text-[9px] text-muted-foreground italic truncate">💬 {item.comment}</p>
        </button>
      )}
    </div>
  );
};

const AddItemInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}> = ({ value, onChange, onAdd }) => (
  <div className="flex items-center gap-1 pt-0.5">
    <Input value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
      placeholder="+ Adicionar item..."
      className="h-6 text-[10px] px-2 border-dashed border-border/60 bg-transparent placeholder:text-muted-foreground/40" />
    {value.trim() && (
      <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0" onClick={onAdd}>
        <Plus className="h-3 w-3" />
      </Button>
    )}
  </div>
);

export default JourneyModule;
