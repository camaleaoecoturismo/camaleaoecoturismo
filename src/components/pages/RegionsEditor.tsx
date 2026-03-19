import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from 'lucide-react';
import { useLandingPageRegions, LandingPageRegion } from '@/hooks/useLandingPages';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RegionsEditorProps {
  pageId: string;
}

export const RegionsEditor: React.FC<RegionsEditorProps> = ({ pageId }) => {
  const { regions, loading, createRegion, updateRegion, deleteRegion } = useLandingPageRegions(pageId);
  const [editingRegion, setEditingRegion] = useState<LandingPageRegion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<LandingPageRegion | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  // Form state for new region
  const [newRegion, setNewRegion] = useState({
    name: '',
    subtitle: '',
    description: '',
    image_url: '',
    color: '#22c55e',
    tour_filter_tag: '',
  });

  const handleCreateRegion = async () => {
    await createRegion({
      name: newRegion.name,
      subtitle: newRegion.subtitle || null,
      description: newRegion.description || null,
      image_url: newRegion.image_url || null,
      color: newRegion.color,
      tour_filter_tag: newRegion.tour_filter_tag || null,
      order_index: regions.length,
    });
    setNewRegion({
      name: '',
      subtitle: '',
      description: '',
      image_url: '',
      color: '#22c55e',
      tour_filter_tag: '',
    });
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Regiões / Roteiros</h2>
          <p className="text-sm text-muted-foreground">
            Configure as regiões ou roteiros destacados na página
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Região
        </Button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Nova Região
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Região *</Label>
                <Input
                  value={newRegion.name}
                  onChange={(e) => setNewRegion(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Lençóis"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={newRegion.subtitle}
                  onChange={(e) => setNewRegion(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ex: A Capital do Diamante"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newRegion.description}
                onChange={(e) => setNewRegion(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da região..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newRegion.color}
                    onChange={(e) => setNewRegion(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={newRegion.color}
                    onChange={(e) => setNewRegion(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#22c55e"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem (URL)</Label>
                <Input
                  value={newRegion.image_url}
                  onChange={(e) => setNewRegion(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tag de Filtro</Label>
                <Input
                  value={newRegion.tour_filter_tag}
                  onChange={(e) => setNewRegion(prev => ({ ...prev, tour_filter_tag: e.target.value }))}
                  placeholder="lencois"
                />
                <p className="text-xs text-muted-foreground">
                  Filtra tours que contenham esta tag no nome
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRegion} disabled={!newRegion.name.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Criar Região
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regions List */}
      {regions.length === 0 && !isCreating ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma região configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione regiões para destacar diferentes roteiros
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Região
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {regions.map((region) => (
            <Collapsible 
              key={region.id}
              open={expandedRegion === region.id}
              onOpenChange={(open) => setExpandedRegion(open ? region.id : null)}
            >
              <Card>
                <CardContent className="py-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: region.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{region.name}</span>
                          {region.tour_filter_tag && (
                            <Badge variant="outline" className="text-xs">
                              tag: {region.tour_filter_tag}
                            </Badge>
                          )}
                        </div>
                        {region.subtitle && (
                          <p className="text-sm text-muted-foreground">
                            {region.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegionToDelete(region);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {expandedRegion === region.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pt-4 mt-4 border-t space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={region.name}
                          onChange={(e) => updateRegion(region.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtítulo</Label>
                        <Input
                          value={region.subtitle || ''}
                          onChange={(e) => updateRegion(region.id, { subtitle: e.target.value || null })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={region.description || ''}
                        onChange={(e) => updateRegion(region.id, { description: e.target.value || null })}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={region.color}
                            onChange={(e) => updateRegion(region.id, { color: e.target.value })}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={region.color}
                            onChange={(e) => updateRegion(region.id, { color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Imagem (URL)</Label>
                        <Input
                          value={region.image_url || ''}
                          onChange={(e) => updateRegion(region.id, { image_url: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tag de Filtro</Label>
                        <Input
                          value={region.tour_filter_tag || ''}
                          onChange={(e) => updateRegion(region.id, { tour_filter_tag: e.target.value || null })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Atrativos (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(region.attractions || [], null, 2)}
                        onChange={(e) => {
                          try {
                            updateRegion(region.id, { attractions: JSON.parse(e.target.value) });
                          } catch {
                            // Invalid JSON
                          }
                        }}
                        placeholder='[{"nome": "Morro do Pai Inácio", "dificuldade": "Fácil"}]'
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>O que Inclui (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(region.includes || [], null, 2)}
                        onChange={(e) => {
                          try {
                            updateRegion(region.id, { includes: JSON.parse(e.target.value) });
                          } catch {
                            // Invalid JSON
                          }
                        }}
                        placeholder='["Transporte ida e volta", "Guia local"]'
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!regionToDelete} onOpenChange={() => setRegionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir região?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a região "{regionToDelete?.name}"? 
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (regionToDelete) {
                  deleteRegion(regionToDelete.id);
                  setRegionToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
