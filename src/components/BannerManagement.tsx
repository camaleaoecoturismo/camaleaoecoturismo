import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Monitor, Smartphone, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const FONTS = [
  { value: "",                label: "Padrão (Figtree)" },
  { value: "Inter",           label: "Inter" },
  { value: "Montserrat",      label: "Montserrat" },
  { value: "Poppins",         label: "Poppins" },
  { value: "Raleway",         label: "Raleway" },
  { value: "Oswald",          label: "Oswald" },
  { value: "Bebas Neue",      label: "Bebas Neue" },
  { value: "Playfair Display",label: "Playfair Display" },
  { value: "Lora",            label: "Lora" },
];
const GOOGLE_FONTS_LIST = FONTS.filter(f => f.value).map(f => f.value);

const FONT_SIZES = [
  { value: "",    label: "Padrão" },
  { value: "2xs", label: "2XS — Minúsculo" },
  { value: "xs",  label: "XS — Muito pequeno" },
  { value: "sm",  label: "SM — Pequeno" },
  { value: "md",  label: "MD — Médio" },
  { value: "lg",  label: "LG — Grande" },
  { value: "xl",  label: "XL — Extra grande" },
  { value: "2xl", label: "2XL — Gigante" },
  { value: "3xl", label: "3XL — Máximo" },
];

// Tamanhos de fonte para o preview (px), escalonados para o frame pequeno
const PREVIEW_TITLE_PX: Record<string, { desktop: number; mobile: number }> = {
  "2xs": { desktop: 11, mobile: 9  },
  "xs":  { desktop: 13, mobile: 11 },
  "sm":  { desktop: 16, mobile: 13 },
  "md":  { desktop: 19, mobile: 15 },
  "":    { desktop: 22, mobile: 17 },
  "lg":  { desktop: 26, mobile: 20 },
  "xl":  { desktop: 31, mobile: 23 },
  "2xl": { desktop: 37, mobile: 27 },
  "3xl": { desktop: 43, mobile: 31 },
};

const PREVIEW_SUBTITLE_PX: Record<string, { desktop: number; mobile: number }> = {
  "2xs": { desktop: 6,  mobile: 5  },
  "xs":  { desktop: 7,  mobile: 6  },
  "sm":  { desktop: 8,  mobile: 7  },
  "md":  { desktop: 9,  mobile: 8  },
  "":    { desktop: 11, mobile: 9  },
  "lg":  { desktop: 13, mobile: 10 },
  "xl":  { desktop: 15, mobile: 11 },
  "2xl": { desktop: 17, mobile: 13 },
  "3xl": { desktop: 20, mobile: 15 },
};

interface BannerPreviewProps {
  formData: { image_url: string; video_url: string; title: string; subtitle: string; button_text: string; title_font: string; title_font_size: string; subtitle_font: string; subtitle_font_size: string };
  mode: "desktop" | "mobile";
}

