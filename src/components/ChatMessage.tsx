import React from 'react';

interface ChatMessageProps {
  type: 'question' | 'answer';
  text: string;
  animate?: boolean;
}

export function ChatMessage({ type, text, animate = false }: ChatMessageProps) {
  const isBot = type === 'question';

  return (
    <div
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} ${animate ? 'animate-fade-in' : ''} px-1`}
    >
      {isBot && (
        <img
          src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
          alt="Camaleão"
          className="w-7 h-7 rounded-full object-cover self-end mr-1.5 shrink-0 shadow-sm"
        />
      )}
      <div
        className={`relative max-w-[78%] px-3 py-2 shadow-sm text-sm leading-relaxed ${
          isBot
            ? 'bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-sm'
            : 'bg-[#dcf8c6] text-gray-900 rounded-t-2xl rounded-bl-2xl rounded-br-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className={`text-[10px] ${isBot ? 'text-gray-400' : 'text-emerald-700/70'}`}>
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isBot && (
            <svg viewBox="0 0 16 11" className="w-3.5 h-3 fill-emerald-600/70">
              <path d="M11.071.653a.45.45 0 0 0-.641 0l-5.5 5.5L2.57 3.784a.45.45 0 1 0-.638.637l2.68 2.68a.45.45 0 0 0 .638 0l5.82-5.82a.45.45 0 0 0 0-.628zM15.071.653a.45.45 0 0 0-.641 0l-5.5 5.5a.45.45 0 0 0 .638.637l5.503-5.509a.45.45 0 0 0 0-.628z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
