import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  MessageCircle, 
  ExternalLink,
  Link,
  Phone,
  Save,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupportTopic {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  action_type: 'whatsapp' | 'link';
  whatsapp_message: string | null;
  redirect_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface TopicFormData {
  title: string;
  description: string;
  icon: string;
  action_type: 'whatsapp' | 'link';
  whatsapp_message: string;
  redirect_url: string;
  is_active: boolean;
}

const defaultFormData: TopicFormData = {
  title: '',
  description: '',
  icon: 'MessageCircle',
  action_type: 'whatsapp',
  whatsapp_message: '',
  redirect_url: '',
  is_active: true,
};

const iconOptions = [
  { value: 'MessageCircle', label: 'Mensagem' },
  { value: 'Phone', label: 'Telefone' },
  { value: 'HelpCircle', label: 'Ajuda' },
  { value: 'Calendar', label: 'Calendário' },
  { value: 'CreditCard', label: 'Pagamento' },
  { value: 'MapPin', label: 'Localização' },
  { value: 'Info', label: 'Informação' },
  { value: 'Star', label: 'Destaque' },
  { value: 'Gift', label: 'Presente' },
  { value: 'Users', label: 'Grupo' },
];

export function SupportTopicsManagement() {
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<SupportTopic | null>(null);
  const [formData, setFormData] = useState<TopicFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_topics')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTopics((data || []) as SupportTopic[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tópicos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (topic?: SupportTopic) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        title: topic.title,
        description: topic.description || '',
        icon: topic.icon,
        action_type: topic.action_type,
        whatsapp_message: topic.whatsapp_message || '',
        redirect_url: topic.redirect_url || '',
        is_active: topic.is_active,
      });
    } else {
      setEditingTopic(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTopic(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe um título para o tópico.",
        variant: "destructive"
      });
      return;
    }

    if (formData.action_type === 'whatsapp' && !formData.whatsapp_message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, informe a mensagem para o WhatsApp.",
        variant: "destructive"
      });
      return;
    }

    if (formData.action_type === 'link' && !formData.redirect_url.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, informe a URL de redirecionamento.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const topicData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        icon: formData.icon,
        action_type: formData.action_type,
        whatsapp_message: formData.action_type === 'whatsapp' ? formData.whatsapp_message.trim() : null,
        redirect_url: formData.action_type === 'link' ? formData.redirect_url.trim() : null,
        is_active: formData.is_active,
      };

      if (editingTopic) {
        const { error } = await supabase
          .from('support_topics')
          .update(topicData)
          .eq('id', editingTopic.id);
        if (error) throw error;
        toast({ title: "Tópico atualizado com sucesso!" });
      } else {
        const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_index)) : -1;
        const { error } = await supabase
          .from('support_topics')
          .insert({ ...topicData, order_index: maxOrder + 1 });
        if (error) throw error;
        toast({ title: "Tópico criado com sucesso!" });
      }

      handleCloseModal();
      fetchTopics();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (topic: SupportTopic) => {
    if (!confirm(`Tem certeza que deseja excluir o tópico "${topic.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('support_topics')
        .delete()
        .eq('id', topic.id);

      if (error) throw error;
      toast({ title: "Tópico excluído com sucesso!" });
      fetchTopics();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (topic: SupportTopic) => {
    try {
      const { error } = await supabase
        .from('support_topics')
        .update({ is_active: !topic.is_active })
        .eq('id', topic.id);

      if (error) throw error;
      fetchTopics();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === topics.length - 1)
    ) return;

    const newTopics = [...topics];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the items
    [newTopics[index], newTopics[swapIndex]] = [newTopics[swapIndex], newTopics[index]];
    
    // Update order_index for both items
    try {
      await Promise.all([
        supabase
          .from('support_topics')
          .update({ order_index: index })
          .eq('id', newTopics[index].id),
        supabase
          .from('support_topics')
          .update({ order_index: swapIndex })
          .eq('id', newTopics[swapIndex].id),
      ]);
      
      setTopics(newTopics.map((t, i) => ({ ...t, order_index: i })));
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Tópicos de Atendimento
              </CardTitle>
              <CardDescription>
                Configure os temas do menu de atendimento no botão flutuante de WhatsApp
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tópico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum tópico cadastrado</p>
              <p className="text-sm mt-2">
                Quando não há tópicos ativos, o botão abrirá o WhatsApp diretamente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic, index) => (
                <div
                  key={topic.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    topic.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === topics.length - 1}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{topic.title}</h4>
                      <Badge variant={topic.action_type === 'whatsapp' ? 'default' : 'secondary'}>
                        {topic.action_type === 'whatsapp' ? (
                          <><Phone className="h-3 w-3 mr-1" /> WhatsApp</>
                        ) : (
                          <><Link className="h-3 w-3 mr-1" /> Link</>
                        )}
                      </Badge>
                      {!topic.is_active && (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </div>
                    {topic.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {topic.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={topic.is_active}
                      onCheckedChange={() => handleToggleActive(topic)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(topic)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(topic)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de criação/edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'Editar Tópico' : 'Novo Tópico de Atendimento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Dúvidas sobre pagamento"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Breve descrição do tópico"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Ação *</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value: 'whatsapp' | 'link') => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      WhatsApp com mensagem
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Redirecionar para link
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.action_type === 'whatsapp' ? (
              <div className="space-y-2">
                <Label htmlFor="whatsapp_message">Mensagem para WhatsApp *</Label>
                <Textarea
                  id="whatsapp_message"
                  placeholder="Olá! Gostaria de saber mais sobre..."
                  value={formData.whatsapp_message}
                  onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será pré-preenchida no WhatsApp
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="redirect_url">URL de Redirecionamento *</Label>
                <Input
                  id="redirect_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
