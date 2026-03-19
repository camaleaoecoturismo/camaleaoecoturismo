import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Lightbulb, Trash2, Edit, Tag, Check, X, GripVertical, Sparkles, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { ContentIdea, ContentFormat, ContentObjective, IdeaPriority, IdeaStatus, FORMAT_CONFIG, OBJECTIVE_CONFIG, PRIORITY_CONFIG, IDEA_STATUS_CONFIG } from './types';

interface ContentIdeasBankProps {
  ideas: ContentIdea[];
  loading: boolean;
  onCreateIdea: (idea: Omit<ContentIdea, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateIdea: (id: string, updates: Partial<ContentIdea>) => Promise<void>;
  onDeleteIdea: (id: string) => Promise<void>;
  onConvertToPost: (idea: ContentIdea, date?: string) => Promise<any>;
}

const ContentIdeasBank: React.FC<ContentIdeasBankProps> = ({
  ideas,
  loading,
  onCreateIdea,
  onUpdateIdea,
  onDeleteIdea,
  onConvertToPost,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editGancho, setEditGancho] = useState('');
  const [draggedIdea, setDraggedIdea] = useState<ContentIdea | null>(null);
  const [viewMode, setViewMode] = useState<'notes' | 'kanban'>('notes');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredIdeas = useMemo(() => {
    if (!searchTerm) return ideas;
    return ideas.filter(idea =>
      idea.tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.gancho?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.notas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [ideas, searchTerm]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<IdeaStatus, ContentIdea[]> = {
      nova: [],
      interessante: [],
      pronta: [],
      arquivada: [],
    };
    filteredIdeas.forEach(idea => {
      groups[idea.status].push(idea);
    });
    return groups;
  }, [filteredIdeas]);

  const handleQuickAdd = async () => {
    if (!quickNote.trim()) return;

    // Parse quick note - first line is tema, rest is notas
    const lines = quickNote.trim().split('\n');
    const tema = lines[0];
    const notas = lines.slice(1).join('\n') || null;

    await onCreateIdea({
      tema,
      gancho: null,
      formato: 'reels',
      objetivo: 'engajamento',
      prioridade: 'media',
      status: 'nova',
      tags: [],
      notas,
    });

    setQuickNote('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  const handleStartEdit = (idea: ContentIdea) => {
    setEditingIdea(idea.id);
    setEditContent(idea.tema);
    setEditGancho(idea.gancho || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await onUpdateIdea(id, { tema: editContent, gancho: editGancho || null });
    setEditingIdea(null);
  };

  const handleCancelEdit = () => {
    setEditingIdea(null);
    setEditContent('');
    setEditGancho('');
  };

  const handleDragStart = (idea: ContentIdea) => {
    setDraggedIdea(idea);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: IdeaStatus) => {
    if (draggedIdea && draggedIdea.status !== targetStatus) {
      await onUpdateIdea(draggedIdea.id, { status: targetStatus });
    }
    setDraggedIdea(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Note Input - Like a notepad */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                ref={textareaRef}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Anote sua ideia aqui... &#10;(primeira linha = título, demais linhas = anotações)&#10;&#10;Ctrl+Enter para salvar"
                className="min-h-[120px] resize-none bg-transparent border-none shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Enter</kbd> para adicionar
                </span>
                <Button 
                  onClick={handleQuickAdd} 
                  disabled={!quickNote.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Ideia
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'notes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('notes')}
            className="gap-2"
          >
            <StickyNote className="h-4 w-4" />
            Notas
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Kanban
          </Button>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ideias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {viewMode === 'notes' ? (
        /* Notes View - Simple list */
        <div className="space-y-3">
          {filteredIdeas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nenhuma ideia ainda. Comece a escrever acima!</p>
              </CardContent>
            </Card>
          ) : (
            filteredIdeas.map((idea) => {
              const formatConfig = FORMAT_CONFIG[idea.formato];
              const statusConfig = IDEA_STATUS_CONFIG[idea.status];
              const isExpanded = expandedIdea === idea.id;
              const isEditing = editingIdea === idea.id;

              return (
                <Card 
                  key={idea.id}
                  className={`transition-all hover:shadow-md ${statusConfig.bgColor} border-l-4 ${
                    idea.status === 'nova' ? 'border-l-blue-400' :
                    idea.status === 'interessante' ? 'border-l-purple-400' :
                    idea.status === 'pronta' ? 'border-l-green-400' :
                    'border-l-gray-400'
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(idea)}
                  onDragEnd={() => setDraggedIdea(null)}
                >
                  <CardContent className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Título da ideia"
                          className="font-medium"
                          autoFocus
                        />
                        <Textarea
                          value={editGancho}
                          onChange={(e) => setEditGancho(e.target.value)}
                          placeholder="Gancho ou descrição (opcional)"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(idea.id)} className="gap-1">
                            <Check className="h-3 w-3" /> Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="gap-1">
                            <X className="h-3 w-3" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{formatConfig.icon}</span>
                              <h3 className="font-medium text-base">{idea.tema}</h3>
                            </div>
                            {idea.gancho && (
                              <p className="text-sm text-muted-foreground italic pl-7">"{idea.gancho}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className={`text-xs ${statusConfig.color}`}>
                              {statusConfig.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pl-7 pt-3 space-y-3 border-t mt-3">
                            {idea.notas && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Anotações:</p>
                                <p className="text-sm whitespace-pre-wrap">{idea.notas}</p>
                              </div>
                            )}

                            {idea.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {idea.tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Select 
                                value={idea.status} 
                                onValueChange={(v) => onUpdateIdea(idea.id, { status: v as IdeaStatus })}
                              >
                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(IDEA_STATUS_CONFIG).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select 
                                value={idea.formato} 
                                onValueChange={(v) => onUpdateIdea(idea.id, { formato: v as ContentFormat })}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(FORMAT_CONFIG).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>{config.icon} {config.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="flex-1" />

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => handleStartEdit(idea)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Editar
                              </Button>

                              {idea.status === 'pronta' && (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => onConvertToPost(idea)}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" /> Converter em Post
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive hover:text-destructive"
                                onClick={() => onDeleteIdea(idea.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['nova', 'interessante', 'pronta', 'arquivada'] as IdeaStatus[]).map(status => {
            const config = IDEA_STATUS_CONFIG[status];
            const statusIdeas = groupedByStatus[status];
            
            return (
              <div 
                key={status} 
                className={`rounded-lg border-2 border-dashed ${config.bgColor} p-3 transition-colors ${draggedIdea ? 'border-primary/50' : 'border-transparent'}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                  <Badge variant="secondary" className="text-xs">{statusIdeas.length}</Badge>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {statusIdeas.map(idea => {
                    const formatConfig = FORMAT_CONFIG[idea.formato];

                    return (
                      <Card 
                        key={idea.id} 
                        className={`bg-card shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${draggedIdea?.id === idea.id ? 'opacity-50 scale-95' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(idea)}
                        onDragEnd={() => setDraggedIdea(null)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                              <span className="text-lg">{formatConfig.icon}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onDeleteIdea(idea.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>

                          <p className="font-medium text-sm line-clamp-2">{idea.tema}</p>
                          
                          {idea.gancho && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{idea.gancho}"</p>
                          )}

                          {idea.status === 'pronta' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs w-full mt-2"
                              onClick={() => onConvertToPost(idea)}
                            >
                              Converter em Post
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {statusIdeas.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                      {draggedIdea ? 'Solte aqui' : 'Arraste ideias para cá'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
        <span>Total: <strong className="text-foreground">{ideas.length}</strong></span>
        <span>•</span>
        <span>Novas: <strong className="text-blue-600">{groupedByStatus.nova.length}</strong></span>
        <span>Interessantes: <strong className="text-purple-600">{groupedByStatus.interessante.length}</strong></span>
        <span>Prontas: <strong className="text-green-600">{groupedByStatus.pronta.length}</strong></span>
      </div>
    </div>
  );
};

export default ContentIdeasBank;