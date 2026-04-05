import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, LineChart, Loader2, MousePointerClick, Search, Sparkles, Target, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type SearchConsoleImportBatch = {
  id: string;
  report_start_date: string;
  report_end_date: string;
  source_file: string | null;
  rows_imported: number;
  created_at: string;
};

type SearchConsoleMetric = {
  id: string;
  batch_id: string;
  page_url: string;
  page_path: string;
  query_text: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type AnalyticsSession = {
  id: string;
  referer_domain: string | null;
  utm_source: string | null;
  converted: boolean | null;
};

type AnalyticsPageview = {
  session_id: string;
  page_path: string;
  viewed_at: string;
  clicked_main_cta: boolean | null;
  cta_type: string | null;
  scroll_depth_percent: number | null;
  time_on_page_seconds: number | null;
};

type AnalyticsEvent = {
  session_id: string;
  event_name: string;
  event_label: string | null;
};

type LandingPageRow = {
  pagePath: string;
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  organicSessions: number;
  ctaSessions: number;
  modalSessions: number;
  conversions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
};

type QueryRow = {
  query: string;
  pagePath: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type OpportunityRow = {
  pagePath: string;
  type: string;
  headline: string;
  recommendation: string;
};

const GOOGLE_REFERER_MATCHERS = ['google.', 'google.com', 'google.com.br'];

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatNumber = (value: number) => value.toLocaleString('pt-BR');
const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '/';

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://www.camaleaoecoturismo.com.br');
    return url.pathname || '/';
  } catch {
    if (trimmed.startsWith('/')) return trimmed;
    return `/${trimmed.replace(/^\/+/, '')}`;
  }
};

const parseNumericValue = (value: unknown, percent = false) => {
  if (typeof value === 'number') return percent ? value * 100 : value;
  const stringValue = String(value ?? '').trim();
  if (!stringValue) return 0;

  const withoutPercent = stringValue.replace('%', '').trim();
  const normalized = withoutPercent.includes(',') && !withoutPercent.includes('.')
    ? withoutPercent.replace(',', '.')
    : withoutPercent.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getHeaderValue = (record: Record<string, unknown>, matcher: (normalized: string) => boolean) => {
  const key = Object.keys(record).find((entry) => matcher(normalizeText(entry)));
  return key ? record[key] : undefined;
};

const findPageValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) =>
    header.includes('pagina') ||
    header.includes('page') ||
    header.includes('top pages')
  );

const findQueryValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) =>
    header.includes('consulta') ||
    header.includes('query') ||
    header.includes('top queries')
  );

const findClicksValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) => header.includes('clique') || header === 'clicks');

const findImpressionsValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) => header.includes('impress') || header === 'impressions');

const findCtrValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) => header === 'ctr');

const findPositionValue = (record: Record<string, unknown>) =>
  getHeaderValue(record, (header) => header.includes('posicao') || header.includes('position'));

const isOrganicGoogleSession = (session: AnalyticsSession) => {
  const referer = normalizeText(session.referer_domain || '');
  const utm = normalizeText(session.utm_source || '');
  return GOOGLE_REFERER_MATCHERS.some((matcher) => referer.includes(matcher)) || utm === 'google';
};

