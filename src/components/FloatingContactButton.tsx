import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, MessageCircle, Phone, ExternalLink, HelpCircle, Calendar, CreditCard, MapPin, Info, Star, Gift, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface SupportTopic {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  action_type: 'whatsapp' | 'link';
  whatsapp_message: string | null;
  redirect_url: string | null;
}
const WHATSAPP_NUMBER = "5582993649454";
const DEFAULT_MESSAGE = "Olá! Gostaria de falar com atendente da Camaleão.";
const STORAGE_KEY = "floating_button_position";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{
  className?: string;
}>> = {
  MessageCircle,
  Phone,
  HelpCircle,
  Calendar,
  CreditCard,
  MapPin,
  Info,
  Star,
  Gift,
  Users
};

// WhatsApp SVG Icon
const WhatsAppIcon = ({
  size = 24
}: {
  size?: number;
}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.984 3.687" />
  </svg>;
export function FloatingContactButton() {
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [position, setPosition] = useState({
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  // Load topics
  useEffect(() => {
    const fetchTopics = async () => {
      const {
        data
      } = await supabase.from('support_topics').select('id, title, description, icon, action_type, whatsapp_message, redirect_url').eq('is_active', true).order('order_index', {
        ascending: true
      });
      setTopics((data || []) as SupportTopic[]);
    };
    fetchTopics();
  }, []);

  // Load saved position
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const {
          y
        } = JSON.parse(saved);
        setPosition({
          y: Math.max(0, Math.min(y, window.innerHeight - 100))
        });
      } else {
        // Default position: bottom-right
        setPosition({
          y: window.innerHeight - 100
        });
      }
    } catch {
      setPosition({
        y: window.innerHeight - 100
      });
    }
  }, []);

  // Save position to session storage
  const savePosition = useCallback((y: number) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        y
      }));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Handle mouse/touch down
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    setDragStartY(clientY);
    setDragStartPosition(position.y);
    hasDragged.current = false;
  }, [position.y]);

  // Handle mouse/touch move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = clientY - dragStartY;
    if (Math.abs(delta) > 5) {
      hasDragged.current = true;
    }
    const newY = Math.max(80, Math.min(dragStartPosition + delta, window.innerHeight - 80));
    setPosition({
      y: newY
    });
  }, [isDragging, dragStartY, dragStartPosition]);

  // Handle mouse/touch up
  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position.y);
    }
  }, [isDragging, position.y, savePosition]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  // Global mouse/touch move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchEnd = () => handleDragEnd();
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Handle button click
  const handleButtonClick = () => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }

    // If no active topics, open WhatsApp directly
    if (topics.length === 0) {
      openWhatsApp(DEFAULT_MESSAGE);
      return;
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Open WhatsApp
  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setIsMenuOpen(false);
  };

  // Handle topic click
  const handleTopicClick = (topic: SupportTopic) => {
    if (topic.action_type === 'whatsapp' && topic.whatsapp_message) {
      openWhatsApp(topic.whatsapp_message);
    } else if (topic.action_type === 'link' && topic.redirect_url) {
      window.open(topic.redirect_url, "_blank");
      setIsMenuOpen(false);
    }
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || MessageCircle;
    return <IconComponent className="h-4 w-4" />;
  };

  // Calculate menu position (above or below button)
  const getMenuPosition = () => {
    const buttonBottom = position.y + 48;
    const menuHeight = Math.min(topics.length * 64 + 16, 320);
    const spaceBelow = window.innerHeight - buttonBottom - 16;
    if (spaceBelow >= menuHeight) {
      return {
        top: buttonBottom + 8
      };
    }
    return {
      bottom: window.innerHeight - position.y + 8
    };
  };
  return <>
      {/* Floating Button */}
      <div ref={buttonRef} className="fixed right-4 z-50 select-none touch-none" style={{
      top: position.y
    }}>
        <button onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onClick={handleButtonClick} className={`
            bg-green-500 hover:bg-green-600 text-white rounded-full p-3 
            shadow-lg hover:shadow-xl transition-all duration-300
            ${isDragging ? 'scale-110 cursor-grabbing' : 'cursor-pointer hover:scale-110'}
            ${isMenuOpen ? 'ring-2 ring-green-400 ring-offset-2' : ''}
          `} aria-label="Entrar em contato">
          {isMenuOpen ? <X className="h-5 w-5" /> : <WhatsAppIcon size={20} />}
        </button>
      </div>

      {/* Menu */}
      {isMenuOpen && topics.length > 0 && <div ref={menuRef} className="fixed right-4 z-50 w-72 sm:w-80 bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-fade-in" style={getMenuPosition()}>
          <div className="p-3 border-b border-border bg-muted/50">
            <h3 className="font-semibold text-sm">Como podemos ajudar?</h3>
            <p className="text-xs text-muted-foreground">Selecione um assunto</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {topics.map(topic => <button key={topic.id} onClick={() => handleTopicClick(topic)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 text-left">
                <div className="flex-shrink-0 text-muted-foreground">
                  {topic.action_type === 'link' ? <ExternalLink className="h-5 w-5" /> : <WhatsAppIcon size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{topic.title}</p>
                  {topic.description && <p className="text-xs text-muted-foreground truncate">{topic.description}</p>}
                </div>
              </button>)}
          </div>

          <div className="p-3 border-t border-border bg-green-50 dark:bg-green-900/20">
            <button onClick={() => openWhatsApp(DEFAULT_MESSAGE)} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <WhatsAppIcon size={18} />
              Falar com atendente
            </button>
          </div>
        </div>}
    </>;
}