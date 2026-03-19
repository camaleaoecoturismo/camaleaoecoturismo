import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Megaphone, Calendar, Target } from 'lucide-react';
import { ContentCampaign, ContentPost, FORMAT_CONFIG } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContentCampaignsManagerProps {
  campaigns: ContentCampaign[];
  loading: boolean;
  onCreateCampaign: (campaign: Omit<ContentCampaign, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  posts: ContentPost[];
}

const ContentCampaignsManager: React.FC<ContentCampaignsManagerProps> = ({
  campaigns,
  loading,
  onCreateCampaign,
  posts,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    cor: '#10B981',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      cor: '#10B981',
    });
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) return;

    await onCreateCampaign({
      nome: formData.nome,
      descricao: formData.descricao || null,
      data_inicio: formData.data_inicio || null,
      data_fim: formData.data_fim || null,
      cor: formData.cor,
      ativa: true,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const getPostsForCampaign = (campaignId: string) => {
    return posts.filter(p => p.campanha_id === campaignId);
  };

  const colors = [
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', 
    '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Campanhas de Conteúdo</h2>
          <p className="text-sm text-muted-foreground">
            Organize postagens em campanhas temáticas
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Nova Campanha
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nome da Campanha *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Lançamento Agenda 2026"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Objetivos e detalhes da campanha..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, cor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.nome.trim()}>
                  Criar Campanha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => {
            const campaignPosts = getPostsForCampaign(campaign.id);
            const formatCounts = {
              reels: campaignPosts.filter(p => p.formato === 'reels').length,
              feed: campaignPosts.filter(p => p.formato === 'feed').length,
              carrossel: campaignPosts.filter(p => p.formato === 'carrossel').length,
              stories: campaignPosts.filter(p => p.formato === 'stories').length,
            };

            return (
              <Card key={campaign.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: campaign.cor }} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{campaign.nome}</CardTitle>
                    <Badge variant={campaign.ativa ? 'default' : 'secondary'}>
                      {campaign.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.descricao}</p>
                  )}

                  {(campaign.data_inicio || campaign.data_fim) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {campaign.data_inicio && format(new Date(campaign.data_inicio), 'dd/MM/yy', { locale: ptBR })}
                      {campaign.data_inicio && campaign.data_fim && ' - '}
                      {campaign.data_fim && format(new Date(campaign.data_fim), 'dd/MM/yy', { locale: ptBR })}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{campaignPosts.length} postagens</span>
                  </div>

                  {campaignPosts.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(formatCounts).map(([format, count]) => {
                        if (count === 0) return null;
                        const config = FORMAT_CONFIG[format as keyof typeof FORMAT_CONFIG];
                        return (
                          <Badge key={format} variant="outline" className="text-xs">
                            {config.icon} {count}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma campanha criada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Campanhas ajudam a organizar postagens por tema ou período
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira campanha
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContentCampaignsManager;
