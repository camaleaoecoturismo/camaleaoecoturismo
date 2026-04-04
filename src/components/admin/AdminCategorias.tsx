import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tag, Plus, Trash2, Edit, X, Check, GripVertical } from 'lucide-react';

interface Categoria {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  ativo: boolean;
  ordem: number;
}

const EMPTY_FORM = { nome: '', icone: '', cor: '' };

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [showNew, setShowNew] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categorias_passeio')
      .select('id, nome, icone, cor, ativo, ordem')
      .order('ordem');
    if (error) {
      toast({ title: 'Erro ao carregar categorias', description: error.message, variant: 'destructive' });
    } else {
      setCategorias(data || []);
    }
    setLoading(false);
  };

  const addCategoria = async () => {
    if (!newForm.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const maxOrdem = Math.max(...categorias.map(c => c.ordem), -1);
    const { data, error } = await supabase
      .from('categorias_passeio')
      .insert({
        nome: newForm.nome.trim(),
        icone: newForm.icone.trim() || null,
        cor: newForm.cor.trim() || null,
        ativo: true,
        ordem: maxOrdem + 1,
      })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    } else {
      setCategorias(prev => [...prev, data as unknown as Categoria]);
      setNewForm(EMPTY_FORM);
      setShowNew(false);
      toast({ title: 'Categoria criada!' });
    }
    setSaving(false);
  };

  const updateCategoria = async (id: string) => {
    if (!editForm.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('categorias_passeio')
      .update({
        nome: editForm.nome.trim(),
        icone: editForm.icone.trim() || null,
        cor: editForm.cor.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setCategorias(prev => prev.map(c => c.id === id ? (data as unknown as Categoria) : c));
      setEditingId(null);
      toast({ title: 'Categoria atualizada!' });
    }
    setSaving(false);
  };

  const toggleAtivo = async (cat: Categoria) => {
    const { error } = await supabase
      .from('categorias_passeio')
      .update({ ativo: !cat.ativo })
      .eq('id', cat.id);
    if (!error) {
      setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, ativo: !c.ativo } : c));
    }
  };

  const deleteCategoria = async (id: string) => {
    if (!confirm('Excluir esta categoria? Passeios que a usam perderão a associação.')) return;
    setSaving(true);
    const { error } = await supabase.from('categorias_passeio').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      setCategorias(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Categoria excluída.' });
    }
    setSaving(false);
  };

  const startEdit = (cat: Categoria) => {
    setEditingId(cat.id);
    setEditForm({ nome: cat.nome, icone: cat.icone || '', cor: cat.cor || '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Carregando categorias...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Categorias de Passeio
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Categorias usadas nos filtros da home e no formulário de cadastro de passeios.
            </p>
          </div>
          <Button size="sm" onClick={() => { setShowNew(true); setEditingId(null); }}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Categoria
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* New category form */}
          {showNew && (
            <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
              <h4 className="text-sm font-medium">Nova Categoria</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={newForm.nome}
                    onChange={e => setNewForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="ex: Cachoeira"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Ícone (emoji)</Label>
                  <Input
                    value={newForm.icone}
                    onChange={e => setNewForm(p => ({ ...p, icone: e.target.value }))}
                    placeholder="💧"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cor (hex ou tailwind)</Label>
                  <Input
                    value={newForm.cor}
                    onChange={e => setNewForm(p => ({ ...p, cor: e.target.value }))}
                    placeholder="ex: #3b82f6"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowNew(false); setNewForm(EMPTY_FORM); }}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={addCategoria} disabled={saving}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {saving ? 'Salvando...' : 'Criar'}
                </Button>
              </div>
            </div>
          )}

          {categorias.length === 0 && !showNew && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma categoria cadastrada.
            </div>
          )}

          {categorias.map((cat) => (
            <div
              key={cat.id}
              className={`p-3 border rounded-lg transition-opacity ${!cat.ativo ? 'opacity-50' : ''}`}
            >
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={editForm.nome}
                        onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ícone (emoji)</Label>
                      <Input
                        value={editForm.icone}
                        onChange={e => setEditForm(p => ({ ...p, icone: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cor (hex)</Label>
                      <Input
                        value={editForm.cor}
                        onChange={e => setEditForm(p => ({ ...p, cor: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => updateCategoria(cat.id)} disabled={saving}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    {cat.icone && (
                      <span className="text-lg leading-none">{cat.icone}</span>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{cat.nome}</span>
                      {cat.cor && (
                        <span className="ml-2 text-[10px] text-muted-foreground font-mono">{cat.cor}</span>
                      )}
                    </div>
                    {!cat.ativo && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">inativa</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => toggleAtivo(cat)}
                      disabled={saving}
                    >
                      {cat.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => startEdit(cat)}
                      disabled={saving}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteCategoria(cat.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      {categorias.filter(c => c.ativo).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Preview — como aparece nos filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categorias.filter(c => c.ativo).map(cat => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-slate-200 bg-white shadow-sm"
                >
                  {cat.icone && <span>{cat.icone}</span>}
                  {cat.nome}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
