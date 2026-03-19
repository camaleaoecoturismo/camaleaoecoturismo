import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, X, Check, Loader2, UserCheck,
  UserX, ChevronDown, ChevronUp, Search,
} from "lucide-react";

interface Guia {
  id: string;
  nome: string;
  email: string;
  auth_user_id: string | null;
  ativo: boolean;
  created_at: string;
  passeios?: { tour_id: string; tour_name: string }[];
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
  city: string;
}

export default function AdminGuias() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: guiasData }, { data: toursData }] = await Promise.all([
      supabase.from("guias").select("*").order("nome"),
      supabase.from("tours")
        .select("id, name, start_date, city")
        .gte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date")
        .limit(100),
    ]);

    if (guiasData) {
      // Load assignments for each guide
      const { data: assignments } = await supabase
        .from("guia_passeios")
        .select("guia_id, tour_id, tours(name)");

      const assignmentsByGuia: Record<string, { tour_id: string; tour_name: string }[]> = {};
      assignments?.forEach((a: any) => {
        if (!assignmentsByGuia[a.guia_id]) assignmentsByGuia[a.guia_id] = [];
        assignmentsByGuia[a.guia_id].push({
          tour_id: a.tour_id,
          tour_name: a.tours?.name || a.tour_id,
        });
      });

      setGuias(guiasData.map((g) => ({ ...g, passeios: assignmentsByGuia[g.id] || [] })));
    }
    if (toursData) setTours(toursData);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing guide
        const { error } = await supabase
          .from("guias")
          .update({ nome: form.nome, email: form.email })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Guia atualizado");
      } else {
        // Create new guide — first create auth user, then guide record
        if (!form.password || form.password.length < 6) {
          toast.error("Senha deve ter pelo menos 6 caracteres");
          setSaving(false);
          return;
        }

        // Create auth user via admin API (requires service role — call RPC or use admin client)
        // For now: create guide record without auth_user_id; admin can link later
        // A better UX: use Supabase invite link. For simplicity, we just create the record.
        const { error } = await supabase.from("guias").insert({
          nome: form.nome,
          email: form.email,
          ativo: true,
        });
        if (error) throw error;

        toast.success(
          "Guia cadastrado. Instrua o guia a criar uma conta em /guia com o mesmo e-mail.",
          { duration: 6000 }
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ nome: "", email: "", password: "" });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (guia: Guia) => {
    const { error } = await supabase
      .from("guias")
      .update({ ativo: !guia.ativo })
      .eq("id", guia.id);
    if (error) toast.error("Erro ao atualizar");
    else {
      toast.success(guia.ativo ? "Guia desativado" : "Guia ativado");
      await loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este guia? As atribuições de passeios serão removidas.")) return;
    const { error } = await supabase.from("guias").delete().eq("id", id);
    if (error) toast.error("Erro ao remover");
    else { toast.success("Guia removido"); await loadData(); }
  };

  const handleToggleTour = async (guia: Guia, tourId: string) => {
    const assigned = guia.passeios?.some((p) => p.tour_id === tourId);
    if (assigned) {
      await supabase.from("guia_passeios").delete()
        .eq("guia_id", guia.id).eq("tour_id", tourId);
      toast.success("Passeio removido do guia");
    } else {
      await supabase.from("guia_passeios").insert({ guia_id: guia.id, tour_id: tourId });
      toast.success("Passeio atribuído ao guia");
    }
    await loadData();
  };

  const startEdit = (guia: Guia) => {
    setForm({ nome: guia.nome, email: guia.email, password: "" });
    setEditingId(guia.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ nome: "", email: "", password: "" });
  };

  const filtered = guias.filter(
    (g) =>
      !search ||
      g.nome.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar guia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { cancelForm(); setShowForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Guia
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-foreground">
            {editingId ? "Editar Guia" : "Novo Guia"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome</label>
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-mail</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          {!editingId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/50 text-sm text-blue-700 dark:text-blue-300">
              Após cadastrar, o guia deve acessar <strong>/guia</strong> e fazer login com este e-mail.
              Se ainda não tiver conta no Supabase, ele precisa se cadastrar primeiro ou você pode convidá-lo via painel Supabase.
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={cancelForm}>
              <X className="h-4 w-4 mr-1.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "Nenhum guia encontrado." : "Nenhum guia cadastrado ainda."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((guia) => (
            <div key={guia.id} className="border border-border rounded-xl bg-card overflow-hidden">
              {/* Guia row */}
              <div className="flex items-center gap-3 p-4">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${guia.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  <span className="text-sm font-bold">{guia.nome[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{guia.nome}</span>
                    {!guia.ativo && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativo</Badge>
                    )}
                    {guia.auth_user_id ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                        Vinculado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-300">
                        Sem conta
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{guia.email}</p>
                  {guia.passeios && guia.passeios.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {guia.passeios.length} passeio{guia.passeios.length > 1 ? "s" : ""} atribuído{guia.passeios.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === guia.id ? null : guia.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    title="Atribuir passeios"
                  >
                    {expandedId === guia.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(guia)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(guia)}
                    className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${guia.ativo ? "text-green-600" : "text-muted-foreground"}`}
                    title={guia.ativo ? "Desativar" : "Ativar"}
                  >
                    {guia.ativo ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(guia.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tour assignments */}
              {expandedId === guia.id && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Passeios atribuídos
                  </p>
                  {tours.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum passeio futuro encontrado.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {tours.map((tour) => {
                        const assigned = guia.passeios?.some((p) => p.tour_id === tour.id);
                        return (
                          <button
                            key={tour.id}
                            onClick={() => handleToggleTour(guia, tour.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-all ${
                              assigned
                                ? "border-primary/50 bg-primary/5 text-primary"
                                : "border-border bg-card text-foreground hover:border-primary/30"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${assigned ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                              {assigned && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{tour.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tour.start_date + "T12:00:00").toLocaleDateString("pt-BR")} · {tour.city}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
