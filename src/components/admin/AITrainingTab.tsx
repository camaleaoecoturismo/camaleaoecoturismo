import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Brain, Check, Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Save } from 'lucide-react';

type Category = 'regra' | 'contexto' | 'comportamento' | 'promocao';

interface Instruction {
  id: string;
  title: string;
  content: string;
  category: Category;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface AgentConfig {
  key: string;
  label: string;
  value: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  regra: 'Regra',
  contexto: 'Contexto',
  comportamento: 'Comportamento',
  promocao: 'Promoção',
};

const CATEGORY_COLORS: Record<Category, string> = {
  regra: 'bg-blue-100 text-blue-700 border-blue-200',
  contexto: 'bg-green-100 text-green-700 border-green-200',
  comportamento: 'bg-orange-100 text-orange-700 border-orange-200',
  promocao: 'bg-purple-100 text-purple-700 border-purple-200',
};

const CATEGORY_DOT: Record<Category, string> = {
  regra: 'bg-blue-500',
  contexto: 'bg-green-500',
  comportamento: 'bg-orange-500',
  promocao: 'bg-purple-500',
};

function useDebouncedSave(value: string, key: string, onSaved: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await supabase.from('ai_agent_config').upsert({ key, value, updated_at: new Date().toISOString() });
      lastSaved.current = value;
      onSaved();
    }, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, key]);
}

function ConfigCard({ config, onChange }: { config: AgentConfig; onChange: (key: string, value: string) => void }) {
  const [localValue, setLocalValue] = useState(config.value);
  const [saved, setSaved] = useState(false);

  useDebouncedSave(localValue, config.key, () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  const handleChange = (v: string) => {
    setLocalValue(v);
    onChange(config.key, v);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
        {saved && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="w-3 h-3" /> Salvo
          </span>
        )}
      </div>
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Deixe em branco para não usar..."
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none"
      />
      <p className="text-[10px] text-gray-400 mt-1">Salvo automaticamente após digitar</p>
    </div>
  );
}

function InstructionCard({
  instruction,
  onToggle,
  onDelete,
  onUpdate,
}: {
  instruction: Instruction;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, content: string, category: Category) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(instruction.title);
  const [content, setContent] = useState(instruction.content);
  const [category, setCategory] = useState<Category>(instruction.category);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(instruction.id, title, content, category);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${instruction.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Category dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[instruction.category]}`} />

        {/* Title + category badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${CATEGORY_COLORS[instruction.category]}`}>
              {CATEGORY_LABELS[instruction.category]}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{instruction.title}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onToggle(instruction.id, !instruction.is_active)}
            className={`p-1.5 rounded-lg transition-colors ${instruction.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
            title={instruction.is_active ? 'Desativar' : 'Ativar'}
          >
            {instruction.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onDelete(instruction.id)}
            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Instrução</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{instruction.content}</p>
              <button
                onClick={() => setEditing(true)}
                className="mt-2 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Editar instrução
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewInstructionForm({ onCreated }: { onCreated: (i: Instruction) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('regra');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('ai_instructions')
      .insert({ title: title.trim(), content: content.trim(), category, is_active: true, priority: 0 })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onCreated(data as Instruction);
      setTitle('');
      setContent('');
      setCategory('regra');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nova instrução
      </button>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-emerald-700">Nova instrução</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Promoção grupos"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 bg-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 bg-white"
          >
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-gray-500 mb-1 block">Instrução para a Camila</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex: Para grupos acima de 10 pessoas, sempre mencione que oferecemos desconto especial e condições personalizadas."
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none bg-white"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !title.trim() || !content.trim()}
          className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Criar instrução
        </button>
      </div>
    </div>
  );
}

export default function AITrainingTab() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [instrRes, configRes] = await Promise.all([
      supabase.from('ai_instructions').select('*').order('priority').order('created_at'),
      supabase.from('ai_agent_config').select('*').order('key'),
    ]);
    setInstructions((instrRes.data as Instruction[]) ?? []);
    setConfigs((configRes.data as AgentConfig[]) ?? []);
    setLoading(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('ai_instructions').update({ is_active: active }).eq('id', id);
    setInstructions((prev) => prev.map((i) => i.id === id ? { ...i, is_active: active } : i));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta instrução?')) return;
    await supabase.from('ai_instructions').delete().eq('id', id);
    setInstructions((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdate = async (id: string, title: string, content: string, category: Category) => {
    await supabase.from('ai_instructions').update({ title, content, category }).eq('id', id);
    setInstructions((prev) => prev.map((i) => i.id === id ? { ...i, title, content, category } : i));
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigs((prev) => prev.map((c) => c.key === key ? { ...c, value } : c));
  };

  const activeCount = instructions.filter((i) => i.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Brain className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Treinamento da Camila</h2>
          <p className="text-xs text-gray-500">
            {activeCount} instrução{activeCount !== 1 ? 'ões' : ''} ativa{activeCount !== 1 ? 's' : ''} · aplica-se a todas as conversas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configs gerais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Configurações gerais</h3>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Informações sempre presentes em todas as conversas. Útil para contexto sazonal, promoções temporárias ou detalhes da empresa não cobertos pelo sistema.
          </p>
          {configs.map((config) => (
            <ConfigCard key={config.key} config={config} onChange={handleConfigChange} />
          ))}
        </div>

        {/* Right: Instructions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Instruções</h3>
            <div className="flex gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <span key={c} className={`text-[10px] border rounded-full px-2 py-0.5 ${CATEGORY_COLORS[c]}`}>
                  {CATEGORY_LABELS[c]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Regras e diretrizes pontuais. Ative/desative individualmente sem perder o conteúdo. Clique para editar.
          </p>

          <NewInstructionForm onCreated={(i) => setInstructions((prev) => [i, ...prev])} />

          {instructions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma instrução criada ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {instructions.map((instruction) => (
                <InstructionCard
                  key={instruction.id}
                  instruction={instruction}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
