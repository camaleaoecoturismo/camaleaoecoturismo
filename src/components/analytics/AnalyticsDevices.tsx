import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Download, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
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

interface DeviceData {
  device: string;
  sessions: number;
  conversionRate: number;
  avgDuration: number;
  pagesPerSession: number;
  bounceRate: number;
}

const deviceIcons: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />
};

const AnalyticsDevices: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all'
  });
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
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

      if (filters.campaign !== 'all') {
        query = query.eq('utm_campaign', filters.campaign);
      }

      const { data: sessions } = await query;

      // Group by device type
      const deviceGroups: Record<string, any[]> = {
        desktop: [],
        mobile: [],
        tablet: []
      };

      sessions?.forEach(session => {
        const device = session.device_type || 'desktop';
        if (deviceGroups[device]) {
          deviceGroups[device].push(session);
        }
      });

      const tableData: DeviceData[] = Object.entries(deviceGroups).map(([device, deviceSessions]) => {
        const totalSessions = deviceSessions.length;
        const conversions = deviceSessions.filter(s => s.converted).length;
        const totalDuration = deviceSessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0);
        const totalPages = deviceSessions.reduce((sum, s) => sum + (s.pages_per_session || 1), 0);
        const singlePageSessions = deviceSessions.filter(s => s.pages_per_session === 1).length;

        return {
          device: device.charAt(0).toUpperCase() + device.slice(1),
          sessions: totalSessions,
          conversionRate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
          avgDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
          pagesPerSession: totalSessions > 0 ? totalPages / totalSessions : 0,
          bounceRate: totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0
        };
      });

      setDeviceData(tableData);

      // Prepare comparison chart data
      const chartData = [
        {
          metric: 'Sessões',
          Desktop: tableData.find(d => d.device === 'Desktop')?.sessions || 0,
          Mobile: tableData.find(d => d.device === 'Mobile')?.sessions || 0,
          Tablet: tableData.find(d => d.device === 'Tablet')?.sessions || 0
        },
        {
          metric: 'Taxa Conv. (%)',
          Desktop: parseFloat((tableData.find(d => d.device === 'Desktop')?.conversionRate || 0).toFixed(1)),
          Mobile: parseFloat((tableData.find(d => d.device === 'Mobile')?.conversionRate || 0).toFixed(1)),
          Tablet: parseFloat((tableData.find(d => d.device === 'Tablet')?.conversionRate || 0).toFixed(1))
        },
        {
          metric: 'Duração Méd. (s)',
          Desktop: Math.round(tableData.find(d => d.device === 'Desktop')?.avgDuration || 0),
          Mobile: Math.round(tableData.find(d => d.device === 'Mobile')?.avgDuration || 0),
          Tablet: Math.round(tableData.find(d => d.device === 'Tablet')?.avgDuration || 0)
        },
        {
          metric: 'Págs/Sessão',
          Desktop: parseFloat((tableData.find(d => d.device === 'Desktop')?.pagesPerSession || 0).toFixed(1)),
          Mobile: parseFloat((tableData.find(d => d.device === 'Mobile')?.pagesPerSession || 0).toFixed(1)),
          Tablet: parseFloat((tableData.find(d => d.device === 'Tablet')?.pagesPerSession || 0).toFixed(1))
        }
      ];
      setComparisonData(chartData);

      // Get unique campaigns
      const uniqueCampaigns = [...new Set(sessions?.map(s => s.utm_campaign).filter(Boolean) as string[])];
      setCampaigns(uniqueCampaigns);

      // Generate insights
      generateInsights(tableData);

    } catch (error) {
      console.error('Error fetching device data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: DeviceData[]) => {
    const newInsights: string[] = [];
    const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);

    // Session distribution
    const mobileData = data.find(d => d.device === 'Mobile');
    const desktopData = data.find(d => d.device === 'Desktop');

    if (mobileData && totalSessions > 0) {
      const mobilePercent = (mobileData.sessions / totalSessions) * 100;
      if (mobilePercent > 60) {
        newInsights.push(
          `📱 ${mobilePercent.toFixed(0)}% do tráfego vem de dispositivos móveis. Priorize a experiência mobile.`
        );
      } else if (mobilePercent > 40) {
        newInsights.push(
          `📱 ${mobilePercent.toFixed(0)}% do tráfego é mobile. Mantenha boa experiência em ambas plataformas.`
        );
      }
    }

    // Conversion comparison
    if (mobileData && desktopData && desktopData.conversionRate > 0) {
      const diff = desktopData.conversionRate - mobileData.conversionRate;
      if (diff > 2) {
        newInsights.push(
          `⚠️ Desktop converte ${diff.toFixed(1)}pp mais que Mobile. Revise o checkout mobile.`
        );
      } else if (mobileData.conversionRate > desktopData.conversionRate) {
        newInsights.push(
          `✅ Mobile converte melhor que Desktop! A experiência mobile está otimizada.`
        );
      }
    }

    // Bounce rate analysis
    const highBounceDevice = data.find(d => d.bounceRate > 60);
    if (highBounceDevice) {
      newInsights.push(
        `📊 ${highBounceDevice.device} tem taxa de rejeição de ${highBounceDevice.bounceRate.toFixed(0)}%. Melhore a página inicial para esse dispositivo.`
      );
    }

    // Duration analysis
    if (mobileData && desktopData) {
      if (mobileData.avgDuration < desktopData.avgDuration * 0.5) {
        newInsights.push(
          `⏱️ Sessões mobile duram metade do tempo de desktop. Conteúdo pode estar difícil de consumir no celular.`
        );
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
    const headers = ['Dispositivo', 'Sessões', 'Taxa de Conversão', 'Duração Média', 'Páginas/Sessão', 'Taxa de Rejeição'];
    const rows = deviceData.map(d => [
      d.device,
      d.sessions,
      `${d.conversionRate.toFixed(1)}%`,
      formatDuration(d.avgDuration),
      d.pagesPerSession.toFixed(1),
      `${d.bounceRate.toFixed(1)}%`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Perfil do Dispositivo</h2>
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

      {/* Device Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {deviceData.map((device) => (
          <Card key={device.device}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {deviceIcons[device.device.toLowerCase()]}
                </div>
                <div>
                  <h3 className="font-semibold">{device.device}</h3>
                  <p className="text-sm text-muted-foreground">{device.sessions} sessões</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Conversão</span>
                  <p className="font-medium">{device.conversionRate.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duração</span>
                  <p className="font-medium">{formatDuration(device.avgDuration)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Páginas</span>
                  <p className="font-medium">{device.pagesPerSession.toFixed(1)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rejeição</span>
                  <p className="font-medium">{device.bounceRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Comparativo por Dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Desktop" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mobile" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tablet" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detalhamento por Dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Taxa de Conversão</TableHead>
                <TableHead className="text-right">Duração Média</TableHead>
                <TableHead className="text-right">Páginas/Sessão</TableHead>
                <TableHead className="text-right">Taxa de Rejeição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceData.map((row) => (
                <TableRow key={row.device}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {deviceIcons[row.device.toLowerCase()]}
                      <span className="font-medium">{row.device}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{row.sessions.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{row.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatDuration(row.avgDuration)}</TableCell>
                  <TableCell className="text-right">{row.pagesPerSession.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{row.bounceRate.toFixed(1)}%</TableCell>
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

export default AnalyticsDevices;
