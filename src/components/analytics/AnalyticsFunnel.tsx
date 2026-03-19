import React, { useState, useEffect } from 'react';
import { Target, TrendingDown, Download, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import AnalyticsFilters, { AnalyticsFiltersState } from './AnalyticsFilters';

interface FunnelStep {
  name: string;
  count: number;
  rate: number;
  dropOff: number;
}

const conversionGoals = [
  { value: 'pedido_reserva', label: 'Pedido de Reserva' },
  { value: 'clique_whatsapp', label: 'Clique no WhatsApp' },
  { value: 'cadastro', label: 'Cadastro' },
  { value: 'all', label: 'Todas as Conversões' }
];

const FUNNEL_COLORS = ['hsl(var(--primary))', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'];

const AnalyticsFunnel: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all'
  });
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters, selectedGoal]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sessions
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

      const { data: sessions } = await sessionsQuery;
      const sessionIds = sessions?.map(s => s.id) || [];

      // Fetch pageviews
      const { data: pageviews } = await supabase
        .from('analytics_pageviews')
        .select('*')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // Define funnel steps based on goal
      const totalSessions = sessions?.length || 0;

      // Count sessions that visited each key page
      const homeVisits = new Set(pageviews?.filter(pv => pv.page_path === '/').map(pv => pv.session_id)).size;
      const agendaVisits = new Set(pageviews?.filter(pv => 
        pv.page_path === '/agenda' || pv.page_path.includes('agenda')
      ).map(pv => pv.session_id)).size;
      const passeioVisits = new Set(pageviews?.filter(pv => 
        pv.page_path.includes('/passeio') || pv.page_path.includes('/tour')
      ).map(pv => pv.session_id)).size;
      const ctaClicks = new Set(pageviews?.filter(pv => pv.clicked_main_cta).map(pv => pv.session_id)).size;
      
      let conversions = 0;
      if (selectedGoal === 'all') {
        conversions = sessions?.filter(s => s.converted).length || 0;
      } else {
        conversions = sessions?.filter(s => s.converted && s.conversion_goal === selectedGoal).length || 0;
      }

      // Build funnel
      const steps: FunnelStep[] = [
        { name: 'Sessões Totais', count: totalSessions, rate: 100, dropOff: 0 },
        { name: 'Visitou Agenda', count: agendaVisits, rate: totalSessions > 0 ? (agendaVisits / totalSessions) * 100 : 0, dropOff: 0 },
        { name: 'Viu Passeio', count: passeioVisits, rate: totalSessions > 0 ? (passeioVisits / totalSessions) * 100 : 0, dropOff: 0 },
        { name: 'Clicou CTA', count: ctaClicks, rate: totalSessions > 0 ? (ctaClicks / totalSessions) * 100 : 0, dropOff: 0 },
        { name: 'Converteu', count: conversions, rate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0, dropOff: 0 }
      ];

      // Calculate drop-off rates
      for (let i = 1; i < steps.length; i++) {
        if (steps[i - 1].count > 0) {
          steps[i].dropOff = ((steps[i - 1].count - steps[i].count) / steps[i - 1].count) * 100;
        }
      }

      setFunnelSteps(steps);

      // Get unique campaigns for filters
      const uniqueCampaigns = [...new Set(sessions?.map(s => s.utm_campaign).filter(Boolean) as string[])];
      setCampaigns(uniqueCampaigns);

      // Generate insights
      generateInsights(steps);

    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (steps: FunnelStep[]) => {
    const newInsights: string[] = [];

    // Find biggest drop-off
    let maxDropOff = 0;
    let maxDropOffStep = '';
    steps.forEach((step, index) => {
      if (index > 0 && step.dropOff > maxDropOff) {
        maxDropOff = step.dropOff;
        maxDropOffStep = `${steps[index - 1].name} → ${step.name}`;
      }
    });

    if (maxDropOff > 0) {
      newInsights.push(
        `📉 A maior perda ocorre entre "${maxDropOffStep}" com ${maxDropOff.toFixed(1)}% de abandono.`
      );
    }

    // Conversion rate analysis
    const conversionStep = steps.find(s => s.name === 'Converteu');
    if (conversionStep) {
      if (conversionStep.rate > 5) {
        newInsights.push(
          `🎯 Taxa de conversão geral de ${conversionStep.rate.toFixed(1)}% está acima da média do mercado. Excelente!`
        );
      } else if (conversionStep.rate > 1) {
        newInsights.push(
          `🎯 Taxa de conversão de ${conversionStep.rate.toFixed(1)}%. Há oportunidade para otimização no funil.`
        );
      } else {
        newInsights.push(
          `⚠️ Taxa de conversão de ${conversionStep.rate.toFixed(1)}% está baixa. Revise as etapas do funil.`
        );
      }
    }

    // CTA analysis
    const ctaStep = steps.find(s => s.name === 'Clicou CTA');
    const passeioStep = steps.find(s => s.name === 'Viu Passeio');
    if (ctaStep && passeioStep && passeioStep.count > 0) {
      const ctaRate = (ctaStep.count / passeioStep.count) * 100;
      if (ctaRate < 20) {
        newInsights.push(
          `💡 Apenas ${ctaRate.toFixed(1)}% dos visitantes que viram passeios clicaram em CTA. Considere melhorar o destaque dos botões.`
        );
      }
    }

    setInsights(newInsights);
  };

  const exportCSV = () => {
    const headers = ['Etapa', 'Quantidade', 'Taxa de Passagem', 'Taxa de Abandono'];
    const rows = funnelSteps.map(s => [
      s.name,
      s.count,
      `${s.rate.toFixed(1)}%`,
      `${s.dropOff.toFixed(1)}%`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funnel-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const funnelChartData = funnelSteps.map((step, index) => ({
    name: step.name,
    value: step.count,
    fill: FUNNEL_COLORS[index % FUNNEL_COLORS.length]
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Funil de Conversão</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={selectedGoal} onValueChange={setSelectedGoal}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo de conversão" />
            </SelectTrigger>
            <SelectContent>
              {conversionGoals.map(goal => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        campaigns={campaigns}
        pages={pages}
      />

      {/* Funnel Visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4" />
            Visualização do Funil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[300px] sm:h-[350px] -ml-2 sm:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelSteps} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 9 }} 
                  width={70}
                  tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                />
                <Tooltip 
                  formatter={(value, name) => [value, 'Quantidade']}
                  labelFormatter={(label) => `Etapa: ${label}`}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelSteps.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingDown className="h-4 w-4" />
            Detalhamento do Funil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Etapa</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Taxa</TableHead>
                  <TableHead className="text-right">Abandono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelSteps.map((step, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                        />
                        <span className="truncate">{step.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{step.count.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-xs hidden sm:table-cell">{step.rate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-xs">
                      {index === 0 ? '-' : (
                        <span className={step.dropOff > 50 ? 'text-red-500' : ''}>
                          {step.dropOff.toFixed(1)}%
                        </span>
                      )}
                    </TableCell>
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

export default AnalyticsFunnel;
