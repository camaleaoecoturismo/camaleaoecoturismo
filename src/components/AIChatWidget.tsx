import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, MessageCircle, MapPin, Calendar, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg";
const WHATSAPP_NUMBER = "5582993649454";
const SESSION_KEY = "cami_chat_v3";
const CHAT_SESSION_ID_KEY = "cami_session_id_v1";

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(CHAT_SESSION_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(CHAT_SESSION_ID_KEY, id);
  }
  return id;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "unknown";
  let os = "unknown";
  let deviceType = "desktop";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  if (ua.includes("iPhone")) { os = "iOS"; deviceType = "mobile"; }
  else if (ua.includes("iPad")) { os = "iPadOS"; deviceType = "tablet"; }
  else if (ua.includes("Android")) {
    os = "Android";
    deviceType = ua.includes("Mobile") ? "mobile" : "tablet";
  } else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return {
    userAgent: ua,
    browser,
    os,
    deviceType,
    screenWidth: screen.width,
    screenHeight: screen.height,
    language: navigator.language,
    referrer: document.referrer || null,
    firstPage: window.location.pathname,
  };
}

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

// Página genérica — qualificação do funil
const QUICK_ACTIONS_DEFAULT = [
  { label: "Quando você quer ir?", message: "Ainda não tenho data certa, pode me ajudar a escolher?" },
  { label: "Quantas pessoas?", message: "Quero entender as opções de acordo com o tamanho do grupo" },
  { label: "Que tipo de passeio?", message: "Que tipos de passeio vocês têm? Cachoeira, trilha, acampamento..." },
  { label: "Chapada Diamantina", message: "Quero conhecer a Chapada Diamantina, como funciona?" },
  { label: "Para famílias", message: "Tem passeio para levar família com crianças?" },
  { label: "Falar com a equipe", message: "", whatsapp: true },
] as const;

