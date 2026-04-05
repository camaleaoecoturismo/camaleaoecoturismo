import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, MessageCircle, MapPin, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg";
const WHATSAPP_NUMBER = "5582993649454";
const SESSION_KEY = "cami_chat_v3";

interface TourCard {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string | null;
  price: number | null;
  imageUrl: string | null;
}

type ChatMsg =
  | { id: string; type: "user"; content: string }
  | { id: string; type: "assistant"; content: string; options?: string[] }
  | { id: string; type: "tours"; tours: TourCard[] };

function getRelevantMonthName(): string {
  const now = new Date();
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  // If past day 20, suggest next month
  if (now.getDate() > 20) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return months[next.getMonth()];
  }
  return months[now.getMonth()];
}

const relevantMonth = getRelevantMonthName();

const QUICK_ACTIONS = [
  { label: `🗓 Passeios de ${relevantMonth}`, message: `Quais passeios têm em ${relevantMonth}?` },
  { label: "🏔 Chapada Diamantina", message: "Quero conhecer a Chapada Diamantina" },
  { label: "💧 Com cachoeira", message: "Quero um passeio com cachoeira" },
  { label: "👨‍👩‍👧 Para famílias", message: "Tem passeio para levar família com crianças?" },
  { label: "💳 Valores e pagamento", message: "Como funcionam os pagamentos e valores?" },
  { label: "💬 Falar com a equipe", message: "", whatsapp: true },
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toThumbUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("/storage/v1/object/public/")) {
    return (
      url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
      "?width=400&quality=75"
    );
  }
  return url;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

// ─── Tour card inside chat ────────────────────────────────────────────────────

