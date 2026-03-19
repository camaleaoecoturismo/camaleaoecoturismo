import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  is_active: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingPageBlock {
  id: string;
  page_id: string;
  block_type: string;
  order_index: number;
  title: string | null;
  subtitle: string | null;
  content: Json;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface LandingPageRegion {
  id: string;
  page_id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  color: string;
  order_index: number;
  attractions: Json;
  includes: Json;
  logistics: Json;
  tour_filter_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingPageTour {
  id: string;
  page_id: string;
  tour_id: string;
  order_index: number;
  created_at: string;
}

export function useLandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching landing pages:', error);
      toast.error('Erro ao carregar páginas');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPage = async (page: { slug: string; title: string; meta_description?: string | null; is_active?: boolean; is_published?: boolean }) => {
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert([page])
        .select()
        .single();

      if (error) throw error;
      toast.success('Página criada com sucesso');
      await fetchPages();
      return data as LandingPage;
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Erro ao criar página');
      throw error;
    }
  };

  const updatePage = async (id: string, updates: Partial<LandingPage>) => {
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Página atualizada');
      await fetchPages();
    } catch (error) {
      console.error('Error updating page:', error);
      toast.error('Erro ao atualizar página');
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Página excluída');
      await fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Erro ao excluir página');
      throw error;
    }
  };

  const publishPage = async (id: string, publish: boolean) => {
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ 
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(publish ? 'Página publicada' : 'Página despublicada');
      await fetchPages();
    } catch (error) {
      console.error('Error publishing page:', error);
      toast.error('Erro ao publicar página');
      throw error;
    }
  };

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return {
    pages,
    loading,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    publishPage,
  };
}

export function useLandingPageBlocks(pageId: string | null) {
  const [blocks, setBlocks] = useState<LandingPageBlock[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlocks = useCallback(async () => {
    if (!pageId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_page_blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index');

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      toast.error('Erro ao carregar blocos');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  const createBlock = async (block: { block_type: string; order_index?: number; is_visible?: boolean; content?: Json; title?: string | null; subtitle?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('landing_page_blocks')
        .insert([{ ...block, page_id: pageId }])
        .select()
        .single();

      if (error) throw error;
      await fetchBlocks();
      return data as LandingPageBlock;
    } catch (error) {
      console.error('Error creating block:', error);
      toast.error('Erro ao criar bloco');
      throw error;
    }
  };

  const updateBlock = async (id: string, updates: { block_type?: string; order_index?: number; is_visible?: boolean; content?: Json; title?: string | null; subtitle?: string | null }) => {
    try {
      const { error } = await supabase
        .from('landing_page_blocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchBlocks();
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Erro ao atualizar bloco');
      throw error;
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('landing_page_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchBlocks();
    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error('Erro ao excluir bloco');
      throw error;
    }
  };

  const reorderBlocks = async (reorderedBlocks: LandingPageBlock[]) => {
    try {
      const updates = reorderedBlocks.map((block, index) => ({
        id: block.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('landing_page_blocks')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      await fetchBlocks();
    } catch (error) {
      console.error('Error reordering blocks:', error);
      toast.error('Erro ao reordenar blocos');
      throw error;
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return {
    blocks,
    loading,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
  };
}

export function useLandingPageRegions(pageId: string | null) {
  const [regions, setRegions] = useState<LandingPageRegion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRegions = useCallback(async () => {
    if (!pageId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_page_regions')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Erro ao carregar regiões');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  const createRegion = async (region: { name: string; subtitle?: string | null; description?: string | null; image_url?: string | null; color?: string; order_index?: number; attractions?: Json; includes?: Json; logistics?: Json; tour_filter_tag?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('landing_page_regions')
        .insert([{ ...region, page_id: pageId }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Região criada');
      await fetchRegions();
      return data as LandingPageRegion;
    } catch (error) {
      console.error('Error creating region:', error);
      toast.error('Erro ao criar região');
      throw error;
    }
  };

  const updateRegion = async (id: string, updates: { name?: string; subtitle?: string | null; description?: string | null; image_url?: string | null; color?: string; order_index?: number; attractions?: Json; includes?: Json; logistics?: Json; tour_filter_tag?: string | null }) => {
    try {
      const { error } = await supabase
        .from('landing_page_regions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Região atualizada');
      await fetchRegions();
    } catch (error) {
      console.error('Error updating region:', error);
      toast.error('Erro ao atualizar região');
      throw error;
    }
  };

  const deleteRegion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('landing_page_regions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Região excluída');
      await fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Erro ao excluir região');
      throw error;
    }
  };

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    loading,
    fetchRegions,
    createRegion,
    updateRegion,
    deleteRegion,
  };
}

export function useLandingPageTours(pageId: string | null) {
  const [pageTours, setPageTours] = useState<LandingPageTour[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPageTours = useCallback(async () => {
    if (!pageId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_page_tours')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index');

      if (error) throw error;
      setPageTours(data || []);
    } catch (error) {
      console.error('Error fetching page tours:', error);
      toast.error('Erro ao carregar tours da página');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  const addTour = async (tourId: string) => {
    try {
      const maxOrder = pageTours.length > 0 
        ? Math.max(...pageTours.map(t => t.order_index)) + 1 
        : 0;

      const { error } = await supabase
        .from('landing_page_tours')
        .insert([{ page_id: pageId, tour_id: tourId, order_index: maxOrder }]);

      if (error) throw error;
      toast.success('Tour adicionado');
      await fetchPageTours();
    } catch (error) {
      console.error('Error adding tour:', error);
      toast.error('Erro ao adicionar tour');
      throw error;
    }
  };

  const removeTour = async (tourId: string) => {
    try {
      const { error } = await supabase
        .from('landing_page_tours')
        .delete()
        .eq('page_id', pageId)
        .eq('tour_id', tourId);

      if (error) throw error;
      toast.success('Tour removido');
      await fetchPageTours();
    } catch (error) {
      console.error('Error removing tour:', error);
      toast.error('Erro ao remover tour');
      throw error;
    }
  };

  useEffect(() => {
    fetchPageTours();
  }, [fetchPageTours]);

  return {
    pageTours,
    loading,
    fetchPageTours,
    addTour,
    removeTour,
  };
}
