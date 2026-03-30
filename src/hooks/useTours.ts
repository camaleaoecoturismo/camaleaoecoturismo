import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TourPricingOption {
  id: string;
  option_name: string;
  description: string | null;
  pix_price: number;
  card_price: number;
}

export interface Tour {
  id: string;
  name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  image_url: string | null;
  month: string;
  about: string | null;
  itinerary: string | null;
  includes: string | null;
  not_includes: string | null;
  departures: string | null;
  what_to_bring: string | null;
  policy: string | null;
  pdf_file_path: string | null;
  buy_url: string | null;
  link_pagamento: string | null;
  whatsapp_group_link: string | null;
  etiqueta: string | null;
  destination_name: string | null;
  is_active: boolean;
  is_exclusive: boolean;
  is_featured: boolean;
  pro_labore: number | null;
  gastos_viagem: number | null;
  gastos_manutencao: number | null;
  imposto_renda: number | null;
  valor_padrao: number | null;
  vagas: number | null;
  vagas_fechadas: boolean;
  slug: string | null;
  card_name_prefix: string | null;
  card_name_main: string | null;
  card_prefix_size: string | null;
  card_main_size: string | null;
  card_prefix_font: string | null;
  card_main_font: string | null;
  payment_mode: 'whatsapp' | 'mercadopago' | 'both';
  mp_card_fee_percent: number;
  mp_installments_max: number;
  pix_discount_percent?: number | null;
  has_accommodation?: boolean;
  pricing_options: TourPricingOption[];
}

export const useTours = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTours();

    // Set up real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours'
        },
        () => {
          fetchTours();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select(`
          *,
          pricing_options:tour_pricing_options(*)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      // Cast payment_mode to the correct union type
      const toursWithTypedPaymentMode = (data || []).map(tour => ({
        ...tour,
        payment_mode: (tour.payment_mode || 'whatsapp') as 'whatsapp' | 'mercadopago' | 'both'
      }));
      setTours(toursWithTypedPaymentMode);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar passeios');
      console.error('Error fetching tours:', err);
    } finally {
      setLoading(false);
    }
  };

  return { tours, loading, error, refetch: fetchTours };
};