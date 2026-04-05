import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, MessageCircle, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";

const WHATSAPP_NUMBER = "5582993649454";
const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Oi! Sou a Cami, assistente da Camaleão Ecoturismo 🦎 Posso te ajudar a encontrar o passeio ideal, tirar dúvidas sobre datas e preços, ou orientar sobre como reservar. Como posso ajudar?",
};

const SESSION_KEY = "cami_chat_history";

function openWhatsApp(text: string) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist session on change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    // Placeholder for assistant response
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const history = newMessages.slice(1).slice(-10); // exclude welcome, last 10

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ message: text, history }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Falha na conexão com o servidor.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {}
        }
      }

      if (!accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Desculpe, não consegui processar sua mensagem. Tente novamente ou fale com nossa equipe pelo WhatsApp.",
          };
          return updated;
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Ops! Ocorreu um erro de conexão. Tente novamente ou fale com nossa equipe pelo WhatsApp 😊",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lastUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
        {!isOpen && (
          <div className="flex items-center gap-2 animate-fade-in">
            <button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
              aria-label="Abrir chat com assistente"
            >
              <MessageCircle className="w-7 h-7" />
            </button>
            <span className="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 whitespace-nowrap">
              Tire suas dúvidas com a IA
            </span>
          </div>
        )}

        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            aria-label="Fechar chat"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white animate-fade-in md:bottom-24 bottom-0 md:left-6 left-0 md:max-w-[360px] md:max-h-[520px] md:rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative">
              <img
                src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
                alt="Cami"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Cami</p>
              <p className="text-white/80 text-xs">Assistente da Camaleão · online</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                {msg.role === "assistant" && (
                  <img
                    src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
                    alt="Cami"
                    className="w-6 h-6 rounded-full object-cover mr-2 mt-1 shrink-0"
                  />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                      : "bg-emerald-500 text-white rounded-tr-sm"
                  }`}
                >
                  {!msg.content ? (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1">{children}</ol>,
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1">{children}</ul>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* WhatsApp button after last assistant message */}
            {!isStreaming && messages.length > 1 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].content && (
              <div className="flex justify-start pl-8">
                <button
                  onClick={() => openWhatsApp(lastUserMessage ? `Olá! Estava conversando com a Cami sobre: "${lastUserMessage}"` : "Olá! Gostaria de falar com a equipe da Camaleão Ecoturismo.")}
                  className="flex items-center gap-1.5 text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Falar com a equipe
                </button>
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
                disabled={isStreaming}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50 bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Assistente com IA · dados reais do site
            </p>
          </div>
        </div>
      )}
    </>
  );
}