function BannerPreview({ formData, mode }: BannerPreviewProps) {
  const isDesktop = mode === "desktop";
  const titlePx  = (PREVIEW_TITLE_PX[formData.title_font_size]    ?? PREVIEW_TITLE_PX[""])[isDesktop ? "desktop" : "mobile"];
  const subtitlePx = (PREVIEW_SUBTITLE_PX[formData.subtitle_font_size] ?? PREVIEW_SUBTITLE_PX[""])[isDesktop ? "desktop" : "mobile"];
  const titleFamily    = formData.title_font    ? `'${formData.title_font}', sans-serif`    : "Figtree, sans-serif";
  const subtitleFamily = formData.subtitle_font ? `'${formData.subtitle_font}', sans-serif` : "Figtree, sans-serif";

  const hasContent = formData.image_url || formData.video_url;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-neutral-900 select-none"
      style={isDesktop ? { aspectRatio: "16/9", width: "100%" } : { aspectRatio: "9/19.5", width: "120px", flexShrink: 0 }}
    >
      {/* Fundo */}
      {formData.video_url ? (
        <video src={formData.video_url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : formData.image_url ? (
        <img src={formData.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1]/70 to-[#1a0533]" />
      )}

      {/* Gradientes */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Conteúdo */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-2 pb-3">
        {formData.title ? (
          <p style={{ fontSize: titlePx, fontFamily: titleFamily, color: "white", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 3 }}>
            {formData.title}
          </p>
        ) : (
          <p style={{ fontSize: titlePx, fontFamily: titleFamily, color: "rgba(255,255,255,0.25)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 3 }}>
            Título do banner
          </p>
        )}
        {formData.subtitle ? (
          <p style={{ fontSize: subtitlePx, fontFamily: subtitleFamily, color: "rgba(255,255,255,0.65)", fontWeight: 700, textTransform: "lowercase", marginBottom: formData.button_text ? 5 : 0 }}>
            {formData.subtitle}
          </p>
        ) : (
          <p style={{ fontSize: subtitlePx, fontFamily: subtitleFamily, color: "rgba(255,255,255,0.18)", fontWeight: 700, textTransform: "lowercase", marginBottom: 5 }}>
            subtítulo
          </p>
        )}
        {formData.button_text && (
          <div style={{ background: "#820AD1", color: "white", fontSize: isDesktop ? 10 : 7, fontWeight: 600, padding: isDesktop ? "3px 10px" : "2px 6px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
            {formData.button_text}
          </div>
        )}
      </div>

      {/* Label do modo */}
      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/20 text-[10px] font-medium">Sem imagem/vídeo</p>
        </div>
      )}
    </div>
  );
}

interface Banner {
  id: string;
  image_url: string | null;
  video_url?: string | null;
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  link_url?: string;
  etiqueta?: string;
  title_font?: string | null;
  title_font_size?: string | null;
  subtitle_font?: string | null;
  subtitle_font_size?: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BannerFormData {
  image_url: string;
  video_url: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_url: string;
  etiqueta: string;
  location: string;
  title_font: string;
  title_font_size: string;
  subtitle_font: string;
  subtitle_font_size: string;
}

export function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<BannerFormData>({
    image_url: "",
    video_url: "",
    title: "",
    subtitle: "",
    button_text: "",
    button_url: "",
    etiqueta: "",
    location: "hero",
    title_font: "",
    title_font_size: "",
    subtitle_font: "",
    subtitle_font_size: "",
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const loadedFontsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchBanners();
  }, []);

  // Carrega Google Fonts quando selecionadas no formulário
  useEffect(() => {
    const fonts = [formData.title_font, formData.subtitle_font].filter(
      (f) => f && GOOGLE_FONTS_LIST.includes(f) && !loadedFontsRef.current.has(f)
    ) as string[];
    if (fonts.length === 0) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;700`).join("&")}&display=swap`;
    document.head.appendChild(link);
    fonts.forEach((f) => loadedFontsRef.current.add(f));
  }, [formData.title_font, formData.subtitle_font]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("order_index");

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Erro ao buscar banners:", error);
      toast.error("Erro ao carregar banners");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('tour-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('tour-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Selecione um arquivo de imagem"); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file, 'img');
      setFormData(prev => ({ ...prev, image_url: url }));
      toast.success("Foto enviada!");
    } catch { toast.error("Erro ao enviar foto"); }
    finally { setUploading(false); }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error("Selecione um arquivo de vídeo"); return; }
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file, 'vid');
      setFormData(prev => ({ ...prev, video_url: url }));
      toast.success("Vídeo enviado!");
    } catch { toast.error("Erro ao enviar vídeo"); }
    finally { setUploadingVideo(false); }
  };

  const getNextOrderIndex = () => {
    return Math.max(...banners.map(b => b.order_index), -1) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.image_url.trim() && !formData.video_url.trim()) {
      toast.error("Adicione uma foto ou vídeo");
      return;
    }

    try {
      const bannerData = {
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        title: formData.title || null,
        subtitle: formData.subtitle || null,
        button_text: formData.button_text || null,
        button_url: formData.button_url || null,
        etiqueta: formData.etiqueta || null,
        location: formData.location || "hero",
        title_font: formData.title_font || null,
        title_font_size: formData.title_font_size || null,
        subtitle_font: formData.subtitle_font || null,
        subtitle_font_size: formData.subtitle_font_size || null,
        order_index: editingBanner ? editingBanner.order_index : getNextOrderIndex(),
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(bannerData)
          .eq("id", editingBanner.id);

        if (error) throw error;
        toast.success("Banner atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("banners")
          .insert([bannerData]);

        if (error) throw error;
        toast.success("Banner criado com sucesso!");
      }

      setFormData({ image_url: "", video_url: "", title: "", subtitle: "", button_text: "", button_url: "", etiqueta: "", location: "hero", title_font: "", title_font_size: "", subtitle_font: "", subtitle_font_size: "" });
      setEditingBanner(null);
      setShowForm(false);
      fetchBanners();
    } catch (error) {
      console.error("Erro ao salvar banner:", error);
      toast.error("Erro ao salvar banner");
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      image_url: banner.image_url || "",
      video_url: banner.video_url || "",
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      button_text: banner.button_text || "",
      button_url: banner.button_url || "",
      etiqueta: banner.etiqueta || "",
      location: (banner as any).location || "hero",
      title_font: banner.title_font || "",
      title_font_size: banner.title_font_size || "",
      subtitle_font: banner.subtitle_font || "",
      subtitle_font_size: banner.subtitle_font_size || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Banner excluído com sucesso!");
      fetchBanners();
    } catch (error) {
      console.error("Erro ao excluir banner:", error);
      toast.error("Erro ao excluir banner");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Banner ${isActive ? "ativado" : "desativado"} com sucesso!`);
      fetchBanners();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do banner");
    }
  };

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const currentBanner = banners.find(b => b.id === id);
    if (!currentBanner) return;

    const currentIndex = currentBanner.order_index;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetBanner = banners.find(b => b.order_index === targetIndex);

    if (!targetBanner) return;

    try {
      // Swap order indexes
      await supabase
        .from("banners")
        .update({ order_index: targetIndex })
        .eq("id", currentBanner.id);

      await supabase
        .from("banners")
        .update({ order_index: currentIndex })
        .eq("id", targetBanner.id);

      toast.success("Ordem alterada com sucesso!");
      fetchBanners();
    } catch (error) {
      console.error("Erro ao alterar ordem:", error);
      toast.error("Erro ao alterar ordem");
    }
  };

  const resetForm = () => {
    setFormData({ image_url: "", video_url: "", title: "", subtitle: "", button_text: "", button_url: "", etiqueta: "", location: "hero", title_font: "", title_font_size: "", subtitle_font: "", subtitle_font_size: "" });
    setEditingBanner(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Banners</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">

            {/* ── Painel esquerdo: formulário ── */}
            <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>
                {editingBanner ? "Editar Banner" : "Novo Banner"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Foto */}
              <div>
                <Label htmlFor="image">Foto de fundo</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="mt-1.5" />
                {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando foto...</p>}
                {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-2 w-full h-28 object-cover rounded-lg" />}
              </div>

              {/* Vídeo */}
              <div>
                <Label htmlFor="video">Vídeo de fundo <span className="text-muted-foreground font-normal">(substitui a foto se enviado)</span></Label>
                <Input id="video" type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo} className="mt-1.5" />
                {uploadingVideo && <p className="text-xs text-muted-foreground mt-1">Enviando vídeo... (pode demorar)</p>}
                {formData.video_url && (
                  <video src={formData.video_url} muted className="mt-2 w-full h-28 object-cover rounded-lg" />
                )}
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Reconecte-se com a natureza" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de letra</Label>
                    <select
                      value={formData.title_font}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_font: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tamanho</Label>
                    <select
                      value={formData.title_font_size}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_font_size: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subtítulo */}
              <div className="space-y-1.5">
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))} placeholder="Experimente a liberdade" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de letra</Label>
                    <select
                      value={formData.subtitle_font}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle_font: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tamanho</Label>
                    <select
                      value={formData.subtitle_font_size}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle_font_size: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Botão */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="btn_text">Texto do botão</Label>
                  <Input id="btn_text" value={formData.button_text} onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))} placeholder="Ver Passeios" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="btn_url">Link do botão</Label>
                  <Input id="btn_url" value={formData.button_url} onChange={(e) => setFormData(prev => ({ ...prev, button_url: e.target.value }))} placeholder="/agenda" className="mt-1.5" />
                </div>
              </div>

              {/* Local */}
              <div>
                <Label>Onde exibir</Label>
                <div className="flex gap-3 mt-1.5">
                  <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 cursor-pointer text-sm transition-colors ${formData.location === 'hero' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted/40'}`}>
                    <input type="radio" name="location" value="hero" checked={formData.location === 'hero'} onChange={() => setFormData(prev => ({ ...prev, location: 'hero' }))} className="sr-only" />
                    🏠 Página inicial
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 cursor-pointer text-sm transition-colors ${formData.location === 'agenda' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted/40'}`}>
                    <input type="radio" name="location" value="agenda" checked={formData.location === 'agenda'} onChange={() => setFormData(prev => ({ ...prev, location: 'agenda' }))} className="sr-only" />
                    📅 Página de passeios
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={uploading || uploadingVideo || (!formData.image_url && !formData.video_url)} className="flex-1">
                  {editingBanner ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
              </div>
            </form>
            </div>

            {/* ── Painel direito: preview ── */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l bg-muted/30 p-5 flex flex-col gap-4 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pré-visualização</p>
                <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${previewMode === "desktop" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${previewMode === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>
              </div>

              {previewMode === "desktop" ? (
                <BannerPreview formData={formData} mode="desktop" />
              ) : (
                <div className="flex justify-center">
                  <BannerPreview formData={formData} mode="mobile" />
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pré-visualização aproximada. Fontes e tamanhos podem variar levemente no site real.
              </p>
            </div>

            </div>{/* flex row */}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nenhum banner cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          banners.map((banner, index) => (
            <Card key={banner.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={banner.image_url}
                    alt="Banner"
                    className="w-20 h-12 object-cover rounded"
                  />
                  
                  <div className="flex-1 space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${(banner as any).location === 'agenda' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {(banner as any).location === 'agenda' ? '📅 Passeios' : '🏠 Página inicial'}
                    </span>
                    {banner.etiqueta && (
                      <span className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-full ml-1">
                        {banner.etiqueta}
                      </span>
                    )}
                    {banner.title && (
                      <p className="text-sm font-medium truncate">{banner.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Ordem: {banner.order_index + 1}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveOrder(banner.id, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveOrder(banner.id, 'down')}
                        disabled={index === banners.length - 1}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={(checked) => toggleActive(banner.id, checked)}
                      />
                      <span className="text-xs">
                        {banner.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(banner)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este banner? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(banner.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}