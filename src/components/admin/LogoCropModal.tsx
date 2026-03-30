import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

interface LogoCropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const DISPLAY = 300; // px — tamanho do preview na tela
const OUTPUT  = 400; // px — tamanho do arquivo gerado (sempre quadrado)

export function LogoCropModal({ src, onConfirm, onCancel }: LogoCropModalProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const dragRef    = useRef({ dragging: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // minZoom — imagem preenche o quadrado inteiro (nenhum vazio)
  const minZoom = naturalSize.w > 0
    ? Math.max(DISPLAY / naturalSize.w, DISPLAY / naturalSize.h)
    : 1;
  const maxZoom = minZoom * 5;

  // Carrega a imagem e define zoom inicial para cobrir o quadrado
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });
      const initial = Math.max(DISPLAY / nw, DISPLAY / nh);
      setZoom(initial);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  // Desenha no canvas sempre que zoom/offset/imagem mudam
  useEffect(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || naturalSize.w === 0) return;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, DISPLAY, DISPLAY);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, DISPLAY, DISPLAY);

    const sw = naturalSize.w * zoom;
    const sh = naturalSize.h * zoom;
    const x  = (DISPLAY - sw) / 2 + offset.x;
    const y  = (DISPLAY - sh) / 2 + offset.y;
    ctx.drawImage(img, x, y, sw, sh);
  }, [zoom, offset, naturalSize]);

  // ── Drag (mouse) ──────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setOffset({
      x: dragRef.current.ox + e.clientX - dragRef.current.startX,
      y: dragRef.current.oy + e.clientY - dragRef.current.startY,
    });
  };
  const onMouseUp = () => { dragRef.current.dragging = false; };

  // ── Drag (touch) ──────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { dragging: true, startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.dragging) return;
    const t = e.touches[0];
    setOffset({
      x: dragRef.current.ox + t.clientX - dragRef.current.startX,
      y: dragRef.current.oy + t.clientY - dragRef.current.startY,
    });
  };

  // ── Zoom via scroll ──────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(maxZoom, Math.max(minZoom, z - e.deltaY * 0.001)));
  };

  // ── Confirmar: renderiza em OUTPUT×OUTPUT ────────────────────
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const out = document.createElement("canvas");
    out.width  = OUTPUT;
    out.height = OUTPUT;
    const ctx  = out.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);

    const scale = OUTPUT / DISPLAY;
    const sw = naturalSize.w * zoom * scale;
    const sh = naturalSize.h * zoom * scale;
    const x  = (OUTPUT - sw) / 2 + offset.x * scale;
    const y  = (OUTPUT - sh) / 2 + offset.y * scale;

    ctx.drawImage(img, x, y, sw, sh);
    out.toBlob((blob) => { if (blob) onConfirm(blob); }, "image/png");
  };

  const zoomPct = naturalSize.w > 0 ? Math.round((zoom / minZoom) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-5 p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">Recortar logomarca</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste para reposicionar · Role ou deslize o slider para dar zoom
            </p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0">✕</button>
        </div>

        {/* Canvas preview — sempre quadrado */}
        <div className="flex justify-center">
          <div
            className="relative rounded-xl overflow-hidden border-2 border-primary/40 shadow-inner select-none"
            style={{ width: DISPLAY, height: DISPLAY }}
          >
            {/* Fundo xadrez (indica área fora da logo) */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,#e5e5e5 25%,transparent 25%)," +
                  "linear-gradient(-45deg,#e5e5e5 25%,transparent 25%)," +
                  "linear-gradient(45deg,transparent 75%,#e5e5e5 75%)," +
                  "linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)",
                backgroundSize: "14px 14px",
                backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
              }}
            />
            <canvas
              ref={canvasRef}
              width={DISPLAY}
              height={DISPLAY}
              className="relative z-10 cursor-grab active:cursor-grabbing"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { dragRef.current.dragging = false; }}
              onWheel={onWheel}
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Zoom da logo</span>
            <span className="text-primary font-bold">{zoomPct}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(minZoom, z - minZoom * 0.2))}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.001}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5 rounded-full cursor-pointer"
            />
            <button
              onClick={() => setZoom((z) => Math.min(maxZoom, z + minZoom * 0.2))}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Logo maior no quadrado</span>
            <span>Logo menor no quadrado</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Exportado em <strong>400 × 400 px</strong> · fundo branco · padrão igual para todos os parceiros
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={naturalSize.w === 0}>
            Salvar recorte
          </Button>
        </div>

      </div>
    </div>
  );
}
