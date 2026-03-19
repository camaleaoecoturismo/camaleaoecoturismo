import React, { useState, useEffect } from 'react';
import { Globe, TrendingUp, Download, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import AnalyticsFilters, { AnalyticsFiltersState } from './AnalyticsFilters';

interface TrafficSource {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  conversionRate: number;
  avgDuration: number;
}

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AnalyticsTrafficSources: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all'
  });
  const [trafficData, setTrafficData] = useState<TrafficSource[]>([]);
  const [sessionsBySource, setSessionsBySource] = useState<any[]>([]);
  const [conversionByCampaign, setConversionByCampaign] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('analytics_sessions')
        .select('*')
        .gte('first_visit_at', filters.startDate.toISOString())
        .lte('first_visit_at', filters.endDate.toISOString());

      if (filters.deviceType !== 'all') {
        query = query.eq('device_type', filters.deviceType);
      }

      const { data: sessions, error } = await query;
      if (error) throw error;

      // Group by source/medium/campaign
      const grouped: Record<string, { sessions: any[], converted: number, duration: number }> = {};
      
      sessions?.forEach(session => {
        const source = session.utm_source || 'Direto';
        const medium = session.utm_medium || '-';
        const campaign = session.utm_campaign || '-';
        const key = `${source}|${medium}|${campaign}`;
        
        if (!grouped[key]) {
          grouped[key] = { sessions: [], converted: 0, duration: 0 };
        }
        grouped[key].sessions.push(session);
        if (session.converted) grouped[key].converted++;
        grouped[key].duration += session.session_duration_seconds || 0;
      });

      const tableData: TrafficSource[] = Object.entries(grouped)
        .map(([key, data]) => {
          const [source, medium, campaign] = key.split('|');
          return {
            source,
            medium,
            campaign,
            sessions: data.sessions.length,
            conversionRate: data.sessions.length > 0 ? (data.converted / data.sessions.length) * 100 : 0,
            avgDuration: data.sessions.length > 0 ? data.duration / data.sessions.length : 0
          };
        })
        .sort((a, b) => b.sessions - a.sessions);

      setTrafficData(tableData);

      // Sessions by source (for pie chart)
      const sourceData: Record<string, number> = {};
      sessions?.forEach(s => {
        const source = s.utm_source || 'Direto';
        sourceData[source] = (sourceData[source] || 0) + 1;
      });
      
      const pieData = Object.entries(sourceData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));
      setSessionsBySource(pieData);

      // Conversion by campaign (for bar chart)
      const campaignData: Record<string, { total: number, converted: number }> = {};
      sessions?.forEach(s => {
        const campaign = s.utm_campaign || 'Sem campanha';
        if (!campaignData[campaign]) {
          campaignData[campaign] = { total: 0, converted: 0 };
        }
        campaignData[campaign].total++;
        if (s.converted) campaignData[campaign].converted++;
      });

      const barData = Object.entries(campaignData)
        .map(([name, data]) => ({
          campanha: name.length > 15 ? name.substring(0, 15) + '...' : name,
          'taxa de conversão': data.total > 0 ? parseFloat(((data.converted / data.total) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b['taxa de conversão'] - a['taxa de conversão'])
        .slice(0, 5);
      setConversionByCampaign(barData);

      // Get unique campaigns
      const uniqueCampaigns = [...new Set(sessions?.map(s => s.utm_campaign).filter(Boolean) as string[])];
      setCampaigns(uniqueCampaigns);

      // Generate insights
      generateInsights(tableData, pieData, barData);

    } catch (error) {
      console.error('Error fetching traffic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (tableData: TrafficSource[], pieData: any[], barData: any[]) => {
    const newInsights: string[] = [];

    if (pieData.length > 0) {
      const topSource = pieData[0];
      const totalSessions = pieData.reduce((sum, d) => sum + d.value, 0);
      const percentage = totalSessions > 0 ? ((topSource.value / totalSessions) * 100).toFixed(1) : 0;
      newInsights.push(
        `🌐 A fonte "${topSource.name}" representa ${percentage}% do tráfego com ${topSource.value} sessões.`
      );
    }

    if (barData.length > 0) {
      const bestCampaign = barData[0];
      if (bestCampaign['taxa de conversão'] > 0) {
        newInsights.push(
          `🎯 A campanha "${bestCampaign.campanha}" tem a melhor taxa de conversão: ${bestCampaign['taxa de conversão']}%.`
        );
      }
    }

    // Find campaigns with high traffic but low conversion
    const lowConversionSources = tableData.filter(t => t.sessions > 10 && t.conversionRate < 1);
    if (lowConversionSources.length > 0) {
      const source = lowConversionSources[0];
      newInsights.push(
        `⚠️ A fonte "${source.source}" tem ${source.sessions} sessões mas apenas ${source.conversionRate.toFixed(1)}% de conversão. Revise o público-alvo.`
      );
    }

    setInsights(newInsights);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const exportCSV = () => {
    const headers = ['Fonte', 'Mídia', 'Campanha', 'Sessões', 'Taxa de Conversão', 'Duração Média'];
    const rows = trafficData.map(t => [
      t.source,
      t.medium,
      t.campaign,
      t.sessions,
      `${t.conversionRate.toFixed(1)}%`,
      formatDuration(t.avgDuration)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-sources-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Origem de Tráfego</h2>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
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
        {/* Sessions by Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              Sessões por Fonte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionsBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sessionsBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion by Campaign */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Taxa de Conversão por Campanha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionByCampaign}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="campanha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="taxa de conversão" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detalhamento por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte</TableHead>
                <TableHead>Mídia</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Taxa Conv.</TableHead>
                <TableHead className="text-right">Duração Média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trafficData.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell>{row.medium}</TableCell>
                  <TableCell>{row.campaign}</TableCell>
                  <TableCell className="text-right">{row.sessions}</TableCell>
                  <TableCell className="text-right">{row.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatDuration(row.avgDuration)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

export default AnalyticsTrafficSources;
