import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, MousePointer, Download, Brain, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import AnalyticsFilters, { AnalyticsFiltersState } from './AnalyticsFilters';

interface PageData {
  path: string;
  title: string;
  views: number;
  avgTime: number;
  avgScroll: number;
  ctaClicks: number;
}

const AnalyticsBehavior: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all'
  });
  const [pageData, setPageData] = useState<PageData[]>([]);
  const [timeByPage, setTimeByPage] = useState<any[]>([]);
  const [ctaByPage, setCtaByPage] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
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
      // Fetch sessions first
      let sessionsQuery = supabase
        .from('analytics_sessions')
        .select('id, utm_campaign')
        .gte('first_visit_at', filters.startDate.toISOString())
        .lte('first_visit_at', filters.endDate.toISOString());

      if (filters.deviceType !== 'all') {
        sessionsQuery = sessionsQuery.eq('device_type', filters.deviceType);
      }
      if (filters.campaign !== 'all') {
        sessionsQuery = sessionsQuery.eq('utm_campaign', filters.campaign);
      }

      const { data: sessions } = await sessionsQuery;
      const sessionIds = sessions?.map(s => s.id) || [];

      // Fetch pageviews
      const { data: pageviews } = await supabase
        .from('analytics_pageviews')
        .select('*')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // Group by page
      const pageGroups: Record<string, { views: any[], time: number, scroll: number, cta: number }> = {};
      
      pageviews?.forEach(pv => {
        const path = pv.page_path;
        if (!pageGroups[path]) {
          pageGroups[path] = { views: [], time: 0, scroll: 0, cta: 0 };
        }
        pageGroups[path].views.push(pv);
        pageGroups[path].time += pv.time_on_page_seconds || 0;
        pageGroups[path].scroll += pv.scroll_depth_percent || 0;
        if (pv.clicked_main_cta) pageGroups[path].cta++;
      });

      const tableData: PageData[] = Object.entries(pageGroups)
        .map(([path, data]) => ({
          path,
          title: path,
          views: data.views.length,
          avgTime: data.views.length > 0 ? data.time / data.views.length : 0,
          avgScroll: data.views.length > 0 ? data.scroll / data.views.length : 0,
          ctaClicks: data.cta
        }))
        .sort((a, b) => b.views - a.views);

      setPageData(tableData);

      // Time by page (top 5)
      const timeData = tableData
        .slice(0, 5)
        .map(p => ({
          página: p.path.length > 20 ? p.path.substring(0, 20) + '...' : p.path,
          'tempo médio (s)': Math.round(p.avgTime)
        }));
      setTimeByPage(timeData);

      // CTA clicks by page (top 5)
      const ctaData = tableData
        .filter(p => p.ctaClicks > 0)
        .sort((a, b) => b.ctaClicks - a.ctaClicks)
        .slice(0, 5)
        .map(p => ({
          página: p.path.length > 20 ? p.path.substring(0, 20) + '...' : p.path,
          'cliques CTA': p.ctaClicks
        }));
      setCtaByPage(ctaData);

      // Build funnel
      const funnelSteps = [
        { name: 'Home', path: '/' },
        { name: 'Agenda', path: '/agenda' },
        { name: 'Passeio', path: '/passeio' },
        { name: 'Reserva', path: '/reserva' }
      ];

      const funnelResults = funnelSteps.map(step => {
        const count = pageviews?.filter(pv => 
          pv.page_path === step.path || pv.page_path.startsWith(step.path + '/')
        ).length || 0;
        return { etapa: step.name, sessões: count };
      });
      setFunnelData(funnelResults);

      // Get unique pages and campaigns for filters
      const uniquePages = [...new Set(pageviews?.map(pv => pv.page_path).filter(Boolean) as string[])];
      const uniqueCampaigns = [...new Set(sessions?.map(s => s.utm_campaign).filter(Boolean) as string[])];
      setPages(uniquePages);
      setCampaigns(uniqueCampaigns);

      // Generate insights
      generateInsights(tableData, funnelResults);

    } catch (error) {
      console.error('Error fetching behavior data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (tableData: PageData[], funnelResults: any[]) => {
    const newInsights: string[] = [];

    // Top page insight
    if (tableData.length > 0) {
      const topPage = tableData[0];
      newInsights.push(
        `📄 A página "${topPage.path}" é a mais visitada com ${topPage.views} visualizações.`
      );
    }

    // Low scroll depth
    const lowScrollPages = tableData.filter(p => p.avgScroll < 50 && p.views > 10);
    if (lowScrollPages.length > 0) {
      const page = lowScrollPages[0];
      newInsights.push(
        `⚠️ A página "${page.path}" tem scroll médio de apenas ${page.avgScroll.toFixed(0)}%. O conteúdo pode não estar engajando.`
      );
    }

    // High CTA clicks
    const highCtaPage = tableData.find(p => p.ctaClicks > p.views * 0.1);
    if (highCtaPage) {
      newInsights.push(
        `🎯 A página "${highCtaPage.path}" tem excelente taxa de clique em CTA: ${((highCtaPage.ctaClicks / highCtaPage.views) * 100).toFixed(1)}%.`
      );
    }

    // Funnel drop-off
    if (funnelResults.length >= 2) {
      for (let i = 1; i < funnelResults.length; i++) {
        const prev = funnelResults[i - 1];
        const curr = funnelResults[i];
        if (prev.sessões > 0 && curr.sessões < prev.sessões * 0.3) {
          const dropRate = ((1 - curr.sessões / prev.sessões) * 100).toFixed(0);
          newInsights.push(
            `📉 Há uma queda de ${dropRate}% entre "${prev.etapa}" e "${curr.etapa}". Revise essa transição.`
          );
          break;
        }
      }
    }

    setInsights(newInsights);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const exportCSV = () => {
    const headers = ['Página', 'Visualizações', 'Tempo Médio', 'Scroll Médio', 'Cliques CTA'];
    const rows = pageData.map(p => [
      p.path,
      p.views,
      formatDuration(p.avgTime),
      `${p.avgScroll.toFixed(0)}%`,
      p.ctaClicks
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavior-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Comportamento no Site</h2>
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
            {format(lastRefresh, 'HH:mm:ss', { locale: ptBR })}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time by Page */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Tempo Médio por Página
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeByPage} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="s" />
                  <YAxis 
                    dataKey="página" 
                    type="category" 
                    tick={{ fontSize: 8 }} 
                    width={60}
                    tickFormatter={(value) => value.length > 10 ? value.substring(0, 10) + '...' : value}
                  />
                  <Tooltip formatter={(value) => `${value}s`} />
                  <Bar dataKey="tempo médio (s)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CTA Clicks by Page */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <MousePointer className="h-4 w-4" />
              Cliques em CTA por Página
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ctaByPage} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                  <Bar dataKey="cliques CTA" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ArrowRight className="h-4 w-4" />
            Funil de Navegação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {funnelData.map((step, index) => (
              <React.Fragment key={step.etapa}>
                <div className="flex flex-col items-center p-4 bg-primary/10 rounded-lg min-w-[100px]">
                  <span className="text-2xl font-bold text-primary">{step.sessões}</span>
                  <span className="text-xs text-muted-foreground mt-1">{step.etapa}</span>
                </div>
                {index < funnelData.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Mapa de Páginas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Página</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Tempo Médio</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Scroll</TableHead>
                  <TableHead className="text-right">CTA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-[150px] truncate text-xs">{row.path}</TableCell>
                    <TableCell className="text-right text-xs">{row.views}</TableCell>
                    <TableCell className="text-right text-xs hidden sm:table-cell">{formatDuration(row.avgTime)}</TableCell>
                    <TableCell className="text-right text-xs hidden sm:table-cell">{row.avgScroll.toFixed(0)}%</TableCell>
                    <TableCell className="text-right text-xs">{row.ctaClicks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Brain className="h-4 w-4 text-primary" />
              <span>Insights da IA</span>
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <p key={index} className="text-sm text-foreground/90 leading-relaxed">
                  {insight}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsBehavior;
