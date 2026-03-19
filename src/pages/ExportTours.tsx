import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

interface TourRow {
  id: string;
  name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string | null;
  month: string;
  etiqueta: string | null;
  is_active: boolean;
  is_exclusive: boolean;
  includes: string | null;
  not_includes: string | null;
  valor_padrao: number | null;
  pix_discount_percent: number | null;
  mp_installments_max: number;
  mp_card_fee_percent: number;
  pricing_options: Array<{
    id: string;
    option_name: string;
    pix_price: number;
    card_price: number;
  }>;
}

const INSTALLMENT_FEES: Record<number, number> = {
  1: 0, 2: 3.49, 3: 4.99, 4: 6.49, 5: 7.99,
  6: 9.49, 7: 10.99, 8: 12.49, 9: 13.99,
  10: 15.49, 11: 16.49, 12: 17.28,
};

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function calcDuration(start: string, end: string | null): number {
  if (!end) return 1;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function buildInstallmentString(cardPrice: number, maxInstallments: number): string {
  if (!cardPrice || cardPrice <= 0) return '';
  const parts: string[] = [];
  for (let i = 1; i <= maxInstallments; i++) {
    const fee = INSTALLMENT_FEES[i] ?? 0;
    const totalWithFee = cardPrice * (1 + fee / 100);
    const installmentValue = totalWithFee / i;
    if (installmentValue < 5) break; // skip if too small
    parts.push(`${i}x de ${installmentValue.toFixed(2)}`);
  }
  return parts.join(' | ');
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ExportTours() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tours, setTours] = useState<TourRow[]>([]);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select(`*, pricing_options:tour_pricing_options(*)`)
        .gte('start_date', '2026-01-01')
        .lte('start_date', '2026-12-31')
        .eq('is_active', true)
        .eq('is_exclusive', false)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Filter out corporate, test, cancelled, historical tours
      const filtered = (data || []).filter((t: any) => {
        const tag = (t.etiqueta || '').toLowerCase();
        if (tag.includes('corporativ') || tag.includes('exclusiv') || tag.includes('cancelad') || tag.includes('teste') || tag.includes('histórico')) return false;
        const name = (t.name || '').toLowerCase();
        if (name.includes('teste') || name.includes('test')) return false;
        return true;
      });

      setTours(filtered);
      setStatus('ready');
    } catch (err) {
      console.error('Error fetching tours:', err);
      setStatus('error');
    }
  };

  const handleExport = () => {
    const rows = tours.map((tour) => {
      const hasPricing = tour.pricing_options && tour.pricing_options.length > 0;
      const pixPrice = hasPricing
        ? Math.min(...tour.pricing_options.map(p => p.pix_price))
        : (tour.valor_padrao && tour.pix_discount_percent
            ? tour.valor_padrao * (1 - (tour.pix_discount_percent / 100))
            : tour.valor_padrao || '');
      const cardPrice = hasPricing
        ? Math.min(...tour.pricing_options.map(p => p.card_price))
        : (tour.valor_padrao || '');

      const numericCard = typeof cardPrice === 'number' ? cardPrice : 0;
      const parcelamento = buildInstallmentString(numericCard, tour.mp_installments_max || 12);

      const startYear = tour.start_date ? tour.start_date.substring(0, 4) : '';
      const startMonth = tour.start_date ? new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' }) : '';

      const duration = calcDuration(tour.start_date, tour.end_date);
      const tipo = duration > 1 ? 'Viagem' : 'Day Use';

      const link = `${window.location.origin}/reserva/${tour.id}`;

      return {
        ID_EVENTO: tour.id,
        NOME_BASE: tour.name.replace(/ - (Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez).*$/i, '').trim(),
        NOME_COMPLETO: tour.name,
        DATA_INICIO: formatDateBR(tour.start_date),
        DATA_FIM: tour.end_date ? formatDateBR(tour.end_date) : '',
        ANO: startYear,
        MES: startMonth.charAt(0).toUpperCase() + startMonth.slice(1),
        DURACAO_DIAS: duration,
        CIDADE: tour.city || '',
        ESTADO: tour.state || '',
        TIPO: tipo,
        NIVEL_DIFICULDADE: '',
        VALOR_PIX: typeof pixPrice === 'number' ? Number(pixPrice.toFixed(2)) : '',
        VALOR_CARTAO: typeof cardPrice === 'number' ? Number(numericCard.toFixed(2)) : '',
        PARCELAMENTO: parcelamento,
        INCLUI: stripHtml(tour.includes),
        NAO_INCLUI: stripHtml(tour.not_includes),
        LINK_PAGAMENTO: link,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 38 }, // ID
      { wch: 30 }, // NOME_BASE
      { wch: 40 }, // NOME_COMPLETO
      { wch: 12 }, // DATA_INICIO
      { wch: 12 }, // DATA_FIM
      { wch: 6 },  // ANO
      { wch: 12 }, // MES
      { wch: 12 }, // DURACAO
      { wch: 20 }, // CIDADE
      { wch: 6 },  // ESTADO
      { wch: 10 }, // TIPO
      { wch: 18 }, // NIVEL
      { wch: 12 }, // PIX
      { wch: 12 }, // CARTAO
      { wch: 80 }, // PARCELAMENTO
      { wch: 60 }, // INCLUI
      { wch: 60 }, // NAO_INCLUI
      { wch: 60 }, // LINK
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Passeios 2026');
    XLSX.writeFile(wb, 'Camaleao_Passeios_2026.xlsx');
    setDownloaded(true);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Exportar Passeios 2026</h1>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Carregando passeios...</p>
          </div>
        )}

        {status === 'error' && (
          <p className="text-destructive">Erro ao carregar passeios. Tente novamente.</p>
        )}

        {status === 'ready' && (
          <>
            <p className="text-muted-foreground">
              <span className="text-3xl font-bold text-foreground">{tours.length}</span> passeios públicos encontrados para 2026.
            </p>
            <Button onClick={handleExport} size="lg" className="w-full gap-2">
              {downloaded ? <CheckCircle2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
              {downloaded ? 'Baixar novamente' : 'Baixar Planilha (.xlsx)'}
            </Button>
            {downloaded && (
              <p className="text-sm text-muted-foreground">
                Arquivo <strong>Camaleao_Passeios_2026.xlsx</strong> baixado com sucesso!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
