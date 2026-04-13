import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Briefcase, Plus, Pencil, Power, PowerOff, ChevronRight,
  Loader2, X, Check, Users, CalendarDays, Eye,
  Phone, Mail, MapPin, FileText, ExternalLink, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Types ─────────────────────────────────────────────────────────────────

interface JobOpening {
  id: string;
  title: string;
  type: 'guia' | 'atendimento';
  short_description: string | null;
  full_description: string | null;
  requirements: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface JobApplication {
  id: string;
  job_opening_id: string | null;
  nome: string;
  whatsapp: string;
  email: string;
  data_nascimento: string | null;
  cidade: string;
  disponibilidade_deslocamento: string | null;
  como_soube: string | null;
  disponibilidade_horario: string[] | null;
  respostas_especificas: Record<string, unknown> | null;
  experiencia_relevante: string | null;
  curriculo_url: string | null;
  observacoes: string | null;
  status: string;
  admin_notas: string | null;
  created_at: string;
}

// ─── Status badge ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  arquivado: 'Arquivado',
};

const STATUS_VARIANT: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  em_analise: 'bg-blue-100 text-blue-800 border-blue-200',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reprovado: 'bg-red-100 text-red-800 border-red-200',
  arquivado: 'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_VARIANT[status] ?? STATUS_VARIANT.pendente}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Job form modal ─────────────────────────────────────────────────────────

interface JobFormData {
  title: string;
  type: 'guia' | 'atendimento';
  short_description: string;
  full_description: string;
  requirements: string;
}

const EMPTY_JOB_FORM: JobFormData = {
  title: '', type: 'guia', short_description: '', full_description: '', requirements: '',
};

function JobFormModal({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: JobOpening | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<JobFormData>(EMPTY_JOB_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title,
          type: initial.type,
          short_description: initial.short_description ?? '',
          full_description: initial.full_description ?? '',
          requirements: (initial.requirements ?? []).join('\n'),
        });
      } else {
        setForm(EMPTY_JOB_FORM);
      }
    }
  }, [open, initial]);

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Informe o título da vaga.'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      requirements: form.requirements.split('\n').map(r => r.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };
    let error;
    if (initial) {
      ({ error } = await supabase.from('job_openings' as any).update(payload).eq('id', initial.id));
    } else {
      ({ error } = await supabase.from('job_openings' as any).insert({ ...payload, is_active: true }));
    }
    setSaving(false);
    if (error) { toast.error('Erro ao salvar vaga.'); return; }
    toast.success(initial ? 'Vaga atualizada.' : 'Vaga criada.');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar vaga' : 'Nova vaga'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm mb-1.5 block">Título <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Guia de Turismo" />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Tipo de cargo</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as 'guia' | 'atendimento' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guia">Guia de Turismo</SelectItem>
                <SelectItem value="atendimento">Assistente de Atendimento e Operações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Descrição curta</Label>
            <Textarea
              value={form.short_description}
              onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))}
              placeholder="Frase de apresentação da vaga (aparece no card)"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Descrição completa</Label>
            <Textarea
              value={form.full_description}
              onChange={e => setForm(p => ({ ...p, full_description: e.target.value }))}
              placeholder="Responsabilidades, contexto, etc."
              rows={4}
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Requisitos</Label>
            <p className="text-xs text-muted-foreground mb-1">Um requisito por linha</p>
            <Textarea
              value={form.requirements}
              onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
              placeholder={"Boa comunicação\nConhecimento da região\nCADASTUR (diferencial)"}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {initial ? 'Salvar alterações' : 'Criar vaga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Label translation maps ─────────────────────────────────────────────────

const DESLOCAMENTO_LABELS: Record<string, string> = {
  moro_proximo: 'Moro em Maceió/AL ou arredores',
  disponivel: 'Disponível para se mudar ou deslocar',
  nao_disponivel: 'Sem disponibilidade de deslocamento',
};

const COMO_SOUBE_LABELS: Record<string, string> = {
  instagram: 'Instagram (@camaleaoecoturismo)',
  indicacao: 'Indicação de amigo/conhecido',
  whatsapp: 'WhatsApp',
  site: 'Site da Camaleão',
  outro: 'Outro',
};

const HORARIO_LABELS: Record<string, string> = {
  comercial: 'Dias úteis — manhã e tarde',
  tarde_noite: 'Dias úteis — tarde e noite',
  sabados: 'Sábados',
  domingos: 'Domingos',
  feriados: 'Feriados',
  // legacy values
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral', fds: 'Fins de semana',
};

const GUIA_FIELD_LABELS: Record<string, string> = {
  cadastur: 'CADASTUR',
  experiencia: 'Experiência como guia',
  conhece_camaleao: 'Conhece os passeios da Camaleão',
  regioes: 'Regiões conhecidas',
  idiomas: 'Idiomas',
  especialidades: 'Especialidades',
  aptidao: 'Aptidão física',
  aptidao_restricoes: 'Restrições físicas',
};

const GUIA_VALUE_LABELS: Record<string, Record<string, string>> = {
  cadastur: { sim: 'Sim', em_processo: 'Em processo', nao: 'Não possui' },
  experiencia: { nunca: 'Nunca atuei', menos1: 'Menos de 1 ano', '1a3': '1 a 3 anos', mais3: 'Mais de 3 anos' },
  conhece_camaleao: { sim: 'Sim', nao: 'Não' },
  aptidao: { sim: 'Sem restrições', sim_restricoes: 'Com restrições', nao_certeza: 'Não tenho certeza' },
};

const ARRAY_ITEM_LABELS: Record<string, Record<string, string>> = {
  regioes: {
    canions: 'Cânions do São Francisco', piranhas: 'Piranhas e entorno', chapada: 'Chapada Diamantina',
    zona_da_mata: 'Zona da Mata', litoral_sul: 'Litoral Sul', litoral_norte: 'Litoral Norte',
    agreste: 'Agreste', outra: 'Outra região',
  },
  idiomas: {
    en_basico: 'Inglês básico', en_avancado: 'Inglês intermediário/avançado', es: 'Espanhol', outro: 'Outro',
  },
  especialidades: {
    trilhas: 'Trilhas e ecoturismo', fotografia: 'Fotografia', historia: 'História e cultura local',
    aventura: 'Esportes de aventura', grupos_grandes: 'Grupos grandes (+20 pax)', primeiros_socorros: 'Primeiros socorros',
  },
  ferramentas: {
    planilhas: 'Google Planilhas/Excel', agenda: 'Google Agenda', redes: 'Instagram profissional',
    gestao: 'Notion/Trello', reservas: 'Sistema de reservas', nenhuma: 'Nenhuma',
  },
};

const ATEND_FIELD_LABELS: Record<string, string> = {
  experiencia_atendimento: 'Experiência em atendimento',
  crm: 'CRM / sistema de atendimento',
  exp_turismo: 'Experiência em turismo/reservas',
  ferramentas: 'Ferramentas utilizadas',
  escrita: 'Escrita e comunicação',
  home_office: 'Experiência em home office',
  multitarefas: 'Múltiplas tarefas simultâneas',
};

const ATEND_VALUE_LABELS: Record<string, Record<string, string>> = {
  experiencia_atendimento: { sem_exp: 'Sem experiência', menos1: 'Menos de 1 ano', '1a3': '1 a 3 anos', mais3: 'Mais de 3 anos' },
  crm: { sim_regularmente: 'Sim, regularmente', sim_algumas_vezes: 'Sim, algumas vezes', nao: 'Não' },
  exp_turismo: { sim: 'Sim', nao: 'Não' },
  escrita: { otima: 'Ótima', boa: 'Boa', em_dev: 'Em desenvolvimento' },
  home_office: { sim_longo: 'Sim, mais de 6 meses', sim_breve: 'Sim, brevemente', nao: 'Não' },
  multitarefas: { sim: 'Sim, com facilidade', prefiro_uma: 'Prefere uma por vez', dificuldade: 'Com dificuldade' },
};

const GUIA_DISC_LABELS: Record<string, string> = {
  disc_calma: 'Manter a calma — situação relatada',
  disc_cansado: 'Quando cansado mas responsável',
  disc_desobediencia: 'Quando alguém não segue orientações',
  disc_decisao: 'Decisão rápida em ambiente incerto',
  disc_experiencia: 'O que faz uma experiência valer a pena',
};

const ATEND_DISC_LABELS: Record<string, string> = {
  disc_multiplas: 'Várias perguntas ao mesmo tempo',
  disc_impaciente: 'Cliente impaciente ou exigente',
  disc_demandas: 'Múltiplas demandas urgentes',
  disc_erro: 'Quando percebe um erro cometido',
  disc_diferencial: 'Diferencial de um bom atendimento',
};

const GENERO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  nao_binario: 'Não-binário',
  nao_informar: 'Prefere não informar',
};

function translateSpecValue(fieldKey: string, value: unknown, fieldLabels: Record<string, Record<string, string>>): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    const map = ARRAY_ITEM_LABELS[fieldKey];
    return value.map(v => map?.[v] ?? v).join(', ');
  }
  const map = fieldLabels[fieldKey];
  return map?.[String(value)] ?? String(value);
}

// ─── Application detail sheet ───────────────────────────────────────────────

function ApplicationSheet({
  app,
  jobTitle,
  open,
  onOpenChange,
  onStatusChange,
}: {
  app: JobApplication;
  jobTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChange: (id: string, status: string, notas: string) => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [notas, setNotas] = useState(app.admin_notas ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(app.status);
    setNotas(app.admin_notas ?? '');
  }, [app]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('job_applications' as any)
      .update({ status, admin_notas: notas, updated_at: new Date().toISOString() })
      .eq('id', app.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar.'); return; }
    toast.success('Candidatura atualizada.');
    onStatusChange(app.id, status, notas);
  }

  const spec = app.respostas_especificas as Record<string, unknown> | null;
  const isGuia = spec != null && ('cadastur' in spec || 'regioes' in spec);
  const fieldLabels = isGuia ? GUIA_FIELD_LABELS : ATEND_FIELD_LABELS;
  const valueMaps = isGuia ? GUIA_VALUE_LABELS : ATEND_VALUE_LABELS;
  const discLabels = isGuia ? GUIA_DISC_LABELS : ATEND_DISC_LABELS;

  // Specific answer fields (excluding motivacao and disc_* which are shown separately)
  const specificKeys = isGuia
    ? ['cadastur', 'experiencia', 'conhece_camaleao', 'regioes', 'idiomas', 'especialidades', 'aptidao', 'aptidao_restricoes']
    : ['experiencia_atendimento', 'crm', 'exp_turismo', 'ferramentas', 'escrita', 'home_office', 'multitarefas'];

  const discKeys = Object.keys(discLabels);

  const whatsappDigits = app.whatsapp.replace(/\D/g, '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">{app.nome}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} />
            <span className="text-xs text-muted-foreground">{jobTitle}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-8">

          {/* Quick contact actions */}
          <div className="flex gap-2">
            <a
              href={`https://wa.me/55${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted/50 transition-colors flex-1 justify-center font-medium"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              WhatsApp
            </a>
            <a
              href={`mailto:${app.email}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted/50 transition-colors flex-1 justify-center font-medium"
            >
              <Mail className="h-4 w-4 text-blue-500" />
              E-mail
            </a>
            {app.curriculo_url && (
              <a
                href={app.curriculo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted/50 transition-colors flex-1 justify-center font-medium"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                Currículo
              </a>
            )}
          </div>

          {/* Status + notas */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <Label className="text-sm font-medium">Status da candidatura</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-sm mb-1.5 block">Notas internas</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observações para a equipe..." rows={3} />
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>

          {/* Dados pessoais */}
          <Section title="Dados Pessoais">
            <Row label="WhatsApp" value={app.whatsapp} />
            <Row label="E-mail" value={app.email} />
            {app.data_nascimento && <Row label="Nascimento" value={new Date(app.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')} />}
            <Row label="Cidade" value={app.cidade} />
            {(app as any).genero && <Row label="Gênero" value={GENERO_LABELS[(app as any).genero] ?? (app as any).genero} />}
            <Row label="Localização" value={DESLOCAMENTO_LABELS[app.disponibilidade_deslocamento ?? ''] ?? app.disponibilidade_deslocamento ?? '—'} />
          </Section>

          {/* Sobre */}
          <Section title="Sobre você">
            <Row label="Como soube da vaga" value={COMO_SOUBE_LABELS[app.como_soube ?? ''] ?? app.como_soube ?? '—'} />
            <Row
              label="Disponibilidade"
              value={
                app.disponibilidade_horario?.length
                  ? app.disponibilidade_horario.map(h => HORARIO_LABELS[h] ?? h).join(', ')
                  : '—'
              }
            />
          </Section>

          {/* Respostas específicas */}
          {spec && specificKeys.some(k => spec[k] != null && spec[k] !== '' && !(Array.isArray(spec[k]) && (spec[k] as unknown[]).length === 0)) && (
            <Section title={isGuia ? 'Experiência como Guia' : 'Experiência em Atendimento'}>
              {specificKeys.map(key => {
                const val = spec[key];
                if (val === null || val === undefined || val === '') return null;
                if (Array.isArray(val) && val.length === 0) return null;
                // aptidao_restricoes is free text — show as a paragraph
                if (key === 'aptidao_restricoes') {
                  return (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground mb-0.5">{fieldLabels[key] ?? key}</p>
                      <p className="text-sm text-foreground">{String(val)}</p>
                    </div>
                  );
                }
                return (
                  <Row
                    key={key}
                    label={fieldLabels[key] ?? key.replace(/_/g, ' ')}
                    value={translateSpecValue(key, val, valueMaps)}
                  />
                );
              })}
            </Section>
          )}

          {/* Perguntas abertas (discursivas) */}
          {spec && discKeys.some(k => spec[k]) && (
            <Section title="Perguntas abertas">
              {discKeys.map(key => {
                const val = spec[key];
                if (!val) return null;
                return (
                  <div key={key} className="py-1">
                    <p className="text-xs text-muted-foreground mb-1">{discLabels[key]}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(val)}</p>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Motivação */}
          {spec?.motivacao && (
            <Section title="Por que quer trabalhar na Camaleão">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(spec.motivacao)}</p>
            </Section>
          )}

          {/* Experiência relevante */}
          {app.experiencia_relevante && (
            <Section title="Experiência relevante">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{app.experiencia_relevante}</p>
            </Section>
          )}

          {/* Observações */}
          {app.observacoes && (
            <Section title="Observações da candidatura">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{app.observacoes}</p>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-2 rounded-xl border border-border px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right break-words max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function VagasAdminTab() {
  const [innerTab, setInnerTab] = useState<'vagas' | 'candidaturas'>('vagas');
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  // filters
  const [filterVaga, setFilterVaga] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  async function loadOpenings() {
    setLoadingOpenings(true);
    const { data } = await supabase.from('job_openings' as any).select('*').order('display_order');
    if (data) setOpenings(data as JobOpening[]);
    setLoadingOpenings(false);
  }

  async function loadApplications() {
    setLoadingApps(true);
    const { data } = await supabase
      .from('job_applications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setApplications(data as JobApplication[]);
    setLoadingApps(false);
  }

  useEffect(() => { loadOpenings(); }, []);
  useEffect(() => { if (innerTab === 'candidaturas') loadApplications(); }, [innerTab]);

  async function toggleActive(job: JobOpening) {
    const { error } = await supabase
      .from('job_openings' as any)
      .update({ is_active: !job.is_active, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    if (error) { toast.error('Erro ao atualizar vaga.'); return; }
    toast.success(job.is_active ? 'Vaga encerrada.' : 'Vaga reaberta.');
    loadOpenings();
  }

  const filteredApps = applications.filter(a => {
    if (filterVaga !== 'all' && a.job_opening_id !== filterVaga) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const jobMap = new Map(openings.map(j => [j.id, j.title]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vagas & Talentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie vagas abertas e revise candidaturas</p>
        </div>
      </div>

      {/* Inner tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {(['vagas', 'candidaturas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setInnerTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              innerTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'vagas' ? 'Vagas' : 'Candidaturas'}
            {tab === 'candidaturas' && applications.filter(a => a.status === 'pendente').length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {applications.filter(a => a.status === 'pendente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Vagas */}
      {innerTab === 'vagas' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{openings.length} vaga{openings.length !== 1 ? 's' : ''} cadastrada{openings.length !== 1 ? 's' : ''}</p>
            <Button onClick={() => { setEditingJob(null); setJobModalOpen(true); }} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nova vaga
            </Button>
          </div>

          {loadingOpenings ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="space-y-3">
              {openings.map(job => {
                const appCount = applications.filter(a => a.job_opening_id === job.id).length;
                return (
                  <div key={job.id} className="flex items-center gap-4 bg-background border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-shadow">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${job.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.is_active ? 'Ativa' : 'Encerrada'} ·{' '}
                        {appCount} candidatura{appCount !== 1 ? 's' : ''} ·{' '}
                        Criada em {new Date(job.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingJob(job); setJobModalOpen(true); }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(job)}
                        className={`p-2 rounded-lg transition-colors ${
                          job.is_active
                            ? 'text-muted-foreground hover:bg-red-50 hover:text-red-600'
                            : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                        title={job.is_active ? 'Encerrar vaga' : 'Reabrir vaga'}
                      >
                        {job.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Candidaturas */}
      {innerTab === 'candidaturas' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterVaga} onValueChange={setFilterVaga}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Todas as vagas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vagas</SelectItem>
                {openings.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground self-center">
              {filteredApps.length} resultado{filteredApps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingApps ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma candidatura encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApps.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="w-full flex items-center gap-4 bg-background border border-border rounded-xl px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{app.nome}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {jobMap.get(app.job_opening_id ?? '') ?? 'Vaga removida'} · {app.cidade} · {new Date(app.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job form modal */}
      <JobFormModal
        open={jobModalOpen}
        onOpenChange={setJobModalOpen}
        initial={editingJob}
        onSaved={loadOpenings}
      />

      {/* Application detail sheet */}
      {selectedApp && (
        <ApplicationSheet
          app={selectedApp}
          jobTitle={jobMap.get(selectedApp.job_opening_id ?? '') ?? 'Vaga'}
          open={!!selectedApp}
          onOpenChange={open => { if (!open) setSelectedApp(null); }}
          onStatusChange={(id, status, notas) => {
            setApplications(prev => prev.map(a => a.id === id ? { ...a, status, admin_notas: notas } : a));
            setSelectedApp(prev => prev ? { ...prev, status, admin_notas: notas } : null);
          }}
        />
      )}
    </div>
  );
}
