import { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WrenchIcon } from 'lucide-react';

// Routes that should always be accessible even during maintenance
const BYPASS_PATHS = ['/auth', '/admin', '/checkin', '/checkin-scanner', '/ticket', '/embarques'];

interface Props {
  children: ReactNode;
}

export function MaintenanceGuard({ children }: Props) {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'maintenance_mode')
      .maybeSingle()
      .then(({ data }) => {
        setMaintenanceMode(data?.setting_value === 'true');
      })
      .catch(() => setMaintenanceMode(false));
  }, []);

  // Still loading — don't flash content or maintenance page
  if (maintenanceMode === null) return null;

  // Admin/internal routes bypass maintenance mode
  const isBypassed = BYPASS_PATHS.some(p => location.pathname.startsWith(p));

  if (maintenanceMode && !isBypassed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0614] text-white px-6 text-center">
        <div className="mb-8">
          <img
            src="/logo.png"
            alt="Camaleão Ecoturismo"
            className="h-16 mx-auto mb-6 opacity-90"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
            <WrenchIcon className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-3">Em manutenção</h1>
        <p className="text-white/60 max-w-md text-base leading-relaxed">
          Estamos realizando melhorias no site. Voltamos em breve!
        </p>
        <p className="mt-8 text-white/30 text-sm">
          camaleaoecoturismo.com.br
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
