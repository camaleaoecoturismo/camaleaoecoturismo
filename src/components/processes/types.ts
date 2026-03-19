export interface ProcessTaskConfig {
  task_name: string;
  task_description?: string;
  task_priority?: string; // quadrant
  task_assignee?: string;
  stage_id?: string;
}

export interface ProcessElement {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'comment';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: string;
  generates_task?: boolean;
  task_config?: ProcessTaskConfig;
}

export interface ProcessConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toSide?: 'top' | 'right' | 'bottom' | 'left';
}

export interface ProcessStage {
  id: string;
  name: string;
  order_index: number;
  color?: string;
}

export const ELEMENT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  green: { bg: '#22c55e', border: '#16a34a', label: 'Verde' },
  red: { bg: '#ef4444', border: '#dc2626', label: 'Vermelho' },
  blue: { bg: '#3b82f6', border: '#2563eb', label: 'Azul' },
  amber: { bg: '#f59e0b', border: '#d97706', label: 'Amarelo' },
  purple: { bg: '#a855f7', border: '#9333ea', label: 'Roxo' },
  pink: { bg: '#ec4899', border: '#db2777', label: 'Rosa' },
  teal: { bg: '#14b8a6', border: '#0d9488', label: 'Turquesa' },
  gray: { bg: '#6b7280', border: '#4b5563', label: 'Cinza' },
};

export interface ProcessMap {
  id: string;
  name: string;
  area: 'Estratégia' | 'Operação' | 'Marketing' | 'Financeiro';
  status: 'Em construção' | 'Validado' | 'Ativo' | 'Arquivado';
  elements: ProcessElement[];
  connections: ProcessConnection[];
  stages: ProcessStage[];
  canvas_settings: {
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export const AREAS = ['Estratégia', 'Operação', 'Marketing', 'Financeiro'] as const;
export const STATUSES = ['Em construção', 'Validado', 'Ativo', 'Arquivado'] as const;

export const DEFAULT_STAGES: ProcessStage[] = [
  { id: 'pre-divulgacao', name: 'Pré-divulgação', order_index: 0, color: 'purple' },
  { id: 'operacao', name: 'Operação', order_index: 1, color: 'blue' },
  { id: 'pos-viagem', name: 'Pós-viagem', order_index: 2, color: 'green' },
];
