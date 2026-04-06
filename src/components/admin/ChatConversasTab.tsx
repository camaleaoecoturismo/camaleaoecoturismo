import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Smartphone, Tablet, Globe, Clock, MessageCircle, Send, UserCheck, Bot } from 'lucide-react';

interface ChatSession {
  id: string;
  session_id: string;
  tour_slug: string | null;
  started_at: string;
  last_activity: string;
  message_count: number;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  referrer: string | null;
  first_page: string | null;
  is_manual_mode: boolean;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  tour_slugs: string[] | null;
  options: string[] | null;
  created_at: string;
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
  if (type === 'tablet') return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

function isOnline(lastActivity: string): boolean {
  return Date.now() - new Date(lastActivity).getTime() < 5 * 60 * 1000;
}

export default function ChatConversasTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [sendingAdmin, setSendingAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminInputRef = useRef<HTMLInputElement>(null);

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(100);
    setSessions((data as ChatSession[]) ?? []);
    setLoadingSessions(false);
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
    setLoadingMessages(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime: sessions list
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  // Realtime: messages for selected session + sync is_manual_mode
  useEffect(() => {
    if (!selectedSession) return;

    fetchMessages(selectedSession.session_id);

    const msgsChannel = supabase
      .channel(`admin-msgs-${selectedSession.session_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${selectedSession.session_id}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => {
            // Skip if we already have an optimistic message with same content+role+approx time
            const isDuplicate = prev.some(
              (m) => m.id.startsWith('optimistic-') && m.role === incoming.role && m.content === incoming.content
            );
            if (isDuplicate) {
              // Replace optimistic with real DB row
              return prev.map((m) =>
                m.id.startsWith('optimistic-') && m.role === incoming.role && m.content === incoming.content
                  ? incoming
                  : m
              );
            }
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`admin-session-${selectedSession.session_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `session_id=eq.${selectedSession.session_id}` },
        (payload) => {
          setSelectedSession((prev) => prev ? { ...prev, is_manual_mode: payload.new.is_manual_mode } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [selectedSession?.session_id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when taking over
  useEffect(() => {
    if (selectedSession?.is_manual_mode) {
      setTimeout(() => adminInputRef.current?.focus(), 100);
    }
  }, [selectedSession?.is_manual_mode]);

  const handleTakeover = async () => {
    if (!selectedSession) return;
    await supabase
      .from('chat_sessions')
      .update({ is_manual_mode: true })
      .eq('session_id', selectedSession.session_id);
    setSelectedSession((prev) => prev ? { ...prev, is_manual_mode: true } : prev);
  };

  const handleReleaseToAI = async () => {
    if (!selectedSession) return;
    await supabase
      .from('chat_sessions')
      .update({ is_manual_mode: false })
      .eq('session_id', selectedSession.session_id);
    setSelectedSession((prev) => prev ? { ...prev, is_manual_mode: false } : prev);
  };

  const handleSendAdmin = async () => {
    const text = adminInput.trim();
    if (!text || !selectedSession || sendingAdmin) return;
    setSendingAdmin(true);
    setAdminInput('');

    const now = new Date().toISOString();
    const optimisticId = `optimistic-${Date.now()}`;

    // Show immediately (don't wait for realtime)
    setMessages((prev) => [...prev, {
      id: optimisticId,
      session_id: selectedSession.session_id,
      role: 'admin' as const,
      content: text,
      tour_slugs: null,
      options: null,
      created_at: now,
    }]);

    const { error } = await supabase.from('chat_messages').insert({
      session_id: selectedSession.session_id,
      role: 'admin',
      content: text,
      created_at: now,
    });

    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }

    setSendingAdmin(false);
    adminInputRef.current?.focus();
  };

  const handleAdminKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAdmin();
    }
  };

  const manualMode = selectedSession?.is_manual_mode ?? false;
  const online = selectedSession ? isOnline(selectedSession.last_activity) : false;

  return (
    <div className="flex h-[calc(100vh-120px)] border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Session list */}
      <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">Conversas da Camila</h2>
          <p className="text-xs text-gray-500">{sessions.length} sessões registradas</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loadingSessions ? (
            <div className="p-6 text-center text-sm text-gray-400">Carregando...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma conversa registrada</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = selectedSession?.session_id === session.session_id;
              const online = isOnline(session.last_activity);
              return (
                <button
                  key={session.session_id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left px-4 py-3 hover:bg-white transition-colors flex items-start gap-3 ${isSelected ? 'bg-white border-l-2 border-emerald-500' : ''}`}
                >
                  <div className={`relative mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                    <DeviceIcon type={session.device_type} />
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-mono font-medium text-gray-700 truncate">
                        #{session.session_id.slice(-8)}
                        {session.is_manual_mode && (
                          <span className="ml-1 text-[9px] bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5">manual</span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                        {formatRelativeTime(session.last_activity)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{session.first_page ?? '/'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">{session.browser ?? 'N/A'} · {session.os ?? 'N/A'}</span>
                      <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-1.5 py-0.5">
                        {session.message_count} msg
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation detail */}
      {!selectedSession ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
          <MessageCircle className="w-12 h-12 text-gray-200" />
          <p className="text-sm">Selecione uma conversa para visualizar</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-5 py-3 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative">
                    <DeviceIcon type={selectedSession.device_type} />
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 font-mono">
                    #{selectedSession.session_id.slice(-8)}
                  </span>
                  {online && (
                    <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">online</span>
                  )}
                  {selectedSession.tour_slug && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5">
                      {selectedSession.tour_slug}
                    </span>
                  )}
                  {manualMode && (
                    <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" /> Modo manual
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {selectedSession.browser && <span>{selectedSession.browser}</span>}
                  {selectedSession.os && <span>{selectedSession.os}</span>}
                  {selectedSession.screen_width && (
                    <span>{selectedSession.screen_width}×{selectedSession.screen_height}</span>
                  )}
                  {selectedSession.language && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />{selectedSession.language}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(selectedSession.started_at)} {formatTime(selectedSession.started_at)}</span>
                </div>
                {/* Takeover / Release button */}
                {!manualMode ? (
                  <button
                    onClick={handleTakeover}
                    className="flex items-center gap-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Assumir conversa
                  </button>
                ) : (
                  <button
                    onClick={handleReleaseToAI}
                    className="flex items-center gap-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Devolver à IA
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages — WhatsApp style */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
            style={{ background: 'linear-gradient(to bottom, #e5ddd5 0%, #ece5dd 100%)' }}
          >
            {loadingMessages ? (
              <div className="text-center text-sm text-gray-500 pt-8">Carregando mensagens...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 pt-8">Nenhuma mensagem nesta sessão</div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="text-[11px] bg-white/80 text-gray-500 rounded-full px-3 py-0.5 shadow-sm">
                    {formatDate(messages[0].created_at)}
                  </span>
                </div>

                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isAdmin = msg.role === 'admin';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm text-sm leading-relaxed ${
                          isUser
                            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-sm'
                            : isAdmin
                            ? 'bg-purple-500 text-white rounded-tl-sm'
                            : 'bg-white text-gray-900 rounded-tl-sm'
                        }`}
                      >
                        {isAdmin && (
                          <p className="text-[9px] font-semibold text-purple-200 mb-0.5 uppercase tracking-wide">Você (atendente)</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Tour slugs */}
                        {msg.tour_slugs && msg.tour_slugs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {msg.tour_slugs.map((slug) => (
                              <span key={slug} className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                                {slug}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Options chosen by user */}
                        {msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {msg.options.map((opt) => (
                              <span key={opt} className="text-[10px] border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 bg-white/60">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className={`text-[10px] mt-1 text-right ${isUser ? 'text-green-700/60' : isAdmin ? 'text-purple-200' : 'text-gray-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Admin message input — only in manual mode */}
          {manualMode && (
            <div className="px-4 py-3 border-t border-purple-200 bg-purple-50 shrink-0">
              <p className="text-[10px] text-purple-500 font-medium mb-2 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Modo manual ativo — suas mensagens vão diretamente para o usuário
              </p>
              <div className="flex gap-2">
                <input
                  ref={adminInputRef}
                  type="text"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  onKeyDown={handleAdminKeyDown}
                  placeholder="Digite sua mensagem para o usuário..."
                  disabled={sendingAdmin}
                  className="flex-1 text-sm border border-purple-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendAdmin}
                  disabled={!adminInput.trim() || sendingAdmin}
                  className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                  aria-label="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
