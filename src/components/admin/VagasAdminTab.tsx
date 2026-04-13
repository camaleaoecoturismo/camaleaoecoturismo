import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Briefcase, Plus, Pencil, Power, PowerOff, ChevronRight,
  Loader2, X, Check, Users, CalendarDays, Eye,
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

// ─── Application detail sheet ───────────────────────────────────────────────

function formatField(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Candidatura — {app.nome}</SheetTitle>
          <p className="text-sm text-muted-foreground">{jobTitle} · {new Date(app.created_at).toLocaleDateString('pt-BR')}</p>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Status */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Status da candidatura</Label>
              <StatusBadge status={status} />
            </div>
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
            <Row label="Nome" value={app.nome} />
            <Row label="WhatsApp" value={app.whatsapp} />
            <Row label="E-mail" value={app.email} />
            <Row label="Data de nascimento" value={app.data_nascimento ?? '—'} />
            <Row label="Cidade" value={app.cidade} />
            <Row label="Disponibilidade de deslocamento" value={app.disponibilidade_deslocamento ?? '—'} />
          </Section>

          {/* Sobre */}
          <Section title="Sobre você">
            <Row label="Como soube da vaga" value={app.como_soube ?? '—'} />
            <Row label="Disponibilidade de horário" value={formatField('', app.disponibilidade_horario)} />
          </Section>

          {/* Respostas específicas */}
          {spec && Object.keys(spec).length > 0 && (
            <Section title="Respostas específicas">
              {Object.entries(spec).map(([key, val]) => (
                <Row key={key} label={key.replace(/_/g, ' ')} value={formatField(key, val)} />
              ))}
            </Section>
          )}

          {/* Motivação */}
          {app.experiencia_relevante && (
            <Section title="Motivação">
              <div className="text-sm text-foreground whitespace-pre-wrap">{app.experiencia_relevante}</div>
            </Section>
          )}

          {/* Documentos */}
          <Section title="Documentos">
            {app.curriculo_url ? (
              <a
                href={app.curriculo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-2 break-all"
              >
                {app.curriculo_url}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">Não informado</span>
            )}
          </Section>

          {app.observacoes && (
            <Section title="Observações da candidatura">
              <p className="text-sm text-foreground whitespace-pre-wrap">{app.observacoes}</p>
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
      <div className="space-y-1.5 bg-muted/30 rounded-xl p-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground capitalize shrink-0">{label}</span>
      <span className="text-foreground text-right break-words max-w-[65%]">{value || '—'}</span>
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
