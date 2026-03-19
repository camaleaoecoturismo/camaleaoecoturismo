import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-purple-600 text-white rounded-2xl rounded-tl-md p-3 max-w-[85%] shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <img 
            src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png" 
            alt="Camaleão" 
            className="w-5 h-5 rounded-full object-cover" 
          />
          <span className="text-xs font-medium opacity-90">Camaleão</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span className="text-xs text-white/70 ml-2">digitando...</span>
        </div>
      </div>
    </div>
  );
}