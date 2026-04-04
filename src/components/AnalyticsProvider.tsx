import React from 'react';
import { useAnalyticsTracking, AnalyticsContext } from '@/hooks/useAnalyticsTracking';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useAnalyticsTracking();

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}
