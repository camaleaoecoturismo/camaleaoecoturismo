import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Monitor, Smartphone, Tablet, Globe, MapPin, Clock, Eye,
  RefreshCw, ChevronDown, ChevronUp, User, Search, ExternalLink,
  Wifi, WifiOff, MousePointer, ArrowUpRight, Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  user_id_anon: string;
  current_page: string | null;
  last_heartbeat: string | null;
  first_visit_at: string;
  last_visit_at: string;
  session_duration_seconds: number;
  pages_per_session: number;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  referer_domain: string | null;
  full_referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_new_visitor: boolean;
  converted: boolean;
  conversion_goal: string | null;
  identified_name: string | null;
  identified_email: string | null;
  identified_phone: string | null;
  cliente_id: string | null;
}

interface PageView {
  id: string;
  page_path: string;
  page_title: string | null;
  viewed_at: string;
  time_on_page_seconds: number | null;
  scroll_depth_percent: number | null;
  clicked_main_cta: boolean | null;
  cta_type: string | null;
}

interface VisitorHistory {
  sessions: Session[];
  pageviews: PageView[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOnline(heartbeat: string | null): boolean {
  if (!heartbeat) return false;
  return Date.now() - new Date(heartbeat).getTime() < 2 * 60 * 1000; // 2 min
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec: number): string {
  if (!sec || sec < 1) return '< 1s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 10) return 'agora';
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function pageLabel(path: string | null): string {
  if (!path) return '—';
  const labels: Record<string, string> = {
    '/': 'Página inicial',
    '/passeios': 'Passeios',
    '/sobre': 'Sobre nós',
    '/contato': 'Contato',
  };
  if (labels[path]) return labels[path];
  if (path.startsWith('/passeio/')) return `Passeio: ${path.replace('/passeio/', '').replace(/-/g, ' ')}`;
  return path;
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="h-4 w-4" />;
  if (type === 'tablet') return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function sourceLabel(session: Session): string {
  if (session.utm_source) return `${session.utm_source}${session.utm_medium ? ` / ${session.utm_medium}` : ''}`;
  if (session.referer_domain) return session.referer_domain;
  return 'Direto';
}

// ─── VisitorCard ─────────────────────────────────────────────────────────────

function VisitorCard({
  session,
  onClick,
  selected,
}: {
  session: Session;
  onClick: () => void;
  selected: boolean;
}) {
  const online = isOnline(session.last_heartbeat);
  const identified = session.identified_name || session.identified_email;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar / status */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            identified ? 'bg-primary/15' : 'bg-muted'
          }`}>
            <User className={`h-4 w-4 ${identified ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
            online ? 'bg-green-500' : 'bg-muted-foreground/40'
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {identified || `Visitante ${session.user_id_anon.slice(-6)}`}
            </span>
            {session.converted && (
              <Badge className="text-[10px] py-0 px-1.5 bg-green-500/15 text-green-700 border-green-200">
                Reservou
              </Badge>
            )}
            {session.is_new_visitor && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Novo</Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DeviceIcon type={session.device_type} />
              {session.browser} · {session.device_type}
            </span>
            {session.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{session.city}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            {online ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Online agora
                {session.current_page && ` · ${pageLabel(session.current_page)}`}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(session.last_visit_at)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {session.pages_per_session} pág.
            </span>
            <span>{formatDuration(session.session_duration_seconds)}</span>
          </div>
        </div>

        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${selected ? 'rotate-180' : ''}`} />
      </div>
    </button>
  );
}

// ─── VisitorDetail ─────────────────────────────────────────────────────────

function VisitorDetail({ anonId }: { anonId: string }) {
  const [history, setHistory] = useState<VisitorHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase
        .from('analytics_sessions')
        .select('*')
        .eq('user_id_anon', anonId)
        .order('first_visit_at', { ascending: false })
        .limit(20),
      supabase
        .from('analytics_pageviews')
        .select('*, analytics_sessions!inner(user_id_anon)')
        .eq('analytics_sessions.user_id_anon', anonId)
        .order('viewed_at', { ascending: false })
        .limit(100),
    ]).then(([sessRes, pvRes]) => {
      setHistory({
        sessions: (sessRes.data || []) as Session[],
        pageviews: (pvRes.data || []) as PageView[],
      });
      setLoading(false);
    });
  }, [anonId]);

  if (loading) return <div className="py-6 text-center text-sm text-muted-foreground">Carregando histórico...</div>;
  if (!history) return null;

  const latest = history.sessions[0];
  const totalTime = history.sessions.reduce((a, s) => a + (s.session_duration_seconds || 0), 0);
  const totalPages = history.sessions.reduce((a, s) => a + (s.pages_per_session || 0), 0);

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-4">
      {/* Identity */}
      {(latest?.identified_name || latest?.identified_email || latest?.identified_phone) && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Identificado</p>
          {latest.identified_name && <p className="text-sm font-medium">{latest.identified_name}</p>}
          {latest.identified_email && <p className="text-sm text-muted-foreground">{latest.identified_email}</p>}
          {latest.identified_phone && <p className="text-sm text-muted-foreground">{latest.identified_phone}</p>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Visitas', value: history.sessions.length },
          { label: 'Páginas vistas', value: totalPages },
          { label: 'Tempo total', value: formatDuration(totalTime) },
          { label: 'Conversão', value: history.sessions.some(s => s.converted) ? '✓ Sim' : 'Não' },
        ].map(s => (
          <div key={s.label} className="bg-muted/40 rounded-lg p-2 text-center">
            <div className="text-base font-bold text-primary">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Device + source */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/30 rounded-lg p-2 space-y-1">
          <p className="font-medium text-muted-foreground">Dispositivo</p>
          <p className="flex items-center gap-1"><DeviceIcon type={latest?.device_type} /> {latest?.device_type} · {latest?.browser} · {latest?.os}</p>
          {latest?.city && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{latest.city}, {latest.country}</p>}
        </div>
        <div className="bg-muted/30 rounded-lg p-2 space-y-1">
          <p className="font-medium text-muted-foreground">Origem</p>
          <p className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{sourceLabel(latest)}</p>
          {latest?.utm_campaign && <p className="text-muted-foreground">Campanha: {latest.utm_campaign}</p>}
          {latest?.full_referrer && (
            <a href={latest.full_referrer} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline truncate">
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{latest.full_referrer}</span>
            </a>
          )}
        </div>
      </div>

      {/* Page history */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Páginas visitadas</p>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {history.pageviews.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma página registrada ainda.</p>
          ) : (
            history.pageviews.map(pv => (
              <div key={pv.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/40 text-xs">
                <MousePointer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{pageLabel(pv.page_path)}</span>
                  <span className="text-muted-foreground">{pv.page_path}</span>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  {pv.time_on_page_seconds != null && pv.time_on_page_seconds > 0 && (
                    <div className="text-muted-foreground">{formatDuration(pv.time_on_page_seconds)}</div>
                  )}
                  {pv.scroll_depth_percent != null && pv.scroll_depth_percent > 0 && (
                    <div className="text-muted-foreground">{pv.scroll_depth_percent}% scroll</div>
                  )}
                  {pv.clicked_main_cta && (
                    <Badge className="text-[9px] py-0 px-1 bg-orange-100 text-orange-700 border-orange-200">CTA</Badge>
                  )}
                </div>
                <div className="shrink-0 text-muted-foreground">{formatTime(pv.viewed_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sessions list */}
      {history.sessions.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico de sessões</p>
          <div className="space-y-1">
            {history.sessions.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{formatTime(s.first_visit_at)}</span>
                <span className="flex-1 text-muted-foreground">
                  {s.pages_per_session} pág. · {formatDuration(s.session_duration_seconds)}
                </span>
                {s.converted && <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200 py-0 px-1">Reservou</Badge>}
                {i === 0 && <Badge variant="outline" className="text-[9px] py-0 px-1">Atual</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AnalyticsVisitantes() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnon, setSelectedAnon] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'identified' | 'converted'>('all');
  const [onlineCount, setOnlineCount] = useState(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('analytics_sessions')
      .select('*')
      .order('last_visit_at', { ascending: false })
      .limit(200);

    const rows = (data || []) as Session[];
    setSessions(rows);
    setOnlineCount(rows.filter(s => isOnline(s.last_heartbeat)).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();

    // Real-time subscription for session updates
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics_sessions',
      }, () => {
        fetchSessions();
      })
      .subscribe();

    // Refresh every 30s to keep online status accurate
    const interval = setInterval(fetchSessions, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchSessions]);

  // Deduplicate: one entry per visitor (latest session per user_id_anon)
  const uniqueVisitors = Object.values(
    sessions.reduce<Record<string, Session>>((acc, s) => {
      if (!acc[s.user_id_anon] || s.last_visit_at > acc[s.user_id_anon].last_visit_at) {
        acc[s.user_id_anon] = s;
      }
      return acc;
    }, {})
  ).sort((a, b) => {
    // Online first, then by last visit
    const aOnline = isOnline(a.last_heartbeat) ? 1 : 0;
    const bOnline = isOnline(b.last_heartbeat) ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    return new Date(b.last_visit_at).getTime() - new Date(a.last_visit_at).getTime();
  });

  const filtered = uniqueVisitors.filter(s => {
    if (filter === 'online' && !isOnline(s.last_heartbeat)) return false;
    if (filter === 'identified' && !s.identified_name && !s.identified_email) return false;
    if (filter === 'converted' && !s.converted) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (s.identified_name || '').toLowerCase().includes(q) ||
        (s.identified_email || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        s.user_id_anon.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Visitantes</h2>
          <p className="text-sm text-muted-foreground">Rastreamento em tempo real de quem está no site</p>
        </div>
        <div className="flex items-center gap-2">
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">{onlineCount} online agora</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, cidade..."
            className="pl-9 h-9"
          />
        </div>
        {(['all', 'online', 'identified', 'converted'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-primary' : ''}
          >
            {{ all: 'Todos', online: '🟢 Online', identified: 'Identificados', converted: 'Reservaram' }[f]}
          </Button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Visitantes únicos', value: uniqueVisitors.length, icon: <User className="h-4 w-4" /> },
          { label: 'Online agora', value: onlineCount, icon: <Wifi className="h-4 w-4" /> },
          { label: 'Identificados', value: uniqueVisitors.filter(s => s.identified_name || s.identified_email).length, icon: <Eye className="h-4 w-4" /> },
          { label: 'Converteram', value: uniqueVisitors.filter(s => s.converted).length, icon: <Globe className="h-4 w-4" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
            <div className="text-primary">{stat.icon}</div>
            <div>
              <div className="text-xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Visitor list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando visitantes...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum visitante encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(session => (
            <div key={session.user_id_anon}>
              <VisitorCard
                session={session}
                selected={selectedAnon === session.user_id_anon}
                onClick={() => setSelectedAnon(
                  selectedAnon === session.user_id_anon ? null : session.user_id_anon
                )}
              />
              {selectedAnon === session.user_id_anon && (
                <div className="mx-2 px-4 pb-4 bg-card border border-t-0 border-border rounded-b-xl -mt-1">
                  <VisitorDetail anonId={session.user_id_anon} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
