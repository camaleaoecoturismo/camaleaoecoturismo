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

        {/* WhatsApp button */}
        <a
          href="https://wa.me/5582993649454?text=Olá! Vi que o site está em manutenção. Podem me ajudar?"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-3 mb-6 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            boxShadow: '0 8px 24px rgba(37,211,102,0.35)',
            color: '#fff',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Falar com a equipe
        </a>

        {/* Footer */}
        <p className="text-white/25 text-xs tracking-widest uppercase">
          camaleaoecoturismo.com.br
        </p>
      </div>
    </div>
  );
}
