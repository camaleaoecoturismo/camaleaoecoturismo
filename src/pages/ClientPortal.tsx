import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Home, User, MapPin, Wallet, Award, Star, Bell, LogOut, Menu, X,
  Loader2
} from 'lucide-react';
import logo from '@/assets/logo.png';
import ClientDashboard from '@/components/client-portal/ClientDashboard';
import ClientProfile from '@/components/client-portal/ClientProfile';
import ClientExperiences from '@/components/client-portal/ClientExperiences';
import ClientPayments from '@/components/client-portal/ClientPayments';
import ClientBadges from '@/components/client-portal/ClientBadges';
import ClientPoints from '@/components/client-portal/ClientPoints';
import ClientCommunications from '@/components/client-portal/ClientCommunications';

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

const ClientPortal = () => {
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/cliente');
        return;
      }

      // First, check if this is an admin account
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        // This is an admin - they shouldn't access client portal
        toast({
          title: "Acesso restrito",
          description: "Esta área é exclusiva para clientes. Você está logado como administrador.",
          variant: "destructive"
        });
        navigate('/cliente');
        return;
      }

      // Check if it's a client account
      const { data: clientAccount, error } = await supabase
        .from('client_accounts')
        .select(`
          id,
          cliente_id,
          total_points,
          clientes!client_accounts_cliente_id_fkey (
            id,
            nome_completo,
            cpf,
            email,
            whatsapp,
            data_nascimento
          )
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !clientAccount) {
        // Not a client account - redirect to login
        navigate('/cliente');
        return;
      }

      // Get level
      const { data: levelData } = await supabase
        .rpc('get_client_level', { total_points: clientAccount.total_points });

      const level = levelData && levelData.length > 0 ? {
        name: levelData[0].level_name,
        icon: levelData[0].level_icon,
        color: levelData[0].level_color,
        benefits: levelData[0].level_benefits
      } : null;

      setClientData({
        ...clientAccount,
        cliente: clientAccount.clientes as any,
        level
      });
      setLoading(false);
    };

    checkAuthAndLoadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/cliente');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Até logo!",
      description: "Você saiu da sua conta."
    });
    navigate('/cliente');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const tabs = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'experiencias', label: 'Minhas Experiências', icon: MapPin },
    { id: 'pagamentos', label: 'Meus Pagamentos', icon: Wallet },
    { id: 'selos', label: 'Meus Selos', icon: Award },
    { id: 'pontuacao', label: 'Minha Pontuação', icon: Star },
    { id: 'comunicacoes', label: 'Comunicações', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Camaleão" className="h-10" />
            <div className="hidden sm:block">
              <p className="text-xs opacity-80">Olá,</p>
              <p className="font-semibold text-sm truncate max-w-[150px]">
                {clientData.cliente.nome_completo.split(' ')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {clientData.level && (
              <div 
                className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: clientData.level.color + '20', color: clientData.level.color }}
              >
                <Star className="w-3 h-3" />
                {clientData.level.name}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-primary-foreground/20 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary-foreground/20' 
                    : 'hover:bg-primary-foreground/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary-foreground/10 text-red-200"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:flex h-auto p-1 bg-background shadow-sm rounded-lg flex-wrap gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="inicio" className="mt-0">
            <ClientDashboard clientData={clientData} onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="perfil" className="mt-0">
            <ClientProfile clientData={clientData} />
          </TabsContent>

          <TabsContent value="experiencias" className="mt-0">
            <ClientExperiences clienteId={clientData.cliente_id} />
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-0">
            <ClientPayments clienteId={clientData.cliente_id} />
          </TabsContent>

          <TabsContent value="selos" className="mt-0">
            <ClientBadges clientAccountId={clientData.id} />
          </TabsContent>

          <TabsContent value="pontuacao" className="mt-0">
            <ClientPoints 
              clientAccountId={clientData.id} 
              totalPoints={clientData.total_points}
              level={clientData.level}
            />
          </TabsContent>

          <TabsContent value="comunicacoes" className="mt-0">
            <ClientCommunications clientAccountId={clientData.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-muted py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">← Voltar para o site</a>
          <p className="mt-2">© Camaleão Ecoturismo</p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortal;
