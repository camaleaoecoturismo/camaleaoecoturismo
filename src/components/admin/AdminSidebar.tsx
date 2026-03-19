import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Briefcase, 
  DollarSign, 
  CalendarDays, 
  Wrench, 
  Users, 
  Crown, 
  FileQuestion,
  LogOut,
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Calculator,
  BarChart3,
  TrendingUp,
  Brain,
  Menu,
  Image as ImageIcon,
  MessageSquare,
  Tag,
  Mail,
  FileText,
  Ticket,
  QrCode,
  ChevronRight,
  ClipboardList,
  UserPlus,
  FileSpreadsheet,
  Award,
  Trophy,
  Star,
  Gift,
  Activity,
  Bus,
  Upload,
  Camera,
  Instagram,
  GitBranch,
  Headphones,
  Globe,
  ShoppingBag,
  Shield,
  Route
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AdminSettingsModal from './AdminSettingsModal';
import camaleaoLogo from '@/assets/camaleao-icon.png';
import { toast } from 'sonner';

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  totalReservas?: number;
}

const menuItems: MenuItem[] = [
  {
    id: 'gestao-dashboard',
    label: 'Início',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'gestao',
    label: 'Passeios',
    icon: <Briefcase className="h-5 w-5" />,
    subItems: [
      { id: 'gestao-participantes', label: 'Participantes', icon: <Users className="h-4 w-4" /> },
      { id: 'gestao-pagamentos', label: 'Pagamentos', icon: <CreditCard className="h-4 w-4" /> },
      { id: 'gestao-movimentacao', label: 'Movimentação', icon: <ArrowLeftRight className="h-4 w-4" /> },
      { id: 'gestao-atendimento', label: 'Msg. Atendimento', icon: <MessageSquare className="h-4 w-4" /> },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <DollarSign className="h-5 w-5" />,
    subItems: [
      { id: 'financeiro-diario', label: 'Diário', icon: <CalendarDays className="h-4 w-4" /> },
      { id: 'financeiro-passeio', label: 'Por Passeio', icon: <Calculator className="h-4 w-4" /> },
      { id: 'financeiro-mensal', label: 'Mensal', icon: <CalendarDays className="h-4 w-4" /> },
      { id: 'financeiro-balanco', label: 'Balanço', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'financeiro-historico', label: 'Histórico', icon: <ClipboardList className="h-4 w-4" /> },
      { id: 'financeiro-comparacao', label: 'Comparação', icon: <ArrowLeftRight className="h-4 w-4" /> },
      { id: 'financeiro-grafica', label: 'Análise Gráfica', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'financeiro-dashboard', label: 'Dashboard', icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'financeiro-analise', label: 'Análise IA', icon: <Brain className="h-4 w-4" /> },
    ]
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: 'jornada',
    label: 'Jornada',
    icon: <Route className="h-5 w-5" />,
  },
  {
    id: 'mapa-processos',
    label: 'Processos',
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    id: 'funcionalidades',
    label: 'Funções',
    icon: <Wrench className="h-5 w-5" />,
    subItems: [
      { id: 'func-menu', label: 'Menu', icon: <Menu className="h-4 w-4" /> },
      { id: 'func-banners', label: 'Banners', icon: <ImageIcon className="h-4 w-4" /> },
      { id: 'func-mensagens', label: 'Mensagens', icon: <MessageSquare className="h-4 w-4" /> },
      { id: 'func-cupons', label: 'Cupons', icon: <Tag className="h-4 w-4" /> },
      { id: 'func-emails', label: 'E-mails', icon: <Mail className="h-4 w-4" /> },
      { id: 'func-politica', label: 'Termos', icon: <FileText className="h-4 w-4" /> },
      { id: 'func-templates', label: 'Templates', icon: <Ticket className="h-4 w-4" /> },
      { id: 'func-tickets', label: 'Tickets', icon: <QrCode className="h-4 w-4" /> },
      { id: 'func-transporte', label: 'Transporte', icon: <Bus className="h-4 w-4" /> },
      { id: 'func-pagina-sucesso', label: 'Pág. Sucesso', icon: <CreditCard className="h-4 w-4" /> },
      { id: 'func-processos', label: 'Processos', icon: <GitBranch className="h-4 w-4" /> },
      { id: 'func-seguro-roca', label: 'Seguro Roca', icon: <Shield className="h-4 w-4" /> },
    ]
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: <Users className="h-5 w-5" />,
    subItems: [
      { id: 'clientes-reservas', label: 'Reservas', icon: <ClipboardList className="h-4 w-4" /> },
      { id: 'clientes-interessados', label: 'Interessados', icon: <Star className="h-4 w-4" /> },
      { id: 'clientes-atendimento', label: 'Atendimento', icon: <Headphones className="h-4 w-4" /> },
      { id: 'clientes-creditos', label: 'Créditos', icon: <CreditCard className="h-4 w-4" /> },
      { id: 'clientes-lista', label: 'Lista', icon: <Users className="h-4 w-4" /> },
      { id: 'clientes-cadastro', label: 'Cadastro', icon: <UserPlus className="h-4 w-4" /> },
      { id: 'clientes-planilha', label: 'Planilha', icon: <FileSpreadsheet className="h-4 w-4" /> },
      { id: 'clientes-analytics', label: 'Análise', icon: <BarChart3 className="h-4 w-4" /> },
    ]
  },
  {
    id: 'fidelidade',
    label: 'Fidelidade',
    icon: <Crown className="h-5 w-5" />,
    subItems: [
      { id: 'fidelidade-niveis', label: 'Níveis', icon: <Trophy className="h-4 w-4" /> },
      { id: 'fidelidade-selos', label: 'Selos', icon: <Award className="h-4 w-4" /> },
      { id: 'fidelidade-pontos', label: 'Pontos', icon: <Star className="h-4 w-4" /> },
      { id: 'fidelidade-recompensas', label: 'Recompensas', icon: <Gift className="h-4 w-4" /> },
    ]
  },
  {
    id: 'formularios',
    label: 'Formulários',
    icon: <FileQuestion className="h-5 w-5" />,
  },
  {
    id: 'paginas',
    label: 'Paginas',
    icon: <Globe className="h-5 w-5" />,
  },
  {
    id: 'loja',
    label: 'Loja',
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    icon: <Instagram className="h-5 w-5" />,
    subItems: [
      { id: 'conteudo-ideias', label: 'Ideias', icon: <Brain className="h-4 w-4" /> },
      { id: 'conteudo-calendario', label: 'Calendário', icon: <CalendarDays className="h-4 w-4" /> },
      { id: 'conteudo-campanhas', label: 'Campanhas', icon: <Tag className="h-4 w-4" /> },
      { id: 'conteudo-dashboard', label: 'Visão Geral', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'conteudo-assistente', label: 'Assistente IA', icon: <Brain className="h-4 w-4" /> },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <Activity className="h-5 w-5" />,
    subItems: [
      { id: 'analytics-acessos', label: 'Acessos', icon: <Activity className="h-4 w-4" /> },
      { id: 'analytics-abandono', label: 'Abandono de Formulário', icon: <TrendingUp className="h-4 w-4" /> },
    ]
  },
  {
    id: 'exportar',
    label: 'Exportar',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  onSignOut,
  totalReservas 
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; maxHeight: number } | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        setLastSignIn(user.last_sign_in_at || null);
      }
    };
    fetchUserData();
    
    // Load custom logo from settings
    const loadCustomLogo = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_logo_url')
        .single();
      if (data?.setting_value) {
        setCustomLogo(data.setting_value);
      }
    };
    loadCustomLogo();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    
    setIsUploadingLogo(true);
    try {
      // Convert to base64 and store in settings (for simplicity)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const { error } = await supabase
          .from('site_settings')
          .upsert({ setting_key: 'admin_logo_url', setting_value: base64 }, { onConflict: 'setting_key' });
        
        if (error) throw error;
        
        setCustomLogo(base64);
        toast.success('Logo atualizado com sucesso');
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
      setIsUploadingLogo(false);
    }
  };

  const isItemActive = (item: MenuItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => activeTab === sub.id);
    }
    return activeTab === item.id;
  };

  const isSubItemActive = (subItem: SubMenuItem) => {
    return activeTab === subItem.id;
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length > 0) {
      setExpandedItem(expandedItem === item.id ? null : item.id);
    } else {
      onTabChange(item.id);
      setExpandedItem(null);
    }
  };

  const handleSubItemClick = (subItem: SubMenuItem) => {
    onTabChange(subItem.id);
    setExpandedItem(null);
    setHoveredItem(null);
  };

  const handleMouseEnter = (item: MenuItem) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    if (item.subItems) {
      setHoveredItem(item.id);
      const ref = itemRefs.current[item.id];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const subItemsCount = item.subItems.length;
        const estimatedHeight = subItemsCount * 44 + 48; // 44px per item + header
        const padding = 16;
        
        // Calculate if menu would overflow bottom
        let top = rect.top;
        let maxHeight = viewportHeight - padding * 2;
        
        if (top + estimatedHeight > viewportHeight - padding) {
          // Adjust top to fit, but not above padding
          top = Math.max(padding, viewportHeight - estimatedHeight - padding);
        }
        
        setFlyoutPosition({ top, maxHeight });
      }
    }
  };

  const handleMouseLeave = () => {
    // Add 250ms delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 250);
  };

  const handleFlyoutMouseEnter = (itemId: string) => {
    // Clear close timeout when entering flyout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredItem(itemId);
  };

  const handleFlyoutMouseLeave = () => {
    // Add 250ms delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 250);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Update flyout position when expanded item changes
  useEffect(() => {
    if (expandedItem) {
      const ref = itemRefs.current[expandedItem];
      const item = menuItems.find(m => m.id === expandedItem);
      if (ref && item?.subItems) {
        const rect = ref.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const subItemsCount = item.subItems.length;
        const estimatedHeight = subItemsCount * 44 + 48;
        const padding = 16;
        
        let top = rect.top;
        let maxHeight = viewportHeight - padding * 2;
        
        if (top + estimatedHeight > viewportHeight - padding) {
          top = Math.max(padding, viewportHeight - estimatedHeight - padding);
        }
        
        setFlyoutPosition({ top, maxHeight });
      }
    }
  }, [expandedItem]);

  const showFlyout = (itemId: string) => hoveredItem === itemId || expandedItem === itemId;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não disponível';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-20 lg:w-24 bg-card border-r border-border h-screen fixed left-0 top-0 z-40">
        {/* Logo/Header - Click to upload or access settings */}
        <div className="h-16 flex items-center justify-center border-b border-border relative group">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <button 
            onClick={() => logoInputRef.current?.click()}
            className="w-10 h-10 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all relative"
            title="Clique para alterar a logo"
            disabled={isUploadingLogo}
          >
            {customLogo ? (
              <img 
                src={customLogo} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isUploadingLogo && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-4 w-4 text-white" />
            </div>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="absolute right-1 bottom-1 p-1 rounded bg-muted hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Configurações Avançadas"
          >
            <Wrench className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li 
                key={item.id} 
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-200 group",
                    isItemActive(item) 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isItemActive(item) ? "bg-primary text-primary-foreground" : "group-hover:bg-muted-foreground/10"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1.5">
                    <span className="text-[10px] lg:text-xs font-medium text-center leading-tight">
                      {item.label}
                    </span>
                    {item.subItems && (
                      <ChevronRight className={cn(
                        "h-3 w-3 transition-transform flex-shrink-0",
                        showFlyout(item.id) && "rotate-90"
                      )} />
                    )}
                  </div>
                  {item.id === 'clientes' && totalReservas !== undefined && totalReservas > 0 && (
                    <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 h-4">
                      {totalReservas}
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer - Logout */}
        <div className="p-2 border-t border-border">
          <button
            onClick={onSignOut}
            className="w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <div className="p-2 rounded-lg">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="text-[10px] lg:text-xs mt-1.5 font-medium">Sair</span>
          </button>
        </div>

        {/* Flyout menus - rendered outside the scrollable area */}
        {menuItems.map((item) => (
          item.subItems && showFlyout(item.id) && flyoutPosition && (
            <div 
              key={`flyout-${item.id}`}
              ref={flyoutRef}
              className="fixed z-[9999] animate-fade-in left-[88px] lg:left-[104px]"
              style={{ 
                top: flyoutPosition.top,
                maxHeight: flyoutPosition.maxHeight,
              }}
              onMouseEnter={() => handleFlyoutMouseEnter(item.id)}
              onMouseLeave={handleFlyoutMouseLeave}
            >
              <div 
                className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[180px] max-h-[inherit] overflow-y-auto"
                style={{ maxHeight: flyoutPosition.maxHeight - 8 }}
              >
                <div className="px-3 py-2 border-b border-border mb-1 sticky top-0 bg-card z-10">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </span>
                </div>
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubItemClick(subItem)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                      isSubItemActive(subItem)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "p-1.5 rounded-md",
                      isSubItemActive(subItem) ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {subItem.icon}
                    </span>
                    {subItem.label}
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </aside>

      {/* Admin Settings Modal */}
      <AdminSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Profile Modal - kept for reference but currently unused */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img 
                src={camaleaoLogo} 
                alt="Camaleão" 
                className="w-12 h-12 rounded-xl object-contain"
              />
              <span>Perfil do Administrador</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">E-mail</label>
              <p className="text-sm font-semibold">{userEmail || 'Não disponível'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Último login</label>
              <p className="text-sm font-semibold">{formatDate(lastSignIn)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Sessão atual</label>
              <p className="text-sm font-semibold">{formatDate(new Date().toISOString())}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tipo de conta</label>
              <Badge variant="secondary">Administrador</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSidebar;