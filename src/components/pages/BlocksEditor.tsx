import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  GripVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Type,
  Image,
  Layout,
  Star,
  MessageSquare,
  List,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useLandingPageBlocks, LandingPageBlock } from '@/hooks/useLandingPages';
import { BlockEditorModal } from './BlockEditorModal';
import { Json } from '@/integrations/supabase/types';
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

const BLOCK_TYPES = [
  { id: 'hero', label: 'Hero Banner', icon: Layout, description: 'Seção de destaque com imagem de fundo' },
  { id: 'text', label: 'Texto', icon: Type, description: 'Bloco de texto com título e conteúdo' },
  { id: 'gallery', label: 'Galeria', icon: Image, description: 'Grid de imagens' },
  { id: 'features', label: 'Diferenciais', icon: Star, description: 'Lista de benefícios e diferenciais' },
  { id: 'testimonials', label: 'Depoimentos', icon: MessageSquare, description: 'Carrossel de depoimentos' },
  { id: 'faq', label: 'FAQ', icon: List, description: 'Perguntas frequentes em acordeão' },
  { id: 'cta', label: 'CTA', icon: Layout, description: 'Chamada para ação' },
];

interface BlocksEditorProps {
  pageId: string;
}

export const BlocksEditor: React.FC<BlocksEditorProps> = ({ pageId }) => {
  const { blocks, loading, createBlock, updateBlock, deleteBlock, reorderBlocks } = useLandingPageBlocks(pageId);
  const [editingBlock, setEditingBlock] = useState<LandingPageBlock | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<LandingPageBlock | null>(null);

  const handleAddBlock = async (type: string) => {
    const newBlock = await createBlock({
      block_type: type,
      order_index: blocks.length,
      is_visible: true,
      content: {} as Json,
    });
    setIsCreateOpen(false);
    if (newBlock) {
      setEditingBlock(newBlock);
    }
  };

  const handleMoveBlock = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    await reorderBlocks(newBlocks);
  };

  const toggleVisibility = async (block: LandingPageBlock) => {
    await updateBlock(block.id, { is_visible: !block.is_visible });
  };

  const getBlockIcon = (type: string) => {
    const blockType = BLOCK_TYPES.find(b => b.id === type);
    return blockType ? blockType.icon : Layout;
  };

  const getBlockLabel = (type: string) => {
    const blockType = BLOCK_TYPES.find(b => b.id === type);
    return blockType ? blockType.label : type;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Blocos da Página</h2>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar ou clique para editar
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Bloco
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layout className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum bloco adicionado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione blocos para construir sua página
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Bloco
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const BlockIcon = getBlockIcon(block.block_type);
            return (
              <Card 
                key={block.id} 
                className={`transition-opacity ${!block.is_visible ? 'opacity-50' : ''}`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveBlock(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveBlock(index, 'down')}
                      disabled={index === blocks.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="p-2 rounded-lg bg-muted">
                    <BlockIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getBlockLabel(block.block_type)}
                      </span>
                      {!block.is_visible && (
                        <Badge variant="secondary">Oculto</Badge>
                      )}
                    </div>
                    {block.title && (
                      <p className="text-sm text-muted-foreground truncate">
                        {block.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(block)}
                    >
                      {block.is_visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingBlock(block)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setBlockToDelete(block)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Block Dialog */}
      {isCreateOpen && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Escolha o Tipo de Bloco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {BLOCK_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 text-left"
                  onClick={() => handleAddBlock(type.id)}
                >
                  <type.icon className="h-6 w-6" />
                  <span className="font-medium">{type.label}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {type.description}
                  </span>
                </Button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Block Modal */}
      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={async (updates) => {
            await updateBlock(editingBlock.id, updates);
            setEditingBlock(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!blockToDelete} onOpenChange={() => setBlockToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloco? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (blockToDelete) {
                  deleteBlock(blockToDelete.id);
                  setBlockToDelete(null);
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
