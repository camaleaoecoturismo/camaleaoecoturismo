import { useState, useEffect, useRef } from 'react';
import { format as formatDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Star, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CalendarExportEditor } from './CalendarExportEditor';

interface Tour {
  id: string;
  nome: string;
  data_passeio: string;
  data_fim?: string | null;
  ativo: boolean;
  isExclusive?: boolean;
}

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

interface CatalogAnnualViewProps {
  tours: Tour[];
  onMonthClick: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CatalogAnnualView = ({ tours, onMonthClick }: CatalogAnnualViewProps) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [commemorativeDates, setCommemorativeDates] = useState<CommemorativeDate[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch commemorative dates and opportunities for the year
  useEffect(() => {
    const fetchDates = async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data } = await supabase
        .from('commemorative_dates')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (data) {
        setCommemorativeDates(data);
      }
    };

    const fetchOpportunities = async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data } = await supabase
        .from('calendar_opportunities')
        .select('*')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (data) {
        setOpportunities(data);
      }
    };

    fetchDates();
    fetchOpportunities();
  }, [currentYear]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1);
    return date;
  });

  const getEventsForMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const monthTours = tours.filter(tour => {
      const tourStart = parseISO(tour.data_passeio);
      const tourEnd = tour.data_fim ? parseISO(tour.data_fim) : tourStart;
      return (tourStart >= monthStart && tourStart <= monthEnd) || 
             (tourEnd >= monthStart && tourEnd <= monthEnd) ||
             (tourStart <= monthStart && tourEnd >= monthEnd);
    });

    const monthCommemorative = commemorativeDates.filter(cd => {
      const cdDate = parseISO(cd.date);
      return cdDate >= monthStart && cdDate <= monthEnd;
    });

    const monthOpportunities = opportunities.filter(opp => {
      const oppStart = parseISO(opp.start_date);
      const oppEnd = opp.end_date ? parseISO(opp.end_date) : oppStart;
      return (oppStart >= monthStart && oppStart <= monthEnd) || 
             (oppEnd >= monthStart && oppEnd <= monthEnd) ||
             (oppStart <= monthStart && oppEnd >= monthEnd);
    });

    return {
      tours: monthTours,
      commemoratives: monthCommemorative,
      opportunities: monthOpportunities,
      total: monthTours.length // Only count tours as events
    };
  };

  const getDaysWithEvents = (monthDate: Date) => {
    const days = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate)
    });

    return days.map(day => {
      const dayTours = tours.filter(tour => {
        const tourStart = parseISO(tour.data_passeio);
        const tourEnd = tour.data_fim ? parseISO(tour.data_fim) : tourStart;
        return day >= tourStart && day <= tourEnd;
      });

      const dayCommemorative = commemorativeDates.filter(cd => 
        isSameDay(parseISO(cd.date), day)
      );

      const dayOpportunities = opportunities.filter(opp => {
        const oppStart = parseISO(opp.start_date);
        const oppEnd = opp.end_date ? parseISO(opp.end_date) : oppStart;
        return day >= oppStart && day <= oppEnd;
      });

      return {
        date: day,
        hasTour: dayTours.length > 0,
        hasCommemorativeDate: dayCommemorative.length > 0,
        hasOpportunity: dayOpportunities.length > 0,
        activeTour: dayTours.some(t => t.ativo && parseISO(t.data_passeio) >= new Date()),
        hasExclusive: dayTours.some(t => t.isExclusive)
      };
    });
  };


  const renderMonthCard = (monthDate: Date, index: number, forExport: boolean = false) => {
    const events = getEventsForMonth(monthDate);
    const daysWithEvents = getDaysWithEvents(monthDate);
    const isCurrentMonth = isSameMonth(monthDate, new Date());
    
    return (
      <div
        key={index}
        className={`border rounded-lg p-3 ${forExport ? 'bg-white' : 'cursor-pointer transition-all hover:shadow-md hover:border-primary'} ${
          isCurrentMonth && !forExport ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        onClick={forExport ? undefined : () => onMonthClick(monthDate)}
      >
        {/* Month Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold capitalize">
            {formatDate(monthDate, 'MMMM', { locale: ptBR })}
          </h3>
          {events.total > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {events.total} evento{events.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Mini Calendar */}
        <div className="grid grid-cols-7 gap-1 text-[9px]">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-muted-foreground font-medium p-0.5">
              {day}
            </div>
          ))}
          
          {/* Empty cells for first week offset (Monday = 0) */}
          {Array.from({ length: (getDay(startOfMonth(monthDate)) + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}
          
          {/* Days */}
          {daysWithEvents.map((dayInfo, i) => {
            const hasExclusive = dayInfo.hasExclusive;
            
            return (
              <div
                key={i}
                className={`relative text-center rounded overflow-hidden ${
                  isToday(dayInfo.date) && !forExport ? 'ring-2 ring-primary ring-inset font-bold' : ''
                } ${
                  hasExclusive 
                    ? 'bg-blue-600 text-white'
                    : dayInfo.activeTour ? 'bg-primary text-primary-foreground' : 
                    dayInfo.hasTour ? 'bg-primary/60 text-primary-foreground' : ''
                }`}
                style={forExport ? {
                  backgroundColor: hasExclusive 
                    ? '#2563eb'
                    : dayInfo.activeTour ? '#7c3aed' : 
                    dayInfo.hasTour ? 'rgba(124, 58, 237, 0.6)' : undefined,
                  color: (dayInfo.hasTour || hasExclusive) ? 'white' : undefined
                } : undefined}
              >
                {/* Orange indicator on top for commemorative dates */}
                {dayInfo.hasCommemorativeDate && (
                  <div 
                    className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400"
                    style={forExport ? { backgroundColor: '#fbbf24' } : undefined}
                  />
                )}
                {/* Green indicator on bottom for opportunities */}
                {dayInfo.hasOpportunity && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500"
                    style={forExport ? { backgroundColor: '#10b981' } : undefined}
                  />
                )}
                <span className="relative z-10 block py-1">
                  {formatDate(dayInfo.date, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Events Summary - Show all events */}
        {events.total > 0 && (
          <div className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
            {events.opportunities.map(opp => {
              const startDate = parseISO(opp.start_date);
              const endDate = opp.end_date ? parseISO(opp.end_date) : null;
              let dateStr = '';
              if (endDate && formatDate(startDate, 'yyyy-MM-dd') !== formatDate(endDate, 'yyyy-MM-dd')) {
                if (startDate.getMonth() === endDate.getMonth()) {
                  dateStr = `(${formatDate(startDate, 'dd')} a ${formatDate(endDate, 'dd/MM')})`;
                } else {
                  dateStr = `(${formatDate(startDate, 'dd/MM')} a ${formatDate(endDate, 'dd/MM')})`;
                }
              } else {
                dateStr = `(${formatDate(startDate, 'dd/MM')})`;
              }
              return (
                <div key={opp.id} className="flex items-center gap-1 text-[9px] text-emerald-600">
                  <Sparkles className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate">{opp.title} {dateStr}</span>
                </div>
              );
            })}
            {events.commemoratives.map(cd => {
              const cdDate = parseISO(cd.date);
              const dateStr = formatDate(cdDate, 'dd/MM');
              return (
                <div key={cd.id} className="flex items-center gap-1 text-[9px] text-amber-600">
                  <Star className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate">{cd.title} ({dateStr})</span>
                </div>
              );
            })}
            {events.tours.map(tour => {
              const startDate = parseISO(tour.data_passeio);
              const endDate = tour.data_fim ? parseISO(tour.data_fim) : null;
              let dateStr = '';
              if (endDate && formatDate(startDate, 'yyyy-MM-dd') !== formatDate(endDate, 'yyyy-MM-dd')) {
                if (startDate.getMonth() === endDate.getMonth()) {
                  dateStr = `(${formatDate(startDate, 'dd')} a ${formatDate(endDate, 'dd/MM')})`;
                } else {
                  dateStr = `(${formatDate(startDate, 'dd/MM')} a ${formatDate(endDate, 'dd/MM')})`;
                }
              } else {
                dateStr = `(${formatDate(startDate, 'dd/MM')})`;
              }
              const isExclusive = tour.isExclusive;
              return (
                <div 
                  key={tour.id} 
                  className={`text-[9px] truncate flex items-center gap-1 ${
                    isExclusive 
                      ? 'text-blue-600' 
                      : tour.ativo ? 'text-primary' : 'text-primary/60'
                  }`}
                  style={forExport ? { 
                    color: isExclusive 
                      ? '#2563eb' 
                      : tour.ativo ? '#7c3aed' : 'rgba(124, 58, 237, 0.6)' 
                  } : undefined}
                >
                  <span>• {tour.nome} {dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentYear(y => y - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentYear - 1}
        </Button>
        
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{currentYear}</h2>
          
          <Button variant="outline" size="sm" onClick={() => setIsEditorOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Personalizar e Baixar
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentYear(y => y + 1)}
        >
          {currentYear + 1}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Months Grid */}
      <div ref={calendarRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((monthDate, index) => renderMonthCard(monthDate, index))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Passeio Ativo/Futuro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          <span>Passeio Passado/Inativo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
          <span>Viagem Exclusiva</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-3 rounded-sm relative overflow-hidden bg-muted">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400" />
          </div>
          <span>Feriado (barra superior)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-3 rounded-sm relative overflow-hidden bg-muted">
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500" />
          </div>
          <span>Oportunidade (barra inferior)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm ring-2 ring-primary" />
          <span>Hoje</span>
        </div>
      </div>

      {/* Calendar Export Editor */}
      {isEditorOpen && (
        <CalendarExportEditor
          tours={tours}
          commemorativeDates={commemorativeDates}
          currentYear={currentYear}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};
