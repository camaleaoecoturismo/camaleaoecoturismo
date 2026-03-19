import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, TrendingDown, Users, MessageCircle, RefreshCw, Target, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AbandonmentData {
  id: string;
  session_id: string;
  tour_id: string | null;
  tour_name: string | null;
  step_reached: number;
  last_field: string | null;
  cpf: string | null;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  started_at: string;
  last_activity_at: string;
  completed: boolean;
  converted_to_reserva: boolean;
  device_type: string | null;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Escolha do Pacote',
  2: 'Dados Pessoais',
  3: 'Política de Cancelamento',
  4: 'Termos e Condições',
  5: 'Pagamento'
};

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const FormAbandonmentMetrics: React.FC = () => {
  const { data: abandonmentData = [], isLoading, refetch } = useQuery({
    queryKey: ['form-abandonment-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('form_abandonment_tracking')
        .select('*')
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as AbandonmentData[];
    }
  });

  const metrics = useMemo(() => {
    const total = abandonmentData.length;
    const completed = abandonmentData.filter(d => d.completed).length;
    const converted = abandonmentData.filter(d => d.converted_to_reserva).length;
    const abandoned = total - completed;
    
    // Group by step
    const byStep: Record<number, number> = {};
    abandonmentData.filter(d => !d.completed).forEach(d => {
      byStep[d.step_reached] = (byStep[d.step_reached] || 0) + 1;
    });
    
    // Group by tour
    const byTour: Record<string, { name: string; count: number; completed: number }> = {};
    abandonmentData.forEach(d => {
      const tourName = d.tour_name || 'Desconhecido';
      if (!byTour[tourName]) {
        byTour[tourName] = { name: tourName, count: 0, completed: 0 };
      }
      byTour[tourName].count++;
      if (d.completed) byTour[tourName].completed++;
    });
    
    // Recoverable leads (has contact info but didn't complete)
    const recoverableLeads = abandonmentData.filter(
      d => !d.completed && (d.whatsapp || d.email)
    );
    
    // Abandonment rate
    const abandonmentRate = total > 0 ? ((abandoned / total) * 100).toFixed(1) : '0';
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
    
    return {
      total,
      completed,
      converted,
      abandoned,
      abandonmentRate,
      conversionRate,
      byStep,
      byTour: Object.values(byTour).sort((a, b) => b.count - a.count),
      recoverableLeads
    };
  }, [abandonmentData]);

  const stepChartData = useMemo(() => {
    return Object.entries(metrics.byStep).map(([step, count]) => ({
      name: STEP_LABELS[parseInt(step)] || `Etapa ${step}`,
      value: count,
      step: parseInt(step)
    })).sort((a, b) => a.step - b.step);
  }, [metrics.byStep]);

  const tourChartData = useMemo(() => {
    return metrics.byTour.slice(0, 5).map(t => ({
      name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      iniciados: t.count,
      concluidos: t.completed,
      abandonados: t.count - t.completed
    }));
  }, [metrics.byTour]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Carregando métricas...</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (abandonmentData.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Métricas de Abandono de Formulário
            </h2>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado de abandono registrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Os dados de abandono de formulário aparecerão aqui quando usuários iniciarem o processo de reserva 
              mas não concluírem. O rastreamento acontece em tempo real.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Métricas de Abandono de Formulário
          </h2>
          <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Iniciados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{metrics.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Taxa Conversão</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{metrics.conversionRate}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Taxa Abandono</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{metrics.abandonmentRate}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Recuperáveis</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{metrics.recoverableLeads.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Abandonment by Step */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abandono por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            {stepChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stepChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stepChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum dado de abandono
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abandonment by Tour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Passeio (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {tourChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tourChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="concluidos" name="Concluídos" fill="#22c55e" stackId="a" />
                  <Bar dataKey="abandonados" name="Abandonados" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recoverable Leads Table */}
      {metrics.recoverableLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Leads Recuperáveis ({metrics.recoverableLeads.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Pessoas que abandonaram o formulário mas deixaram dados de contato
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">WhatsApp</TableHead>
                    <TableHead className="text-xs">Passeio</TableHead>
                    <TableHead className="text-xs">Etapa</TableHead>
                    <TableHead className="text-xs">Quando</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recoverableLeads.slice(0, 20).map((lead) => {
                    const whatsappNumber = lead.whatsapp?.replace(/\D/g, '') || '';
                    const whatsappLink = whatsappNumber ? 
                      `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(`Olá ${lead.nome || ''}, vi que você começou uma reserva para o passeio ${lead.tour_name || ''}. Posso ajudar?`)}` : '';
                    
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs font-medium">{lead.nome || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {lead.whatsapp ? (
                            <span className="font-mono">
                              {lead.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{lead.tour_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {STEP_LABELS[lead.step_reached] || `Etapa ${lead.step_reached}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(lead.last_activity_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {whatsappLink && (
                            <a 
                              href={whatsappLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs"
                            >
                              <MessageCircle className="h-3 w-3" />
                              Contatar
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormAbandonmentMetrics;
