// Content Planning System Types

export type ContentFormat = 'reels' | 'feed' | 'carrossel' | 'stories';
export type ContentObjective = 'venda' | 'engajamento' | 'autoridade' | 'relacionamento' | 'institucional';
export type IdeaPriority = 'baixa' | 'media' | 'alta';
export type IdeaStatus = 'nova' | 'interessante' | 'pronta' | 'arquivada';
export type PostStatus = 'ideia' | 'em_producao' | 'aprovado' | 'agendado' | 'publicado';

export interface ContentIdea {
  id: string;
  tema: string;
  gancho: string | null;
  formato: ContentFormat;
  objetivo: ContentObjective;
  tags: string[];
  prioridade: IdeaPriority;
  status: IdeaStatus;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: string;
  idea_id: string | null;
  data_publicacao: string | null;
  horario: string | null;
  plataforma: string;
  formato: ContentFormat;
  tema: string;
  legenda: string | null;
  hashtags: string[] | null;
  midia_url: string | null;
  midia_referencia: string | null;
  objetivo: ContentObjective;
  campanha: string | null;
  campanha_id: string | null;
  status: PostStatus;
  tour_id: string | null;
  notas: string | null;
  ordem_dia: number;
  created_at: string;
  updated_at: string;
}

export interface ContentCampaign {
  id: string;
  nome: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  cor: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentAISuggestion {
  id: string;
  tipo: string;
  mensagem: string;
  sugestao_formato: ContentFormat | null;
  sugestao_tema: string | null;
  data_sugerida: string | null;
  acao_tomada: 'criar_post' | 'criar_ideia' | 'ignorar' | null;
  post_criado_id: string | null;
  ideia_criada_id: string | null;
  created_at: string;
  resolvida: boolean;
}

// Format configuration with icons and colors
export const FORMAT_CONFIG: Record<ContentFormat, { label: string; color: string; bgColor: string; icon: string }> = {
  reels: { label: 'Reels', color: 'text-pink-600', bgColor: 'bg-pink-100', icon: '🎬' },
  feed: { label: 'Feed', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🖼️' },
  carrossel: { label: 'Carrossel', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: '📑' },
  stories: { label: 'Stories', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '📱' },
};

export const OBJECTIVE_CONFIG: Record<ContentObjective, { label: string; color: string; bgColor: string }> = {
  venda: { label: 'Venda', color: 'text-green-600', bgColor: 'bg-green-100' },
  engajamento: { label: 'Engajamento', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  autoridade: { label: 'Autoridade', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  relacionamento: { label: 'Relacionamento', color: 'text-rose-600', bgColor: 'bg-rose-100' },
  institucional: { label: 'Institucional', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

export const PRIORITY_CONFIG: Record<IdeaPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-gray-500' },
  media: { label: 'Média', color: 'text-yellow-600' },
  alta: { label: 'Alta', color: 'text-red-600' },
};

export const IDEA_STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; bgColor: string }> = {
  nova: { label: 'Nova', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  interessante: { label: 'Interessante', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  pronta: { label: 'Pronta', color: 'text-green-600', bgColor: 'bg-green-50' },
  arquivada: { label: 'Arquivada', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

export const POST_STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bgColor: string }> = {
  ideia: { label: 'Ideia', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  em_producao: { label: 'Em Produção', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  aprovado: { label: 'Aprovado', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  agendado: { label: 'Agendado', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  publicado: { label: 'Publicado', color: 'text-green-700', bgColor: 'bg-green-100' },
};
