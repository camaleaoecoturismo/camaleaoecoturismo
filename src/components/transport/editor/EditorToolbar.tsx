import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Armchair, 
  Square, 
  Circle, 
  Type, 
  Car, 
  DoorOpen, 
  Bath,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Trash2,
  Copy,
  RotateCw,
  Rows3
} from 'lucide-react';

interface EditorToolbarProps {
  onAddElement: (type: string) => void;
  onAddSeatRow: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  gridEnabled: boolean;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddElement,
  onAddSeatRow,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onDelete,
  onDuplicate,
  onRotate,
  onUndo,
  onRedo,
  gridEnabled,
  hasSelection,
  canUndo,
  canRedo,
  zoom
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 rounded-lg border border-border">
        {/* Add Elements */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('seat')}>
                <Armchair className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar Poltrona</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onAddSeatRow}>
                <Rows3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar Fileira</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('rect')}>
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retângulo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('circle')}>
                <Circle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Círculo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('text')}>
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Texto</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Icons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('driver')}>
                <Car className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Motorista</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('door')}>
                <DoorOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Porta</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onAddElement('wc')}>
                <Bath className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Banheiro</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={!hasSelection}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onRotate} disabled={!hasSelection}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Girar 90°</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onDelete} disabled={!hasSelection}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Desfazer</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo}>
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refazer</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* View */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Diminuir Zoom</TooltipContent>
          </Tooltip>

          <span className="text-xs font-medium min-w-[40px] text-center">{zoom}%</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aumentar Zoom</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={gridEnabled ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={onToggleGrid}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Grade de Alinhamento</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EditorToolbar;
