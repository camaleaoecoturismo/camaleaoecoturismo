import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bus, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TourTransportConfigProps {
  tourId: string;
  onConfigChange?: () => void;
}

interface Vehicle {
  id: string;
  name: string;
  total_capacity: number;
  rows_count: number;
  seats_per_row: number;
}

interface TransportConfig {
  id: string;
  tour_id: string;
  vehicle_id: string;
  seat_selection_enabled: boolean;
  auto_assign_seats: boolean;
  transport_vehicles?: Vehicle;
}

export const TourTransportConfig: React.FC<TourTransportConfigProps> = ({
  tourId,
  onConfigChange
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [config, setConfig] = useState<TransportConfig | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [seatSelectionEnabled, setSeatSelectionEnabled] = useState(false);
  const [autoAssignSeats, setAutoAssignSeats] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [tourId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('transport_vehicles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Fetch existing config
      const { data: configData, error: configError } = await supabase
        .from('tour_transport_config')
        .select('*, transport_vehicles(*)')
        .eq('tour_id', tourId)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') throw configError;

      if (configData) {
        setConfig(configData);
        setSelectedVehicleId(configData.vehicle_id);
        setSeatSelectionEnabled(configData.seat_selection_enabled);
        setAutoAssignSeats(configData.auto_assign_seats);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar configuração', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVehicleId) {
      toast({ title: 'Selecione um veículo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (config) {
        // Update existing
        const { error } = await supabase
          .from('tour_transport_config')
          .update({
            vehicle_id: selectedVehicleId,
            seat_selection_enabled: seatSelectionEnabled,
            auto_assign_seats: autoAssignSeats
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tour_transport_config')
          .insert({
            tour_id: tourId,
            vehicle_id: selectedVehicleId,
            seat_selection_enabled: seatSelectionEnabled,
            auto_assign_seats: autoAssignSeats
          });

        if (error) throw error;
      }

      toast({ title: 'Configuração salva com sucesso!' });
      fetchData();
      onConfigChange?.();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveConfig = async () => {
    if (!config) return;
    if (!confirm('Tem certeza que deseja remover a configuração de transporte? Isso removerá todas as alocações de assentos.')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tour_transport_config')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      setConfig(null);
      setSelectedVehicleId('');
      setSeatSelectionEnabled(false);
      setAutoAssignSeats(true);
      toast({ title: 'Configuração removida!' });
      onConfigChange?.();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bus className="h-5 w-5" />
          Configuração de Transporte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicles.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum veículo cadastrado.</p>
            <p className="text-sm">Acesse Configurações &gt; Transporte para criar veículos.</p>
          </div>
        ) : (
          <>
            {/* Vehicle Selection */}
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        {vehicle.name} - {vehicle.total_capacity} lugares
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Vehicle Info */}
            {selectedVehicle && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>{selectedVehicle.name}</strong></p>
                <p className="text-muted-foreground">
                  {selectedVehicle.total_capacity} lugares • {selectedVehicle.rows_count} fileiras × {selectedVehicle.seats_per_row} assentos
                </p>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar seleção de assentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes poderão escolher suas poltronas após o pagamento
                  </p>
                </div>
                <Switch
                  checked={seatSelectionEnabled}
                  onCheckedChange={setSeatSelectionEnabled}
                />
              </div>

              {seatSelectionEnabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                  <div>
                    <Label>Alocação automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Alocar automaticamente se cliente não escolher
                    </p>
                  </div>
                  <Switch
                    checked={autoAssignSeats}
                    onCheckedChange={setAutoAssignSeats}
                  />
                </div>
              )}
            </div>

            {/* Current Status */}
            {config && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                  <Check className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
                {config.seat_selection_enabled && (
                  <Badge variant="secondary">Seleção de assentos ativa</Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !selectedVehicleId}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {config ? 'Atualizar' : 'Salvar'}
              </Button>
              {config && (
                <Button variant="outline" onClick={handleRemoveConfig} disabled={saving}>
                  Remover Configuração
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TourTransportConfig;
