import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Star, Crop, MessageSquare, Check, X } from 'lucide-react';

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

interface GalleryImageCardProps {
  image: GalleryImage;
  index: number;
  totalImages: number;
  onSetCover: (imageId: string) => void;
  onOpenCrop: (imageId: string) => void;
  onUpdateCaption: (imageId: string, caption: string) => void;
  onDelete: (imageId: string, imageUrl: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

export function GalleryImageCard({
  image,
  index,
  totalImages,
  onSetCover,
  onOpenCrop,
  onUpdateCaption,
  onDelete,
  onMove,
}: GalleryImageCardProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState(image.caption || '');
  const [imageError, setImageError] = useState(false);

  const handleSaveCaption = () => {
    onUpdateCaption(image.id, captionValue);
    setIsEditingCaption(false);
  };

  const handleCancelCaption = () => {
    setCaptionValue(image.caption || '');
    setIsEditingCaption(false);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border bg-muted">
      {/* Image preview */}
      <div className="aspect-video relative">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
            <div className="text-center p-2">
              <p>Erro ao carregar</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-1 h-6 text-xs"
                onClick={() => onDelete(image.id, image.image_url)}
              >
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <img
            src={image.image_url}
            alt={`Foto ${index + 1}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Cover badge */}
        {image.is_cover && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            Capa
          </div>
        )}
        
        {/* Order badge */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
          {index + 1}
        </div>
        
        {/* Overlay with actions - only show if image loaded successfully */}
        {!imageError && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex flex-wrap gap-1 justify-center p-2">
            {/* Move buttons */}
            {index > 0 && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMove(index, index - 1)}
                title="Mover para esquerda"
              >
                ←
              </Button>
            )}
            {index < totalImages - 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMove(index, index + 1)}
                title="Mover para direita"
              >
                →
              </Button>
            )}
            
            {/* Set as cover */}
            {!image.is_cover && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSetCover(image.id)}
                title="Definir como capa"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            
            {/* Crop position */}
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenCrop(image.id)}
              title="Ajustar posição da capa"
            >
              <Crop className="h-4 w-4" />
            </Button>
            
            {/* Edit caption */}
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingCaption(true)}
              title="Editar legenda"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            {/* Delete */}
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(image.id, image.image_url)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        )}
      </div>
      
      {/* Caption area */}
      <div className="p-2 bg-background border-t">
        {isEditingCaption ? (
          <div className="flex gap-1">
            <Input
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              placeholder="Digite a legenda..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCaption();
                if (e.key === 'Escape') handleCancelCaption();
              }}
            />
            <Button size="icon" className="h-7 w-7" onClick={handleSaveCaption}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelCaption}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p 
            className="text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground"
            onClick={() => setIsEditingCaption(true)}
            title={image.caption || 'Clique para adicionar legenda'}
          >
            {image.caption || 'Sem legenda'}
          </p>
        )}
      </div>
    </div>
  );
}
