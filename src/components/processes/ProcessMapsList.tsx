import React, { useState } from 'react';
import { ProcessMap, AREAS, STATUSES } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, GitBranch, Edit, Trash2, Clock, CheckCircle, Construction } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessMapsListProps {
  maps: ProcessMap[];
  loading: boolean;
  onCreateMap: (name: string, area: ProcessMap['area']) => Promise<ProcessMap | null>;
  onSelectMap: (map: ProcessMap) => void;
  onDeleteMap: (id: string) => Promise<boolean>;
}

const areaColors: Record<string, string> = {
  'Estratégia': 'bg-purple-500/10 text-purple-700 border-purple-300',
  'Operação': 'bg-blue-500/10 text-blue-700 border-blue-300',
  'Marketing': 'bg-green-500/10 text-green-700 border-green-300',
  'Financeiro': 'bg-amber-500/10 text-amber-700 border-amber-300',
};

export const ProcessMapsList: React.FC<ProcessMapsListProps> = ({
  maps,
  loading,
  onCreateMap,
  onSelectMap,
  onDeleteMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState<ProcessMap['area']>('Operação');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<ProcessMap | null>(null);

  const filteredMaps = maps.filter(map => {
    const matchesSearch = map.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || map.area === filterArea;
    const matchesStatus = filterStatus === 'all' || map.status === filterStatus;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await onCreateMap(newName.trim(), newArea);
    if (result) {
      setCreateDialogOpen(false);
      setNewName('');
      setNewArea('Operação');
      onSelectMap(result);
    }
  };

  const handleDeleteConfirm = async () => {
    if (mapToDelete) {
      await onDeleteMap(mapToDelete.id);
      setDeleteDialogOpen(false);
      setMapToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Mapas de Processos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize e organize os processos da empresa
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Mapa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mapa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {AREAS.map(area => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Maps Grid */}
      {filteredMaps.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum mapa encontrado</p>
            <p className="text-sm">Crie um novo mapa para começar</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaps.map(map => (
            <Card 
              key={map.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onSelectMap(map)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                      {map.name}
                    </h3>
                    <Badge variant="outline" className={`mt-1 ${areaColors[map.area] || ''}`}>
                      {map.area}
                    </Badge>
                  </div>
                  <Badge 
                    variant={map.status === 'Validado' ? 'default' : 'secondary'}
                    className="flex items-center gap-1 ml-2"
                  >
                    {map.status === 'Validado' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Construction className="h-3 w-3" />
                    )}
                    {map.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="h-3 w-3" />
                  Atualizado em {format(new Date(map.updated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {map.elements.length} elementos • {map.connections.length} conexões
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMap(map);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMapToDelete(map);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Mapa de Processo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Processo</label>
              <Input
                placeholder="Ex: Fluxo de Vendas"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Área da Empresa</label>
              <Select value={newArea} onValueChange={(v) => setNewArea(v as ProcessMap['area'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Criar Mapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o mapa "{mapToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProcessMapsList;
