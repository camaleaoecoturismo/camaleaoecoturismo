import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardList, Users, Clock, X, MessageCircle,
  Globe, Star, TrendingUp, MousePointerClick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopPasseio {
  name: string;
  tentativas: number;
}

interface Summary {
  new_reservas: number;
  new_clientes: number;
  pending: number;
  chat_msgs: number;
  site_acessos: number;
  interessados: number;
  cta_clicks: number;
  top_passeios: TopPasseio[];
}

interface ActivitySummaryModalProps {
  open: boolean;
  onClose: () => void;
  sinceDate: string | null;
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
    summary.new_reservas > 0 || summary.new_clientes > 0 ||
    summary.pending > 0 || summary.chat_msgs > 0 ||
    summary.site_acessos > 0 || summary.interessados > 0
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key="modal"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="bg-[#0f1e18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 shrink-0">
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

              <div className="mx-6 border-t border-white/8 shrink-0" />

              {/* Content */}
              <div className="px-6 py-5 overflow-y-auto flex-1">
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
                    {/* Acessos ao site */}
                    {(summary?.site_acessos ?? 0) > 0 && (
                      <StatCard
                        icon={<Globe className="h-5 w-5 text-white" />}
                        label="Visitas ao site"
                        value={summary!.site_acessos}
                        sub="Sessões únicas"
                        color="bg-sky-600/80"
                        delay={0.10}
                      />
                    )}

                    {/* Mensagens no chat IA */}
                    {(summary?.chat_msgs ?? 0) > 0 && (
                      <StatCard
                        icon={<MessageCircle className="h-5 w-5 text-white" />}
                        label="Mensagens no chat IA"
                        value={summary!.chat_msgs}
                        sub="Enviadas por visitantes"
                        color="bg-violet-600/80"
                        delay={0.16}
                      />
                    )}

                    {/* Tentativas de reserva (CTA clicks) */}
                    {(summary?.cta_clicks ?? 0) > 0 && (
                      <StatCard
                        icon={<MousePointerClick className="h-5 w-5 text-white" />}
                        label="Tentativas de reserva"
                        value={summary!.cta_clicks}
                        sub="Cliques em "Reservar vaga""
                        color="bg-amber-600/80"
                        delay={0.22}
                      />
                    )}

                    {/* Novas reservas */}
                    {(summary?.new_reservas ?? 0) > 0 && (
                      <StatCard
                        icon={<ClipboardList className="h-5 w-5 text-white" />}
                        label="Novas reservas"
                        value={summary!.new_reservas}
                        color="bg-emerald-600/80"
                        delay={0.28}
                      />
                    )}

                    {/* Reservas pendentes */}
                    {(summary?.pending ?? 0) > 0 && (
                      <StatCard
                        icon={<Clock className="h-5 w-5 text-white" />}
                        label="Reservas pendentes"
                        value={summary!.pending}
                        sub="Aguardando confirmação"
                        color="bg-orange-600/80"
                        delay={0.34}
                      />
                    )}

                    {/* Novos clientes */}
                    {(summary?.new_clientes ?? 0) > 0 && (
                      <StatCard
                        icon={<Users className="h-5 w-5 text-white" />}
                        label="Novos clientes"
                        value={summary!.new_clientes}
                        color="bg-blue-600/80"
                        delay={0.40}
                      />
                    )}

                    {/* Interessados */}
                    {(summary?.interessados ?? 0) > 0 && (
                      <StatCard
                        icon={<TrendingUp className="h-5 w-5 text-white" />}
                        label="Novos interessados"
                        value={summary!.interessados}
                        sub="Lista de espera / interesse"
                        color="bg-teal-600/80"
                        delay={0.46}
                      />
                    )}

                    {/* Top passeios */}
                    {summary?.top_passeios && summary.top_passeios.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.52, duration: 0.35 }}
                        className="bg-white/5 rounded-xl p-4 border border-white/8"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600/80 flex items-center justify-center shrink-0">
                            <Star className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm text-white/70 font-medium">Passeios mais vistos</span>
                        </div>
                        <div className="space-y-2">
                          {summary.top_passeios.map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="text-sm text-white/80 truncate">{p.name}</span>
                              <span className="text-xs text-white/40 shrink-0">{p.tentativas}x</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 shrink-0">
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
