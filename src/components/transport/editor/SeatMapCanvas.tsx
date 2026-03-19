import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, FabricText, Group, FabricObject } from 'fabric';

export interface CanvasElement {
  id: string;
  type: 'seat' | 'rect' | 'circle' | 'text' | 'icon' | 'driver' | 'door' | 'wc';
  left: number;
  top: number;
  width?: number;
  height?: number;
  radius?: number;
  angle?: number;
  fill?: string;
  stroke?: string;
  text?: string;
  seatNumber?: string;
  seatStatus?: 'available' | 'blocked' | 'crew';
}

interface SeatMapCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onSelectionChange: (element: CanvasElement | null) => void;
  zoom: number;
  gridEnabled: boolean;
  width?: number;
  height?: number;
}

export const SeatMapCanvas: React.FC<SeatMapCanvasProps> = ({
  elements,
  onElementsChange,
  onSelectionChange,
  zoom,
  gridEnabled,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const elementsRef = useRef<CanvasElement[]>(elements);
  const isInternalUpdate = useRef(false);

  // Keep elementsRef in sync
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#f8fafc',
      selection: true,
      preserveObjectStacking: true
    });

    fabricRef.current = canvas;

    // Selection events
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        const elementData = (selected as any).elementData as CanvasElement;
        onSelectionChange(elementData || null);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        const elementData = (selected as any).elementData as CanvasElement;
        onSelectionChange(elementData || null);
      }
    });

    canvas.on('selection:cleared', () => {
      onSelectionChange(null);
    });

    // Object modified - sync after modification is complete
    canvas.on('object:modified', (e) => {
      syncElementsFromCanvas();
    });

    canvas.on('object:moving', (e) => {
      if (gridEnabled && e.target) {
        const gridSize = 10;
        e.target.set({
          left: Math.round((e.target.left || 0) / gridSize) * gridSize,
          top: Math.round((e.target.top || 0) / gridSize) * gridSize
        });
      }
    });

    setIsInitialized(true);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Update zoom
  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.setZoom(zoom / 100);
    fabricRef.current.setDimensions({
      width: width * (zoom / 100),
      height: height * (zoom / 100)
    });
  }, [zoom, width, height]);

  // Draw grid
  useEffect(() => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    const gridSize = 20;
    
    // Remove existing grid
    const existingGrid = canvas.getObjects().filter((obj: any) => obj.isGrid);
    existingGrid.forEach(obj => canvas.remove(obj));
    
    if (gridEnabled) {
      // Draw grid lines
      for (let i = 0; i < width / gridSize; i++) {
        const line = new Rect({
          left: i * gridSize,
          top: 0,
          width: 1,
          height: height,
          fill: '#e2e8f0',
          selectable: false,
          evented: false
        });
        (line as any).isGrid = true;
        canvas.add(line);
        canvas.sendObjectToBack(line);
      }
      for (let i = 0; i < height / gridSize; i++) {
        const line = new Rect({
          left: 0,
          top: i * gridSize,
          width: width,
          height: 1,
          fill: '#e2e8f0',
          selectable: false,
          evented: false
        });
        (line as any).isGrid = true;
        canvas.add(line);
        canvas.sendObjectToBack(line);
      }
    }
    canvas.renderAll();
  }, [gridEnabled, width, height]);

  // Sync elements to canvas - only when elements change externally
  useEffect(() => {
    if (!fabricRef.current || !isInitialized) return;
    
    // Skip if this was an internal update
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    const canvas = fabricRef.current;
    
    // Remove non-grid objects
    const nonGridObjects = canvas.getObjects().filter((obj: any) => !obj.isGrid);
    nonGridObjects.forEach(obj => canvas.remove(obj));
    
    // Add elements
    elements.forEach(element => {
      const obj = createFabricObject(element);
      if (obj) {
        (obj as any).elementData = element;
        canvas.add(obj);
      }
    });
    
    canvas.renderAll();
  }, [elements, isInitialized]);

  const createFabricObject = (element: CanvasElement): FabricObject | null => {
    switch (element.type) {
      case 'seat': {
        const seatColor = element.seatStatus === 'blocked' ? '#94a3b8' :
                         element.seatStatus === 'crew' ? '#f59e0b' : '#22c55e';
        
        const rect = new Rect({
          width: 36,
          height: 40,
          fill: seatColor,
          stroke: '#1e293b',
          strokeWidth: 2,
          rx: 6,
          ry: 6,
          originX: 'center',
          originY: 'center'
        });

        const text = new FabricText(element.seatNumber || '?', {
          fontSize: 12,
          fill: '#ffffff',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center'
        });

        const group = new Group([rect, text], {
          left: element.left,
          top: element.top,
          angle: element.angle || 0,
          hasControls: true,
          hasBorders: true
        });

        return group;
      }
      
      case 'rect': {
        const rect = new Rect({
          left: element.left,
          top: element.top,
          width: element.width || 100,
          height: element.height || 50,
          fill: element.fill || '#e2e8f0',
          stroke: element.stroke || '#94a3b8',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          angle: element.angle || 0,
          scaleX: 1,
          scaleY: 1
        });
        return rect;
      }
      
      case 'circle': {
        const circle = new Circle({
          left: element.left,
          top: element.top,
          radius: element.radius || 25,
          fill: element.fill || '#e2e8f0',
          stroke: element.stroke || '#94a3b8',
          strokeWidth: 2,
          angle: element.angle || 0,
          scaleX: 1,
          scaleY: 1
        });
        return circle;
      }
      
      case 'text':
        return new FabricText(element.text || 'Texto', {
          left: element.left,
          top: element.top,
          fontSize: 14,
          fill: element.fill || '#1e293b',
          fontWeight: 'bold',
          angle: element.angle || 0
        });
      
      case 'driver': {
        const driverRect = new Rect({
          width: 50,
          height: 50,
          fill: '#3b82f6',
          stroke: '#1e40af',
          strokeWidth: 2,
          rx: 8,
          ry: 8,
          originX: 'center',
          originY: 'center'
        });

        const driverText = new FabricText('🚗', {
          fontSize: 24,
          originX: 'center',
          originY: 'center'
        });

        return new Group([driverRect, driverText], {
          left: element.left,
          top: element.top,
          angle: element.angle || 0
        });
      }
      
      case 'door': {
        const doorRect = new Rect({
          width: 30,
          height: 60,
          fill: '#fbbf24',
          stroke: '#d97706',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          originX: 'center',
          originY: 'center'
        });

        const doorText = new FabricText('🚪', {
          fontSize: 20,
          originX: 'center',
          originY: 'center'
        });

        return new Group([doorRect, doorText], {
          left: element.left,
          top: element.top,
          angle: element.angle || 0
        });
      }
      
      case 'wc': {
        const wcRect = new Rect({
          width: 45,
          height: 45,
          fill: '#8b5cf6',
          stroke: '#6d28d9',
          strokeWidth: 2,
          rx: 6,
          ry: 6,
          originX: 'center',
          originY: 'center'
        });

        const wcText = new FabricText('WC', {
          fontSize: 14,
          fill: '#ffffff',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center'
        });

        return new Group([wcRect, wcText], {
          left: element.left,
          top: element.top,
          angle: element.angle || 0
        });
      }
      
      default:
        return null;
    }
  };

  const syncElementsFromCanvas = useCallback(() => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    const objects = canvas.getObjects().filter((obj: any) => !obj.isGrid && obj.elementData);
    
    const updatedElements: CanvasElement[] = objects.map((obj: any) => {
      const elementData = obj.elementData as CanvasElement;
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      
      // Calculate actual dimensions after scaling
      const actualWidth = (obj.width || elementData.width || 100) * scaleX;
      const actualHeight = (obj.height || elementData.height || 50) * scaleY;
      const actualRadius = (obj.radius || elementData.radius || 25) * scaleX;
      
      // Update the elementData on the object itself to keep it in sync
      const updatedData = {
        ...elementData,
        left: obj.left || 0,
        top: obj.top || 0,
        angle: obj.angle || 0,
        width: actualWidth,
        height: actualHeight,
        radius: actualRadius,
        fill: obj.fill || elementData.fill,
        stroke: obj.stroke || elementData.stroke
      };
      
      // Update the reference on the object
      obj.elementData = updatedData;
      
      // Reset scale to 1 after applying to dimensions
      obj.set({ scaleX: 1, scaleY: 1 });
      
      return updatedData;
    });
    
    // Mark this as internal update to prevent re-rendering
    isInternalUpdate.current = true;
    onElementsChange(updatedElements);
  }, [onElementsChange]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default SeatMapCanvas;
