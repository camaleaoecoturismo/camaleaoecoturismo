import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, MessageCircle, ChevronDown } from 'lucide-react';

const ANON_KEY = 'analytics_anon_id';
const ACTIVE_CHAT_KEY = 'live_chat_active_id';

function getAnonId(): string | null {
  return localStorage.getItem(ANON_KEY);
}

interface Message {
  id: string;
  sender_type: 'admin' | 'visitor';
  content: string;
  sent_at: string;
}

export function LiveChatPopup() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>('Equipe Camaleão');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const anonId = getAnonId();

  // ── Restore active chat from session storage ────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem(ACTIVE_CHAT_KEY);
    if (saved) setChatId(saved);
  }, []);

  // ── Listen for admin initiating a chat via Realtime broadcast ───────────────
  useEffect(() => {
    if (!anonId) return;

    const channel = supabase
      .channel(`visitor-notify-${anonId}`)
      .on('broadcast', { event: 'chat_started' }, (payload) => {
        const id: string = payload.payload?.chat_id;
        const name: string = payload.payload?.admin_name || 'Equipe Camaleão';
        if (!id) return;
        sessionStorage.setItem(ACTIVE_CHAT_KEY, id);
        setChatId(id);
        setAdminName(name);
        setOpen(true);
        setUnread(0);
      })
      .on('broadcast', { event: 'chat_closed' }, () => {
        sessionStorage.removeItem(ACTIVE_CHAT_KEY);
        setChatId(null);
        setMessages([]);
        setOpen(false);
        setUnread(0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [anonId]);

  // ── Load existing messages when chatId is set ───────────────────────────────
  useEffect(() => {
    if (!chatId) return;

    supabase
      .from('visitor_live_messages' as any)
      .select('*')
      .eq('chat_id', chatId)
      .order('sent_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(data as Message[]);
          if (!open) setUnread((data as Message[]).filter(m => m.sender_type === 'admin').length);
        }
      });

    // ── Subscribe to new messages ─────────────────────────────────────────────
    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visitor_live_messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        if (msg.sender_type === 'admin') {
          setOpen(prev => {
            if (!prev) setUnread(u => u + 1);
            return prev;
          });
        }
      })
      .subscribe();

    // Also fetch chat metadata (admin name)
    supabase
      .from('visitor_live_chats' as any)
      .select('admin_name, status')
      .eq('id', chatId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.admin_name) setAdminName(data.admin_name);
        if (data?.status === 'closed') {
          sessionStorage.removeItem(ACTIVE_CHAT_KEY);
          setChatId(null);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // ── Reset unread when opened ──────────────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setOpen(true);
    setUnread(0);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !chatId || !anonId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    await (supabase.from('visitor_live_messages' as any) as any).insert({
      chat_id: chatId,
      visitor_anon_id: anonId,
      sender_type: 'visitor',
      content,
    });
    setSending(false);
  };

  if (!chatId) return null;

  // ── Minimized button ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-2xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7C12D1, #9333ea)' }}
      >
        <MessageCircle className="w-4 h-4" />
        {adminName}
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
            <p className="text-white text-sm font-semibold leading-none">{adminName}</p>
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
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug"
              style={
                msg.sender_type === 'visitor'
                  ? { background: 'linear-gradient(135deg, #7C12D1, #9333ea)', color: '#fff', borderBottomRightRadius: 4 }
                  : { background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4 }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
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
