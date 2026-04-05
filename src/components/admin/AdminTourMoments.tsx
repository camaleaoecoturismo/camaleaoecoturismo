import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { normalizeDestinationName } from "@/lib/destinations";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, Upload,
  ChevronUp, ChevronDown, Play, Image as ImageIcon, Film,
  ChevronRight, Search,
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

interface DestinationGroupMeta {
  destination: string;
  tours: TourOption[];
}

const EMPTY_FORM = {
  media_url: "",
  media_type: "video",
  cover_url: "",
  active: true,
};

export default function AdminTourMoments() {
  const [moments, setMoments] = useState<TourMoment[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDestination, setFormDestination] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [capturingCover, setCapturingCover] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
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

  // All unique destination names (from both moments and tours)
  const allDestinations = useMemo(() => {
    const seen = new Set<string>();
    moments.forEach(m => {
      const normalized = normalizeDestinationName(m.destination_name);
      if (normalized) seen.add(normalized);
    });
    tours.forEach(t => {
      const normalized = normalizeDestinationName(t.destination_name || t.name);
      if (normalized) seen.add(normalized);
    });
    return [...seen].sort();
  }, [moments, tours]);

  // Group moments by destination
  const grouped = useMemo(() => {
    const map = new Map<string, TourMoment[]>();
    moments.forEach(m => {
      const key = normalizeDestinationName(m.destination_name) || "Sem destino";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    // Add destinations from tours that have no moments yet (so they appear in list)
    tours.forEach(t => {
      const d = normalizeDestinationName(t.destination_name || t.name);
      if (d && !map.has(d)) map.set(d, []);
    });
    return map;
  }, [moments, tours]);

  const destinationMeta = useMemo(() => {
    const map = new Map<string, DestinationGroupMeta>();

    allDestinations.forEach((destination) => {
      map.set(destination, {
        destination,
        tours: tours.filter((tour) => normalizeDestinationName(tour.destination_name || tour.name) === destination),
      });
    });

    return map;
  }, [allDestinations, tours]);

  // Filter by search
  const filteredDestinations = useMemo(() => {
    const q = search.toLowerCase();
    return allDestinations.filter(d => !q || d.toLowerCase().includes(q));
  }, [allDestinations, search]);

  const toggleGroup = (dest: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dest)) next.delete(dest);
      else next.add(dest);
      return next;
    });
  };

  const openEdit = (m: TourMoment) => {
    setEditingId(m.id);
    setForm({ media_url: m.media_url, media_type: m.media_type, cover_url: m.cover_url || "", active: m.active });
    const normalized = normalizeDestinationName(m.destination_name);
    setFormDestination(normalized);
    setExpandedGroups(prev => new Set(prev).add(normalized));
  };

  const closeForm = () => {
    setFormDestination(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.media_url.trim()) {
      toast({ title: "Mídia obrigatória", description: "Faça upload de um vídeo ou foto.", variant: "destructive" });
      return;
    }
    if (!formDestination) return;
    setSaving(true);
    const destMoments = grouped.get(formDestination) || [];
    const payload = {
      destination_name: normalizeDestinationName(formDestination),
      media_url: form.media_url,
      media_type: form.media_type,
      cover_url: form.cover_url || null,
      caption: null,
      active: form.active,
    };
    const { error } = editingId
      ? await (supabase as any).from("tour_moments").update(payload).eq("id", editingId)
      : await (supabase as any).from("tour_moments").insert({ ...payload, display_order: destMoments.length });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Momento atualizado!" : "Momento adicionado!" });
      closeForm();
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

  const move = async (destMoments: TourMoment[], idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= destMoments.length) return;
    const a = destMoments[idx];
    const b = destMoments[target];
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
    const path = `moments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

  // Upload multiple files at once — each becomes its own moment
  const handleMultiUpload = async (files: FileList, destination: string) => {
    if (!files.length) return;
    const fileArr = Array.from(files);
    const normalizedDestination = normalizeDestinationName(destination);
    setUploadProgress({ done: 0, total: fileArr.length });
    const destMoments = grouped.get(normalizedDestination) || [];
    let baseOrder = destMoments.length;
    let successCount = 0;
    for (const file of fileArr) {
      const ext = file.name.split(".").pop();
      const isVideo = file.type.startsWith("video/");
      const path = `moments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("site-config")
        .upload(path, file, { upsert: true });
      if (error) {
        toast({ title: `Erro ao enviar ${file.name}`, description: error.message, variant: "destructive" });
      } else {
        const { data: urlData } = supabase.storage.from("site-config").getPublicUrl(data.path);
        await (supabase as any).from("tour_moments").insert({
          destination_name: normalizedDestination,
          media_url: urlData.publicUrl,
          media_type: isVideo ? "video" : "image",
          cover_url: null,
          caption: null,
          active: true,
          display_order: baseOrder++,
        });
        successCount++;
      }
      setUploadProgress(p => p ? { ...p, done: p.done + 1 } : null);
    }
    setUploadProgress(null);
    if (successCount > 0) {
      toast({ title: `${successCount} arquivo${successCount > 1 ? 's' : ''} adicionado${successCount > 1 ? 's' : ''}!` });
      fetchMoments();
    }
  };

  const totalMoments = moments.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Momentos por Destino
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre uma vez por destino e reutilize os mesmos vídeos em todos os passeios com esse destino.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {totalMoments} momento{totalMoments !== 1 ? 's' : ''} em {filteredDestinations.length} destino{filteredDestinations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar destino..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Groups */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhum destino encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filteredDestinations.map(dest => {
            const destMoments = grouped.get(dest) || [];
            const isExpanded = expandedGroups.has(dest);
            const isFormOpen = formDestination === dest;
            const meta = destinationMeta.get(dest);
            const linkedTours = meta?.tours || [];

            return (
              <div key={dest} className="border border-border rounded-xl overflow-hidden bg-card">
                {/* Group header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  onClick={() => toggleGroup(dest)}
                >
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{dest}</p>
                    <p className="text-xs text-muted-foreground">
                      {destMoments.length} momento{destMoments.length !== 1 ? 's' : ''}
                      {' · '}
                      {destMoments.filter(m => m.active).length} ativo{destMoments.filter(m => m.active).length !== 1 ? 's' : ''}
                      {' · '}
                      {linkedTours.length} passeio{linkedTours.length !== 1 ? 's' : ''} usando este destino
                    </p>
                  </div>
                  {/* Thumbnails preview (up to 4) */}
                  <div className="flex -space-x-2 shrink-0">
                    {destMoments.slice(0, 4).map(m => (
                      <div key={m.id} className="w-8 h-8 rounded-md border-2 border-background overflow-hidden bg-muted flex items-center justify-center">
                        {m.cover_url || m.media_type === "image"
                          ? <img src={m.cover_url || m.media_url} alt="" className="w-full h-full object-cover" />
                          : <Play className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                    {destMoments.length > 4 && (
                      <div className="w-8 h-8 rounded-md border-2 border-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                        +{destMoments.length - 4}
                      </div>
                    )}
                  </div>
                  <label
                    className="cursor-pointer shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 pointer-events-none" asChild>
                      <span>
                        {uploadProgress && formDestination === dest
                          ? <><Loader2 className="h-3 w-3 animate-spin" />{uploadProgress.done}/{uploadProgress.total}</>
                          : <><Plus className="h-3 w-3" />Adicionar</>}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setFormDestination(dest);
                          setExpandedGroups(prev => new Set(prev).add(dest));
                          handleMultiUpload(files, dest);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Passeios vinculados a este destino
                      </p>
                      {linkedTours.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {linkedTours.map((tour) => (
                            <span
                              key={tour.id}
                              className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                            >
                              {tour.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Ainda não encontrei passeios cadastrados com esse destino exato.
                        </p>
                      )}
                    </div>

                    {/* Add/edit form */}
                    {isFormOpen && editingId && (
                      <div className="p-4 bg-muted/20 border-b border-border space-y-4">
                        <h3 className="font-semibold text-sm">Editar Momento</h3>

                        <div className="space-y-2">
                          <Label>Vídeo ou Foto *</Label>
                          {form.media_url ? (
                            <div className="space-y-2">
                              {form.media_type === "video" ? (
                                <video ref={videoRef} src={form.media_url} className="w-full max-h-56 rounded object-contain bg-black" controls />
                              ) : (
                                <img src={form.media_url} alt="" className="w-full max-h-56 rounded object-cover" />
                              )}
                              <div className="flex gap-2 flex-wrap">
                                {form.media_type === "video" && (
                                  <Button type="button" variant="outline" size="sm" onClick={captureVideoFrame} disabled={capturingCover}>
                                    {capturingCover ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                                    Capturar capa
                                  </Button>
                                )}
                                <label className="cursor-pointer">
                                  <Button type="button" variant="ghost" size="sm" asChild>
                                    <span><Upload className="h-4 w-4 mr-1" />Trocar</span>
                                  </Button>
                                  <input type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); }} />
                                </label>
                                <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, media_url: "", media_type: "video", cover_url: "" }))}>
                                  Remover
                                </Button>
                              </div>
                              {form.cover_url && (
                                <div className="flex items-center gap-3">
                                  <img src={form.cover_url} alt="Capa" className="w-14 h-14 rounded-full object-cover border-2 border-primary" />
                                  <button type="button" onClick={() => setForm(f => ({ ...f, cover_url: "" }))} className="text-xs text-destructive hover:underline">
                                    Remover capa
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-5 cursor-pointer hover:border-primary transition-colors">
                              {uploadingMedia
                                ? <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                                : <Upload className="h-7 w-7 text-muted-foreground" />}
                              <span className="text-sm text-muted-foreground">Clique para enviar vídeo ou foto</span>
                              <input type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); }} />
                            </label>
                          )}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                          Ativo (visível no site)
                        </label>

                        <div className="flex gap-2">
                          <Button onClick={save} disabled={saving} size="sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            Salvar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={closeForm}>Cancelar</Button>
                        </div>
                      </div>
                    )}

                    {/* Upload progress bar */}
                    {uploadProgress && formDestination === dest && (
                      <div className="px-4 py-3 bg-muted/30 border-b border-border">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                          <div className="flex-1">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300 rounded-full"
                                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {uploadProgress.done}/{uploadProgress.total}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Moments list */}
                    {destMoments.length === 0 && !isFormOpen ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        <Film className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Nenhum momento ainda para este destino.</p>
                        <label className="cursor-pointer mt-2 inline-block">
                          <span className="text-primary hover:underline font-medium">Selecionar arquivos</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={e => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                setFormDestination(dest);
                                handleMultiUpload(files, dest);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {destMoments.map((m, idx) => (
                          <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${!m.active ? 'opacity-50' : ''}`}>
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                              {m.cover_url ? (
                                <img src={m.cover_url} alt="" className="w-full h-full object-cover" />
                              ) : m.media_type === "image" ? (
                                <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {m.media_type === "video"
                                  ? <Play className="h-3 w-3 text-muted-foreground shrink-0" />
                                  : <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                                <span className="text-xs text-muted-foreground">{m.media_type === "video" ? "Vídeo" : "Foto"}</span>
                                {!m.active && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">oculto</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => move(destMoments, idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                              <button onClick={() => move(destMoments, idx, 1)} disabled={idx === destMoments.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                              <button onClick={() => toggleActive(m)} className={`p-1.5 rounded hover:bg-muted ${m.active ? "text-green-600" : "text-muted-foreground"}`}>
                                {m.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => deleteMoment(m.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
