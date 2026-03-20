import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Star, Eye, EyeOff, Loader2, X, Save, GripVertical
} from "lucide-react";

interface Depoimento {
  id: string;
  nome: string;
  foto_url: string | null;
  texto: string;
  tour_id: string | null;
  nota: number;
  source: "manual" | "google";
  ativo: boolean;
  display_order: number;
  created_at: string;
}

interface Tour {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  nome: "",
  foto_url: "",
  texto: "",
  tour_id: "" as string,
  nota: 5,
  source: "manual" as "manual" | "google",
  ativo: true,
};

export default function AdminDepoimentos() {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [depRes, tourRes] = await Promise.all([
      supabase
        .from("depoimentos")
        .select("*")
        .order("display_order")
        .order("created_at", { ascending: false }),
      supabase
        .from("tours")
        .select("id, name")
        .order("start_date", { ascending: false })
        .limit(100),
    ]);
    if (depRes.data) setDepoimentos(depRes.data as Depoimento[]);
    if (tourRes.data) setTours(tourRes.data);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (d: Depoimento) => {
    setEditingId(d.id);
    setForm({
      nome: d.nome,
      foto_url: d.foto_url || "",
      texto: d.texto,
      tour_id: d.tour_id || "",
      nota: d.nota,
      source: d.source,
      ativo: d.ativo,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.texto.trim()) {
      toast({ title: "Preencha nome e depoimento", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      foto_url: form.foto_url.trim() || null,
      texto: form.texto.trim(),
      tour_id: form.tour_id || null,
      nota: form.nota,
      source: form.source,
      ativo: form.ativo,
    };

    const { error } = editingId
      ? await supabase.from("depoimentos").update(payload).eq("id", editingId)
      : await supabase.from("depoimentos").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Depoimento atualizado" : "Depoimento adicionado" });
      closeForm();
      fetchAll();
    }
    setSaving(false);
  };

  const toggleAtivo = async (d: Depoimento) => {
    await supabase.from("depoimentos").update({ ativo: !d.ativo }).eq("id", d.id);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este depoimento?")) return;
    await supabase.from("depoimentos").delete().eq("id", id);
    toast({ title: "Depoimento excluído" });
    fetchAll();
  };

  const getTourName = (tourId: string | null) => {
    if (!tourId) return null;
    return tours.find((t) => t.id === tourId)?.name || null;
  };

  const renderStars = (nota: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < nota ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
      />
    ));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Depoimentos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {depoimentos.length} depoimento{depoimentos.length !== 1 ? "s" : ""} cadastrado{depoimentos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo depoimento
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground">
              {editingId ? "Editar depoimento" : "Novo depoimento"}
            </h3>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do viajante"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Foto (URL)</Label>
              <Input
                value={form.foto_url}
                onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Passeio vinculado</Label>
              <select
                value={form.tour_id}
                onChange={(e) => setForm({ ...form, tour_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Nenhum (geral) —</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Fonte</Label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as "manual" | "google" })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="google">Google</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Depoimento *</Label>
            <Textarea
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              placeholder="O que o cliente disse..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="space-y-1.5">
              <Label>Nota</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setForm({ ...form, nota: n })}>
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        n <= form.nota ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">{form.nota}/5</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">Ativo (visível no site)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : depoimentos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Nenhum depoimento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {depoimentos.map((d) => (
            <div
              key={d.id}
              className={`bg-card border rounded-xl p-4 flex gap-4 items-start transition-opacity ${
                d.ativo ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {d.foto_url ? (
                  <img
                    src={d.foto_url}
                    alt={d.nome}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {d.nome.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-foreground text-sm">{d.nome}</span>
                  <div className="flex items-center gap-0.5">{renderStars(d.nota)}</div>
                  {d.source === "google" && (
                    <Badge variant="outline" className="text-xs py-0">Google</Badge>
                  )}
                  {getTourName(d.tour_id) && (
                    <Badge variant="secondary" className="text-xs py-0 max-w-[160px] truncate">
                      {getTourName(d.tour_id)}
                    </Badge>
                  )}
                  {!d.ativo && (
                    <Badge variant="outline" className="text-xs py-0 text-muted-foreground">
                      Oculto
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{d.texto}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleAtivo(d)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={d.ativo ? "Ocultar" : "Mostrar"}
                >
                  {d.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(d)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
