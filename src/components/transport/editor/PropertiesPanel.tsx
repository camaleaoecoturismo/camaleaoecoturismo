import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CanvasElement } from './SeatMapCanvas';

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
  totalSeats: number;
  availableSeats: number;
  blockedSeats: number;
  crewSeats: number;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  totalSeats,
  availableSeats,
  blockedSeats,
  crewSeats
}) => {
  if (!selectedElement) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resumo do Mapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de Poltronas</span>
              <Badge variant="outline" className="font-mono">{totalSeats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Disponíveis</span>
              <Badge className="bg-green-500 font-mono">{availableSeats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bloqueadas</span>
              <Badge variant="secondary" className="font-mono">{blockedSeats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Equipe</span>
              <Badge className="bg-amber-500 font-mono">{crewSeats}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500" />
              <span className="text-xs">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-400" />
              <span className="text-xs">Bloqueado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-500" />
              <span className="text-xs">Equipe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500" />
              <span className="text-xs">Motorista</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500" />
              <span className="text-xs">Porta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-violet-500" />
              <span className="text-xs">Banheiro</span>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center py-4">
          Selecione um elemento para editar suas propriedades
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Propriedades
          <Badge variant="outline" className="text-xs">
            {selectedElement.type === 'seat' ? 'Poltrona' :
             selectedElement.type === 'rect' ? 'Retângulo' :
             selectedElement.type === 'circle' ? 'Círculo' :
             selectedElement.type === 'text' ? 'Texto' :
             selectedElement.type === 'driver' ? 'Motorista' :
             selectedElement.type === 'door' ? 'Porta' :
             selectedElement.type === 'wc' ? 'Banheiro' : 'Elemento'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Posição X</Label>
            <Input
              type="number"
              value={Math.round(selectedElement.left)}
              onChange={e => onUpdateElement({ left: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Posição Y</Label>
            <Input
              type="number"
              value={Math.round(selectedElement.top)}
              onChange={e => onUpdateElement({ top: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <Label className="text-xs">Rotação (graus)</Label>
          <Input
            type="number"
            value={selectedElement.angle || 0}
            onChange={e => onUpdateElement({ angle: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>

        {/* Seat-specific properties */}
        {selectedElement.type === 'seat' && (
          <>
            <div>
              <Label className="text-xs">Número da Poltrona</Label>
              <Input
                value={selectedElement.seatNumber || ''}
                onChange={e => onUpdateElement({ seatNumber: e.target.value })}
                placeholder="Ex: 01, 02A, etc."
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Status Padrão</Label>
              <Select
                value={selectedElement.seatStatus || 'available'}
                onValueChange={v => onUpdateElement({ seatStatus: v as any })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="crew">Reservado para Equipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Text-specific properties */}
        {selectedElement.type === 'text' && (
          <div>
            <Label className="text-xs">Texto</Label>
            <Input
              value={selectedElement.text || ''}
              onChange={e => onUpdateElement({ text: e.target.value })}
              className="h-8"
            />
          </div>
        )}

        {/* Size for rect/circle */}
        {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
          <div className="grid grid-cols-2 gap-2">
            {selectedElement.type === 'rect' ? (
              <>
                <div>
                  <Label className="text-xs">Largura</Label>
                  <Input
                    type="number"
                    value={selectedElement.width || 100}
                    onChange={e => onUpdateElement({ width: parseInt(e.target.value) || 100 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Altura</Label>
                  <Input
                    type="number"
                    value={selectedElement.height || 50}
                    onChange={e => onUpdateElement({ height: parseInt(e.target.value) || 50 })}
                    className="h-8"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <Label className="text-xs">Raio</Label>
                <Input
                  type="number"
                  value={selectedElement.radius || 25}
                  onChange={e => onUpdateElement({ radius: parseInt(e.target.value) || 25 })}
                  className="h-8"
                />
              </div>
            )}
          </div>
        )}

        {/* Color */}
        {(selectedElement.type === 'rect' || selectedElement.type === 'circle' || selectedElement.type === 'text') && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cor de Preenchimento</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedElement.fill || '#e2e8f0'}
                  onChange={e => onUpdateElement({ fill: e.target.value })}
                  className="h-8 w-12 p-1 cursor-pointer"
                />
                <Input
                  value={selectedElement.fill || '#e2e8f0'}
                  onChange={e => onUpdateElement({ fill: e.target.value })}
                  className="h-8 flex-1"
                />
              </div>
            </div>
            {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
              <div>
                <Label className="text-xs">Cor da Borda</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedElement.stroke || '#94a3b8'}
                    onChange={e => onUpdateElement({ stroke: e.target.value })}
                    className="h-8 w-12 p-1 cursor-pointer"
                  />
                  <Input
                    value={selectedElement.stroke || '#94a3b8'}
                    onChange={e => onUpdateElement({ stroke: e.target.value })}
                    className="h-8 flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertiesPanel;