// Página de passeio — foco em conversão
const QUICK_ACTIONS_TOUR = [
  { label: "Pontos de embarque", message: "Quais são os pontos de embarque para este passeio?" },
  { label: "Ver preços", message: "Quais são os valores e formas de pagamento?" },
  { label: "Como reservar?", message: "Como faço para reservar este passeio?" },
  { label: "Outras dúvidas", message: "Tenho outras dúvidas sobre este passeio" },
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PAGE_TOKENS: Record<string, { label: string; path?: string; href?: string }> = {
  "[WHATSAPP]": { label: "Falar com a equipe", href: `https://wa.me/${WHATSAPP_NUMBER}` },
  "[AGENDA]":      { label: "Ver agenda",            path: "/agenda" },
  "[CHAPADA]":     { label: "Chapada Diamantina",     path: "/chapada-diamantina" },
  "[FAQ]":         { label: "Perguntas frequentes",   path: "/faq" },
  "[POLITICAS]":   { label: "Políticas",              path: "/politicas" },
  "[SOBRE]":       { label: "Sobre nós",              path: "/sobre" },
  "[ORGANIZACOES]":{ label: "Grupos privativos",      path: "/organizacoes" },
  "[BLOG]":        { label: "Blog",                   path: "/blog" },
};

const TOKEN_REGEX = /(\[WHATSAPP\]|\[AGENDA\]|\[CHAPADA\]|\[FAQ\]|\[POLITICAS\]|\[SOBRE\]|\[ORGANIZACOES\]|\[BLOG\])/g;

// Renders assistant text, replacing page tokens with clickable buttons
function RenderText({ text, onNavigate }: { text: string; onNavigate: (path: string) => void }) {
  const parts = text.split(TOKEN_REGEX);
  if (parts.length === 1) return <>{text}</>;
  const btnClass = "inline-flex items-center mx-1 px-2.5 py-0.5 bg-emerald-500 text-white text-[11px] font-semibold rounded-full hover:bg-emerald-600 transition-colors";
  return (
    <>
      {parts.map((part, i) => {
        const token = PAGE_TOKENS[part];
        if (!token) return <span key={i}>{part}</span>;
        if (token.href) {
          return (
            <a key={i} href={token.href} target="_blank" rel="noopener noreferrer" className={btnClass}>
              {token.label}
            </a>
          );
        }
        return (
          <button key={i} onClick={() => { onNavigate(token.path!); }} className={btnClass}>
            {token.label}
          </button>
        );
      })}
    </>
  );
}

function toThumbUrl(url: string | null): string | null {
  return url ?? null;
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

const BTN_SIZE = 56; // w-14 h-14 = 56px
const PANEL_W = 360;
const PANEL_H = 560;
const EDGE_MARGIN = 16;

function useFloatingDrag(initialLeft: number, initialBottom: number) {
  // pos stores distance from LEFT and TOP edges (easier to compute snap)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  // Resolve initial position (left/bottom → left/top); re-evaluated when pos is null (not yet dragged)
  const resolvedPos = pos ?? {
    x: initialLeft,
    y: window.innerHeight - initialBottom - BTN_SIZE,
  };

  const snapToEdge = (x: number, y: number) => {
    const midX = window.innerWidth / 2;
    const snappedX = x < midX
      ? EDGE_MARGIN
      : window.innerWidth - BTN_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(EDGE_MARGIN, Math.min(window.innerHeight - BTN_SIZE - EDGE_MARGIN, y));
    setPos({ x: snappedX, y: clampedY });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    didDrag.current = false;
    startPointer.current = { x: e.clientX, y: e.clientY };
    startPos.current = resolvedPos;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - BTN_SIZE, startPos.current.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - BTN_SIZE, startPos.current.y + dy)),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (didDrag.current) {
      const dx = e.clientX - startPointer.current.x;
      const dy = e.clientY - startPointer.current.y;
      snapToEdge(startPos.current.x + dx, startPos.current.y + dy);
    }
  };

  return { resolvedPos, didDrag, onPointerDown, onPointerMove, onPointerUp };
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickActionsUsed, setQuickActionsUsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [showBubble, setShowBubble] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect if user is on a specific tour page
  const location = useLocation();
  const currentTourSlug = (() => {
    const match = location.pathname.match(/^\/passeio\/([^/]+)$/);
    return match ? match[1] : null;
  })();
  const QUICK_ACTIONS = currentTourSlug ? QUICK_ACTIONS_TOUR : QUICK_ACTIONS_DEFAULT;

  // On passeio pages, stay above the bottom tab bar (~64px); elsewhere, sit at normal bottom margin
  const drag = useFloatingDrag(EDGE_MARGIN, currentTourSlug ? 60 : EDGE_MARGIN);

  // Show greeting bubble on load, then swap to badge
  useEffect(() => {
    const t1 = setTimeout(() => setShowBubble(true), 3800);
    const t2 = setTimeout(() => setShowBubble(false), 7500);
    const t3 = setTimeout(() => setShowBadge(true), 8200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

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

        const sessionId = getOrCreateSessionId();
        const isFirstMessage = messages.filter(m => m.type === "user").length === 0;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: text,
            history,
            tourSlug: currentTourSlug,
            sessionId,
            deviceInfo: isFirstMessage ? getDeviceInfo() : undefined,
          }),
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
      <div
        className="fixed z-50 touch-none"
        style={{ left: drag.resolvedPos.x, top: drag.resolvedPos.y }}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      >
        <button
          onClick={() => { if (!drag.didDrag.current) { setShowBubble(false); setShowBadge(false); setIsOpen((o) => !o); } }}
          className="relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 overflow-visible cursor-grab active:cursor-grabbing select-none"
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
          {!isOpen && showBadge && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow animate-in zoom-in-50 duration-300">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Greeting bubble */}
        {!isOpen && (
          <div
            className="absolute pointer-events-none"
            style={{ bottom: BTN_SIZE + 10, left: 0 }}
          >
            <div
              className={`relative bg-white text-gray-800 text-sm font-medium px-3.5 py-2 rounded-2xl rounded-bl-sm shadow-lg whitespace-nowrap transition-all duration-500 ${showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
            >
              Oi, posso ajudar?
              {/* tail */}
              <span className="absolute -bottom-2 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[0px] border-t-[8px] border-t-white" />
            </div>
          </div>
        )}
      </div>

      {/* ── Chat window ──────────────────────────────────────────────────────── */}
      {isOpen && (() => {
        const { x, y } = drag.resolvedPos;
        const panelW = Math.min(PANEL_W, window.innerWidth - 2 * EDGE_MARGIN);
        // Place panel to the left if button is on right edge, else to the right
        const onRightSide = x + BTN_SIZE / 2 > window.innerWidth / 2;
        const panelX = onRightSide
          ? Math.max(EDGE_MARGIN, x + BTN_SIZE - panelW)
          : Math.min(x, window.innerWidth - panelW - EDGE_MARGIN);
        // Place panel above or below button
        const spaceAbove = y;
        const panelH = Math.min(PANEL_H, window.innerHeight - 2 * EDGE_MARGIN);
        const panelY = spaceAbove >= panelH + 8
          ? y - panelH - 8
          : y + BTN_SIZE + 8;
        return (
        <div
          className="fixed z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in"
          style={{
            left: panelX,
            top: panelY,
            width: panelW,
            height: panelH,
            maxWidth: "calc(100vw - 2rem)",
            maxHeight: "calc(100vh - 2rem)",
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
              <>
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
                <p className="pl-8 text-[10px] text-gray-400 mt-0.5">Não achou o que quer? Digite sua pergunta abaixo.</p>
              </>
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
                        <RenderText text={msg.content} onNavigate={(path) => { setIsOpen(false); navigate(path); }} />
                      </div>
                    </div>
                    {showOptions && (
                      <div className="pl-8 flex flex-wrap gap-1.5">
                        {msg.options!.map((opt) => {
                          const isWhatsApp = opt.toLowerCase().includes("whatsapp");
                          return isWhatsApp ? (
                            <a
                              key={opt}
                              href={`https://wa.me/${WHATSAPP_NUMBER}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                            >
                              {opt}
                            </a>
                          ) : (
                            <button
                              key={opt}
                              onClick={() => sendMessage(opt)}
                              className="text-[11px] font-medium bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                            >
                              {opt}
                            </button>
                          );
                        })}
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
            <div className="text-[10px] text-gray-400 text-center mt-1.5 flex flex-col items-center gap-0.5">
              <span>Modo beta · informações podem estar imprecisas</span>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de falar com a equipe da Camaleão Ecoturismo.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-green-500 hover:text-green-600 whitespace-nowrap"
              >
                Falar com atendente humano
              </a>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}
