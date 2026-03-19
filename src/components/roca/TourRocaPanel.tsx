import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Shield, Play, RefreshCw, Download, XCircle, Trash2, Loader2, CheckCircle, AlertTriangle, FileText, FileSpreadsheet, Search, Clock, Pause, Timer } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";

async function callRocaApi(action: string, params: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/roca-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg',
    },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

async function downloadRocaFile(action: string, params: any, filename: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/roca-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg',
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro no download' }));
    throw new Error(err.error || 'Erro');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface TourRocaPanelProps {
  tourId: string;
  tourName: string;
  tourStartDate: string;
  tourEndDate?: string | null;
  tourCity?: string;
  tourState?: string;
  tourDescription?: string | null;
}

interface RocaParticipant {
  id: string;
  cpf: string;
  nome: string | null;
  status: string;
  token_participante: string | null;
  sent_at: string | null;
  last_sync_at: string | null;
  error_message: string | null;
}

export function TourRocaPanel({ tourId, tourName, tourStartDate, tourEndDate, tourCity, tourState, tourDescription }: TourRocaPanelProps) {
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<RocaParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoTime, setAutoTime] = useState('20:00');
  const [autoCountdown, setAutoCountdown] = useState('');
  const [countdownPast, setCountdownPast] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: eventData } = await supabase
      .from('trip_roca_event')
      .select('*')
      .eq('trip_id', tourId)
      .single();
    setEvent(eventData);

    const { data: partData } = await supabase
      .from('trip_roca_participant')
      .select('*')
      .eq('trip_id', tourId)
      .order('nome', { ascending: true });
    setParticipants((partData || []) as RocaParticipant[]);
    setLoading(false);
  }, [tourId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load auto-execution settings
  useEffect(() => {
    const loadAutoSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/roca-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg',
        },
        body: JSON.stringify({ action: 'get_settings' }),
      });
      const result = await res.json();
      if (result.settings) {
        setAutoEnabled(result.settings.auto_execute_enabled ?? true);
        setAutoTime(result.settings.auto_execute_time ?? '20:00');
      }
    };
    loadAutoSettings();
  }, []);

  // Countdown timer - based on the eve of THIS tour's start date
  useEffect(() => {
    if (!autoEnabled) { setAutoCountdown(''); return; }
    const calc = () => {
      const now = new Date();
      const [h, m] = autoTime.split(':').map(Number);
      
      // Target is the eve of the tour (day before start_date) at autoTime
      const tourDate = new Date(tourStartDate + 'T12:00:00');
      const eveDate = new Date(tourDate);
      eveDate.setDate(eveDate.getDate() - 1);
      eveDate.setHours(h, m, 0, 0);
      
      if (eveDate <= now) {
        // Already past the eve execution time
        setCountdownPast(true);
        setAutoCountdown('');
        return;
      }
      
      setCountdownPast(false);
      const diff = eveDate.getTime() - now.getTime();
      const days = Math.floor(diff / 86400000);
      const hh = Math.floor((diff % 86400000) / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      
      if (days > 0) {
        setAutoCountdown(`${days}d ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
      } else {
        setAutoCountdown(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
      }
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [autoTime, autoEnabled, tourStartDate]);

  const handleToggleAutoFromTour = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    const result = await callRocaApi('save_settings', { carta_oferta: '', auto_execute_enabled: enabled });
    if (result.success) {
      toast.success(enabled ? 'Execução automática ativada' : 'Execução automática pausada');
    } else {
      setAutoEnabled(!enabled);
      toast.error('Erro ao atualizar');
    }
  };

  const getConfirmedParticipants = async () => {
    // Get all confirmed reservations for this tour
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, cliente_id, numero_participantes, clientes!fk_reservas_cliente(nome_completo, cpf, email, whatsapp, data_nascimento)')
      .eq('tour_id', tourId)
      .in('status', ['confirmada', 'confirmado'])
      .in('payment_status', ['pago', 'confirmed']);

    console.log('[Roca] Reservas query:', { tourId, count: reservas?.length, error: reservasError });

    if (!reservas || reservas.length === 0) {
      console.log('[Roca] Nenhuma reserva confirmada encontrada para tour_id:', tourId);
      return [];
    }

    const allParticipants: any[] = [];
    let index = 1;

    for (const r of reservas) {
      const cliente = (r as any).clientes;
      if (!cliente) {
        console.log('[Roca] Reserva sem cliente:', r.id);
        continue;
      }

      // Check if reservation has entries in reservation_participants
      const { data: rpEntries } = await supabase
        .from('reservation_participants')
        .select('nome_completo, cpf, data_nascimento, email, whatsapp')
        .eq('reserva_id', r.id)
        .eq('is_staff', false);

      if (rpEntries && rpEntries.length > 0) {
        // Use reservation_participants entries (they already include the primary)
        for (const rp of rpEntries) {
          allParticipants.push({
            dados: {
              numeroInscricao: String(index).padStart(3, '0'),
              nome: rp.nome_completo || cliente.nome_completo,
              cpf: ((rp as any).cpf || cliente.cpf || '').replace(/\D/g, ''),
              dataNascimento: (rp as any).data_nascimento || cliente.data_nascimento,
              email: (rp as any).email || cliente.email,
              telefone: ((rp as any).whatsapp || cliente.whatsapp || '').replace(/\D/g, ''),
              estrangeiro: 'N',
              numeroPassaporte: '',
              nacionalidade: 'Brasil',
            },
          });
          index++;
        }
      } else {
        // No reservation_participants, use the primary client only
        allParticipants.push({
          dados: {
            numeroInscricao: String(index).padStart(3, '0'),
            nome: cliente.nome_completo,
            cpf: (cliente.cpf || '').replace(/\D/g, ''),
            dataNascimento: cliente.data_nascimento,
            email: cliente.email,
            telefone: (cliente.whatsapp || '').replace(/\D/g, ''),
            estrangeiro: 'N',
            numeroPassaporte: '',
            nacionalidade: 'Brasil',
          },
        });
        index++;
      }
    }

    console.log('[Roca] Total participantes encontrados:', allParticipants.length);
    return allParticipants;
  };

  const validateParticipant = (p: any) => {
    const d = p.dados;
    const errors: string[] = [];
    if (!d.nome || d.nome.trim().length < 2) errors.push('nome');
    if (!d.cpf || d.cpf.replace(/\D/g, '').length !== 11) errors.push('cpf');
    if (!d.dataNascimento) errors.push('dataNascimento');
    if (!d.email || !d.email.includes('@')) errors.push('email');
    if (!d.telefone || d.telefone.replace(/\D/g, '').length < 10) errors.push('telefone');
    return errors;
  };

  const handleExecuteAuto = async () => {
    setExecuting(true);
    setSummary(null);

    try {
      // Step 1: Get participants
      const allParts = await getConfirmedParticipants();

      if (allParts.length === 0) {
        toast.info('Nenhum participante confirmado encontrado para este passeio');
        setSummary({ total_confirmed: 0, total_sent: 0, total_active: 0, total_errors: 0, invalid: [] });
        setExecuting(false);
        return;
      }

      // Filter already active
      const activeCpfs = new Set(
        participants.filter(p => p.status === 'ATIVO').map(p => p.cpf)
      );
      const toSend = allParts.filter(p => !activeCpfs.has(p.dados.cpf));

      // Validate
      const valid: any[] = [];
      const invalid: any[] = [];
      for (const p of toSend) {
        const errs = validateParticipant(p);
        if (errs.length > 0) {
          invalid.push({ nome: p.dados.nome, cpf: p.dados.cpf, errors: errs });
        } else {
          valid.push(p);
        }
      }

      console.log('[Roca] Fluxo:', { total: allParts.length, toSend: toSend.length, valid: valid.length, invalid: invalid.length });

      // Step 2: Create event or add participants
      if (!event?.token_evento || event?.status === 'CANCELADO') {
        // Create event with participants
        const nomeEvento = `${tourName} | ${tourStartDate}`;
        const result = await callRocaApi('create_event', {
          trip_id: tourId,
          dados: {
            nomeEvento,
            dataInicio: tourStartDate,
            dataFinal: tourEndDate || tourStartDate,
            horaInicio: '06:00:00',
            localEvento: tourCity && tourState ? `${tourCity}/${tourState}` : tourCity || 'Brasil',
            descricao: tourDescription ? tourDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().substring(0, 200) : nomeEvento,
          },
          participantes: valid,
        });

        if (!result.success) {
          toast.error('Erro ao criar evento na Roca');
          setSummary({ error: true, message: result.error || 'Erro desconhecido', invalid });
          setExecuting(false);
          await loadData();
          return;
        }

        toast.success('Evento criado com sucesso!');
      } else {
        // Add only new participants
        if (valid.length > 0) {
          // Send in batches of 20
          for (let i = 0; i < valid.length; i += 20) {
            const batch = valid.slice(i, i + 20);
            await callRocaApi('add_participants', {
              token_evento: event.token_evento,
              trip_id: tourId,
              participantes: batch,
            });
          }
          toast.success(`${valid.length} participantes enviados`);
        }
      }

      // Step 3: Sync participants
      await loadData();
      const updatedEvent = (await supabase.from('trip_roca_event').select('token_evento').eq('trip_id', tourId).single()).data;
      if (updatedEvent?.token_evento) {
        setSyncing(true);
        const syncResult = await callRocaApi('sync_participants', {
          token_evento: updatedEvent.token_evento,
          trip_id: tourId,
        });
        setSyncing(false);

        setSummary({
          total_confirmed: allParts.length,
          total_sent: valid.length,
          total_active: syncResult.total_found || 0,
          total_errors: invalid.length,
          invalid,
        });
      }

      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado');
    }

    setExecuting(false);
  };

  const handleSync = async () => {
    if (!event?.token_evento) return;
    setSyncing(true);
    const result = await callRocaApi('sync_participants', {
      token_evento: event.token_evento,
      trip_id: tourId,
    });
    if (result.success) {
      toast.success(`${result.total_synced} participantes sincronizados`);
    }
    await loadData();
    setSyncing(false);
  };

  const handleResendAll = async () => {
    const allParts = await getConfirmedParticipants();
    const valid = allParts.filter(p => validateParticipant(p).length === 0);

    if (valid.length === 0) { toast.info('Nenhum participante para reenviar'); return; }

    setExecuting(true);
    for (let i = 0; i < valid.length; i += 20) {
      const batch = valid.slice(i, i + 20);
      await callRocaApi('add_participants', {
        token_evento: event.token_evento,
        trip_id: tourId,
        participantes: batch,
      });
    }
    toast.success(`${valid.length} participantes reenviados`);
    await handleSync();
    setExecuting(false);
  };

  const handleCancelParticipant = async (p: RocaParticipant) => {
    if (!p.token_participante) { toast.error('Token do participante não disponível'); return; }
    const result = await callRocaApi('cancel_participant', {
      token_participante: p.token_participante,
      trip_id: tourId,
      cpf: p.cpf,
    });
    if (result.success) toast.success('Participante cancelado');
    else toast.error('Erro ao cancelar');
    await loadData();
  };

  const handleDeleteParticipant = async (p: RocaParticipant) => {
    if (!p.token_participante) { toast.error('Token do participante não disponível'); return; }
    const result = await callRocaApi('delete_participant', {
      token_participante: p.token_participante,
      trip_id: tourId,
      cpf: p.cpf,
    });
    if (result.success) toast.success('Participante excluído');
    else toast.error('Erro ao excluir');
    await loadData();
  };

  const handleCancelEvent = async () => {
    if (!event?.token_evento) return;
    const result = await callRocaApi('cancel_event', {
      token_evento: event.token_evento,
      trip_id: tourId,
    });
    if (result.success) toast.success('Evento cancelado na Roca');
    else toast.error('Erro ao cancelar evento');
    await loadData();
  };


  const handleDownloadPdf = async () => {
    if (!event?.token_evento) return;
    try {
      await downloadRocaFile('download_pdf', { token_evento: event.token_evento }, `comprovante-roca-${tourName}.pdf`);
      toast.success('PDF baixado');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDownloadXls = async () => {
    if (!event?.token_evento) return;
    try {
      await downloadRocaFile('download_xls', { token_evento: event.token_evento }, `participantes-roca-${tourName}.xls`);
      toast.success('XLS baixado');
    } catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ATIVO: 'bg-green-100 text-green-800',
      ENVIADO: 'bg-blue-100 text-blue-800',
      PENDENTE: 'bg-yellow-100 text-yellow-800',
      CANCELADO: 'bg-red-100 text-red-800',
      EXCLUIDO: 'bg-gray-100 text-gray-800',
      ERRO: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const activeCount = participants.filter(p => p.status === 'ATIVO').length;
  const errorCount = participants.filter(p => p.status === 'ERRO').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Seguro Aventura (Roca)</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {event?.status && statusBadge(event.status)}
              {event?.token_evento && (
                <span className="text-xs text-muted-foreground font-mono">{event.token_evento.substring(0, 12)}...</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-execution banner */}
          {!event?.token_evento || event?.status !== 'ATIVO' ? (
            <div className={`flex items-center justify-between p-3 rounded-lg border ${autoEnabled ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center gap-3">
                {autoEnabled ? (
                  <>
                    <Timer className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {countdownPast
                          ? `Já executou na véspera às ${autoTime}`
                          : `Execução automática na véspera em ${autoCountdown}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const tourDate = new Date(tourStartDate + 'T12:00:00');
                          const eveDate = new Date(tourDate);
                          eveDate.setDate(eveDate.getDate() - 1);
                          const eveStr = eveDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                          return countdownPast 
                            ? `Seguro processado automaticamente`
                            : `Será executado em ${eveStr} às ${autoTime} (BRT)`;
                        })()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Automação pausada</p>
                      <p className="text-xs text-muted-foreground">Execute manualmente ou reative a automação</p>
                    </div>
                  </>
                )}
              </div>
              <Switch
                checked={autoEnabled}
                onCheckedChange={handleToggleAutoFromTour}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExecuteAuto} disabled={executing || syncing} className="gap-2">
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {event?.token_evento && event?.status !== 'CANCELADO' ? 'Enviar novos participantes' : 'Executar seguro automaticamente'}
            </Button>

            {event?.token_evento && event?.status !== 'CANCELADO' && (
              <>
                <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sincronizar
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadXls} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> XLS
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                      <XCircle className="h-4 w-4" /> Cancelar Evento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar evento na Roca?</AlertDialogTitle>
                      <AlertDialogDescription>Isso cancelará o evento e o seguro de todos os participantes.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Não</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelEvent}>Sim, cancelar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

          </div>

          {event?.token_evento && event?.status !== 'CANCELADO' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground">
                  Reenviar todos (forçar)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reenviar todos os participantes?</AlertDialogTitle>
                  <AlertDialogDescription>Isso reenviará todos os participantes confirmados, incluindo os já ativos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResendAll}>Reenviar todos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div><div className="text-2xl font-bold">{summary.total_confirmed}</div><div className="text-xs text-muted-foreground">Confirmados</div></div>
              <div><div className="text-2xl font-bold text-blue-600">{summary.total_sent}</div><div className="text-xs text-muted-foreground">Enviados</div></div>
              <div><div className="text-2xl font-bold text-green-600">{summary.total_active}</div><div className="text-xs text-muted-foreground">Ativos na Roca</div></div>
              <div><div className="text-2xl font-bold text-red-600">{summary.total_errors}</div><div className="text-xs text-muted-foreground">Erros</div></div>
            </div>
            {summary.invalid && summary.invalid.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">Participantes com dados incompletos:</p>
                {summary.invalid.map((inv: any, i: number) => (
                  <p key={i} className="text-xs text-red-700">
                    {inv.nome || inv.cpf} — faltam: {inv.errors.join(', ')}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participants Table */}
      {participants.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Participantes ({participants.length})
                {activeCount > 0 && <span className="text-green-600 ml-2">• {activeCount} ativos</span>}
                {errorCount > 0 && <span className="text-red-600 ml-2">• {errorCount} erros</span>}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.nome || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{p.cpf}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-xs">{p.sent_at ? new Date(p.sent_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {p.status === 'ATIVO' && p.token_participante && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600"><XCircle className="h-3 w-3 mr-1" /> Cancelar</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar seguro de {p.nome}?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Não</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelParticipant(p)}>Cancelar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {p.token_participante && p.status !== 'EXCLUIDO' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600"><Trash2 className="h-3 w-3 mr-1" /> Excluir</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir {p.nome} da Roca?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Não</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteParticipant(p)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {p.error_message && (
                            <span className="text-xs text-red-500" title={p.error_message}>
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
