import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tour } from "@/hooks/useTours";
import RichTextEditor from "./RichTextEditor";

interface BulkTourEditorProps {
  tours: Tour[];
  onBack: () => void;
  onSaveSuccess: () => void;
}

interface TourEdit extends Tour {
  hasChanges?: boolean;
}

const BulkTourEditor: React.FC<BulkTourEditorProps> = ({ tours, onBack, onSaveSuccess }) => {
  console.log('BulkTourEditor renderizado com', tours.length, 'tours');
  const [editableTours, setEditableTours] = useState<TourEdit[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('Configurando tours editáveis');
    setEditableTours(tours.map(tour => ({ ...tour, hasChanges: false })));
  }, [tours]);

  const updateTour = (tourId: string, field: keyof Tour, value: any) => {
    setEditableTours(prev => prev.map(tour => 
      tour.id === tourId 
        ? { ...tour, [field]: value, hasChanges: true }
        : tour
    ));
  };

  const saveAllChanges = async () => {
    try {
      setSaving(true);
      const toursToUpdate = editableTours.filter(tour => tour.hasChanges);
      
      if (toursToUpdate.length === 0) {
        toast({
          title: "Nenhuma alteração",
          description: "Não há alterações para salvar.",
          variant: "default"
        });
        return;
      }

      // Atualizar todos os tours em paralelo
      const updatePromises = toursToUpdate.map(tour => {
        const { hasChanges, pricing_options, ...tourData } = tour;
        return supabase
          .from('tours')
          .update(tourData)
          .eq('id', tour.id);
      });

      const results = await Promise.all(updatePromises);
      
      // Verificar se alguma atualização falhou
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Falha ao atualizar ${errors.length} passeio(s)`);
      }

      toast({
        title: "Sucesso!",
        description: `${toursToUpdate.length} passeio(s) atualizado(s) com sucesso.`,
      });

      // Marcar todos como salvos
      setEditableTours(prev => prev.map(tour => ({ ...tour, hasChanges: false })));
      onSaveSuccess();
      
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasAnyChanges = editableTours.some(tour => tour.hasChanges);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Edição em Massa dos Passeios</h2>
            <p className="text-muted-foreground">
              Edite múltiplos passeios simultaneamente
            </p>
          </div>
        </div>
        
        <Button 
          onClick={saveAllChanges} 
          disabled={!hasAnyChanges || saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Todas as Alterações
        </Button>
      </div>

      {/* Tabela Editável */}
      <Card>
        <CardHeader>
          <CardTitle>Passeios ({editableTours.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[150px]">Cidade</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[120px]">Data Início</TableHead>
                  <TableHead className="min-w-[120px]">Data Fim</TableHead>
                  <TableHead className="min-w-[100px]">Mês</TableHead>
                  <TableHead className="min-w-[200px]">URL da Imagem</TableHead>
                  <TableHead className="min-w-[400px]">Sobre</TableHead>
                  <TableHead className="min-w-[400px]">Roteiro</TableHead>
                  <TableHead className="min-w-[300px]">Incluso</TableHead>
                  <TableHead className="min-w-[300px]">Não Incluso</TableHead>
                  <TableHead className="min-w-[300px]">O que Levar</TableHead>
                  <TableHead className="min-w-[300px]">Política</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableTours.map((tour) => (
                  <TableRow key={tour.id} className={tour.hasChanges ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Input
                        value={tour.name}
                        onChange={(e) => updateTour(tour.id, 'name', e.target.value)}
                        className="min-w-[180px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        value={tour.city}
                        onChange={(e) => updateTour(tour.id, 'city', e.target.value)}
                        className="min-w-[130px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        value={tour.state}
                        onChange={(e) => updateTour(tour.id, 'state', e.target.value)}
                        className="min-w-[80px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        type="date"
                        value={tour.start_date}
                        onChange={(e) => updateTour(tour.id, 'start_date', e.target.value)}
                        className="min-w-[120px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        type="date"
                        value={tour.end_date || ''}
                        onChange={(e) => updateTour(tour.id, 'end_date', e.target.value || null)}
                        className="min-w-[120px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        value={tour.month}
                        onChange={(e) => updateTour(tour.id, 'month', e.target.value)}
                        className="min-w-[80px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        value={tour.image_url || ''}
                        onChange={(e) => updateTour(tour.id, 'image_url', e.target.value || null)}
                        placeholder="URL da imagem"
                        className="min-w-[180px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[380px]">
                        <RichTextEditor
                          value={tour.about || ''}
                          onChange={(value) => updateTour(tour.id, 'about', value)}
                          label=""
                          placeholder="Descrição sobre o passeio..."
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[380px]">
                        <RichTextEditor
                          value={tour.itinerary || ''}
                          onChange={(value) => updateTour(tour.id, 'itinerary', value)}
                          label=""
                          placeholder="Roteiro do passeio..."
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[280px]">
                        <RichTextEditor
                          value={tour.includes || ''}
                          onChange={(value) => updateTour(tour.id, 'includes', value)}
                          label=""
                          placeholder="O que está incluso..."
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[280px]">
                        <RichTextEditor
                          value={tour.not_includes || ''}
                          onChange={(value) => updateTour(tour.id, 'not_includes', value)}
                          label=""
                          placeholder="O que não está incluso..."
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[280px]">
                        <RichTextEditor
                          value={tour.what_to_bring || ''}
                          onChange={(value) => updateTour(tour.id, 'what_to_bring', value)}
                          label=""
                          placeholder="O que levar..."
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="min-w-[280px]">
                        <RichTextEditor
                          value={tour.policy || ''}
                          onChange={(value) => updateTour(tour.id, 'policy', value)}
                          label=""
                          placeholder="Política de cancelamento..."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé com informações */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total de passeios: {editableTours.length} | 
              Com alterações: {editableTours.filter(t => t.hasChanges).length}
            </div>
            
            {hasAnyChanges && (
              <div className="text-sm text-amber-600 font-medium">
                ⚠️ Há alterações não salvas
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkTourEditor;