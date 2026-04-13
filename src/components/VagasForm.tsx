import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Loader2, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import logoHorizontal from '@/assets/logo-horizontal.png';

interface JobOpening {
  id: string;
  title: string;
  type: 'guia' | 'atendimento';
}

interface VagasFormProps {
  job: JobOpening;
  onBack: () => void;
}

type Step = 'aviso' | 1 | 2 | 3 | 4 | 5 | 'video' | 'success';

// ─── Generic UI helpers ────────────────────────────────────────────────────

function RadioCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
        selected
          ? 'border-primary bg-primary/5 text-foreground font-medium'
          : 'border-border bg-white text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

function PillToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-white text-muted-foreground hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground mb-1.5 block">
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
}

function DiscursiveField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Escreva aqui sua resposta..."
        rows={3}
      />
    </div>
  );
}

// ─── Form state ────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  nome: string;
  whatsapp: string;
  email: string;
  data_nascimento: string;
  cidade: string;
  disponibilidade_deslocamento: string;
  genero: string;
  // Step 2
  como_soube: string;
  disponibilidade_horario: string[];
  // Step 3 — guia structured
  g_cadastur: string;
  g_experiencia: string;
  g_conhece_camaleao: string;
  g_regioes: string[];
  g_idiomas: string[];
  g_especialidades: string[];
  g_aptidao: string;
  g_aptidao_restricoes: string;
  // Step 3 — guia discursive
  g_disc_calma: string;
  g_disc_cansado: string;
  g_disc_desobediencia: string;
  g_disc_decisao: string;
  g_disc_experiencia: string;
  // Step 3 — atendimento structured
  a_experiencia: string;
  a_crm: string;
  a_turismo: string;
  a_ferramentas: string[];
  a_escrita: string;
  a_home_office: string;
  a_multitarefas: string;
  // Step 3 — atendimento discursive
  a_disc_multiplas: string;
  a_disc_impaciente: string;
  a_disc_demandas: string;
  a_disc_erro: string;
  a_disc_diferencial: string;
  // Step 4
  motivacao: string;
  experiencia_relevante: string;
  // Step 5
  observacoes: string;
}

const initialForm: FormData = {
  nome: '', whatsapp: '', email: '', data_nascimento: '', cidade: '',
  disponibilidade_deslocamento: '', genero: '',
  como_soube: '', disponibilidade_horario: [],
  g_cadastur: '', g_experiencia: '', g_conhece_camaleao: '',
  g_regioes: [], g_idiomas: [], g_especialidades: [],
  g_aptidao: '', g_aptidao_restricoes: '',
  g_disc_calma: '', g_disc_cansado: '', g_disc_desobediencia: '', g_disc_decisao: '', g_disc_experiencia: '',
  a_experiencia: '', a_crm: '', a_turismo: '', a_ferramentas: [],
  a_escrita: '', a_home_office: '', a_multitarefas: '',
  a_disc_multiplas: '', a_disc_impaciente: '', a_disc_demandas: '', a_disc_erro: '', a_disc_diferencial: '',
  motivacao: '', experiencia_relevante: '',
  observacoes: '',
};

function formatWhatsApp(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function VagasForm({ job, onBack }: VagasFormProps) {
  const [step, setStep] = useState<Step>('aviso');
  const [form, setForm] = useState<FormData>(initialForm);
  const [curriculoFile, setCurriculoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;
  const progress = typeof step === 'number' ? (step / totalSteps) * 100 : 0;

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleMulti(field: keyof FormData, value: string) {
    setForm(prev => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }

  // ── Validation per step ──────────────────────────────────────────────────

  function validateStep(s: Step): boolean {
    if (s === 1) {
      if (!form.nome.trim()) { toast.error('Por favor, informe seu nome completo.'); return false; }
      const digits = form.whatsapp.replace(/\D/g, '');
      if (digits.length < 10) { toast.error('WhatsApp inválido. Informe com DDD.'); return false; }
      if (!form.email.includes('@')) { toast.error('Por favor, informe um e-mail válido.'); return false; }
      if (!form.cidade.trim()) { toast.error('Por favor, informe sua cidade.'); return false; }
      if (!form.disponibilidade_deslocamento) { toast.error('Por favor, selecione uma opção de localização.'); return false; }
    }
    if (s === 2) {
      if (!form.como_soube) { toast.error('Por favor, informe como ficou sabendo da vaga.'); return false; }
      if (form.disponibilidade_horario.length === 0) { toast.error('Selecione ao menos uma opção de disponibilidade.'); return false; }
    }
    if (s === 4) {
      if (!form.motivacao.trim()) { toast.error('Por favor, preencha o campo de motivação.'); return false; }
    }
    return true;
  }

  function next() {
    if (step === 'aviso') { setStep(1); return; }
    if (typeof step === 'number') {
      if (!validateStep(step)) return;
      if (step < totalSteps) setStep((step + 1) as Step);
    }
  }

  function prev() {
    if (step === 1) { onBack(); return; }
    if (step === 'aviso') { onBack(); return; }
    if (typeof step === 'number' && step > 1) setStep((step - 1) as Step);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep(5)) return;
    setLoading(true);

    // Upload currículo PDF if provided
    let curriculo_url: string | null = null;
    if (curriculoFile) {
      const fileName = `${job.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('curriculos')
        .upload(fileName, curriculoFile, { contentType: 'application/pdf', upsert: false });

      if (uploadError) {
        toast.error('Erro ao enviar o currículo. Verifique o arquivo e tente novamente.');
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('curriculos').getPublicUrl(uploadData.path);
      curriculo_url = urlData.publicUrl;
    }

    const respostasEspecificas = job.type === 'guia' ? {
      motivacao: form.motivacao.trim() || null,
      cadastur: form.g_cadastur,
      experiencia: form.g_experiencia,
      conhece_camaleao: form.g_conhece_camaleao,
      regioes: form.g_regioes,
      idiomas: form.g_idiomas,
      especialidades: form.g_especialidades,
      aptidao: form.g_aptidao,
      aptidao_restricoes: form.g_aptidao_restricoes || null,
      disc_calma: form.g_disc_calma.trim() || null,
      disc_cansado: form.g_disc_cansado.trim() || null,
      disc_desobediencia: form.g_disc_desobediencia.trim() || null,
      disc_decisao: form.g_disc_decisao.trim() || null,
      disc_experiencia: form.g_disc_experiencia.trim() || null,
    } : {
      motivacao: form.motivacao.trim() || null,
      experiencia_atendimento: form.a_experiencia,
      crm: form.a_crm,
      exp_turismo: form.a_turismo,
      ferramentas: form.a_ferramentas,
      escrita: form.a_escrita,
      home_office: form.a_home_office,
      multitarefas: form.a_multitarefas,
      disc_multiplas: form.a_disc_multiplas.trim() || null,
      disc_impaciente: form.a_disc_impaciente.trim() || null,
      disc_demandas: form.a_disc_demandas.trim() || null,
      disc_erro: form.a_disc_erro.trim() || null,
      disc_diferencial: form.a_disc_diferencial.trim() || null,
    };

    const { error } = await supabase.from('job_applications' as any).insert({
      job_opening_id: job.id,
      nome: form.nome.trim(),
      whatsapp: form.whatsapp,
      email: form.email.trim(),
      data_nascimento: form.data_nascimento || null,
      cidade: form.cidade.trim(),
      genero: form.genero || null,
      disponibilidade_deslocamento: form.disponibilidade_deslocamento,
      como_soube: form.como_soube,
      disponibilidade_horario: form.disponibilidade_horario,
      respostas_especificas: respostasEspecificas,
      experiencia_relevante: form.experiencia_relevante.trim() || null,
      curriculo_url,
      observacoes: form.observacoes.trim() || null,
      status: 'pendente',
    });

    setLoading(false);

    if (error) {
      toast.error('Erro ao enviar candidatura. Tente novamente.');
      return;
    }

    setStep('video');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Step renderers ──────────────────────────────────────────────────────

  const DOCS_GUIA = [
    'CPF ou RG',
    'Currículo atualizado em PDF',
    'CADASTUR ou certificado de guia (se tiver)',
  ];
  const DOCS_ATENDIMENTO = [
    'CPF ou RG',
    'Currículo atualizado em PDF',
  ];

  // ─── Logo (shown on every step) ───────────────────────────────────────────

  const Logo = () => (
    <div className="flex justify-center mb-8">
      <img src={logoHorizontal} alt="Camaleão Ecoturismo" className="h-8" />
    </div>
  );

  // ─── Video step ───────────────────────────────────────────────────────────

  if (step === 'video') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <Logo />
        <video
          src="/intro.mp4"
          autoPlay
          playsInline
          className="w-full rounded-2xl shadow-md"
          onEnded={() => setStep('success')}
        />
        <Button
          onClick={() => setStep('success')}
          variant="ghost"
          size="sm"
          className="mt-4 text-muted-foreground"
        >
          Continuar <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ─── Success step ─────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Candidatura enviada!</h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
          Candidatura recebida. Nossa equipe analisará seu perfil e entrará em contato pelo e-mail em breve. Obrigado pelo interesse em fazer parte do time Camaleão.
        </p>
        <Button onClick={onBack} variant="outline" className="mt-8">
          Ver outras vagas
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <Logo />

      {/* Progress bar */}
      {typeof step === 'number' && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Etapa {step} de {totalSteps}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step: Aviso de documentos */}
      {step === 'aviso' && (
        <div>
          <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm mb-2">Antes de começar, separe estes documentos:</p>
              <ul className="space-y-1">
                {(job.type === 'guia' ? DOCS_GUIA : DOCS_ATENDIMENTO).map(doc => (
                  <li key={doc} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-3">O formulário leva aproximadamente 10–15 minutos. Tenha as informações em mãos para não precisar recomeçar.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={next} className="flex-1 gap-2">
              Entendi, vou me candidatar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1 — Dados Pessoais */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Dados Pessoais</h3>
            <p className="text-sm text-muted-foreground">Informações de contato e localização</p>
          </div>

          <div>
            <FieldLabel required>Nome completo</FieldLabel>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>WhatsApp com DDD</FieldLabel>
              <Input
                value={form.whatsapp}
                onChange={e => set('whatsapp', formatWhatsApp(e.target.value))}
                placeholder="(82) 99999-9999"
                inputMode="tel"
              />
            </div>
            <div>
              <FieldLabel required>E-mail</FieldLabel>
              <Input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com"
                type="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Data de nascimento</FieldLabel>
              <Input
                value={form.data_nascimento}
                onChange={e => set('data_nascimento', e.target.value)}
                type="date"
              />
            </div>
            <div>
              <FieldLabel required>Cidade e estado</FieldLabel>
              <Input
                value={form.cidade}
                onChange={e => set('cidade', e.target.value)}
                placeholder="Ex: Maceió, AL"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Com qual gênero você se identifica?</FieldLabel>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                ['masculino', 'Masculino'],
                ['feminino', 'Feminino'],
                ['nao_binario', 'Não-binário'],
                ['nao_informar', 'Prefiro não informar'],
              ].map(([val, label]) => (
                <RadioCard key={val} selected={form.genero === val} onClick={() => set('genero', val)}>
                  {label}
                </RadioCard>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel required>Disponibilidade de localização</FieldLabel>
            <div className="space-y-2 mt-1">
              {[
                ['moro_proximo', 'Moro em Maceió/AL ou arredores'],
                ['disponivel', 'Tenho disponibilidade para me mudar ou deslocar'],
                ['nao_disponivel', 'Não tenho disponibilidade de deslocamento'],
              ].map(([val, label]) => (
                <RadioCard
                  key={val}
                  selected={form.disponibilidade_deslocamento === val}
                  onClick={() => set('disponibilidade_deslocamento', val)}
                >
                  {label}
                </RadioCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Sobre você */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Sobre você</h3>
            <p className="text-sm text-muted-foreground">Nos ajude a entender seu perfil</p>
          </div>

          <div>
            <FieldLabel required>Como ficou sabendo desta vaga?</FieldLabel>
            <div className="space-y-2 mt-1">
              {[
                ['instagram', 'Instagram (@camaleaoecoturismo)'],
                ['indicacao', 'Indicação de amigo ou conhecido'],
                ['whatsapp', 'WhatsApp'],
                ['site', 'Site da Camaleão'],
                ['outro', 'Outro'],
              ].map(([val, label]) => (
                <RadioCard key={val} selected={form.como_soube === val} onClick={() => set('como_soube', val)}>
                  {label}
                </RadioCard>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel required>Disponibilidade de horário</FieldLabel>
            <p className="text-xs text-muted-foreground mb-3">Pode marcar mais de uma opção</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['comercial', 'Dias úteis — manhã e tarde (seg–sex)'],
                ['tarde_noite', 'Dias úteis — tarde e noite (seg–sex)'],
                ['sabados', 'Sábados'],
                ['domingos', 'Domingos'],
                ['feriados', 'Feriados'],
              ].map(([val, label]) => (
                <PillToggle
                  key={val}
                  selected={form.disponibilidade_horario.includes(val)}
                  onClick={() => toggleMulti('disponibilidade_horario', val)}
                >
                  {form.disponibilidade_horario.includes(val) ? '✓ ' : ''}{label}
                </PillToggle>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Específico por cargo */}
      {step === 3 && job.type === 'guia' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Experiência como Guia</h3>
            <p className="text-sm text-muted-foreground">Perguntas específicas para guias de turismo</p>
          </div>

          {/* Structured questions */}
          <div className="space-y-5">
            <div>
              <FieldLabel>Possui CADASTUR (Cadastro de Guia de Turismo)?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[['sim', 'Sim'], ['em_processo', 'Em processo de obtenção'], ['nao', 'Não possuo']].map(([val, label]) => (
                  <RadioCard key={val} selected={form.g_cadastur === val} onClick={() => set('g_cadastur', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Tempo de experiência como guia de turismo</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['nunca', 'Nunca atuei na área'],
                  ['menos1', 'Menos de 1 ano'],
                  ['1a3', '1 a 3 anos'],
                  ['mais3', 'Mais de 3 anos'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.g_experiencia === val} onClick={() => set('g_experiencia', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Já conhece os passeios da Camaleão Ecoturismo?</FieldLabel>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[['sim', 'Sim'], ['nao', 'Não']].map(([val, label]) => (
                  <RadioCard key={val} selected={form.g_conhece_camaleao === val} onClick={() => set('g_conhece_camaleao', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Regiões que você conhece bem</FieldLabel>
              <p className="text-xs text-muted-foreground mb-2">Pode marcar mais de uma opção</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['canions', 'Cânions do São Francisco'],
                  ['piranhas', 'Piranhas e entorno'],
                  ['chapada', 'Chapada Diamantina'],
                  ['zona_da_mata', 'Zona da Mata'],
                  ['litoral_sul', 'Litoral Sul'],
                  ['litoral_norte', 'Litoral Norte'],
                  ['agreste', 'Agreste'],
                  ['outra', 'Outra região'],
                ].map(([val, label]) => (
                  <PillToggle key={val} selected={form.g_regioes.includes(val)} onClick={() => toggleMulti('g_regioes', val)}>
                    {form.g_regioes.includes(val) ? '✓ ' : ''}{label}
                  </PillToggle>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Idiomas além do português</FieldLabel>
              <p className="text-xs text-muted-foreground mb-2">Pode marcar mais de uma opção</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['en_basico', 'Inglês básico'],
                  ['en_avancado', 'Inglês intermediário/avançado'],
                  ['es', 'Espanhol'],
                  ['outro', 'Outro'],
                ].map(([val, label]) => (
                  <PillToggle key={val} selected={form.g_idiomas.includes(val)} onClick={() => toggleMulti('g_idiomas', val)}>
                    {form.g_idiomas.includes(val) ? '✓ ' : ''}{label}
                  </PillToggle>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Especialidades e habilidades relevantes</FieldLabel>
              <p className="text-xs text-muted-foreground mb-2">Pode marcar mais de uma opção</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['trilhas', 'Trilhas e ecoturismo'],
                  ['fotografia', 'Fotografia'],
                  ['historia', 'História e cultura local'],
                  ['aventura', 'Esportes de aventura'],
                  ['grupos_grandes', 'Grupos grandes (+20 pax)'],
                  ['primeiros_socorros', 'Primeiros socorros'],
                ].map(([val, label]) => (
                  <PillToggle key={val} selected={form.g_especialidades.includes(val)} onClick={() => toggleMulti('g_especialidades', val)}>
                    {form.g_especialidades.includes(val) ? '✓ ' : ''}{label}
                  </PillToggle>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Está fisicamente apto para trabalho em campo (sol, água, trilhas)?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['sim', 'Sim, sem restrições'],
                  ['sim_restricoes', 'Sim, com restrições (explique abaixo)'],
                  ['nao_certeza', 'Não tenho certeza'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.g_aptidao === val} onClick={() => set('g_aptidao', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
              {form.g_aptidao === 'sim_restricoes' && (
                <div className="mt-2">
                  <Textarea
                    value={form.g_aptidao_restricoes}
                    onChange={e => set('g_aptidao_restricoes', e.target.value)}
                    placeholder="Descreva suas restrições"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-1">Perguntas abertas</p>
            <p className="text-xs text-muted-foreground mb-4">Não existe resposta certa ou errada. Seja honesto e escreva com suas próprias palavras.</p>
          </div>

          {/* Discursive questions */}
          <div className="space-y-5">
            <DiscursiveField
              label="Conte uma situação em que você precisou manter a calma enquanto outras pessoas estavam inseguras ou com medo. O que você fez?"
              value={form.g_disc_calma}
              onChange={v => set('g_disc_calma', v)}
            />
            <DiscursiveField
              label="O que você faz quando está cansado, mas ainda precisa continuar responsável por outras pessoas?"
              value={form.g_disc_cansado}
              onChange={v => set('g_disc_cansado', v)}
            />
            <DiscursiveField
              label="Como você reage quando alguém do grupo não segue orientações durante uma atividade?"
              value={form.g_disc_desobediencia}
              onChange={v => set('g_disc_desobediencia', v)}
            />
            <DiscursiveField
              label="Descreva um momento em que você precisou tomar uma decisão rápida em um ambiente fora do seu controle."
              value={form.g_disc_decisao}
              onChange={v => set('g_disc_decisao', v)}
            />
            <DiscursiveField
              label="O que, para você, faz uma experiência na natureza realmente valer a pena para quem participa?"
              value={form.g_disc_experiencia}
              onChange={v => set('g_disc_experiencia', v)}
            />
          </div>
        </div>
      )}

      {step === 3 && job.type === 'atendimento' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Experiência em Atendimento</h3>
            <p className="text-sm text-muted-foreground">Perguntas específicas para assistentes de atendimento</p>
          </div>

          {/* Structured questions */}
          <div className="space-y-5">
            <div>
              <FieldLabel>Experiência com atendimento ao cliente</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['sem_exp', 'Sem experiência'],
                  ['menos1', 'Menos de 1 ano'],
                  ['1a3', '1 a 3 anos'],
                  ['mais3', 'Mais de 3 anos'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_experiencia === val} onClick={() => set('a_experiencia', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Já utilizou algum CRM ou sistema de gestão de atendimento?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['sim_regularmente', 'Sim, regularmente'],
                  ['sim_algumas_vezes', 'Sim, algumas vezes'],
                  ['nao', 'Não'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_crm === val} onClick={() => set('a_crm', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Tem experiência com turismo, reservas ou hotelaria?</FieldLabel>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[['sim', 'Sim'], ['nao', 'Não']].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_turismo === val} onClick={() => set('a_turismo', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Ferramentas que usa no dia a dia</FieldLabel>
              <p className="text-xs text-muted-foreground mb-2">Pode marcar mais de uma opção</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['planilhas', 'Google Planilhas / Excel'],
                  ['agenda', 'Google Agenda'],
                  ['redes', 'Instagram profissional'],
                  ['gestao', 'Notion / Trello'],
                  ['reservas', 'Sistema de reservas'],
                  ['nenhuma', 'Nenhuma das anteriores'],
                ].map(([val, label]) => (
                  <PillToggle key={val} selected={form.a_ferramentas.includes(val)} onClick={() => toggleMulti('a_ferramentas', val)}>
                    {form.a_ferramentas.includes(val) ? '✓ ' : ''}{label}
                  </PillToggle>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Como você se autoavalia na escrita e comunicação?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['otima', 'Ótima — escrevo sem erros, com clareza'],
                  ['boa', 'Boa — me comunico bem, cometo erros ocasionais'],
                  ['em_dev', 'Em desenvolvimento'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_escrita === val} onClick={() => set('a_escrita', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Já trabalhou remotamente / home office?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['sim_longo', 'Sim, por mais de 6 meses'],
                  ['sim_breve', 'Sim, brevemente'],
                  ['nao', 'Não'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_home_office === val} onClick={() => set('a_home_office', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Você lida bem com múltiplas tarefas simultâneas?</FieldLabel>
              <div className="space-y-2 mt-1">
                {[
                  ['sim', 'Sim, com facilidade'],
                  ['prefiro_uma', 'Sim, mas prefiro focar em uma coisa por vez'],
                  ['dificuldade', 'Tenho dificuldade com isso'],
                ].map(([val, label]) => (
                  <RadioCard key={val} selected={form.a_multitarefas === val} onClick={() => set('a_multitarefas', val)}>
                    {label}
                  </RadioCard>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-1">Perguntas abertas</p>
            <p className="text-xs text-muted-foreground mb-4">Não existe resposta certa ou errada. Seja honesto e escreva com suas próprias palavras.</p>
          </div>

          {/* Discursive questions */}
          <div className="space-y-5">
            <DiscursiveField
              label="Quando um cliente faz várias perguntas ao mesmo tempo, como você organiza sua resposta?"
              value={form.a_disc_multiplas}
              onChange={v => set('a_disc_multiplas', v)}
            />
            <DiscursiveField
              label="Conte uma situação em que você precisou lidar com alguém impaciente ou exigente. Como conduziu?"
              value={form.a_disc_impaciente}
              onChange={v => set('a_disc_impaciente', v)}
            />
            <DiscursiveField
              label="Como você se organiza quando tem várias demandas ao mesmo tempo e todas parecem urgentes?"
              value={form.a_disc_demandas}
              onChange={v => set('a_disc_demandas', v)}
            />
            <DiscursiveField
              label="O que você faz quando percebe que cometeu um erro em algo que já foi passado para o cliente?"
              value={form.a_disc_erro}
              onChange={v => set('a_disc_erro', v)}
            />
            <DiscursiveField
              label="Na sua opinião, o que diferencia um atendimento comum de um atendimento bem feito?"
              value={form.a_disc_diferencial}
              onChange={v => set('a_disc_diferencial', v)}
            />
          </div>
        </div>
      )}

      {/* Step 4 — Motivação */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Motivação</h3>
            <p className="text-sm text-muted-foreground">Queremos te conhecer melhor</p>
          </div>

          <div>
            <FieldLabel required>Por que quer trabalhar na Camaleão Ecoturismo?</FieldLabel>
            <Textarea
              value={form.motivacao}
              onChange={e => set('motivacao', e.target.value)}
              placeholder="Conte o que te motivou a se candidatar, o que você valoriza no ecoturismo e no nosso trabalho..."
              rows={5}
            />
          </div>

          <div>
            <FieldLabel>Experiência ou habilidade relevante para esta vaga</FieldLabel>
            <p className="text-xs text-muted-foreground mb-1.5">Opcional — mas pode fazer a diferença</p>
            <Textarea
              value={form.experiencia_relevante}
              onChange={e => set('experiencia_relevante', e.target.value)}
              placeholder="Descreva uma experiência profissional, habilidade ou projeto que considera relevante..."
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Step 5 — Documentos */}
      {step === 5 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Documentos</h3>
            <p className="text-sm text-muted-foreground">Estamos quase lá! Só mais um passo.</p>
          </div>

          <div>
            <FieldLabel>Currículo em PDF</FieldLabel>
            <p className="text-xs text-muted-foreground mb-2">Recomendado — apenas arquivos .pdf são aceitos</p>

            {curriculoFile ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary bg-primary/5">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm text-foreground font-medium flex-1 truncate">{curriculoFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setCurriculoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para selecionar o PDF</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                  toast.error('Por favor, selecione um arquivo PDF.');
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  toast.error('O arquivo deve ter no máximo 10 MB.');
                  return;
                }
                setCurriculoFile(file);
              }}
            />
          </div>

          <div>
            <FieldLabel>Observações finais</FieldLabel>
            <p className="text-xs text-muted-foreground mb-1.5">Opcional — alguma informação adicional que queira compartilhar</p>
            <Textarea
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              placeholder="Qualquer coisa que queira nos contar e que não teve espaço acima..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      {step !== 'aviso' && step !== 'success' && step !== 'video' && (
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={prev} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < 5 ? (
            <Button onClick={next} className="flex-1 gap-2">
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 gap-2">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <>Enviar candidatura <CheckCircle2 className="h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