function TourCardItem({ tour, onClose }: { tour: TourCard; onClose: () => void }) {
  const navigate = useNavigate();
  const thumb = toThumbUrl(tour.imageUrl);
  const dateStr =
    tour.endDate && tour.endDate !== tour.startDate
      ? `${formatDateShort(tour.startDate)} a ${formatDateShort(tour.endDate)}`
      : formatDateShort(tour.startDate);
  const priceStr = tour.price
    ? tour.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })
    : null;
  const location = [tour.city, tour.state].filter(Boolean).join(" · ");

  return (
    <div className="w-48 shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {thumb ? (
        <div className="h-24 overflow-hidden bg-gray-100">
          <img
            src={thumb}
            alt={tour.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="h-24 bg-emerald-50 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-emerald-300" />
        </div>
      )}
      <div className="p-2.5 space-y-1">
        <p className="font-semibold text-gray-900 text-[11px] leading-snug line-clamp-2">{tour.name}</p>
        {location && (
          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {location}
          </p>
        )}
        <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
          <Calendar className="w-2.5 h-2.5 shrink-0" />
          {dateStr}
        </p>
        {priceStr && (
          <p className="text-[11px] font-bold text-emerald-600">A partir de {priceStr}</p>
        )}
        <button
          onClick={() => {
            onClose();
            navigate(`/passeio/${tour.slug}`);
          }}
          className="w-full mt-1 text-[11px] font-semibold text-emerald-700 border border-emerald-300 rounded-lg px-2 py-1 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-0.5"
        >
          Ver detalhes <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickActionsUsed, setQuickActionsUsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { msgs, qa } = JSON.parse(saved);
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
          setQuickActionsUsed(!!qa);
        }
      }
    } catch {}
  }, []);

  // Persist session
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ msgs: messages, qa: quickActionsUsed }));
    } catch {}
  }, [messages, quickActionsUsed]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on open + clear unread badge
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setQuickActionsUsed(true);
      setInput("");

      const userMsg: ChatMsg = { id: uid(), type: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // History = text messages only (no tour card messages), last 15
        const history = messages
          .filter(
            (m): m is Extract<ChatMsg, { type: "user" | "assistant" }> =>
              m.type === "user" || m.type === "assistant"
          )
          .slice(-15)
          .map((m) => ({ role: m.type as "user" | "assistant", content: m.content }));

        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ message: text, history }),
        });

        const data = await res.json();

        setMessages((prev) => {
          const next: ChatMsg[] = [
            ...prev,
            {
              id: uid(),
              type: "assistant",
              content: data.text ?? "Como posso ajudar?",
              options: Array.isArray(data.options) && data.options.length > 0 ? data.options : undefined,
            },
          ];
          if (Array.isArray(data.tours) && data.tours.length > 0) {
            next.push({ id: uid(), type: "tours", tours: data.tours });
          }
          return next;
        });
        if (!isOpen) setUnreadCount((n) => n + 1);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: uid(), type: "assistant", content: "Ops, tive um problema de conexão. Tente novamente 😊" },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isOpen]
  );

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if ("whatsapp" in action && action.whatsapp) {
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de falar com a equipe da Camaleão Ecoturismo.")}`,
        "_blank"
      );
      return;
    }
    sendMessage(action.message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showQuickActions = !quickActionsUsed && messages.length === 0;

  // Id of the last assistant message (for showing inline options)
  const lastAssistantId = [...messages].reverse().find((m) => m.type === "assistant")?.id;

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 overflow-visible"
          aria-label={isOpen ? "Fechar chat" : "Falar com a Camila"}
        >
          {isOpen ? (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <X className="w-6 h-6" />
            </div>
          ) : (
            <>
              <img
                src="/lovable-uploads/camila-avatar.png"
                alt="Camila"
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                }}
              />
              <div
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center text-white hidden absolute inset-0"
              >
                <MessageCircle className="w-7 h-7" />
              </div>
            </>
          )}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Chat window ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-24 left-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in"
          style={{
            width: 360,
            height: 560,
            maxWidth: "calc(100vw - 3rem)",
            maxHeight: "calc(100vh - 8rem)",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative shrink-0">
              <img
                src="/lovable-uploads/camila-avatar.png"
                alt="Camila"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Camila</p>
              <p className="text-white/80 text-xs">Assistente da Camaleão · online</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">

            {/* Welcome */}
            <div className="flex items-start gap-2">
              <img
                src="/lovable-uploads/camila-avatar.png"
                alt="Camila"
                className="w-6 h-6 rounded-full object-cover mt-0.5 shrink-0"
              />
              <div className="max-w-[82%] bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 border border-gray-200 shadow-sm text-sm text-gray-800 leading-relaxed">
                Oi, eu sou a Camila. Posso te ajudar a encontrar o passeio ideal 🙂
              </div>
            </div>

            {/* Quick actions */}
            {showQuickActions && (
              <div className="pl-8 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    className="text-[11px] font-medium bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((msg) => {
              if (msg.type === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] bg-emerald-500 text-white rounded-2xl rounded-tr-sm px-3 py-2.5 text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.type === "assistant") {
                const isLastAssistant = msg.id === lastAssistantId;
                const showOptions = isLastAssistant && !isLoading && msg.options && msg.options.length > 0;
                return (
                  <div key={msg.id} className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <img
                        src="/lovable-uploads/camila-avatar.png"
                        alt="Camila"
                        className="w-6 h-6 rounded-full object-cover mt-0.5 shrink-0"
                      />
                      <div className="max-w-[82%] bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 border border-gray-200 shadow-sm text-sm text-gray-800 leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                    {showOptions && (
                      <div className="pl-8 flex flex-wrap gap-1.5">
                        {msg.options!.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => sendMessage(opt)}
                            className="text-[11px] font-medium bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (msg.type === "tours") {
                return (
                  <div key={msg.id} className="pl-8 -mr-3">
                    <div
                      className="flex gap-3 overflow-x-auto pb-2 pr-3"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {msg.tours.map((tour) => (
                        <TourCardItem key={tour.id} tour={tour} onClose={() => setIsOpen(false)} />
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <img
                  src="/lovable-uploads/camila-avatar.png"
                  alt="Camila"
                  className="w-6 h-6 rounded-full object-cover mt-0.5 shrink-0"
                />
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Assistente da Camaleão · datas, destinos e dúvidas em geral.{" "}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de falar com a equipe da Camaleão Ecoturismo.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-green-500 hover:text-green-600"
              >
                Falar com atendente humano
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
