import { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
      .then(({ data }) => setMaintenanceMode(data?.setting_value === 'true'))
      .catch(() => setMaintenanceMode(false));
  }, []);

  if (maintenanceMode === null) return null;

  const isBypassed = BYPASS_PATHS.some(p => location.pathname.startsWith(p));

  if (maintenanceMode && !isBypassed) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function MaintenancePage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: 'url(/auth-bg.jpg)', filter: 'blur(6px)' }}
      />

      {/* Overlay layers */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Animated ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[600px] rounded-full border border-violet-500/10 animate-ping"
          style={{ animationDuration: '3s' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full border border-violet-500/15" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-lg w-full">

        {/* Logo */}
        <div className="mb-10">
          <img
            src="/logo.png"
            alt="Camaleão Ecoturismo"
            className="h-14 mx-auto drop-shadow-2xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        {/* Icon + title card */}
        <div
          className="rounded-3xl px-8 py-10 mb-8"
          style={{
            background: 'rgba(10, 6, 20, 0.75)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Wrench icon with glow */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }}
              />
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(109,40,217,0.2) 100%)',
                  border: '1px solid rgba(139,92,246,0.4)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-9 h-9 text-violet-300"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.653-4.655m5.8-7.521.03-.03a2.652 2.652 0 0 1 3.745 3.745l-.03.029-4.52 4.52-3.745-3.744 4.52-4.52Z" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">
            Em manutenção
          </h1>

          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Estamos realizando melhorias para você.<br />
            Voltamos em breve com novidades!
          </p>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1.2s' }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/25 text-xs tracking-widest uppercase">
          camaleaoecoturismo.com.br
        </p>
      </div>
    </div>
  );
}
