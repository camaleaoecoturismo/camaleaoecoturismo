import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Save, Eye } from 'lucide-react';

interface BoardingExportTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  header_template: string;
  boarding_point_template: string;
  participant_template: string;
}

export const BoardingExportTemplateModal = ({ open, onClose }: BoardingExportTemplateModalProps) => {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplate();
    }
  }, [open]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boarding_export_templates')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o template.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('boarding_export_templates')
        .update({
          header_template: template.header_template,
          boarding_point_template: template.boarding_point_template,
          participant_template: template.participant_template,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Template salvo com sucesso!'
      });
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = () => {
    if (!template) return '';

    let preview = template.header_template;

    // Example boarding point 1
    const bp1 = template.boarding_point_template
      .replace('{{nome}}', 'Posto Stella Maris + GNV')
      .replace('{{horario}}', '05h00')
      .replace('{{endereco}}', 'Ao lado do McDonald\'s');
    preview += '\n\n' + bp1;
    preview += '\n\n' + template.participant_template.replace('{{nome}}', 'João Silva');
    preview += '\n' + template.participant_template.replace('{{nome}}', 'Maria Santos');

    // Example boarding point 2
    const bp2 = template.boarding_point_template
      .replace('{{nome}}', 'Shopping Recife')
      .replace('{{horario}}', '05h30')
      .replace('{{endereco}}', 'Entrada principal');
    preview += '\n\n' + bp2;
    preview += '\n\n' + template.participant_template.replace('{{nome}}', 'Pedro Oliveira');

    return preview;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Template de Embarques</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Cabeçalho</Label>
              <p className="text-xs text-muted-foreground mb-2">Texto inicial do documento</p>
              <Textarea
                value={template?.header_template || ''}
                onChange={(e) => setTemplate(t => t ? { ...t, header_template: e.target.value } : null)}
                rows={2}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Template do Ponto de Embarque</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Variáveis: {'{{nome}}'}, {'{{horario}}'}, {'{{endereco}}'}
              </p>
              <Textarea
                value={template?.boarding_point_template || ''}
                onChange={(e) => setTemplate(t => t ? { ...t, boarding_point_template: e.target.value } : null)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Template do Participante</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Variáveis: {'{{nome}}'}
              </p>
              <Textarea
                value={template?.participant_template || ''}
                onChange={(e) => setTemplate(t => t ? { ...t, participant_template: e.target.value } : null)}
                rows={2}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <Label className="text-sm font-medium">Preview</Label>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 min-h-[300px] whitespace-pre-wrap font-sans text-sm border">
              {generatePreview()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
