import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { ClientesCadastro } from "@/components/ClientesCadastro";
import TourManagementTab from "@/components/TourManagementTab";
import { FuncionalidadesTab } from "@/components/FuncionalidadesTab";

import TaskPanel from "@/components/TaskPanel";
import FinanceiroTab from "@/components/FinanceiroTab";
import ClientReportsTab from "@/components/admin/ClientReportsTab";
import FormQuestionsManagement from "@/components/FormQuestionsManagement";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AnalyticsModule from "@/components/analytics/AnalyticsModule";
import { ContentPlanningModule } from "@/components/content";
import { LandingPagesModule } from "@/components/pages";
import { ShopModule } from "@/components/shop";
import { JourneyModule } from "@/components/journey";
import ExportToursModule from "@/components/ExportToursModule";
import ExperienceProcessMap from "@/components/experience-map/ExperienceProcessMap";
import AdminGuias from "@/components/admin/AdminGuias";
import AdminPaginasInstitucional from "@/components/admin/AdminPaginasInstitucional";
import AdminDepoimentos from "@/components/admin/AdminDepoimentos";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";

interface CalendarOnlyTour {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

const Admin = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [calendarOnlyTours, setCalendarOnlyTours] = useState<CalendarOnlyTour[]>([]);
  const [totalReservas, setTotalReservas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gestao-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchTours();
    fetchCalendarOnlyTours();
    fetchTotalReservas();

    // Set up real-time subscription for tours
    const toursChannel = supabase
      .channel('admin-tours-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours'
        },
        () => {
          console.log('Tours updated, refetching...');
          fetchTours();
        }
      )
      .subscribe();

