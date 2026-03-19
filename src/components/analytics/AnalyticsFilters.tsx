import React from 'react';
import { Calendar, Monitor, Smartphone, Tablet, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AnalyticsFiltersState {
  startDate: Date;
  endDate: Date;
  deviceType: string;
  campaign: string;
  pagePath: string;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFiltersState;
  onFiltersChange: (filters: AnalyticsFiltersState) => void;
  campaigns: string[];
  pages: string[];
}

const datePresets = [
  { label: 'Hoje', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Últimos 7 dias', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Últimos 30 dias', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Mês atual', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Mês anterior', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
];

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  campaigns,
  pages
}) => {
  const handleDatePreset = (preset: typeof datePresets[0]) => {
    const { start, end } = preset.getValue();
    onFiltersChange({ ...filters, startDate: start, endDate: end });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros</span>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {/* Date Presets */}
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handleDatePreset(preset)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4" />
              {format(filters.startDate, 'dd/MM/yy', { locale: ptBR })} - {format(filters.endDate, 'dd/MM/yy', { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={{ from: filters.startDate, to: filters.endDate }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onFiltersChange({ ...filters, startDate: range.from, endDate: range.to });
                }
              }}
              locale={ptBR}
              numberOfMonths={1}
              className="sm:hidden"
            />
            <CalendarComponent
              mode="range"
              selected={{ from: filters.startDate, to: filters.endDate }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onFiltersChange({ ...filters, startDate: range.from, endDate: range.to });
                }
              }}
              locale={ptBR}
              numberOfMonths={2}
              className="hidden sm:block"
            />
          </PopoverContent>
        </Popover>

        <div className="grid grid-cols-2 sm:flex gap-2">
          {/* Device Type */}
          <Select
            value={filters.deviceType}
            onValueChange={(value) => onFiltersChange({ ...filters, deviceType: value })}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Dispositivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">Todos</span>
              </SelectItem>
              <SelectItem value="desktop">
                <span className="flex items-center gap-2">
                  <Monitor className="h-3 w-3" /> Desktop
                </span>
              </SelectItem>
              <SelectItem value="mobile">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-3 w-3" /> Mobile
                </span>
              </SelectItem>
              <SelectItem value="tablet">
                <span className="flex items-center gap-2">
                  <Tablet className="h-3 w-3" /> Tablet
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Campaign */}
          <Select
            value={filters.campaign}
            onValueChange={(value) => onFiltersChange({ ...filters, campaign: value })}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign} value={campaign}>
                  {campaign}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Path */}
        <Select
          value={filters.pagePath}
          onValueChange={(value) => onFiltersChange({ ...filters, pagePath: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Página" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as páginas</SelectItem>
            {pages.map((page) => (
              <SelectItem key={page} value={page}>
                {page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AnalyticsFilters;
