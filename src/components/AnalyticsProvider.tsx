import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Initialize analytics tracking
  useAnalyticsTracking();
  
  return <>{children}</>;
}
