import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, Upload,
  ChevronUp, ChevronDown, Play, Image as ImageIcon,
} from "lucide-react";

interface TourOption {
  id: string;
  name: string;
  destination_name: string | null;
}

interface Story {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string;
  media_type: string;
  author_name: string | null;
  author_photo_url: string | null;
  active: boolean;
  display_order: number;
  tour_id: string | null;
}

const EMPTY_FORM = {
  title: "",
  caption: "",
  media_url: "",
  media_type: "image",
  author_name: "",
  author_photo_url: "",
  active: true,
  tour_id: "" as string,
};

export default function AdminStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchStories(); fetchTours(); }, []);

  const fetchStories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stories" as any)
      .select("*")
      .order("display_order");
    if (!error) setStories((data as Story[]) || []);
    setLoading(false);
  };

  const fetchTours = async () => {
    const { data } = await supabase
      .from("tours")
      .select("id, name, destination_name")
      .order("start_date", { ascending: true });
    if (data) setTours(data as TourOption[]);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: Story) => {
    setEditingId(s.id);
    setForm({
      title: s.title || "",
      caption: s.caption || "",
      media_url: s.media_url,
      media_type: s.media_type,
      author_name: s.author_name || "",
      author_photo_url: s.author_photo_url || "",
      active: s.active,
      tour_id: s.tour_id || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.media_url.trim()) {
      toast({ title: "Mídia obrigatória", description: "Faça upload de uma foto ou vídeo.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title || null,
      caption: form.caption || null,
      media_url: form.media_url,
      media_type: form.media_type,
      author_name: form.author_name || null,
      author_photo_url: form.author_photo_url || null,
      active: form.active,
      tour_id: form.tour_id || null,
    };
    const { error } = editingId
      ? await supabase.from("stories" as any).update(payload).eq("id", editingId)
      : await supabase.from("stories" as any).insert({ ...payload, display_order: stories.length });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Story atualizado!" : "Story criado!" });
      setShowForm(false);
      fetchStories();
    }
  };

  const deleteStory = async (id: string) => {
    if (!confirm("Excluir este story?")) return;
    await supabase.from("stories" as any).delete().eq("id", id);
    fetchStories();
  };

  const toggleActive = async (s: Story) => {
    await supabase.from("stories" as any).update({ active: !s.active }).eq("id", s.id);
    fetchStories();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= stories.length) return;
    const a = stories[idx];
    const b = stories[target];
    await Promise.all([
      supabase.from("stories" as any).update({ display_order: b.display_order }).eq("id", a.id),
      supabase.from("stories" as any).update({ display_order: a.display_order }).eq("id", b.id),
    ]);
    fetchStories();
  };

  const handleMediaUpload = async (file: File) => {
    setUploadingMedia(true);
    const ext = file.name.split(".").pop();
    const isVideo = file.type.startsWith("video/");
    const path = `stories/media/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("site-config")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("site-config").getPublicUrl(data.path);
      setForm((f) => ({ ...f, media_url: urlData.publicUrl, media_type: isVideo ? "video" : "image" }));
    }
    setUploadingMedia(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `stories/avatars/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("site-config")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("site-config").getPublicUrl(data.path);
      setForm((f) => ({ ...f, author_photo_url: urlData.publicUrl }));
    }
    setUploadingAvatar(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Stories</h2>
          <p className="text-muted-foreground text-sm">Gerencie os stories da página inicial</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Story
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold">{editingId ? "Editar Story" : "Novo Story"}</h3>

          {/* Mídia */}
          <div className="space-y-2">
            <Label>Foto ou Vídeo *</Label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
              {form.media_url ? (
                form.media_type === "video" ? (
                  <video src={form.media_url} className="h-40 rounded object-cover" controls />
                ) : (
                  <img src={form.media_url} alt="" className="h-40 rounded object-cover" />
                )
              ) : (
                <>
                  {uploadingMedia ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">Clique para enviar foto ou vídeo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); }}
              />
            </label>
            {form.media_url && (
              <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, media_url: "", media_type: "image" }))}>
                Remover mídia
              </Button>
            )}
          </div>

          {/* Author */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Autor</Label>
              <Input
                value={form.author_name}
                onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                placeholder="Ex: Maria Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <label className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 cursor-pointer hover:border-primary transition-colors">
                {form.author_photo_url ? (
                  <img src={form.author_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {form.author_photo_url ? "Trocar foto" : "Enviar foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título (opcional)</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Expedição Chapada Diamantina"
            />
          </div>

          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="Texto que aparece no rodapé do story..."
              rows={3}
            />
          </div>

          {/* Destino (tour) */}
          <div className="space-y-2">
            <Label>Destino / Passeio</Label>
            <select
              value={form.tour_id}
              onChange={(e) => setForm((f) => ({ ...f, tour_id: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Página inicial (nenhum destino) —</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>{t.destination_name || t.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sem destino: aparece na home. Com destino: aparece na página do passeio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Ativo (visível no site)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Nenhum story criado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3 border border-border rounded-xl p-3 bg-card">
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {s.media_type === "video" ? (
                  <Play className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.author_name || s.title || "Sem título"}</p>
                {s.caption && (
                  <p className="text-xs text-muted-foreground truncate">{s.caption}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {s.media_type === "video"
                    ? <Play className="h-3 w-3 text-muted-foreground" />
                    : <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-[10px] text-muted-foreground uppercase">{s.media_type}</span>
                  {s.tour_id ? (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      {tours.find(t => t.id === s.tour_id)?.destination_name || tours.find(t => t.id === s.tour_id)?.name || "Destino"}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Home</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === stories.length - 1}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={`p-1.5 rounded hover:bg-muted ${s.active ? "text-green-600" : "text-muted-foreground"}`}
                  title={s.active ? "Desativar" : "Ativar"}
                >
                  {s.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteStory(s.id)}
                  className="p-1.5 rounded hover:bg-muted text-destructive"
                  title="Excluir"
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
