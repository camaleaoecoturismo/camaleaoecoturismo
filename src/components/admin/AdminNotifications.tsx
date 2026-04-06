import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, MessageCircle, Users, X, Monitor, Smartphone, Tablet } from 'lucide-react';

interface Notif {
  id: string;
  type: 'visitor' | 'chat';
  title: string;
  subtitle: string;
  detail?: string;
  lastMessage?: string;
  at: number;
  onAction?: () => void;
  actionLabel?: string;
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="w-3.5 h-3.5 shrink-0" />;
  if (type === 'tablet') return <Tablet className="w-3.5 h-3.5 shrink-0" />;
  return <Monitor className="w-3.5 h-3.5 shrink-0" />;
}

export function AdminNotifications({
  onNavigate,
  onOpenChat,
}: {
  onNavigate?: (tab: string) => void;
  onOpenChat?: (sessionId: string) => void;
}) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const knownSessions = useRef<Set<string>>(new Set());
  const knownChats = useRef<Set<string>>(new Set());
  const knownChatActivity = useRef<Map<string, number>>(new Map());
  const firstLoadVisitors = useRef(true);
  const firstLoadChats = useRef(true);

  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const push = useCallback((notif: Omit<Notif, 'at'>) => {
    const full: Notif = { ...notif, at: Date.now() };
    setNotifs(prev => {
      if (prev.find(n => n.id === full.id)) return prev;
      return [...prev, full];
    });
    setTimeout(() => dismiss(notif.id), 8000);
  }, [dismiss]);

  // ── Visitor notifications (analytics_sessions) ─────────────────────────────
  useEffect(() => {
    // Load existing sessions on mount (no notification)
    supabase
      .from('analytics_sessions')
      .select('id, user_id_anon, device_type, browser, current_page')
      .order('last_heartbeat', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        (data || []).forEach((s: any) => knownSessions.current.add(s.user_id_anon));
        firstLoadVisitors.current = false;
      });

    const channel = supabase
      .channel('admin-notif-visitors')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'analytics_sessions',
      }, (payload) => {
        if (firstLoadVisitors.current) return;
        const s = payload.new as any;
        if (knownSessions.current.has(s.user_id_anon)) return;
        knownSessions.current.add(s.user_id_anon);
        push({
          id: `visitor-${s.user_id_anon}-${s.id}`,
          type: 'visitor',
          title: 'Novo visitante no site',
          subtitle: [s.browser, s.device_type].filter(Boolean).join(' · ') || 'Visitante',
          detail: s.current_page || undefined,
          onAction: onNavigate ? () => onNavigate('conversas') : undefined,
          actionLabel: 'Ver visitantes →',
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [push, onNavigate]);

  // ── Chat notifications (chat_sessions) ────────────────────────────────────
  useEffect(() => {
    // Load existing chat sessions on mount (no notification)
    supabase
      .from('chat_sessions')
      .select('session_id, last_activity')
      .order('last_activity', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        (data || []).forEach((s: any) => {
          knownChats.current.add(s.session_id);
          knownChatActivity.current.set(s.session_id, new Date(s.last_activity).getTime());
        });
        firstLoadChats.current = false;
      });

    const channel = supabase
      .channel('admin-notif-chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions',
      }, (payload) => {
        if (firstLoadChats.current) return;
        const s = payload.new as any;
        const activityMs = new Date(s.last_activity).getTime();
        const isNew = !knownChats.current.has(s.session_id);
        const prevActivity = knownChatActivity.current.get(s.session_id);
        const hasNewMsg = !isNew && prevActivity !== undefined && activityMs > prevActivity && (Date.now() - activityMs) < 30_000;

        knownChats.current.add(s.session_id);
        knownChatActivity.current.set(s.session_id, activityMs);

        if (isNew || hasNewMsg) {
          const notifId = `chat-${s.session_id}-${activityMs}`;
          const sessionId = s.session_id;

          // Fetch last message to show preview
          supabase
            .from('chat_messages')
            .select('content, role')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data: msgs }) => {
              const lastMsg = msgs?.[0];
              const lastMessage = lastMsg?.role === 'user'
                ? lastMsg.content
                : lastMsg?.role === 'admin'
                ? `Você: ${lastMsg.content}`
                : lastMsg?.content;

              push({
                id: notifId,
                type: 'chat',
                title: isNew ? 'Nova conversa iniciada' : 'Nova mensagem recebida',
                subtitle: [s.browser, s.os].filter(Boolean).join(' · ') || 'Visitante',
                lastMessage,
                onAction: onOpenChat
                  ? () => onOpenChat(sessionId)
                  : onNavigate
                  ? () => onNavigate('conversas')
                  : undefined,
                actionLabel: 'Abrir conversa →',
              });
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [push, onNavigate]);

  if (notifs.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifs.map(notif => (
        <div
          key={notif.id}
          className="pointer-events-auto flex items-start gap-3 bg-white border shadow-xl rounded-xl px-4 py-3 w-80 animate-in slide-in-from-right-4 duration-300"
          style={{ borderColor: notif.type === 'visitor' ? '#bbf7d0' : '#c7d2fe' }}
        >
          <div
            className="shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: notif.type === 'visitor' ? '#dcfce7' : '#e0e7ff' }}
          >
            {notif.type === 'visitor'
              ? <Users className="w-4 h-4 text-emerald-600" />
              : <MessageCircle className="w-4 h-4 text-indigo-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
              {notif.subtitle}
            </p>
            {notif.lastMessage && (
              <p className="text-xs text-gray-700 mt-1 line-clamp-2 leading-snug">"{notif.lastMessage}"</p>
            )}
            {!notif.lastMessage && notif.detail && (
              <p className="text-xs text-gray-400 truncate">{notif.detail}</p>
            )}
            {notif.onAction && (
              <button
                onClick={() => { notif.onAction!(); dismiss(notif.id); }}
                className="mt-2 text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors"
                style={{ color: notif.type === 'visitor' ? '#059669' : '#4338ca', background: notif.type === 'visitor' ? '#f0fdf4' : '#eef2ff' }}
              >
                {notif.actionLabel}
              </button>
            )}
          </div>
          <button onClick={() => dismiss(notif.id)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
