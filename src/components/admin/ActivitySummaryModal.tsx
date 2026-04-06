import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardList, Users, Clock, TrendingUp, X, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Summary {
  new_reservas: number;
  new_clientes: number;
  pending: number;
  revenue: number;
}

interface ActivitySummaryModalProps {
  open: boolean;
  onClose: () => void;
  sinceDate: string | null; // ISO timestamp of last login
  isAdmin: boolean;
  userName?: string | null;
}

function formatSince(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return 'há menos de 1 hora';
  if (diffH < 24) return `há ${diffH} hora${diffH > 1 ? 's' : ''}`;
  if (diffD === 1) return 'ontem';
  return `há ${diffD} dias`;
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}

function StatCard({ icon, label, value, sub, color, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/8"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-none">{value}</div>
        <div className="text-sm text-white/60 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-white/35 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function ActivitySummaryModal({
  open,
  onClose,
  sinceDate,
  isAdmin,
  userName,
}: ActivitySummaryModalProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !isAdmin || !sinceDate) return;
    setLoading(true);
    supabase.rpc('get_activity_summary', { p_since: sinceDate })
      .then(({ data }) => {
        if (data) setSummary(data as Summary);
        setLoading(false);
      });
  }, [open, sinceDate, isAdmin]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const hasActivity = summary && (
    summary.new_reservas > 0 || summary.new_clientes > 0 || summary.pending > 0
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="bg-[#0f1e18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-emerald-400 text-sm font-medium">
                    {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}!
                  </p>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {sinceDate ? `O que aconteceu ${formatSince(sinceDate)}` : 'Resumo de atividades'}
                  </h2>
                  {sinceDate && (
                    <p className="text-white/35 text-xs mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Último acesso: {new Date(sinceDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-white/8" />

              {/* Content */}
              <div className="px-6 py-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-white/40 gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : !isAdmin || !sinceDate ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/50 text-sm text-center py-6"
                  >
                    Tudo pronto. Bom trabalho!
                  </motion.p>
                ) : !hasActivity ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <div className="text-4xl mb-3">🌿</div>
                    <p className="text-white/60 text-sm">Nenhuma atividade nova desde sua última visita.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {summary.new_reservas > 0 && (
                      <StatCard
                        icon={<ClipboardList className="h-5 w-5 text-white" />}
                        label="Novas reservas"
                        value={summary.new_reservas}
                        color="bg-emerald-600/80"
                        delay={0.15}
                      />
                    )}
                    {summary.new_clientes > 0 && (
                      <StatCard
                        icon={<Users className="h-5 w-5 text-white" />}
                        label="Novos clientes"
                        value={summary.new_clientes}
                        color="bg-blue-600/80"
                        delay={0.22}
                      />
                    )}
                    {summary.pending > 0 && (
                      <StatCard
                        icon={<Clock className="h-5 w-5 text-white" />}
                        label="Reservas pendentes"
                        value={summary.pending}
                        sub="Aguardando confirmação"
                        color="bg-amber-600/80"
                        delay={0.29}
                      />
                    )}
                    {summary.revenue > 0 && (
                      <StatCard
                        icon={<DollarSign className="h-5 w-5 text-white" />}
                        label="Receita confirmada"
                        value={formatCurrency(summary.revenue)}
                        color="bg-teal-600/80"
                        delay={0.36}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5">
                <Button
                  onClick={onClose}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11 font-medium"
                >
                  Entrar no painel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
