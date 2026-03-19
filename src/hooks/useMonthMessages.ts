import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MonthMessage {
  id: string;
  month: string;
  year: number;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMonthMessages = () => {
  const [messages, setMessages] = useState<MonthMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('month_messages')
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar mensagens');
      console.error('Error fetching month messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel('month-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'month_messages'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { messages, loading, error, refetch: fetchMessages };
};
