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
  Film,
  GitBranch,
  Headphones,
  Globe,
  BookOpen,
  ShoppingBag,
  Shield,
  Route,
  X,
  ChevronRight,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
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
      { id: 'gestao-dashboard', label: 'Início', icon: <LayoutDashboard className="h-5 w-5" /> },
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
    ],
  },
  {
    label: 'MARKETING',
    items: [
      {
        id: 'marketing',
        label: 'Marketing',
        icon: <Megaphone className="h-5 w-5" />,
        subItems: [
          { id: 'jornada', label: 'Jornada', icon: <Route className="h-4 w-4" /> },
          { id: 'fidelidade-niveis', label: 'Fidelidade', icon: <Crown className="h-4 w-4" /> },
          { id: 'conteudo-calendario', label: 'Social', icon: <Instagram className="h-4 w-4" /> },
          { id: 'paginas-institucionais', label: 'Blog & FAQ', icon: <BookOpen className="h-4 w-4" /> },
        ],
      },
      { id: 'paginas', label: 'Páginas', icon: <Globe className="h-5 w-5" /> },
      { id: 'home-sections', label: 'Seções do Início', icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: 'stories', label: 'Stories (Home)', icon: <Instagram className="h-5 w-5" /> },
      { id: 'tour-moments', label: 'Momentos', icon: <Film className="h-5 w-5" /> },
      { id: 'depoimentos', label: 'Depoimentos', icon: <Star className="h-5 w-5" /> },
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

// Flyout submenu panel (used only in collapsed mode)
function FlyoutMenu({
  item,
  onSelect,
  activeTab,
  anchorTop,
}: {
  item: NavItem;
  onSelect: (id: string) => void;
  activeTab: string;
  anchorTop: number;
}) {
  if (!item.subItems) return null;

  const maxBottom = window.innerHeight - 16;
  const estimatedHeight = item.subItems.length * 44 + 56;
  const top = Math.min(anchorTop, maxBottom - estimatedHeight);

  return (
    <div
      className="fixed z-[9999] animate-in fade-in slide-in-from-left-1 duration-150"
      style={{ left: 72, top: Math.max(8, top) }}
    >
      <div className="bg-white border border-border rounded-2xl shadow-2xl py-3 min-w-[200px]">
        <div className="px-4 pb-2 mb-1 border-b border-border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {item.label}
          </span>
        </div>
        {item.subItems.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              activeTab === sub.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted/60'
            )}
          >
            <span className={cn(
              'p-1.5 rounded-lg',
              activeTab === sub.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
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
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [flyoutAnchorTop, setFlyoutAnchorTop] = useState(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    onCollapsedChange?.(true);
  }, []);

  useEffect(() => {
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

  // When expanding, auto-open accordion for active item's parent
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapsedChange?.(next);
    if (!next) {
      const activeParent = navGroups
        .flatMap((g) => g.items)
        .find((item) => item.subItems?.some((s) => s.id === activeTab));
      if (activeParent) {
        setOpenAccordions([activeParent.id]);
      }
    }
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
    if (item.id === 'marketing') {
      return activeTab === 'jornada'
        || activeTab.startsWith('fidelidade-')
        || activeTab.startsWith('conteudo-')
        || activeTab === 'paginas-institucionais';
    }
    if (item.subItems) return item.subItems.some((s) => s.id === activeTab);
    return activeTab === item.id;
  };

  // Flyout handlers (collapsed mode only)
  const handleItemEnter = (item: NavItem, id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const el = itemRefs.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      setFlyoutAnchorTop(rect.top);
    }
    setHoveredItem(id);
  };

  const handleItemLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredItem(null), 150);
  };

  const handleFlyoutEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleFlyoutLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredItem(null), 150);
  };

  const handleSubItemClick = (id: string) => {
    onTabChange(id);
    setHoveredItem(null);
    setMobileOpen(false);
  };

  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

  const hoveredNavItem = hoveredItem
    ? navGroups.flatMap((g) => g.items).find((i) => i.id === hoveredItem) ?? null
    : null;

  // ─── Collapsed sidebar content ───────────────────────────────────────────
  const CollapsedContent = () => (
    <div className="grid h-full" style={{ gridTemplateRows: '64px 1fr auto' }}>
      {/* Logo */}
      <div className="flex items-center justify-center border-b border-border">
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <button
          onClick={() => logoInputRef.current?.click()}
          className="w-9 h-9 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all relative"
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
      </div>

      {/* Nav */}
      <nav className="overflow-y-auto py-3 px-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {group.label && <div className="mx-1 my-2 border-t border-border/40" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const hasChildren = !!item.subItems?.length;

                return (
                  <li
                    key={item.id}
                    ref={(el) => { if (el) itemRefs.current.set(item.id, el); }}
                    onMouseEnter={() => handleItemEnter(item, item.id)}
                    onMouseLeave={handleItemLeave}
                  >
                    <button
                      onClick={() => { if (!hasChildren) { onTabChange(item.id); } }}
                      title={item.label}
                      className={cn(
                        'w-full flex items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 relative',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0',
                        active ? 'bg-primary text-primary-foreground' : ''
                      )}>
                        {item.icon}
                      </span>
                      {hasChildren && (
                        <ChevronRight className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 opacity-40" />
                      )}
                      {item.id === 'clientes' && totalReservas !== undefined && totalReservas > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                          {totalReservas}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        {/* Expand button */}
        <button
          onClick={toggleCollapsed}
          title="Expandir menu"
          className="w-full flex items-center justify-center py-2 px-1 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center py-2 px-1 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // ─── Expanded sidebar content ─────────────────────────────────────────────
  const ExpandedContent = () => (
    <div className="grid h-full" style={{ gridTemplateRows: '64px 1fr auto' }}>
      {/* Logo + collapse button */}
      <div className="flex items-center justify-between px-3 border-b border-border">
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <button
          onClick={() => logoInputRef.current?.click()}
          className="w-9 h-9 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all relative shrink-0"
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
        <button
          onClick={toggleCollapsed}
          title="Recolher menu"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="overflow-y-auto py-3 px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {group.label && (
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 pt-3 pb-1">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const hasChildren = !!item.subItems?.length;
                const isOpen = openAccordions.includes(item.id);

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleAccordion(item.id);
                        } else {
                          onTabChange(item.id);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 py-2 px-2 rounded-xl transition-all duration-150 text-sm',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted/60'
                      )}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.id === 'clientes' && totalReservas !== undefined && totalReservas > 0 && (
                        <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                          {totalReservas}
                        </span>
                      )}
                      {hasChildren && (
                        <ChevronDown className={cn(
                          'h-3.5 w-3.5 opacity-50 transition-transform duration-200 shrink-0',
                          isOpen && 'rotate-180'
                        )} />
                      )}
                    </button>

                    {/* Accordion subitems */}
                    {hasChildren && isOpen && (
                      <ul className="ml-4 pl-3 border-l border-border mt-0.5 mb-1 space-y-0.5">
                        {item.subItems!.map((sub) => (
                          <li key={sub.id}>
                            <button
                              onClick={() => onTabChange(sub.id)}
                              className={cn(
                                'w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors',
                                activeTab === sub.id
                                  ? 'text-primary font-medium bg-primary/5'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                              )}
                            >
                              <span className="opacity-70 shrink-0">{sub.icon}</span>
                              <span className="truncate">{sub.label}</span>
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
      <div className="border-t border-border p-2">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 py-2 px-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/60 shrink-0">
            <LogOut className="h-4 w-4" />
          </span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border h-screen fixed left-0 top-0 z-40 transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        {collapsed ? CollapsedContent() : ExpandedContent()}
      </aside>

      {/* Flyout submenu — collapsed mode only */}
      {collapsed && hoveredNavItem && hoveredNavItem.subItems && (
        <div
          onMouseEnter={handleFlyoutEnter}
          onMouseLeave={handleFlyoutLeave}
          className="hidden md:block"
        >
          <FlyoutMenu
            item={hoveredNavItem}
            onSelect={handleSubItemClick}
            activeTab={activeTab}
            anchorTop={flyoutAnchorTop}
          />
        </div>
      )}

      {/* Mobile hamburger */}
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
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-[51] w-72 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col h-full pt-14 overflow-y-auto">
              {navGroups.map((group, gi) => (
                <div key={gi} className="px-3">
                  {group.label && (
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 pt-4 pb-1">{group.label}</p>
                  )}
                  {group.items.map((item) => (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (!item.subItems) { onTabChange(item.id); setMobileOpen(false); }
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 py-2 px-2 rounded-lg text-sm transition-colors',
                          isItemActive(item) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <span className={cn('w-7 h-7 flex items-center justify-center rounded-lg shrink-0', isItemActive(item) ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.subItems && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                      {item.subItems && (
                        <div className="ml-8 pl-2 border-l border-border space-y-0.5 mb-1">
                          {item.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => { onTabChange(sub.id); setMobileOpen(false); }}
                              className={cn(
                                'w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors',
                                activeTab === sub.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              )}
                            >
                              <span className="opacity-70">{sub.icon}</span>
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>
        </>
      )}

      <AdminSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};

export default AdminSidebar;
