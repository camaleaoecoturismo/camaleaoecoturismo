import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarPlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
interface CommemorativeDate {
  id: string;
  title: string;
  date: string;
}
interface CalendarOnlyTour {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}
interface Opportunity {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
}
interface CalendarAdminProps {
  tours: Tour[];
}
const CalendarAdmin: React.FC<CalendarAdminProps> = ({
  tours
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [commemorativeDates, setCommemorativeDates] = useState<CommemorativeDate[]>([]);
  const [calendarOnlyTours, setCalendarOnlyTours] = useState<CalendarOnlyTour[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [newDateTitle, setNewDateTitle] = useState('');
  const [newDateDate, setNewDateDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourStartDate, setNewTourStartDate] = useState('');
  const [newTourEndDate, setNewTourEndDate] = useState('');
  const [newTourDescription, setNewTourDescription] = useState('');
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppStartDate, setNewOppStartDate] = useState('');
  const [newOppEndDate, setNewOppEndDate] = useState('');
  const {
    toast
  } = useToast();
  const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  useEffect(() => {
    fetchCommemorativeDates();
    fetchCalendarOnlyTours();
    fetchOpportunities();
  }, [currentDate]);
  const fetchCommemorativeDates = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);
    const {
      data,
      error
    } = await supabase.from('commemorative_dates').select('*').gte('date', startDate.toISOString().split('T')[0]).lte('date', endDate.toISOString().split('T')[0]);
    if (!error && data) {
      setCommemorativeDates(data);
    }
  };
  const fetchCalendarOnlyTours = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);
    const {
      data,
      error
    } = await supabase.from('calendar_only_tours').select('*').or(`start_date.lte.${endDate.toISOString().split('T')[0]},end_date.gte.${startDate.toISOString().split('T')[0]}`);
    if (!error && data) {
      setCalendarOnlyTours(data);
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
  const handleAddOpportunity = async () => {
    if (!newOppTitle || !newOppStartDate) {
      toast({
        title: "Preencha o título e data inicial",
        variant: "destructive"
      });
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
      toast({
        title: "Erro ao adicionar oportunidade",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Oportunidade adicionada!"
      });
      setNewOppTitle('');
      setNewOppStartDate('');
      setNewOppEndDate('');
      setIsOpportunityDialogOpen(false);
      fetchOpportunities();
    }
  };
  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) return;
    const { error } = await supabase.from('calendar_opportunities').delete().eq('id', id);
    if (error) {
      toast({
        title: "Erro ao excluir",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Oportunidade excluída!"
      });
      fetchOpportunities();
    }
  };
  const handleAddCalendarOnlyTour = async () => {
    if (!newTourName || !newTourStartDate) {
      toast({
        title: "Preencha o nome e data de início",
        variant: "destructive"
      });
      return;
    }
    const {
      error
    } = await supabase.from('calendar_only_tours').insert({
      name: newTourName,
      start_date: newTourStartDate,
      end_date: newTourEndDate || null,
      description: newTourDescription || null
    });
    if (error) {
      toast({
        title: "Erro ao adicionar passeio",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Passeio exclusivo adicionado!"
      });
      setNewTourName('');
      setNewTourStartDate('');
      setNewTourEndDate('');
      setNewTourDescription('');
      setIsTourDialogOpen(false);
      fetchCalendarOnlyTours();
    }
  };
  const handleDeleteCalendarOnlyTour = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este passeio?')) return;
    const {
      error
    } = await supabase.from('calendar_only_tours').delete().eq('id', id);
    if (error) {
      toast({
        title: "Erro ao excluir",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Passeio excluído!"
      });
      fetchCalendarOnlyTours();
    }
  };
  const handleAddCommemorativeDate = async () => {
    if (!newDateTitle || !newDateDate) {
      toast({
        title: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    const {
      error
    } = await supabase.from('commemorative_dates').insert({
      title: newDateTitle,
      date: newDateDate
    });
    if (error) {
      toast({
        title: "Erro ao adicionar data comemorativa",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Data comemorativa adicionada!"
      });
      setNewDateTitle('');
      setNewDateDate('');
      setIsDialogOpen(false);
      fetchCommemorativeDates();
    }
  };
  const handleDeleteCommemorativeDate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta data comemorativa?')) return;
    const {
      error
    } = await supabase.from('commemorative_dates').delete().eq('id', id);
    if (error) {
      toast({
        title: "Erro ao excluir",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Data comemorativa excluída!"
      });
      fetchCommemorativeDates();
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
      return {
        ...tour,
        isPast,
        isCalendarOnly: false
      };
    });

    // Calendar-only tours
    const dayCalendarOnlyTours = calendarOnlyTours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      return currentDateObj >= startDate && currentDateObj <= endDate;
    }).map(tour => {
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : new Date(tour.start_date + 'T12:00:00');
      const isPast = endDate < today;
      return {
        ...tour,
        isPast,
        isCalendarOnly: true
      };
    });
    const dayCommemoratives = commemorativeDates.filter(cd => cd.date === dateStr);
    const dayOpportunities = opportunities.filter(opp => {
      const startDate = new Date(opp.start_date + 'T12:00:00');
      const endDate = opp.end_date ? new Date(opp.end_date + 'T12:00:00') : startDate;
      return currentDateObj >= startDate && currentDateObj <= endDate;
    });
    return {
      tours: dayTours,
      calendarOnlyTours: dayCalendarOnlyTours,
      commemoratives: dayCommemoratives,
      opportunities: dayOpportunities
    };
  };
  const renderCalendarMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const {
      daysInMonth,
      startDayOfWeek
    } = getMonthData(year, month);
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
    return <div className="w-full">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-muted text-muted-foreground text-center text-xs font-medium rounded-t-lg overflow-hidden border border-border">
          {DAYS_OF_WEEK.map((day, i) => <div key={day} className={`py-2 ${i >= 5 ? 'bg-muted/80' : ''}`}>
              {day}
            </div>)}
        </div>

        {/* Calendar Grid */}
        <div className="border border-border rounded-b-lg overflow-hidden">
          {weeks.map((week, weekIndex) => <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
            const isWeekend = dayIndex >= 5;
            const events = day ? getEventsForDay(year, month, day) : {
              tours: [],
              calendarOnlyTours: [],
              commemoratives: [],
              opportunities: []
            };
            const today = new Date();
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return <div key={dayIndex} className={`min-h-20 md:min-h-24 border-r border-b border-border last:border-r-0 p-1 transition-colors bg-white ${isWeekend ? 'bg-gray-50' : ''} ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                    {day && <>
                        <div className={`text-right text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {String(day).padStart(2, '0')}
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {events.commemoratives.map(cd => <div key={cd.id} className="bg-orange-500 text-white text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-orange-600 group relative" title={cd.title}>
                              <span className="truncate block">{cd.title}</span>
                              <button onClick={e => {
                      e.stopPropagation();
                      handleDeleteCommemorativeDate(cd.id);
                    }} className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>)}
                          {events.opportunities.map(opp => <div key={opp.id} className="bg-emerald-500 text-white text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-emerald-600 group relative flex items-center gap-0.5" title={opp.title}>
                              <Sparkles className="h-2 w-2 flex-shrink-0" />
                              <span className="truncate block flex-1">{opp.title}</span>
                              <button onClick={e => {
                      e.stopPropagation();
                      handleDeleteOpportunity(opp.id);
                    }} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>)}
                          {events.tours.map(tour => <div key={tour.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${
                              tour.is_exclusive 
                                ? (tour.isPast ? 'bg-green-300 text-green-800' : 'bg-green-500 text-white')
                                : (tour.isPast ? 'bg-[#820AD1]/60 text-white' : 'bg-[#820AD1] text-white')
                            }`} title={tour.is_exclusive ? `${tour.name} (exclusivo)` : tour.name}>
                              {tour.name}
                            </div>)}
                          {events.calendarOnlyTours.map(tour => <div key={tour.id} className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer group relative ${tour.isPast ? 'bg-green-300 text-green-800' : 'bg-green-500 text-white'}`} title={`${tour.name} (exclusivo)`}>
                              <span className="truncate block">{tour.name}</span>
                              <button onClick={e => {
                      e.stopPropagation();
                      handleDeleteCalendarOnlyTour(tour.id);
                    }} className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>)}
                        </div>
                      </>}
                  </div>;
          })}
            </div>)}
        </div>
      </div>;
  };

  // State for confirmed clients count per tour
  const [confirmedCounts, setConfirmedCounts] = useState<Record<string, number>>({});

  // Filter tours for the main month's table (including calendar-only tours)
  const mainMonthTours = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Regular tours
    const regularTours = tours.filter(tour => {
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
        daysRemaining,
        isCalendarOnly: false
      };
    });

    // Calendar-only tours
    const exclusiveTours = calendarOnlyTours.filter(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      return startDate <= endOfMonth && endDate >= startOfMonth;
    }).map(tour => {
      const startDate = new Date(tour.start_date + 'T12:00:00');
      const endDate = tour.end_date ? new Date(tour.end_date + 'T12:00:00') : startDate;
      const isPast = endDate < today;
      const daysRemaining = isPast ? null : Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: tour.id,
        name: tour.name,
        start_date: tour.start_date,
        end_date: tour.end_date,
        isPast,
        daysRemaining,
        isCalendarOnly: true
      };
    });
    return [...regularTours, ...exclusiveTours].sort((a, b) => new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime());
  }, [tours, calendarOnlyTours, currentDate]);

  // Fetch confirmed counts for tours
  useEffect(() => {
    const fetchConfirmedCounts = async () => {
      const tourIds = mainMonthTours.filter(t => !t.isCalendarOnly).map(t => t.id);
      if (tourIds.length === 0) return;
      const {
        data,
        error
      } = await supabase.from('reservas').select('tour_id').in('tour_id', tourIds).eq('status', 'confirmado');
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(r => {
          counts[r.tour_id] = (counts[r.tour_id] || 0) + 1;
        });
        setConfirmedCounts(counts);
      }
    };
    fetchConfirmedCounts();
  }, [mainMonthTours]);
  const formatDateForTable = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate();
    const dayOfWeek = date.toLocaleDateString('pt-BR', {
      weekday: 'long'
    });
    return `${day}, ${dayOfWeek}`;
  };
  return <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">Calendário de Viagens</h2>
        <p className="text-muted-foreground text-sm">
          Visão mensal das viagens e datas comemorativas cadastradas na aba Passeios.
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        
        <div className="text-lg font-semibold">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>

        <Button variant="outline" onClick={() => navigateMonth(1)}>
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Add Buttons */}
      <div className="flex justify-end gap-2">
        <Dialog open={isTourDialogOpen} onOpenChange={setIsTourDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 border-green-500 text-white bg-green-500 hover:bg-green-400">
              <CalendarPlus className="h-4 w-4" />
              Adicionar Passeio Exclusivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Passeio Exclusivo do Calendário</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Passeios exclusivos não aparecem nos cards de divulgação, apenas no calendário.
            </p>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tourName">Nome do Passeio</Label>
                <Input id="tourName" value={newTourName} onChange={e => setNewTourName(e.target.value)} placeholder="Ex: Viagem Corporativa XYZ" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início</Label>
                  <Input id="startDate" type="date" value={newTourStartDate} onChange={e => setNewTourStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim (opcional)</Label>
                  <Input id="endDate" type="date" value={newTourEndDate} onChange={e => setNewTourEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea id="description" value={newTourDescription} onChange={e => setNewTourDescription(e.target.value)} placeholder="Ex: Viagem fechada com empresa ABC" />
              </div>
              <Button onClick={handleAddCalendarOnlyTour} className="w-full bg-teal-500 hover:bg-teal-600">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 border-orange-500 text-primary bg-amber-500 hover:bg-amber-400">
              <Plus className="h-4 w-4" />
              Adicionar Data Comemorativa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Data Comemorativa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={newDateTitle} onChange={e => setNewDateTitle(e.target.value)} placeholder="Ex: Natal, Ano Novo, Feriado..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={newDateDate} onChange={e => setNewDateDate(e.target.value)} />
              </div>
              <Button onClick={handleAddCommemorativeDate} className="w-full bg-orange-500 hover:bg-orange-600">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpportunityDialogOpen} onOpenChange={setIsOpportunityDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 border-emerald-500 text-white bg-emerald-500 hover:bg-emerald-400">
              <Sparkles className="h-4 w-4" />
              Adicionar Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Oportunidade</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Datas disponíveis para marcar viagens
            </p>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="oppTitle">Título</Label>
                <Input id="oppTitle" value={newOppTitle} onChange={e => setNewOppTitle(e.target.value)} placeholder="Ex: Feriado disponível, Período livre..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oppStartDate">Data Início</Label>
                  <Input id="oppStartDate" type="date" value={newOppStartDate} onChange={e => setNewOppStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oppEndDate">Data Fim (opcional)</Label>
                  <Input id="oppEndDate" type="date" value={newOppEndDate} onChange={e => setNewOppEndDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleAddOpportunity} className="w-full bg-emerald-500 hover:bg-emerald-600">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {renderCalendarMonth()}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-foreground"></div>
          <span>Futuras</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-500"></div>
          <span>Passadas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Exclusivos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          <span>Oportunidades</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Datas Comemorativas</span>
        </div>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Viagens de {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mainMonthTours.length === 0 ? <p className="text-muted-foreground text-center py-4">
              Nenhuma viagem cadastrada para este mês.
            </p> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Faltam</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Pendências</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mainMonthTours.map((tour, index) => <TableRow key={tour.id} className={tour.isPast ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-primary">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {tour.name}
                      {tour.isCalendarOnly && <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-700 border-green-300">Exclusivo</Badge>}
                      {tour.isPast && <span className="ml-2 text-xs text-gray-500">(passado)</span>}
                    </TableCell>
                    <TableCell>{formatDateForTable(tour.start_date)}</TableCell>
                    <TableCell className="text-center">
                      {tour.isPast ? <span className="text-gray-400">-</span> : tour.daysRemaining === 0 ? <Badge className="bg-green-500 text-white">Hoje</Badge> : tour.daysRemaining === 1 ? <Badge className="bg-amber-500 text-white">Amanhã</Badge> : <span className="font-medium">{tour.daysRemaining} dias</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {tour.isCalendarOnly ? <span className="text-gray-400">-</span> : <span className="font-medium">{confirmedCounts[tour.id] || 0}</span>}
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>;
};
export default CalendarAdmin;