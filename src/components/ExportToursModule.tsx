import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2, Eye, EyeOff, FileText, FileDown, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  about: string | null;
  what_to_bring: string | null;
  departures: string | null;
  valor_padrao: number | null;
  pix_discount_percent: number | null;
  mp_installments_max: number;
  mp_card_fee_percent: number;
  pdf_file_path: string | null;
  pricing_options: Array<{
    id: string;
    option_name: string;
    pix_price: number;
    card_price: number;
  }>;
  boarding_points: Array<{
    id: string;
    nome: string;
    endereco: string | null;
    horario: string | null;
  }>;
}

type ExportFieldKey =
  | 'ID_EVENTO' | 'NOME_BASE' | 'NOME_COMPLETO' | 'DATA_INICIO' | 'DATA_FIM'
  | 'ANO' | 'MES' | 'DURACAO_DIAS' | 'CIDADE' | 'ESTADO' | 'TIPO'
  | 'NIVEL_DIFICULDADE' | 'VALOR_PIX' | 'VALOR_CARTAO' | 'PARCELAMENTO'
  | 'RESUMO' | 'INCLUI' | 'NAO_INCLUI' | 'O_QUE_LEVAR' | 'PONTOS_EMBARQUE'
  | 'LINK_PAGAMENTO' | 'LINK_ROTEIRO';

const ALL_EXPORT_FIELDS: { key: ExportFieldKey; label: string }[] = [
  { key: 'ID_EVENTO', label: 'ID do Evento' },
  { key: 'NOME_BASE', label: 'Nome Base' },
  { key: 'NOME_COMPLETO', label: 'Nome Completo' },
  { key: 'DATA_INICIO', label: 'Data Início' },
  { key: 'DATA_FIM', label: 'Data Fim' },
  { key: 'ANO', label: 'Ano' },
  { key: 'MES', label: 'Mês' },
  { key: 'DURACAO_DIAS', label: 'Duração (dias)' },
  { key: 'CIDADE', label: 'Cidade' },
  { key: 'ESTADO', label: 'Estado' },
  { key: 'TIPO', label: 'Tipo' },
  { key: 'NIVEL_DIFICULDADE', label: 'Nível de Dificuldade' },
  { key: 'VALOR_PIX', label: 'Valor PIX' },
  { key: 'VALOR_CARTAO', label: 'Valor Cartão' },
  { key: 'PARCELAMENTO', label: 'Parcelamento' },
  { key: 'RESUMO', label: 'Resumo / Sobre' },
  { key: 'INCLUI', label: 'O que Inclui' },
  { key: 'NAO_INCLUI', label: 'O que NÃO Inclui' },
  { key: 'O_QUE_LEVAR', label: 'O que Levar' },
  { key: 'PONTOS_EMBARQUE', label: 'Pontos de Embarque' },
  { key: 'LINK_PAGAMENTO', label: 'Link de Reserva' },
  { key: 'LINK_ROTEIRO', label: 'Link do Roteiro (PDF)' },
];

const DEFAULT_SELECTED_FIELDS: ExportFieldKey[] = [
  'NOME_COMPLETO', 'DATA_INICIO', 'DATA_FIM', 'CIDADE', 'ESTADO',
  'TIPO', 'DURACAO_DIAS', 'VALOR_PIX', 'VALOR_CARTAO', 'PARCELAMENTO',
  'RESUMO', 'INCLUI', 'NAO_INCLUI', 'O_QUE_LEVAR', 'PONTOS_EMBARQUE',
  'LINK_PAGAMENTO', 'LINK_ROTEIRO',
];

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
    if (installmentValue < 5) break;
    parts.push(`${i}x de ${installmentValue.toFixed(2)}`);
  }
  return parts.join(' | ');
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatBoardingPoints(points: TourRow['boarding_points']): string {
  if (!points || points.length === 0) return '';
  return points.map(p => {
    let str = p.nome;
    if (p.endereco) str += ` - ${p.endereco}`;
    if (p.horario) str += ` (${p.horario})`;
    return str;
  }).join(' | ');
}

const SUPABASE_STORAGE_URL = 'https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-pdfs';

interface ExportRow {
  ID_EVENTO: string;
  NOME_BASE: string;
  NOME_COMPLETO: string;
  DATA_INICIO: string;
  DATA_FIM: string;
  ANO: string;
  MES: string;
  DURACAO_DIAS: number;
  CIDADE: string;
  ESTADO: string;
  TIPO: string;
  NIVEL_DIFICULDADE: string;
  VALOR_PIX: number | string;
  VALOR_CARTAO: number | string;
  PARCELAMENTO: string;
  RESUMO: string;
  INCLUI: string;
  NAO_INCLUI: string;
  O_QUE_LEVAR: string;
  PONTOS_EMBARQUE: string;
  LINK_PAGAMENTO: string;
  LINK_ROTEIRO: string;
}

