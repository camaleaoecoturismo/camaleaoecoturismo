import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, Upload,
  ChevronUp, ChevronDown, Play, Image as ImageIcon, Film,
} from "lucide-react";

interface TourMoment {
  id: string;
  destination_name: string;
  media_url: string;
  media_type: string;
  cover_url: string | null;
  caption: string | null;
  active: boolean;
  display_order: number;
}

interface TourOption {
  id: string;
  name: string;
  destination_name: string | null;
}

const EMPTY_FORM = {
  caption: "",
  media_url: "",
  media_type: "video",
  cover_url: "",
  active: true,
};

export default function AdminTourMoments() {
  const [moments, setMoments] = useState<TourMoment[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [capturingCover, setCapturingCover] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTours();
    fetchMoments();
  }, []);

  const fetchTours = async () => {
    const { data } = await (supabase as any)
      .from("tours")
      .select("id, name, destination_name")
      .order("name");
    if (data) setTours(data as TourOption[]);
  };

  const fetchMoments = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tour_moments")
      .select("*")
      .order("destination_name")
      .order("display_order");
    setMoments((data as TourMoment[]) || []);
    setLoading(false);
  };

  // Unique destination names from tours
  const destinations = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    tours.forEach((t) => {
      const dest = t.destination_name || t.name;
      if (dest && !seen.has(dest)) {
        seen.add(dest);
        result.push(dest);
      }
    });
    return result.sort();
  }, [tours]);

  const filteredMoments = useMemo(
    () => (selectedDestination ? moments.filter((m) => m.destination_name === selectedDestination) : moments),
    [moments, selectedDestination]
  );

  const openNew = () => {
    if (!selectedDestination) {
      toast({ title: "Selecione um destino primeiro", variant: "destructive" });
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: TourMoment) => {
    setEditingId(m.id);
    setForm({ caption: m.caption || "", media_url: m.media_url, media_type: m.media_type, cover_url: m.cover_url || "", active: m.active });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.media_url.trim()) {
      toast({ title: "Mídia obrigatória", description: "Faça upload de um vídeo ou foto.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      destination_name: selectedDestination,
      media_url: form.media_url,
      media_type: form.media_type,
      cover_url: form.cover_url || null,
      caption: form.caption || null,
      active: form.active,
    };
    const { error } = editingId
      ? await (supabase as any).from("tour_moments").update(payload).eq("id", editingId)
      : await (supabase as any).from("tour_moments").insert({ ...payload, display_order: filteredMoments.length });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Momento atualizado!" : "Momento adicionado!" });
      setShowForm(false);
      fetchMoments();
    }
  };

  const deleteMoment = async (id: string) => {
    if (!confirm("Excluir este momento?")) return;
    await (supabase as any).from("tour_moments").delete().eq("id", id);
    fetchMoments();
  };

  const toggleActive = async (m: TourMoment) => {
    await (supabase as any).from("tour_moments").update({ active: !m.active }).eq("id", m.id);
    fetchMoments();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const list = filteredMoments;
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    await Promise.all([
      (supabase as any).from("tour_moments").update({ display_order: b.display_order }).eq("id", a.id),
      (supabase as any).from("tour_moments").update({ display_order: a.display_order }).eq("id", b.id),
    ]);
    fetchMoments();
  };

  const captureVideoFrame = async () => {
    const video = videoRef.current;
    if (!video) return;
    setCapturingCover(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) { setCapturingCover(false); return; }
      const path = `moments/covers/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("site-config")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("site-config").getPublicUrl(data.path);
        setForm((f) => ({ ...f, cover_url: urlData.publicUrl }));
        toast({ title: "Capa capturada!" });
      } else {
        toast({ title: "Erro ao capturar capa", description: error.message, variant: "destructive" });
      }
      setCapturingCover(false);
    }, "image/jpeg", 0.9);
  };

  const handleMediaUpload = async (file: File) => {
    setUploadingMedia(true);
    const ext = file.name.split(".").pop();
    const isVideo = file.type.startsWith("video/");
    const path = `moments/${Date.now()}.${ext}`;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          Momentos por Destino
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Vídeos e fotos de momentos que aparecem nas páginas dos passeios
        </p>
      </div>

      {/* Destination selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>Destino</Label>
          <select
            value={selectedDestination}
            onChange={(e) => { setSelectedDestination(e.target.value); setShowForm(false); }}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Ver todos os destinos —</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <Button onClick={openNew} disabled={!selectedDestination}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Momento
        </Button>
      </div>

      {selectedDestination && (
        <p className="text-sm text-muted-foreground">
          {filteredMoments.length} momento(s) para <span className="font-semibold text-foreground">{selectedDestination}</span>
        </p>
      )}

      {/* Form */}
      {showForm && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold">{editingId ? "Editar Momento" : `Novo Momento — ${selectedDestination}`}</h3>

          <div className="space-y-2">
            <Label>Vídeo ou Foto *</Label>
            {form.media_url ? (
              <div className="space-y-2">
                {form.media_type === "video" ? (
                  <video
                    ref={videoRef}
                    src={form.media_url}
                    className="w-full max-h-64 rounded object-contain bg-black"
                    controls
                  />
                ) : (
                  <img src={form.media_url} alt="" className="w-full max-h-64 rounded object-cover" />
                )}
                <div className="flex gap-2">
                  {form.media_type === "video" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={captureVideoFrame}
                      disabled={capturingCover}
                    >
                      {capturingCover
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : <ImageIcon className="h-4 w-4 mr-2" />}
                      Capturar frame como capa
                    </Button>
                  )}
                  <label className="cursor-pointer">
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <span><Upload className="h-4 w-4 mr-2" />Trocar mídia</span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); }}
                    />
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, media_url: "", media_type: "video", cover_url: "" }))}>
                    Remover
                  </Button>
                </div>
                {form.cover_url && (
                  <div className="flex items-center gap-3 mt-1">
                    <img src={form.cover_url} alt="Capa" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                    <div>
                      <p className="text-xs font-medium">Capa capturada</p>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cover_url: "" }))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remover capa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                {uploadingMedia
                  ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  : <Upload className="h-8 w-8 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">Clique para enviar vídeo ou foto</span>
                <span className="text-xs text-muted-foreground/60">Recomendado: vídeo vertical (9:16)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); }}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="Descrição curta deste momento..."
              rows={2}
            />
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
      ) : filteredMoments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          {selectedDestination
            ? `Nenhum momento para "${selectedDestination}" ainda.`
            : "Selecione um destino para ver os momentos."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMoments.map((m, idx) => (
            <div key={m.id} className="flex items-center gap-3 border border-border rounded-xl p-3 bg-card">
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {m.cover_url ? (
                  <img src={m.cover_url} alt="" className="w-full h-full object-cover" />
                ) : m.media_type === "video" ? (
                  <Play className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded truncate max-w-[160px]">
                    {m.destination_name}
                  </span>
                  {m.media_type === "video"
                    ? <Play className="h-3 w-3 text-muted-foreground shrink-0" />
                    : <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                </div>
                {m.caption && <p className="text-xs text-muted-foreground truncate mt-0.5">{m.caption}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === filteredMoments.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                <button onClick={() => toggleActive(m)} className={`p-1.5 rounded hover:bg-muted ${m.active ? "text-green-600" : "text-muted-foreground"}`}>
                  {m.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => { setSelectedDestination(m.destination_name); openEdit(m); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deleteMoment(m.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
