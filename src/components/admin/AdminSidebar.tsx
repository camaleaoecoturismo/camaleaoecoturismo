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
  ChevronDown,
  ChevronLeft,
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
  Route,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AdminSettingsModal from './AdminSettingsModal';
import { toast } from 'sonner';

interface SubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: SubItem[];
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  totalReservas?: number;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { id: 'gestao-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      {
        id: 'gestao',
        label: 'Passeios',
        icon: <Briefcase className="h-5 w-5" />,
        subItems: [
          { id: 'gestao-participantes', label: 'Participantes', icon: <Users className="h-4 w-4" /> },
          { id: 'gestao-pagamentos', label: 'Pagamentos', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'gestao-movimentacao', label: 'Movimentação', icon: <ArrowLeftRight className="h-4 w-4" /> },
          { id: 'gestao-atendimento', label: 'Msg. Atendimento', icon: <MessageSquare className="h-4 w-4" /> },
        ],
      },
      { id: 'clientes-reservas', label: 'Reservas', icon: <ClipboardList className="h-5 w-5" /> },
      { id: 'catalogo', label: 'Catálogo', icon: <ClipboardList className="h-5 w-5" /> },
      { id: 'jornada', label: 'Jornada', icon: <Route className="h-5 w-5" /> },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      {
        id: 'financeiro',
        label: 'Financeiro',
        icon: <DollarSign className="h-5 w-5" />,
        subItems: [
          { id: 'financeiro-dashboard', label: 'Visão Geral', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'financeiro-diario', label: 'Diário', icon: <CalendarDays className="h-4 w-4" /> },
          { id: 'financeiro-passeio', label: 'Por Passeio', icon: <Calculator className="h-4 w-4" /> },
          { id: 'financeiro-mensal', label: 'Mensal', icon: <CalendarDays className="h-4 w-4" /> },
          { id: 'financeiro-balanco', label: 'Balanço', icon: <BarChart3 className="h-4 w-4" /> },
          { id: 'financeiro-historico', label: 'Histórico', icon: <ClipboardList className="h-4 w-4" /> },
          { id: 'financeiro-comparacao', label: 'Comparação', icon: <ArrowLeftRight className="h-4 w-4" /> },
          { id: 'financeiro-grafica', label: 'Análise Gráfica', icon: <BarChart3 className="h-4 w-4" /> },
          { id: 'financeiro-analise', label: 'Análise IA', icon: <Brain className="h-4 w-4" /> },
        ],
      },
    ],
  },
  {
    label: 'CLIENTES',
    items: [
      {
        id: 'clientes',
        label: 'Clientes',
        icon: <Users className="h-5 w-5" />,
        subItems: [
          { id: 'clientes-lista', label: 'Lista', icon: <Users className="h-4 w-4" /> },
          { id: 'clientes-interessados', label: 'Interessados', icon: <Star className="h-4 w-4" /> },
          { id: 'clientes-atendimento', label: 'Atendimento', icon: <Headphones className="h-4 w-4" /> },
          { id: 'clientes-creditos', label: 'Créditos', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'clientes-cadastro', label: 'Cadastro', icon: <UserPlus className="h-4 w-4" /> },
          { id: 'clientes-planilha', label: 'Planilha', icon: <FileSpreadsheet className="h-4 w-4" /> },
          { id: 'clientes-analytics', label: 'Análise', icon: <BarChart3 className="h-4 w-4" /> },
        ],
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
        ],
      },
    ],
  },
  {
    label: 'CONTEÚDO',
    items: [
      {
        id: 'conteudo',
        label: 'Social',
        icon: <Instagram className="h-5 w-5" />,
        subItems: [
          { id: 'conteudo-ideias', label: 'Ideias', icon: <Brain className="h-4 w-4" /> },
          { id: 'conteudo-calendario', label: 'Calendário', icon: <CalendarDays className="h-4 w-4" /> },
          { id: 'conteudo-campanhas', label: 'Campanhas', icon: <Tag className="h-4 w-4" /> },
          { id: 'conteudo-dashboard', label: 'Visão Geral', icon: <BarChart3 className="h-4 w-4" /> },
          { id: 'conteudo-assistente', label: 'Assistente IA', icon: <Brain className="h-4 w-4" /> },
        ],
      },
      { id: 'paginas', label: 'Páginas', icon: <Globe className="h-5 w-5" /> },
      { id: 'formularios', label: 'Formulários', icon: <FileQuestion className="h-5 w-5" /> },
    ],
  },
  {
    label: 'CONFIGURAÇÕES',
    items: [
      {
        id: 'funcionalidades',
        label: 'Site',
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
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: <Activity className="h-5 w-5" />,
        subItems: [
          { id: 'analytics-acessos', label: 'Acessos', icon: <Activity className="h-4 w-4" /> },
          { id: 'analytics-abandono', label: 'Abandono', icon: <TrendingUp className="h-4 w-4" /> },
        ],
      },
      { id: 'guias', label: 'Guias', icon: <Users className="h-5 w-5" /> },
      { id: 'loja', label: 'Loja', icon: <ShoppingBag className="h-5 w-5" /> },
      { id: 'mapa-processos', label: 'Processos', icon: <GitBranch className="h-5 w-5" /> },
      { id: 'exportar', label: 'Exportar', icon: <FileSpreadsheet className="h-5 w-5" /> },
    ],
  },
];