const AnalyticsSeoConversion: React.FC = () => {
  const { toast } = useToast();
  const [importBatches, setImportBatches] = useState<SearchConsoleImportBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [landingRows, setLandingRows] = useState<LandingPageRow[]>([]);
  const [queryRows, setQueryRows] = useState<QueryRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [summary, setSummary] = useState({
    clicks: 0,
    impressions: 0,
    ctr: 0,
    organicSessions: 0,
    conversions: 0,
    ctaRate: 0,
  });

  const selectedBatch = useMemo(
    () => importBatches.find((batch) => batch.id === selectedBatchId) || null,
    [importBatches, selectedBatchId]
  );

  const fetchImportBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('search_console_import_batches')
      .select('id, report_start_date, report_end_date, source_file, rows_imported, created_at')
      .order('report_end_date', { ascending: false });

    if (error) {
      console.error('Error fetching Search Console batches:', error);
      toast({
        title: 'Erro ao carregar importações',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const batches = (data || []) as SearchConsoleImportBatch[];
    setImportBatches(batches);

    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [selectedBatchId, toast]);

  useEffect(() => {
    fetchImportBatches().finally(() => setLoading(false));
  }, [fetchImportBatches, refreshKey]);

  const recomputeDashboard = useCallback(async () => {
    if (!selectedBatch) {
      setLandingRows([]);
      setQueryRows([]);
      setOpportunities([]);
      setSummary({
        clicks: 0,
        impressions: 0,
        ctr: 0,
        organicSessions: 0,
        conversions: 0,
        ctaRate: 0,
      });
      return;
    }

    setLoading(true);
    try {
      const [{ data: metricsData, error: metricsError }, { data: sessionsData, error: sessionsError }] = await Promise.all([
        supabase
          .from('search_console_metrics')
          .select('id, batch_id, page_url, page_path, query_text, clicks, impressions, ctr, position')
          .eq('batch_id', selectedBatch.id),
        supabase
          .from('analytics_sessions')
          .select('id, referer_domain, utm_source, converted')
          .gte('first_visit_at', `${selectedBatch.report_start_date}T00:00:00.000Z`)
          .lte('first_visit_at', `${selectedBatch.report_end_date}T23:59:59.999Z`),
      ]);

      if (metricsError) throw metricsError;
      if (sessionsError) throw sessionsError;

      const allSessions = (sessionsData || []) as AnalyticsSession[];
      const organicSessions = allSessions.filter(isOrganicGoogleSession);
      const organicSessionIds = organicSessions.map((session) => session.id);

      const [{ data: pageviewsData, error: pageviewsError }, { data: eventsData, error: eventsError }] = await Promise.all([
        organicSessionIds.length > 0
          ? supabase
              .from('analytics_pageviews')
              .select('session_id, page_path, viewed_at, clicked_main_cta, cta_type, scroll_depth_percent, time_on_page_seconds')
              .in('session_id', organicSessionIds)
              .order('viewed_at', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        organicSessionIds.length > 0
          ? supabase
              .from('analytics_events')
              .select('session_id, event_name, event_label')
              .in('session_id', organicSessionIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (pageviewsError) throw pageviewsError;
      if (eventsError) throw eventsError;

      const metrics = (metricsData || []) as SearchConsoleMetric[];
      const pageviews = (pageviewsData || []) as AnalyticsPageview[];
      const events = (eventsData || []) as AnalyticsEvent[];

      const sessionsMap = new Map(organicSessions.map((session) => [session.id, session]));
      const pageviewsBySession = new Map<string, AnalyticsPageview[]>();
      const reservaModalSessions = new Set(
        events
          .filter((event) => event.event_name === 'modal_open' && event.event_label === 'reserva')
          .map((event) => event.session_id)
      );

      pageviews.forEach((pageview) => {
        const list = pageviewsBySession.get(pageview.session_id) || [];
        list.push(pageview);
        pageviewsBySession.set(pageview.session_id, list);
      });

      const landingStats = new Map<string, Omit<LandingPageRow, 'clicks' | 'impressions' | 'ctr' | 'position' | 'pageUrl'>>();
      pageviewsBySession.forEach((sessionPageviews, sessionId) => {
        if (sessionPageviews.length === 0) return;
        const landing = sessionPageviews[0];
        const stats = landingStats.get(landing.page_path) || {
          pagePath: landing.page_path,
          organicSessions: 0,
          ctaSessions: 0,
          modalSessions: 0,
          conversions: 0,
          avgScrollDepth: 0,
          avgTimeOnPage: 0,
        };

        stats.organicSessions += 1;
        stats.avgScrollDepth += landing.scroll_depth_percent || 0;
        stats.avgTimeOnPage += landing.time_on_page_seconds || 0;

        if (sessionPageviews.some((pageview) => pageview.clicked_main_cta)) {
          stats.ctaSessions += 1;
        }
        if (reservaModalSessions.has(sessionId)) {
          stats.modalSessions += 1;
        }
        if (sessionsMap.get(sessionId)?.converted) {
          stats.conversions += 1;
        }

        landingStats.set(landing.page_path, stats);
      });

      const metricByPage = new Map<string, { pageUrl: string; clicks: number; impressions: number; weightedPosition: number }>();
      metrics.forEach((metric) => {
        const existing = metricByPage.get(metric.page_path) || {
          pageUrl: metric.page_url,
          clicks: 0,
          impressions: 0,
          weightedPosition: 0,
        };
        existing.pageUrl = existing.pageUrl || metric.page_url;
        existing.clicks += metric.clicks;
        existing.impressions += metric.impressions;
        existing.weightedPosition += metric.position * metric.impressions;
        metricByPage.set(metric.page_path, existing);
      });

      const combinedPaths = new Set<string>([
        ...Array.from(metricByPage.keys()),
        ...Array.from(landingStats.keys()),
      ]);

      const nextLandingRows = Array.from(combinedPaths)
        .map((pagePath) => {
          const metric = metricByPage.get(pagePath);
          const stats = landingStats.get(pagePath);
          const clicks = metric?.clicks || 0;
          const impressions = metric?.impressions || 0;
          const organicSessionsCount = stats?.organicSessions || 0;

          return {
            pagePath,
            pageUrl: metric?.pageUrl || `https://www.camaleaoecoturismo.com.br${pagePath}`,
            clicks,
            impressions,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            position: impressions > 0 ? (metric?.weightedPosition || 0) / impressions : 0,
            organicSessions: organicSessionsCount,
            ctaSessions: stats?.ctaSessions || 0,
            modalSessions: stats?.modalSessions || 0,
            conversions: stats?.conversions || 0,
            avgScrollDepth: organicSessionsCount > 0 ? (stats?.avgScrollDepth || 0) / organicSessionsCount : 0,
            avgTimeOnPage: organicSessionsCount > 0 ? (stats?.avgTimeOnPage || 0) / organicSessionsCount : 0,
          };
        })
        .sort((a, b) => {
          if (b.clicks !== a.clicks) return b.clicks - a.clicks;
          return b.organicSessions - a.organicSessions;
        });

      const nextQueryRows = metrics
        .filter((metric) => metric.query_text.trim())
        .reduce<Map<string, QueryRow>>((acc, metric) => {
          const key = `${metric.query_text}__${metric.page_path}`;
          const existing = acc.get(key) || {
            query: metric.query_text,
            pagePath: metric.page_path,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
          };
          existing.clicks += metric.clicks;
          existing.impressions += metric.impressions;
          existing.position += metric.position * metric.impressions;
          acc.set(key, existing);
          return acc;
        }, new Map())
        .values();

      const normalizedQueryRows = Array.from(nextQueryRows)
        .map((row) => ({
          ...row,
          ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
          position: row.impressions > 0 ? row.position / row.impressions : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 12);

      const nextOpportunities: OpportunityRow[] = [];
      nextLandingRows.forEach((row) => {
        const ctaRate = row.organicSessions > 0 ? (row.ctaSessions / row.organicSessions) * 100 : 0;
        const conversionRate = row.organicSessions > 0 ? (row.conversions / row.organicSessions) * 100 : 0;

        if (row.impressions >= 150 && row.ctr < 2.5) {
          nextOpportunities.push({
            pagePath: row.pagePath,
            type: 'CTR baixo',
            headline: 'A página aparece bastante, mas recebe poucos cliques.',
            recommendation: 'Revisar título SEO, meta description e promessa principal da página.',
          });
        }

        if (row.position > 0 && row.position <= 12 && row.clicks < 20) {
          nextOpportunities.push({
            pagePath: row.pagePath,
            type: 'Quase na 1ª página',
            headline: 'A página já está próxima de ranquear melhor.',
            recommendation: 'Fortalecer conteúdo, FAQs, links internos e sinais de autoridade dessa página.',
          });
        }

        if (row.organicSessions >= 15 && ctaRate < 12) {
          nextOpportunities.push({
            pagePath: row.pagePath,
            type: 'Baixa intenção na página',
            headline: 'A pessoa entra, mas quase não avança para reservar.',
            recommendation: 'Reforçar CTA, prova social, clareza da oferta e encaixe do passeio com a busca.',
          });
        }

        if (row.ctaSessions >= 5 && conversionRate < 3) {
          nextOpportunities.push({
            pagePath: row.pagePath,
            type: 'Gargalo de conversão',
            headline: 'Existe interesse, mas poucas reservas são concluídas.',
            recommendation: 'Investigar atrito no modal de reserva, perguntas, preço ou percepção de risco.',
          });
        }
      });

      const totalClicks = nextLandingRows.reduce((sum, row) => sum + row.clicks, 0);
      const totalImpressions = nextLandingRows.reduce((sum, row) => sum + row.impressions, 0);
      const totalOrganicSessions = nextLandingRows.reduce((sum, row) => sum + row.organicSessions, 0);
      const totalConversions = nextLandingRows.reduce((sum, row) => sum + row.conversions, 0);
      const totalCtas = nextLandingRows.reduce((sum, row) => sum + row.ctaSessions, 0);

      setLandingRows(nextLandingRows);
      setQueryRows(normalizedQueryRows);
      setOpportunities(nextOpportunities.slice(0, 10));
      setSummary({
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        organicSessions: totalOrganicSessions,
        conversions: totalConversions,
        ctaRate: totalOrganicSessions > 0 ? (totalCtas / totalOrganicSessions) * 100 : 0,
      });
    } catch (error: any) {
      console.error('Error computing SEO dashboard:', error);
      toast({
        title: 'Erro ao montar dashboard SEO',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, toast]);

  useEffect(() => {
    recomputeDashboard();
  }, [recomputeDashboard]);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!importStartDate || !importEndDate) {
      toast({
        title: 'Informe o período do relatório',
        description: 'Preencha data inicial e final antes de importar.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (!rows.length) {
        throw new Error('O arquivo está vazio ou não possui linhas válidas.');
      }

      const parsedRows = rows
        .map((row) => {
          const pageValue = String(findPageValue(row) ?? '').trim();
          const queryValue = String(findQueryValue(row) ?? '').trim();
          const clicksValue = parseNumericValue(findClicksValue(row));
          const impressionsValue = parseNumericValue(findImpressionsValue(row));
          const ctrValue = parseNumericValue(findCtrValue(row), true);
          const positionValue = parseNumericValue(findPositionValue(row));

          if (!pageValue || (!clicksValue && !impressionsValue)) return null;

          return {
            page_url: pageValue,
            page_path: normalizePath(pageValue),
            query_text: queryValue,
            clicks: Math.round(clicksValue),
            impressions: Math.round(impressionsValue),
            ctr: ctrValue,
            position: positionValue,
          };
        })
        .filter(Boolean) as Array<{
          page_url: string;
          page_path: string;
          query_text: string;
          clicks: number;
          impressions: number;
          ctr: number;
          position: number;
        }>;

      if (!parsedRows.length) {
        throw new Error('Não consegui reconhecer as colunas do arquivo do Search Console.');
      }

      const { data: batchData, error: batchError } = await supabase
        .from('search_console_import_batches')
        .insert({
          report_start_date: importStartDate,
          report_end_date: importEndDate,
          source_file: file.name,
          notes: notes || null,
          rows_imported: parsedRows.length,
        })
        .select('id')
        .single();

      if (batchError) throw batchError;

      const metricsPayload = parsedRows.map((row) => ({
        batch_id: batchData.id,
        ...row,
      }));

      const { error: metricsError } = await supabase
        .from('search_console_metrics')
        .insert(metricsPayload);

      if (metricsError) throw metricsError;

      toast({
        title: 'Relatório importado',
        description: `${parsedRows.length} linha(s) do Search Console foram adicionadas.`,
      });

      setNotes('');
      setSelectedBatchId(batchData.id);
      setRefreshKey((current) => current + 1);
    } catch (error: any) {
      console.error('Error importing Search Console file:', error);
      toast({
        title: 'Erro ao importar arquivo',
        description: error.message || 'Verifique o formato do relatório.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const metricCards = [
    {
      label: 'Cliques orgânicos',
      value: formatNumber(summary.clicks),
      icon: Search,
      helper: 'Vindo do Search Console',
    },
    {
      label: 'Impressões',
      value: formatNumber(summary.impressions),
      icon: LineChart,
      helper: 'Total do relatório importado',
    },
    {
      label: 'CTR orgânico',
      value: formatPercent(summary.ctr),
      icon: Sparkles,
      helper: 'Cliques / impressões',
    },
    {
      label: 'Sessões orgânicas',
      value: formatNumber(summary.organicSessions),
      icon: Target,
      helper: 'Sessões com entrada do Google',
    },
    {
      label: 'Taxa de CTA',
      value: formatPercent(summary.ctaRate),
      icon: MousePointerClick,
      helper: 'Sessões orgânicas com CTA',
    },
    {
      label: 'Conversões',
      value: formatNumber(summary.conversions),
      icon: Target,
      helper: 'Reservas concluídas',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Search Console
          </CardTitle>
          <CardDescription>
            Importe um export do Search Console em CSV/XLSX e cruze com o comportamento real do site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sc-start-date">Data inicial do relatório</Label>
              <Input id="sc-start-date" type="date" value={importStartDate} onChange={(e) => setImportStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-end-date">Data final do relatório</Label>
              <Input id="sc-end-date" type="date" value={importEndDate} onChange={(e) => setImportEndDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sc-notes">Observação da importação</Label>
              <Input
                id="sc-notes"
                placeholder="Ex.: Export de páginas do último mês"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              O ideal é importar o mesmo período que você vai analisar no painel, para cruzar com as sessões reais do site.
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFile}
                disabled={importing}
                className="max-w-[320px]"
              />
              {importing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatório ativo</CardTitle>
          <CardDescription>
            Escolha qual importação do Search Console será usada como base do cruzamento com sessões e conversões.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full max-w-[420px]">
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma importação" />
              </SelectTrigger>
              <SelectContent>
                {importBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {format(new Date(`${batch.report_start_date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                    {format(new Date(`${batch.report_end_date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
                    {' · '}
                    {batch.source_file || 'Importação manual'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBatch && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{selectedBatch.rows_imported} linhas</Badge>
              <Badge variant="outline">
                {format(new Date(`${selectedBatch.report_start_date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                {format(new Date(`${selectedBatch.report_end_date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
              </Badge>
              {selectedBatch.source_file && <Badge variant="outline">{selectedBatch.source_file}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-start justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Landing Pages Orgânicas</CardTitle>
          <CardDescription>
            Aqui entra a lógica principal: Search Console mostra a descoberta no Google, e o analytics do site mostra o que aconteceu depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando dados...
            </div>
          ) : landingRows.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              Importe um relatório do Search Console para começar a cruzar SEO com comportamento real do site.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Posição</TableHead>
                    <TableHead className="text-right">Sessões orgânicas</TableHead>
                    <TableHead className="text-right">CTA</TableHead>
                    <TableHead className="text-right">Modal reserva</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landingRows.slice(0, 12).map((row) => (
                    <TableRow key={row.pagePath}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{row.pagePath}</div>
                          <div className="text-xs text-muted-foreground">{row.pageUrl}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                      <TableCell className="text-right">{formatPercent(row.ctr)}</TableCell>
                      <TableCell className="text-right">{row.position ? row.position.toFixed(1) : '-'}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.organicSessions)}</TableCell>
                      <TableCell className="text-right">
                        {row.organicSessions > 0 ? formatPercent((row.ctaSessions / row.organicSessions) * 100) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(row.modalSessions)}</TableCell>
                      <TableCell className="text-right">
                        {row.organicSessions > 0 ? formatPercent((row.conversions / row.organicSessions) * 100) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Consultas com Potencial</CardTitle>
            <CardDescription>
              Consultas do Search Console ajudam a entender o que as pessoas estão procurando antes de entrar no site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consulta</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Esse arquivo não trouxe consultas ou ainda não há dados suficientes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    queryRows.map((row) => (
                      <TableRow key={`${row.query}-${row.pagePath}`}>
                        <TableCell className="font-medium">{row.query}</TableCell>
                        <TableCell>{row.pagePath}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                        <TableCell className="text-right">{formatPercent(row.ctr)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oportunidades SEO</CardTitle>
            <CardDescription>
              Lista priorizada para decidir se o próximo ajuste é de snippet, conteúdo, CTA ou conversão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Quando existirem páginas com sinais claros de gargalo, elas vão aparecer aqui.
              </div>
            ) : (
              opportunities.map((item, index) => (
                <div key={`${item.pagePath}-${item.type}-${index}`} className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">{item.type}</Badge>
                    <span className="text-sm font-medium">{item.pagePath}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.headline}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.recommendation}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsSeoConversion;
