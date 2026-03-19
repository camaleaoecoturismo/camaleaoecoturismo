import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Download, Search, Loader2, CheckCircle, XCircle, Users, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, startOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Tooltip } from 'recharts';

interface InteressadoWithTour {
  id: string;
  nome: string;
  whatsapp: string;
  origem: string;
  created_at: string;
  aceite_novidades: boolean;
  passeio_id: string;
  tour_name: string | null;
}

export function InteressadosGlobalList() {
  const [interessados, setInteressados] = useState<InteressadoWithTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNovidades, setFilterNovidades] = useState<'all' | 'yes' | 'no'>('all');
  const { toast } = useToast();

  const fetchInteressados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interessados')
        .select(`
          *,
          tours:passeio_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData: InteressadoWithTour[] = (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        whatsapp: item.whatsapp,
        origem: item.origem,
        created_at: item.created_at,
        aceite_novidades: item.aceite_novidades || false,
        passeio_id: item.passeio_id,
        tour_name: item.tours?.name || 'Passeio não encontrado',
      }));
      
      setInteressados(formattedData);
    } catch (error) {
      console.error('Error fetching interessados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os interessados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteressados();
  }, []);

  // ---- Computed analytics ----
  const analytics = useMemo(() => {
    if (!interessados.length) return null;

    const totalAceite = interessados.filter(i => i.aceite_novidades).length;
    const aceitePercent = Math.round((totalAceite / interessados.length) * 100);

    // By tour
    const byTour: Record<string, number> = {};
    interessados.forEach(i => {
      const name = i.tour_name || 'Desconhecido';
      byTour[name] = (byTour[name] || 0) + 1;
    });
    const tourData = Object.entries(byTour)
      .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 22) + '...' : name, total: count, fullName: name }))
      .sort((a, b) => b.total - a.total);

    // By month
    const byMonth: Record<string, number> = {};
    interessados.forEach(i => {
      const key = format(parseISO(i.created_at), 'yyyy-MM');
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        return { month: format(new Date(+y, +m - 1), 'MMM/yy', { locale: ptBR }), total: count };
      });

    // By week (last 12 weeks)
    const now = new Date();
    const twelveWeeksAgo = subDays(now, 84);
    const weeklyMap: Record<string, number> = {};
    interessados.forEach(i => {
      const d = parseISO(i.created_at);
      if (d >= twelveWeeksAgo) {
        const wk = format(startOfWeek(d, { weekStartsOn: 1 }), 'dd/MM');
        weeklyMap[wk] = (weeklyMap[wk] || 0) + 1;
      }
    });
    const weeklyData = Object.entries(weeklyMap)
      .map(([week, total]) => ({ week, total }));

    // Aceite pie
    const aceitePie = [
      { name: 'Aceitam', value: totalAceite },
      { name: 'Não aceitam', value: interessados.length - totalAceite },
    ];

    // Last 30 days count
    const thirtyDaysAgo = subDays(now, 30);
    const last30 = interessados.filter(i => parseISO(i.created_at) >= thirtyDaysAgo).length;

    // Last 7 days count
    const sevenDaysAgo = subDays(now, 7);
    const last7 = interessados.filter(i => parseISO(i.created_at) >= sevenDaysAgo).length;

    // Origem breakdown
    const byOrigem: Record<string, number> = {};
    interessados.forEach(i => {
      const o = i.origem || 'Direto';
      byOrigem[o] = (byOrigem[o] || 0) + 1;
    });
    const origemData = Object.entries(byOrigem)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Daily chart for current month (like reference image)
    const currentMonth = new Date();
    const daysInMonth = getDaysInMonth(currentMonth);
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth();
    const dailyMap: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) dailyMap[d] = 0;
    interessados.forEach(i => {
      const d = parseISO(i.created_at);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonthNum) {
        dailyMap[d.getDate()] = (dailyMap[d.getDate()] || 0) + 1;
      }
    });
    const dailyData = Object.entries(dailyMap)
      .map(([day, total]) => ({ day: Number(day), total }))
      .sort((a, b) => a.day - b.day);
    const currentMonthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

    return { totalAceite, aceitePercent, tourData, monthData, weeklyData, aceitePie, last30, last7, origemData, dailyData, currentMonthLabel };
  }, [interessados]);

  const filteredInteressados = interessados.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.whatsapp.includes(searchTerm) ||
      (item.tour_name && item.tour_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterNovidades === 'all' || 
      (filterNovidades === 'yes' && item.aceite_novidades) ||
      (filterNovidades === 'no' && !item.aceite_novidades);
    
    return matchesSearch && matchesFilter;
  });

  const formatWhatsApp = (phone: string) => {
    if (phone.startsWith('+55') && phone.length >= 13) {
      const digits = phone.replace(/\D/g, '');
      const ddd = digits.substring(2, 4);
      const firstPart = digits.substring(4, 9);
      const secondPart = digits.substring(9);
      return `(${ddd}) ${firstPart}-${secondPart}`;
    }
    return phone;
  };

  const handleWhatsApp = (whatsapp: string, nome: string) => {
    const message = `Olá ${nome}! Tudo bem?`;
    const cleanPhone = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const exportToCSV = () => {
    if (interessados.length === 0) {
      toast({ title: 'Nenhum dado', description: 'Não há interessados para exportar.', variant: 'destructive' });
      return;
    }
    const headers = ['Nome', 'WhatsApp', 'Passeio de Origem', 'Data de Acesso', 'Aceita Novidades'];
    const rows = interessados.map(item => [
      item.nome, item.whatsapp, item.tour_name || '',
      format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      item.aceite_novidades ? 'Sim' : 'Não',
    ]);
    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interessados_todos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado', description: `${interessados.length} interessados exportados com sucesso.` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];
  const BAR_COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="lista">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Interessados ({interessados.length})</h2>
          </div>
          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-1" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="lista">
              <Users className="w-4 h-4 mr-1" />
              Lista
            </TabsTrigger>
          </TabsList>
        </div>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {analytics && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Interessados</p>
                    <p className="text-2xl font-bold mt-1">{interessados.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium">Últimos 30 dias</p>
                    <p className="text-2xl font-bold mt-1">{analytics.last30}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium">Últimos 7 dias</p>
                    <p className="text-2xl font-bold mt-1">{analytics.last7}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium">Aceitam Novidades</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{analytics.aceitePercent}%</p>
                    <p className="text-xs text-muted-foreground">{analytics.totalAceite} de {interessados.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Daily chart - current month */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Gráfico Diário – {analytics.currentMonthLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [value, 'Interessados']}
                          labelFormatter={(label) => `Dia ${label}`}
                        />
                        <Area type="monotone" dataKey="total" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Evolution by month */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Evolução Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.monthData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                          <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: number) => [value, 'Interessados']}
                          />
                          <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* By tour */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Por Passeio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.tourData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} className="fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: number) => [value, 'Interessados']}
                          />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                            {analytics.tourData.map((_, i) => (
                              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aceite novidades pie */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      Aceite de Novidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.aceitePie}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="hsl(var(--muted-foreground))" />
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly trend */}
                {analytics.weeklyData.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tendência Semanal (12 semanas)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="week" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                              formatter={(value: number) => [value, 'Interessados']}
                            />
                            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Origem */}
              {analytics.origemData.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Por Origem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {analytics.origemData.map((o) => (
                        <div key={o.name} className="flex items-center justify-between border rounded-lg px-3 py-2">
                          <span className="text-sm truncate">{o.name}</span>
                          <Badge variant="secondary" className="ml-2 shrink-0">{o.total}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* LISTA TAB */}
        <TabsContent value="lista" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nome, WhatsApp ou passeio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-1">
                  <Button variant={filterNovidades === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterNovidades('all')}>Todos</Button>
                  <Button variant={filterNovidades === 'yes' ? 'default' : 'outline'} size="sm" onClick={() => setFilterNovidades('yes')} className={filterNovidades === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Aceitam
                  </Button>
                  <Button variant={filterNovidades === 'no' ? 'default' : 'outline'} size="sm" onClick={() => setFilterNovidades('no')}>
                    <XCircle className="w-3 h-3 mr-1" /> Não aceitam
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={interessados.length === 0}>
                  <Download className="w-4 h-4 mr-2" /> Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInteressados.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Nenhum interessado encontrado.' : 'Nenhum interessado registrado ainda.'}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Nome</TableHead>
                          <TableHead className="font-semibold">WhatsApp</TableHead>
                          <TableHead className="font-semibold">Passeio de Origem</TableHead>
                          <TableHead className="font-semibold">Data de Acesso</TableHead>
                          <TableHead className="font-semibold text-center">Aceita Novidades</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInteressados.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell>
                              <button onClick={() => handleWhatsApp(item.whatsapp, item.nome)} className="flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline">
                                <MessageCircle className="w-4 h-4" />
                                {formatWhatsApp(item.whatsapp)}
                              </button>
                            </TableCell>
                            <TableCell><span className="text-sm">{item.tour_name}</span></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.aceite_novidades ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Sim</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Não</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
