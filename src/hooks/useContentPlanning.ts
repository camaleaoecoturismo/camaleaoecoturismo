import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentIdea, ContentPost, ContentCampaign, ContentAISuggestion, ContentFormat, ContentObjective, IdeaPriority, IdeaStatus, PostStatus } from '@/components/content/types';
import { toast } from 'sonner';

export function useContentIdeas() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas((data || []).map(item => ({
        ...item,
        formato: item.formato as ContentFormat,
        objetivo: item.objetivo as ContentObjective,
        prioridade: item.prioridade as IdeaPriority,
        status: item.status as IdeaStatus,
        tags: item.tags || [],
      })));
    } catch (error) {
      console.error('Error fetching ideas:', error);
      toast.error('Erro ao carregar ideias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();

    const channel = supabase
      .channel('content-ideas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_ideas' }, () => {
        fetchIdeas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchIdeas]);

  const createIdea = async (idea: Omit<ContentIdea, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('content_ideas')
        .insert([idea])
        .select()
        .single();

      if (error) throw error;
      toast.success('Ideia criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Error creating idea:', error);
      toast.error('Erro ao criar ideia');
      return null;
    }
  };

  const updateIdea = async (id: string, updates: Partial<ContentIdea>) => {
    try {
      const { error } = await supabase
        .from('content_ideas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Ideia atualizada!');
    } catch (error) {
      console.error('Error updating idea:', error);
      toast.error('Erro ao atualizar ideia');
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Ideia excluída!');
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Erro ao excluir ideia');
    }
  };

  const convertIdeaToPost = async (idea: ContentIdea, date?: string) => {
    try {
      const postData = {
        idea_id: idea.id,
        tema: idea.tema,
        formato: idea.formato,
        objetivo: idea.objetivo,
        data_publicacao: date || null,
        status: 'ideia' as PostStatus,
        notas: idea.notas,
        plataforma: 'instagram',
        ordem_dia: 0,
      };

      const { data, error } = await supabase
        .from('content_posts')
        .insert([postData])
        .select()
        .single();

      if (error) throw error;

      // Update idea status to 'pronta'
      await supabase
        .from('content_ideas')
        .update({ status: 'pronta' })
        .eq('id', idea.id);

      toast.success('Ideia convertida em postagem!');
      return data;
    } catch (error) {
      console.error('Error converting idea to post:', error);
      toast.error('Erro ao converter ideia');
      return null;
    }
  };

  return {
    ideas,
    loading,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    convertIdeaToPost,
  };
}

export function useContentPosts() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .select('*')
        .order('data_publicacao', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setPosts((data || []).map(item => ({
        ...item,
        formato: item.formato as ContentFormat,
        objetivo: item.objetivo as ContentObjective,
        status: item.status as PostStatus,
        hashtags: item.hashtags || [],
      })));
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Erro ao carregar postagens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('content-posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const createPost = async (post: Omit<ContentPost, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .insert([post])
        .select()
        .single();

      if (error) throw error;
      toast.success('Postagem criada!');
      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Erro ao criar postagem');
      return null;
    }
  };

  const updatePost = async (id: string, updates: Partial<ContentPost>) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Postagem atualizada!');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Erro ao atualizar postagem');
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Postagem excluída!');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao excluir postagem');
    }
  };

  const movePostToDate = async (postId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ data_publicacao: newDate })
        .eq('id', postId);

      if (error) throw error;
    } catch (error) {
      console.error('Error moving post:', error);
      toast.error('Erro ao mover postagem');
    }
  };

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    movePostToDate,
  };
}

export function useContentCampaigns() {
  const [campaigns, setCampaigns] = useState<ContentCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_campaigns')
        .select('*')
        .order('data_inicio', { ascending: true });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaign: Omit<ContentCampaign, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('content_campaigns')
        .insert([campaign])
        .select()
        .single();

      if (error) throw error;
      toast.success('Campanha criada!');
      fetchCampaigns();
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Erro ao criar campanha');
      return null;
    }
  };

  return { campaigns, loading, fetchCampaigns, createCampaign };
}

export function useContentStats(posts: ContentPost[]) {
  const stats = {
    byFormat: {
      reels: posts.filter(p => p.formato === 'reels').length,
      feed: posts.filter(p => p.formato === 'feed').length,
      carrossel: posts.filter(p => p.formato === 'carrossel').length,
      stories: posts.filter(p => p.formato === 'stories').length,
    },
    byObjective: {
      venda: posts.filter(p => p.objetivo === 'venda').length,
      engajamento: posts.filter(p => p.objetivo === 'engajamento').length,
      autoridade: posts.filter(p => p.objetivo === 'autoridade').length,
      relacionamento: posts.filter(p => p.objetivo === 'relacionamento').length,
      institucional: posts.filter(p => p.objetivo === 'institucional').length,
    },
    byStatus: {
      ideia: posts.filter(p => p.status === 'ideia').length,
      em_producao: posts.filter(p => p.status === 'em_producao').length,
      aprovado: posts.filter(p => p.status === 'aprovado').length,
      agendado: posts.filter(p => p.status === 'agendado').length,
      publicado: posts.filter(p => p.status === 'publicado').length,
    },
    total: posts.length,
    scheduled: posts.filter(p => p.data_publicacao).length,
    unscheduled: posts.filter(p => !p.data_publicacao).length,
  };

  // Calculate alerts
  const alerts: string[] = [];
  const totalFormatted = stats.byFormat.reels + stats.byFormat.feed + stats.byFormat.carrossel;
  
  if (totalFormatted > 0) {
    const reelsPercent = (stats.byFormat.reels / totalFormatted) * 100;
    if (reelsPercent < 30) {
      alerts.push('Poucos Reels planejados. Reels têm maior alcance orgânico.');
    }
    if (stats.byFormat.stories < stats.byFormat.feed) {
      alerts.push('Considere mais Stories para manter engajamento diário.');
    }
  }

  if (stats.byObjective.venda > stats.byObjective.engajamento + stats.byObjective.relacionamento) {
    alerts.push('Muito conteúdo de venda. Equilibre com engajamento e relacionamento.');
  }

  return { stats, alerts };
}
