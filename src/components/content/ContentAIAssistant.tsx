import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Lightbulb, Calendar, Sparkles, CheckCircle, X, ArrowRight, TrendingUp, Video, Image, MessageSquare } from 'lucide-react';
import { ContentPost, ContentIdea, ContentFormat, ContentObjective, FORMAT_CONFIG, OBJECTIVE_CONFIG } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContentAIAssistantProps {
  posts: ContentPost[];
  ideas: ContentIdea[];
  stats: {
    byFormat: Record<string, number>;
    byObjective: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
    scheduled: number;
    unscheduled: number;
  };
  onCreatePost: (post: any) => Promise<any>;
  onCreateIdea: (idea: any) => Promise<any>;
}

interface AISuggestion {
  id: string;
  tipo: 'formato' | 'frequencia' | 'equilibrio' | 'viagem' | 'ideia';
  titulo: string;
  mensagem: string;
  sugestao_formato?: ContentFormat;
  sugestao_tema?: string;
  data_sugerida?: string;
  prioridade: 'alta' | 'media' | 'baixa';
  icon: React.ReactNode;
}

const ContentAIAssistant: React.FC<ContentAIAssistantProps> = ({
  posts,
  ideas,
  stats,
  onCreatePost,
  onCreateIdea,
}) => {
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Generate AI suggestions based on content analysis
  const suggestions = useMemo(() => {
    const result: AISuggestion[] = [];
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { locale: ptBR });
    const thisWeekEnd = endOfWeek(today, { locale: ptBR });

    // Get this week's posts
    const thisWeekPosts = posts.filter(p => {
      if (!p.data_publicacao) return false;
      const postDate = new Date(p.data_publicacao);
      return postDate >= thisWeekStart && postDate <= thisWeekEnd;
    });

    // 1. Check Reels distribution
    const totalFormatted = stats.byFormat.reels + stats.byFormat.feed + stats.byFormat.carrossel;
    if (totalFormatted > 0) {
      const reelsPercent = (stats.byFormat.reels / totalFormatted) * 100;
      if (reelsPercent < 30) {
        result.push({
          id: 'reels-deficit',
          tipo: 'formato',
          titulo: 'Poucos Reels Planejados',
          mensagem: `Apenas ${reelsPercent.toFixed(0)}% do seu conteúdo são Reels. Reels têm o maior alcance orgânico no Instagram. Considere adicionar mais vídeos curtos.`,
          sugestao_formato: 'reels',
          sugestao_tema: 'Bastidores ou momentos highlights de uma viagem',
          prioridade: 'alta',
          icon: <Video className="h-5 w-5 text-pink-500" />,
        });
      }
    }

    // 2. Check Stories frequency
    const thisWeekStories = thisWeekPosts.filter(p => p.formato === 'stories').length;
    if (thisWeekStories < 3) {
      result.push({
        id: 'stories-frequency',
        tipo: 'frequencia',
        titulo: 'Stories Precisam de Frequência',
        mensagem: `Você tem apenas ${thisWeekStories} Stories planejados para esta semana. Stories diários mantêm seu perfil ativo e engajado.`,
        sugestao_formato: 'stories',
        sugestao_tema: 'Bastidores do dia, enquetes ou perguntas',
        data_sugerida: format(today, 'yyyy-MM-dd'),
        prioridade: 'media',
        icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
      });
    }

    // 3. Check objective balance
    if (stats.byObjective.venda > (stats.byObjective.engajamento + stats.byObjective.relacionamento)) {
      result.push({
        id: 'sales-heavy',
        tipo: 'equilibrio',
        titulo: 'Muito Conteúdo de Venda',
        mensagem: 'Seu conteúdo está focado demais em vendas. Equilibre com engajamento e relacionamento para não cansar a audiência.',
        sugestao_formato: 'feed',
        sugestao_tema: 'Conteúdo educativo ou inspiracional sobre natureza',
        prioridade: 'alta',
        icon: <TrendingUp className="h-5 w-5 text-yellow-600" />,
      });
    }

    // 4. Check for empty days this week
    const daysWithContent = new Set(thisWeekPosts.map(p => p.data_publicacao));
    const emptyDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(thisWeekStart, i);
      if (day >= today && !daysWithContent.has(format(day, 'yyyy-MM-dd'))) {
        emptyDays.push(day);
      }
    }

    if (emptyDays.length >= 3) {
      result.push({
        id: 'empty-days',
        tipo: 'frequencia',
        titulo: 'Dias Vazios no Calendário',
        mensagem: `Você tem ${emptyDays.length} dias sem conteúdo planejado esta semana. Considere ao menos Stories nesses dias.`,
        sugestao_formato: 'stories',
        data_sugerida: format(emptyDays[0], 'yyyy-MM-dd'),
        prioridade: 'media',
        icon: <Calendar className="h-5 w-5 text-blue-500" />,
      });
    }

    // 5. Suggest using ready ideas
    const readyIdeas = ideas.filter(i => i.status === 'pronta');
    if (readyIdeas.length > 3) {
      const randomIdea = readyIdeas[Math.floor(Math.random() * readyIdeas.length)];
      result.push({
        id: `use-idea-${randomIdea.id}`,
        tipo: 'ideia',
        titulo: 'Você Tem Ideias Prontas!',
        mensagem: `A ideia "${randomIdea.tema}" está pronta para virar postagem. Aproveite suas ideias antes que fiquem defasadas.`,
        sugestao_formato: randomIdea.formato,
        sugestao_tema: randomIdea.tema,
        prioridade: 'baixa',
        icon: <Lightbulb className="h-5 w-5 text-yellow-400" />,
      });
    }

    // 6. Check Carrossel usage for authority
    if (stats.byFormat.carrossel < 2 && stats.byObjective.autoridade < 2) {
      result.push({
        id: 'carrossel-authority',
        tipo: 'formato',
        titulo: 'Carrosséis para Autoridade',
        mensagem: 'Carrosséis educativos são excelentes para construir autoridade. Considere criar um conteúdo informativo sobre destinos ou dicas de viagem.',
        sugestao_formato: 'carrossel',
        sugestao_tema: 'Dicas práticas ou guia de destino',
        prioridade: 'media',
        icon: <Image className="h-5 w-5 text-purple-500" />,
      });
    }

    return result.filter(s => !dismissedSuggestions.has(s.id));
  }, [posts, ideas, stats, dismissedSuggestions]);

  const handleCreateFromSuggestion = async (suggestion: AISuggestion, action: 'post' | 'idea') => {
    setProcessingSuggestion(suggestion.id);

    try {
      if (action === 'post') {
        await onCreatePost({
          tema: suggestion.sugestao_tema || 'Nova postagem',
          formato: suggestion.sugestao_formato || 'reels',
          objetivo: 'engajamento',
          status: 'ideia',
          data_publicacao: suggestion.data_sugerida || null,
          plataforma: 'instagram',
          ordem_dia: 0,
        });
        toast.success('Postagem criada no calendário!');
      } else {
        await onCreateIdea({
          tema: suggestion.sugestao_tema || 'Nova ideia',
          formato: suggestion.sugestao_formato || 'reels',
          objetivo: 'engajamento',
          prioridade: 'media',
          status: 'nova',
          tags: [],
        });
        toast.success('Ideia adicionada ao banco!');
      }

      setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
    } catch (error) {
      console.error('Error creating from suggestion:', error);
      toast.error('Erro ao processar sugestão');
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  const priorityColors = {
    alta: 'border-red-200 bg-red-50',
    media: 'border-yellow-200 bg-yellow-50',
    baixa: 'border-blue-200 bg-blue-50',
  };

  const priorityBadge = {
    alta: 'bg-red-100 text-red-700',
    media: 'bg-yellow-100 text-yellow-700',
    baixa: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Assistente de Conteúdo IA</h2>
              <p className="text-muted-foreground">
                Análise inteligente do seu planejamento com sugestões estratégicas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-pink-50 border border-pink-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎬</span>
            <span className="text-sm text-pink-600">Reels</span>
          </div>
          <p className="text-2xl font-bold text-pink-700">{stats.byFormat.reels}</p>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🖼️</span>
            <span className="text-sm text-blue-600">Feed</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.byFormat.feed}</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📑</span>
            <span className="text-sm text-purple-600">Carrossel</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.byFormat.carrossel}</p>
        </div>
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📱</span>
            <span className="text-sm text-orange-600">Stories</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{stats.byFormat.stories}</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Sugestões Estratégicas
        </h3>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map(suggestion => (
              <Card key={suggestion.id} className={`border-2 ${priorityColors[suggestion.prioridade]}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      {suggestion.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{suggestion.titulo}</h4>
                        <Badge className={priorityBadge[suggestion.prioridade]}>
                          {suggestion.prioridade === 'alta' ? 'Urgente' : suggestion.prioridade === 'media' ? 'Importante' : 'Dica'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{suggestion.mensagem}</p>

                      {suggestion.sugestao_tema && (
                        <div className="text-sm mb-3 p-2 bg-white rounded border">
                          <span className="text-muted-foreground">Sugestão: </span>
                          <span className="font-medium">{suggestion.sugestao_tema}</span>
                          {suggestion.sugestao_formato && (
                            <span className="ml-2">{FORMAT_CONFIG[suggestion.sugestao_formato].icon}</span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromSuggestion(suggestion, 'post')}
                          disabled={processingSuggestion === suggestion.id}
                          className="gap-1"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Criar Postagem
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateFromSuggestion(suggestion, 'idea')}
                          disabled={processingSuggestion === suggestion.id}
                          className="gap-1"
                        >
                          <Lightbulb className="h-3.5 w-3.5" />
                          Salvar como Ideia
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(suggestion.id)}
                          className="gap-1 text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Seu planejamento de conteúdo está equilibrado! Continue assim. 🎉
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dicas Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-pink-500">🎬</span>
              <span><strong>Reels:</strong> Ideal para alcance. Use para momentos dinâmicos e highlights.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">🖼️</span>
              <span><strong>Feed:</strong> Perfeito para fotos de alta qualidade e conteúdo institucional.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">📑</span>
              <span><strong>Carrossel:</strong> Excelente para conteúdo educativo e construir autoridade.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">📱</span>
              <span><strong>Stories:</strong> Mantenha frequência diária para engajamento constante.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentAIAssistant;
