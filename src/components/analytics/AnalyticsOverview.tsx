import React, { useState, useEffect, useCallback } from 'react';
import { Users, Eye, Clock, TrendingUp, MousePointer, Activity, Brain, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import AnalyticsFilters, { AnalyticsFiltersState } from './AnalyticsFilters';
import AIInsightsCard from './AIInsightsCard';

interface OverviewMetrics {
  totalSessions: number;
  uniqueVisitors: number;
  totalPageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
}

const AnalyticsOverview: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all'
  });
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalSessions: 0,
    uniqueVisitors: 0,
    totalPageviews: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    conversionRate: 0
  });
  const [sessionsPerDay, setSessionsPerDay] = useState<any[]>([]);
  const [pageviewsPerDay, setPageviewsPerDay] = useState<any[]>([]);
  const [conversionByDevice, setConversionByDevice] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date());
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build base query
      let sessionsQuery = supabase
        .from('analytics_sessions')
        .select('*')
        .gte('first_visit_at', filters.startDate.toISOString())
        .lte('first_visit_at', filters.endDate.toISOString());

      if (filters.deviceType !== 'all') {
        sessionsQuery = sessionsQuery.eq('device_type', filters.deviceType);
      }
      if (filters.campaign !== 'all') {
        sessionsQuery = sessionsQuery.eq('utm_campaign', filters.campaign);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      
      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map(s => s.id) || [];

      // Fetch pageviews
      let pageviewsQuery = supabase
        .from('analytics_pageviews')
        .select('*')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      if (filters.pagePath !== 'all') {
        pageviewsQuery = pageviewsQuery.eq('page_path', filters.pagePath);
      }

      const { data: pageviews } = await pageviewsQuery;

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const uniqueVisitors = new Set(sessions?.map(s => s.user_id_anon).filter(Boolean)).size;
      const totalPageviews = pageviews?.length || 0;
      
      const singlePageSessions = sessions?.filter(s => s.pages_per_session === 1).length || 0;
      const bounceRate = totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;
      
      const totalDuration = sessions?.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0) || 0;
      const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
      
      const conversions = sessions?.filter(s => s.converted).length || 0;
      const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

      setMetrics({
        totalSessions,
        uniqueVisitors,
        totalPageviews,
        bounceRate,
        avgSessionDuration,
        conversionRate
      });

      // Sessions per day
      const days = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
      const sessionsByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = sessions?.filter(s => 
          format(new Date(s.first_visit_at), 'yyyy-MM-dd') === dayStr
        ).length || 0;
        return {
          date: format(day, 'dd/MM', { locale: ptBR }),
          sessões: count
        };
      });
      setSessionsPerDay(sessionsByDay);

      // Pageviews per day
      const pvByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = pageviews?.filter(pv => 
          format(new Date(pv.viewed_at), 'yyyy-MM-dd') === dayStr
        ).length || 0;
        return {
          date: format(day, 'dd/MM', { locale: ptBR }),
          visualizações: count
        };
      });
      setPageviewsPerDay(pvByDay);

      // Conversion by device
      const deviceTypes = ['desktop', 'mobile', 'tablet'];
      const convByDevice = deviceTypes.map(device => {
        const deviceSessions = sessions?.filter(s => s.device_type === device) || [];
        const deviceConversions = deviceSessions.filter(s => s.converted).length;
        const rate = deviceSessions.length > 0 ? (deviceConversions / deviceSessions.length) * 100 : 0;
        return {
          device: device.charAt(0).toUpperCase() + device.slice(1),
          'taxa de conversão': parseFloat(rate.toFixed(1))
        };
      });
      setConversionByDevice(convByDevice);

      // Top pages
      const pageCounts: Record<string, number> = {};
      pageviews?.forEach(pv => {
        pageCounts[pv.page_path] = (pageCounts[pv.page_path] || 0) + 1;
      });
      const topPagesData = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({
          página: path.length > 20 ? path.substring(0, 20) + '...' : path,
          visualizações: count
        }));
      setTopPages(topPagesData);

      // Get unique campaigns and pages for filters
      const uniqueCampaigns = [...new Set(sessions?.map(s => s.utm_campaign).filter(Boolean) as string[])];
      const uniquePages = [...new Set(pageviews?.map(pv => pv.page_path).filter(Boolean) as string[])];
      setCampaigns(uniqueCampaigns);
      setPages(uniquePages);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const exportCSV = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Sessões Totais', metrics.totalSessions],
      ['Usuários Únicos', metrics.uniqueVisitors],
      ['Visualizações de Página', metrics.totalPageviews],
      ['Taxa de Rejeição', `${metrics.bounceRate.toFixed(1)}%`],
      ['Duração Média', formatDuration(metrics.avgSessionDuration)],
      ['Taxa de Conversão', `${metrics.conversionRate.toFixed(1)}%`]
    ];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-overview-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const metricsCards = [
    { label: 'Sessões Totais', value: metrics.totalSessions.toLocaleString('pt-BR'), icon: Activity, color: 'text-primary' },
    { label: 'Usuários Únicos', value: metrics.uniqueVisitors.toLocaleString('pt-BR'), icon: Users, color: 'text-blue-500' },
    { label: 'Visualizações', value: metrics.totalPageviews.toLocaleString('pt-BR'), icon: Eye, color: 'text-green-500' },
    { label: 'Taxa de Rejeição', value: `${metrics.bounceRate.toFixed(1)}%`, icon: MousePointer, color: 'text-orange-500' },
    { label: 'Duração Média', value: formatDuration(metrics.avgSessionDuration), icon: Clock, color: 'text-purple-500' },
    { label: 'Taxa de Conversão', value: `${metrics.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Visão Geral</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <span className="text-xs text-muted-foreground">
            Atualizado: {format(lastRefresh, 'HH:mm:ss', { locale: ptBR })}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 self-start sm:self-auto">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        campaigns={campaigns}
        pages={pages}
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricsCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions per Day */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessões por Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionsPerDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="sessões" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pageviews per Day */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visualizações por Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pageviewsPerDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="visualizações" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion by Device */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão por Dispositivo</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionByDevice} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="device" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" width={35} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="taxa de conversão" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 5 Páginas Mais Acessadas</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="página" 
                    type="category" 
                    tick={{ fontSize: 8 }} 
                    width={60}
                    tickFormatter={(value) => value.length > 10 ? value.substring(0, 10) + '...' : value}
                  />
                  <Tooltip />
                  <Bar dataKey="visualizações" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <AIInsightsCard
        metrics={metrics}
        sessionsPerDay={sessionsPerDay}
        conversionByDevice={conversionByDevice}
        topPages={topPages}
        dateRange={{ start: filters.startDate, end: filters.endDate }}
      />
    </div>
  );
};

export default AnalyticsOverview;
