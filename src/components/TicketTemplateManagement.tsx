import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, Eye, Upload, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketPreview } from "./TicketPreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "./RichTextEditor";

interface TicketTemplate {
  id: string;
  tour_id: string | null;
  is_default: boolean;
  name: string;
  cover_image_url: string | null;
  logo_url: string | null;
  background_color: string;
  text_color: string;
  accent_color: string;
  title_text: string;
  subtitle_text: string;
  rules_text: string;
  footer_text: string;
  show_qr_label: boolean;
  qr_label_text: string;
  // New fields
  website_text: string;
  phone_text: string;
  instagram_text: string;
  price_label: string;
  passenger_label: string;
  boarding_label: string;
  ticket_number_label: string;
  attention_title: string;
  attention_items: string;
  divider_color: string;
  header_gradient_start: string;
  header_gradient_end: string;
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
}

const defaultTemplate: Omit<TicketTemplate, 'id'> = {
  tour_id: null,
  is_default: false,
  name: 'Novo Template',
  cover_image_url: null,
  logo_url: null,
  background_color: '#7C12D1',
  text_color: '#FFFFFF',
  accent_color: '#FFD700',
  title_text: '{{nome_passeio}}',
  subtitle_text: 'Ingresso Individual',
  rules_text: '',
  footer_text: 'Este ingresso é pessoal e intransferível.',
  show_qr_label: true,
  qr_label_text: 'Apresente este QR Code no embarque',
  // New defaults
  website_text: 'camaleaoecoturismo.com.br',
  phone_text: '(82) 99364-9454',
  instagram_text: '@camaleaoecoturismo',
  price_label: 'Tipo de ingresso',
  passenger_label: 'Passageiro',
  boarding_label: 'Embarque',
  ticket_number_label: 'Nº do ingresso',
  attention_title: 'ATENÇÃO:',
  attention_items: `<ul><li>Chegue com 15 minutos de antecedência ao ponto de embarque</li><li>Tolerância máxima de 10 minutos para saída do ônibus</li><li>Não nos responsabilizamos por atrasos</li><li>Leve documento com foto</li><li>Use roupas e calçados confortáveis</li><li>Leve protetor solar e repelente</li><li>Não é permitido o consumo de bebidas alcoólicas durante o trajeto</li></ul>`,
  divider_color: '#F59E0B',
  header_gradient_start: '#7C12D1',
  header_gradient_end: '#6309A8'
};

