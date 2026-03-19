export type JourneyPhase = 'descobre' | 'confia' | 'compra' | 'se_prepara' | 'vive' | 'compartilha' | 'volta';

export const JOURNEY_PHASES: { id: JourneyPhase; label: string; color: string; bgColor: string; icon: string }[] = [
  { id: 'descobre', label: 'Descobre', color: '#f97316', bgColor: '#fff7ed', icon: '🔍' },
  { id: 'confia', label: 'Confia', color: '#22c55e', bgColor: '#f0fdf4', icon: '🤝' },
  { id: 'compra', label: 'Compra', color: '#3b82f6', bgColor: '#eff6ff', icon: '💳' },
  { id: 'se_prepara', label: 'Se Prepara', color: '#1e40af', bgColor: '#dbeafe', icon: '🎒' },
  { id: 'vive', label: 'Vive', color: '#a855f7', bgColor: '#faf5ff', icon: '🌄' },
  { id: 'compartilha', label: 'Compartilha', color: '#ec4899', bgColor: '#fdf2f8', icon: '📸' },
  { id: 'volta', label: 'Volta', color: '#14b8a6', bgColor: '#f0fdfa', icon: '🔄' },
];

export interface ClientJourney {
  id: string;
  cliente_id: string;
  current_phase: JourneyPhase;
  phase_entered_at: string;
  tour_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  clientes?: {
    nome_completo: string;
    cpf: string;
    email: string;
    whatsapp: string;
  };
  tours?: {
    name: string;
    start_date: string;
  } | null;
}

export interface JourneyHistory {
  id: string;
  cliente_id: string;
  from_phase: JourneyPhase | null;
  to_phase: JourneyPhase;
  trigger_type: string;
  trigger_description: string | null;
  tour_id: string | null;
  created_at: string;
}

export interface JourneyPhaseProcess {
  id: string;
  phase: JourneyPhase;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

export interface JourneyTaskTemplate {
  id: string;
  process_id: string | null;
  phase: JourneyPhase;
  title: string;
  description: string | null;
  task_type: string;
  trigger_rule: any;
  default_days_offset: number | null;
  order_index: number;
  is_active: boolean;
}

export interface ClientJourneyTask {
  id: string;
  cliente_id: string;
  template_id: string | null;
  tour_id: string | null;
  phase: JourneyPhase;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  clientes?: { nome_completo: string };
  tours?: { name: string } | null;
}

export const getPhaseConfig = (phase: JourneyPhase) => {
  return JOURNEY_PHASES.find(p => p.id === phase) || JOURNEY_PHASES[0];
};
