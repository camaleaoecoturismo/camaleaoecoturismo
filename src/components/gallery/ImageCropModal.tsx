import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialPosition?: CropPosition;
  onSave: (position: CropPosition) => void;
}

export function ImageCropModal({ 
  open, 
  onOpenChange, 
  imageUrl, 
  initialPosition = { x: 50, y: 50, scale: 1 },
  onSave 
}: ImageCropModalProps) {
  const [position, setPosition] = useState<CropPosition>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open) {
      setPosition(initialPosition);
    }
  }, [open, initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Invert the movement so it feels like dragging the image
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100 / position.scale;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100 / position.scale;
    
    setPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x - deltaX)),
      y: Math.max(0, Math.min(100, prev.y - deltaY)),
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const touch = e.touches[0];
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const deltaX = ((touch.clientX - dragStart.x) / rect.width) * 100 / position.scale;
    const deltaY = ((touch.clientY - dragStart.y) / rect.height) * 100 / position.scale;
    
    setPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x - deltaX)),
      y: Math.max(0, Math.min(100, prev.y - deltaY)),
    }));
    
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (value: number[]) => {
    setPosition(prev => ({ ...prev, scale: value[0] }));
  };

  const handleReset = () => {
    setPosition({ x: 50, y: 50, scale: 1 });
  };

  const handleSave = () => {
    onSave(position);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Ajustar Área de Exibição na Capa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Arraste a imagem para selecionar a região que aparecerá na capa do card. Use o zoom para ajustar o tamanho.
          </p>
          
          {/* Preview container with 4:3 aspect ratio */}
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-lg cursor-move select-none bg-muted"
            style={{
              aspectRatio: '4 / 3',
              border: '3px solid hsl(var(--primary))',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Background image (full, blurred) */}
            <img
              src={imageUrl}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30 pointer-events-none"
              draggable={false}
            />
            
            {/* Main cropped image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              className="absolute w-full h-full pointer-events-none"
              style={{
                objectFit: 'cover',
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${position.scale})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
              draggable={false}
            />
            
            {/* Corner markers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
            </div>
            
            {/* Drag indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
              <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Move className="h-3 w-3" />
                Arraste para ajustar
              </span>
            </div>
          </div>

          {/* Controls bar - similar to Wix */}
          <div className="flex items-center justify-center gap-4 bg-muted/50 rounded-lg p-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[position.scale]}
                onValueChange={handleScaleChange}
                min={0.5}
                max={2.5}
                step={0.05}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            
            {/* Reset button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Resetar
            </Button>
          </div>
          
          {/* Dimensions info */}
          <p className="text-xs text-muted-foreground text-center">
            Proporção da capa: 4:3 (igual ao card)
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
