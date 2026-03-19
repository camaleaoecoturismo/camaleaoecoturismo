import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Bus, Eye, Loader2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SeatMapEditor } from './editor/SeatMapEditor';
import { SeatMapCanvas, CanvasElement } from './editor/SeatMapCanvas';

interface Vehicle {
  id: string;
  name: string;
  description: string | null;
  total_capacity: number;
  rows_count: number;
  seats_per_row: number;
  aisle_position: number;
  is_active: boolean;
  layout_json: string | null;
}

export const TransportVehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_vehicles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar veículos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setEditorOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditorOpen(true);
  };

  const handlePreview = (vehicle: Vehicle) => {
    setPreviewVehicle(vehicle);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;

    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Veículo excluído!' });
      fetchVehicles();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .update({ is_active: !vehicle.is_active })
        .eq('id', vehicle.id);

      if (error) throw error;
      fetchVehicles();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const parseLayoutElements = (layoutJson: string | null): CanvasElement[] => {
    if (!layoutJson) return [];
    try {
      return JSON.parse(layoutJson);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Veículos de Transporte</h2>
          <p className="text-muted-foreground">Crie e gerencie mapas de assentos com o editor visual</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Veículo
        </Button>
      </div>

      {/* Vehicles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map(vehicle => {
          const elements = parseLayoutElements(vehicle.layout_json);
          const seatCount = elements.filter(e => e.type === 'seat').length;
          
          return (
            <Card key={vehicle.id} className={!vehicle.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                  </div>
                  <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                    {vehicle.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p><strong>Capacidade:</strong> {seatCount || vehicle.total_capacity} lugares</p>
                  {vehicle.layout_json ? (
                    <Badge variant="outline" className="text-xs">
                      Editor Visual
                    </Badge>
                  ) : (
                    <p><strong>Layout:</strong> {vehicle.rows_count} fileiras × {vehicle.seats_per_row} assentos</p>
                  )}
                  {vehicle.description && <p className="text-xs">{vehicle.description}</p>}
                </div>
                
                {/* Mini Preview */}
                {vehicle.layout_json && elements.length > 0 && (
                  <div className="mb-4 p-2 bg-muted/50 rounded-lg overflow-hidden">
                    <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-hidden">
                      {elements.filter(e => e.type === 'seat').slice(0, 20).map(seat => (
                        <div
                          key={seat.id}
                          className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold text-white ${
                            seat.seatStatus === 'blocked' ? 'bg-slate-400' :
                            seat.seatStatus === 'crew' ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                        >
                          {seat.seatNumber?.slice(-1)}
                        </div>
                      ))}
                      {elements.filter(e => e.type === 'seat').length > 20 && (
                        <div className="w-4 h-4 bg-muted-foreground/20 rounded flex items-center justify-center text-[8px]">
                          +{elements.filter(e => e.type === 'seat').length - 20}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handlePreview(vehicle)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Mapa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(vehicle)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(vehicle)}>
                    {vehicle.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(vehicle.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum veículo cadastrado</p>
            <Button onClick={handleCreate} variant="link">Criar primeiro veículo</Button>
          </div>
        )}
      </div>

      {/* Visual Editor */}
      {editorOpen && (
        <SeatMapEditor
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={fetchVehicles}
          vehicleId={editingVehicle?.id}
          vehicleName={editingVehicle?.name}
          initialLayout={editingVehicle?.layout_json || undefined}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewVehicle} onOpenChange={() => setPreviewVehicle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              {previewVehicle?.name}
              <Badge variant="outline">{previewVehicle?.total_capacity} lugares</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {previewVehicle && previewVehicle.layout_json ? (
            <div className="border rounded-lg overflow-hidden">
              <SeatMapCanvas
                elements={parseLayoutElements(previewVehicle.layout_json)}
                onElementsChange={() => {}}
                onSelectionChange={() => {}}
                zoom={100}
                gridEnabled={false}
              />
            </div>
          ) : previewVehicle ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Este veículo não possui um layout visual definido.</p>
              <Button variant="link" onClick={() => {
                setPreviewVehicle(null);
                handleEdit(previewVehicle);
              }}>
                Criar layout no editor visual
              </Button>
            </div>
          ) : null}

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500" />
              <span className="text-sm">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-400" />
              <span className="text-sm">Bloqueado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-500" />
              <span className="text-sm">Equipe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500" />
              <span className="text-sm">Motorista</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500" />
              <span className="text-sm">Porta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-violet-500" />
              <span className="text-sm">Banheiro</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransportVehicleManagement;
