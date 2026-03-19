import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X, Loader2 } from 'lucide-react';
import { SeatMapCanvas, CanvasElement } from './SeatMapCanvas';
import { EditorToolbar } from './EditorToolbar';
import { PropertiesPanel } from './PropertiesPanel';

interface SeatMapEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  vehicleId?: string;
  vehicleName?: string;
  initialLayout?: string;
}

export const SeatMapEditor: React.FC<SeatMapEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicleId,
  vehicleName: initialVehicleName,
  initialLayout
}) => {
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    if (initialLayout) {
      try {
        return JSON.parse(initialLayout);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [zoom, setZoom] = useState(100);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [vehicleName, setVehicleName] = useState(initialVehicleName || '');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();

  // Seat counters
  const seatStats = useMemo(() => {
    const seats = elements.filter(e => e.type === 'seat');
    return {
      total: seats.length,
      available: seats.filter(s => s.seatStatus === 'available' || !s.seatStatus).length,
      blocked: seats.filter(s => s.seatStatus === 'blocked').length,
      crew: seats.filter(s => s.seatStatus === 'crew').length
    };
  }, [elements]);

  // Generate unique ID
  const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Generate seat number
  const generateSeatNumber = () => {
    const existingNumbers = elements
      .filter(e => e.type === 'seat' && e.seatNumber)
      .map(e => parseInt(e.seatNumber || '0'))
      .filter(n => !isNaN(n));
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return String(maxNumber + 1).padStart(2, '0');
  };

  // Save to history
  const saveToHistory = useCallback((newElements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Add element
  const handleAddElement = useCallback((type: string) => {
    const newElement: CanvasElement = {
      id: generateId(),
      type: type as CanvasElement['type'],
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 200
    };

    if (type === 'seat') {
      newElement.seatNumber = generateSeatNumber();
      newElement.seatStatus = 'available';
    } else if (type === 'text') {
      newElement.text = 'Texto';
    } else if (type === 'rect') {
      newElement.width = 100;
      newElement.height = 50;
      newElement.fill = '#e2e8f0';
    } else if (type === 'circle') {
      newElement.radius = 25;
      newElement.fill = '#e2e8f0';
    }

    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
  }, [elements, saveToHistory]);

  // Add seat row
  const handleAddSeatRow = useCallback(() => {
    const newElements: CanvasElement[] = [];
    const startX = 100;
    const startY = 100 + (elements.filter(e => e.type === 'seat').length / 4) * 50;
    
    for (let i = 0; i < 4; i++) {
      const seatNum = generateSeatNumber();
      newElements.push({
        id: generateId(),
        type: 'seat',
        left: startX + i * 50 + (i >= 2 ? 30 : 0), // Add aisle gap
        top: startY,
        seatNumber: String(parseInt(seatNum) + i).padStart(2, '0'),
        seatStatus: 'available'
      });
    }

    const updated = [...elements, ...newElements];
    setElements(updated);
    saveToHistory(updated);
  }, [elements, saveToHistory]);

  // Update element
  const handleUpdateElement = useCallback((updates: Partial<CanvasElement>) => {
    if (!selectedElement) return;

    const newElements = elements.map(e => 
      e.id === selectedElement.id ? { ...e, ...updates } : e
    );
    setElements(newElements);
    setSelectedElement({ ...selectedElement, ...updates });
    saveToHistory(newElements);
  }, [elements, selectedElement, saveToHistory]);

  // Delete element
  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    const newElements = elements.filter(e => e.id !== selectedElement.id);
    setElements(newElements);
    setSelectedElement(null);
    saveToHistory(newElements);
  }, [elements, selectedElement, saveToHistory]);

  // Duplicate element
  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    const newElement: CanvasElement = {
      ...selectedElement,
      id: generateId(),
      left: selectedElement.left + 50,
      top: selectedElement.top + 50
    };
    if (newElement.type === 'seat') {
      newElement.seatNumber = generateSeatNumber();
    }
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
  }, [elements, selectedElement, saveToHistory]);

  // Rotate element
  const handleRotate = useCallback(() => {
    if (!selectedElement) return;
    handleUpdateElement({ angle: ((selectedElement.angle || 0) + 90) % 360 });
  }, [selectedElement, handleUpdateElement]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
      setSelectedElement(null);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
      setSelectedElement(null);
    }
  }, [history, historyIndex]);

  // Zoom
  const handleZoomIn = () => setZoom(Math.min(150, zoom + 25));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 25));

  // Save to database
  const handleSave = async () => {
    if (!vehicleName.trim()) {
      toast({ title: 'Nome do veículo é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const layoutJson = JSON.stringify(elements);
      const seats = elements.filter(e => e.type === 'seat');
      
      if (vehicleId) {
        // Update existing
        const { error } = await supabase
          .from('transport_vehicles')
          .update({
            name: vehicleName,
            layout_json: layoutJson,
            total_capacity: seats.length
          })
          .eq('id', vehicleId);

        if (error) throw error;

        // Update seats
        await supabase.from('vehicle_seats').delete().eq('vehicle_id', vehicleId);
        
        if (seats.length > 0) {
          const seatRecords = seats.map((seat, index) => ({
            vehicle_id: vehicleId,
            row_number: Math.floor(index / 4) + 1,
            seat_letter: String.fromCharCode(65 + (index % 4)),
            seat_label: seat.seatNumber || String(index + 1),
            position_x: Math.round(seat.left),
            position_y: Math.round(seat.top),
            seat_type: seat.seatStatus === 'blocked' ? 'blocked' : 
                       seat.seatStatus === 'crew' ? 'crew' : 'standard'
          }));

          const { error: seatsError } = await supabase
            .from('vehicle_seats')
            .insert(seatRecords);

          if (seatsError) throw seatsError;
        }

        toast({ title: 'Veículo atualizado com sucesso!' });
      } else {
        // Create new
        const { data: newVehicle, error } = await supabase
          .from('transport_vehicles')
          .insert({
            name: vehicleName,
            layout_json: layoutJson,
            total_capacity: seats.length,
            rows_count: Math.ceil(seats.length / 4),
            seats_per_row: 4,
            aisle_position: 2
          })
          .select()
          .single();

        if (error) throw error;

        // Create seats
        if (seats.length > 0) {
          const seatRecords = seats.map((seat, index) => ({
            vehicle_id: newVehicle.id,
            row_number: Math.floor(index / 4) + 1,
            seat_letter: String.fromCharCode(65 + (index % 4)),
            seat_label: seat.seatNumber || String(index + 1),
            position_x: Math.round(seat.left),
            position_y: Math.round(seat.top),
            seat_type: seat.seatStatus === 'blocked' ? 'blocked' : 
                       seat.seatStatus === 'crew' ? 'crew' : 'standard'
          }));

          const { error: seatsError } = await supabase
            .from('vehicle_seats')
            .insert(seatRecords);

          if (seatsError) throw seatsError;
        }

        toast({ title: 'Veículo criado com sucesso!' });
      }

      setShowSaveDialog(false);
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Editor de Mapa de Assentos</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-120px)]">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <EditorToolbar
              onAddElement={handleAddElement}
              onAddSeatRow={handleAddSeatRow}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleGrid={() => setGridEnabled(!gridEnabled)}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onRotate={handleRotate}
              onUndo={handleUndo}
              onRedo={handleRedo}
              gridEnabled={gridEnabled}
              hasSelection={!!selectedElement}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              zoom={zoom}
            />

            <div className="flex-1 mt-4 overflow-auto bg-muted/30 rounded-lg p-4">
              <SeatMapCanvas
                elements={elements}
                onElementsChange={setElements}
                onSelectionChange={setSelectedElement}
                zoom={zoom}
                gridEnabled={gridEnabled}
              />
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l p-4 overflow-y-auto bg-muted/20">
            <PropertiesPanel
              selectedElement={selectedElement}
              onUpdateElement={handleUpdateElement}
              totalSeats={seatStats.total}
              availableSeats={seatStats.available}
              blockedSeats={seatStats.blocked}
              crewSeats={seatStats.crew}
            />
          </div>
        </div>
      </DialogContent>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Veículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Veículo</Label>
              <Input
                value={vehicleName}
                onChange={e => setVehicleName(e.target.value)}
                placeholder="Ex: Ônibus 46 Lugares"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Total de poltronas: <strong>{seatStats.total}</strong></p>
              <p>Disponíveis: <strong>{seatStats.available}</strong></p>
              <p>Bloqueadas: <strong>{seatStats.blocked}</strong></p>
              <p>Equipe: <strong>{seatStats.crew}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SeatMapEditor;
