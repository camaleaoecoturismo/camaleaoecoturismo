import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, ChevronDown, ChevronUp, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
};

interface BulkTourEditorProps {
  tours: Tour[];
  onBack: () => void;
  onSaveSuccess: () => void;
}

interface TourEdit extends Tour {
  hasChanges?: boolean;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

const BulkTourEditor: React.FC<BulkTourEditorProps> = ({ tours, onBack, onSaveSuccess }) => {
  const [editableTours, setEditableTours] = useState<TourEdit[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const sorted = [...tours].sort((a, b) =>
      (a.start_date || '').localeCompare(b.start_date || '')
    );
    setEditableTours(sorted.map(tour => ({ ...tour, hasChanges: false })));
  }, [tours]);

  const visibleTours = useMemo(() =>
    editableTours
      .filter(t => filterActive ? (t.is_active && !t.is_exclusive) : true)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [editableTours, filterActive, search]
  );

  const hasAnyChanges = editableTours.some(t => t.hasChanges);
  const changesCount = editableTours.filter(t => t.hasChanges).length;

  const updateTour = useCallback((tourId: string, field: 'about' | 'itinerary' | 'includes' | 'not_includes', value: string) => {
    setEditableTours(prev => prev.map(t =>
      t.id === tourId ? { ...t, [field]: value, hasChanges: true } : t
    ));
  }, []);

  const toggleExpanded = (tourId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(tourId)) next.delete(tourId);
      else next.add(tourId);
      return next;
    });
  };

  const saveTour = useCallback(async (tourId: string) => {
    const tour = editableTours.find(t => t.id === tourId);
    if (!tour) return;
    setSavingIds(prev => new Set(prev).add(tourId));
    try {
      const { error } = await supabase.from('tours').update({
        about: tour.about ?? null,
        itinerary: tour.itinerary ?? null,
        includes: tour.includes ?? null,
        not_includes: tour.not_includes ?? null,
      }).eq('id', tourId);
      if (error) throw error;
      setEditableTours(prev => prev.map(t =>
        t.id === tourId ? { ...t, hasChanges: false } : t
      ));
      toast({ title: 'Salvo!', description: tour.name });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(tourId); return s; });
    }
  }, [editableTours, toast]);

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
            <h2 className="text-base font-semibold text-slate-800">Editar Conteúdo dos Passeios</h2>
            <p className="text-xs text-muted-foreground">{visibleTours.length} passeios visíveis</p>
          </div>
        </div>
        <Button
          onClick={saveAllChanges}
          disabled={!hasAnyChanges || savingAll}
          className="gap-2 text-sm"
        >
          {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {hasAnyChanges ? `Salvar Tudo (${changesCount})` : 'Salvar Tudo'}
        </Button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setFilterActive(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filterActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar passeio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {hasAnyChanges && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-auto">
            <AlertCircle className="h-3.5 w-3.5" />
            {changesCount} com alterações não salvas
          </span>
        )}
      </div>

      {/* Tour list */}
      <div className="p-4 space-y-2 max-w-5xl mx-auto">
        {visibleTours.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nenhum passeio encontrado
          </div>
        )}

        {visibleTours.map(tour => {
          const isExpanded = expandedIds.has(tour.id);
          const isSaving = savingIds.has(tour.id);

          return (
            <div key={tour.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Tour header row */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); saveTour(tour.id); }}
                      disabled={isSaving}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Salvar
                    </Button>
                  )}

                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </div>
              </div>

              {/* Expanded editors */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sobre o passeio</p>
                      <ReactQuill
                        theme="snow"
                        value={tour.about || ''}
                        onChange={value => updateTour(tour.id, 'about', value)}
                        modules={QUILL_MODULES}
                        style={{ minHeight: '120px' }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Roteiro</p>
                      <ReactQuill
                        theme="snow"
                        value={tour.itinerary || ''}
                        onChange={value => updateTour(tour.id, 'itinerary', value)}
                        modules={QUILL_MODULES}
                        style={{ minHeight: '120px' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">O que está incluso</p>
                      <ReactQuill
                        theme="snow"
                        value={tour.includes || ''}
                        onChange={value => updateTour(tour.id, 'includes', value)}
                        modules={QUILL_MODULES}
                        style={{ minHeight: '100px' }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Não incluso</p>
                      <ReactQuill
                        theme="snow"
                        value={tour.not_includes || ''}
                        onChange={value => updateTour(tour.id, 'not_includes', value)}
                        modules={QUILL_MODULES}
                        style={{ minHeight: '100px' }}
                      />
                    </div>
                  </div>
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
