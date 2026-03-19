import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LandingPageBlock } from '@/hooks/useLandingPages';
import { Json } from '@/integrations/supabase/types';
import { MediaUploader } from './MediaUploader';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface BlockEditorModalProps {
  block: LandingPageBlock;
  onClose: () => void;
  onSave: (updates: { title?: string | null; subtitle?: string | null; content?: Json; is_visible?: boolean }) => Promise<void>;
}

export const BlockEditorModal: React.FC<BlockEditorModalProps> = ({
  block,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(block.title || '');
  const [subtitle, setSubtitle] = useState(block.subtitle || '');
  const initialContent = typeof block.content === 'object' && block.content !== null && !Array.isArray(block.content)
    ? block.content as Record<string, unknown>
    : {};
  const [content, setContent] = useState<Record<string, unknown>>(initialContent);
  const [isVisible, setIsVisible] = useState(block.is_visible);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title: title || null,
        subtitle: subtitle || null,
        content: content as Json,
        is_visible: isVisible,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateContent = (key: string, value: unknown) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const getContentValue = (key: string, defaultValue: unknown = '') => {
    return content[key] ?? defaultValue;
  };

  const getContentArray = (key: string): string[] => {
    const value = content[key];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  };

  const renderContentFields = () => {
    switch (block.block_type) {
      case 'hero':
        return (
          <>
            <div className="space-y-2">
              <Label>Imagem de Fundo (URL)</Label>
              <Input
                value={String(getContentValue('backgroundImage', ''))}
                onChange={(e) => updateContent('backgroundImage', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do Botão Principal</Label>
              <Input
                value={String(getContentValue('ctaText', ''))}
                onChange={(e) => updateContent('ctaText', e.target.value)}
                placeholder="Ver roteiros"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Botão</Label>
              <Input
                value={String(getContentValue('ctaLink', ''))}
                onChange={(e) => updateContent('ctaLink', e.target.value)}
                placeholder="#roteiros"
              />
            </div>
          </>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={String(getContentValue('body', ''))}
              onChange={(e) => updateContent('body', e.target.value)}
              placeholder="Digite o texto do bloco..."
              rows={6}
            />
          </div>
        );

      case 'gallery':
        const mediaItems: MediaItem[] = getContentArray('media').length > 0
          ? (content.media as MediaItem[])
          : getContentArray('images').map(url => ({ url, type: 'image' as const }));

        return (
          <div className="space-y-2">
            <Label>Fotos e Vídeos</Label>
            <MediaUploader
              items={mediaItems}
              onChange={(items) => updateContent('media', items)}
              pageId={block.page_id}
            />
          </div>
        );

      case 'features':
        return (
          <div className="space-y-2">
            <Label>Diferenciais (JSON)</Label>
            <Textarea
              value={JSON.stringify(getContentValue('features', []), null, 2)}
              onChange={(e) => {
                try {
                  updateContent('features', JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='[{"icon": "star", "title": "Título", "description": "Descrição"}]'
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Array de objetos com: icon, title, description
            </p>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-2">
            <Label>Depoimentos (JSON)</Label>
            <Textarea
              value={JSON.stringify(getContentValue('testimonials', []), null, 2)}
              onChange={(e) => {
                try {
                  updateContent('testimonials', JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='[{"name": "Nome", "text": "Depoimento", "image": "url"}]'
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Array de objetos com: name, text, image (opcional)
            </p>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-2">
            <Label>Perguntas Frequentes (JSON)</Label>
            <Textarea
              value={JSON.stringify(getContentValue('questions', []), null, 2)}
              onChange={(e) => {
                try {
                  updateContent('questions', JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='[{"question": "Pergunta?", "answer": "Resposta..."}]'
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Array de objetos com: question, answer
            </p>
          </div>
        );

      case 'cta':
        return (
          <>
            <div className="space-y-2">
              <Label>Cor de Fundo</Label>
              <Input
                type="color"
                value={String(getContentValue('backgroundColor', '#22c55e'))}
                onChange={(e) => updateContent('backgroundColor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do Botão</Label>
              <Input
                value={String(getContentValue('buttonText', ''))}
                onChange={(e) => updateContent('buttonText', e.target.value)}
                placeholder="Quero reservar"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Botão</Label>
              <Input
                value={String(getContentValue('buttonLink', ''))}
                onChange={(e) => updateContent('buttonLink', e.target.value)}
                placeholder="#reservar"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Bloco: {block.block_type.charAt(0).toUpperCase() + block.block_type.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="visibility">Bloco visível</Label>
            <Switch
              id="visibility"
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-title">Título</Label>
            <Input
              id="block-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do bloco"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-subtitle">Subtítulo</Label>
            <Input
              id="block-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtítulo opcional"
            />
          </div>

          {renderContentFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
