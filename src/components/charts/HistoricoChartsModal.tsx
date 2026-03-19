import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ComposedChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Percent, X } from 'lucide-react';
import { HISTORICO_2025_DATA, HistoricoTour2025 } from '@/data/historico2025';

interface HistoricoChartsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourData: any[];
  selectedYear: number;
}

type MetricKey = 'faturamento' | 'gastos' | 'lucro' | 'clientes' | 'fatPorCliente' | 'gastosPorCliente' | 'lucroPorCliente';

const METRICS: { key: MetricKey; label: string; color: string; format: 'currency' | 'number' }[] = [
  { key: 'faturamento', label: 'Faturamento', color: '#22c55e', format: 'currency' },
  { key: 'gastos', label: 'Gastos', color: '#ef4444', format: 'currency' },
  { key: 'lucro', label: 'Lucro', color: '#3b82f6', format: 'currency' },
  { key: 'clientes', label: 'Clientes', color: '#f59e0b', format: 'number' },
  { key: 'fatPorCliente', label: 'Fat/Cliente', color: '#10b981', format: 'currency' },
  { key: 'gastosPorCliente', label: 'Gasto/Cliente', color: '#f43f5e', format: 'currency' },
  { key: 'lucroPorCliente', label: 'Lucro/Cliente', color: '#6366f1', format: 'currency' },
];

