import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Globe, FileText, Target, Monitor } from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';
import AnalyticsTrafficSources from './AnalyticsTrafficSources';
import AnalyticsBehavior from './AnalyticsBehavior';
import AnalyticsFunnel from './AnalyticsFunnel';
import AnalyticsDevices from './AnalyticsDevices';
import FormAbandonmentMetrics from '@/components/FormAbandonmentMetrics';

interface AnalyticsModuleProps {
  subView?: string;
}

const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ subView }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // If subView is 'abandono', show FormAbandonmentMetrics directly
  if (subView === 'abandono') {
    return (
      <div className="space-y-6">
        <FormAbandonmentMetrics />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'traffic', label: 'Origem de Tráfego', icon: Globe },
    { id: 'behavior', label: 'Comportamento', icon: FileText },
    { id: 'funnel', label: 'Funil de Conversão', icon: Target },
    { id: 'devices', label: 'Dispositivos', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Acessos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe o comportamento dos visitantes e tome decisões baseadas em dados
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="gap-2 text-xs lg:text-sm"
            >
              <tab.icon className="h-4 w-4 hidden lg:block" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview key={`overview-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="traffic" className="mt-6">
          <AnalyticsTrafficSources key={`traffic-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          <AnalyticsBehavior key={`behavior-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          <AnalyticsFunnel key={`funnel-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="devices" className="mt-6">
          <AnalyticsDevices key={`devices-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsModule;
