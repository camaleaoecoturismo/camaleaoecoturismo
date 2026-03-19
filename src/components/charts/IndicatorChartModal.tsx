import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, Legend, LabelList, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, LineChartIcon, AreaChartIcon, GitCompare, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import { BALANCO_2025_DATA, BALANCO_2025_TOTALS } from '@/data/balanco2025';
import { BALANCO_2024_DATA, BALANCO_2024_TOTALS } from '@/data/balanco2024';
import { BALANCO_2023_DATA, BALANCO_2023_TOTALS } from '@/data/balanco2023';

interface ChartDataPoint {
  month: string;
  value: number;
}

interface IndicatorChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  year: number;
  data: ChartDataPoint[];
  format: 'currency' | 'percent' | 'number';
  color?: string;
  indicatorKey?: string;
}

type ChartType = 'bar' | 'line' | 'area';
type ViewMode = 'single' | 'compare';

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Get data for a specific year
const getYearData = (year: number) => {
  if (year === 2025) return { data: BALANCO_2025_DATA, totals: BALANCO_2025_TOTALS };
  if (year === 2024) return { data: BALANCO_2024_DATA, totals: BALANCO_2024_TOTALS };
  if (year === 2023) return { data: BALANCO_2023_DATA, totals: BALANCO_2023_TOTALS };
  return null;
};

// Only include years with actual data
const AVAILABLE_YEARS = [2023, 2024, 2025];

// Colors for comparison - more distinct colors for multi-year comparison
const YEAR_COLORS: Record<number, string> = {
  2023: '#f59e0b',
  2024: '#3b82f6',
  2025: '#10b981',
  2026: '#8b5cf6'
};

// Get indicator value from month data
const getIndicatorValue = (monthData: any, key: string): number => {
  const mappings: Record<string, (d: any) => number> = {
    'faturamento': d => d.faturamento,
    'gastos_viagem': d => d.gastosViagem,
    'saldo_bruto': d => d.saldoBruto,
    'manutencao': d => d.manutencao,
    'ir': d => d.impostoRenda,
    'pro_labore': d => d.proLabore,
    'gastos_totais': d => d.gastosTotais,
    'saldo_liquido': d => d.saldoLiquido,
    'num_clientes': d => d.numClientes,
    'fat_pessoa': d => d.numClientes > 0 ? d.faturamento / d.numClientes : 0,
  };
  return mappings[key]?.(monthData) ?? monthData[key] ?? 0;
};