export function TicketTemplateManagement() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, toursRes] = await Promise.all([
        supabase.from('ticket_templates').select('*').order('is_default', { ascending: false }),
        supabase.from('tours').select('id, name, start_date').order('start_date', { ascending: false })
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (toursRes.error) throw toursRes.error;

      // Merge with defaults for any missing fields
      const templatesWithDefaults = (templatesRes.data || []).map(t => ({
        ...defaultTemplate,
        ...t
      })) as TicketTemplate[];

      setTemplates(templatesWithDefaults);
      setTours(toursRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    setSaving(true);
    try {
      if (editingTemplate.id) {
        const { error } = await supabase
          .from('ticket_templates')
          .update({
            ...editingTemplate,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado com sucesso!');
      } else {
        const { id, ...templateData } = editingTemplate;
        const { error } = await supabase
          .from('ticket_templates')
          .insert([templateData]);
        if (error) throw error;
        toast.success('Template criado com sucesso!');
      }
      
      setIsDialogOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar template: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      const { error } = await supabase.from('ticket_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Template excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir template: ' + error.message);
    }
  };

  const handleImageUpload = async (file: File, field: 'cover_image_url' | 'logo_url') => {
    if (!editingTemplate) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `ticket-templates/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tour-images')
        .getPublicUrl(filePath);

      setEditingTemplate({ ...editingTemplate, [field]: publicUrl });
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao enviar imagem: ' + error.message);
    }
  };

  const startEditing = (template?: TicketTemplate) => {
    setEditingTemplate(template || { ...defaultTemplate, id: '' } as TicketTemplate);
    setIsDialogOpen(true);
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
          <h2 className="text-xl font-semibold">Templates de Ticket</h2>
          <p className="text-sm text-muted-foreground">
            Configure os templates de ingresso para cada passeio
          </p>
        </div>
        <Button onClick={() => startEditing()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Padrão
                    </span>
                  )}
                  {template.tour_id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {tours.find(t => t.id === template.tour_id)?.name || 'Passeio específico'}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.cover_image_url && (
                <img 
                  src={template.cover_image_url} 
                  alt="Capa" 
                  className="w-full h-24 object-cover rounded-md"
                />
              )}
              <div 
                className="h-8 rounded-md flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: template.header_gradient_start || template.background_color, color: template.text_color }}
              >
                Prévia das cores
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => startEditing(template)}
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowPreview(true);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {!template.is_default && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Form with Tabs */}
              <div className="space-y-4">
                <Tabs defaultValue="geral" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="geral">Geral</TabsTrigger>
                    <TabsTrigger value="cores">Cores</TabsTrigger>
                    <TabsTrigger value="textos">Textos</TabsTrigger>
                    <TabsTrigger value="rodape">Rodapé</TabsTrigger>
                  </TabsList>

                  {/* Tab: Geral */}
                  <TabsContent value="geral" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Nome do Template</Label>
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Passeio Específico (opcional)</Label>
                      <Select
                        value={editingTemplate.tour_id || 'none'}
                        onValueChange={(value) => setEditingTemplate({ 
                          ...editingTemplate, 
                          tour_id: value === 'none' ? null : value 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um passeio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (usar como genérico)</SelectItem>
                          {tours.map((tour) => (
                            <SelectItem key={tour.id} value={tour.id}>
                              {tour.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Imagem de Capa (opcional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={editingTemplate.cover_image_url || ''}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, cover_image_url: e.target.value })}
                          placeholder="URL da imagem ou faça upload"
                        />
                        <label className="cursor-pointer">
                          <Button variant="outline" size="icon" asChild>
                            <span><Upload className="h-4 w-4" /></span>
                          </Button>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, 'cover_image_url');
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se não definir, será usada a imagem do passeio automaticamente
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Logo (opcional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={editingTemplate.logo_url || ''}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, logo_url: e.target.value })}
                          placeholder="URL do logo"
                        />
                        <label className="cursor-pointer">
                          <Button variant="outline" size="icon" asChild>
                            <span><Upload className="h-4 w-4" /></span>
                          </Button>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, 'logo_url');
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se não definir, será usado o logo padrão do Camaleão
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Template Padrão</Label>
                      <Switch
                        checked={editingTemplate.is_default}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_default: checked })}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Cores */}
                  <TabsContent value="cores" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cor Início do Gradiente</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={editingTemplate.header_gradient_start}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, header_gradient_start: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={editingTemplate.header_gradient_start}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, header_gradient_start: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor Fim do Gradiente</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={editingTemplate.header_gradient_end}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, header_gradient_end: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={editingTemplate.header_gradient_end}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, header_gradient_end: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cor do Texto</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={editingTemplate.text_color}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, text_color: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={editingTemplate.text_color}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, text_color: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor de Destaque</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={editingTemplate.accent_color}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, accent_color: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={editingTemplate.accent_color}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, accent_color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor da Linha Divisória</Label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={editingTemplate.divider_color}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, divider_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={editingTemplate.divider_color}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, divider_color: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Preview das cores */}
                    <div className="p-4 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-2">Prévia do cabeçalho:</p>
                      <div 
                        className="h-16 rounded-md flex items-center justify-center text-sm font-medium"
                        style={{ 
                          background: `linear-gradient(135deg, ${editingTemplate.header_gradient_start} 0%, ${editingTemplate.header_gradient_end} 100%)`,
                          color: editingTemplate.text_color 
                        }}
                      >
                        Prévia do Gradiente
                      </div>
                      <div 
                        className="h-1 mt-2 rounded"
                        style={{ backgroundColor: editingTemplate.divider_color }}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Textos */}
                  <TabsContent value="textos" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Label "Tipo de ingresso"</Label>
                        <Input
                          value={editingTemplate.price_label}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, price_label: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label "Passageiro"</Label>
                        <Input
                          value={editingTemplate.passenger_label}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, passenger_label: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Label "Embarque"</Label>
                        <Input
                          value={editingTemplate.boarding_label}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, boarding_label: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label "Nº do ingresso"</Label>
                        <Input
                          value={editingTemplate.ticket_number_label}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, ticket_number_label: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Título da Seção de Avisos</Label>
                      <Input
                        value={editingTemplate.attention_title}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, attention_title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Itens de Atenção</Label>
                      <RichTextEditor
                        value={editingTemplate.attention_items}
                        onChange={(value) => setEditingTemplate({ ...editingTemplate, attention_items: value })}
                        placeholder="Adicione os avisos importantes aqui..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Regras Adicionais (opcional)</Label>
                      <RichTextEditor
                        value={editingTemplate.rules_text}
                        onChange={(value) => setEditingTemplate({ ...editingTemplate, rules_text: value })}
                        placeholder="Regras específicas do passeio..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Mostrar Legenda do QR Code</Label>
                      <Switch
                        checked={editingTemplate.show_qr_label}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, show_qr_label: checked })}
                      />
                    </div>

                    {editingTemplate.show_qr_label && (
                      <div className="space-y-2">
                        <Label>Texto da Legenda do QR Code</Label>
                        <Input
                          value={editingTemplate.qr_label_text}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, qr_label_text: e.target.value })}
                        />
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Rodapé */}
                  <TabsContent value="rodape" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={editingTemplate.website_text}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, website_text: e.target.value })}
                        placeholder="camaleaoecoturismo.com.br"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={editingTemplate.phone_text}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, phone_text: e.target.value })}
                        placeholder="(82) 99364-9454"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input
                        value={editingTemplate.instagram_text}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, instagram_text: e.target.value })}
                        placeholder="@camaleaoecoturismo"
                      />
                    </div>

                    {/* Preview do rodapé */}
                    <div className="p-4 rounded-lg border bg-slate-50">
                      <p className="text-xs text-muted-foreground mb-2">Prévia do rodapé:</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500">{editingTemplate.website_text}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[10px] text-slate-500">{editingTemplate.phone_text}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[10px] text-slate-500">{editingTemplate.instagram_text}</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Template
                  </Button>
                </div>
              </div>

              {/* Right Column - Live Preview */}
              <div className="border rounded-lg p-4 bg-slate-100">
                <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                  Prévia do Ticket
                </p>
                <div className="transform scale-90 origin-top">
                  <TicketPreview template={editingTemplate} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prévia do Ticket</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TicketPreview template={editingTemplate} fullSize />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}