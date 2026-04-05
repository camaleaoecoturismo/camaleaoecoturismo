import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, ChevronDown, ChevronUp, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TourInfoItemsEditor } from '@/components/TourInfoItemsEditor';
import { TourGalleryManager } from '@/components/TourGalleryManager';
import { TourBoardingPointsManager } from '@/components/TourBoardingPointsManager';
import { TourOptionalItemsManager } from '@/components/TourOptionalItemsManager';
import { TourPaymentConfig } from '@/components/TourPaymentConfig';
import { TourTransportConfig } from '@/components/transport/TourTransportConfig';

// Para incluso/não incluso — listas simples
const QUILL_MODULES_LIST = {
  toolbar: [
    ['bold', 'italic'],
    [{ color: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
};

interface Categoria {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
}

interface BulkTourEditorProps {
  tours: Tour[];
  onBack: () => void;
  onSaveSuccess: () => void;
}

interface TourEdit extends Tour {
  hasChanges?: boolean;
  _description?: string;
  _etiqueta?: string;
  _name?: string;
  _city?: string;
  _state?: string;
  _start_date?: string;
  _end_date?: string;
  _start_time?: string;
  _end_time?: string;
  _whatsapp_group_link?: string;
  _vagas?: number | null;
  _valor_padrao?: number;
  _pix_discount_percent?: number;
  _is_active?: boolean;
  _is_exclusive?: boolean;
  _is_featured?: boolean;
  _has_accommodation?: boolean;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

const TOUR_TABS = [
  { key: 'conteudo', label: 'Conteúdo' },
  { key: 'basico', label: 'Básico' },
  { key: 'galeria', label: 'Galeria' },
  { key: 'embarques', label: 'Embarques' },
  { key: 'opcionais', label: 'Opcionais' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'info', label: 'Info Extra' },
] as const;

type TourTab = typeof TOUR_TABS[number]['key'];

const BulkTourEditor: React.FC<BulkTourEditorProps> = ({ tours, onBack, onSaveSuccess }) => {
  const [editableTours, setEditableTours] = useState<TourEdit[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTabs, setActiveTabs] = useState<Map<string, TourTab>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [filterTime, setFilterTime] = useState<'futuros' | 'passados' | 'todos'>('futuros');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Categories
  const [allCategorias, setAllCategorias] = useState<Categoria[]>([]);
  const [tourCategorias, setTourCategorias] = useState<Map<string, string[]>>(new Map()); // tourId → catIds

  const { toast } = useToast();

  // Módulos completos com handler de upload de vídeo (criado uma vez para não reinicializar o Quill)
  const fullModules = useMemo(() => {
    const handleVideoUpload = async function(this: any) {
      const quill = this.quill;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4,video/webm,video/ogg,video/mov,video/quicktime,video/*';
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 300 * 1024 * 1024) {
          toast({ title: 'Vídeo muito grande', description: 'Tamanho máximo: 300 MB', variant: 'destructive' });
          return;
        }
        toast({ title: 'Enviando vídeo...', description: 'Aguarde.' });
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}-${safeName}`;
        const { data, error } = await supabase.storage.from('tour-videos').upload(path, file, { contentType: file.type });
        if (error) { toast({ title: 'Erro ao enviar vídeo', description: error.message, variant: 'destructive' }); return; }
        const { data: { publicUrl } } = supabase.storage.from('tour-videos').getPublicUrl(data.path);
        const range = quill.getSelection(true);
        quill.clipboard.dangerouslyPasteHTML(
          range ? range.index : quill.getLength(),
          `<p><video controls src="${publicUrl}" style="max-width:100%;border-radius:6px;"></video></p><p><br></p>`
        );
        toast({ title: 'Vídeo inserido!' });
      };
    };
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link', 'video'],
          ['blockquote'],
          ['clean'],
        ],
        handlers: { video: handleVideoUpload },
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sorted = [...tours].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    setEditableTours(sorted.map(tour => ({ ...tour, hasChanges: false })));
  }, [tours]);

  // Fetch categories
  useEffect(() => {
    supabase.from('categorias_passeio').select('id, nome, icone, cor').eq('ativo', true).order('ordem')
      .then(({ data }) => { if (data) setAllCategorias(data as Categoria[]); });
  }, []);

  // Fetch tour categories for all visible tours (bulk)
  useEffect(() => {
    if (!tours.length) return;
    const ids = tours.map(t => t.id);
    supabase.from('tour_categorias').select('tour_id, categoria_id').in('tour_id', ids)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, string[]>();
        (data as any[]).forEach(row => {
          if (!map.has(row.tour_id)) map.set(row.tour_id, []);
          map.get(row.tour_id)!.push(row.categoria_id);
        });
        setTourCategorias(map);
      });
  }, [tours]);

  const today = new Date().toISOString().slice(0, 10);

  const visibleTours = useMemo(() => {
    return editableTours
      .filter(t => filterActive ? ((t as any).is_active && !(t as any).is_exclusive) : true)
      .filter(t => {
        if (filterTime === 'futuros') return (t.start_date || '') >= today;
        if (filterTime === 'passados') return (t.start_date || '') < today;
        return true;
      })
      .filter(t => filterYear ? t.start_date?.startsWith(String(filterYear)) : true)
      .filter(t => filterMonth ? t.start_date?.slice(5, 7) === filterMonth : true)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [editableTours, filterActive, filterTime, filterYear, filterMonth, search, today]);

  const availableYears = useMemo(() => {
    const years = new Set(editableTours.map(t => Number(t.start_date?.slice(0, 4))).filter(Boolean));
    return [...years].sort();
  }, [editableTours]);

  const availableMonths = useMemo(() => {
    const MONTH_NAMES: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    };
    const months = new Set(
      editableTours
        .filter(t => filterYear ? t.start_date?.startsWith(String(filterYear)) : true)
        .map(t => t.start_date?.slice(5, 7)).filter(Boolean) as string[]
    );
    return [...months].sort().map(m => ({ key: m, label: MONTH_NAMES[m] || m }));
  }, [editableTours, filterYear]);

  const hasAnyChanges = editableTours.some(t => t.hasChanges);
  const changesCount = editableTours.filter(t => t.hasChanges).length;

  const updateField = useCallback((tourId: string, field: string, value: any) => {
    setEditableTours(prev => prev.map(t =>
      t.id === tourId ? { ...t, [field]: value, hasChanges: true } : t
    ));
  }, []);

  const toggleCategory = useCallback((tourId: string, catId: string) => {
    setTourCategorias(prev => {
      const next = new Map(prev);
      const current = next.get(tourId) || [];
      next.set(tourId, current.includes(catId) ? current.filter(id => id !== catId) : [...current, catId]);
      return next;
    });
    setEditableTours(prev => prev.map(t => t.id === tourId ? { ...t, hasChanges: true } : t));
  }, []);

  const setActiveTab = useCallback((tourId: string, tab: TourTab) => {
    setActiveTabs(prev => new Map(prev).set(tourId, tab));
  }, []);

  const toggleExpanded = (tourId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(tourId)) next.delete(tourId);
      else next.add(tourId);
      return next;
    });
    if (!activeTabs.has(tourId)) {
      setActiveTabs(prev => new Map(prev).set(tourId, 'conteudo'));
    }
  };

  const saveTour = useCallback(async (tourId: string) => {
    const tour = editableTours.find(t => t.id === tourId);
    if (!tour) return;
    setSavingIds(prev => new Set(prev).add(tourId));
    try {
      const t = tour as any;
      const { error } = await supabase.from('tours').update({
        name: t.name,
        city: t.city,
        state: t.state,
        start_date: t.start_date,
        end_date: t.end_date || null,
        start_time: t.start_time || null,
        end_time: t.end_time || null,
        about: t.about ?? null,
        itinerary: t.itinerary ?? null,
        includes: t.includes ?? null,
        not_includes: t.not_includes ?? null,
        description: t.description ?? null,
        etiqueta: t.etiqueta ?? null,
        whatsapp_group_link: t.whatsapp_group_link ?? null,
        vagas: t.vagas ?? null,
        valor_padrao: t.valor_padrao ?? 0,
        pix_discount_percent: t.pix_discount_percent ?? 0,
        is_active: t.is_active ?? true,
        is_exclusive: t.is_exclusive ?? false,
        is_featured: t.is_featured ?? false,
        has_accommodation: t.has_accommodation ?? false,
      }).eq('id', tourId);
      if (error) throw error;

      // Save categories
      await supabase.from('tour_categorias').delete().eq('tour_id', tourId);
      const catIds = tourCategorias.get(tourId) || [];
      if (catIds.length > 0) {
        await supabase.from('tour_categorias').insert(catIds.map(cid => ({ tour_id: tourId, categoria_id: cid })));
      }

      setEditableTours(prev => prev.map(t => t.id === tourId ? { ...t, hasChanges: false } : t));
      toast({ title: 'Salvo!', description: tour.name });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(tourId); return s; });
    }
  }, [editableTours, tourCategorias, toast]);

  const saveAllChanges = async () => {
    setSavingAll(true);
    const ids = editableTours.filter(t => t.hasChanges).map(t => t.id);
    await Promise.all(ids.map(saveTour));
    setSavingAll(false);
    onSaveSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Editar Passeios</h2>
            <p className="text-xs text-muted-foreground">{visibleTours.length} passeios visíveis</p>
          </div>
        </div>
        <Button onClick={saveAllChanges} disabled={!hasAnyChanges || savingAll} className="gap-2 text-sm">
          {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {hasAnyChanges ? `Salvar Tudo (${changesCount})` : 'Salvar Tudo'}
        </Button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Buscar passeio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {([['ativos', 'Ativos'], ['todos', 'Todos']] as const).map(([val, label]) => {
              const active = val === 'ativos' ? filterActive : !filterActive;
              return (
                <button key={val} onClick={() => setFilterActive(val === 'ativos')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >{label}</button>
              );
            })}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {([['futuros', 'Futuros'], ['passados', 'Passados'], ['todos', 'Todos']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterTime(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterTime === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >{label}</button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{visibleTours.length} {visibleTours.length === 1 ? 'passeio' : 'passeios'}</span>
          {hasAnyChanges && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-auto">
              <AlertCircle className="h-3.5 w-3.5" />
              {changesCount} não {changesCount === 1 ? 'salvo' : 'salvos'}
            </span>
          )}
        </div>
        {availableYears.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Ano:</span>
            {availableYears.map(y => (
              <button key={y} onClick={() => { setFilterYear(filterYear === y ? null : y); setFilterMonth(null); }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${filterYear === y ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
              >{y}</button>
            ))}
            {availableMonths.length > 0 && (
              <>
                <span className="w-px h-4 bg-slate-200 mx-1" />
                <span className="text-xs text-slate-400 font-medium">Mês:</span>
                {availableMonths.map(({ key, label }) => (
                  <button key={key} onClick={() => setFilterMonth(filterMonth === key ? null : key)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${filterMonth === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                  >{label}</button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Tour list */}
      <div className="p-4 space-y-2 max-w-5xl mx-auto">
        {visibleTours.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">Nenhum passeio encontrado</div>
        )}

        {visibleTours.map(tour => {
          const t = tour as any;
          const isExpanded = expandedIds.has(tour.id);
          const isSaving = savingIds.has(tour.id);
          const activeTab = activeTabs.get(tour.id) || 'conteudo';
          const catIds = tourCategorias.get(tour.id) || [];

          return (
            <div key={tour.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Tour header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors ${tour.hasChanges ? 'border-l-[3px] border-l-amber-400' : ''}`}
                onClick={() => toggleExpanded(tour.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{tour.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateBR(tour.start_date)}
                    {tour.end_date && tour.end_date !== tour.start_date ? ` – ${formatDateBR(tour.end_date)}` : ''}
                    {' · '}{tour.city}{tour.state ? `, ${tour.state}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tour.hasChanges ? (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      não salvo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      salvo
                    </span>
                  )}
                  {tour.hasChanges && (
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); saveTour(tour.id); }} disabled={isSaving} className="h-7 px-2 text-xs gap-1">
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Salvar
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded: tabs + content */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Tab bar */}
                  <div className="flex border-b border-slate-100 overflow-x-auto">
                    {TOUR_TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tour.id, tab.key)}
                        className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                          activeTab === tab.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Conteúdo */}
                  {activeTab === 'conteudo' && (
                    <div className="p-4 space-y-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descrição curta</p>
                        <Input
                          value={t.description || ''}
                          onChange={e => updateField(tour.id, 'description', e.target.value)}
                          placeholder="Ex: Trilhas, cachoeiras e cultura indígena na Chapada"
                          className="text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">Frase exibida abaixo do nome no card.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sobre o passeio</p>
                          <ReactQuill theme="snow" value={tour.about || ''} onChange={v => updateField(tour.id, 'about', v)} modules={fullModules} style={{ minHeight: '150px' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Roteiro</p>
                          <ReactQuill theme="snow" value={tour.itinerary || ''} onChange={v => updateField(tour.id, 'itinerary', v)} modules={fullModules} style={{ minHeight: '150px' }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">O que está incluso</p>
                          <ReactQuill theme="snow" value={tour.includes || ''} onChange={v => updateField(tour.id, 'includes', v)} modules={QUILL_MODULES_LIST} style={{ minHeight: '100px' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Não incluso</p>
                          <ReactQuill theme="snow" value={tour.not_includes || ''} onChange={v => updateField(tour.id, 'not_includes', v)} modules={QUILL_MODULES_LIST} style={{ minHeight: '100px' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Básico */}
                  {activeTab === 'basico' && (
                    <div className="p-4 space-y-5">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                          <p className="text-xs font-medium text-slate-500 mb-1">Nome do passeio</p>
                          <Input value={t.name || ''} onChange={e => updateField(tour.id, 'name', e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Cidade</p>
                          <Input value={t.city || ''} onChange={e => updateField(tour.id, 'city', e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Estado</p>
                          <Input value={t.state || ''} onChange={e => updateField(tour.id, 'state', e.target.value)} className="text-sm" maxLength={2} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Etiqueta</p>
                          <Input value={t.etiqueta || ''} onChange={e => updateField(tour.id, 'etiqueta', e.target.value)} placeholder="ex: Promoção" className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Data início</p>
                          <Input type="date" value={t.start_date || ''} onChange={e => updateField(tour.id, 'start_date', e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Data fim</p>
                          <Input type="date" value={t.end_date || ''} onChange={e => updateField(tour.id, 'end_date', e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Horário saída</p>
                          <Input type="time" value={t.start_time || ''} onChange={e => updateField(tour.id, 'start_time', e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Vagas</p>
                          <Input type="number" min={1} value={t.vagas ?? ''} onChange={e => updateField(tour.id, 'vagas', e.target.value ? Number(e.target.value) : null)} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Valor padrão (R$)</p>
                          <Input type="number" min={0} step={0.01} value={t.valor_padrao ?? 0} onChange={e => updateField(tour.id, 'valor_padrao', Number(e.target.value))} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Desconto PIX (%)</p>
                          <Input type="number" min={0} max={100} value={t.pix_discount_percent ?? 0} onChange={e => updateField(tour.id, 'pix_discount_percent', Number(e.target.value))} className="text-sm" />
                        </div>
                      </div>

                      {/* Booleans */}
                      <div className="flex flex-wrap gap-4">
                        {([
                          ['is_active', 'Ativo'],
                          ['is_exclusive', 'Exclusivo'],
                          ['is_featured', 'Destaque'],
                          ['has_accommodation', 'Com hospedagem'],
                        ] as const).map(([field, label]) => (
                          <label key={field} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={t[field] ?? false}
                              onChange={e => updateField(tour.id, field, e.target.checked)}
                              className="rounded"
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      {/* WhatsApp */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Link grupo WhatsApp</p>
                        <Input value={t.whatsapp_group_link || ''} onChange={e => updateField(tour.id, 'whatsapp_group_link', e.target.value)} placeholder="https://chat.whatsapp.com/..." className="text-sm" />
                      </div>

                      {/* Categories */}
                      {allCategorias.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-2">Categorias</p>
                          <div className="flex flex-wrap gap-2">
                            {allCategorias.map(cat => {
                              const selected = catIds.includes(cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => toggleCategory(tour.id, cat.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                    selected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
                                  }`}
                                >
                                  {cat.icone && <span>{cat.icone}</span>}
                                  {cat.nome}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standalone tab components — lazy mount */}
                  {activeTab === 'galeria' && (
                    <div className="p-4">
                      <TourGalleryManager tourId={tour.id} />
                    </div>
                  )}
                  {activeTab === 'embarques' && (
                    <div className="p-4">
                      <TourBoardingPointsManager tourId={tour.id} />
                    </div>
                  )}
                  {activeTab === 'opcionais' && (
                    <div className="p-4">
                      <TourOptionalItemsManager tourId={tour.id} />
                    </div>
                  )}
                  {activeTab === 'pagamento' && (
                    <div className="p-4">
                      <TourPaymentConfig tourId={tour.id} />
                    </div>
                  )}
                  {activeTab === 'transporte' && (
                    <div className="p-4">
                      <TourTransportConfig tourId={tour.id} />
                    </div>
                  )}
                  {activeTab === 'info' && (
                    <div className="p-4">
                      <TourInfoItemsEditor tourId={tour.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BulkTourEditor;
