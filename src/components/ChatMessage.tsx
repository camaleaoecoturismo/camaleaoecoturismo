import React from 'react';

interface ChatMessageProps {
  type: 'question' | 'answer';
  text: string;
  animate?: boolean;
}

export function ChatMessage({ type, text, animate = false }: ChatMessageProps) {
  return (
    <div 
      className={`flex ${type === 'question' ? 'justify-start' : 'justify-end'} ${animate ? 'animate-fade-in' : ''}`}
    >
      <div 
        className={`rounded-2xl p-3 max-w-[85%] shadow-sm ${
          type === 'question' 
            ? 'bg-purple-600 text-white rounded-tl-md' 
            : 'bg-white text-gray-800 border border-gray-200 rounded-tr-md'
        }`}
      >
        {type === 'question' && (
          <div className="flex items-center gap-2 mb-1">
            <img 
              src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png" 
              alt="Camaleão" 
              className="w-5 h-5 rounded-full object-cover" 
            />
            <span className="text-xs font-medium opacity-90">Camaleão</span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{text}</p>
        <div className={`text-xs mt-1 ${type === 'question' ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}