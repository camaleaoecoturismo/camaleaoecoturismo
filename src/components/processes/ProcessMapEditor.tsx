import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessMap, ProcessElement, ProcessConnection, ProcessStage, AREAS, STATUSES, ELEMENT_COLORS } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Trash2, Circle, Square, Diamond, 
  CheckCircle, Construction, MousePointer, MessageSquare,
  Download, Image, FileText, Move, ListTodo, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ProcessStagesEditor from './ProcessStagesEditor';
import ProcessTaskConfigPanel from './ProcessTaskConfigPanel';

interface ProcessMapEditorProps {
  map: ProcessMap;
  onSave: (updates: Partial<ProcessMap>) => Promise<boolean>;
  onBack: () => void;
}

type ToolMode = 'select' | 'process' | 'decision' | 'start' | 'end' | 'connect' | 'comment';

const DEFAULT_COLORS: Record<string, string> = {
  start: 'green',
  end: 'red',
  process: 'blue',
  decision: 'amber',
  comment: 'gray',
};

export const ProcessMapEditor: React.FC<ProcessMapEditorProps> = ({
  map,
  onSave,
  onBack
}) => {
  const [name, setName] = useState(map.name);
  const [area, setArea] = useState(map.area);
  const [status, setStatus] = useState(map.status);
  const [elements, setElements] = useState<ProcessElement[]>(map.elements);
  const [connections, setConnections] = useState<ProcessConnection[]>(map.connections);
  const [stages, setStages] = useState<ProcessStage[]>(map.stages || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showStagesPanel, setShowStagesPanel] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Track changes
  useEffect(() => {
    const elementsChanged = JSON.stringify(elements) !== JSON.stringify(map.elements);
    const connectionsChanged = JSON.stringify(connections) !== JSON.stringify(map.connections);
    const stagesChanged = JSON.stringify(stages) !== JSON.stringify(map.stages || []);
    const metaChanged = name !== map.name || area !== map.area || status !== map.status;
    setHasChanges(elementsChanged || connectionsChanged || stagesChanged || metaChanged);
  }, [elements, connections, name, area, status, map]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave({
      name,
      area,
      status,
      elements,
      connections,
      stages
    });
    setIsSaving(false);
    if (success) {
      toast.success('Mapa salvo com sucesso');
      setHasChanges(false);
    }
  };

  const getElementColor = (el: ProcessElement) => {
    const colorKey = el.color || DEFAULT_COLORS[el.type] || 'blue';
    return ELEMENT_COLORS[colorKey] || ELEMENT_COLORS.blue;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + canvasRef.current.scrollLeft;
    const y = e.clientY - rect.top + canvasRef.current.scrollTop;

    // Check if clicked on empty space
    const clickedElement = elements.find(el => {
      const inX = x >= el.x && x <= el.x + el.width;
      const inY = y >= el.y && y <= el.y + el.height;
      return inX && inY;
    });

    if (clickedElement) return;

    if (toolMode === 'select') {
      setSelectedId(null);
      setConnectingFrom(null);
      return;
    }

    if (toolMode === 'connect') return;

    // Create new element
    const isComment = toolMode === 'comment';
    const newElement: ProcessElement = {
      id: `el-${Date.now()}`,
      type: toolMode as ProcessElement['type'],
      x: x - (isComment ? 75 : 50),
      y: y - (isComment ? 30 : 25),
      width: isComment ? 150 : toolMode === 'decision' ? 120 : 100,
      height: isComment ? 60 : toolMode === 'decision' ? 80 : 50,
      text: toolMode === 'start' ? 'Início' : 
            toolMode === 'end' ? 'Fim' : 
            isComment ? 'Comentário' : 'Novo',
      color: DEFAULT_COLORS[toolMode],
    };

    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setToolMode('select');
  };

  const handleElementClick = (e: React.MouseEvent, el: ProcessElement) => {
    e.stopPropagation();

    if (toolMode === 'connect') {
      if (el.type === 'comment') return; // Can't connect comments
      if (!connectingFrom) {
        setConnectingFrom(el.id);
      } else if (connectingFrom !== el.id) {
        const newConnection: ProcessConnection = {
          id: `conn-${Date.now()}`,
          fromId: connectingFrom,
          toId: el.id,
          label: ''
        };
        setConnections(prev => [...prev, newConnection]);
        setConnectingFrom(null);
      }
    } else {
      setSelectedId(el.id);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: ProcessElement) => {
    if (toolMode !== 'select' && toolMode !== 'connect') return;
    if (toolMode === 'connect') return;

    e.stopPropagation();
    setSelectedId(el.id);
    setIsDragging(true);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, el: ProcessElement, handle: string) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setIsResizing(true);
    setResizeHandle(handle);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (isDragging && selectedId) {
      const x = Math.max(0, e.clientX - rect.left + canvasRef.current.scrollLeft - dragOffset.x);
      const y = Math.max(0, e.clientY - rect.top + canvasRef.current.scrollTop - dragOffset.y);

      setElements(prev => prev.map(el => 
        el.id === selectedId ? { ...el, x, y } : el
      ));
    }

    if (isResizing && selectedId && resizeHandle) {
      const el = elements.find(e => e.id === selectedId);
      if (!el) return;

      const mouseX = e.clientX - rect.left + canvasRef.current.scrollLeft;
      const mouseY = e.clientY - rect.top + canvasRef.current.scrollTop;

      let newWidth = el.width;
      let newHeight = el.height;
      let newX = el.x;
      let newY = el.y;

      if (resizeHandle.includes('e')) {
        newWidth = Math.max(60, mouseX - el.x);
      }
      if (resizeHandle.includes('w')) {
        const diff = el.x - mouseX;
        newWidth = Math.max(60, el.width + diff);
        newX = mouseX;
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(40, mouseY - el.y);
      }
      if (resizeHandle.includes('n')) {
        const diff = el.y - mouseY;
        newHeight = Math.max(40, el.height + diff);
        newY = mouseY;
      }

      setElements(prev => prev.map(e => 
        e.id === selectedId ? { ...e, x: newX, y: newY, width: newWidth, height: newHeight } : e
      ));
    }
  }, [isDragging, isResizing, selectedId, dragOffset, resizeHandle, elements]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleTextChange = (id: string, text: string) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, text } : el
    ));
  };

  const handleColorChange = (id: string, color: string) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, color } : el
    ));
  };

  const handleAutoFitText = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;

    // Estimate text width (rough calculation)
    const textLength = el.text.length;
    const estimatedWidth = Math.max(80, textLength * 8 + 40);
    const lines = Math.ceil(textLength / 15);
    const estimatedHeight = Math.max(50, lines * 24 + 20);

    setElements(prev => prev.map(e => 
      e.id === id ? { ...e, width: estimatedWidth, height: estimatedHeight } : e
    ));
  };

  const handleConnectionLabelChange = (id: string, label: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, label } : conn
    ));
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;

    setElements(prev => prev.filter(el => el.id !== selectedId));
    setConnections(prev => prev.filter(conn => 
      conn.fromId !== selectedId && conn.toId !== selectedId
    ));
    setSelectedId(null);
  };

  const exportAsImage = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `${name || 'mapa-processo'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem exportada com sucesso!');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Erro ao exportar imagem');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${name || 'mapa-processo'}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const getElementCenter = (el: ProcessElement) => ({
    x: el.x + el.width / 2,
    y: el.y + el.height / 2
  });

  const renderConnection = (conn: ProcessConnection) => {
    const fromEl = elements.find(e => e.id === conn.fromId);
    const toEl = elements.find(e => e.id === conn.toId);
    if (!fromEl || !toEl) return null;

    const from = getElementCenter(fromEl);
    const to = getElementCenter(toEl);
    
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLen = 10;
    const arrowAngle = Math.PI / 6;
    
    const endX = to.x - Math.cos(angle) * (toEl.width / 2 + 5);
    const endY = to.y - Math.sin(angle) * (toEl.height / 2 + 5);
    const startX = from.x + Math.cos(angle) * (fromEl.width / 2 + 5);
    const startY = from.y + Math.sin(angle) * (fromEl.height / 2 + 5);

    const arrow1X = endX - arrowLen * Math.cos(angle - arrowAngle);
    const arrow1Y = endY - arrowLen * Math.sin(angle - arrowAngle);
    const arrow2X = endX - arrowLen * Math.cos(angle + arrowAngle);
    const arrow2Y = endY - arrowLen * Math.sin(angle + arrowAngle);

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return (
      <g key={conn.id} className="cursor-pointer" onClick={() => setSelectedId(conn.id)}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={selectedId === conn.id ? 'hsl(var(--primary))' : '#64748b'}
          strokeWidth={2}
        />
        <polygon
          points={`${endX},${endY} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
          fill={selectedId === conn.id ? 'hsl(var(--primary))' : '#64748b'}
        />
        {conn.label && (
          <foreignObject x={midX - 30} y={midY - 12} width="60" height="24">
            <div className="bg-background border border-border rounded px-1 text-xs text-center">
              {conn.label}
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  const renderElement = (el: ProcessElement) => {
    const colors = getElementColor(el);
    const isSelected = selectedId === el.id;
    const isConnecting = connectingFrom === el.id;
    const isComment = el.type === 'comment';

    return (
      <div
        key={el.id}
        className={cn(
          "absolute flex items-center justify-center text-sm cursor-move select-none transition-shadow",
          isComment ? "bg-transparent border-transparent text-gray-600 italic font-normal" : "text-white font-medium border-2",
          isSelected && "ring-2 ring-primary ring-offset-2",
          isConnecting && "ring-2 ring-amber-400",
          el.type === 'decision' && !isComment && "rotate-45"
        )}
        style={{
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          borderRadius: el.type === 'start' || el.type === 'end' ? '9999px' : 
                        el.type === 'comment' ? '4px' : '8px',
          backgroundColor: isComment ? undefined : colors.bg,
          borderColor: isComment ? undefined : colors.border,
        }}
        onClick={(e) => handleElementClick(e, el)}
        onMouseDown={(e) => handleElementMouseDown(e, el)}
      >
        <span className={cn(
          el.type === 'decision' && "-rotate-45",
          "text-center px-2 break-words overflow-hidden",
          isComment && "w-full h-full flex items-center justify-center"
        )} style={{ maxWidth: '100%' }}>
          {el.text}
        </span>

        {/* Task generation indicator */}
        {el.generates_task && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
            <ListTodo className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
        
        {/* Resize handles */}
        {isSelected && (
          <>
            <div 
              className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, el, 'se')}
            />
            <div 
              className="absolute -left-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-sw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, el, 'sw')}
            />
            <div 
              className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full cursor-ne-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, el, 'ne')}
            />
            <div 
              className="absolute -left-1 -top-1 w-3 h-3 bg-primary rounded-full cursor-nw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, el, 'nw')}
            />
          </>
        )}
      </div>
    );
  };

  const selectedElement = elements.find(e => e.id === selectedId);
  const selectedConnection = connections.find(c => c.id === selectedId);

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 h-9"
          placeholder="Nome do mapa"
        />
        
        <Select value={area} onValueChange={(v) => setArea(v as typeof area)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREAS.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  {s === 'Validado' ? <CheckCircle className="h-3 w-3" /> : <Construction className="h-3 w-3" />}
                  {s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button 
          variant={showStagesPanel ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setShowStagesPanel(!showStagesPanel)}
          className="gap-1"
        >
          <Layers className="h-4 w-4" />
          Etapas
          {stages.length > 0 && <Badge variant="secondary" className="text-[10px] px-1">{stages.length}</Badge>}
        </Button>

        <Button variant="outline" size="sm" onClick={exportAsImage} disabled={isExporting}>
          <Image className="h-4 w-4 mr-1" />
          PNG
        </Button>
        
        <Button variant="outline" size="sm" onClick={exportAsPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </Button>

        {hasChanges && (
          <Badge variant="secondary" className="animate-pulse">
            Alterações não salvas
          </Badge>
        )}

        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Tools */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-wrap">
        <span className="text-sm font-medium mr-2">Ferramentas:</span>
        
        <Button 
          variant={toolMode === 'select' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => { setToolMode('select'); setConnectingFrom(null); }}
        >
          <MousePointer className="h-4 w-4 mr-1" />
          Selecionar
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button 
          variant={toolMode === 'start' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('start')}
          className="gap-1"
        >
          <Circle className="h-4 w-4 text-green-500" />
          Início
        </Button>
        
        <Button 
          variant={toolMode === 'process' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('process')}
          className="gap-1"
        >
          <Square className="h-4 w-4 text-blue-500" />
          Processo
        </Button>
        
        <Button 
          variant={toolMode === 'decision' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('decision')}
          className="gap-1"
        >
          <Diamond className="h-4 w-4 text-amber-500" />
          Decisão
        </Button>
        
        <Button 
          variant={toolMode === 'end' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('end')}
          className="gap-1"
        >
          <Circle className="h-4 w-4 text-red-500" />
          Fim
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button 
          variant={toolMode === 'comment' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('comment')}
          className="gap-1"
        >
          <MessageSquare className="h-4 w-4 text-yellow-500" />
          Comentário
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button 
          variant={toolMode === 'connect' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setToolMode('connect')}
        >
          <Move className="h-4 w-4 mr-1" />
          Conectar
          {connectingFrom && <span className="ml-1 text-xs">(selecione destino)</span>}
        </Button>
        
        <div className="flex-1" />
        
        {selectedId && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        )}
      </div>

      {/* Properties Panel - Above Canvas */}
      {(selectedElement || selectedConnection) && (
        <div className="px-4 py-2 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">Propriedades:</span>
            
            {selectedElement && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Texto:</label>
                  {selectedElement.type === 'comment' ? (
                    <Textarea
                      value={selectedElement.text}
                      onChange={(e) => handleTextChange(selectedElement.id, e.target.value)}
                      rows={1}
                      className="w-48"
                    />
                  ) : (
                    <Input
                      value={selectedElement.text}
                      onChange={(e) => handleTextChange(selectedElement.id, e.target.value)}
                      className="w-40 h-8"
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Tipo:</label>
                  <Badge variant="secondary">
                    {selectedElement.type === 'start' ? 'Início' :
                     selectedElement.type === 'end' ? 'Fim' :
                     selectedElement.type === 'process' ? 'Processo' : 
                     selectedElement.type === 'comment' ? 'Comentário' : 'Decisão'}
                  </Badge>
                </div>

                {selectedElement.type !== 'comment' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Cor:</label>
                    <div className="flex gap-1">
                      {Object.entries(ELEMENT_COLORS).map(([key, value]) => (
                        <button
                          key={key}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all",
                            selectedElement.color === key || 
                            (!selectedElement.color && DEFAULT_COLORS[selectedElement.type] === key)
                              ? "ring-2 ring-offset-1 ring-primary scale-110"
                              : "hover:scale-105"
                          )}
                          style={{ backgroundColor: value.bg, borderColor: value.border }}
                          onClick={() => handleColorChange(selectedElement.id, key)}
                          title={value.label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Tamanho:</label>
                  <Input
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) => setElements(prev => prev.map(el => 
                      el.id === selectedElement.id ? { ...el, width: parseInt(e.target.value) || 60 } : el
                    ))}
                    min={60}
                    className="w-16 h-8"
                    placeholder="L"
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    value={selectedElement.height}
                    onChange={(e) => setElements(prev => prev.map(el => 
                      el.id === selectedElement.id ? { ...el, height: parseInt(e.target.value) || 40 } : el
                    ))}
                    min={40}
                    className="w-16 h-8"
                    placeholder="A"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAutoFitText(selectedElement.id)}
                  >
                    Ajustar ao texto
                  </Button>
                </div>
              </>
            )}

            {selectedConnection && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rótulo da Seta:</label>
                <Input
                  value={selectedConnection.label || ''}
                  onChange={(e) => handleConnectionLabelChange(selectedConnection.id, e.target.value)}
                  placeholder="Ex: Sim, Não"
                  className="w-32 h-8"
                />
              </div>
            )}
          </div>

          {/* Task Config for process elements */}
          {selectedElement?.type === 'process' && (
            <div className="mt-2">
              <ProcessTaskConfigPanel
                element={selectedElement}
                stages={stages}
                onUpdate={(id, updates) => {
                  setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stages Panel */}
      {showStagesPanel && (
        <div className="px-4 py-3 border-b bg-muted/10">
          <ProcessStagesEditor stages={stages} onChange={setStages} />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto">
        <div 
          ref={canvasRef}
          className="bg-white relative"
          style={{ 
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            minWidth: 1200,
            minHeight: 800
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1200, minHeight: 800 }}>
            <g className="pointer-events-auto">
              {connections.map(renderConnection)}
            </g>
          </svg>

          {elements.map(renderElement)}
        </div>
      </div>
    </div>
  );
};

export default ProcessMapEditor;
