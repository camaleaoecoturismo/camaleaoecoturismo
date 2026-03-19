import { useState, useEffect, useMemo } from 'react';
import { format as formatDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Save, Trash2, Download, Image, FileText, Palette, Type, Layout, ImageIcon, RotateCcw, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Tour {
  id: string;
  nome: string;
  data_passeio: string;
  data_fim?: string | null;
  ativo: boolean;
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
  description: string | null;
}

interface CalendarTemplate {
  id?: string;
  name: string;
  is_default: boolean;
  background_color: string;
  header_bg_color: string;
  text_color: string;
  tour_badge_color: string;
  commemorative_badge_color: string;
  opportunity_badge_color: string;
  weekend_bg_color: string;
  font_family: string;
  title_font_size: number;
  month_font_size: number;
  day_font_size: number;
  cell_padding: number;
  cell_height: number;
  border_radius: number;
  show_grid_lines: boolean;
  grid_line_color: string;
  show_logo: boolean;
  logo_url: string | null;
  title_text: string;
  subtitle_text: string | null;
}

interface CalendarExportEditorProps {
  tours: Tour[];
  commemorativeDates: CommemorativeDate[];
  currentYear: number;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Courier New', label: 'Courier New' },
];

const DEFAULT_TEMPLATE: CalendarTemplate = {
  name: 'Padrão',
  is_default: false,
  background_color: '#ffffff',
  header_bg_color: '#f8f9fa',
  text_color: '#1f2937',
  tour_badge_color: '#7c3aed',
  commemorative_badge_color: '#fbbf24',
  opportunity_badge_color: '#22c55e',
  weekend_bg_color: '#fef3c7',
  font_family: 'Inter',
  title_font_size: 32,
  month_font_size: 14,
  day_font_size: 11,
  cell_padding: 4,
  cell_height: 28,
  border_radius: 8,
  show_grid_lines: true,
  grid_line_color: '#e5e7eb',
  show_logo: true,
  logo_url: null,
  title_text: 'Agenda Anual',
  subtitle_text: null,
};

export const CalendarExportEditor = ({ 
  tours, 
  commemorativeDates, 
  currentYear, 
  onClose 
}: CalendarExportEditorProps) => {
  const [template, setTemplate] = useState<CalendarTemplate>(DEFAULT_TEMPLATE);
  const [savedTemplates, setSavedTemplates] = useState<CalendarTemplate[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [newOpportunity, setNewOpportunity] = useState({ title: '', start_date: '', end_date: '' });
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const { toast } = useToast();

  // Load saved templates and opportunities
  useEffect(() => {
    const loadTemplates = async () => {
      const { data } = await supabase
        .from('calendar_export_templates')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (data) {
        // Add opportunity_badge_color if not present in saved templates
        const templatesWithOpportunity = data.map(t => ({
          ...t,
          opportunity_badge_color: (t as any).opportunity_badge_color || '#22c55e'
        }));
        setSavedTemplates(templatesWithOpportunity as CalendarTemplate[]);
        const defaultTemplate = data.find(t => t.is_default);
        if (defaultTemplate) {
          setTemplate({
            ...defaultTemplate,
            opportunity_badge_color: (defaultTemplate as any).opportunity_badge_color || '#22c55e'
          } as CalendarTemplate);
        }
      }
    };
    
    const loadOpportunities = async () => {
      const { data } = await supabase
        .from('calendar_opportunities')
        .select('*')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('start_date', `${currentYear}-12-31`)
        .order('start_date', { ascending: true });
      
      if (data) {
        setOpportunities(data);
      }
    };
    
    loadTemplates();
    loadOpportunities();
  }, [currentYear]);

  const addOpportunity = async () => {
    if (!newOpportunity.title.trim() || !newOpportunity.start_date) {
      toast({ title: "Preencha o título e a data inicial", variant: "destructive" });
      return;
    }

    setIsAddingOpportunity(true);
    try {
      const { data, error } = await supabase
        .from('calendar_opportunities')
        .insert({
          title: newOpportunity.title.trim(),
          start_date: newOpportunity.start_date,
          end_date: newOpportunity.end_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      setOpportunities(prev => [...prev, data]);
      setNewOpportunity({ title: '', start_date: '', end_date: '' });
      toast({ title: "Oportunidade adicionada!" });
    } catch (error) {
      console.error('Error adding opportunity:', error);
      toast({ title: "Erro ao adicionar oportunidade", variant: "destructive" });
    } finally {
      setIsAddingOpportunity(false);
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      await supabase.from('calendar_opportunities').delete().eq('id', id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
      toast({ title: "Oportunidade removida" });
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({ title: "Erro ao remover oportunidade", variant: "destructive" });
    }
  };

  const updateTemplate = (key: keyof CalendarTemplate, value: unknown) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
  };

  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev => 
      prev.includes(monthIndex) 
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex]
    );
  };

  const toggleAllMonths = () => {
    if (selectedMonths.length === 12) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
  };

  const resetToDefault = () => {
    setTemplate(DEFAULT_TEMPLATE);
  };

  const saveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: "Digite um nome para o template", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('calendar_export_templates')
        .insert({
          ...template,
          name: newTemplateName.trim(),
          id: undefined,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedTemplates(prev => [...prev, { ...data, opportunity_badge_color: (data as any).opportunity_badge_color || '#22c55e' } as CalendarTemplate]);
      setNewTemplateName('');
      toast({ title: "Template salvo com sucesso!" });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: "Erro ao salvar template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (t: CalendarTemplate) => {
    setTemplate(t);
    toast({ title: `Template "${t.name}" carregado` });
  };

  const deleteTemplate = async (id: string) => {
    try {
      await supabase.from('calendar_export_templates').delete().eq('id', id);
      setSavedTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: "Template excluído" });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: "Erro ao excluir template", variant: "destructive" });
    }
  };

  // Calendar data helpers
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
    const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
    return days.map(day => {
      const dayTours = tours.filter(tour => {
        const tourStart = parseISO(tour.data_passeio);
        const tourEnd = tour.data_fim ? parseISO(tour.data_fim) : tourStart;
        return day >= tourStart && day <= tourEnd;
      });
      const dayCommemorative = commemorativeDates.filter(cd => isSameDay(parseISO(cd.date), day));
      const dayOpportunities = opportunities.filter(opp => {
        const oppStart = parseISO(opp.start_date);
        const oppEnd = opp.end_date ? parseISO(opp.end_date) : oppStart;
        return day >= oppStart && day <= oppEnd;
      });
      const dayOfWeek = getDay(day);
      return {
        date: day,
        hasTour: dayTours.length > 0,
        hasCommemorativeDate: dayCommemorative.length > 0,
        hasOpportunity: dayOpportunities.length > 0,
        activeTour: dayTours.some(t => t.ativo && parseISO(t.data_passeio) >= new Date()),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      };
    });
  };

  // Preview months (show first 3 selected months for preview)
  const previewMonths = useMemo(() => {
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    return sorted.slice(0, 6);
  }, [selectedMonths]);

  // Generate download
  const generateDownload = async (downloadFormat: 'pdf' | 'image') => {
    if (selectedMonths.length === 0) {
      toast({ title: "Selecione pelo menos um mês", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1600px';
      container.style.backgroundColor = template.background_color;
      container.style.padding = '32px';
      container.style.fontFamily = template.font_family;
      document.body.appendChild(container);

      // Header with logo and title
      const headerDiv = document.createElement('div');
      headerDiv.style.display = 'flex';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.justifyContent = 'center';
      headerDiv.style.gap = '16px';
      headerDiv.style.marginBottom = '32px';

      if (template.show_logo && template.logo_url) {
        const logo = document.createElement('img');
        logo.src = template.logo_url;
        logo.style.height = '60px';
        logo.style.objectFit = 'contain';
        headerDiv.appendChild(logo);
      }

      const titleContainer = document.createElement('div');
      titleContainer.style.textAlign = 'center';

      const title = document.createElement('h1');
      title.textContent = `${template.title_text} ${currentYear}`;
      title.style.fontSize = `${template.title_font_size}px`;
      title.style.fontWeight = 'bold';
      title.style.color = template.text_color;
      title.style.margin = '0';
      titleContainer.appendChild(title);

      if (template.subtitle_text) {
        const subtitle = document.createElement('p');
        subtitle.textContent = template.subtitle_text;
        subtitle.style.fontSize = '16px';
        subtitle.style.color = template.text_color;
        subtitle.style.opacity = '0.7';
        subtitle.style.margin = '4px 0 0 0';
        titleContainer.appendChild(subtitle);
      }

      headerDiv.appendChild(titleContainer);
      container.appendChild(headerDiv);

      // Grid for months
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gap = '20px';
      grid.style.alignItems = 'start';
      container.appendChild(grid);

      const sortedMonths = [...selectedMonths].sort((a, b) => a - b);

      for (const monthIndex of sortedMonths) {
        const monthDate = new Date(currentYear, monthIndex, 1);
        const events = getEventsForMonth(monthDate);
        const daysWithEvents = getDaysWithEvents(monthDate);

        const monthCard = document.createElement('div');
        monthCard.style.border = template.show_grid_lines ? `1px solid ${template.grid_line_color}` : 'none';
        monthCard.style.borderRadius = `${template.border_radius}px`;
        monthCard.style.padding = '12px';
        monthCard.style.backgroundColor = template.header_bg_color;

        // Month header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';

        const monthName = document.createElement('h3');
        monthName.textContent = MONTH_NAMES[monthIndex];
        monthName.style.fontWeight = '600';
        monthName.style.fontSize = `${template.month_font_size}px`;
        monthName.style.color = template.text_color;
        header.appendChild(monthName);

        if (events.total > 0) {
          const badge = document.createElement('span');
          badge.textContent = `${events.total} evento${events.total !== 1 ? 's' : ''}`;
          badge.style.fontSize = '10px';
          badge.style.backgroundColor = template.grid_line_color;
          badge.style.color = template.text_color;
          badge.style.borderRadius = '9999px';
          badge.style.display = 'inline-flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.height = '16px';
          badge.style.padding = '0 8px';
          header.appendChild(badge);
        }
        monthCard.appendChild(header);

        // Calendar grid
        const calGrid = document.createElement('div');
        calGrid.style.display = 'grid';
        calGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        calGrid.style.gap = `${template.cell_padding}px`;
        calGrid.style.fontSize = `${template.day_font_size}px`;
        calGrid.style.padding = `${template.cell_padding}px`;
        calGrid.style.backgroundColor = template.background_color;
        calGrid.style.borderRadius = `${template.border_radius / 2}px`;

        ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach(day => {
          const dayHeader = document.createElement('div');
          dayHeader.textContent = day;
          dayHeader.style.textAlign = 'center';
          dayHeader.style.color = template.text_color;
          dayHeader.style.opacity = '0.5';
          dayHeader.style.fontWeight = '500';
          dayHeader.style.padding = `${template.cell_padding}px`;
          calGrid.appendChild(dayHeader);
        });

        // Empty cells
        const firstDayOffset = (getDay(startOfMonth(monthDate)) + 6) % 7;
        for (let i = 0; i < firstDayOffset; i++) {
          const emptyCell = document.createElement('div');
          emptyCell.style.height = `${template.cell_height}px`;
          calGrid.appendChild(emptyCell);
        }

        // Days
        daysWithEvents.forEach(dayInfo => {
          const dayCell = document.createElement('div');
          dayCell.style.position = 'relative';
          dayCell.style.textAlign = 'center';
          dayCell.style.borderRadius = `${template.border_radius / 2}px`;
          dayCell.style.minWidth = `${template.cell_height}px`;
          dayCell.style.height = `${template.cell_height}px`;
          dayCell.style.display = 'flex';
          dayCell.style.alignItems = 'center';
          dayCell.style.justifyContent = 'center';
          dayCell.style.overflow = 'hidden';
          dayCell.style.color = template.text_color;

          // Background color for tours or weekends
          if (dayInfo.activeTour || dayInfo.hasTour) {
            dayCell.style.backgroundColor = template.tour_badge_color;
            dayCell.style.color = 'white';
            if (!dayInfo.activeTour) {
              dayCell.style.opacity = '0.7';
            }
          } else if (dayInfo.isWeekend) {
            dayCell.style.backgroundColor = template.weekend_bg_color;
          }

          // Top indicator for commemorative dates (orange)
          if (dayInfo.hasCommemorativeDate) {
            const topIndicator = document.createElement('div');
            topIndicator.style.position = 'absolute';
            topIndicator.style.top = '0';
            topIndicator.style.left = '0';
            topIndicator.style.right = '0';
            topIndicator.style.height = '3px';
            topIndicator.style.backgroundColor = template.commemorative_badge_color;
            dayCell.appendChild(topIndicator);
          }

          // Bottom indicator for opportunities (green)
          if (dayInfo.hasOpportunity) {
            const bottomIndicator = document.createElement('div');
            bottomIndicator.style.position = 'absolute';
            bottomIndicator.style.bottom = '0';
            bottomIndicator.style.left = '0';
            bottomIndicator.style.right = '0';
            bottomIndicator.style.height = '3px';
            bottomIndicator.style.backgroundColor = template.opportunity_badge_color;
            dayCell.appendChild(bottomIndicator);
          }

          // Day number
          const dayNumber = document.createElement('span');
          dayNumber.textContent = formatDate(dayInfo.date, 'd');
          dayNumber.style.position = 'relative';
          dayNumber.style.zIndex = '1';
          dayCell.appendChild(dayNumber);

          calGrid.appendChild(dayCell);
        });

        monthCard.appendChild(calGrid);

        // Events list
        if (events.total > 0) {
          const eventsList = document.createElement('div');
          eventsList.style.marginTop = '10px';
          eventsList.style.fontSize = '10px';
          eventsList.style.lineHeight = '1.4';

          events.commemoratives.forEach(cd => {
            const item = document.createElement('div');
            const cdDate = parseISO(cd.date);
            item.textContent = `★ ${cd.title} (${formatDate(cdDate, 'dd/MM')})`;
            item.style.color = template.commemorative_badge_color;
            item.style.marginBottom = '2px';
            eventsList.appendChild(item);
          });

          events.tours.forEach(tour => {
            const item = document.createElement('div');
            const startDate = parseISO(tour.data_passeio);
            const endDate = tour.data_fim ? parseISO(tour.data_fim) : null;
            let dateStr = '';
            if (endDate && formatDate(startDate, 'yyyy-MM-dd') !== formatDate(endDate, 'yyyy-MM-dd')) {
              dateStr = `(${formatDate(startDate, 'dd/MM')} a ${formatDate(endDate, 'dd/MM')})`;
            } else {
              dateStr = `(${formatDate(startDate, 'dd/MM')})`;
            }
            item.textContent = `• ${tour.nome} ${dateStr}`;
            item.style.color = template.tour_badge_color;
            item.style.opacity = tour.ativo ? '1' : '0.6';
            item.style.marginBottom = '2px';
            eventsList.appendChild(item);
          });

          events.opportunities.forEach(opp => {
            const item = document.createElement('div');
            const startDate = parseISO(opp.start_date);
            const endDate = opp.end_date ? parseISO(opp.end_date) : null;
            let dateStr = '';
            if (endDate && formatDate(startDate, 'yyyy-MM-dd') !== formatDate(endDate, 'yyyy-MM-dd')) {
              dateStr = `(${formatDate(startDate, 'dd/MM')} a ${formatDate(endDate, 'dd/MM')})`;
            } else {
              dateStr = `(${formatDate(startDate, 'dd/MM')})`;
            }
            item.textContent = `◆ ${opp.title} ${dateStr}`;
            item.style.color = template.opportunity_badge_color;
            item.style.marginBottom = '2px';
            eventsList.appendChild(item);
          });

          monthCard.appendChild(eventsList);
        }

        grid.appendChild(monthCard);
      }

      // Legend
      const legend = document.createElement('div');
      legend.style.display = 'flex';
      legend.style.gap = '24px';
      legend.style.marginTop = '24px';
      legend.style.paddingTop = '16px';
      legend.style.borderTop = `1px solid ${template.grid_line_color}`;
      legend.style.fontSize = '11px';
      legend.style.color = template.text_color;

      [
        { color: template.tour_badge_color, label: 'Passeio' },
        { color: template.weekend_bg_color, label: 'Fim de Semana' },
      ].forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '6px';

        const colorBox = document.createElement('div');
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.borderRadius = '2px';
        colorBox.style.backgroundColor = item.color;
        legendItem.appendChild(colorBox);

        const label = document.createElement('span');
        label.textContent = item.label;
        legendItem.appendChild(label);

        legend.appendChild(legendItem);
      });

      // Add indicator-style legend items
      [
        { color: template.commemorative_badge_color, label: 'Feriado (barra superior)' },
        { color: template.opportunity_badge_color, label: 'Oportunidade (barra inferior)' },
      ].forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '6px';

        const indicatorBox = document.createElement('div');
        indicatorBox.style.width = '18px';
        indicatorBox.style.height = '12px';
        indicatorBox.style.borderRadius = '2px';
        indicatorBox.style.backgroundColor = template.grid_line_color;
        indicatorBox.style.position = 'relative';
        indicatorBox.style.overflow = 'hidden';

        const bar = document.createElement('div');
        bar.style.position = 'absolute';
        bar.style.left = '0';
        bar.style.right = '0';
        bar.style.height = '3px';
        bar.style.backgroundColor = item.color;
        if (item.label.includes('superior')) {
          bar.style.top = '0';
        } else {
          bar.style.bottom = '0';
        }
        indicatorBox.appendChild(bar);
        legendItem.appendChild(indicatorBox);

        const label = document.createElement('span');
        label.textContent = item.label;
        legendItem.appendChild(label);

        legend.appendChild(legendItem);
      });

      container.appendChild(legend);

      // Wait for render
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: template.background_color
      });

      document.body.removeChild(container);

      const monthsText = selectedMonths.length === 12 ? 'Anual' : sortedMonths.map(m => MONTH_NAMES[m]).join('-');

      if (downloadFormat === 'image') {
        const link = document.createElement('a');
        link.download = `Agenda-${currentYear}-${monthsText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width / 2, canvas.height / 2]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`Agenda-${currentYear}-${monthsText}.pdf`);
      }

      toast({ title: "Download concluído!" });
    } catch (error) {
      console.error('Error generating download:', error);
      toast({ title: "Erro ao gerar download", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Editor de Calendário - {currentYear}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Controls */}
          <div className="w-80 border-r flex flex-col">
            <Tabs defaultValue="opportunities" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 flex-wrap">
                <TabsTrigger value="opportunities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Calendar className="h-4 w-4 mr-1" />
                  Oportunidades
                </TabsTrigger>
                <TabsTrigger value="colors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Palette className="h-4 w-4 mr-1" />
                  Cores
                </TabsTrigger>
                <TabsTrigger value="fonts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Type className="h-4 w-4 mr-1" />
                  Fontes
                </TabsTrigger>
                <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Layout className="h-4 w-4 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="header" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Cabeçalho
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <TabsContent value="opportunities" className="m-0 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Adicionar Oportunidade</Label>
                      <p className="text-xs text-muted-foreground">
                        Datas ou períodos disponíveis para marcar viagens
                      </p>
                    </div>
                    
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-xs">Título</Label>
                        <Input
                          placeholder="Ex: Feriado disponível"
                          value={newOpportunity.title}
                          onChange={(e) => setNewOpportunity(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Data início</Label>
                          <Input
                            type="date"
                            value={newOpportunity.start_date}
                            onChange={(e) => setNewOpportunity(prev => ({ ...prev, start_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data fim (opcional)</Label>
                          <Input
                            type="date"
                            value={newOpportunity.end_date}
                            onChange={(e) => setNewOpportunity(prev => ({ ...prev, end_date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={addOpportunity}
                        disabled={isAddingOpportunity}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAddingOpportunity ? 'Adicionando...' : 'Adicionar Oportunidade'}
                      </Button>
                    </div>

                    {opportunities.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Oportunidades cadastradas ({opportunities.length})
                        </Label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {opportunities.map(opp => (
                            <div 
                              key={opp.id} 
                              className="flex items-center justify-between p-2 bg-green-500/10 rounded text-sm border border-green-500/20"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-green-700 dark:text-green-400">
                                  {opp.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(parseISO(opp.start_date), 'dd/MM/yyyy')}
                                  {opp.end_date && ` a ${formatDate(parseISO(opp.end_date), 'dd/MM/yyyy')}`}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive shrink-0"
                                onClick={() => deleteOpportunity(opp.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {opportunities.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhuma oportunidade cadastrada para {currentYear}
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="colors" className="m-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Fundo do calendário</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.background_color}
                          onChange={(e) => updateTemplate('background_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.background_color}
                          onChange={(e) => updateTemplate('background_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Fundo dos meses</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.header_bg_color}
                          onChange={(e) => updateTemplate('header_bg_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.header_bg_color}
                          onChange={(e) => updateTemplate('header_bg_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor do texto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.text_color}
                          onChange={(e) => updateTemplate('text_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.text_color}
                          onChange={(e) => updateTemplate('text_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor dos passeios</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.tour_badge_color}
                          onChange={(e) => updateTemplate('tour_badge_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.tour_badge_color}
                          onChange={(e) => updateTemplate('tour_badge_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor das oportunidades</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.opportunity_badge_color}
                          onChange={(e) => updateTemplate('opportunity_badge_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.opportunity_badge_color}
                          onChange={(e) => updateTemplate('opportunity_badge_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor datas comemorativas</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.commemorative_badge_color}
                          onChange={(e) => updateTemplate('commemorative_badge_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.commemorative_badge_color}
                          onChange={(e) => updateTemplate('commemorative_badge_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor fim de semana</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.weekend_bg_color}
                          onChange={(e) => updateTemplate('weekend_bg_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.weekend_bg_color}
                          onChange={(e) => updateTemplate('weekend_bg_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor das linhas de grade</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.grid_line_color}
                          onChange={(e) => updateTemplate('grid_line_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.grid_line_color}
                          onChange={(e) => updateTemplate('grid_line_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="fonts" className="m-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Família da fonte</Label>
                      <Select value={template.font_family} onValueChange={(v) => updateTemplate('font_family', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho do título: {template.title_font_size}px</Label>
                      <Slider
                        value={[template.title_font_size]}
                        onValueChange={([v]) => updateTemplate('title_font_size', v)}
                        min={16}
                        max={48}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho nome do mês: {template.month_font_size}px</Label>
                      <Slider
                        value={[template.month_font_size]}
                        onValueChange={([v]) => updateTemplate('month_font_size', v)}
                        min={10}
                        max={24}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho dos dias: {template.day_font_size}px</Label>
                      <Slider
                        value={[template.day_font_size]}
                        onValueChange={([v]) => updateTemplate('day_font_size', v)}
                        min={8}
                        max={16}
                        step={1}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="layout" className="m-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar linhas de grade</Label>
                      <Switch
                        checked={template.show_grid_lines}
                        onCheckedChange={(v) => updateTemplate('show_grid_lines', v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Espaçamento das células: {template.cell_padding}px</Label>
                      <Slider
                        value={[template.cell_padding]}
                        onValueChange={([v]) => updateTemplate('cell_padding', v)}
                        min={0}
                        max={12}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Altura das células: {template.cell_height}px</Label>
                      <Slider
                        value={[template.cell_height]}
                        onValueChange={([v]) => updateTemplate('cell_height', v)}
                        min={20}
                        max={40}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Arredondamento das bordas: {template.border_radius}px</Label>
                      <Slider
                        value={[template.border_radius]}
                        onValueChange={([v]) => updateTemplate('border_radius', v)}
                        min={0}
                        max={20}
                        step={1}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="header" className="m-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar logo</Label>
                      <Switch
                        checked={template.show_logo}
                        onCheckedChange={(v) => updateTemplate('show_logo', v)}
                      />
                    </div>

                    {template.show_logo && (
                      <div className="space-y-2">
                        <Label>URL do logo</Label>
                        <Input
                          value={template.logo_url || ''}
                          onChange={(e) => updateTemplate('logo_url', e.target.value || null)}
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={template.title_text}
                        onChange={(e) => updateTemplate('title_text', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtítulo (opcional)</Label>
                      <Input
                        value={template.subtitle_text || ''}
                        onChange={(e) => updateTemplate('subtitle_text', e.target.value || null)}
                        placeholder="Subtítulo..."
                      />
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              {/* Templates section */}
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nome do template..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={saveTemplate} disabled={isSaving}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>

                {savedTemplates.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Templates salvos:</Label>
                    {savedTemplates.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 justify-start h-8"
                          onClick={() => loadTemplate(t)}
                        >
                          {t.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteTemplate(t.id!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full" onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar padrão
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-months-editor"
                    checked={selectedMonths.length === 12}
                    onCheckedChange={toggleAllMonths}
                  />
                  <label htmlFor="all-months-editor" className="text-sm cursor-pointer">
                    Todos os meses
                  </label>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-wrap gap-2">
                  {MONTH_NAMES.map((month, index) => (
                    <button
                      key={index}
                      onClick={() => toggleMonth(index)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedMonths.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview area */}
            <ScrollArea className="flex-1">
              <div 
                className="p-8 min-h-full"
                style={{ 
                  backgroundColor: template.background_color,
                  fontFamily: template.font_family
                }}
              >
                {/* Preview Header */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {template.show_logo && template.logo_url && (
                    <img src={template.logo_url} alt="Logo" className="h-12 object-contain" />
                  )}
                  <div className="text-center">
                    <h1 
                      style={{ 
                        fontSize: `${template.title_font_size}px`,
                        fontWeight: 'bold',
                        color: template.text_color
                      }}
                    >
                      {template.title_text} {currentYear}
                    </h1>
                    {template.subtitle_text && (
                      <p style={{ color: template.text_color, opacity: 0.7 }}>
                        {template.subtitle_text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preview Grid */}
                <div className="grid grid-cols-3 gap-5">
                  {previewMonths.map(monthIndex => {
                    const monthDate = new Date(currentYear, monthIndex, 1);
                    const events = getEventsForMonth(monthDate);
                    const daysWithEvents = getDaysWithEvents(monthDate);
                    const firstDayOffset = (getDay(startOfMonth(monthDate)) + 6) % 7;

                    return (
                      <div
                        key={monthIndex}
                        style={{
                          border: template.show_grid_lines ? `1px solid ${template.grid_line_color}` : 'none',
                          borderRadius: `${template.border_radius}px`,
                          padding: '12px',
                          backgroundColor: template.header_bg_color
                        }}
                      >
                        {/* Month header */}
                        <div className="flex justify-between items-center mb-2">
                          <h3 style={{ 
                            fontWeight: 600, 
                            fontSize: `${template.month_font_size}px`,
                            color: template.text_color
                          }}>
                            {MONTH_NAMES[monthIndex]}
                          </h3>
                          {events.total > 0 && (
                            <span 
                              className="inline-flex items-center justify-center h-4 px-2 rounded-full"
                              style={{ 
                                fontSize: '10px', 
                                backgroundColor: template.grid_line_color,
                                color: template.text_color
                              }}
                            >
                              {events.total} evento{events.total !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Calendar grid */}
                        <div 
                          className="grid grid-cols-7"
                          style={{ 
                            gap: `${template.cell_padding}px`,
                            fontSize: `${template.day_font_size}px`,
                            padding: `${template.cell_padding}px`,
                            backgroundColor: template.background_color,
                            borderRadius: `${template.border_radius / 2}px`
                          }}
                        >
                          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
                            <div 
                              key={i} 
                              className="text-center font-medium"
                              style={{ 
                                color: template.text_color, 
                                opacity: 0.5,
                                padding: `${template.cell_padding}px`
                              }}
                            >
                              {day}
                            </div>
                          ))}

                          {Array.from({ length: firstDayOffset }).map((_, i) => (
                            <div key={`empty-${i}`} style={{ height: `${template.cell_height}px` }} />
                          ))}

                          {daysWithEvents.map((dayInfo, i) => {
                            let bgColor = 'transparent';
                            let textColor = template.text_color;
                            let opacity = 1;

                            if (dayInfo.activeTour || dayInfo.hasTour) {
                              bgColor = template.tour_badge_color;
                              textColor = 'white';
                              opacity = dayInfo.activeTour ? 1 : 0.7;
                            } else if (dayInfo.isWeekend) {
                              bgColor = template.weekend_bg_color;
                            }

                            return (
                              <div
                                key={i}
                                className="relative flex items-center justify-center overflow-hidden"
                                style={{
                                  height: `${template.cell_height}px`,
                                  minWidth: `${template.cell_height}px`,
                                  borderRadius: `${template.border_radius / 2}px`,
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  opacity,
                                }}
                              >
                                {/* Top indicator for commemorative dates */}
                                {dayInfo.hasCommemorativeDate && (
                                  <div 
                                    className="absolute top-0 left-0 right-0 h-[3px]"
                                    style={{ backgroundColor: template.commemorative_badge_color }}
                                  />
                                )}
                                {/* Bottom indicator for opportunities */}
                                {dayInfo.hasOpportunity && (
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 h-[3px]"
                                    style={{ backgroundColor: template.opportunity_badge_color }}
                                  />
                                )}
                                <span className="relative z-10">{formatDate(dayInfo.date, 'd')}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {previewMonths.length < selectedMonths.length && (
                  <p className="text-center text-sm mt-4" style={{ color: template.text_color, opacity: 0.5 }}>
                    + {selectedMonths.length - previewMonths.length} meses selecionados (não mostrados no preview)
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Download buttons */}
            <div className="p-4 border-t flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => generateDownload('image')}
                disabled={isGenerating || selectedMonths.length === 0}
              >
                <Image className="h-4 w-4 mr-2" />
                {isGenerating ? 'Gerando...' : 'Baixar Imagem'}
              </Button>
              <Button
                onClick={() => generateDownload('pdf')}
                disabled={isGenerating || selectedMonths.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isGenerating ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
