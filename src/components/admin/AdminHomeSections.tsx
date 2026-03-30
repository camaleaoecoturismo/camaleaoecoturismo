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
import { Plus, Pencil, Trash2, Loader2, X, Check, ChevronUp, ChevronDown, Tag, MapPin, Map, Globe } from "lucide-react";

interface HomeSection {
  id: string;
  title: string;
  subtitle: string | null;
  filter_type: string;
  filter_value: string;
  order_index: number;
  active: boolean;
}

const KEYWORD_OPTIONS = [
  { value: "cachoeira", label: "Cachoeiras" },
  { value: "trilha", label: "Trilhas" },
  { value: "rapel", label: "Rapel" },
  { value: "tirolesa", label: "Tirolesa" },
  { value: "cânion", label: "Cânions" },
  { value: "mergulho", label: "Mergulho" },
  { value: "camping", label: "Camping" },
  { value: "grutas", label: "Grutas" },
  { value: "aventura", label: "Aventura" },
];

const FILTER_TYPES = [
  { value: "keyword", label: "Por preferência", description: "Cachoeiras, trilhas, rapel…", icon: Tag },
  { value: "destination", label: "Por destino", description: "Chapada Diamantina, Alagoas…", icon: Map },
  { value: "city", label: "Por cidade", description: "Maceió, Mucugê…", icon: MapPin },
  { value: "state", label: "Por estado", description: "AL, BA, PE…", icon: Globe },
];

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  filter_type: "",
  filter_value: "",
  active: true,
};

export default function AdminHomeSections() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Options from DB
  const [destOptions, setDestOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);

  const fetchSections = async () => {
    const { data } = await supabase
      .from("home_sections" as any)
      .select("*")
      .order("order_index");
    if (data) setSections(data as HomeSection[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSections();
    // Fetch distinct destinations, cities, states from tours
    supabase.from("tours").select("name, destination_name, city, state").eq("is_active", true)
      .then(({ data }) => {
        if (!data) return;
        // destination_name tem prioridade; se vazio, usa name
        const dests = [...new Set(
          data.map((t: any) => t.destination_name || t.name).filter(Boolean)
        )].sort() as string[];
        const cities = [...new Set(data.map((t: any) => t.city).filter(Boolean))].sort() as string[];
        const states = [...new Set(data.map((t: any) => t.state).filter(Boolean))].sort() as string[];
        setDestOptions(dests);
        setCityOptions(cities);
        setStateOptions(states);
      });
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (s: HomeSection) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subtitle: s.subtitle || "",
      filter_type: s.filter_type,
      filter_value: s.filter_value,
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
    if (!form.title.trim()) { toast.error("Preencha o título."); return; }
    if (!form.filter_type) { toast.error("Selecione o tipo de filtro."); return; }
    if (!form.filter_value) { toast.error("Selecione o valor do filtro."); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      filter_type: form.filter_type,
      filter_value: form.filter_value.toLowerCase(),
      order_index: editingId ? sections.find((s) => s.id === editingId)?.order_index ?? 0 : sections.length,
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

  const move = async (idx: number, dir: -1 | 1) => {
    const newSections = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= newSections.length) return;
    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
    // Update order_index in DB
    await Promise.all(
      newSections.map((s, i) =>
        supabase.from("home_sections" as any).update({ order_index: i }).eq("id", s.id)
      )
    );
    setSections(newSections.map((s, i) => ({ ...s, order_index: i })));
  };

  const valueOptions = () => {
    if (form.filter_type === "keyword") return KEYWORD_OPTIONS;
    if (form.filter_type === "destination") return destOptions.map((v) => ({ value: v.toLowerCase(), label: v }));
    if (form.filter_type === "city") return cityOptions.map((v) => ({ value: v.toLowerCase(), label: v }));
    if (form.filter_type === "state") return stateOptions.map((v) => ({ value: v.toLowerCase(), label: v }));
    return [];
  };

  const filterTypeLabel = (type: string) => FILTER_TYPES.find((f) => f.value === type)?.label || type;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Seções da Página Inicial</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Cada seção exibe um carrossel de passeios filtrados na página inicial.
          </p>
        </div>
        {!showForm && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova seção
          </Button>
        )}
      </div>

      {/* ── Formulário ── */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? "Editar seção" : "Nova seção"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Título e subtítulo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Cachoeiras, Chapada Diamantina…"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  placeholder="Ex: Para quem ama água"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
            </div>

            {/* Tipo de filtro — botões visuais */}
            <div className="space-y-2">
              <Label>Filtrar passeios por *</Label>
              <div className="grid grid-cols-2 gap-2">
                {FILTER_TYPES.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, filter_type: value, filter_value: "" })}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      form.filter_type === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className={`text-sm font-medium ${form.filter_type === value ? "text-primary" : "text-foreground"}`}>{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Valor do filtro */}
            {form.filter_type && (
              <div className="space-y-1.5">
                <Label>
                  {form.filter_type === "keyword" && "Preferência *"}
                  {form.filter_type === "destination" && "Destino *"}
                  {form.filter_type === "city" && "Cidade *"}
                  {form.filter_type === "state" && "Estado *"}
                </Label>
                <Select
                  value={form.filter_value}
                  onValueChange={(v) => setForm({ ...form, filter_value: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {valueOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                    {valueOptions().length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">Nenhuma opção encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>

            <div className="flex gap-2">
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

      {/* ── Lista ── */}
      {sections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <p className="mb-3">Nenhuma seção configurada ainda.</p>
          <Button onClick={openNew} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Criar primeira seção
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s, idx) => (
            <Card key={s.id} className={`transition-opacity ${!s.active ? "opacity-50" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {/* Setas de ordem */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === sections.length - 1}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{s.title}</span>
                    {!s.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    <Badge variant="outline" className="text-xs">{filterTypeLabel(s.filter_type)}</Badge>
                    <Badge className="text-xs bg-primary/10 text-primary border-0 capitalize">{s.filter_value}</Badge>
                  </div>
                  {s.subtitle && <p className="text-muted-foreground text-xs mt-0.5 truncate">{s.subtitle}</p>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} className="scale-75" />
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
