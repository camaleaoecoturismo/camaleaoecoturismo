import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContentPost, ContentIdea, ContentCampaign, ContentFormat, ContentObjective, PostStatus, FORMAT_CONFIG, OBJECTIVE_CONFIG, POST_STATUS_CONFIG } from './types';
import { Tour } from '@/hooks/useTours';

interface ContentCalendarProps {
  posts: ContentPost[];
  ideas: ContentIdea[];
  campaigns: ContentCampaign[];
  tours: Tour[];
  loading: boolean;
  onCreatePost: (post: Omit<ContentPost, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdatePost: (id: string, updates: Partial<ContentPost>) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onMovePost: (postId: string, newDate: string) => Promise<void>;
  onConvertIdea: (idea: ContentIdea, date?: string) => Promise<any>;
}

const HOUR_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00'
];

const ContentCalendar: React.FC<ContentCalendarProps> = ({
  posts,
  ideas,
  campaigns,
  tours,
  loading,
  onCreatePost,
  onUpdatePost,
  onDeletePost,
  onMovePost,
  onConvertIdea,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [draggedPost, setDraggedPost] = useState<ContentPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tema: '',
    formato: 'reels' as ContentFormat,
    objetivo: 'engajamento' as ContentObjective,
    status: 'ideia' as PostStatus,
    data_publicacao: '',
    horario: '',
    legenda: '',
    hashtags: '',
    campanha_id: '',
    notas: '',
  });

  const resetForm = () => {
    setFormData({
      tema: '',
      formato: 'reels',
      objetivo: 'engajamento',
      status: 'ideia',
      data_publicacao: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      horario: '',
      legenda: '',
      hashtags: '',
      campanha_id: '',
      notas: '',
    });
    setEditingPost(null);
  };

  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
  }, [currentDate, viewMode]);

  const getPostsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(p => p.data_publicacao === dateStr).sort((a, b) => {
      if (!a.horario && !b.horario) return a.ordem_dia - b.ordem_dia;
      if (!a.horario) return 1;
      if (!b.horario) return -1;
      return a.horario.localeCompare(b.horario);
    });
  };

  const getToursForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tours.filter(tour => {
      if (!tour.is_active) return false;
      const startDate = tour.start_date;
      const endDate = tour.end_date || tour.start_date;
      
      // Check if date is within tour range
      if (dateStr >= startDate && dateStr <= endDate) {
        return true;
      }
      return false;
    });
  };

  const getPostsForDateAndHour = (date: Date, hour: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(p => {
      if (p.data_publicacao !== dateStr) return false;
      if (!p.horario) return hour === '06:00'; // Posts sem horário vão para 06:00
      return p.horario.startsWith(hour.split(':')[0]);
    });
  };

  const handlePrevious = () => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : addDays(currentDate, -7));
  };

  const handleNext = () => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addDays(currentDate, 7));
  };

  const handleDayClick = (date: Date, hour?: string) => {
    setSelectedDate(date);
    setFormData(prev => ({ 
      ...prev, 
      data_publicacao: format(date, 'yyyy-MM-dd'),
      horario: hour || ''
    }));
    setIsCreateOpen(true);
  };

  const handleEditPost = (post: ContentPost) => {
    setFormData({
      tema: post.tema,
      formato: post.formato,
      objetivo: post.objetivo,
      status: post.status,
      data_publicacao: post.data_publicacao || '',
      horario: post.horario || '',
      legenda: post.legenda || '',
      hashtags: post.hashtags?.join(', ') || '',
      campanha_id: post.campanha_id || '',
      notas: post.notas || '',
    });
    setEditingPost(post);
    setIsCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.tema.trim()) return;

    const postData = {
      tema: formData.tema,
      formato: formData.formato,
      objetivo: formData.objetivo,
      status: formData.status,
      data_publicacao: formData.data_publicacao || null,
      horario: formData.horario || null,
      legenda: formData.legenda || null,
      hashtags: formData.hashtags ? formData.hashtags.split(',').map(t => t.trim()).filter(Boolean) : null,
      campanha_id: formData.campanha_id || null,
      campanha: null,
      notas: formData.notas || null,
      plataforma: 'instagram',
      ordem_dia: 0,
      idea_id: null,
      midia_url: null,
      midia_referencia: null,
      tour_id: null,
    };

    if (editingPost) {
      await onUpdatePost(editingPost.id, postData);
    } else {
      await onCreatePost(postData);
    }

    setIsCreateOpen(false);
    resetForm();
  };

  const handleDragStart = (post: ContentPost) => {
    setDraggedPost(post);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (date: Date, hour?: string) => {
    if (draggedPost) {
      const updates: Partial<ContentPost> = { data_publicacao: format(date, 'yyyy-MM-dd') };
      if (hour) {
        updates.horario = hour;
      }
      await onMovePost(draggedPost.id, format(date, 'yyyy-MM-dd'));
      setDraggedPost(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderPostCard = (post: ContentPost, compact = false) => {
    const formatConfig = FORMAT_CONFIG[post.formato];
    const statusConfig = POST_STATUS_CONFIG[post.status];

    return (
      <div
        key={post.id}
        draggable
        onDragStart={() => handleDragStart(post)}
        onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}
        className={`group text-xs p-1.5 rounded cursor-move hover:ring-1 hover:ring-primary/50 ${statusConfig.bgColor} ${compact ? '' : 'mb-1'}`}
      >
        <div className="flex items-center gap-1">
          <span>{formatConfig.icon}</span>
          <span className="truncate flex-1">{post.tema}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
        {post.horario && !compact && (
          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
            <Clock className="h-2.5 w-2.5" />
            {post.horario.slice(0, 5)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Semana de' dd MMM", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'week')}>
            <SelectTrigger className="w-[120px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Postagem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPost ? 'Editar Postagem' : 'Nova Postagem'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Tema *</Label>
                  <Input
                    value={formData.tema}
                    onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                    placeholder="Ex: Reels sobre bastidores da Chapada"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Formato</Label>
                    <Select value={formData.formato} onValueChange={(v) => setFormData({ ...formData, formato: v as ContentFormat })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FORMAT_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.icon} {config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Objetivo</Label>
                    <Select value={formData.objetivo} onValueChange={(v) => setFormData({ ...formData, objetivo: v as ContentObjective })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OBJECTIVE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={formData.data_publicacao}
                      onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={formData.horario}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as PostStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POST_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {campaigns.length > 0 && (
                  <div>
                    <Label>Campanha</Label>
                    <Select value={formData.campanha_id || "none"} onValueChange={(v) => setFormData({ ...formData, campanha_id: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar campanha (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {campaigns.filter(c => c.ativa).map(camp => (
                          <SelectItem key={camp.id} value={camp.id}>{camp.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Legenda</Label>
                  <Textarea
                    value={formData.legenda}
                    onChange={(e) => setFormData({ ...formData, legenda: e.target.value })}
                    placeholder="Texto da legenda..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Hashtags (separadas por vírgula)</Label>
                  <Input
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    placeholder="#ecoturismo, #natureza, #viagem"
                  />
                </div>

                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Anotações internas..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.tema.trim()}>
                    {editingPost ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'month' ? (
            <>
              {/* Month View */}
              <div className="grid grid-cols-7 border-b">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayPosts = getPostsForDate(day);
                  const dayTours = getToursForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const hasTour = dayTours.length > 0;

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border-r border-b last:border-r-0 p-1 transition-colors
                        ${!isCurrentMonth ? 'bg-muted/30' : ''}
                        ${isCurrentDay ? 'bg-primary/5' : ''}
                        ${hasTour ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
                        hover:bg-muted/50 cursor-pointer
                      `}
                      onClick={() => handleDayClick(day)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(day)}
                    >
                      <div className={`text-sm mb-1 flex items-center justify-between ${isCurrentDay ? 'font-bold text-primary' : ''} ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                        <span>{format(day, 'd')}</span>
                        {hasTour && (
                          <MapPin className="h-3 w-3 text-emerald-600" />
                        )}
                      </div>

                      {/* Tours indicator */}
                      {dayTours.length > 0 && (
                        <div className="mb-1">
                          {dayTours.slice(0, 1).map(tour => (
                            <div
                              key={tour.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 truncate flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                              title={`${tour.name} - ${tour.city}`}
                            >
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{tour.name}</span>
                            </div>
                          ))}
                          {dayTours.length > 1 && (
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 text-center mt-0.5">
                              +{dayTours.length - 1} viagem(ns)
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        {dayPosts.slice(0, hasTour ? 2 : 3).map(post => renderPostCard(post))}
                        {dayPosts.length > (hasTour ? 2 : 3) && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayPosts.length - (hasTour ? 2 : 3)} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Week View with Time Slots */}
              <div className="grid grid-cols-8 border-b">
                <div className="py-2 text-center text-sm font-medium text-muted-foreground border-r">
                  Horário
                </div>
                {calendarDays.map((day, index) => {
                  const isCurrentDay = isToday(day);
                  const dayTours = getToursForDate(day);
                  const hasTour = dayTours.length > 0;
                  
                  return (
                    <div 
                      key={index} 
                      className={`py-2 text-center text-sm font-medium border-r last:border-r-0 ${isCurrentDay ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} ${hasTour ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {hasTour && <MapPin className="h-3 w-3 text-emerald-600" />}
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={`text-lg ${isCurrentDay ? 'font-bold' : ''}`}>{format(day, 'd')}</div>
                      {hasTour && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal truncate px-1" title={dayTours.map(t => t.name).join(', ')}>
                          {dayTours[0].name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {HOUR_SLOTS.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b">
                    <div className="py-2 px-2 text-xs text-muted-foreground border-r flex items-start justify-center">
                      {hour}
                    </div>
                    {calendarDays.map((day, dayIndex) => {
                      const hourPosts = getPostsForDateAndHour(day, hour);
                      const isCurrentDay = isToday(day);

                      return (
                        <div
                          key={dayIndex}
                          className={`min-h-[50px] border-r last:border-r-0 p-1 transition-colors hover:bg-muted/50 cursor-pointer
                            ${isCurrentDay ? 'bg-primary/5' : ''}
                          `}
                          onClick={() => handleDayClick(day, hour)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(day, hour)}
                        >
                          {hourPosts.map(post => renderPostCard(post, true))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center items-center">
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <MapPin className="h-3 w-3 text-emerald-600" />
          </div>
          <span className="text-muted-foreground">Viagem</span>
        </div>
        <span className="text-muted-foreground">|</span>
        {Object.entries(FORMAT_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1 text-sm">
            <span>{config.icon}</span>
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentCalendar;
