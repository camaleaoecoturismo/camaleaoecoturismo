import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, TrendingUp, RefreshCw, BarChart3, CalendarDays,
  MapPin, Repeat, Sparkles, Sun, AlertTriangle, CheckCircle, Clock,
  GitCompareArrows, Route, CalendarRange
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tour {
  id: string;
  nome: string;
  data_passeio: string;
  data_fim?: string | null;
  ativo: boolean;
  isExclusive?: boolean;
  isFeatured?: boolean;
  cidade?: string;
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

interface Statistics {
  year: number;
  analysisType: string;
  totalTours: number;
  activeTours: number;
  exclusiveTours: number;
  featuredTours: number;
  occupiedDays: number;
  freeDays: number;
  occupancyRate: string;
  commemorativeDatesCount: number;
  opportunitiesCount: number;
  repeatedTours: [string, number][];
  topMonths: [string, number][];
  topDays: { day: string; count: number }[];
  topCities: [string, number][];
}

type AnalysisType = 'year' | 'month' | 'tour' | 'comparison';

interface CatalogDateAnalysisProps {
  tours: Tour[];
  currentYear: number;
}

const analysisTypeConfig: { value: AnalysisType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'year', label: 'Ano Completo', icon: <CalendarRange className="h-4 w-4" />, description: 'Visão geral do ano inteiro' },
  { value: 'month', label: 'Mês Específico', icon: <CalendarDays className="h-4 w-4" />, description: 'Análise focada em um mês' },
  { value: 'tour', label: 'Viagem Específica', icon: <Route className="h-4 w-4" />, description: 'Diagnóstico de uma viagem' },
  { value: 'comparison', label: 'Comparação', icon: <GitCompareArrows className="h-4 w-4" />, description: 'Comparar 2+ viagens' },
];

