import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProcessMap, ProcessElement, ProcessConnection } from '@/components/processes/types';

export function useProcessMaps() {
  const [maps, setMaps] = useState<ProcessMap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_maps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const typedMaps: ProcessMap[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        area: item.area as ProcessMap['area'],
        status: item.status as ProcessMap['status'],
        elements: (item.elements as unknown as ProcessElement[]) || [],
        connections: (item.connections as unknown as ProcessConnection[]) || [],
        stages: (item.stages as unknown as ProcessMap['stages']) || [],
        canvas_settings: (item.canvas_settings as unknown as ProcessMap['canvas_settings']) || { width: 1200, height: 800 },
        created_at: item.created_at,
        updated_at: item.updated_at,
        updated_by: item.updated_by || undefined
      }));

      setMaps(typedMaps);
    } catch (error) {
      console.error('Error fetching process maps:', error);
      toast.error('Erro ao carregar mapas de processos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const createMap = async (name: string, area: ProcessMap['area']): Promise<ProcessMap | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('process_maps')
        .insert({
          name,
          area,
          status: 'Em construção',
          elements: [],
          connections: [],
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newMap: ProcessMap = {
        id: data.id,
        name: data.name,
        area: data.area as ProcessMap['area'],
        status: data.status as ProcessMap['status'],
        elements: [],
        connections: [],
        stages: [],
        canvas_settings: { width: 1200, height: 800 },
        created_at: data.created_at,
        updated_at: data.updated_at,
        updated_by: data.updated_by || undefined
      };

      setMaps(prev => [newMap, ...prev]);
      toast.success('Mapa criado com sucesso');
      return newMap;
    } catch (error) {
      console.error('Error creating process map:', error);
      toast.error('Erro ao criar mapa');
      return null;
    }
  };

  const updateMap = async (id: string, updates: Partial<ProcessMap>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const dbUpdates: Record<string, unknown> = {
        updated_by: user?.id
      };

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.area !== undefined) dbUpdates.area = updates.area;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.elements !== undefined) dbUpdates.elements = updates.elements;
      if (updates.connections !== undefined) dbUpdates.connections = updates.connections;
      if (updates.canvas_settings !== undefined) dbUpdates.canvas_settings = updates.canvas_settings;
      if (updates.stages !== undefined) dbUpdates.stages = updates.stages;

      const { error } = await supabase
        .from('process_maps')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setMaps(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m));
      return true;
    } catch (error) {
      console.error('Error updating process map:', error);
      toast.error('Erro ao atualizar mapa');
      return false;
    }
  };

  const deleteMap = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('process_maps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMaps(prev => prev.filter(m => m.id !== id));
      toast.success('Mapa excluído com sucesso');
      return true;
    } catch (error) {
      console.error('Error deleting process map:', error);
      toast.error('Erro ao excluir mapa');
      return false;
    }
  };

  return {
    maps,
    loading,
    createMap,
    updateMap,
    deleteMap,
    refetch: fetchMaps
  };
}
