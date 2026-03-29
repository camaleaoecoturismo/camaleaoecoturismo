import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Loader2, X, Check } from "lucide-react";

interface HomeSection {
  id: string;
  title: string;
  subtitle: string | null;
  filter_type: string;
  filter_value: string;
  order_index: number;
  active: boolean;
}

const FILTER_TYPE_LABELS: Record<string, string> = {
  keyword: "Palavra-chave",
  city: "Cidade",
  state: "Estado",
  destination: "Destino (nome)",
};

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  filter_type: "keyword",
  filter_value: "",
  order_index: 0,
  active: true,
};

export default function AdminHomeSections() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchSections = async () => {
    const { data } = await supabase
      .from("home_sections" as any)
      .select("*")
      .order("order_index");
    if (data) setSections(data as HomeSection[]);
    setLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order_index: sections.length });
    setShowForm(true);
  };

  const openEdit = (s: HomeSection) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subtitle: s.subtitle || "",
      filter_type: s.filter_type,
      filter_value: s.filter_value,
      order_index: s.order_index,
      active: s.active,
    });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const save = async () => {
    if (!form.title.trim() || !form.filter_value.trim()) {
      toast.error("Preencha título e valor do filtro.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      filter_type: form.filter_type,
      filter_value: form.filter_value.trim().toLowerCase(),
      order_index: Number(form.order_index),
      active: form.active,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("home_sections" as any).update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("home_sections" as any).insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar seção.");
    } else {
      toast.success(editingId ? "Seção atualizada!" : "Seção criada!");
      cancel();
      fetchSections();
    }
    setSaving(false);
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Excluir esta seção?")) return;
    await supabase.from("home_sections" as any).delete().eq("id", id);
    toast.success("Seção excluída.");
    fetchSections();
  };

  const toggleActive = async (s: HomeSection) => {
    await supabase.from("home_sections" as any).update({ active: !s.active }).eq("id", s.id);
    fetchSections();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Seções da Página Inicial</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure os cards de passeios exibidos na página inicial.
          </p>
        </div>
        {!showForm && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova seção
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? "Editar seção" : "Nova seção"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título da seção *</Label>
                <Input
                  placeholder="Ex: Cachoeiras, Chapada Diamantina..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Input
                  placeholder="Ex: Passeios com mergulho e natureza"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de filtro *</Label>
                <Select value={form.filter_type} onValueChange={(v) => setForm({ ...form, filter_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palavra-chave (nome/descrição)</SelectItem>
                    <SelectItem value="city">Cidade</SelectItem>
                    <SelectItem value="state">Estado</SelectItem>
                    <SelectItem value="destination">Destino (nome do destino)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.filter_type === "keyword" && "Ex: cachoeira, trilha, rapel, cânion"}
                  {form.filter_type === "city" && "Ex: maceió, mucugê, lençóis"}
                  {form.filter_type === "state" && "Ex: al, ba, pe"}
                  {form.filter_type === "destination" && "Ex: chapada diamantina, alagoas"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor do filtro *</Label>
                <Input
                  placeholder="Insira o valor..."
                  value={form.filter_value}
                  onChange={(e) => setForm({ ...form, filter_value: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  className="w-20"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label>Ativo</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
              <Button variant="outline" size="sm" onClick={cancel}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {sections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <p className="mb-3">Nenhuma seção configurada ainda.</p>
          <Button onClick={openNew} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Criar primeira seção
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <Card key={s.id} className={`transition-opacity ${!s.active ? "opacity-50" : ""}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{s.title}</span>
                    {!s.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {FILTER_TYPE_LABELS[s.filter_type] || s.filter_type}
                    </Badge>
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                      {s.filter_value}
                    </Badge>
                  </div>
                  {s.subtitle && (
                    <p className="text-muted-foreground text-sm mt-0.5 truncate">{s.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={s.active}
                    onCheckedChange={() => toggleActive(s)}
                    className="scale-75"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteSection(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
