import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AtendimentoCategory {
  id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AtendimentoFolder {
  id: string;
  category_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AtendimentoMessage {
  id: string;
  folder_id: string;
  title: string;
  body: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const useAtendimentoMessages = (categoryId: string | null) => {
  const [categories, setCategories] = useState<AtendimentoCategory[]>([]);
  const [folders, setFolders] = useState<AtendimentoFolder[]>([]);
  const [messages, setMessages] = useState<AtendimentoMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('atendimento_categories')
      .select('*')
      .order('order_index');
    if (data) setCategories(data);
  }, []);

  const fetchFolders = useCallback(async () => {
    if (!categoryId) { setFolders([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('atendimento_folders')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index');
    if (data) setFolders(data);
    setLoading(false);
  }, [categoryId]);

  const fetchMessages = useCallback(async (folderIds: string[]) => {
    if (folderIds.length === 0) { setMessages([]); return; }
    const { data } = await supabase
      .from('atendimento_messages')
      .select('*')
      .in('folder_id', folderIds)
      .order('order_index');
    if (data) setMessages(data);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => {
    if (folders.length > 0) fetchMessages(folders.map(f => f.id));
    else setMessages([]);
  }, [folders, fetchMessages]);

  // Category CRUD
  const createCategory = async (name: string) => {
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) + 1 : 0;
    const { error } = await supabase.from('atendimento_categories').insert({ name, order_index: maxOrder });
    if (!error) await fetchCategories();
    return error;
  };
  const updateCategory = async (id: string, name: string) => {
    const { error } = await supabase.from('atendimento_categories').update({ name }).eq('id', id);
    if (!error) await fetchCategories();
    return error;
  };
  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('atendimento_categories').delete().eq('id', id);
    if (!error) await fetchCategories();
    return error;
  };

  // Folder CRUD
  const createFolder = async (name: string) => {
    if (!categoryId) return;
    const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order_index)) + 1 : 0;
    const { error } = await supabase.from('atendimento_folders').insert({ category_id: categoryId, name, order_index: maxOrder });
    if (!error) await fetchFolders();
    return error;
  };
  const updateFolder = async (id: string, name: string) => {
    const { error } = await supabase.from('atendimento_folders').update({ name }).eq('id', id);
    if (!error) await fetchFolders();
    return error;
  };
  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from('atendimento_folders').delete().eq('id', id);
    if (!error) await fetchFolders();
    return error;
  };

  // Message CRUD
  const createMessage = async (folderId: string, title: string, body: string) => {
    const folderMsgs = messages.filter(m => m.folder_id === folderId);
    const maxOrder = folderMsgs.length > 0 ? Math.max(...folderMsgs.map(m => m.order_index)) + 1 : 0;
    const { error } = await supabase.from('atendimento_messages').insert({ folder_id: folderId, title, body, order_index: maxOrder });
    if (!error) await fetchMessages(folders.map(f => f.id));
    return error;
  };
  const updateMessage = async (id: string, title: string, body: string) => {
    const { error } = await supabase.from('atendimento_messages').update({ title, body }).eq('id', id);
    if (!error) await fetchMessages(folders.map(f => f.id));
    return error;
  };
  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('atendimento_messages').delete().eq('id', id);
    if (!error) await fetchMessages(folders.map(f => f.id));
    return error;
  };

  return {
    categories, folders, messages, loading,
    createCategory, updateCategory, deleteCategory,
    createFolder, updateFolder, deleteFolder,
    createMessage, updateMessage, deleteMessage,
    refetchCategories: fetchCategories,
  };
};