const IndicatorChartModal: React.FC<IndicatorChartModalProps> = ({
  open,
  onOpenChange,
  title,
  year,
  data,
  format,
  color = '#10b981',
  indicatorKey = 'faturamento'
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showTrend, setShowTrend] = useState(true);
  const [showAverage, setShowAverage] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedYears, setSelectedYears] = useState<number[]>([year]);

  // Toggle year selection
  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(yr => yr !== y));
      }
    } else {
      setSelectedYears([...selectedYears, y].sort((a, b) => a - b));
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const values = data.map(d => d.value).filter(v => v !== 0);
    if (values.length === 0) return { avg: 0, max: 0, min: 0, total: 0, trend: 0, trendPercent: 0, maxMonth: '', minMonth: '', growth: 0 };

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const total = values.reduce((a, b) => a + b, 0);

    const maxMonth = data.find(d => d.value === max)?.month || '';
    const minMonth = data.find(d => d.value === min)?.month || '';

    // Calculate trend (simple linear regression slope)
    const validData = data.filter(d => d.value !== 0);
    let trend = 0;
    let trendPercent = 0;
    if (validData.length >= 2) {
      const n = validData.length;
      const sumX = validData.reduce((acc, _, i) => acc + i, 0);
      const sumY = validData.reduce((acc, d) => acc + d.value, 0);
      const sumXY = validData.reduce((acc, d, i) => acc + i * d.value, 0);
      const sumX2 = validData.reduce((acc, _, i) => acc + i * i, 0);
      trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      trendPercent = avg > 0 ? (trend / avg) * 100 : 0;
    }

    // Calculate growth (first vs last non-zero value)
    const firstValue = validData[0]?.value || 0;
    const lastValue = validData[validData.length - 1]?.value || 0;
    const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return { avg, max, min, total, trend, trendPercent, maxMonth, minMonth, growth };
  }, [data]);

  // Calculate trend line data
  const chartDataWithExtras = useMemo(() => {
    const validData = data.filter(d => d.value !== 0);
    if (validData.length < 2) return data;

    const n = validData.length;
    const sumX = validData.reduce((acc, _, i) => acc + i, 0);
    const sumY = validData.reduce((acc, d) => acc + d.value, 0);
    const sumXY = validData.reduce((acc, d, i) => acc + i * d.value, 0);
    const sumX2 = validData.reduce((acc, _, i) => acc + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((d, i) => ({
      ...d,
      trend: showTrend ? intercept + slope * i : undefined
    }));
  }, [data, showTrend]);

  // Multi-year comparison data
  const comparisonData = useMemo(() => {
    if (viewMode !== 'compare' || selectedYears.length === 0) return [];

    return MONTH_ABBR.map((month, idx) => {
      const dataPoint: Record<string, any> = { month };
      selectedYears.forEach(y => {
        const yearData = getYearData(y);
        if (yearData) {
          dataPoint[y] = getIndicatorValue(yearData.data[idx], indicatorKey);
        }
      });
      return dataPoint;
    });
  }, [viewMode, selectedYears, indicatorKey]);

  // Format value based on type
  const formatValue = (value: number) => {
    if (format === 'currency') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  };

  // Compact format for axis and labels
  const formatCompact = (value: number) => {
    if (format === 'currency') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return value.toFixed(0);
    }
    if (format === 'percent') {
      return `${value.toFixed(0)}%`;
    }
    return value.toFixed(0);
  };

  // Custom label for all chart types
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!showValues || value === 0) return null;
    const xPos = width !== undefined ? x + width / 2 : x;
    return (
      <text
        x={xPos}
        y={y - 8}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
      >
        {formatCompact(value)}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-sm font-semibold text-foreground mb-2 border-b pb-1">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 mt-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Determine trend direction
  const getTrendIcon = () => {
    if (stats.trendPercent > 1) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (stats.trendPercent < -1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendLabel = () => {
    if (stats.trendPercent > 1) return `+${stats.trendPercent.toFixed(1)}%`;
    if (stats.trendPercent < -1) return `${stats.trendPercent.toFixed(1)}%`;
    return 'Estável';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {viewMode === 'compare' 
                  ? `Comparação: ${selectedYears.join(' vs ')}` 
                  : `Análise de ${year}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'single' && (
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  {getTrendIcon()}
                  <span className="text-sm font-medium">{getTrendLabel()}</span>
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none h-9 px-4 gap-2",
                viewMode === 'single' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => setViewMode('single')}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Único</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none h-9 px-4 gap-2 border-l",
                viewMode === 'compare' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => {
                setViewMode('compare');
                if (selectedYears.length < 2) {
                  const defaultYears = [2024, 2025].filter(y => y !== year);
                  setSelectedYears([year, ...defaultYears].slice(0, 3).sort((a, b) => a - b));
                }
              }}
            >
              <GitCompare className="h-4 w-4" />
              <span className="hidden sm:inline">Comparar Anos</span>
            </Button>
          </div>

          {viewMode === 'compare' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Anos:</span>
              {AVAILABLE_YEARS.filter(y => getYearData(y) !== null).map(y => (
                <label 
                  key={y} 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all text-sm font-medium border-2",
                    selectedYears.includes(y) 
                      ? "" 
                      : "bg-muted/50 hover:bg-muted border-transparent"
                  )}
                  style={{
                    backgroundColor: selectedYears.includes(y) ? `${YEAR_COLORS[y]}20` : undefined,
                    borderColor: selectedYears.includes(y) ? YEAR_COLORS[y] : 'transparent',
                    color: selectedYears.includes(y) ? YEAR_COLORS[y] : undefined
                  }}
                >
                  <Checkbox 
                    checked={selectedYears.includes(y)} 
                    onCheckedChange={() => toggleYear(y)}
                    className="hidden"
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: YEAR_COLORS[y] }}
                  />
                  {y}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
          <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCompact(stats.total)}</p>
          </div>
          <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Média</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCompact(stats.avg)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl p-4">
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Máximo</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCompact(stats.max)}</p>
            <p className="text-xs text-emerald-600/70 mt-0.5">{stats.maxMonth}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-xl p-4">
            <p className="text-xs text-red-600 uppercase tracking-wider font-medium">Mínimo</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCompact(stats.min)}</p>
            <p className="text-xs text-red-600/70 mt-0.5">{stats.minMonth}</p>
          </div>
          <div className={cn(
            "bg-gradient-to-br rounded-xl p-4",
            stats.growth >= 0 ? "from-blue-500/20 to-blue-500/5" : "from-orange-500/20 to-orange-500/5"
          )}>
            <p className={cn(
              "text-xs uppercase tracking-wider font-medium",
              stats.growth >= 0 ? "text-blue-600" : "text-orange-600"
            )}>Crescimento</p>
            <p className={cn(
              "text-xl font-bold mt-1",
              stats.growth >= 0 ? "text-blue-600" : "text-orange-600"
            )}>
              {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart Controls */}
        {viewMode === 'single' && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <div className="flex rounded-lg border overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none h-8 px-3",
                    chartType === 'bar' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => setChartType('bar')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none h-8 px-3 border-x",
                    chartType === 'line' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => setChartType('line')}
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none h-8 px-3",
                    chartType === 'area' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => setChartType('area')}
                >
                  <AreaChartIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-muted-foreground">Valores</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrend}
                  onChange={(e) => setShowTrend(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-muted-foreground">Tendência</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAverage}
                  onChange={(e) => setShowAverage(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-muted-foreground">Média</span>
              </label>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-[380px] w-full bg-muted/20 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'compare' ? (
              <BarChart data={comparisonData} margin={{ top: 35, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCompact}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                />
                {selectedYears.map((y, idx) => (
                  <Bar 
                    key={y}
                    dataKey={y} 
                    name={String(y)}
                    fill={YEAR_COLORS[y] || color} 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    {showValues && <LabelList dataKey={y} content={renderCustomLabel} />}
                  </Bar>
                ))}
              </BarChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartDataWithExtras} margin={{ top: 35, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCompact}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value"
                  name={title}
                  fill={color} 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                >
                  {showValues && <LabelList dataKey="value" content={renderCustomLabel} />}
                  {chartDataWithExtras.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value === stats.max ? '#10b981' : entry.value === stats.min ? '#ef4444' : color}
                    />
                  ))}
                </Bar>
                {showTrend && (
                  <Line 
                    type="linear" 
                    dataKey="trend" 
                    name="Tendência"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                )}
                {showAverage && (
                  <ReferenceLine 
                    y={stats.avg} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="4 4"
                    label={{ 
                      value: `Média: ${formatCompact(stats.avg)}`, 
                      position: 'insideTopRight',
                      fontSize: 11,
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 500
                    }}
                  />
                )}
              </BarChart>
            ) : chartType === 'line' ? (
              <ComposedChart data={chartDataWithExtras} margin={{ top: 35, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCompact}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value"
                  name={title}
                  stroke={color}
                  strokeWidth={3}
                  dot={{ fill: color, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                >
                  {showValues && <LabelList dataKey="value" content={renderCustomLabel} />}
                </Line>
                {showTrend && (
                  <Line 
                    type="linear" 
                    dataKey="trend"
                    name="Tendência"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                )}
                {showAverage && (
                  <ReferenceLine 
                    y={stats.avg} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="4 4"
                  />
                )}
              </ComposedChart>
            ) : (
              <ComposedChart data={chartDataWithExtras} margin={{ top: 35, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCompact}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value"
                  name={title}
                  stroke={color}
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                >
                  {showValues && <LabelList dataKey="value" content={renderCustomLabel} />}
                </Area>
                {showTrend && (
                  <Line 
                    type="linear" 
                    dataKey="trend"
                    name="Tendência"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                )}
                {showAverage && (
                  <ReferenceLine 
                    y={stats.avg} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="4 4"
                  />
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Monthly breakdown table */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold text-foreground mb-3">Detalhamento Mensal</p>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-12 gap-1 min-w-[600px]">
              {data.map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "text-center p-3 rounded-lg transition-all",
                    item.value > 0 
                      ? item.value === stats.max 
                        ? "bg-emerald-500/20 ring-1 ring-emerald-500/30" 
                        : item.value === stats.min 
                          ? "bg-red-500/20 ring-1 ring-red-500/30"
                          : "bg-muted/60 hover:bg-muted" 
                      : "bg-muted/20"
                  )}
                >
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">{item.month}</p>
                  <p className={cn(
                    "text-sm font-bold mt-1",
                    item.value > 0 
                      ? item.value === stats.max 
                        ? "text-emerald-600" 
                        : item.value === stats.min 
                          ? "text-red-600" 
                          : "text-foreground"
                      : "text-muted-foreground"
                  )}>
                    {item.value > 0 ? formatCompact(item.value) : '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndicatorChartModal;
