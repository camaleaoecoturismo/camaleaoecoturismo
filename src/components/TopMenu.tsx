import React, { useState, useEffect } from 'react';
import { Menu, X, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '@/assets/logo.png';

interface MenuItem {
  id: string;
  name: string;
  url: string;
  order_index: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  parent_id: string | null;
  children?: MenuItem[];
}

interface TopMenuProps {
  className?: string;
  transparent?: boolean;
}

export const TopMenu = ({ className, transparent = false }: TopMenuProps = {}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobileItems, setExpandedMobileItems] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      
      // Organize items into hierarchy
      const items = data || [];
      const rootItems = items.filter(item => !item.parent_id);
      const organizedItems = rootItems.map(parent => ({
        ...parent,
        children: items.filter(child => child.parent_id === parent.id)
          .sort((a, b) => a.order_index - b.order_index)
      }));
      
      setMenuItems(organizedItems);
    } catch (error) {
      console.error('Erro ao buscar itens do menu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Previne scroll do body quando menu está aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.menu-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const isActiveItem = (href: string): boolean => {
    const normalizedHref = href.endsWith('/') ? href.slice(0, -1) : href;
    const normalizedPath = location.pathname.endsWith('/') ? location.pathname.slice(0, -1) : location.pathname;
    
    if (normalizedPath === normalizedHref) return true;
    if (!href.startsWith('http') && normalizedPath === normalizedHref) return true;
    
    return false;
  };

  const handleNavigation = (item: MenuItem) => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
    
    if (item.url === '#') return; // Parent menu without URL
    
    if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
      if (item.open_in_new_tab) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = item.url;
      }
    } else {
      if (item.open_in_new_tab) {
        window.open(item.url, '_blank');
      } else {
        navigate(item.url);
      }
    }
  };

  const handleClientAreaClick = () => {
    setIsMobileMenuOpen(false);
    navigate('/cliente');
  };

  const toggleMobileExpand = (itemId: string) => {
    setExpandedMobileItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const hasChildren = (item: MenuItem) => item.children && item.children.length > 0;

  const bgClass = transparent
    ? scrolled ? 'bg-[#7c12d3] shadow-md' : 'bg-transparent'
    : 'bg-[#7c12d3]';

  return (
    <>
      <div className={transparent ? 'fixed top-0 left-0 right-0 z-40' : ''}>
      {/* Logo Bar - Mobile Only */}
      <div className={`md:hidden px-4 py-3 flex items-center justify-between transition-colors duration-300 ${bgClass}`}>
        <img src={logoImage} alt="Camaleão Ecoturismo" className="h-8 w-auto" width={109} height={32} />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClientAreaClick}
            className="text-menu-yellow hover:bg-white/20 min-h-[44px] min-w-[44px]"
            aria-label="Área do Cliente"
          >
            <User className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Main Menu Bar */}
      <nav className={`hidden md:block w-full transition-colors duration-300 ${bgClass}`} role="navigation" aria-label="Menu principal">
        {/* Desktop Menu */}
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto w-full">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img 
              src={logoImage} 
              alt="Camaleão Ecoturismo" 
              className="h-10 w-auto cursor-pointer" 
              width={136}
              height={40}
              onClick={() => navigate('/')}
            />
          </div>
          
          {/* Menu Items */}
          <div className="flex items-center gap-6">
            {!loading && menuItems.map((item) => (
              <div key={item.id} className="relative menu-dropdown">
                {hasChildren(item) ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === item.id ? null : item.id);
                      }}
                      className={`
                        text-sm font-bold transition-colors duration-200 whitespace-nowrap flex items-center gap-1
                        ${isActiveItem(item.url) || item.children?.some(c => isActiveItem(c.url))
                          ? 'text-menu-yellow' 
                          : 'text-white hover:text-menu-yellow'
                        }
                      `}
                    >
                      {item.name}
                      <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown */}
                    {openDropdown === item.id && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl py-2 min-w-[200px] z-50 border border-border">
                        {item.children?.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleNavigation(child)}
                            className={`
                              w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                              ${isActiveItem(child.url) 
                                ? 'text-primary bg-primary/10' 
                                : 'text-foreground hover:bg-muted hover:text-primary'
                              }
                            `}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleNavigation(item)}
                    className={`
                      text-sm font-bold transition-colors duration-200 whitespace-nowrap
                      ${isActiveItem(item.url) 
                        ? 'text-menu-yellow' 
                        : 'text-white hover:text-menu-yellow'
                      }
                    `}
                  >
                    {item.name}
                  </button>
                )}
              </div>
            ))}
            
            {/* Área do Cliente - Desktop */}
            <button
              onClick={handleClientAreaClick}
              className={`
                text-sm font-bold transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap
                ${location.pathname === '/cliente' || location.pathname === '/minha-conta'
                  ? 'text-menu-yellow' 
                  : 'text-white hover:text-menu-yellow'
                }
              `}
            >
              <User className="h-4 w-4" />
              Área do Cliente
            </button>
          </div>
        </div>

      </nav>
      </div>

      {/* Mobile Menu Panel — fora da nav hidden para aparecer no mobile */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-auto max-h-[85vh] w-72 bg-[#7c12d3] z-50 rounded-bl-2xl shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/20">
                <span className="text-white font-bold text-lg">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="p-3 overflow-y-auto max-h-[calc(85vh-72px)]">
                <div className="space-y-1">
                  {menuItems.map((item) => (
                    <div key={item.id}>
                      {hasChildren(item) ? (
                        <>
                          <button
                            onClick={() => toggleMobileExpand(item.id)}
                            className={`w-full text-left px-4 py-3 text-base font-bold transition-colors duration-200 rounded-lg flex items-center justify-between ${
                              item.children?.some(c => isActiveItem(c.url))
                                ? 'text-menu-yellow bg-white/10'
                                : 'text-white hover:text-menu-yellow hover:bg-white/10'
                            }`}
                          >
                            <span>{item.name}</span>
                            <ChevronRight className={`h-5 w-5 transition-transform ${expandedMobileItems.includes(item.id) ? 'rotate-90' : ''}`} />
                          </button>
                          {expandedMobileItems.includes(item.id) && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/20 pl-3">
                              {item.children?.map((child) => (
                                <button
                                  key={child.id}
                                  onClick={() => handleNavigation(child)}
                                  className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${
                                    isActiveItem(child.url)
                                      ? 'text-menu-yellow bg-white/10'
                                      : 'text-white/90 hover:text-menu-yellow hover:bg-white/10'
                                  }`}
                                >
                                  {child.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleNavigation(item)}
                          className={`w-full text-left px-4 py-3 text-base font-bold transition-colors duration-200 rounded-lg ${
                            isActiveItem(item.url)
                              ? 'text-menu-yellow bg-white/10'
                              : 'text-white hover:text-menu-yellow hover:bg-white/10'
                          }`}
                        >
                          {item.name}
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleClientAreaClick}
                    className={`w-full text-left px-4 py-3 text-base font-bold transition-colors duration-200 rounded-lg flex items-center gap-2 ${
                      location.pathname === '/cliente' || location.pathname === '/minha-conta'
                        ? 'text-menu-yellow bg-white/10'
                        : 'text-white hover:text-menu-yellow hover:bg-white/10'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    Área do Cliente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
