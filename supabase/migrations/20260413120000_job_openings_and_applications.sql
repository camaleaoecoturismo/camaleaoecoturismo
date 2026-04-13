-- job_openings: vagas abertas gerenciadas pelo admin
CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('guia', 'atendimento')),
  short_description TEXT,
  full_description TEXT,
  requirements TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- job_applications: candidaturas enviadas pelo site
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_opening_id UUID REFERENCES job_openings(id) ON DELETE SET NULL,
  -- dados pessoais
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  data_nascimento DATE,
  cidade TEXT NOT NULL,
  disponibilidade_deslocamento TEXT,
  como_soube TEXT,
  disponibilidade_horario TEXT[],
  -- perguntas específicas por cargo (JSONB)
  respostas_especificas JSONB,
  -- motivação
  experiencia_relevante TEXT,
  -- documentos
  curriculo_url TEXT,
  observacoes TEXT,
  -- gestão
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'reprovado', 'arquivado')),
  admin_notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: público pode inserir candidaturas, admin pode ler/editar tudo
ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler vagas ativas
CREATE POLICY "job_openings_public_read" ON job_openings
  FOR SELECT USING (is_active = TRUE);

-- Admin pode fazer tudo em job_openings
CREATE POLICY "job_openings_admin_all" ON job_openings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Qualquer pessoa pode inserir candidatura
CREATE POLICY "job_applications_public_insert" ON job_applications
  FOR INSERT WITH CHECK (TRUE);

-- Admin pode ler e atualizar candidaturas
CREATE POLICY "job_applications_admin_all" ON job_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed: duas vagas iniciais
INSERT INTO job_openings (title, type, short_description, full_description, requirements, display_order) VALUES
(
  'Guia de Turismo',
  'guia',
  'Conduza aventuras inesquecíveis pelos Cânions do São Francisco e região. Buscamos guias apaixonados pela natureza e pelo turismo em Alagoas.',
  'Como Guia de Turismo na Camaleão Ecoturismo, você será responsável por conduzir grupos em passeios pelos Cânions do São Francisco, Piranhas e arredores — garantindo segurança, conhecimento e uma experiência inesquecível para cada visitante.',
  ARRAY['Conhecimento da região', 'Boa comunicação com grupos', 'Disposição física para trabalho em campo', 'CADASTUR (diferencial)'],
  1
),
(
  'Assistente de Atendimento e Operações',
  'atendimento',
  'Seja o elo entre quem sonha com uma aventura e quem a realiza. Buscamos alguém organizado, com boa comunicação e interesse genuíno por turismo.',
  'Como Assistente de Atendimento e Operações, você será responsável por responder clientes pelo WhatsApp e redes sociais, auxiliar nas reservas, organizar informações operacionais e apoiar a equipe nas rotinas do dia a dia.',
  ARRAY['Boa comunicação escrita', 'Organização e atenção ao detalhe', 'Interesse por turismo e natureza', 'Disponibilidade para trabalhar em Piranhas/AL ou remotamente'],
  2
);
