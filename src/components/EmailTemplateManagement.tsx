import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, 
  Send, 
  Eye, 
  Edit, 
  Search, 
  Shield, 
  CreditCard, 
  Plane, 
  XCircle,
  Clock,
  Code,
  Save,
  RefreshCw,
  CheckCircle,
  Instagram,
  MessageCircle,
  Globe,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoHorizontal from '@/assets/logo-horizontal.png';

interface EmailVariable {
  key: string;
  label: string;
  example: string;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  category: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  variables: EmailVariable[];
  is_active: boolean;
  last_sent_at: string | null;
  send_count: number;
  created_at: string;
  updated_at: string;
  trigger_event: string | null;
  trigger_description: string | null;
}

// Mapeamento de trigger_event para descrições amigáveis
const TRIGGER_EVENTS: Record<string, { label: string; color: string }> = {
  'payment_approved': { label: 'Pagamento Aprovado', color: 'bg-green-100 text-green-700' },
  'payment_pending_pix': { label: 'PIX Aguardando', color: 'bg-amber-100 text-amber-700' },
  'payment_rejected': { label: 'Pagamento Recusado', color: 'bg-red-100 text-red-700' },
  'account_created': { label: 'Conta Criada', color: 'bg-blue-100 text-blue-700' },
  'password_reset_requested': { label: 'Reset de Senha', color: 'bg-purple-100 text-purple-700' },
  'admin_2fa_login': { label: 'Login Admin 2FA', color: 'bg-indigo-100 text-indigo-700' },
  'reservation_cancelled': { label: 'Reserva Cancelada', color: 'bg-gray-100 text-gray-700' },
  'tour_cancelled': { label: 'Passeio Cancelado', color: 'bg-red-100 text-red-700' },
  'refund_full': { label: 'Reembolso Total', color: 'bg-orange-100 text-orange-700' },
  'refund_partial': { label: 'Reembolso Parcial', color: 'bg-orange-100 text-orange-700' },
  'whatsapp_group_created': { label: 'Grupo WhatsApp (Manual)', color: 'bg-emerald-100 text-emerald-700' },
  'trip_reminder_7days': { label: 'Lembrete 7 dias (Automático)', color: 'bg-sky-100 text-sky-700' },
  'trip_reminder_1day': { label: 'Lembrete Véspera (Automático)', color: 'bg-sky-100 text-sky-700' },
  'trip_info_sent': { label: 'Info Viagem (Manual)', color: 'bg-teal-100 text-teal-700' },
};

const CATEGORIES = [
  { key: 'all', label: 'Todos', icon: Mail },
  { key: 'account_security', label: 'Conta e Segurança', icon: Shield },
  { key: 'reservation_payment', label: 'Reserva e Pagamento', icon: CreditCard },
  { key: 'trip_logistics', label: 'Viagem e Logística', icon: Plane },
  { key: 'cancellation_refund', label: 'Cancelamento e Reembolso', icon: XCircle },
];

