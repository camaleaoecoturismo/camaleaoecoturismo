import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ChevronRight, ChevronLeft, Download, Loader2, DollarSign, RefreshCw, CreditCard, XCircle } from 'lucide-react';
import { Tour } from '@/hooks/useTours';
import { Reserva } from '@/components/ParticipantsTable';
import * as XLSX from 'xlsx';

type Treatment = 'reembolso' | 'credito' | 'transferencia';

interface ReservaTreatment {
  reservaId: string;
  clienteId: string;
  clienteName: string;
  whatsapp: string;
  valorPago: number;
  treatment: Treatment;
  targetTourId: string;
  targetTourName: string;
  targetTourValorPadrao: number;
}

interface SunkCost {
  id: string;
  product_service: string;
  unit_value: number;
  quantity: number;
  valor_pago: number | null;
  is_sunk_cost: boolean;
}

interface CancelTourModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  tour: Tour;
  reservas: Reserva[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CancelTourModal: React.FC<CancelTourModalProps> = ({
  open, onClose, onConfirmed, tour, reservas,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [reason, setReason] = useState('');
  const [treatments, setTreatments] = useState<ReservaTreatment[]>([]);
  const [sunkCosts, setSunkCosts] = useState<SunkCost[]>([]);
  const [activeTours, setActiveTours] = useState<Tour[]>([]);
  const [processing, setProcessing] = useState(false);

  const activeReservas = reservas.filter(r => r.status !== 'cancelado');

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setReason('');

    // Init treatments
    setTreatments(
      activeReservas.map(r => ({
        reservaId: r.id,
        clienteId: r.cliente.id,
        clienteName: r.cliente.nome_completo,
        whatsapp: r.cliente.whatsapp,
        valorPago: r.valor_pago,
        treatment: 'reembolso',
        targetTourId: '',
        targetTourName: '',
        targetTourValorPadrao: 0,
      }))
    );

    // Fetch tour costs
    supabase
      .from('tour_costs')
      .select('id, product_service, unit_value, quantity, valor_pago, is_sunk_cost')
      .eq('tour_id', tour.id)
      .then(({ data }) => {
        setSunkCosts((data || []).map(c => ({ ...c, is_sunk_cost: c.is_sunk_cost ?? false })));
      });

    // Fetch other active tours for transfer
    supabase
      .from('tours')
      .select('id, name, start_date, valor_padrao, is_cancelled, is_active, pricing_options:tour_pricing_options(*)')
      .eq('is_active', true)
      .eq('is_cancelled', false)
      .neq('id', tour.id)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setActiveTours((data || []) as any);
      });
  }, [open]);

  const setTreatmentField = (reservaId: string, field: Partial<ReservaTreatment>) => {
    setTreatments(prev => prev.map(t => t.reservaId === reservaId ? { ...t, ...field } : t));
  };

  const toggleSunkCost = (id: string) => {
    setSunkCosts(prev => prev.map(c => c.id === id ? { ...c, is_sunk_cost: !c.is_sunk_cost } : c));
  };

  // Financial summary
  const totalReembolso = treatments.filter(t => t.treatment === 'reembolso').reduce((s, t) => s + t.valorPago, 0);
  const totalCredito = treatments.filter(t => t.treatment === 'credito').reduce((s, t) => s + t.valorPago, 0);
  const totalTransferencia = treatments.filter(t => t.treatment === 'transferencia').reduce((s, t) => s + t.valorPago, 0);
  const totalSunkCosts = sunkCosts.filter(c => c.is_sunk_cost).reduce((s, c) => s + (c.valor_pago ?? c.unit_value * c.quantity), 0);

  const canProceedStep2 = treatments.every(t =>
    t.treatment !== 'transferencia' || t.targetTourId !== ''
  );

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      for (const t of treatments) {
        if (t.treatment === 'reembolso') {
          await supabase.from('reservas').update({
            status: 'cancelado',
            motivo_cancelamento: 'passeio_cancelado',
            data_cancelamento: now,
            refund_amount: t.valorPago,
            refund_date: now,
            refund_reason: `Passeio cancelado: ${tour.name}`,
          }).eq('id', t.reservaId);

        } else if (t.treatment === 'credito') {
          await supabase.from('reservas').update({
            status: 'cancelado',
            motivo_cancelamento: 'passeio_cancelado',
            data_cancelamento: now,
          }).eq('id', t.reservaId);

          await supabase.from('client_credits').insert({
            cliente_id: t.clienteId,
            amount: t.valorPago,
            original_value: t.valorPago,
            transaction_type: 'credit',
            reason: `Passeio cancelado: ${tour.name}`,
            tour_id: tour.id,
            tour_name: tour.name,
            reserva_id: t.reservaId,
            expires_at: expiresAt,
            created_by: 'admin',
          });

        } else if (t.treatment === 'transferencia') {
          // Fetch old reserva details
          const { data: oldReserva } = await supabase
            .from('reservas')
            .select('*, reservation_participants(*)')
            .eq('id', t.reservaId)
            .single();

          if (!oldReserva) continue;

          const isPaid = t.valorPago >= t.targetTourValorPadrao;
          const newReservaNum = `CAM${Date.now().toString().slice(-8)}`;

          const { data: newReserva } = await supabase.from('reservas').insert({
            cliente_id: t.clienteId,
            tour_id: t.targetTourId,
            status: isPaid ? 'confirmado' : 'pendente',
            payment_status: isPaid ? 'pago' : 'pendente',
            valor_passeio: t.targetTourValorPadrao,
            valor_pago: t.valorPago,
            valor_total_com_opcionais: t.targetTourValorPadrao,
            numero_participantes: oldReserva.numero_participantes,
            data_reserva: now,
            data_pagamento: isPaid ? now : null,
            data_confirmacao: isPaid ? now : null,
            reserva_numero: newReservaNum,
            observacoes: `Transferido do passeio "${tour.name}" cancelado em ${new Date(now).toLocaleDateString('pt-BR')}. ${!isPaid ? `Saldo devedor: ${fmt(t.targetTourValorPadrao - t.valorPago)}` : ''}`,
            payment_method: oldReserva.payment_method,
            capture_method: 'manual',
          }).select().single();

          if (newReserva && oldReserva.reservation_participants?.length) {
            const newParticipants = oldReserva.reservation_participants.map((p: any) => ({
              reserva_id: newReserva.id,
              participant_index: p.participant_index,
              nome_completo: p.nome_completo,
              cpf: p.cpf,
              data_nascimento: p.data_nascimento,
              whatsapp: p.whatsapp,
              email: p.email,
              problema_saude: p.problema_saude,
              descricao_problema_saude: p.descricao_problema_saude,
              contato_emergencia_nome: p.contato_emergencia_nome,
              contato_emergencia_telefone: p.contato_emergencia_telefone,
              nivel_condicionamento: p.nivel_condicionamento,
              assistencia_diferenciada: p.assistencia_diferenciada,
              descricao_assistencia_diferenciada: p.descricao_assistencia_diferenciada,
              plano_saude: p.plano_saude,
              nome_plano_saude: p.nome_plano_saude,
              ponto_embarque_id: null, // Different tour, fill manually
              ponto_embarque_personalizado: null,
              is_staff: p.is_staff,
              staff_role: p.staff_role,
              pricing_option_id: null,
              pricing_option_name: null,
            }));
            await supabase.from('reservation_participants').insert(newParticipants);
          }

          // Cancel old reserva
          await supabase.from('reservas').update({
            status: 'cancelado',
            motivo_cancelamento: 'transferencia_passeio',
            data_cancelamento: now,
            observacoes: `Transferido para passeio "${t.targetTourName}" (reserva ${newReservaNum})`,
          }).eq('id', t.reservaId);
        }
      }

      // Cancel all tickets for this tour
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('tour_id', tour.id);

      // Auto-create refund cost entries so devoluções aparecem no financeiro do passeio
      const refundTreatments = treatments.filter(t => t.treatment === 'reembolso' && t.valorPago > 0);
      if (refundTreatments.length > 0) {
        await supabase.from('tour_costs').insert(
          refundTreatments.map((t, i) => ({
            tour_id: tour.id,
            product_service: `Devolução — ${t.clienteName}`,
            quantity: 1,
            unit_value: t.valorPago,
            valor_pago: t.valorPago,
            expense_type: 'devolucao',
            order_index: 9000 + i,
            auto_scale_participants: false,
          }))
        );
      }

      // Mark sunk costs
      const sunkIds = sunkCosts.filter(c => c.is_sunk_cost).map(c => c.id);
      if (sunkIds.length > 0) {
        await supabase.from('tour_costs').update({ is_sunk_cost: true }).in('id', sunkIds);
      }

      // Mark tour as cancelled
      await supabase.from('tours').update({
        is_cancelled: true,
        cancelled_at: now,
        cancellation_reason: reason,
        is_active: false,
        vagas_fechadas: true,
      }).eq('id', tour.id);

      toast({ title: 'Passeio cancelado com sucesso.' });
      onConfirmed();
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro ao cancelar passeio', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleExportReport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Relatório de Cancelamento de Passeio'],
      [],
      ['Passeio', tour.name],
      ['Data de início', tour.start_date],
      ['Data do cancelamento', new Date().toLocaleDateString('pt-BR')],
      ['Motivo', reason],
      [],
      ['Resumo Financeiro'],
      ['Total a reembolsar', fmt(totalReembolso)],
      ['Total em crédito (12 meses)', fmt(totalCredito)],
      ['Total transferido', fmt(totalTransferencia)],
      ['Custos irrecuperáveis', fmt(totalSunkCosts)],
      ['Prejuízo líquido', fmt(totalSunkCosts - 0)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumo');

    // Sheet 2: Per-client
    const clientData = [
      ['Cliente', 'WhatsApp', 'Valor Pago', 'Tratamento', 'Novo Passeio'],
      ...treatments.map(t => [
        t.clienteName,
        t.whatsapp,
        t.valorPago,
        t.treatment === 'reembolso' ? 'Reembolso total'
          : t.treatment === 'credito' ? 'Crédito (12 meses)'
          : `Transferência → ${t.targetTourName}`,
        t.targetTourName || '-',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clientData), 'Clientes');

    // Sheet 3: Costs
    const costsData = [
      ['Custo', 'Quantidade', 'Valor Unit.', 'Valor Pago', 'Irrecuperável?'],
      ...sunkCosts.map(c => [
        c.product_service,
        c.quantity,
        c.unit_value,
        c.valor_pago ?? c.unit_value * c.quantity,
        c.is_sunk_cost ? 'Sim' : 'Não',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(costsData), 'Custos');

    XLSX.writeFile(wb, `cancelamento-${tour.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancelar Passeio — {tour.name}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {([1, 2, 3, 4] as const).map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors ${
                  step === s ? 'bg-destructive text-white border-destructive'
                  : step > s ? 'bg-green-600 text-white border-green-600'
                  : 'text-muted-foreground border-muted'
                }`}>{s}</div>
                {s < 4 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-green-600' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-0 pt-0.5">
            <span>Motivo</span><span>Clientes</span><span>Custos</span><span>Resumo</span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto pr-1">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Atenção: ação irreversível</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Isso irá cancelar <strong>{activeReservas.length} reserva(s)</strong>, invalidar
                    todos os ingressos e marcar o passeio como cancelado. Você ainda poderá exportar um
                    relatório completo antes de confirmar.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do cancelamento *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento do passeio..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Defina o tratamento para cada cliente. Todos os pontos de embarque de transferências
                ficarão em branco para preenchimento manual.
              </p>
              {treatments.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">
                  Nenhuma reserva ativa neste passeio.
                </p>
              )}
              {treatments.map(t => (
                <div key={t.reservaId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.clienteName}</p>
                      <p className="text-xs text-muted-foreground">{t.whatsapp}</p>
                    </div>
                    <Badge variant="outline">{fmt(t.valorPago)}</Badge>
                  </div>
                  <RadioGroup
                    value={t.treatment}
                    onValueChange={v => setTreatmentField(t.reservaId, { treatment: v as Treatment })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="reembolso" id={`r-${t.reservaId}`} />
                      <Label htmlFor={`r-${t.reservaId}`} className="font-normal text-xs cursor-pointer flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Reembolso
                      </Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="credito" id={`c-${t.reservaId}`} />
                      <Label htmlFor={`c-${t.reservaId}`} className="font-normal text-xs cursor-pointer flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Crédito
                      </Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="transferencia" id={`t-${t.reservaId}`} />
                      <Label htmlFor={`t-${t.reservaId}`} className="font-normal text-xs cursor-pointer flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Transferência
                      </Label>
                    </div>
                  </RadioGroup>
                  {t.treatment === 'transferencia' && (
                    <Select
                      value={t.targetTourId}
                      onValueChange={v => {
                        const target = activeTours.find(tt => tt.id === v);
                        setTreatmentField(t.reservaId, {
                          targetTourId: v,
                          targetTourName: target?.name ?? '',
                          targetTourValorPadrao: target?.valor_padrao ?? 0,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o passeio destino..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTours.map(tt => (
                          <SelectItem key={tt.id} value={tt.id} className="text-xs">
                            {tt.name} — {new Date(tt.start_date).toLocaleDateString('pt-BR')} — {fmt(tt.valor_padrao ?? 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {t.treatment === 'transferencia' && t.targetTourId && (
                    <p className={`text-xs ${t.valorPago >= t.targetTourValorPadrao ? 'text-green-600' : 'text-orange-600'}`}>
                      {t.valorPago >= t.targetTourValorPadrao
                        ? `Valor suficiente → reserva confirmada automaticamente`
                        : `Falta ${fmt(t.targetTourValorPadrao - t.valorPago)} → reserva ficará pendente`}
                    </p>
                  )}
                  {t.treatment === 'credito' && (
                    <p className="text-xs text-blue-600">
                      Crédito de {fmt(t.valorPago)} válido por 12 meses a partir de hoje.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Marque os custos que já foram pagos e são irrecuperáveis (ex: tráfego pago, reservas não reembolsáveis).
              </p>
              {sunkCosts.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">
                  Nenhum custo cadastrado para este passeio.
                </p>
              )}
              {sunkCosts.map(c => (
                <div key={c.id} className="flex items-center gap-3 border rounded-lg p-3">
                  <Checkbox
                    id={`sc-${c.id}`}
                    checked={c.is_sunk_cost}
                    onCheckedChange={() => toggleSunkCost(c.id)}
                  />
                  <Label htmlFor={`sc-${c.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium text-sm">{c.product_service}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {c.quantity}x {fmt(c.unit_value)}
                      {c.valor_pago ? ` (pago: ${fmt(c.valor_pago)})` : ''}
                    </span>
                  </Label>
                  <Badge variant={c.is_sunk_cost ? 'destructive' : 'outline'} className="text-xs">
                    {fmt(c.valor_pago ?? c.unit_value * c.quantity)}
                  </Badge>
                </div>
              ))}
              {totalSunkCosts > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-destructive">
                    Total irrecuperável: {fmt(totalSunkCosts)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">A reembolsar</p>
                  <p className="text-lg font-bold text-green-600">{fmt(totalReembolso)}</p>
                  <p className="text-xs text-muted-foreground">{treatments.filter(t => t.treatment === 'reembolso').length} cliente(s)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Em crédito</p>
                  <p className="text-lg font-bold text-blue-600">{fmt(totalCredito)}</p>
                  <p className="text-xs text-muted-foreground">{treatments.filter(t => t.treatment === 'credito').length} cliente(s)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Transferências</p>
                  <p className="text-lg font-bold text-orange-600">{fmt(totalTransferencia)}</p>
                  <p className="text-xs text-muted-foreground">{treatments.filter(t => t.treatment === 'transferencia').length} cliente(s)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Custos irrecuperáveis</p>
                  <p className="text-lg font-bold text-destructive">{fmt(totalSunkCosts)}</p>
                  <p className="text-xs text-muted-foreground">{sunkCosts.filter(c => c.is_sunk_cost).length} item(s)</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="font-medium">Passeio:</span> {tour.name}</p>
                <p><span className="font-medium">Motivo:</span> {reason}</p>
                <p><span className="font-medium">Reservas afetadas:</span> {activeReservas.length}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportReport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar relatório (.xlsx) antes de confirmar
              </Button>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((step - 1) as any)} disabled={processing}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((step + 1) as any)}
                disabled={
                  (step === 1 && !reason.trim()) ||
                  (step === 2 && !canProceedStep2)
                }
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleConfirm} disabled={processing}>
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</> : 'Confirmar Cancelamento'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelTourModal;