export const CatalogDateAnalysis = ({ tours, currentYear }: CatalogDateAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [commemorativeDates, setCommemorativeDates] = useState<CommemorativeDate[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [analysisType, setAnalysisType] = useState<AnalysisType>('year');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);

  // Get available months from tours
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tours.forEach(t => {
      if (t.data_passeio) {
        months.add(t.data_passeio.slice(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [tours]);

  const monthNames: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${monthNames[month]} ${year}`;
  };

  // Sort tours by name for selection
  const sortedTours = useMemo(() => 
    [...tours].sort((a, b) => a.nome.localeCompare(b.nome)), 
    [tours]
  );

  useEffect(() => {
    fetchDates();
  }, [currentYear]);

  // Reset selections when type changes
  useEffect(() => {
    setSelectedMonth('');
    setSelectedTourIds([]);
    setStatistics(null);
    setAiAnalysis(null);
    setError(null);
  }, [analysisType]);

  const fetchDates = async () => {
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const [commData, oppData] = await Promise.all([
      supabase
        .from('commemorative_dates')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('calendar_opportunities')
        .select('*')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    ]);

    if (commData.data) setCommemorativeDates(commData.data);
    if (oppData.data) setOpportunities(oppData.data);
  };

  const canRunAnalysis = () => {
    if (analysisType === 'month') return !!selectedMonth;
    if (analysisType === 'tour') return selectedTourIds.length === 1;
    if (analysisType === 'comparison') return selectedTourIds.length >= 2;
    return true; // year
  };

  const toggleTourSelection = (tourId: string) => {
    setSelectedTourIds(prev => {
      if (analysisType === 'tour') {
        return prev.includes(tourId) ? [] : [tourId];
      }
      return prev.includes(tourId) 
        ? prev.filter(id => id !== tourId) 
        : [...prev, tourId];
    });
  };

  const runAnalysis = async () => {
    if (!canRunAnalysis()) {
      toast.error('Selecione os parâmetros necessários para a análise.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-calendar-dates', {
        body: {
          tours,
          commemorativeDates,
          opportunities,
          year: currentYear,
          analysisType,
          selectedMonth: analysisType === 'month' ? selectedMonth : undefined,
          selectedTourIds: ['tour', 'comparison'].includes(analysisType) ? selectedTourIds : undefined,
        },
      });

      if (fnError) throw fnError;

      setStatistics(data.statistics);
      setAiAnalysis(data.aiAnalysis);
    } catch (err: any) {
      console.error('Error running analysis:', err);
      setError(err.message || 'Erro ao executar análise');
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisLabel = () => {
    const config = analysisTypeConfig.find(c => c.value === analysisType);
    return config?.label || 'Análise';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Análise Inteligente</h2>
            <p className="text-sm text-muted-foreground">IA aplicada ao calendário de {currentYear}</p>
          </div>
        </div>
        <Button onClick={runAnalysis} disabled={loading || !canRunAnalysis()}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              {statistics ? 'Atualizar' : 'Executar'} Análise
            </>
          )}
        </Button>
      </div>

      {/* Analysis Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {analysisTypeConfig.map((config) => (
          <button
            key={config.value}
            onClick={() => setAnalysisType(config.value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
              analysisType === config.value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            }`}
          >
            <div className={`${analysisType === config.value ? 'text-primary' : 'text-muted-foreground'}`}>
              {config.icon}
            </div>
            <span className={`text-xs font-medium ${analysisType === config.value ? 'text-primary' : ''}`}>
              {config.label}
            </span>
          </button>
        ))}
      </div>

      {/* Filters based on analysis type */}
      {analysisType === 'month' && (
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">Selecione o mês:</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Escolha um mês..." />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonthLabel(month)} ({tours.filter(t => t.data_passeio?.startsWith(month)).length} passeios)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {analysisType === 'tour' && (
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">Selecione a viagem:</label>
            <Select 
              value={selectedTourIds[0] || ''} 
              onValueChange={(val) => setSelectedTourIds([val])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha uma viagem..." />
              </SelectTrigger>
              <SelectContent>
                {sortedTours.map(tour => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.nome} — {tour.data_passeio} {tour.cidade ? `(${tour.cidade})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {analysisType === 'comparison' && (
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">
              Selecione 2 ou mais viagens para comparar:
            </label>
            {selectedTourIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedTourIds.map(id => {
                  const tour = tours.find(t => t.id === id);
                  return (
                    <Badge 
                      key={id} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleTourSelection(id)}
                    >
                      {tour?.nome} ✕
                    </Badge>
                  );
                })}
              </div>
            )}
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              <div className="space-y-1">
                {sortedTours.map(tour => (
                  <label 
                    key={tour.id} 
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedTourIds.includes(tour.id)}
                      onCheckedChange={() => toggleTourSelection(tour.id)}
                    />
                    <span className="flex-1 truncate">{tour.nome}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{tour.data_passeio}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedTourIds.length} selecionada(s) — mínimo 2
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics Grid */}
      {statistics && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold">{statistics.totalTours}</p>
                <p className="text-xs text-muted-foreground">passeios</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Ativos</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{statistics.activeTours}</p>
                <p className="text-xs text-muted-foreground">passeios</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-xs font-medium">Ocupados</span>
                </div>
                <p className="text-2xl font-bold text-primary">{statistics.occupiedDays}</p>
                <p className="text-xs text-muted-foreground">dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Sun className="h-4 w-4" />
                  <span className="text-xs font-medium">Livres</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{statistics.freeDays}</p>
                <p className="text-xs text-muted-foreground">dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Ocupação</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{statistics.occupancyRate}%</p>
                <p className="text-xs text-muted-foreground">do ano</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Feriados</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">{statistics.commemorativeDatesCount}</p>
                <p className="text-xs text-muted-foreground">cadastrados</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats (only for year/month) */}
          {['year', 'month'].includes(statistics.analysisType) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Meses Mais Viajados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statistics.topMonths.length > 0 ? (
                    statistics.topMonths.map(([month, count], index) => (
                      <div key={month} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{formatMonthLabel(month)}</span>
                        </div>
                        <Badge variant="outline">{count} viagens</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-blue-600" />
                    Passeios que se Repetem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statistics.repeatedTours.length > 0 ? (
                    statistics.repeatedTours.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[150px]" title={name}>{name}</span>
                        <Badge variant="secondary">{count}x</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum passeio repetido</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    Dias da Semana Populares
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statistics.topDays.map((item, index) => (
                    <div key={item.day} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="text-sm">{item.day}</span>
                      </div>
                      <Badge variant="outline">{item.count} dias</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* AI Analysis */}
      {aiAnalysis && !loading && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Análise IA — {getAnalysisLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(aiAnalysis) }}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!statistics && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Análise Inteligente</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {analysisType === 'year' && 'Selecione o tipo de análise e clique em "Executar Análise" para gerar insights com IA.'}
              {analysisType === 'month' && 'Selecione um mês acima e clique em "Executar Análise".'}
              {analysisType === 'tour' && 'Selecione uma viagem acima e clique em "Executar Análise".'}
              {analysisType === 'comparison' && 'Selecione 2 ou mais viagens acima e clique em "Executar Análise".'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^• (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<[hul])/gim, '<p class="mb-2">')
    .replace(/(<li.*<\/li>)/s, '<ul class="list-disc space-y-1 mb-3">$1</ul>');
}
