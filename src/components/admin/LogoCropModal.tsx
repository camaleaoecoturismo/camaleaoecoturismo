import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";

interface LogoCropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

function centerAspectCrop(w: number, h: number, aspect: number): Crop {
  return centerCrop(makeAspectCrop({ unit: "%", width: 80 }, aspect, w, h), w, h);
}

const ASPECTS = [
  { label: "Livre", value: null },
  { label: "1:1 (quadrado)", value: 1 },
  { label: "2:1 (horizontal)", value: 2 },
  { label: "3:1 (banner)", value: 3 },
  { label: "4:3", value: 4 / 3 },
];

export function LogoCropModal({ src, onConfirm, onCancel }: LogoCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect ?? width / height));
  }, [aspect]);

  const handleAspectChange = (val: number | null) => {
    const a = val ?? undefined;
    setAspect(a);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, a ?? width / height));
    }
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !completedCrop) return;
    setExporting(true);

    const canvas = document.createElement("canvas");
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = Math.round(completedCrop.width * scaleX);
    canvas.height = Math.round(completedCrop.height * scaleY);
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    canvas.toBlob((blob) => {
      setExporting(false);
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Recortar logomarca</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {/* Aspect ratio picker */}
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((a) => (
            <button
              key={a.label}
              onClick={() => handleAspectChange(a.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                aspect === a.value
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Crop area */}
        <div className="flex justify-center bg-muted/40 rounded-xl overflow-hidden max-h-[55vh]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={10}
            minHeight={10}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Logo para recortar"
              onLoad={onImageLoad}
              className="max-h-[55vh] max-w-full object-contain"
            />
          </ReactCrop>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Arraste para mover · Puxe as alças para redimensionar o recorte
        </p>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!completedCrop || exporting}>
            {exporting ? "Processando…" : "Confirmar recorte"}
          </Button>
        </div>
      </div>
    </div>
  );
}
