import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  Settings,
  Layers,
  MapPin,
  Image,
  ExternalLink,
} from 'lucide-react';
import { LandingPage } from '@/hooks/useLandingPages';
import { BlocksEditor } from './BlocksEditor';
import { RegionsEditor } from './RegionsEditor';
import { ToursSelector } from './ToursSelector';

interface LandingPageEditorProps {
  page: LandingPage;
  onBack: () => void;
  onUpdate: (updates: Partial<LandingPage>) => Promise<void>;
}

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({
  page,
  onBack,
  onUpdate,
}) => {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [metaDescription, setMetaDescription] = useState(page.meta_description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        title,
        slug,
        meta_description: metaDescription || null,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        is_published: !page.is_published,
        published_at: !page.is_published ? new Date().toISOString() : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{page.title}</h1>
              {page.is_published ? (
                <Badge variant="default" className="bg-green-500">Publicada</Badge>
              ) : (
                <Badge variant="secondary">Rascunho</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">/{page.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Visualizar
            </a>
          </Button>
          <Button
            variant={page.is_published ? "outline" : "default"}
            onClick={handleTogglePublish}
            disabled={isSaving}
          >
            {page.is_published ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Despublicar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publicar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="blocks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="blocks" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Blocos</span>
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Regiões</span>
          </TabsTrigger>
          <TabsTrigger value="tours" className="gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Passeios</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        {/* Blocks Tab */}
        <TabsContent value="blocks">
          <BlocksEditor pageId={page.id} />
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions">
          <RegionsEditor pageId={page.id} />
        </TabsContent>

        {/* Tours Tab */}
        <TabsContent value="tours">
          <ToursSelector pageId={page.id} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Página</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título da Página</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-slug">URL (slug)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">/</span>
                    <Input
                      id="edit-slug"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-meta">Descrição (SEO)</Label>
                <Textarea
                  id="edit-meta"
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Breve descrição para motores de busca..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {metaDescription.length}/160 caracteres recomendados
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving || !hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
