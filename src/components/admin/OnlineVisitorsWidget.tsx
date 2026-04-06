import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, X, Monitor, Smartphone, Tablet,
  MapPin, Globe, ChevronLeft, MousePointer, ArrowUpRight, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveChatSession {
  session_id: string;
  last_activity: string;
  message_count: number;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  first_page: string | null;
  is_manual_mode: boolean;
}

interface OnlineSession {
  id: string;
  user_id_anon: string;
  current_page: string | null;
  last_heartbeat: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  identified_name: string | null;
  identified_email: string | null;
  is_new_visitor: boolean;
  converted: boolean;
  pages_per_session: number;
  session_duration_seconds: number;
  referer_domain: string | null;
}

interface PageView {
  id: string;
  page_path: string;
  page_title: string | null;
  viewed_at: string;
  time_on_page_seconds: number | null;
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOnline(hb: string | null) {
  if (!hb) return false;
  return Date.now() - new Date(hb).getTime() < 5 * 60 * 1000;
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}

function formatDur(sec: number) {
  if (!sec || sec < 1) return '< 1s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function pageLabel(path: string | null) {
  if (!path) return '—';
  if (path === '/') return 'Página inicial';
  if (path.startsWith('/passeio/')) return `Passeio: ${path.replace('/passeio/', '').replace(/-/g, ' ')}`;
  return path;
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (type === 'tablet') return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

// ─── Visitor detail ───────────────────────────────────────────────────────────

function VisitorDetail({
  session,
  onBack,
  onOpenChat,
}: {
  session: OnlineSession;
  onBack: () => void;
  onOpenChat?: (sessionId: string) => void;
}) {
  const [pageviews, setPageviews] = useState<PageView[]>([]);
  const [starting, setStarting] = useState(false);
  const identified = session.identified_name || session.identified_email;
  const label = identified || `Visitante ${session.user_id_anon.slice(-6)}`;

  useEffect(() => {
    supabase
      .from('analytics_pageviews' as any)
      .select('*, analytics_sessions!inner(user_id_anon)')
      .eq('analytics_sessions.user_id_anon', session.user_id_anon)
      .order('viewed_at', { ascending: false })
      .limit(20)
      .then(({ data }: any) => setPageviews(data || []));
  }, [session.user_id_anon]);

  const startChat = async () => {
    setStarting(true);

    // Check for existing active session for this visitor (avoid duplicates)
    const recentCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('session_id')
      .eq('visitor_anon_id', session.user_id_anon)
      .gte('last_activity', recentCutoff)
      .order('last_activity', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.session_id) {
      // Re-use existing session
      if (onOpenChat) onOpenChat(existing.session_id);
      setStarting(false);
      onBack();
      return;
    }

    // Create a new chat_session in manual mode
    const newSessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from('chat_sessions').insert({
      session_id: newSessionId,
      visitor_anon_id: session.user_id_anon,
      is_manual_mode: true,
      first_page: session.current_page,
      device_type: session.device_type,
      browser: session.browser,
      os: session.os,
      started_at: now,
      last_activity: now,
      message_count: 0,
    });
    if (error) {
      console.error('Erro ao criar chat_session:', error);
      setStarting(false);
      return;
    }

    // Notify visitor's AIChatWidget via broadcast
    await supabase.channel(`visitor-notify-${session.user_id_anon}`)
      .send({ type: 'broadcast', event: 'chat_started', payload: { session_id: newSessionId } });

    if (onOpenChat) onOpenChat(newSessionId);
    setStarting(false);
    onBack();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{pageLabel(session.current_page)}</p>
        </div>
        {isOnline(session.last_heartbeat) && (
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Identity */}
        {identified && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            {session.identified_name && <p className="text-sm font-medium">{session.identified_name}</p>}
            {session.identified_email && <p className="text-xs text-muted-foreground">{session.identified_email}</p>}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Páginas', value: session.pages_per_session },
            { label: 'Tempo', value: formatDur(session.session_duration_seconds) },
            { label: 'Conversão', value: session.converted ? '✓' : '—' },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-primary">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Device + location */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <DeviceIcon type={session.device_type} />
            <span>{[session.browser, session.os, session.device_type].filter(Boolean).join(' · ')}</span>
          </div>
          {session.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{session.city}{session.country ? `, ${session.country}` : ''}</span>
            </div>
          )}
          {session.referer_domain && (
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{session.referer_domain}</span>
            </div>
          )}
          {session.is_new_visitor && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              <span>Novo visitante</span>
            </div>
          )}
        </div>

        {/* Page history */}
        {pageviews.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Páginas visitadas</p>
            <div className="space-y-1">
              {pageviews.slice(0, 8).map(pv => (
                <div key={pv.id} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-muted/40 text-xs">
                  <MousePointer className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{pageLabel(pv.page_path)}</span>
                  {pv.time_on_page_seconds != null && pv.time_on_page_seconds > 0 && (
                    <span className="text-muted-foreground shrink-0">{formatDur(pv.time_on_page_seconds)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Iniciar conversa CTA */}
        <Button onClick={startChat} disabled={starting} size="sm" className="w-full">
          <MessageCircle className="w-3.5 h-3.5 mr-2" />
          {starting ? 'Iniciando...' : 'Iniciar conversa'}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground -mt-2">
          Abre um chat direto no dispositivo do visitante
        </p>
      </div>
    </div>
  );
}

// ─── Chat session row ─────────────────────────────────────────────────────────

function ChatSessionRow({ session, onClick }: { session: ActiveChatSession; onClick: () => void }) {
  const isRecent = Date.now() - new Date(session.last_activity).getTime() < 5 * 60 * 1000;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/50 last:border-0"
    >
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-indigo-500" />
        </div>
        {isRecent && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
        )}
        {session.is_manual_mode && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-800">
          #{session.session_id.slice(-8)}
          {session.is_manual_mode && (
            <span className="ml-1.5 text-[9px] bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5">manual</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {session.first_page || '/'} · {session.message_count} msg
        </p>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        <DeviceIcon type={session.device_type} />
        <span className="text-xs">{timeAgo(session.last_activity)}</span>
      </div>
    </button>
  );
}

// ─── Visitor row ──────────────────────────────────────────────────────────────

function VisitorRow({ session, onClick }: { session: OnlineSession; onClick: () => void }) {
  const identified = session.identified_name || session.identified_email;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/50 last:border-0">
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">
            {(identified || session.user_id_anon).charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {identified || `Visitante ${session.user_id_anon.slice(-6)}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{pageLabel(session.current_page)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        <DeviceIcon type={session.device_type} />
        <span className="text-xs">{timeAgo(session.last_heartbeat)}</span>
      </div>
    </button>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

function getReadCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('chat_read_counts') || '{}'); } catch { return {}; }
}

export function OnlineVisitorsWidget({ onOpenChat }: { onOpenChat?: (sessionId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<OnlineSession[]>([]);
  const [chatSessions, setChatSessions] = useState<ActiveChatSession[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<OnlineSession | null>(null);

  const fetchOnline = useCallback(async () => {
    // Analytics visitors (browsing now — heartbeat < 5min, exclude admin/auth pages)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await (supabase.from('analytics_sessions' as any) as any)
      .select('*')
      .gte('last_heartbeat', cutoff)
      .order('last_heartbeat', { ascending: false })
      .limit(50);

    const seen = new Set<string>();
    const unique: OnlineSession[] = [];
    for (const s of (data || [])) {
      const page: string = s.current_page || '';
      if (page.startsWith('/admin') || page.startsWith('/auth')) continue;
      if (!seen.has(s.user_id_anon)) { seen.add(s.user_id_anon); unique.push(s); }
    }
    setSessions(unique);

    // Recent chat sessions (last 15min) + unread count
    const chatCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: chatData } = await supabase
      .from('chat_sessions')
      .select('session_id, last_activity, message_count, browser, os, device_type, first_page, is_manual_mode')
      .gte('last_activity', chatCutoff)
      .order('last_activity', { ascending: false })
      .limit(30);
    const chats = (chatData as ActiveChatSession[]) ?? [];
    setChatSessions(chats);

    const reads = getReadCounts();
    let unread = 0;
    for (const s of chats) {
      const read = reads[s.session_id] ?? 0;
      unread += Math.max(0, s.message_count - read);
    }
    setUnreadCount(unread);
  }, []);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 30_000);
    const ch = supabase.channel('widget-online-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_sessions' }, fetchOnline)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, fetchOnline)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [fetchOnline]);

  // Close panel on outside click
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = sessions.length;
  const totalActivity = count + chatSessions.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); if (open) setSelected(null); }}
        className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all border ${
          totalActivity > 0
            ? 'bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20'
            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
        }`}
      >
        {totalActivity > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />}
        <Users className="w-3.5 h-3.5" />
        <span>
          {totalActivity === 0 ? 'Ninguém online'
            : count > 0 && chatSessions.length > 0 ? `${count} online · ${chatSessions.length} conv`
            : count > 0 ? `${count} online`
            : `${chatSessions.length} conversando`}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden z-50 flex flex-col"
          style={{ maxHeight: '560px' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            {!selected && (
              <>
                <div>
                  <p className="text-sm font-semibold">Atividade ao vivo</p>
                  <p className="text-xs text-muted-foreground">{count} navegando · {chatSessions.length} conversas recentes</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Body */}
          {selected ? (
            <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
              <VisitorDetail session={selected} onBack={() => setSelected(null)} onOpenChat={onOpenChat} />
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {/* Online visitors */}
              {count > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Navegando agora
                    </p>
                  </div>
                  {sessions.map(s => (
                    <VisitorRow key={s.user_id_anon} session={s} onClick={() => setSelected(s)} />
                  ))}
                </>
              )}

              {/* Recent chat sessions */}
              {chatSessions.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircle className="w-3 h-3 text-indigo-400" />
                      Conversas recentes
                    </p>
                  </div>
                  {chatSessions.map(s => {
                    const reads = getReadCounts();
                    const unread = Math.max(0, s.message_count - (reads[s.session_id] ?? 0));
                    const isRecent = Date.now() - new Date(s.last_activity).getTime() < 5 * 60 * 1000;
                    return (
                      <button
                        key={s.session_id}
                        onClick={() => { if (onOpenChat) { onOpenChat(s.session_id); setOpen(false); } }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/50 last:border-0"
                      >
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-indigo-500" />
                          </div>
                          {isRecent && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            #{s.session_id.slice(-8)}
                            {s.is_manual_mode && <span className="ml-1.5 text-[9px] bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 font-normal">manual</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{s.first_page || '/'} · {s.message_count} msg</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-xs ${unread > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>{timeAgo(s.last_activity)}</span>
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                              {unread}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {totalActivity === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade no momento</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