// Flyout menu for collapsed mode
function CollapsedFlyout({
  item,
  onSelect,
  isActive,
}: {
  item: NavItem;
  onSelect: (id: string) => void;
  isActive: (id: string) => boolean;
}) {
  if (!item.subItems) return null;
  return (
    <div className="absolute left-full top-0 ml-2 z-[9999] animate-in fade-in slide-in-from-left-1 duration-150">
      <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[180px]">
        <div className="px-3 py-2 border-b border-border mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {item.label}
          </span>
        </div>
        {item.subItems.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
              isActive(sub.id)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <span
              className={cn(
                'p-1.5 rounded-md',
                isActive(sub.id) ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {sub.icon}
            </span>
            {sub.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
  totalReservas,
  onCollapsedChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredCollapsedItem, setHoveredCollapsedItem] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-expand group containing active tab on mount
  useEffect(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.subItems?.some((s) => s.id === activeTab)) {
          setExpandedItems((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
        }
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        setLastSignIn(user.last_sign_in_at || null);
      }
    };
    fetchUser();

    const loadLogo = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_logo_url')
        .single();
      if (data?.setting_value) setCustomLogo(data.setting_value);
    };
    loadLogo();
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('adminSidebarCollapsed', String(next));
    onCollapsedChange?.(next);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Por favor, selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB'); return; }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const { error } = await supabase
        .from('site_settings')
        .upsert({ setting_key: 'admin_logo_url', setting_value: base64 }, { onConflict: 'setting_key' });
      if (error) { toast.error('Erro ao enviar logo'); } else { setCustomLogo(base64); toast.success('Logo atualizado'); }
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const isItemActive = (item: NavItem) => {
    if (item.subItems) return item.subItems.some((s) => s.id === activeTab);
    return activeTab === item.id;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleItemClick = (item: NavItem) => {
    if (item.subItems?.length) {
      if (isCollapsed) {
        // In collapsed mode, navigate to first subitem
        onTabChange(item.subItems[0].id);
      } else {
        toggleExpand(item.id);
      }
    } else {
      onTabChange(item.id);
      setMobileOpen(false);
    }
  };

  const handleSubItemClick = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
    setHoveredCollapsedItem(null);
  };

  const handleCollapsedHoverEnter = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredCollapsedItem(id);
  };

  const handleCollapsedHoverLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredCollapsedItem(null), 200);
  };

  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

  // Sidebar content shared between desktop and mobile
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border shrink-0 relative group px-3">
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <button
          onClick={() => logoInputRef.current?.click()}
          className={cn(
            'rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all relative shrink-0',
            isCollapsed && !mobile ? 'w-9 h-9' : 'w-9 h-9'
          )}
          title="Clique para alterar a logo"
          disabled={isUploadingLogo}
        >
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Camera className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {isUploadingLogo && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Brand name — only in expanded mode */}
        {(!isCollapsed || mobile) && (
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">Camaleão</p>
            <p className="text-[10px] text-muted-foreground truncate">Admin</p>
          </div>
        )}

        {/* Settings shortcut */}
        {(!isCollapsed || mobile) && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            title="Configurações"
          >
            <Wrench className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {/* Group header — only in expanded */}
            {group.label && (!isCollapsed || mobile) && (
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  {group.label}
                </span>
              </div>
            )}
            {/* Group divider — only in collapsed desktop */}
            {group.label && isCollapsed && !mobile && (
              <div className="mx-2 my-2 border-t border-border/50" />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const isExpanded = expandedItems.includes(item.id);
                const showFlyout = isCollapsed && !mobile && hoveredCollapsedItem === item.id && item.subItems;

                return (
                  <li key={item.id} className="relative">
                    {/* Item button */}
                    <div
                      className="relative"
                      onMouseEnter={() => isCollapsed && !mobile && item.subItems && handleCollapsedHoverEnter(item.id)}
                      onMouseLeave={() => isCollapsed && !mobile && handleCollapsedHoverLeave()}
                    >
                      <button
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg transition-colors duration-150 group/btn',
                          isCollapsed && !mobile
                            ? 'justify-center py-2.5 px-2'
                            : 'py-2 px-3',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        title={isCollapsed && !mobile ? item.label : undefined}
                      >
                        <span
                          className={cn(
                            'shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'group-hover/btn:bg-muted-foreground/10'
                          )}
                        >
                          {item.icon}
                        </span>

                        {/* Label + chevron — expanded only */}
                        {(!isCollapsed || mobile) && (
                          <>
                            <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                            {item.id === 'clientes' && totalReservas !== undefined && totalReservas > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 mr-1">
                                {totalReservas}
                              </Badge>
                            )}
                            {item.subItems && (
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                            )}
                          </>
                        )}
                      </button>

                      {/* Flyout for collapsed desktop mode */}
                      {showFlyout && item.subItems && (
                        <div
                          onMouseEnter={() => handleCollapsedHoverEnter(item.id)}
                          onMouseLeave={handleCollapsedHoverLeave}
                        >
                          <CollapsedFlyout
                            item={item}
                            onSelect={handleSubItemClick}
                            isActive={(id) => activeTab === id}
                          />
                        </div>
                      )}
                    </div>

                    {/* Inline subitems — expanded mode only */}
                    {(!isCollapsed || mobile) && item.subItems && isExpanded && (
                      <ul className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
                        {item.subItems.map((sub) => (
                          <li key={sub.id}>
                            <button
                              onClick={() => handleSubItemClick(sub.id)}
                              className={cn(
                                'w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm transition-colors',
                                activeTab === sub.id
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <span className="opacity-70">{sub.icon}</span>
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-2 space-y-1">
        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'w-full flex items-center gap-3 py-2 px-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-foreground/10">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </span>
            {!isCollapsed && <span className="text-sm font-medium">Recolher</span>}
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className={cn(
            'w-full flex items-center gap-3 py-2 px-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors',
            isCollapsed && !mobile && 'justify-center px-2'
          )}
          title={isCollapsed && !mobile ? 'Sair' : undefined}
        >
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg">
            <LogOut className="h-4 w-4" />
          </span>
          {(!isCollapsed || mobile) && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-5 left-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-[51] w-72 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent mobile />
          </aside>
        </>
      )}

      {/* Admin Settings Modal */}
      <AdminSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};

export default AdminSidebar;
