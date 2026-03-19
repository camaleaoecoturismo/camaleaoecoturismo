import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { Tour } from '@/hooks/useTours';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommemorativeDate {
  id: string;
  title: string;
  date: string;
}

interface Opportunity {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
}


interface CatalogCalendarViewProps {
  tours: Tour[];
  onEditTour: (tour: Tour) => void;
  initialDate?: Date | null;
}

const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const CatalogCalendarView: React.FC<CatalogCalendarViewProps> = ({
  tours,
  onEditTour,
  initialDate
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [commemorativeDates, setCommemorativeDates] = useState<CommemorativeDate[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [newDateTitle, setNewDateTitle] = useState('');
  const [newDateDate, setNewDateDate] = useState('');
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppStartDate, setNewOppStartDate] = useState('');
  const [newOppEndDate, setNewOppEndDate] = useState('');
  const { toast } = useToast();

  // Update currentDate if initialDate changes
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  // Fetch commemorative dates and opportunities
  useEffect(() => {
    fetchCommemorativeDates();
    fetchOpportunities();
  }, [currentDate]);


  const fetchCommemorativeDates = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);

    const { data, error } = await supabase
      .from('commemorative_dates')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (!error && data) {
      setCommemorativeDates(data);
    }
  };

  const fetchOpportunities = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);

    const { data, error } = await supabase
      .from('calendar_opportunities')
      .select('*')
      .or(`start_date.lte.${endDate.toISOString().split('T')[0]},end_date.gte.${startDate.toISOString().split('T')[0]}`);

    if (!error && data) {
      setOpportunities(data);
    }
  };

  const handleAddCommemorativeDate = async () => {
    if (!newDateTitle || !newDateDate) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('commemorative_dates')
      .insert({ title: newDateTitle, date: newDateDate });

    if (error) {
      toast({ title: "Erro ao adicionar data", variant: "destructive" });
    } else {
      toast({ title: "Data comemorativa adicionada!" });
      setNewDateTitle('');
      setNewDateDate('');
      setIsDialogOpen(false);
      fetchCommemorativeDates();
    }
  };

  const handleAddOpportunity = async () => {
    if (!newOppTitle || !newOppStartDate) {
      toast({ title: "Preencha o título e data inicial", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('calendar_opportunities')
      .insert({ 
        title: newOppTitle, 
        start_date: newOppStartDate,
        end_date: newOppEndDate || null
      });

    if (error) {
      toast({ title: "Erro ao adicionar oportunidade", variant: "destructive" });
    } else {
      toast({ title: "Oportunidade adicionada!" });
      setNewOppTitle('');
      setNewOppStartDate('');
      setNewOppEndDate('');
      setIsOpportunityDialogOpen(false);
      fetchOpportunities();
    }
  };

  const handleDeleteCommemorativeDate = async (id: string) => {
    if (!confirm('Excluir esta data comemorativa?')) return;

    const { error } = await supabase
      .from('commemorative_dates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Data excluída!" });
      fetchCommemorativeDates();
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Excluir esta oportunidade?')) return;

    const { error } = await supabase
      .from('calendar_opportunities')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Oportunidade excluída!" });
      fetchOpportunities();
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const getMonthData = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    return {
      firstDay,
      lastDay,
      daysInMonth,
      startDayOfWeek
    };
  };

  const getEventsForDay = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDateObj = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayTours = tours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      return currentDateObj >= startDate && currentDateObj <= endDate;
    }).map(tour => {
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : new Date(tour.start_date + 'T12:00:00');
      const isPast = endDate < today;
      return { tour, isPast };
    });

    const dayCommemoratives = commemorativeDates.filter(cd => cd.date === dateStr);

    const dayOpportunities = opportunities.filter(opp => {
      const startDate = new Date(opp.start_date + 'T12:00:00');
      const endDate = opp.end_date ? new Date(opp.end_date + 'T12:00:00') : startDate;
      return currentDateObj >= startDate && currentDateObj <= endDate;
    });

    return { 
      tours: dayTours, 
      commemoratives: dayCommemoratives, 
      opportunities: dayOpportunities 
    };
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const { daysInMonth, startDayOfWeek } = getMonthData(year, month);

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Fill last week
    if (weeks.length > 0 && weeks[weeks.length - 1].length < 7) {
      while (weeks[weeks.length - 1].length < 7) {
        weeks[weeks.length - 1].push(null);
      }
    }

    return (
      <div className="w-full">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-muted text-muted-foreground text-center text-xs font-medium rounded-t-lg overflow-hidden border border-border">
          {DAYS_OF_WEEK.map((day, i) => (
            <div key={day} className={`py-2 ${i >= 5 ? 'bg-muted/80' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const isWeekend = dayIndex >= 5;
                const events = day ? getEventsForDay(year, month, day) : { tours: [], commemoratives: [], opportunities: [] };
                const today = new Date();
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                const hasCommemoratives = events.commemoratives.length > 0;
                const hasOpportunities = events.opportunities.length > 0;

                return (
                  <div
                    key={dayIndex}
                    className={`
                      relative min-h-24 md:min-h-28 border-r border-b border-border last:border-r-0 transition-colors
                      ${isWeekend ? 'bg-muted/30' : 'bg-background'}
                      ${isToday ? 'ring-2 ring-primary ring-inset' : ''}
                    `}
                  >
                    {day && (
                      <>
                        {/* Orange indicator on top for commemorative dates */}
                        {hasCommemoratives && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 z-10" title={events.commemoratives.map(c => c.title).join(', ')} />
                        )}
                        {/* Green indicator on bottom for opportunities */}
                        {hasOpportunities && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500 z-10" title={events.opportunities.map(o => o.title).join(', ')} />
                        )}
                        
                        <div className={`p-1 ${hasCommemoratives ? 'pt-2.5' : ''} ${hasOpportunities ? 'pb-2.5' : ''}`}>
                          <div className={`text-right text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {String(day).padStart(2, '0')}
                          </div>
                          <div className="space-y-0.5 mt-0.5">
                            {/* Commemorative dates - now shown as small badges */}
                            {events.commemoratives.map(cd => (
                              <div
                                key={cd.id}
                                className="text-amber-600 text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-amber-50 group relative flex items-center gap-0.5 border border-amber-300 bg-amber-50"
                                title={cd.title}
                              >
                                <Star className="h-2 w-2 flex-shrink-0" />
                                <span className="truncate flex-1">{cd.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCommemorativeDate(cd.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <Trash2 className="h-2 w-2" />
                                </button>
                              </div>
                            ))}
                            {/* Opportunities - now shown as small badges */}
                            {events.opportunities.map(opp => (
                              <div
                                key={opp.id}
                                className="text-emerald-600 text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-emerald-50 group relative flex items-center gap-0.5 border border-emerald-300 bg-emerald-50"
                                title={opp.title}
                              >
                                <Sparkles className="h-2 w-2 flex-shrink-0" />
                                <span className="truncate flex-1">{opp.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOpportunity(opp.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <Trash2 className="h-2 w-2" />
                                </button>
                              </div>
                            ))}
                            {/* Tours */}
                            {events.tours.map(({ tour, isPast }) => (
                              <div
                                key={tour.id}
                                onClick={() => onEditTour(tour)}
                                className={`
                                  text-[10px] px-1.5 py-1 rounded truncate cursor-pointer transition-all
                                  group relative flex items-center gap-1
                                  ${tour.is_exclusive
                                    ? (isPast 
                                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                      : 'bg-blue-600 text-white hover:bg-blue-700')
                                    : tour.is_active 
                                      ? (isPast 
                                        ? 'bg-primary/60 text-primary-foreground hover:bg-primary/70' 
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90')
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }
                                `}
                                title={`${tour.name}${tour.is_exclusive ? ' (Viagem Exclusiva)' : ''}${!tour.is_active ? ' (inativo)' : ''} - Clique para editar`}
                              >
                                <span className="truncate flex-1">{tour.name}</span>
                                <Edit className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Tours list for current month
  const monthTours = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      return startDate <= endOfMonth && endDate >= startOfMonth;
    }).map(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      const isPast = endDate < today;
      const daysRemaining = isPast ? null : Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...tour,
        isPast,
        daysRemaining
      };
    }).sort((a, b) => new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime());
  }, [tours, currentDate]);

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate + 'T12:00:00');
    const end = endDate ? new Date(endDate + 'T12:00:00') : start;
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' });
    
    if (!endDate || startDate === endDate) {
      return `${startDay} ${startMonth}`;
    }
    
    return `${startDay}-${endDay} ${startMonth}`;
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation and Add Date Button */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-foreground">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          
          {/* Add Commemorative Date Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                <Star className="h-4 w-4 mr-1" />
                Feriado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Feriado ou Data Comemorativa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dateTitle">Nome</Label>
                  <Input
                    id="dateTitle"
                    value={newDateTitle}
                    onChange={(e) => setNewDateTitle(e.target.value)}
                    placeholder="Ex: Natal, Carnaval, Feriado Municipal..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateDate">Data</Label>
                  <Input
                    id="dateDate"
                    type="date"
                    value={newDateDate}
                    onChange={(e) => setNewDateDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddCommemorativeDate} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Opportunity Dialog */}
          <Dialog open={isOpportunityDialogOpen} onOpenChange={setIsOpportunityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                <Sparkles className="h-4 w-4 mr-1" />
                Oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Oportunidade</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Datas ou períodos disponíveis para marcar viagens
              </p>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="oppTitle">Título</Label>
                  <Input
                    id="oppTitle"
                    value={newOppTitle}
                    onChange={(e) => setNewOppTitle(e.target.value)}
                    placeholder="Ex: Feriado disponível, Período livre..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oppStartDate">Data Início</Label>
                    <Input
                      id="oppStartDate"
                      type="date"
                      value={newOppStartDate}
                      onChange={(e) => setNewOppStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oppEndDate">Data Fim (opcional)</Label>
                    <Input
                      id="oppEndDate"
                      type="date"
                      value={newOppEndDate}
                      onChange={(e) => setNewOppEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleAddOpportunity} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Calendar */}
      {renderCalendar()}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-3 rounded relative overflow-hidden bg-muted">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          </div>
          <span>Feriado (barra superior)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-3 rounded relative overflow-hidden bg-muted">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>
          <span>Oportunidade (barra inferior)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Passeio Ativo (futuro)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/60" />
          <span>Passeio Ativo (passado)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted" />
          <span>Passeio Inativo</span>
        </div>
      </div>

      {/* Tours List for Month */}
      {monthTours.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            Passeios em {MONTHS[currentDate.getMonth()]} ({monthTours.length})
          </h3>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {monthTours.map(tour => (
              <div
                key={tour.id}
                onClick={() => onEditTour(tour)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
                  ${tour.isPast ? 'bg-muted/50 border-border' : 'bg-card border-border hover:border-primary/50'}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${tour.isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {tour.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRange(tour.start_date, tour.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!tour.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Inativo
                      </span>
                    )}
                    {tour.daysRemaining !== null && tour.daysRemaining > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        tour.daysRemaining <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tour.daysRemaining}d
                      </span>
                    )}
                    {tour.daysRemaining === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Hoje
                      </span>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
