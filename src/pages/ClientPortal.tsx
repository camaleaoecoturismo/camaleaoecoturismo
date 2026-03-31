import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Home, User, MapPin, LogOut, Loader2,
  Calendar, DollarSign, Mountain, ChevronRight,
  Ticket, Clock, AlertCircle, Star, Bell,
} from 'lucide-react';
import logo from '@/assets/logo-lado-roxo.png';
import ClientProfile from '@/components/client-portal/ClientProfile';
import ClientExperiences from '@/components/client-portal/ClientExperiences';
import ClientTickets from '@/components/client-portal/ClientTickets';
import ClientPayments from '@/components/client-portal/ClientPayments';
import ClientPoints from '@/components/client-portal/ClientPoints';
import ClientBadges from '@/components/client-portal/ClientBadges';
import ClientCommunications from '@/components/client-portal/ClientCommunications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientData {
  id: string;
  cliente_id: string;
  total_points: number;
  cliente: {
    id: string;
    nome_completo: string;
    cpf: string;
    email: string;
    whatsapp: string;
    data_nascimento: string;
  };
  level: {
    name: string;
    icon: string;
    color: string;
    benefits: string;
  } | null;
}

interface Stats {
  totalViagens: number;
  totalGasto: number;
  proximaViagem: { name: string; date: string } | null;
  viagensConfirmadas: number;
}

type Tab = 'inicio' | 'viagens' | 'tickets' | 'conquistas' | 'pagamentos' | 'comunicacoes' | 'perfil';

// ─── Dashboard Section ────────────────────────────────────────────────────────

