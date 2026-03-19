import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, FileText, Eye, Ban, Upload, Image, Trash2, FileUp, ExternalLink } from "lucide-react";
import RichTextEditor from './RichTextEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import DOMPurify from 'dompurify';

export function ReservationPolicyManagement() {
  const [termsPolicy, setTermsPolicy] = useState('');
  const [termsPdfUrl, setTermsPdfUrl] = useState<string | null>(null);
  const [termsDisplayMode, setTermsDisplayMode] = useState<'text' | 'pdf'>('text');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [cancellationImageUrl, setCancellationImageUrl] = useState<string | null>(null);
  const [cancellationDisplayMode, setCancellationDisplayMode] = useState<'text' | 'image'>('text');
  const [loading, setLoading] = useState(true);
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingCancellation, setSavingCancellation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showTermsPreview, setShowTermsPreview] = useState(false);
  const [showCancellationPreview, setShowCancellationPreview] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'reservation_policy', 
          'cancellation_policy', 
          'cancellation_policy_image', 
          'cancellation_display_mode',
          'terms_pdf_url',
          'terms_display_mode'
        ]);

      if (error) throw error;
      
      data?.forEach(item => {
        if (item.setting_key === 'reservation_policy') {
          setTermsPolicy(item.setting_value || '');
        } else if (item.setting_key === 'terms_pdf_url') {
          setTermsPdfUrl(item.setting_value || null);
        } else if (item.setting_key === 'terms_display_mode') {
          setTermsDisplayMode((item.setting_value as 'text' | 'pdf') || 'text');
        } else if (item.setting_key === 'cancellation_policy') {
          setCancellationPolicy(item.setting_value || '');
        } else if (item.setting_key === 'cancellation_policy_image') {
          setCancellationImageUrl(item.setting_value || null);
        } else if (item.setting_key === 'cancellation_display_mode') {
          setCancellationDisplayMode((item.setting_value as 'text' | 'image') || 'text');
        }
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: "Erro ao carregar políticas",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerms = async () => {
    try {
      setSavingTerms(true);
      
      await upsertSetting('reservation_policy', termsPolicy);
      await upsertSetting('terms_display_mode', termsDisplayMode);
      if (termsPdfUrl) {
        await upsertSetting('terms_pdf_url', termsPdfUrl);
      }

      toast({
        title: "Termos salvos com sucesso!",
        description: "As alterações serão refletidas no formulário de reservas."
      });
    } catch (error) {
      console.error('Error saving terms:', error);
      toast({
        title: "Erro ao salvar termos",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setSavingTerms(false);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('setting_key', key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('site_settings')
        .insert({ 
          setting_key: key,
          setting_value: value
        });
      if (error) throw error;
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O PDF deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingPdf(true);

      const fileName = `terms-conditions-${Date.now()}.pdf`;
      const filePath = `policies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-config')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('site-config')
        .getPublicUrl(filePath);

      setTermsPdfUrl(urlData.publicUrl);
      setTermsDisplayMode('pdf');

      // Save the PDF URL immediately
      await upsertSetting('terms_pdf_url', urlData.publicUrl);
      await upsertSetting('terms_display_mode', 'pdf');

      toast({
        title: "PDF enviado com sucesso!",
        description: "O PDF dos termos foi atualizado."
      });
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Erro ao enviar PDF",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const handleRemovePdf = async () => {
    try {
      setTermsPdfUrl(null);
      setTermsDisplayMode('text');
      
      await upsertSetting('terms_pdf_url', '');
      await upsertSetting('terms_display_mode', 'text');

      toast({
        title: "PDF removido",
        description: "Os termos voltarão a exibir o texto."
      });
    } catch (error) {
      console.error('Error removing PDF:', error);
      toast({
        title: "Erro ao remover PDF",
        variant: "destructive"
      });
    }
  };

  const handleSaveCancellation = async () => {
    try {
      setSavingCancellation(true);
      
      await upsertSetting('cancellation_policy', cancellationPolicy);
      await upsertSetting('cancellation_display_mode', cancellationDisplayMode);
      if (cancellationImageUrl) {
        await upsertSetting('cancellation_policy_image', cancellationImageUrl);
      }

      toast({
        title: "Política de cancelamento salva com sucesso!",
        description: "As alterações serão refletidas no formulário de reservas."
      });
    } catch (error) {
      console.error('Error saving cancellation policy:', error);
      toast({
        title: "Erro ao salvar política de cancelamento",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setSavingCancellation(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `cancellation-policy-${Date.now()}.${fileExt}`;
      const filePath = `policies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-config')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('site-config')
        .getPublicUrl(filePath);

      setCancellationImageUrl(urlData.publicUrl);
      setCancellationDisplayMode('image');

      // Save the image URL immediately
      await upsertSetting('cancellation_policy_image', urlData.publicUrl);
      await upsertSetting('cancellation_display_mode', 'image');

      toast({
        title: "Imagem enviada com sucesso!",
        description: "A imagem da política de cancelamento foi atualizada."
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro ao enviar imagem",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setCancellationImageUrl(null);
      setCancellationDisplayMode('text');
      
      await upsertSetting('cancellation_policy_image', '');
      await upsertSetting('cancellation_display_mode', 'text');

      toast({
        title: "Imagem removida",
        description: "A política voltará a exibir o texto."
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Erro ao remover imagem",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="termos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="termos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Termos e Condições
          </TabsTrigger>
          <TabsTrigger value="cancelamento" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Cancelamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="termos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Termos e Condições de Participação
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure como os termos serão exibidos. Você pode usar texto formatado ou fazer upload de um PDF.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Mode Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Modo de exibição</Label>
                <RadioGroup 
                  value={termsDisplayMode} 
                  onValueChange={(value: 'text' | 'pdf') => setTermsDisplayMode(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="terms-mode-text" />
                    <Label htmlFor="terms-mode-text" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Texto
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="terms-mode-pdf" />
                    <Label htmlFor="terms-mode-pdf" className="flex items-center gap-2 cursor-pointer">
                      <FileUp className="h-4 w-4" />
                      PDF
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* PDF Upload Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Arquivo PDF dos Termos</Label>
                
                {termsPdfUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <FileUp className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">PDF carregado</p>
                        <a 
                          href={termsPdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Abrir PDF <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemovePdf}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {termsDisplayMode === 'pdf' 
                        ? '✓ Este PDF será aberto quando clicarem em "Ler termos e condições".'
                        : 'Este PDF está salvo mas o texto será exibido (modo atual: texto).'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-background">
                    <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Arraste um arquivo PDF ou clique para fazer upload
                    </p>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="terms-pdf-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={uploadingPdf}
                    >
                      {uploadingPdf ? 'Enviando...' : 'Selecionar PDF'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Text Editor Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Texto dos Termos 
                  {termsDisplayMode === 'pdf' && termsPdfUrl && (
                    <span className="text-muted-foreground font-normal ml-2">(backup - não será exibido)</span>
                  )}
                </Label>
                <RichTextEditor
                  value={termsPolicy}
                  onChange={setTermsPolicy}
                  placeholder="Digite os termos e condições aqui..."
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveTerms} 
                  disabled={savingTerms}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingTerms ? 'Salvando...' : 'Salvar Termos'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (termsDisplayMode === 'pdf' && termsPdfUrl) {
                      window.open(termsPdfUrl, '_blank');
                    } else {
                      setShowTermsPreview(true);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Visualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Política de Cancelamento e Alteração
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure como a política de cancelamento será exibida no formulário de inscrição.
                Você pode usar texto ou fazer upload de uma imagem.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Mode Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Modo de exibição</Label>
                <RadioGroup 
                  value={cancellationDisplayMode} 
                  onValueChange={(value: 'text' | 'image') => setCancellationDisplayMode(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="mode-text" />
                    <Label htmlFor="mode-text" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Texto
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="image" id="mode-image" />
                    <Label htmlFor="mode-image" className="flex items-center gap-2 cursor-pointer">
                      <Image className="h-4 w-4" />
                      Imagem
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Imagem da Política</Label>
                
                {cancellationImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative max-w-md">
                      <img 
                        src={cancellationImageUrl} 
                        alt="Política de Cancelamento" 
                        className="w-full h-auto rounded-lg border shadow-sm"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cancellationDisplayMode === 'image' 
                        ? '✓ Esta imagem será exibida no formulário de inscrição.'
                        : 'Esta imagem está salva mas o texto será exibido (modo atual: texto).'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-background">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Arraste uma imagem ou clique para fazer upload
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="policy-image-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Enviando...' : 'Selecionar Imagem'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Text Editor Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Texto da Política 
                  {cancellationDisplayMode === 'image' && cancellationImageUrl && (
                    <span className="text-muted-foreground font-normal ml-2">(backup - não será exibido)</span>
                  )}
                </Label>
                <RichTextEditor
                  value={cancellationPolicy}
                  onChange={setCancellationPolicy}
                  placeholder="Digite a política de cancelamento aqui..."
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveCancellation} 
                  disabled={savingCancellation}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingCancellation ? 'Salvando...' : 'Salvar Política'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancellationPreview(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Visualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Terms Preview Modal */}
      <Dialog open={showTermsPreview} onOpenChange={setShowTermsPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Pré-visualização dos Termos e Condições de Participação
            </DialogTitle>
          </DialogHeader>
          <div 
            className="prose prose-sm max-w-none text-gray-700 rich-text-content"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(termsPolicy, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'span', 'div', 'sub', 'sup'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
                ALLOW_DATA_ATTR: false
              })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cancellation Preview Modal */}
      <Dialog open={showCancellationPreview} onOpenChange={setShowCancellationPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Pré-visualização da Política de Cancelamento
            </DialogTitle>
          </DialogHeader>
          {cancellationDisplayMode === 'image' && cancellationImageUrl ? (
            <img 
              src={cancellationImageUrl} 
              alt="Política de Cancelamento e Alteração de Data/Destino" 
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div 
              className="prose prose-sm max-w-none text-gray-700 rich-text-content"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(cancellationPolicy, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'span', 'div', 'sub', 'sup'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
                  ALLOW_DATA_ATTR: false
                })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}