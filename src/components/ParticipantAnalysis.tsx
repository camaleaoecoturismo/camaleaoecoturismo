import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Loader2, RefreshCw, AlertTriangle, Users, TrendingUp, MapPin, CreditCard, Heart, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Metrics {
  vagas_totais: number;
  participantes_confirmados: number;
  equipe_staff: number;
  ocupacao_percentual: number;
  total_reservas: number;
  reservas_confirmadas: number;
  reservas_pendentes: number;
  valor_total_arrecadado: number;
  valor_total_esperado: number;
  valor_pendente: number;
  cpfs_duplicados_entre_confirmados: { cpf: string; count: number }[];
  distribuicao_faixa_etaria: Record<string, number>;
  participantes_com_problema_saude: number;
  distribuicao_pontos_embarque: Record<string, number>;
  metodos_pagamento: Record<string, number>;
  niveis_condicionamento: Record<string, number>;
  como_conheceu: Record<string, number>;
  dados_faltantes_confirmados: string[];
}

interface ParticipantAnalysisProps {
  tourId: string;
  tourName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(350, 80%, 55%)',
  'hsl(170, 70%, 40%)',
];

const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const MetricCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color || 'bg-primary/10'}`}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const ParticipantAnalysis: React.FC<ParticipantAnalysisProps> = ({ tourId, tourName, open, onOpenChange }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setAnalysis('');
    setMetrics(null);
    setError(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-participants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ tourId }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('Sem resposta do servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            // Check if it's metrics event
            if (parsed.type === 'metrics') {
              setMetrics(parsed.data);
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'metrics') {
              setMetrics(parsed.data);
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error('Analysis error:', e);
      setError(e.message || 'Erro ao gerar análise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setAnalysis('');
      setMetrics(null);
      setError(null);
    }
  };

  const toChartData = (obj: Record<string, number> | undefined) =>
    obj ? Object.entries(obj).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })) : [];

  const ageData = toChartData(metrics?.distribuicao_faixa_etaria);
  const bpData = toChartData(metrics?.distribuicao_pontos_embarque);
  const payData = toChartData(metrics?.metodos_pagamento);
  const condData = toChartData(metrics?.niveis_condicionamento);
  const comoData = toChartData(metrics?.como_conheceu);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6 text-primary" />
            Análise IA — {tourName}
          </DialogTitle>
          <DialogDescription>
            Diagnóstico inteligente com métricas pré-calculadas e análise estratégica por IA.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Action Button */}
          <div className="flex gap-2">
            <Button onClick={runAnalysis} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
              ) : metrics ? (
                <><RefreshCw className="h-4 w-4" /> Refazer Análise</>
              ) : (
                <><Brain className="h-4 w-4" /> Gerar Análise</>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive p-3 border border-destructive/30 rounded-md bg-destructive/5">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {isLoading && !metrics && (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Coletando e analisando dados dos participantes...</span>
            </div>
          )}

          {/* Metrics Dashboard */}
          {metrics && (
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
                <TabsTrigger value="charts">📈 Gráficos</TabsTrigger>
                <TabsTrigger value="report">📋 Relatório IA</TabsTrigger>
              </TabsList>

              {/* ── TAB: Dashboard ── */}
              <TabsContent value="dashboard" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard icon={Users} label="Confirmados" value={metrics.participantes_confirmados} sub={`de ${metrics.vagas_totais} vagas`} />
                  <MetricCard icon={TrendingUp} label="Ocupação" value={`${metrics.ocupacao_percentual}%`} sub={metrics.ocupacao_percentual >= 100 ? 'Lotado!' : 'do total'} />
                  <MetricCard icon={CreditCard} label="Arrecadado" value={formatCurrency(metrics.valor_total_arrecadado)} />
                  <MetricCard icon={Heart} label="Saúde" value={`${metrics.participantes_com_problema_saude} alerta(s)`} sub="problemas reportados" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard icon={Users} label="Equipe (Staff)" value={metrics.equipe_staff} />
                  <MetricCard icon={Activity} label="Reservas Pendentes" value={metrics.reservas_pendentes} sub={metrics.valor_pendente > 0 ? formatCurrency(metrics.valor_pendente) : undefined} />
                  <MetricCard icon={AlertTriangle} label="CPFs Duplicados" value={metrics.cpfs_duplicados_entre_confirmados.length} sub="entre confirmados" />
                  <MetricCard icon={MapPin} label="Pontos de Embarque" value={Object.keys(metrics.distribuicao_pontos_embarque).length} />
                </div>

                {/* Warnings */}
                {metrics.cpfs_duplicados_entre_confirmados.length > 0 && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> CPFs Duplicados entre Confirmados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {metrics.cpfs_duplicados_entre_confirmados.map((d, i) => (
                        <p key={i} className="text-sm text-destructive/80">
                          CPF ***{d.cpf.slice(-4)} — aparece {d.count}x
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {metrics.dados_faltantes_confirmados.length > 0 && (
                  <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Dados Incompletos ({metrics.dados_faltantes_confirmados.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 max-h-32 overflow-y-auto">
                      {metrics.dados_faltantes_confirmados.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {d}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── TAB: Charts ── */}
              <TabsContent value="charts" className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Age Distribution */}
                  {ageData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Faixa Etária</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={ageData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" name="Participantes" radius={[4, 4, 0, 0]}>
                              {ageData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Boarding Points */}
                  {bpData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Pontos de Embarque</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={bpData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                              {bpData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment Methods */}
                  {payData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Métodos de Pagamento</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                              {payData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Conditioning Levels */}
                  {condData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Condicionamento Físico</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={condData} layout="vertical">
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <Tooltip />
                            <Bar dataKey="value" name="Participantes" radius={[0, 4, 4, 0]}>
                              {condData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Como Conheceu */}
                  {comoData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Como Conheceu</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={comoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                              {comoData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* ── TAB: AI Report ── */}
              <TabsContent value="report" className="mt-4">
                {analysis ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                ) : isLoading ? (
                  <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Gerando relatório inteligente...</span>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>O relatório será gerado junto com a análise.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State */}
          {!metrics && !isLoading && !error && (
            <div className="text-center text-muted-foreground py-12">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Clique em "Gerar Análise" para iniciar</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                A IA irá analisar os participantes confirmados, gerar gráficos e um relatório estratégico completo.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantAnalysis;