const TOUR_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', 
  '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7', '#0ea5e9'
];

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const HistoricoChartsModal: React.FC<HistoricoChartsModalProps> = ({
  open,
  onOpenChange,
  tourData,
  selectedYear
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('lucro');
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'composed'>('composed');

  // Get unique tour names
  const uniqueTourNames = useMemo(() => {
    const names = new Set<string>();
    if (selectedYear === 2025) {
      HISTORICO_2025_DATA.forEach(t => {
        // Normalize name by removing suffixes like (EngenhARQ), (Cristiano), etc.
        const baseName = t.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
        names.add(baseName);
      });
    } else {
      tourData.forEach(m => m.tours.forEach((t: any) => names.add(t.name)));
    }
    return Array.from(names).sort();
  }, [tourData, selectedYear]);

  // Initialize selected tours
  React.useEffect(() => {
    if (selectedTours.length === 0 && uniqueTourNames.length > 0) {
      setSelectedTours(uniqueTourNames.slice(0, 5));
    }
  }, [uniqueTourNames]);

  // Aggregate data by tour name
  const aggregatedByTour = useMemo(() => {
    const data: Record<string, { 
      name: string; 
      totalFaturamento: number; 
      totalGastos: number; 
      totalLucro: number;
      totalClientes: number;
      count: number;
      tours: any[];
    }> = {};

    const sourceData = selectedYear === 2025 ? HISTORICO_2025_DATA : 
      tourData.flatMap(m => m.tours);

    sourceData.forEach((t: any) => {
      const baseName = t.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
      
      if (!data[baseName]) {
        data[baseName] = {
          name: baseName,
          totalFaturamento: 0,
          totalGastos: 0,
          totalLucro: 0,
          totalClientes: 0,
          count: 0,
          tours: []
        };
      }
      
      data[baseName].totalFaturamento += t.faturamento;
      data[baseName].totalGastos += t.gastos;
      data[baseName].totalLucro += t.lucro;
      data[baseName].totalClientes += t.clientes;
      data[baseName].count += 1;
      data[baseName].tours.push(t);
    });

    return Object.values(data).sort((a, b) => b.totalLucro - a.totalLucro);
  }, [tourData, selectedYear]);

  // Monthly comparison data for selected tours
  const monthlyComparisonData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthMap: Record<string, string> = {
      'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar', 'Abril': 'Abr',
      'Maio': 'Mai', 'Junho': 'Jun', 'Julho': 'Jul', 'Agosto': 'Ago',
      'Setembro': 'Set', 'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
    };

    return months.map(month => {
      const row: any = { month };
      
      selectedTours.forEach(tourName => {
        const tourData = aggregatedByTour.find(t => t.name === tourName);
        if (tourData) {
          const monthTours = tourData.tours.filter((t: any) => 
            monthMap[t.month] === month
          );
          
          if (monthTours.length > 0) {
            row[`${tourName}_faturamento`] = monthTours.reduce((s: number, t: any) => s + t.faturamento, 0);
            row[`${tourName}_gastos`] = monthTours.reduce((s: number, t: any) => s + t.gastos, 0);
            row[`${tourName}_lucro`] = monthTours.reduce((s: number, t: any) => s + t.lucro, 0);
            row[`${tourName}_clientes`] = monthTours.reduce((s: number, t: any) => s + t.clientes, 0);
          }
        }
      });
      
      return row;
    });
  }, [selectedTours, aggregatedByTour]);

  // Comparison bar chart data
  const comparisonChartData = useMemo(() => {
    return aggregatedByTour
      .filter(t => selectedTours.includes(t.name))
      .map(t => ({
        name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
        fullName: t.name,
        faturamento: t.totalFaturamento,
        gastos: t.totalGastos,
        lucro: t.totalLucro,
        clientes: t.totalClientes,
        fatPorCliente: t.totalClientes > 0 ? t.totalFaturamento / t.totalClientes : 0,
        gastosPorCliente: t.totalClientes > 0 ? t.totalGastos / t.totalClientes : 0,
        lucroPorCliente: t.totalClientes > 0 ? t.totalLucro / t.totalClientes : 0,
        realizacoes: t.count,
        margemLucro: t.totalFaturamento > 0 ? (t.totalLucro / t.totalFaturamento) * 100 : 0
      }));
  }, [aggregatedByTour, selectedTours]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return comparisonChartData.map((t, i) => ({
      name: t.name,
      value: t[selectedMetric] as number,
      color: TOUR_COLORS[i % TOUR_COLORS.length]
    }));
  }, [comparisonChartData, selectedMetric]);

  // Scatter data for efficiency analysis
  const scatterData = useMemo(() => {
    return comparisonChartData.map((t, i) => ({
      ...t,
      color: TOUR_COLORS[i % TOUR_COLORS.length]
    }));
  }, [comparisonChartData]);

  // Radar data
  const radarData = useMemo(() => {
    if (comparisonChartData.length === 0) return [];
    
    const maxValues = {
      faturamento: Math.max(...comparisonChartData.map(t => t.faturamento)),
      lucro: Math.max(...comparisonChartData.map(t => t.lucro)),
      clientes: Math.max(...comparisonChartData.map(t => t.clientes)),
      margemLucro: Math.max(...comparisonChartData.map(t => t.margemLucro)),
      realizacoes: Math.max(...comparisonChartData.map(t => t.realizacoes)),
    };

    return [
      { metric: 'Faturamento', ...Object.fromEntries(comparisonChartData.map(t => [t.fullName, (t.faturamento / maxValues.faturamento) * 100])) },
      { metric: 'Lucro', ...Object.fromEntries(comparisonChartData.map(t => [t.fullName, (t.lucro / maxValues.lucro) * 100])) },
      { metric: 'Clientes', ...Object.fromEntries(comparisonChartData.map(t => [t.fullName, (t.clientes / maxValues.clientes) * 100])) },
      { metric: 'Margem %', ...Object.fromEntries(comparisonChartData.map(t => [t.fullName, (t.margemLucro / maxValues.margemLucro) * 100])) },
      { metric: 'Realizações', ...Object.fromEntries(comparisonChartData.map(t => [t.fullName, (t.realizacoes / maxValues.realizacoes) * 100])) },
    ];
  }, [comparisonChartData]);

  const toggleTour = (tourName: string) => {
    setSelectedTours(prev => 
      prev.includes(tourName) 
        ? prev.filter(t => t !== tourName)
        : [...prev, tourName]
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: </span>
            <span className="font-medium">
              {entry.dataKey?.includes('clientes') || entry.dataKey === 'clientes'
                ? entry.value
                : formatCurrencyFull(entry.value)
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise Gráfica - Histórico {selectedYear}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[calc(90vh-100px)]">
          {/* Sidebar - Tour Selection */}
          <div className="w-64 border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Selecionar Trilhas</h3>
              <Badge variant="outline" className="text-xs">{selectedTours.length} selecionadas</Badge>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <div className="space-y-2">
                {uniqueTourNames.map(name => {
                  const tourInfo = aggregatedByTour.find(t => t.name === name);
                  return (
                    <div
                      key={name}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedTours.includes(name) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleTour(name)}
                    >
                      <Checkbox 
                        checked={selectedTours.includes(name)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={name}>{name}</p>
                        {tourInfo && (
                          <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                            <span>{tourInfo.count}x</span>
                            <span className="text-green-600">{formatCurrency(tourInfo.totalLucro)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="comparison" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="comparison" className="text-xs">Comparação</TabsTrigger>
                <TabsTrigger value="evolution" className="text-xs">Evolução Mensal</TabsTrigger>
                <TabsTrigger value="distribution" className="text-xs">Distribuição</TabsTrigger>
                <TabsTrigger value="efficiency" className="text-xs">Eficiência</TabsTrigger>
                <TabsTrigger value="radar" className="text-xs">Radar</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Comparison Tab */}
                <TabsContent value="comparison" className="m-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Métrica" />
                        </SelectTrigger>
                        <SelectContent>
                          {METRICS.map(m => (
                            <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex gap-1">
                        <Button 
                          variant={chartType === 'bar' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setChartType('bar')}
                        >
                          Barras
                        </Button>
                        <Button 
                          variant={chartType === 'composed' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setChartType('composed')}
                        >
                          Composto
                        </Button>
                      </div>
                    </div>

                    <Card>
                      <CardContent className="pt-4">
                        <ResponsiveContainer width="100%" height={400}>
                          {chartType === 'bar' ? (
                            <BarChart data={comparisonChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" tickFormatter={v => formatCurrency(v)} />
                              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar 
                                dataKey={selectedMetric} 
                                fill={METRICS.find(m => m.key === selectedMetric)?.color}
                                radius={[0, 4, 4, 0]}
                              />
                            </BarChart>
                          ) : (
                            <ComposedChart data={comparisonChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                              <YAxis yAxisId="left" tickFormatter={v => formatCurrency(v)} />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill="#22c55e" />
                              <Bar yAxisId="left" dataKey="gastos" name="Gastos" fill="#ef4444" />
                              <Bar yAxisId="left" dataKey="lucro" name="Lucro" fill="#3b82f6" />
                              <Line yAxisId="right" dataKey="margemLucro" name="Margem %" stroke="#8b5cf6" strokeWidth={2} />
                            </ComposedChart>
                          )}
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {comparisonChartData.slice(0, 4).map((tour, i) => (
                        <Card key={tour.fullName} className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TOUR_COLORS[i] }} />
                            <span className="text-xs font-medium truncate">{tour.name}</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lucro Total:</span>
                              <span className="font-bold text-green-600">{formatCurrency(tour.lucro)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Margem:</span>
                              <span className="font-medium">{tour.margemLucro.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Realizações:</span>
                              <span>{tour.realizacoes}x</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Evolution Tab */}
                <TabsContent value="evolution" className="m-0">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Evolução Mensal por Trilha</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 mb-4">
                        <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Métrica" />
                          </SelectTrigger>
                          <SelectContent>
                            {METRICS.map(m => (
                              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={monthlyComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={v => METRICS.find(m => m.key === selectedMetric)?.format === 'currency' ? formatCurrency(v) : v} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          {selectedTours.map((tour, i) => (
                            <Line
                              key={tour}
                              type="monotone"
                              dataKey={`${tour}_${selectedMetric}`}
                              name={tour.length > 20 ? tour.substring(0, 20) + '...' : tour}
                              stroke={TOUR_COLORS[i % TOUR_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Distribution Tab */}
                <TabsContent value="distribution" className="m-0">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Distribuição de {METRICS.find(m => m.key === selectedMetric)?.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
                          <SelectTrigger className="w-[180px] mb-4">
                            <SelectValue placeholder="Métrica" />
                          </SelectTrigger>
                          <SelectContent>
                            {METRICS.map(m => (
                              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieChartData.filter(d => d.value > 0)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrencyFull(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Ranking por {METRICS.find(m => m.key === selectedMetric)?.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[350px]">
                          <div className="space-y-2">
                            {comparisonChartData
                              .sort((a, b) => (b[selectedMetric] as number) - (a[selectedMetric] as number))
                              .map((tour, i) => (
                                <div key={tour.fullName} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{tour.fullName}</p>
                                  </div>
                                  <span className="text-xs font-bold">
                                    {METRICS.find(m => m.key === selectedMetric)?.format === 'currency'
                                      ? formatCurrencyFull(tour[selectedMetric] as number)
                                      : tour[selectedMetric]
                                    }
                                  </span>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Efficiency Tab */}
                <TabsContent value="efficiency" className="m-0">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Análise de Eficiência (Clientes vs Lucro por Cliente)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            dataKey="clientes" 
                            name="Clientes" 
                            label={{ value: 'Total de Clientes', position: 'bottom', offset: 0 }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="lucroPorCliente" 
                            name="Lucro/Cliente"
                            tickFormatter={v => formatCurrency(v)}
                            label={{ value: 'Lucro por Cliente', angle: -90, position: 'insideLeft' }}
                          />
                          <ZAxis type="number" dataKey="lucro" range={[100, 1000]} name="Lucro Total" />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload?.[0]) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
                                  <p className="font-bold mb-2">{data.fullName}</p>
                                  <div className="space-y-1">
                                    <p>Clientes: <span className="font-medium">{data.clientes}</span></p>
                                    <p>Lucro/Cliente: <span className="font-medium">{formatCurrencyFull(data.lucroPorCliente)}</span></p>
                                    <p>Lucro Total: <span className="font-medium text-green-600">{formatCurrencyFull(data.lucro)}</span></p>
                                    <p>Margem: <span className="font-medium">{data.margemLucro.toFixed(1)}%</span></p>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Scatter name="Trilhas" data={scatterData}>
                            {scatterData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        O tamanho do círculo representa o lucro total da trilha
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Radar Tab */}
                <TabsContent value="radar" className="m-0">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Comparação Multidimensional (Normalizada)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          {selectedTours.slice(0, 6).map((tour, i) => (
                            <Radar
                              key={tour}
                              name={tour.length > 15 ? tour.substring(0, 15) + '...' : tour}
                              dataKey={tour}
                              stroke={TOUR_COLORS[i % TOUR_COLORS.length]}
                              fill={TOUR_COLORS[i % TOUR_COLORS.length]}
                              fillOpacity={0.2}
                            />
                          ))}
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Valores normalizados (0-100) para comparação relativa entre trilhas
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoChartsModal;
