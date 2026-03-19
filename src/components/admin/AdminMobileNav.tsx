import React from 'react';
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
  MoreHorizontal,
  BarChart3,
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Calculator,
  TrendingUp,
  Brain,
  Menu,
  Image,
  MessageSquare,
  Tag,
  Mail,
  FileText,
  Ticket,
  QrCode,
  ClipboardList,
  UserPlus,
  FileSpreadsheet,
  Trophy,
  Award,
  Star,
  Gift,
  ChevronRight,
  ChevronDown,
  Activity,
  Bus
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
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
    id: 'clientes',
    label: 'Clientes',
    icon: <Users className="h-5 w-5" />,
    subItems: [
      { id: 'clientes-reservas', label: 'Reservas', icon: <ClipboardList className="h-4 w-4" /> },
      { id: 'clientes-lista', label: 'Lista', icon: <Users className="h-4 w-4" /> },
      { id: 'clientes-cadastro', label: 'Cadastro', icon: <UserPlus className="h-4 w-4" /> },
      { id: 'clientes-planilha', label: 'Planilha', icon: <FileSpreadsheet className="h-4 w-4" /> },
      { id: 'clientes-analytics', label: 'Análise', icon: <BarChart3 className="h-4 w-4" /> },
    ]
  },
];

const moreMenuItems: MenuItem[] = [
  {
    id: 'funcionalidades',
    label: 'Funcionalidades',
    icon: <Wrench className="h-5 w-5" />,
    subItems: [
      { id: 'func-menu', label: 'Menu', icon: <Menu className="h-4 w-4" /> },
      { id: 'func-banners', label: 'Banners', icon: <Image className="h-4 w-4" /> },
      { id: 'func-mensagens', label: 'Mensagens', icon: <MessageSquare className="h-4 w-4" /> },
      { id: 'func-cupons', label: 'Cupons', icon: <Tag className="h-4 w-4" /> },
      { id: 'func-emails', label: 'E-mails', icon: <Mail className="h-4 w-4" /> },
      { id: 'func-politica', label: 'Termos', icon: <FileText className="h-4 w-4" /> },
      { id: 'func-templates', label: 'Templates', icon: <Ticket className="h-4 w-4" /> },
      { id: 'func-tickets', label: 'Tickets', icon: <QrCode className="h-4 w-4" /> },
      { id: 'func-transporte', label: 'Transporte', icon: <Bus className="h-4 w-4" /> },
      { id: 'func-pagina-sucesso', label: 'Pág. Sucesso', icon: <CreditCard className="h-4 w-4" /> },
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
    id: 'analytics',
    label: 'Analytics',
    icon: <Activity className="h-5 w-5" />,
    subItems: [
      { id: 'analytics-overview', label: 'Visão Geral', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'analytics-traffic', label: 'Origem de Tráfego', icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'analytics-behavior', label: 'Comportamento', icon: <Activity className="h-4 w-4" /> },
      { id: 'analytics-funnel', label: 'Funil', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'analytics-devices', label: 'Dispositivos', icon: <LayoutDashboard className="h-4 w-4" /> },
    ]
  },
];

const AdminMobileNav: React.FC<AdminMobileNavProps> = ({ 
  activeTab, 
  onTabChange, 
  onSignOut 
}) => {
  const [moreSheetOpen, setMoreSheetOpen] = React.useState(false);
  const [subMenuSheetOpen, setSubMenuSheetOpen] = React.useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = React.useState<MenuItem | null>(null);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const isItemActive = (item: MenuItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => activeTab === sub.id || activeTab.startsWith(sub.id));
    }
    return activeTab === item.id || activeTab.startsWith(item.id);
  };

  const isSubItemActive = (subItem: SubMenuItem) => {
    return activeTab === subItem.id || activeTab.startsWith(subItem.id);
  };

  const isMoreActive = () => {
    return moreMenuItems.some(item => isItemActive(item));
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length > 0) {
      setSelectedMenuItem(item);
      setSubMenuSheetOpen(true);
    } else {
      onTabChange(item.id);
      setMoreSheetOpen(false);
      setSubMenuSheetOpen(false);
    }
  };

  const handleSubItemClick = (subItem: SubMenuItem) => {
    onTabChange(subItem.id);
    setSubMenuSheetOpen(false);
    setMoreSheetOpen(false);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleMoreItemClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length > 0) {
      toggleExpanded(item.id);
    } else {
      onTabChange(item.id);
      setMoreSheetOpen(false);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[56px]",
                isItemActive(item)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isItemActive(item) ? "bg-primary/10" : ""
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          ))}
          
          {/* More Button */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[56px]",
              isMoreActive()
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              isMoreActive() ? "bg-primary/10" : ""
            )}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* SubMenu Sheet for main menu items */}
      <Sheet open={subMenuSheetOpen} onOpenChange={setSubMenuSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe max-h-[70vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {selectedMenuItem?.icon}
              {selectedMenuItem?.label}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {selectedMenuItem?.subItems?.map((subItem) => (
              <button
                key={subItem.id}
                onClick={() => handleSubItemClick(subItem)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors",
                  isSubItemActive(subItem)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted active:bg-muted"
                )}
              >
                {subItem.icon}
                <span className="flex-1">{subItem.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* More Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe max-h-[70vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {/* Show remaining main menu items first (Clientes) */}
            {menuItems.slice(4).map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleMoreItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors",
                    isItemActive(item)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted active:bg-muted"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.subItems && (
                    expandedItems.includes(item.id) 
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {item.subItems && expandedItems.includes(item.id) && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-border pl-4">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubItemClick(subItem)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                          isSubItemActive(subItem)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted active:bg-muted"
                        )}
                      >
                        {subItem.icon}
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* More menu items with expandable submenus */}
            {moreMenuItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleMoreItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors",
                    isItemActive(item)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted active:bg-muted"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.subItems && (
                    expandedItems.includes(item.id) 
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {item.subItems && expandedItems.includes(item.id) && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-border pl-4">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubItemClick(subItem)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                          isSubItemActive(subItem)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted active:bg-muted"
                        )}
                      >
                        {subItem.icon}
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Logout in More menu */}
            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-destructive hover:bg-destructive/10 active:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminMobileNav;
