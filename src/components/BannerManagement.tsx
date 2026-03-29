import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Upload, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

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

      setFormData({ image_url: "", video_url: "", title: "", subtitle: "", button_text: "", button_url: "", etiqueta: "" });
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
    setFormData({ image_url: "", video_url: "", title: "", subtitle: "", button_text: "", button_url: "", etiqueta: "" });
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
          <DialogContent className="max-w-md">
            <DialogHeader>
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
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Reconecte-se com a natureza" className="mt-1.5" />
              </div>

              {/* Subtítulo */}
              <div>
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))} placeholder="Experimente a liberdade" className="mt-1.5" />
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

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={uploading || uploadingVideo || (!formData.image_url && !formData.video_url)} className="flex-1">
                  {editingBanner ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
              </div>
            </form>
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
                    {banner.etiqueta && (
                      <span className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                        {banner.etiqueta}
                      </span>
                    )}
                    {banner.link_url && (
                      <p className="text-sm text-muted-foreground truncate">
                        Link: {banner.link_url}
                      </p>
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