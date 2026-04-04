import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Trash2, Edit, X, Check, Clock, Upload, Loader2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PontoEmbarque {
  id: string;
  nome: string;
  endereco: string | null;
  maps_link: string | null;
  foto_url: string | null;
  ativo: boolean;
  ordem: number;
}

interface TourPontoLink {
  id: string;
  ponto_embarque_id: string;
  horario: string | null;
}

interface TourBoardingPointsManagerProps {
  tourId: string;
  tourName: string;
}

const EMPTY_PONTO = { nome: '', endereco: '', maps_link: '', foto_url: '' };

export function TourBoardingPointsManager({ tourId, tourName }: TourBoardingPointsManagerProps) {
  const [allPontos, setAllPontos] = useState<PontoEmbarque[]>([]);
  const [links, setLinks] = useState<TourPontoLink[]>([]); // which pontos this tour has selected
  const [horarios, setHorarios] = useState<Record<string, string>>({}); // ponto_id → horario
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog for creating/editing a global ponto
  const [showPontoDialog, setShowPontoDialog] = useState(false);
  const [editingPonto, setEditingPonto] = useState<PontoEmbarque | null>(null);
  const [pontoForm, setPontoForm] = useState(EMPTY_PONTO);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [tourId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pontos }, { data: tourLinks }] = await Promise.all([
      supabase.from('pontos_embarque').select('*').eq('ativo', true).order('ordem').order('nome'),
      supabase.from('tour_pontos_embarque').select('id, ponto_embarque_id, horario').eq('tour_id', tourId),
    ]);

    setAllPontos((pontos || []) as unknown as PontoEmbarque[]);
    setLinks((tourLinks || []) as unknown as TourPontoLink[]);

    // Build horarios map
    const h: Record<string, string> = {};
    (tourLinks || []).forEach((l: any) => { h[l.ponto_embarque_id] = l.horario || ''; });
    setHorarios(h);
    setLoading(false);
  };

  const isSelected = (pontoId: string) => links.some(l => l.ponto_embarque_id === pontoId);

  const togglePonto = async (pontoId: string) => {
    if (isSelected(pontoId)) {
      // Remove
      const link = links.find(l => l.ponto_embarque_id === pontoId);
      if (!link) return;
      await supabase.from('tour_pontos_embarque').delete().eq('id', link.id);
      setLinks(prev => prev.filter(l => l.ponto_embarque_id !== pontoId));
      setHorarios(prev => { const n = { ...prev }; delete n[pontoId]; return n; });
    } else {
      // Add (without horario yet)
      const { data, error } = await supabase
        .from('tour_pontos_embarque')
        .insert({ tour_id: tourId, ponto_embarque_id: pontoId, horario: null })
        .select()
        .single();
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      setLinks(prev => [...prev, data as unknown as TourPontoLink]);
      setHorarios(prev => ({ ...prev, [pontoId]: '' }));
    }
  };

  const saveHorario = async (pontoId: string) => {
    const link = links.find(l => l.ponto_embarque_id === pontoId);
    if (!link) return;
    const { error } = await supabase
      .from('tour_pontos_embarque')
      .update({ horario: horarios[pontoId] || null })
      .eq('id', link.id);
    if (error) { toast({ title: 'Erro ao salvar horário', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Horário salvo!' }); }
  };

  // --- Global ponto management ---
  const openCreateDialog = () => {
    setEditingPonto(null);
    setPontoForm(EMPTY_PONTO);
    setShowPontoDialog(true);
  };

  const openEditDialog = (ponto: PontoEmbarque) => {
    setEditingPonto(ponto);
    setPontoForm({
      nome: ponto.nome,
      endereco: ponto.endereco || '',
      maps_link: ponto.maps_link || '',
      foto_url: ponto.foto_url || '',
    });
    setShowPontoDialog(true);
  };

  const uploadFoto = async (file: File): Promise<string | null> => {
    setUploadingFoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `pontos-embarque/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('tour-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('tour-images').getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast({ title: 'Erro ao subir foto', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFoto(file);
    if (url) setPontoForm(prev => ({ ...prev, foto_url: url }));
  };

  const savePontoGlobal = async () => {
    if (!pontoForm.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingPonto) {
        const { data, error } = await supabase
          .from('pontos_embarque')
          .update({
            nome: pontoForm.nome.trim(),
            endereco: pontoForm.endereco.trim() || null,
            maps_link: pontoForm.maps_link.trim() || null,
            foto_url: pontoForm.foto_url.trim() || null,
          })
          .eq('id', editingPonto.id)
          .select()
          .single();
        if (error) throw error;
        setAllPontos(prev => prev.map(p => p.id === editingPonto.id ? (data as unknown as PontoEmbarque) : p));
        toast({ title: 'Ponto atualizado!' });
      } else {
        const maxOrdem = Math.max(...allPontos.map(p => p.ordem), -1);
        const { data, error } = await supabase
          .from('pontos_embarque')
          .insert({
            nome: pontoForm.nome.trim(),
            endereco: pontoForm.endereco.trim() || null,
            maps_link: pontoForm.maps_link.trim() || null,
            foto_url: pontoForm.foto_url.trim() || null,
            ativo: true,
            ordem: maxOrdem + 1,
          })
          .select()
          .single();
        if (error) throw error;
        setAllPontos(prev => [...prev, data as unknown as PontoEmbarque]);
        toast({ title: 'Ponto criado!' });
      }
      setShowPontoDialog(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deletePontoGlobal = async (ponto: PontoEmbarque) => {
    if (!confirm(`Excluir "${ponto.nome}" do cadastro global? Viagens que o usam perderão a associação.`)) return;
    const { error } = await supabase.from('pontos_embarque').update({ ativo: false }).eq('id', ponto.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAllPontos(prev => prev.filter(p => p.id !== ponto.id));
    setLinks(prev => prev.filter(l => l.ponto_embarque_id !== ponto.id));
    toast({ title: 'Ponto removido.' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const selectedLinks = links;
  const selectedPontos = allPontos.filter(p => isSelected(p.id));
  const unselectedPontos = allPontos.filter(p => !isSelected(p.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Pontos de Embarque — {tourName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione os pontos disponíveis para esta viagem e defina o horário de cada um.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Ponto
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Selected pontos with horario */}
          {selectedPontos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selecionados para esta viagem</p>
              {selectedPontos.map(ponto => (
                <div key={ponto.id} className="flex items-center gap-3 p-3 border border-emerald-200 bg-emerald-50/50 rounded-lg">
                  <button
                    onClick={() => togglePonto(ponto.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-red-400 transition-colors group"
                    title="Remover desta viagem"
                  >
                    <Check className="h-3 w-3 text-white group-hover:hidden" />
                    <X className="h-3 w-3 text-white hidden group-hover:block" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{ponto.nome}</span>
                      {ponto.endereco && (
                        <span className="text-xs text-muted-foreground truncate">{ponto.endereco}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {ponto.maps_link && (
                        <a href={ponto.maps_link} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" />Maps
                        </a>
                      )}
                      {ponto.foto_url && (
                        <a href={ponto.foto_url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-emerald-600 hover:underline">📷 foto</a>
                      )}
                    </div>
                  </div>
                  {/* Horario input */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-7 w-20 text-xs"
                      placeholder="05h00"
                      value={horarios[ponto.id] || ''}
                      onChange={e => setHorarios(prev => ({ ...prev, [ponto.id]: e.target.value }))}
                      onBlur={() => saveHorario(ponto.id)}
                      onKeyDown={e => { if (e.key === 'Enter') saveHorario(ponto.id); }}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0"
                    onClick={() => openEditDialog(ponto)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Available (unselected) pontos */}
          {unselectedPontos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disponíveis no cadastro</p>
              {unselectedPontos.map(ponto => (
                <div key={ponto.id} className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  <button
                    onClick={() => togglePonto(ponto.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                    title="Adicionar a esta viagem"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-600">{ponto.nome}</span>
                    {ponto.endereco && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{ponto.endereco}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {ponto.foto_url && <span className="text-[10px] text-muted-foreground">📷</span>}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(ponto)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deletePontoGlobal(ponto)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allPontos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum ponto de embarque cadastrado ainda.{' '}
              <button onClick={openCreateDialog} className="underline text-primary">Criar o primeiro</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: create/edit global ponto */}
      <Dialog open={showPontoDialog} onOpenChange={setShowPontoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPonto ? 'Editar Ponto de Embarque' : 'Novo Ponto de Embarque'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome do Ponto *</Label>
              <Input
                value={pontoForm.nome}
                onChange={e => setPontoForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="ex: Posto Shell (Veloz)"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Endereço (opcional)</Label>
              <Input
                value={pontoForm.endereco}
                onChange={e => setPontoForm(p => ({ ...p, endereco: e.target.value }))}
                placeholder="Av. Menino Marcelo, 3800 - Antares"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Link Google Maps (opcional)</Label>
              <Input
                value={pontoForm.maps_link}
                onChange={e => setPontoForm(p => ({ ...p, maps_link: e.target.value }))}
                placeholder="https://maps.google.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Foto do Local</Label>
              {pontoForm.foto_url ? (
                <div className="mt-1 relative">
                  <img src={pontoForm.foto_url} alt="Foto" className="w-full h-32 object-cover rounded-lg border" />
                  <button
                    onClick={() => setPontoForm(p => ({ ...p, foto_url: '' }))}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="mt-1 w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground"
                >
                  {uploadingFoto ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /><span className="text-xs">Enviando...</span></>
                  ) : (
                    <><Upload className="h-5 w-5" /><span className="text-xs">Clique para subir uma foto</span></>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Esta foto aparece para o participante ao clicar em "Ver foto" no formulário de inscrição.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowPontoDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={savePontoGlobal} disabled={saving || uploadingFoto}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              {editingPonto ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