function DashboardSection({
  clientData,
  onNavigate,
}: {
  clientData: ClientData;
  onNavigate: (tab: Tab) => void;
}) {
  const [stats, setStats] = useState<Stats>({
    totalViagens: 0,
    totalGasto: 0,
    proximaViagem: null,
    viagensConfirmadas: 0,
  });
  const [recentReservas, setRecentReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reservas')
        .select(`
          id, status, payment_status, valor_pago,
          tours!reservas_tour_id_fkey (name, start_date, image_url)
        `)
        .eq('cliente_id', clientData.cliente_id)
        .neq('status', 'cancelada')
        .order('created_at', { ascending: false });

      if (data) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const futuras = data
          .filter((r: any) => r.tours?.start_date && new Date(r.tours.start_date + 'T12:00:00') >= today)
          .sort((a: any, b: any) => new Date(a.tours.start_date).getTime() - new Date(b.tours.start_date).getTime());

        setStats({
          totalViagens: data.length,
          totalGasto: data.reduce((s: number, r: any) => s + (r.valor_pago || 0), 0),
          proximaViagem: futuras[0]
            ? { name: futuras[0].tours?.name, date: futuras[0].tours?.start_date }
            : null,
          viagensConfirmadas: data.filter((r: any) => r.payment_status === 'pago').length,
        });
        setRecentReservas(data.slice(0, 3));
      }
      setLoading(false);
    };
    load();
  }, [clientData.cliente_id]);

  const paymentBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pago:     { label: 'Pago',     cls: 'bg-green-100 text-green-700' },
      approved: { label: 'Pago',     cls: 'bg-green-100 text-green-700' },
      pending:  { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
      parcial:  { label: 'Parcial',  cls: 'bg-blue-100 text-blue-700' },
    };
    const item = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' };
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.cls}`}>{item.label}</span>;
  };

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
  };

  const firstName = clientData.cliente.nome_completo.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <p className="text-muted-foreground text-sm">Olá,</p>
        <h2 className="text-2xl font-bold text-foreground">{firstName} 👋</h2>
        {clientData.level && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-lg">{clientData.level.icon}</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: clientData.level.color + '20', color: clientData.level.color }}
            >
              {clientData.level.name}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mountain className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Viagens</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalViagens}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.viagensConfirmadas} confirmada{stats.viagensConfirmadas !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total Investido</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">em aventuras</p>
          </div>
        </div>
      )}

      {/* Próxima viagem */}
      {stats.proximaViagem && (
        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onNavigate('viagens')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Próxima viagem</span>
          </div>
          <p className="font-semibold text-foreground">{stats.proximaViagem.name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(stats.proximaViagem.date)}
          </p>
        </div>
      )}

      {/* Reservas recentes */}
      {recentReservas.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Reservas recentes</h3>
            <button
              onClick={() => onNavigate('viagens')}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Ver todas <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentReservas.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                {r.tours?.image_url ? (
                  <img src={r.tours.image_url} alt={r.tours?.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{r.tours?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.tours?.start_date && (
                      <span className="text-xs text-muted-foreground">{formatDate(r.tours.start_date)}</span>
                    )}
                    {paymentBadge(r.payment_status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('tickets')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <Ticket className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Meus Ingressos</span>
          <span className="text-xs text-muted-foreground">Acesse seus tickets</span>
        </button>
        <button
          onClick={() => onNavigate('conquistas')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <Star className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Conquistas</span>
          <span className="text-xs text-muted-foreground">Pontos e selos</span>
        </button>
        <button
          onClick={() => onNavigate('pagamentos')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Pagamentos</span>
          <span className="text-xs text-muted-foreground">Histórico financeiro</span>
        </button>
        <button
          onClick={() => onNavigate('comunicacoes')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <Bell className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Mensagens</span>
          <span className="text-xs text-muted-foreground">Avisos e novidades</span>
        </button>
      </section>
    </div>
  );
}

// ─── Conquistas Section (Pontos + Badges unificados) ─────────────────────────

function ConquistasSection({ clientData }: { clientData: ClientData }) {
  return (
    <div className="space-y-6">
      <ClientPoints
        clientAccountId={clientData.id}
        totalPoints={clientData.total_points}
        level={clientData.level}
      />
      <ClientBadges clientAccountId={clientData.id} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ClientPortal = () => {
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  useEffect(() => {
    checkAuthAndLoad();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !navigatingRef.current) {
        navigatingRef.current = true;
        navigate('/cliente', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigatingRef.current = true;
      navigate('/cliente', { replace: true });
      return;
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (adminRole) {
      navigatingRef.current = true;
      navigate('/cliente', { replace: true });
      return;
    }

    const { data: clientAccount, error } = await supabase
      .from('client_accounts')
      .select(`
        id, cliente_id, total_points,
        clientes!client_accounts_cliente_id_fkey (
          id, nome_completo, cpf, email, whatsapp, data_nascimento
        )
      `)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (!clientAccount) {
      navigatingRef.current = true;
      navigate('/cliente', { replace: true });
      return;
    }

    const { data: levelData } = await supabase
      .rpc('get_client_level', { total_points: clientAccount.total_points });

    const level = levelData?.length > 0 ? {
      name: levelData[0].level_name,
      icon: levelData[0].level_icon,
      color: levelData[0].level_color,
      benefits: levelData[0].level_benefits,
    } : null;

    setClientData({
      id: clientAccount.id,
      cliente_id: clientAccount.cliente_id,
      total_points: clientAccount.total_points,
      cliente: clientAccount.clientes as any,
      level,
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    navigatingRef.current = true;
    await supabase.auth.signOut();
    navigate('/cliente', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">Erro ao carregar sua conta</p>
          <p className="text-sm text-muted-foreground mt-1">Verifique sua conexão e tente novamente.</p>
        </div>
        <Button onClick={() => { setLoadError(false); setLoading(true); checkAuthAndLoad(); }} variant="outline" size="sm">
          Tentar novamente
        </Button>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:underline">Sair</button>
      </div>
    );
  }

  if (!clientData) return null;

  // Sidebar nav items (all tabs)
  const sidebarItems: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'inicio',       label: 'Início',      icon: Home },
    { id: 'viagens',      label: 'Viagens',     icon: MapPin },
    { id: 'tickets',      label: 'Ingressos',   icon: Ticket },
    { id: 'conquistas',   label: 'Conquistas',  icon: Star },
    { id: 'pagamentos',   label: 'Pagamentos',  icon: DollarSign },
    { id: 'comunicacoes', label: 'Mensagens',   icon: Bell },
    { id: 'perfil',       label: 'Perfil',      icon: User },
  ];

  // Mobile bottom nav (5 most important)
  const mobileNavItems = sidebarItems.filter(t =>
    ['inicio', 'viagens', 'tickets', 'conquistas', 'perfil'].includes(t.id)
  );

  const sectionTitle: Record<Tab, string> = {
    inicio:       'Início',
    viagens:      'Minhas Viagens',
    tickets:      'Meus Ingressos',
    conquistas:   'Conquistas',
    pagamentos:   'Pagamentos',
    comunicacoes: 'Mensagens',
    perfil:       'Meu Perfil',
  };

  return (
    <div className="flex min-h-screen bg-muted/30">

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-background sticky top-0 h-screen shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <img src={logo} alt="Camaleão" className="h-8 object-contain" />
        </div>

        {/* Client info */}
        <div className="px-5 py-4 border-b border-border">
          <p className="font-semibold text-foreground text-sm leading-tight">
            {clientData.cliente.nome_completo.split(' ')[0]}
          </p>
          {clientData.level ? (
            <span
              className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: clientData.level.color + '20', color: clientData.level.color }}
            >
              {clientData.level.icon} {clientData.level.name}
            </span>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Minha Conta</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Camaleão" className="h-8 object-contain" />
              <div>
                <p className="text-xs text-muted-foreground leading-none">Minha Conta</p>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {clientData.cliente.nome_completo.split(' ')[0]}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-6 pb-28 md:pb-8">
          {activeTab !== 'inicio' && (
            <h2 className="text-xl font-bold text-foreground mb-6">{sectionTitle[activeTab]}</h2>
          )}

          {activeTab === 'inicio' && (
            <DashboardSection clientData={clientData} onNavigate={setActiveTab} />
          )}
          {activeTab === 'viagens' && (
            <ClientExperiences clienteId={clientData.cliente_id} />
          )}
          {activeTab === 'tickets' && (
            <ClientTickets cpf={clientData.cliente.cpf} />
          )}
          {activeTab === 'conquistas' && (
            <ConquistasSection clientData={clientData} />
          )}
          {activeTab === 'pagamentos' && (
            <ClientPayments clienteId={clientData.cliente_id} />
          )}
          {activeTab === 'comunicacoes' && (
            <ClientCommunications clientAccountId={clientData.id} />
          )}
          {activeTab === 'perfil' && (
            <ClientProfile clientData={clientData} />
          )}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
          <div className="flex">
            {mobileNavItems.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors relative ${
                  activeTab === t.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {activeTab === t.id && (
                  <span className="absolute top-0 inset-x-0 h-0.5 bg-primary rounded-full" />
                )}
                <t.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default ClientPortal;
