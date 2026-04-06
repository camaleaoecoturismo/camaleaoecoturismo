import { useState } from 'react';
import { MessageCircle, Brain, Users } from 'lucide-react';
import ChatConversasTab from './ChatConversasTab';
import AITrainingTab from './AITrainingTab';
import AnalyticsVisitantes from '@/components/analytics/AnalyticsVisitantes';

const TABS = [
  { id: 'historico', label: 'Histórico', icon: MessageCircle },
  { id: 'treinamento', label: 'Treinamento', icon: Brain },
  { id: 'visitantes', label: 'Visitantes', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ConversasPage() {
  const [active, setActive] = useState<TabId>('historico');

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-6 -mt-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {active === 'historico' && <ChatConversasTab />}
      {active === 'treinamento' && <AITrainingTab />}
      {active === 'visitantes' && <AnalyticsVisitantes />}
    </div>
  );
}
