import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, UserCheck, Bot, Monitor, Smartphone, Tablet, Minus, Maximize2 } from 'lucide-react';

interface ChatSession {
  id: string;
  session_id: string;
  tour_slug: string | null;
  started_at: string;
  last_activity: string;
  message_count: number;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  is_manual_mode: boolean;
  first_page: string | null;
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

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
  if (type === 'tablet') return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

function isOnline(lastActivity: string): boolean {
  return Date.now() - new Date(lastActivity).getTime() < 5 * 60 * 1000;
}

export function AdminFloatingChatPanel({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setMessages([]);
      return;
    }
    setLoading(true);
    setAdminInput('');
    setMinimized(false);

    supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()
      .then(({ data }) => {
        if (data) setSession(data as ChatSession);
      });

    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as ChatMessage[]) ?? []);
        setLoading(false);
      });
  }, [sessionId]);

  // Realtime: new messages
  useEffect(() => {
    if (!sessionId) return;

    const msgsChannel = supabase
      .channel(`floating-msgs-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.role === 'admin') return;
        setMessages(prev => [...prev, msg]);
      })
      .subscribe();

    const sessionChannel = supabase
      .channel(`floating-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setSession(prev => prev ? { ...prev, is_manual_mode: payload.new.is_manual_mode } : prev);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId]);

  // Scroll to bottom
  useEffect(() => {
    if (!minimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, minimized]);

  // Focus input when taking manual mode
  useEffect(() => {
    if (session?.is_manual_mode && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [session?.is_manual_mode, minimized]);

  const handleTakeover = async () => {
    if (!session) return;
    await supabase.from('chat_sessions').update({ is_manual_mode: true }).eq('session_id', session.session_id);
    setSession(prev => prev ? { ...prev, is_manual_mode: true } : prev);
  };

  const handleRelease = async () => {
    if (!session) return;
    await supabase.from('chat_sessions').update({ is_manual_mode: false }).eq('session_id', session.session_id);
    setSession(prev => prev ? { ...prev, is_manual_mode: false } : prev);
  };

  const handleSend = async () => {
    const text = adminInput.trim();
    if (!text || !session || sending) return;
    setSending(true);
    setAdminInput('');
    const now = new Date().toISOString();
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: optimisticId,
      session_id: session.session_id,
      role: 'admin',
      content: text,
      tour_slugs: null,
      options: null,
      created_at: now,
    }]);
    const { error } = await supabase.from('chat_messages').insert({
      session_id: session.session_id,
      role: 'admin',
      content: text,
      created_at: now,
    });
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  if (!sessionId) return null;

  const manualMode = session?.is_manual_mode ?? false;
  const online = session ? isOnline(session.last_activity) : false;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col shadow-2xl rounded-2xl overflow-hidden"
      style={{ width: 380, maxHeight: minimized ? 'auto' : 540 }}
    >
      {/* Header — WhatsApp green */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0 cursor-pointer select-none"
        style={{ background: '#075e54' }}
        onClick={() => setMinimized(m => !m)}
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
            {session ? <DeviceIcon type={session.device_type} /> : <Monitor className="w-4 h-4" />}
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 rounded-full" style={{ borderColor: '#075e54' }} />
          )}
        </div>
        <div className="flex-1 min-w-0 text-white">
          <p className="text-sm font-semibold leading-tight">
            Conversa #{sessionId.slice(-8)}
          </p>
          <p className="text-[11px] opacity-70">
            {session ? [session.browser, session.os].filter(Boolean).join(' · ') : 'Carregando...'}
          </p>
        </div>
        <div className="flex items-center gap-1 text-white" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMinimized(m => !m)}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            title={minimized ? 'Expandir' : 'Minimizar'}
          >
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Takeover bar */}
          <div className="px-3 py-2 bg-white border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
            {!manualMode ? (
              <button
                onClick={handleTakeover}
                className="flex items-center gap-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <UserCheck className="w-3 h-3" /> Assumir conversa
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                  <UserCheck className="w-2.5 h-2.5" /> Modo manual
                </span>
                <button
                  onClick={handleRelease}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline transition-colors"
                >
                  Devolver à IA
                </button>
              </div>
            )}
            {online && (
              <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">
                online agora
              </span>
            )}
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
            style={{ background: '#ece5dd', height: 320 }}
          >
            {loading ? (
              <div className="text-center text-xs text-gray-500 pt-8">Carregando mensagens...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-gray-500 pt-8">Nenhuma mensagem ainda</div>
            ) : (
              messages.map(msg => {
                const isUser = msg.role === 'user';
                const isAdminMsg = msg.role === 'admin';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm leading-snug ${
                      isUser
                        ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-sm'
                        : isAdminMsg
                        ? 'bg-purple-500 text-white rounded-tl-sm'
                        : 'bg-white text-gray-900 rounded-tl-sm'
                    }`}>
                      {isAdminMsg && (
                        <p className="text-[9px] font-semibold text-purple-200 mb-0.5 uppercase tracking-wide">Você</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.tour_slugs && msg.tour_slugs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.tour_slugs.map(slug => (
                            <span key={slug} className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">{slug}</span>
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] mt-0.5 text-right ${isUser ? 'text-green-700/60' : isAdminMsg ? 'text-purple-200' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {manualMode ? (
            <div className="px-3 py-2.5 border-t border-gray-200 flex gap-2 items-center shrink-0" style={{ background: '#f0f0f0' }}>
              <input
                ref={inputRef}
                type="text"
                value={adminInput}
                onChange={e => setAdminInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Mensagem..."
                disabled={sending}
                className="flex-1 text-sm border border-gray-300 rounded-full px-3.5 py-2 bg-white focus:outline-none focus:border-green-600 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!adminInput.trim() || sending}
                className="w-9 h-9 rounded-full disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
                style={{ background: '#075e54' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 border-t border-gray-100 text-center shrink-0 bg-white">
              <p className="text-[11px] text-gray-400">Assuma a conversa para enviar mensagens</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