export function EmailTemplateManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      const parsed = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : JSON.parse(t.variables as string || '[]')
      }));
      
      setTemplates(parsed);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.template_key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));

      toast({
        title: template.is_active ? 'Template desativado' : 'Template ativado',
        description: template.name
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editingTemplate.subject,
          body_html: editingTemplate.body_html
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      ));

      toast({
        title: 'Template salvo',
        description: editingTemplate.name
      });
      setEditingTemplate(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!previewTemplate || !testEmailAddress) return;
    
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email-template', {
        body: {
          template_key: previewTemplate.template_key,
          email: testEmailAddress
        }
      });

      if (error) throw error;

      toast({
        title: 'E-mail de teste enviado',
        description: `Enviado para ${testEmailAddress}`
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar teste',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.key === category);
    return cat?.icon || Mail;
  };

  const renderPreviewHtml = (html: string, variables: EmailVariable[]) => {
    let preview = html;
    variables.forEach(v => {
      preview = preview.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example);
    });
    return preview;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-4">
            <img 
              src={logoHorizontal} 
              alt="Camaleão Ecoturismo" 
              className="h-12 w-auto object-contain"
            />
            <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
              <h2 className="text-xl font-semibold text-foreground">
                Central de Comunicações
              </h2>
              <p className="text-sm text-muted-foreground">
                Gerenciamento de templates de e-mail
              </p>
            </div>
          </div>

          {/* Right: Contact Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <a 
              href="https://instagram.com/camaleaoecoturismo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              <span>@camaleaoecoturismo</span>
            </a>
            <a 
              href="https://wa.me/5582993649454" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>+55 82 99364-9454</span>
            </a>
            <a 
              href="https://www.camaleaoecoturismo.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>camaleaoecoturismo.com.br</span>
            </a>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium text-foreground">{templates.length}</span>
              <span className="text-sm text-muted-foreground">templates cadastrados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-foreground">{templates.filter(t => t.is_active).length}</span>
              <span className="text-sm text-muted-foreground">ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-sm font-medium text-foreground">{templates.filter(t => !t.is_active).length}</span>
              <span className="text-sm text-muted-foreground">inativos</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {templates.reduce((acc, t) => acc + t.send_count, 0).toLocaleString('pt-BR')}
              </span>
              <span className="text-sm text-muted-foreground">e-mails enviados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, descrição ou chave do template..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-background"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-lg h-auto flex-wrap gap-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = cat.key === 'all' 
              ? templates.length 
              : templates.filter(t => t.category === cat.key).length;
            return (
              <TabsTrigger 
                key={cat.key} 
                value={cat.key}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{cat.label}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Nenhum template encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros ou pesquisa para visualizar os templates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map(template => {
                const CategoryIcon = getCategoryIcon(template.category);
                return (
                  <div 
                    key={template.id} 
                    className={`group bg-background border rounded-lg p-5 hover:shadow-md transition-all ${
                      !template.is_active ? 'opacity-60 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Icon and Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                          template.is_active 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <CategoryIcon className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">
                              {template.name}
                            </h3>
                            <code className="text-xs px-2 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                              {template.template_key}
                            </code>
                            {!template.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Desativado
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                            {template.description}
                          </p>
                          
                          {/* Trigger Event Badge */}
                          {template.trigger_event && (
                            <div className="mb-3">
                              <div className="inline-flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${TRIGGER_EVENTS[template.trigger_event]?.color || 'bg-gray-100 text-gray-700'}`}>
                                  ⚡ {TRIGGER_EVENTS[template.trigger_event]?.label || template.trigger_event}
                                </span>
                                {template.trigger_description && (
                                  <span className="text-xs text-muted-foreground italic">
                                    {template.trigger_description}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Code className="h-3.5 w-3.5" />
                              {template.variables.length} variáveis dinâmicas
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5" />
                              {template.send_count.toLocaleString('pt-BR')} envios realizados
                            </span>
                            {template.last_sent_at && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Último: {format(new Date(template.last_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 shrink-0 pl-16 lg:pl-0">
                        <div className="flex items-center gap-2 pr-3 border-r">
                          <span className="text-xs text-muted-foreground">
                            {template.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewTemplate(template)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Prévia
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  Editar Template de E-mail
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingTemplate?.name}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-6 pt-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assunto do E-mail</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    subject: e.target.value
                  })}
                  placeholder="Insira o assunto do e-mail..."
                  className="h-11"
                />
              </div>

              {/* Variables Reference */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Variáveis Disponíveis</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Clique em uma variável para copiá-la para a área de transferência.
                </p>
                <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg border">
                  {editingTemplate.variables.map(v => (
                    <button 
                      key={v.key}
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v.key}}}`);
                        toast({ title: 'Copiado!', description: `{{${v.key}}}` });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border rounded-md text-sm hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                      <Code className="h-3 w-3 text-primary" />
                      <span className="font-mono text-xs">{`{{${v.key}}}`}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body HTML - Código */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Corpo do E-mail (HTML)</Label>
                  <span className="text-xs text-muted-foreground">
                    Editor de código expandido para melhor edição
                  </span>
                </div>
                <div className="relative border rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 bg-muted/90 rounded text-xs text-muted-foreground">
                    <Code className="h-3 w-3" />
                    HTML
                  </div>
                  <textarea
                    value={editingTemplate.body_html}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      body_html: e.target.value
                    })}
                    style={{ 
                      backgroundColor: '#1e1e2e', 
                      color: '#cdd6f4',
                      caretColor: '#f5e0dc'
                    }}
                    className="w-full min-h-[500px] p-4 pt-10 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 border-0"
                    placeholder="Insira o HTML do corpo do e-mail..."
                    spellCheck={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Use as variáveis acima no formato {"{{variavel}}"} para inserir dados dinâmicos.
                </p>
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Prévia em Tempo Real</Label>
                  <span className="text-xs text-muted-foreground">
                    Os valores de exemplo são aplicados automaticamente
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
                  <iframe
                    srcDoc={renderPreviewHtml(editingTemplate.body_html, editingTemplate.variables)}
                    className="w-full h-[450px]"
                    title="Preview"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setEditingTemplate(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  Prévia do Template
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {previewTemplate?.name}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-6 pt-4">
              {/* Subject Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Assunto</Label>
                <p className="text-base font-medium bg-muted/50 px-4 py-3 rounded-lg">
                  {previewTemplate.variables.reduce((acc, v) => 
                    acc.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example), 
                    previewTemplate.subject
                  )}
                </p>
              </div>

              {/* Variables */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Mapeamento de Variáveis</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {previewTemplate.variables.map(v => (
                    <div key={v.key} className="flex items-center gap-3 text-sm px-3 py-2 bg-muted/30 rounded-lg border">
                      <code className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">
                        {`{{${v.key}}}`}
                      </code>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground font-medium">{v.example}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Corpo do E-mail</Label>
                <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
                  <iframe
                    srcDoc={renderPreviewHtml(previewTemplate.body_html, previewTemplate.variables)}
                    className="w-full h-[400px]"
                    title="Preview"
                  />
                </div>
              </div>

              {/* Send Test */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-5 border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Enviar E-mail de Teste</h4>
                    <p className="text-sm text-muted-foreground">
                      Verifique como o e-mail aparecerá na caixa de entrada do destinatário.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Digite o e-mail de destino para teste..."
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 h-11 bg-background"
                  />
                  <Button 
                    onClick={handleSendTestEmail}
                    disabled={!testEmailAddress || sendingTest}
                    className="h-11 px-6"
                  >
                    {sendingTest ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar Teste
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  O e-mail será enviado com os valores de exemplo das variáveis dinâmicas.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
