import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Images } from 'lucide-react';
import { ImageCropModal } from '@/components/gallery/ImageCropModal';
import { GalleryImageCard } from '@/components/gallery/GalleryImageCard';

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  order_index: number;
  is_cover?: boolean;
  crop_position?: CropPosition;
  caption?: string;
}

interface TourGalleryManagerProps {
  tourId: string;
}

export function TourGalleryManager({ tourId }: TourGalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<GalleryImage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, [tourId]);

  const fetchImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tour_gallery_images')
      .select('*')
      .eq('tour_id', tourId)
      .order('order_index');

    if (error) {
      toast({ title: 'Erro ao carregar galeria', variant: 'destructive' });
    } else {
      const mappedData = (data || []).map(img => ({
        ...img,
        crop_position: (img.crop_position as unknown as CropPosition) || { x: 50, y: 50, scale: 1 },
      }));
      setImages(mappedData);
    }
    setLoading(false);
  };

  const handleMultipleUploads = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedImages: { url: string; order: number }[] = [];
    
    try {
      // Get current max order
      const { data: existingImages } = await supabase
        .from('tour_gallery_images')
        .select('order_index')
        .eq('tour_id', tourId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      let currentMaxOrder = existingImages && existingImages.length > 0 
        ? existingImages[0].order_index 
        : -1;

      // Check if this tour has any images (for cover logic)
      const { count } = await supabase
        .from('tour_gallery_images')
        .select('*', { count: 'exact', head: true })
        .eq('tour_id', tourId);
      
      const hasNoImages = (count || 0) === 0;

      // Upload each file sequentially to avoid race conditions
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        // Use unique identifier with index to prevent any collision
        const uniqueId = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`;
        const fileName = `${tourId}/${uniqueId}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tour-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          continue; // Skip this file but continue with others
        }

        const { data: { publicUrl } } = supabase.storage
          .from('tour-images')
          .getPublicUrl(fileName);

        currentMaxOrder++;
        uploadedImages.push({ url: publicUrl, order: currentMaxOrder });
      }

      // Insert all images in a single batch
      if (uploadedImages.length > 0) {
        const imagesToInsert = uploadedImages.map((img, idx) => ({
          tour_id: tourId,
          image_url: img.url,
          order_index: img.order,
          is_cover: hasNoImages && idx === 0, // Only first image of first upload is cover
          crop_position: { x: 50, y: 50, scale: 1 },
        }));

        const { error: insertError } = await supabase
          .from('tour_gallery_images')
          .insert(imagesToInsert);

        if (insertError) throw insertError;

        toast({ 
          title: `${uploadedImages.length} ${uploadedImages.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'} com sucesso!` 
        });
      }

      // Fetch updated images once at the end
      await fetchImages();
    } catch (error: any) {
      toast({ title: 'Erro ao fazer upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleUploads(Array.from(files));
    }
    // Reset input
    e.target.value = '';
  };

  const handleSetCover = async (imageId: string) => {
    try {
      // Remove cover from all images
      await supabase
        .from('tour_gallery_images')
        .update({ is_cover: false })
        .eq('tour_id', tourId);

      // Set new cover
      await supabase
        .from('tour_gallery_images')
        .update({ is_cover: true })
        .eq('id', imageId);

      setImages(prev => prev.map(img => ({
        ...img,
        is_cover: img.id === imageId,
      })));

      toast({ title: 'Capa definida com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao definir capa', variant: 'destructive' });
    }
  };

  const handleOpenCrop = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      setSelectedImageForCrop(image);
      setCropModalOpen(true);
    }
  };

  const handleSaveCrop = async (position: CropPosition) => {
    if (!selectedImageForCrop) return;

    try {
      await supabase
        .from('tour_gallery_images')
        .update({ crop_position: position as any })
        .eq('id', selectedImageForCrop.id);

      setImages(prev => prev.map(img => 
        img.id === selectedImageForCrop.id 
          ? { ...img, crop_position: position }
          : img
      ));

      toast({ title: 'Posição salva!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar posição', variant: 'destructive' });
    }
  };

  const handleUpdateCaption = async (imageId: string, caption: string) => {
    try {
      await supabase
        .from('tour_gallery_images')
        .update({ caption })
        .eq('id', imageId);

      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, caption } : img
      ));

      toast({ title: 'Legenda atualizada!' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar legenda', variant: 'destructive' });
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/tour-images/');
      if (urlParts.length > 1) {
        await supabase.storage.from('tour-images').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('tour_gallery_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      const deletedImage = images.find(img => img.id === imageId);
      const remainingImages = images.filter(img => img.id !== imageId);

      // If deleted image was cover, set first remaining as cover
      if (deletedImage?.is_cover && remainingImages.length > 0) {
        await supabase
          .from('tour_gallery_images')
          .update({ is_cover: true })
          .eq('id', remainingImages[0].id);
        
        remainingImages[0].is_cover = true;
      }

      setImages(remainingImages);
      toast({ title: 'Imagem removida' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover imagem', description: error.message, variant: 'destructive' });
    }
  };

  const moveImage = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;

    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);

    const updates = newImages.map((img, idx) => ({
      id: img.id,
      order_index: idx,
    }));

    setImages(newImages.map((img, idx) => ({ ...img, order_index: idx })));

    for (const update of updates) {
      await supabase
        .from('tour_gallery_images')
        .update({ order_index: update.order_index })
        .eq('id', update.id);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
            <Images className="h-4 w-4" />
            Galeria de Fotos
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Adicione fotos e escolha qual será a capa do card. Use o ícone de recorte para ajustar a região visível.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload button */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="gallery-upload"
              disabled={uploading}
            />
            <label htmlFor="gallery-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Enviando...' : 'Clique para adicionar fotos'}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  Selecione uma ou várias imagens
                </span>
              </div>
            </label>
          </div>

          {/* Image grid */}
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhuma foto na galeria
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((image, index) => (
                <GalleryImageCard
                  key={image.id}
                  image={image}
                  index={index}
                  totalImages={images.length}
                  onSetCover={handleSetCover}
                  onOpenCrop={handleOpenCrop}
                  onUpdateCaption={handleUpdateCaption}
                  onDelete={handleDelete}
                  onMove={moveImage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crop Modal */}
      {selectedImageForCrop && (
        <ImageCropModal
          open={cropModalOpen}
          onOpenChange={setCropModalOpen}
          imageUrl={selectedImageForCrop.image_url}
          initialPosition={selectedImageForCrop.crop_position || { x: 50, y: 50, scale: 1 }}
          onSave={handleSaveCrop}
        />
      )}
    </>
  );
}
