import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Trash2, Edit, X, Check, Clock } from "lucide-react";

interface TourBoardingPoint {
  id: string;
  nome: string;
  endereco: string | null;
  horario: string | null;
  order_index: number;
}

interface TourBoardingPointsManagerProps {
  tourId: string;
  tourName: string;
}

export function TourBoardingPointsManager({
  tourId,
  tourName
}: TourBoardingPointsManagerProps) {
  const [boardingPoints, setBoardingPoints] = useState<TourBoardingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState({
    nome: '',
    endereco: '',
    horario: ''
  });
  const [editingPoint, setEditingPoint] = useState({
    nome: '',
    endereco: '',
    horario: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (tourId) {
      fetchBoardingPoints();
    }
  }, [tourId]);

  const fetchBoardingPoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tour_boarding_points')
        .select('*')
        .eq('tour_id', tourId)
        .order('order_index');

      if (error) throw error;
      setBoardingPoints(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pontos de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addBoardingPoint = async () => {
    if (!newPoint.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o ponto de embarque.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const maxOrder = Math.max(...boardingPoints.map(p => p.order_index), -1);
      
      const { data, error } = await supabase
        .from('tour_boarding_points')
        .insert({
          tour_id: tourId,
          nome: newPoint.nome.trim(),
          endereco: newPoint.endereco.trim() || null,
          horario: newPoint.horario.trim() || null,
          order_index: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      setBoardingPoints(prev => [...prev, data]);
      setNewPoint({ nome: '', endereco: '', horario: '' });
      
      toast({
        title: "Ponto de embarque adicionado!",
        description: `${data.nome} foi adicionado com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar ponto de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateBoardingPoint = async (pointId: string) => {
    if (!editingPoint.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o ponto de embarque.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tour_boarding_points')
        .update({
          nome: editingPoint.nome.trim(),
          endereco: editingPoint.endereco.trim() || null,
          horario: editingPoint.horario.trim() || null
        })
        .eq('id', pointId)
        .select()
        .single();

      if (error) throw error;

      setBoardingPoints(prev => 
        prev.map(point => point.id === pointId ? data : point)
      );
      setEditingId(null);
      
      toast({
        title: "Ponto de embarque atualizado!",
        description: `${data.nome} foi atualizado com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ponto de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteBoardingPoint = async (pointId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tour_boarding_points')
        .delete()
        .eq('id', pointId);

      if (error) throw error;

      setBoardingPoints(prev => prev.filter(point => point.id !== pointId));
      
      toast({
        title: "Ponto de embarque removido!",
        description: "O ponto foi removido com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover ponto de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (point: TourBoardingPoint) => {
    setEditingId(point.id);
    setEditingPoint({
      nome: point.nome,
      endereco: point.endereco || '',
      horario: point.horario || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingPoint({ nome: '', endereco: '', horario: '' });
  };

  // Extract time from name pattern like "06h00 - Nome" or "06H00 - Nome"
  const extractTimeFromName = (name: string): string | null => {
    const timePatterns = [
      /^(\d{2}[hH]\d{2})/,           // "06h00" or "06H00" at start
      /^(\d{2}:\d{2})/,              // "06:00" at start
      /^(\d{1,2}[hH]\d{2})/,         // "6h00" at start
    ];
    
    for (const pattern of timePatterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Auto-extract times from all points that don't have horario set
  const autoExtractTimes = async () => {
    const pointsToUpdate = boardingPoints.filter(p => !p.horario);
    if (pointsToUpdate.length === 0) {
      toast({
        title: "Nenhum ponto para atualizar",
        description: "Todos os pontos já têm horário definido."
      });
      return;
    }

    setSaving(true);
    let updated = 0;
    
    try {
      for (const point of pointsToUpdate) {
        const extractedTime = extractTimeFromName(point.nome);
        if (extractedTime) {
          const { error } = await supabase
            .from('tour_boarding_points')
            .update({ horario: extractedTime })
            .eq('id', point.id);
          
          if (!error) {
            updated++;
          }
        }
      }
      
      if (updated > 0) {
        await fetchBoardingPoints();
        toast({
          title: `${updated} horário(s) extraído(s)!`,
          description: "Os horários foram preenchidos automaticamente."
        });
      } else {
        toast({
          title: "Nenhum horário encontrado",
          description: "Não foi possível extrair horários dos nomes dos pontos.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao extrair horários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Carregando pontos de embarque...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pontos de Embarque - {tourName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie os pontos de embarque específicos deste tour. Cada tour tem seus próprios pontos independentes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new point form */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3">Adicionar Novo Ponto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="new-nome">Nome do Ponto *</Label>
                <Input
                  id="new-nome"
                  placeholder="ex: Centro de Maceió, Shopping..."
                  value={newPoint.nome}
                  onChange={e => setNewPoint(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-endereco">Endereço (opcional)</Label>
                <Input
                  id="new-endereco"
                  placeholder="Endereço completo"
                  value={newPoint.endereco}
                  onChange={e => setNewPoint(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-horario">Horário (opcional)</Label>
                <Input
                  id="new-horario"
                  placeholder="ex: 05h00"
                  value={newPoint.horario}
                  onChange={e => setNewPoint(prev => ({ ...prev, horario: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={addBoardingPoint} disabled={saving} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>

          {/* Existing points list */}
          {boardingPoints.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum ponto de embarque configurado para este tour.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Pontos Configurados ({boardingPoints.length})</h4>
                {boardingPoints.some(p => !p.horario) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={autoExtractTimes}
                    disabled={saving}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Extrair Horários dos Nomes
                  </Button>
                )}
              </div>
              {boardingPoints.map((point, index) => (
                <div key={point.id} className="p-4 border rounded-lg">
                  {editingId === point.id ? (
                    // Editing mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Nome do Ponto *</Label>
                          <Input
                            value={editingPoint.nome}
                            onChange={e => setEditingPoint(prev => ({ ...prev, nome: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Endereço (opcional)</Label>
                          <Input
                            value={editingPoint.endereco}
                            onChange={e => setEditingPoint(prev => ({ ...prev, endereco: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Horário (opcional)</Label>
                          <Input
                            value={editingPoint.horario}
                            placeholder="ex: 05h00"
                            onChange={e => setEditingPoint(prev => ({ ...prev, horario: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => updateBoardingPoint(point.id)} disabled={saving}>
                          <Check className="h-4 w-4 mr-1" />
                          {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <h5 className="font-medium">{point.nome}</h5>
                          {point.horario && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {point.horario}
                            </span>
                          )}
                        </div>
                        {point.endereco && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {point.endereco}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(point)}
                          disabled={saving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBoardingPoint(point.id)}
                          disabled={saving}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
