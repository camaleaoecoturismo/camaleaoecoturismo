import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, Calendar, TrendingUp, Baby, UserCheck, Clock, Gift, PartyPopper, Phone, Mail, Copy, Check } from "lucide-react";
import { differenceInYears, format, parseISO, getMonth, getYear, setYear, differenceInDays, isSameDay, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { formatarTelefone } from "@/lib/utils";

interface Cliente {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  created_at: string;
}

interface ClientesAnalyticsProps {
  clientes: Cliente[];
}

interface UpcomingBirthday {
  cliente: Cliente;
  birthdayThisYear: Date;
  age: number;
  daysUntil: number;
}

const COLORS = ['#820AD1', '#00C26A', '#F9C74F', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

export function ClientesAnalytics({ clientes }: ClientesAnalyticsProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const analytics = useMemo(() => {
    const today = new Date();
    const currentYear = getYear(today);
    
    // Calcular idades
    const ages = clientes
      .filter(c => c.data_nascimento)
      .map(c => {
        try {
          return differenceInYears(today, parseISO(c.data_nascimento));
        } catch {
          return null;
        }
      })
      .filter((age): age is number => age !== null && age >= 0 && age < 120);

    // Distribuição por faixa etária
    const ageGroups = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0
    };

    ages.forEach(age => {
      if (age < 18) ageGroups['0-17']++;
      else if (age <= 25) ageGroups['18-25']++;
      else if (age <= 35) ageGroups['26-35']++;
      else if (age <= 45) ageGroups['36-45']++;
      else if (age <= 55) ageGroups['46-55']++;
      else if (age <= 65) ageGroups['56-65']++;
      else ageGroups['65+']++;
    });

    const ageDistribution = Object.entries(ageGroups).map(([name, value]) => ({
      name,
      value,
      percentage: ages.length > 0 ? ((value / ages.length) * 100).toFixed(1) : '0'
    }));

    // Estatísticas de idade
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const minAge = ages.length > 0 ? Math.min(...ages) : 0;
    const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
    const medianAge = ages.length > 0 ? ages.sort((a, b) => a - b)[Math.floor(ages.length / 2)] : 0;

    // Cadastros por mês
    const cadastrosPorMes: Record<string, number> = {};
    clientes.forEach(c => {
      if (c.created_at) {
        try {
          const date = parseISO(c.created_at);
          const key = format(date, 'MMM/yyyy', { locale: ptBR });
          cadastrosPorMes[key] = (cadastrosPorMes[key] || 0) + 1;
        } catch {}
      }
    });

    // Ordenar por data
    const cadastrosTrend = Object.entries(cadastrosPorMes)
      .map(([name, value]) => ({ name, value }))
      .slice(-12); // Últimos 12 meses

    // Aniversariantes por mês
    const birthdaysByMonth = Array(12).fill(0);
    clientes.forEach(c => {
      if (c.data_nascimento) {
        try {
          const month = getMonth(parseISO(c.data_nascimento));
          birthdaysByMonth[month]++;
        } catch {}
      }
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const birthdaysData = monthNames.map((name, index) => ({
      name,
      value: birthdaysByMonth[index]
    }));

    // Década de nascimento
    const decadeGroups: Record<string, number> = {};
    clientes.forEach(c => {
      if (c.data_nascimento) {
        try {
          const year = getYear(parseISO(c.data_nascimento));
          const decade = Math.floor(year / 10) * 10;
          const key = `${decade}s`;
          decadeGroups[key] = (decadeGroups[key] || 0) + 1;
        } catch {}
      }
    });

    const decadeData = Object.entries(decadeGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));

    // Próximos aniversariantes (próximos 30 dias)
    const upcomingBirthdays: UpcomingBirthday[] = [];
    const todaysBirthdays: UpcomingBirthday[] = [];
    
    clientes.forEach(cliente => {
      if (!cliente.data_nascimento) return;
      try {
        const birthDate = parseISO(cliente.data_nascimento);
        let birthdayThisYear = setYear(birthDate, currentYear);
        
        // Se o aniversário já passou este ano, considerar o próximo ano
        if (isBefore(birthdayThisYear, today) && !isSameDay(birthdayThisYear, today)) {
          birthdayThisYear = setYear(birthDate, currentYear + 1);
        }
        
        const daysUntil = differenceInDays(birthdayThisYear, today);
        const age = differenceInYears(birthdayThisYear, birthDate);
        
        if (isSameDay(birthdayThisYear, today)) {
          todaysBirthdays.push({ cliente, birthdayThisYear, age, daysUntil: 0 });
        } else if (daysUntil > 0 && daysUntil <= 30) {
          upcomingBirthdays.push({ cliente, birthdayThisYear, age, daysUntil });
        }
      } catch {}
    });

    // Ordenar por dias até o aniversário
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    // Aniversariantes do mês atual
    const currentMonth = getMonth(today);
    const birthdaysThisMonth = clientes.filter(c => {
      if (!c.data_nascimento) return false;
      try {
        return getMonth(parseISO(c.data_nascimento)) === currentMonth;
      } catch {
        return false;
      }
    }).length;

    return {
      total: clientes.length,
      avgAge,
      minAge,
      maxAge,
      medianAge,
      ageDistribution,
      cadastrosTrend,
      birthdaysData,
      decadeData,
      validAgesCount: ages.length,
      upcomingBirthdays,
      todaysBirthdays,
      birthdaysThisMonth
    };
  }, [clientes]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copiado!",
      description: "Número copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name.split(' ')[0]}! 🎂 Feliz aniversário! A Camaleão Ecoturismo deseja a você um dia incrível e cheio de alegria! 🎉`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Idade Média</p>
                <p className="text-2xl font-bold">{analytics.avgAge} anos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Mediana</p>
                <p className="text-2xl font-bold">{analytics.medianAge} anos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Mais Novo</p>
                <p className="text-2xl font-bold">{analytics.minAge} anos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Mais Velho</p>
                <p className="text-2xl font-bold">{analytics.maxAge} anos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Com Idade Válida</p>
                <p className="text-2xl font-bold">{analytics.validAgesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Aniversariantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aniversariantes de Hoje */}
        <Card className={analytics.todaysBirthdays.length > 0 ? "border-2 border-yellow-400 bg-yellow-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-yellow-500" />
              Aniversariantes de Hoje
              {analytics.todaysBirthdays.length > 0 && (
                <Badge className="bg-yellow-500 text-white ml-2">{analytics.todaysBirthdays.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.todaysBirthdays.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum aniversariante hoje.</p>
            ) : (
              <div className="space-y-3">
                {analytics.todaysBirthdays.map(({ cliente, age }) => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <p className="font-medium">{cliente.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">
                        Completa <span className="font-semibold text-primary">{age} anos</span> hoje!
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cliente.whatsapp, cliente.id)}
                        title="Copiar número"
                      >
                        {copiedId === cliente.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => openWhatsApp(cliente.whatsapp, cliente.nome_completo)}
                        title="Enviar parabéns"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Parabéns
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Aniversariantes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Próximos Aniversariantes (30 dias)
              <Badge variant="secondary" className="ml-2">{analytics.upcomingBirthdays.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.upcomingBirthdays.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum aniversariante nos próximos 30 dias.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {analytics.upcomingBirthdays.slice(0, 15).map(({ cliente, birthdayThisYear, age, daysUntil }) => (
                  <div key={cliente.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cliente.nome_completo}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{format(birthdayThisYear, "dd 'de' MMMM", { locale: ptBR })}</span>
                        <span>•</span>
                        <span>{age} anos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={daysUntil <= 3 ? "destructive" : daysUntil <= 7 ? "default" : "secondary"}
                        className="whitespace-nowrap"
                      >
                        {daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(cliente.whatsapp, cliente.id)}
                        title="Copiar WhatsApp"
                      >
                        {copiedId === cliente.id ? <Check className="h-4 w-4 text-green-500" /> : <Phone className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
                {analytics.upcomingBirthdays.length > 15 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{analytics.upcomingBirthdays.length - 15} aniversariantes
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card resumo aniversariantes do mês */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aniversariantes este mês</p>
                <p className="text-2xl font-bold">{analytics.birthdaysThisMonth} clientes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Aniversariantes hoje</p>
              <p className="text-2xl font-bold text-yellow-500">{analytics.todaysBirthdays.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
              <p className="text-2xl font-bold text-primary">
                {analytics.upcomingBirthdays.filter(b => b.daysUntil <= 7).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Faixa Etária - Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, 'Clientes']}
                  labelFormatter={(label) => `Faixa: ${label}`}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Faixa Etária - Pizza */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proporção por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.ageDistribution.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Clientes']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Aniversariantes por Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aniversariantes por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.birthdaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => [value, 'Aniversariantes']} />
                <Bar dataKey="value" fill="#00C26A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Década de Nascimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clientes por Década de Nascimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.decadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => [value, 'Clientes']} />
                <Bar dataKey="value" fill="#F9C74F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendência de Cadastros */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Cadastros por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.cadastrosTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => [value, 'Novos Cadastros']} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Faixas Etárias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento por Faixa Etária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Faixa Etária</th>
                  <th className="text-right py-2 px-4">Quantidade</th>
                  <th className="text-right py-2 px-4">Percentual</th>
                  <th className="text-left py-2 px-4">Representação</th>
                </tr>
              </thead>
              <tbody>
                {analytics.ageDistribution.map((row, index) => (
                  <tr key={row.name} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4 font-medium">{row.name} anos</td>
                    <td className="py-2 px-4 text-right">{row.value}</td>
                    <td className="py-2 px-4 text-right">{row.percentage}%</td>
                    <td className="py-2 px-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${row.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }} 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
