// Modelo unificado de dados do participante
// Usado em: Formulário de reserva, Modal de adicionar participante, Modal de detalhes

export interface ParticipantData {
  // Dados Pessoais
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  whatsapp: string;
  whatsapp_country_code: string;
  email: string;
  
  // Ponto de Embarque
  ponto_embarque_id: string;
  
  // Condicionamento Físico
  nivel_condicionamento: string;
  
  // Saúde
  problema_saude: boolean;
  descricao_problema_saude: string;
  
  // Plano de Saúde
  plano_saude: boolean;
  nome_plano_saude: string;
  
  // Assistência Diferenciada
  assistencia_diferenciada: boolean;
  descricao_assistencia_diferenciada: string;
  
  // Contato de Emergência
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  contato_emergencia_country_code: string;
  
  // Como Conheceu a Camaleão
  como_conheceu: string;
  como_conheceu_outro: string;
  
  // Observações (admin only)
  observacoes?: string;
}

export const NIVEL_CONDICIONAMENTO_OPTIONS = [
  { value: 'sedentario', label: 'SEDENTÁRIO(A) - só de ir do quarto pra sala já perco o fôlego' },
  { value: 'iniciante', label: 'INICIANTE - encaro caminhadas ou trilhas leves' },
  { value: 'intermediario', label: 'INTERMEDIÁRIO - gosto de caminhar por alguns quilômetros' },
  { value: 'avancado', label: 'AVANÇADO - pratico atividade física regularmente (pelo menos 3x semana)' },
  { value: 'atleta', label: 'ATLETA - amo um desafio físico' }
];

export const COMO_CONHECEU_OPTIONS = [
  { value: 'instagram', label: 'Vi no Instagram' },
  { value: 'whatsapp', label: 'Grupo da Camaleão do Whatsapp' },
  { value: 'indicacao', label: 'Indicação de alguém' },
  { value: 'google', label: 'Pesquisei no Google' },
  { value: 'youtube', label: 'Vi no Youtube' },
  { value: 'outro', label: 'Outro' }
];

export const PARTICIPANT_FIELD_LABELS: Record<keyof ParticipantData, string> = {
  nome_completo: 'Nome Completo',
  cpf: 'CPF',
  data_nascimento: 'Data de Nascimento',
  whatsapp: 'WhatsApp',
  whatsapp_country_code: 'Código do País (WhatsApp)',
  email: 'E-mail',
  ponto_embarque_id: 'Ponto de Embarque',
  nivel_condicionamento: 'Nível de Condicionamento',
  problema_saude: 'Problema de Saúde',
  descricao_problema_saude: 'Descrição do Problema de Saúde',
  plano_saude: 'Plano de Saúde',
  nome_plano_saude: 'Nome do Plano de Saúde',
  assistencia_diferenciada: 'Assistência Diferenciada',
  descricao_assistencia_diferenciada: 'Descrição da Assistência',
  contato_emergencia_nome: 'Contato de Emergência (Nome)',
  contato_emergencia_telefone: 'Contato de Emergência (Telefone)',
  contato_emergencia_country_code: 'Código do País (Emergência)',
  como_conheceu: 'Como Conheceu a Camaleão',
  como_conheceu_outro: 'Como Conheceu (Outro)',
  observacoes: 'Observações'
};

// Seções do formulário na ordem correta
export const PARTICIPANT_SECTIONS = [
  {
    id: 'dados_pessoais',
    title: 'DADOS PESSOAIS',
    fields: ['cpf', 'nome_completo', 'data_nascimento', 'whatsapp', 'email'] as const
  },
  {
    id: 'embarque',
    title: 'PONTO DE EMBARQUE',
    fields: ['ponto_embarque_id'] as const
  },
  {
    id: 'condicionamento',
    title: 'CONDICIONAMENTO FÍSICO',
    fields: ['nivel_condicionamento'] as const
  },
  {
    id: 'saude',
    title: 'SAÚDE',
    fields: ['problema_saude', 'descricao_problema_saude', 'plano_saude', 'nome_plano_saude'] as const
  },
  {
    id: 'assistencia',
    title: 'ASSISTÊNCIA DIFERENCIADA',
    fields: ['assistencia_diferenciada', 'descricao_assistencia_diferenciada'] as const
  },
  {
    id: 'emergencia',
    title: 'CONTATO DE EMERGÊNCIA',
    fields: ['contato_emergencia_nome', 'contato_emergencia_telefone'] as const
  },
  {
    id: 'como_conheceu',
    title: 'COMO FICOU SABENDO DESSA VIAGEM?',
    fields: ['como_conheceu', 'como_conheceu_outro'] as const
  },
  {
    id: 'observacoes',
    title: 'OBSERVAÇÕES',
    fields: ['observacoes'] as const,
    adminOnly: true
  }
];

export const createEmptyParticipant = (): ParticipantData => ({
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  whatsapp: '',
  whatsapp_country_code: '+55',
  email: '',
  ponto_embarque_id: '',
  nivel_condicionamento: '',
  problema_saude: false,
  descricao_problema_saude: '',
  plano_saude: false,
  nome_plano_saude: '',
  assistencia_diferenciada: false,
  descricao_assistencia_diferenciada: '',
  contato_emergencia_nome: '',
  contato_emergencia_telefone: '',
  contato_emergencia_country_code: '+55',
  como_conheceu: '',
  como_conheceu_outro: '',
  observacoes: ''
});

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const getNivelCondicionamentoLabel = (value: string): string => {
  const option = NIVEL_CONDICIONAMENTO_OPTIONS.find(o => o.value === value || o.label === value);
  return option?.label || value;
};