export default function ExportToursModule() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tours, setTours] = useState<TourRow[]>([]);
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedFields, setSelectedFields] = useState<ExportFieldKey[]>(DEFAULT_SELECTED_FIELDS);

  useEffect(() => {
    fetchTours();
  }, []);

  const toggleField = (key: ExportFieldKey) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedFields(ALL_EXPORT_FIELDS.map(f => f.key));
  const deselectAll = () => setSelectedFields([]);

  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select(`*, pricing_options:tour_pricing_options(*), boarding_points:tour_boarding_points(id, nome, endereco, horario)`)
        .gte('start_date', '2026-01-01')
        .lte('start_date', '2026-12-31')
        .eq('is_active', true)
        .eq('is_exclusive', false)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((t: any) => {
        const tag = (t.etiqueta || '').toLowerCase();
        if (tag.includes('corporativ') || tag.includes('exclusiv') || tag.includes('cancelad') || tag.includes('teste') || tag.includes('histórico')) return false;
        const name = (t.name || '').toLowerCase();
        if (name.includes('teste') || name.includes('test')) return false;
        return true;
      });

      setTours(filtered);
      setRows(buildRows(filtered));
      setStatus('ready');
    } catch (err) {
      console.error('Error fetching tours:', err);
      setStatus('error');
    }
  };

  const buildRows = (tours: TourRow[]): ExportRow[] => {
    return tours.map((tour) => {
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

      const startMonth = tour.start_date ? new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' }) : '';
      const duration = calcDuration(tour.start_date, tour.end_date);

      return {
        ID_EVENTO: tour.id,
        NOME_BASE: tour.name.replace(/ - (Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez).*$/i, '').trim(),
        NOME_COMPLETO: tour.name,
        DATA_INICIO: formatDateBR(tour.start_date),
        DATA_FIM: tour.end_date ? formatDateBR(tour.end_date) : '',
        ANO: tour.start_date ? tour.start_date.substring(0, 4) : '',
        MES: startMonth.charAt(0).toUpperCase() + startMonth.slice(1),
        DURACAO_DIAS: duration,
        CIDADE: tour.city || '',
        ESTADO: tour.state || '',
        TIPO: duration > 1 ? 'Viagem' : 'Day Use',
        NIVEL_DIFICULDADE: '',
        VALOR_PIX: typeof pixPrice === 'number' ? Number(pixPrice.toFixed(2)) : '',
        VALOR_CARTAO: typeof cardPrice === 'number' ? Number(numericCard.toFixed(2)) : '',
        PARCELAMENTO: parcelamento,
        RESUMO: stripHtml(tour.about),
        INCLUI: stripHtml(tour.includes),
        NAO_INCLUI: stripHtml(tour.not_includes),
        O_QUE_LEVAR: stripHtml(tour.what_to_bring),
        PONTOS_EMBARQUE: formatBoardingPoints(tour.boarding_points),
        LINK_PAGAMENTO: `${window.location.origin}/reserva/${tour.id}`,
        LINK_ROTEIRO: tour.pdf_file_path ? `${SUPABASE_STORAGE_URL}/${tour.pdf_file_path}` : '',
      };
    });
  };

  const filterRowFields = (row: ExportRow): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const key of selectedFields) {
      result[key] = row[key];
    }
    return result;
  };

  const handleExport = () => {
    const filteredRows = rows.map(filterRowFields);
    const ws = XLSX.utils.json_to_sheet(filteredRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Passeios 2026');
    XLSX.writeFile(wb, 'Camaleao_Passeios_2026.xlsx');
    setDownloaded(true);
  };

  // Map field keys to doc section labels
  const fieldToDocLabel: Partial<Record<ExportFieldKey, string>> = {
    DATA_INICIO: 'Data',
    DURACAO_DIAS: 'Duração',
    CIDADE: 'Local',
    TIPO: 'Tipo',
    VALOR_PIX: 'Valor PIX',
    VALOR_CARTAO: 'Valor Cartão',
    PARCELAMENTO: 'Parcelamento',
    RESUMO: 'Sobre',
    INCLUI: 'O que está incluso',
    NAO_INCLUI: 'O que NÃO está incluso',
    O_QUE_LEVAR: 'O que levar',
    PONTOS_EMBARQUE: 'Pontos de Embarque',
    LINK_PAGAMENTO: 'Link de Reserva',
    LINK_ROTEIRO: 'Link do Roteiro',
  };

  const buildTourDocContent = (tour: TourRow) => {
    const hasPricing = tour.pricing_options && tour.pricing_options.length > 0;
    const duration = calcDuration(tour.start_date, tour.end_date);
    const tipo = duration > 1 ? 'Viagem' : 'Day Use';
    const dateStr = formatDateBR(tour.start_date) + (tour.end_date ? ` a ${formatDateBR(tour.end_date)}` : '');

    const pixPrice = hasPricing
      ? Math.min(...tour.pricing_options.map(p => p.pix_price))
      : (tour.valor_padrao && tour.pix_discount_percent
          ? tour.valor_padrao * (1 - (tour.pix_discount_percent / 100))
          : tour.valor_padrao || 0);
    const cardPrice = hasPricing
      ? Math.min(...tour.pricing_options.map(p => p.card_price))
      : (tour.valor_padrao || 0);

    const formatCurrency = (v: number | string) => typeof v === 'number' ? `R$ ${v.toFixed(2)}` : '';

    const allSections: { key: ExportFieldKey; label: string; value: string }[] = [
      { key: 'DATA_INICIO', label: 'Data', value: dateStr },
      { key: 'DURACAO_DIAS', label: 'Duração', value: `${duration} dia${duration > 1 ? 's' : ''}` },
      { key: 'CIDADE', label: 'Local', value: [tour.city, tour.state].filter(Boolean).join(' - ') },
      { key: 'TIPO', label: 'Tipo', value: tipo },
    ];

    if (typeof pixPrice === 'number' && pixPrice > 0)
      allSections.push({ key: 'VALOR_PIX', label: 'Valor PIX', value: formatCurrency(pixPrice) });
    if (typeof cardPrice === 'number' && cardPrice > 0)
      allSections.push({ key: 'VALOR_CARTAO', label: 'Valor Cartão', value: formatCurrency(cardPrice) });

    if (hasPricing && tour.pricing_options.length > 1) {
      const opts = tour.pricing_options.map(p => `${p.option_name}: PIX ${formatCurrency(p.pix_price)} | Cartão ${formatCurrency(p.card_price)}`).join('\n');

      allSections.push({ key: 'VALOR_PIX', label: 'Opções de Preço', value: opts });
    }

    const numericCard = typeof cardPrice === 'number' ? cardPrice : 0;
    const parcelamento = buildInstallmentString(numericCard, tour.mp_installments_max || 12);
    if (parcelamento) allSections.push({ key: 'PARCELAMENTO', label: 'Parcelamento', value: parcelamento });

    const about = stripHtml(tour.about);
    if (about) allSections.push({ key: 'RESUMO', label: 'Sobre', value: about });

    const includes = stripHtml(tour.includes);
    if (includes) allSections.push({ key: 'INCLUI', label: 'O que está incluso', value: includes });

    const notIncludes = stripHtml(tour.not_includes);
    if (notIncludes) allSections.push({ key: 'NAO_INCLUI', label: 'O que NÃO está incluso', value: notIncludes });

    const whatToBring = stripHtml(tour.what_to_bring);
    if (whatToBring) allSections.push({ key: 'O_QUE_LEVAR', label: 'O que levar', value: whatToBring });

    if (tour.boarding_points && tour.boarding_points.length > 0) {
      const bps = tour.boarding_points.map(p => {
        let s = p.nome;
        if (p.endereco) s += ` — ${p.endereco}`;
        if (p.horario) s += ` (${p.horario})`;
        return s;
      }).join('\n');
      allSections.push({ key: 'PONTOS_EMBARQUE', label: 'Pontos de Embarque', value: bps });
    }

    allSections.push({ key: 'LINK_PAGAMENTO', label: 'Link de Reserva', value: `${window.location.origin}/reserva/${tour.id}` });

    if (tour.pdf_file_path) {
      allSections.push({ key: 'LINK_ROTEIRO', label: 'Link do Roteiro', value: `${SUPABASE_STORAGE_URL}/${tour.pdf_file_path}` });
    }

    // Filter by selected fields
    const filteredSections = allSections.filter(s => selectedFields.includes(s.key));

    return { name: tour.name, sections: filteredSections };
  };

  const handleExportDoc = async () => {
    const toursContent = tours.map(buildTourDocContent);

    const children: Paragraph[] = [
      new Paragraph({
        text: 'Catálogo de Passeios 2026 — Camaleão Ecoturismo',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: `Gerado em ${new Date().toLocaleDateString('pt-BR')} • ${tours.length} passeios`, color: '888888', size: 20 }),
        ],
      }),
    ];

    toursContent.forEach((t, idx) => {
      children.push(
        new Paragraph({
          text: t.name,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '2d6a4f' } },
        })
      );

      t.sections.forEach(s => {
        const lines = s.value.split('\n');
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({ text: `${s.label}: `, bold: true, color: '555555', size: 20 }),
              new TextRun({ text: lines[0], size: 20 }),
            ],
          })
        );
        for (let i = 1; i < lines.length; i++) {
          children.push(
            new Paragraph({
              spacing: { before: 20, after: 20 },
              indent: { left: 360 },
              children: [new TextRun({ text: lines[i], size: 20 })],
            })
          );
        }
      });

      if (idx < toursContent.length - 1) {
        children.push(new Paragraph({ spacing: { before: 200, after: 200 }, text: '' }));
      }
    });

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Camaleao_Passeios_2026.docx');
  };

  const handleExportPdf = () => {
    const toursContent = tours.map(buildTourDocContent);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 15;
    const marginR = 15;
    const maxW = pageW - marginL - marginR;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(45, 106, 79);
    doc.text('Catálogo de Passeios 2026', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Camaleão Ecoturismo • ${tours.length} passeios • ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, y, { align: 'center' });
    y += 12;

    toursContent.forEach((t, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(13);
      doc.setTextColor(45, 106, 79);
      const nameLines = doc.splitTextToSize(t.name, maxW);
      doc.text(nameLines, marginL, y);
      y += nameLines.length * 6 + 2;

      doc.setDrawColor(45, 106, 79);
      doc.setLineWidth(0.3);
      doc.line(marginL, y, pageW - marginR, y);
      y += 4;

      doc.setFontSize(9);
      t.sections.forEach(s => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(100);
        doc.setFont('helvetica', 'bold');
        doc.text(`${s.label}:`, marginL, y);
        const labelW = doc.getTextWidth(`${s.label}: `);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);

        const valueLines = doc.splitTextToSize(s.value, maxW - labelW > 40 ? maxW : maxW);
        if (valueLines.length === 1 && labelW + doc.getTextWidth(s.value) < maxW) {
          doc.text(s.value, marginL + labelW, y);
          y += 5;
        } else {
          y += 4;
          const wrapped = doc.splitTextToSize(s.value, maxW - 4);
          wrapped.forEach((line: string) => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(line, marginL + 4, y);
            y += 4;
          });
          y += 1;
        }
      });

      if (idx < toursContent.length - 1) {
        y += 6;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.line(marginL, y, pageW - marginR, y);
        y += 8;
      }
    });

    doc.save('Camaleao_Passeios_2026.pdf');
  };

  const visibleColumns = selectedFields.filter(f =>
    ['NOME_COMPLETO', 'DATA_INICIO', 'DATA_FIM', 'CIDADE', 'ESTADO', 'TIPO', 'DURACAO_DIAS', 'VALOR_PIX', 'VALOR_CARTAO', 'PONTOS_EMBARQUE', 'LINK_ROTEIRO'].includes(f)
  ) as (keyof ExportRow)[];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Exportar Passeios 2026</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Planilha consolidada para integração com Kommo e outros sistemas
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {status === 'ready' && (
              <>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {tours.length} passeios
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFieldSelector(!showFieldSelector)}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Campos ({selectedFields.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Ocultar' : 'Visualizar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDoc}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  DOCX
                </Button>
                <Button onClick={handleExport} size="sm" className="gap-2">
                  {downloaded ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  {downloaded ? 'Baixar novamente' : 'Baixar .xlsx'}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Field Selector */}
      {status === 'ready' && showFieldSelector && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Selecionar campos para exportação</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>Selecionar todos</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Desmarcar todos</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ALL_EXPORT_FIELDS.map(field => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-2 py-1.5"
                >
                  <Checkbox
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'loading' && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Carregando passeios...</span>
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Erro ao carregar passeios. Tente novamente.</p>
            <Button variant="outline" className="mt-4" onClick={fetchTours}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {status === 'ready' && showPreview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pré-visualização ({rows.length} linhas × {selectedFields.length} colunas)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mostrando colunas principais selecionadas. Os arquivos exportados contêm apenas os campos marcados.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-center">#</TableHead>
                      {visibleColumns.map(col => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">
                          {col.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={row.ID_EVENTO}>
                        <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                        {visibleColumns.map(col => (
                          <TableCell key={col} className="text-xs max-w-[200px] truncate" title={String(row[col])}>
                            {String(row[col] || '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                          Nenhum passeio encontrado para 2026.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {downloaded && (
        <p className="text-sm text-muted-foreground text-center">
          ✅ Arquivo <strong>Camaleao_Passeios_2026.xlsx</strong> baixado com sucesso!
        </p>
      )}
    </div>
  );
}
