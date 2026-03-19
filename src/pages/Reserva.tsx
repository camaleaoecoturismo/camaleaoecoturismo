import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ReservaModal } from '@/components/ReservaModal';
import { Tour } from '@/hooks/useTours';
import { Loader2 } from 'lucide-react';

const Reserva = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tourId) return;

    const fetchTour = async () => {
      try {
        const { data, error } = await supabase
          .from('tours')
          .select(`
            *,
            pricing_options:tour_pricing_options(*)
          `)
          .eq('id', tourId)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setTour({
          ...data,
          payment_mode: (data.payment_mode || 'whatsapp') as 'whatsapp' | 'mercadopago' | 'both',
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tourId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
      </div>
    );
  }

  if (notFound || !tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary gap-4">
        <h1 className="text-xl font-semibold text-primary-foreground">Passeio não encontrado</h1>
        <p className="text-primary-foreground/70">Este passeio não existe ou não está disponível.</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary-foreground underline hover:opacity-80"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <ReservaModal
        isOpen={true}
        onClose={() => navigate('/')}
        tour={tour}
      />
    </div>
  );
};

export default Reserva;
