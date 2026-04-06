import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, MessageCircle, ChevronDown } from 'lucide-react';

const ANON_KEY = 'analytics_anon_id';
const ACTIVE_CHAT_KEY = 'live_chat_active_session_id';

function getAnonId(): string | null {
  return localStorage.getItem(ANON_KEY);
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  created_at: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function LiveChatPopup() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const anonId = getAnonId();

  // ── Restore active session from sessionStorage ──────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem(ACTIVE_CHAT_KEY);
    if (saved) setSessionId(saved);
  }, []);

  // ── Listen for admin initiating chat via Realtime broadcast ─────────────────
  useEffect(() => {
    if (!anonId) return;

    const channel = supabase
      .channel(`visitor-notify-${anonId}`)
      .on('broadcast', { event: 'chat_started' }, (payload) => {
        const sid: string = payload.payload?.session_id;
        if (!sid) return;
        sessionStorage.setItem(ACTIVE_CHAT_KEY, sid);
        setSessionId(sid);
        setOpen(true);
        setUnread(0);
      })
      .on('broadcast', { event: 'chat_closed' }, () => {
        sessionStorage.removeItem(ACTIVE_CHAT_KEY);
        setSessionId(null);
        setMessages([]);
        setOpen(false);
        setUnread(0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [anonId]);

  // ── Load messages + subscribe when sessionId is set ─────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    supabase
      .from('chat_messages')
      .select('id, session_id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const msgs = data as ChatMessage[];
          setMessages(msgs);
          if (!open) {
            setUnread(msgs.filter(m => m.role === 'admin').length);
          }
        }
      });

    const channel = supabase
      .channel(`livechat-msgs-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        // Only show admin messages (not the visitor's own, not AI)
        if (msg.role === 'user') return;
        setMessages(prev => [...prev, msg]);
        setOpen(prev => {
          if (!prev) setUnread(u => u + 1);
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setUnread(0);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic
    const optimisticMsg: ChatMessage = {
      id: `opt-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content,
    });

    setSending(false);
  };

  if (!sessionId) return null;

  // ── Minimized button ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-2xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7C12D1, #9333ea)' }}
      >
        <MessageCircle className="w-4 h-4" />
        Equipe Camaleão
        {unread > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ── Open chat panel ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-24 right-5 z-50 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: '420px', background: '#fff', border: '1px solid rgba(139,92,246,0.2)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #7C12D1, #9333ea)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Equipe Camaleão</p>
            <p className="text-white/70 text-xs mt-0.5">Camaleão Ecoturismo</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: '#fafafa' }}>
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-4">Conversa iniciada. Aguarde...</p>
        )}
        {messages.map(msg => {
          const isMe = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug"
                style={
                  isMe
                    ? { background: 'linear-gradient(135deg, #7C12D1, #9333ea)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4 }
                }
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-0.5 text-right ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2" style={{ background: '#fff' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Escreva uma mensagem..."
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #7C12D1, #9333ea)' }}
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
