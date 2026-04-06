import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Smartphone, Tablet, Globe, Clock, MessageCircle, ChevronRight, RefreshCw } from 'lucide-react';

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
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
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

function sessionLabel(session: ChatSession): string {
  const id = session.session_id.slice(-8);
  const page = session.first_page ?? '/';
  return `#${id} · ${page}`;
}

export default function ChatConversasTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(100);
    setSessions((data as ChatSession[]) ?? []);
    setLoadingSessions(false);
  };

  const fetchMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
    setLoadingMessages(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.session_id);
    }
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-120px)] border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Session list */}
      <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Conversas da Camila</h2>
            <p className="text-xs text-gray-500">{sessions.length} sessões registradas</p>
          </div>
          <button
            onClick={fetchSessions}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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
              return (
                <button
                  key={session.session_id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left px-4 py-3 hover:bg-white transition-colors flex items-start gap-3 ${isSelected ? 'bg-white border-l-2 border-emerald-500' : ''}`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                    <DeviceIcon type={session.device_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-mono font-medium text-gray-700 truncate">
                        #{session.session_id.slice(-8)}
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
          {/* Client info header */}
          <div className="border-b border-gray-200 bg-white px-5 py-3 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DeviceIcon type={selectedSession.device_type} />
                  <span className="text-sm font-semibold text-gray-900 font-mono">
                    #{selectedSession.session_id.slice(-8)}
                  </span>
                  {selectedSession.tour_slug && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5">
                      {selectedSession.tour_slug}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {selectedSession.device_type && (
                    <span className="flex items-center gap-1">
                      <DeviceIcon type={selectedSession.device_type} />
                      {selectedSession.device_type}
                    </span>
                  )}
                  {selectedSession.browser && <span>{selectedSession.browser}</span>}
                  {selectedSession.os && <span>{selectedSession.os}</span>}
                  {selectedSession.screen_width && (
                    <span>{selectedSession.screen_width}×{selectedSession.screen_height}</span>
                  )}
                  {selectedSession.language && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedSession.language}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(selectedSession.started_at)} {formatTime(selectedSession.started_at)}</span>
                </div>
                {selectedSession.first_page && (
                  <p className="text-xs text-gray-400 mt-0.5">Entrou em: {selectedSession.first_page}</p>
                )}
                {selectedSession.referrer && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-48" title={selectedSession.referrer}>
                    Via: {selectedSession.referrer}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages - WhatsApp style */}
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
                {/* Date header */}
                <div className="flex justify-center">
                  <span className="text-[11px] bg-white/80 text-gray-500 rounded-full px-3 py-0.5 shadow-sm">
                    {formatDate(messages[0].created_at)}
                  </span>
                </div>

                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm text-sm leading-relaxed ${
                          isUser
                            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-sm'
                            : 'bg-white text-gray-900 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Tour slugs shown as tags */}
                        {msg.tour_slugs && msg.tour_slugs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {msg.tour_slugs.map((slug) => (
                              <span
                                key={slug}
                                className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 flex items-center gap-0.5"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                                {slug}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Options shown as tags */}
                        {msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {msg.options.map((opt) => (
                              <span
                                key={opt}
                                className="text-[10px] border border-gray-200 text-gray-500 rounded-full px-2 py-0.5"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className={`text-[10px] mt-1 text-right ${isUser ? 'text-green-700/60' : 'text-gray-400'}`}>
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
        </div>
      )}
    </div>
  );
}