    // Set up real-time subscription for reservas
    const reservasChannel = supabase
      .channel('admin-reservas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas'
        },
        () => {
          console.log('Reservas updated, refetching...');
          fetchTotalReservas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(toursChannel);
      supabase.removeChannel(reservasChannel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      navigate('/auth');
      return;
    }

    try {
      const { data: userRole, error } = await supabase.rpc('get_current_user_role');
      if (error || userRole !== 'admin') {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive"
        });
        setLoading(false);
        navigate('/auth');
        return;
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível verificar suas permissões.",
        variant: "destructive"
      });
      setLoading(false);
      navigate('/auth');
    }
  };

  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select(`*, pricing_options:tour_pricing_options(*)`)
        .order('start_date', { ascending: true });
      if (error) throw error;
      const toursWithTypedPaymentMode = (data || []).map(tour => ({
        ...tour,
        payment_mode: (tour.payment_mode || 'whatsapp') as 'whatsapp' | 'mercadopago' | 'both'
      }));
      setTours(toursWithTypedPaymentMode);
    } catch (error) {
      console.error('Error fetching tours:', error);
      toast({
        title: "Erro ao carregar passeios",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarOnlyTours = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_only_tours')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      setCalendarOnlyTours(data || []);
    } catch (error) {
      console.error('Error fetching calendar only tours:', error);
    }
  };

  const allToursForManagement = React.useMemo(() => {
    const calendarToursAsTours: Tour[] = calendarOnlyTours.map(cot => {
      const startDate = new Date(cot.start_date + 'T12:00:00');
      const monthName = startDate.toLocaleDateString('pt-BR', { month: 'long' });
      return {
        id: cot.id,
        name: cot.name,
        city: 'Exclusivo',
        state: '-',
        start_date: cot.start_date,
        end_date: cot.end_date,
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        image_url: null,
        about: cot.description,
        itinerary: null,
        includes: null,
        not_includes: null,
        departures: null,
        what_to_bring: null,
        policy: null,
        pdf_file_path: null,
        buy_url: null,
        link_pagamento: null,
        whatsapp_group_link: null,
        etiqueta: 'Exclusivo',
        is_active: true,
        is_exclusive: true,
        is_featured: false,
        pro_labore: 0,
        gastos_viagem: 0,
        gastos_manutencao: 0,
        imposto_renda: 0,
        valor_padrao: 0,
        vagas: null,
        vagas_fechadas: false,
        payment_mode: 'whatsapp' as const,
        mp_card_fee_percent: 4.99,
        mp_installments_max: 12,
        created_at: '',
        updated_at: '',
        pricing_options: []
      } as Tour;
    });
    return [...tours, ...calendarToursAsTours].sort((a, b) => 
      new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime()
    );
  }, [tours, calendarOnlyTours]);

  const fetchTotalReservas = async () => {
    try {
      const { count, error } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      setTotalReservas(count || 0);
    } catch (error) {
      console.error('Erro ao carregar total de reservas:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Get the main section and sub-section from activeTab
  const getMainSection = () => {
    if (activeTab.startsWith('gestao')) return 'gestao';
    if (activeTab.startsWith('financeiro')) return 'financeiro';
    if (activeTab.startsWith('func-')) return 'funcionalidades';
    if (activeTab.startsWith('clientes-')) return 'clientes';
    if (activeTab.startsWith('fidelidade-')) return 'fidelidade';
    if (activeTab.startsWith('conteudo')) return 'conteudo';
    if (activeTab.startsWith('analytics')) return 'analytics';
    if (activeTab === 'paginas') return 'paginas';
    if (activeTab === 'paginas-institucionais') return 'paginas-institucionais';
    if (activeTab === 'depoimentos') return 'depoimentos';
    if (activeTab === 'loja') return 'loja';
    if (activeTab === 'jornada') return 'jornada';
    if (activeTab === 'mapa-processos') return 'mapa-processos';
    return activeTab;
  };

  const getSubSection = () => {
    if (activeTab.startsWith('gestao-')) return activeTab.replace('gestao-', '');
    if (activeTab.startsWith('financeiro-')) return activeTab.replace('financeiro-', '');
    if (activeTab.startsWith('func-')) return activeTab.replace('func-', '');
    if (activeTab.startsWith('clientes-')) return activeTab.replace('clientes-', '');
    if (activeTab.startsWith('fidelidade-')) return activeTab.replace('fidelidade-', '');
    if (activeTab.startsWith('conteudo-')) return activeTab.replace('conteudo-', '');
    if (activeTab.startsWith('analytics-')) return activeTab.replace('analytics-', '');
    return null;
  };

  // Render content based on active tab
  const renderContent = () => {
    const mainSection = getMainSection();
    const subSection = getSubSection();
    
    switch (mainSection) {
      case 'gestao':
        return <TourManagementTab tours={allToursForManagement} onRefresh={fetchTours} viewMode={subSection || 'dashboard'} />;
      case 'financeiro':
        return <FinanceiroTab tours={tours} viewMode={subSection || 'passeio'} />;
      case 'funcionalidades':
        return <FuncionalidadesTab activeSubTab={subSection || 'menu'} />;
      case 'catalogo':
        return <TourManagementTab tours={allToursForManagement} onRefresh={fetchTours} viewMode="catalogo" />;
      case 'clientes':
        return <ClientesCadastro viewMode={subSection || 'reservas'} />;
      case 'fidelidade':
        return <ClientReportsTab viewMode={subSection || 'niveis'} />;
      case 'formularios':
        return <FormQuestionsManagement />;
      case 'paginas':
        return <LandingPagesModule />;
      case 'paginas-institucionais':
        return <AdminPaginasInstitucional />;
      case 'depoimentos':
        return <AdminDepoimentos />;
      case 'loja':
        return <ShopModule />;
      case 'jornada':
        return <JourneyModule />;
      case 'mapa-processos':
        return <ExperienceProcessMap />;
      case 'conteudo':
        return <ContentPlanningModule subView={subSection} />;
      case 'analytics':
        return <AnalyticsModule subView={subSection} />;
      case 'exportar':
        return <ExportToursModule />;
      case 'guias':
        return <AdminGuias />;
      default:
        return <TourManagementTab tours={allToursForManagement} onRefresh={fetchTours} viewMode="dashboard" />;
    }
  };

  // Get page title based on active tab
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'gestao-dashboard': 'Passeios - Dashboard',
      'gestao-participantes': 'Passeios - Participantes',
      'gestao-catalogo': 'Passeios - Catálogo',
      'gestao-movimentacao': 'Passeios - Movimentação',
      'gestao-atendimento': 'Passeios - Mensagens de Atendimento',
      'financeiro-diario': 'Financeiro - Diário',
      'financeiro-passeio': 'Financeiro - Por Passeio',
      'financeiro-mensal': 'Financeiro - Mensal',
      'financeiro-balanco': 'Financeiro - Balanço',
      'financeiro-historico': 'Financeiro - Histórico',
      'financeiro-grafica': 'Financeiro - Análise Gráfica',
      'financeiro-dashboard': 'Financeiro - Dashboard',
      'financeiro-analise': 'Financeiro - Análise IA',
      'func-menu': 'Funções - Menu',
      'func-banners': 'Funções - Banners',
      'func-mensagens': 'Funções - Mensagens',
      'func-cupons': 'Funções - Cupons',
      'func-emails': 'Funções - E-mails',
      'func-politica': 'Funções - Termos',
      'func-templates': 'Funções - Templates',
      'func-tickets': 'Funções - Tickets',
      'func-transporte': 'Funções - Transporte',
      'func-seguro-roca': 'Funções - Seguro Aventura (Roca)',
      'func-pagina-sucesso': 'Funções - Página de Sucesso',
      'func-processos': 'Funções - Processos',
      'catalogo': 'Catálogo',
      'guias': 'Guias',
      'clientes-reservas': 'Clientes - Reservas',
      'clientes-interessados': 'Clientes - Interessados',
      'clientes-atendimento': 'Clientes - Atendimento',
      'clientes-creditos': 'Clientes - Créditos',
      'clientes-lista': 'Clientes - Lista',
      'clientes-cadastro': 'Clientes - Cadastro',
      'clientes-planilha': 'Clientes - Planilha',
      'clientes-analytics': 'Clientes - Análise',
      'fidelidade-niveis': 'Fidelidade - Níveis',
      'fidelidade-selos': 'Fidelidade - Selos',
      'fidelidade-pontos': 'Fidelidade - Pontos',
      'fidelidade-recompensas': 'Fidelidade - Recompensas',
      'formularios': 'Formulários',
      'conteudo-ideias': 'Conteúdo - Banco de Ideias',
      'conteudo-calendario': 'Conteúdo - Calendário Editorial',
      'conteudo-campanhas': 'Conteúdo - Campanhas',
      'conteudo-dashboard': 'Conteúdo - Visão Geral',
      'conteudo-assistente': 'Conteúdo - Assistente IA',
      'paginas': 'Páginas',
      'paginas-institucionais': 'Páginas Institucionais',
      'depoimentos': 'Depoimentos',
      'loja': 'Loja',
      'jornada': 'Jornada do Cliente',
      'mapa-processos': 'Mapa de Processos',
      'analytics': 'Analytics de Acessos',
      'analytics-acessos': 'Analytics - Acessos',
      'analytics-abandono': 'Analytics - Abandono de Formulario',
      'exportar': 'Exportar Passeios',
    };
    return titles[activeTab] || 'Painel Administrativo';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar - Desktop */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        totalReservas={totalReservas}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 pb-20 md:pb-0 min-w-0 overflow-x-hidden transition-[margin] duration-300",
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {getPageTitle()}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <div className={cn(
          "mx-auto py-6",
          (activeTab === 'financeiro-balanco' || activeTab === 'gestao-participantes') ? 'w-full px-4 md:px-6' : 'max-w-7xl px-4 md:px-6 lg:px-8'
        )}>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminMobileNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
      />

      {/* Task Panel */}
      <TaskPanel tours={tours} />
    </div>
  );
};

export default Admin;
