import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in px-1">
      <img
        src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
        alt="Camaleão"
        className="w-7 h-7 rounded-full object-cover self-end mr-1.5 shrink-0 shadow-sm"
      />
      <div className="bg-white rounded-t-2xl rounded-br-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
