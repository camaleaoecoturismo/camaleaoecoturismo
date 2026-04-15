import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus, Trash2, ChevronDown, ChevronRight, ExternalLink, CreditCard, Wallet,
  Package, Tag, Receipt, Clock, AlertCircle, CheckCircle2, RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Reserva } from '@/components/ParticipantsTable';
import { mergeAllOptionals, OptionalItem } from '@/lib/optionals';

interface Pagamento {
  id: string;
  valor: number;
  data: string;
  forma: string;
  isNew?: boolean;
}

interface PaymentLog {
  id: string;
  reserva_id: string;
  event_type: string;
  event_status: string | null;
  event_message: string | null;
  amount: number | null;
  refund_amount: number | null;
  payment_method: string | null;
  raw_data: any;
  created_at: string;
}

interface PaymentOriginModalProps {
  open: boolean;
  reserva: Reserva | null;
  pagamentos: Pagamento[];
  onClose: () => void;
  onAddPagamento: () => void;
  onUpdatePagamento: (pagamentoId: string, campo: keyof Pagamento, valor: any) => void;
  onRemovePagamento: (pagamentoId: string) => void;
  onSave: () => void;
  formatarValor: (value: number) => string;
  calcularValorTotal: (reserva: Reserva) => number;
  calcularValorPagoBruto: (reserva: Reserva) => number;
  calcularTotalPago: () => number;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch { return '—'; }
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const formatFormaPagamento = (reserva: Reserva): string => {
  const capture = reserva.capture_method;
  if (capture === 'credit_card') {
    const n = reserva.installments || 1;
    return n > 1 ? `Cartão de Crédito (${n}x)` : 'Cartão de Crédito';
  }
  if (capture === 'pix') return 'PIX';
  const pm = (reserva.payment_method || '').toLowerCase();
  if (pm.includes('card') || pm.includes('cartao') || pm.includes('cartão')) return 'Cartão';
  if (pm.includes('pix')) return 'PIX';
  if (pm.includes('dinheiro')) return 'Dinheiro';
  if (pm.includes('transfer')) return 'Transferência';
  return reserva.payment_method || '—';
};

const statusBadge = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s === 'confirmada' || s === 'confirmado')
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Confirmada</Badge>;
  if (s === 'cancelada' || s === 'cancelado')
    return <Badge variant="destructive">Cancelada</Badge>;
  if (s === 'pendente')
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

/**
 * Extract optional item IDs from a payment log's raw_data.
 * Handles InfinitePay webhook format (`raw_data.items[]`) where optional items
 * are usually added as separate line items with `id` matching the tour_optional_items.id.
 */
const extractOriginalOptionalIds = (logs: PaymentLog[]): Set<string> => {
  const firstApproved = logs.find(l =>
    l.event_status === 'approved' ||
    (l.event_type || '').toLowerCase().includes('approved')
  );
  if (!firstApproved?.raw_data) return new Set();

  const ids = new Set<string>();
  const raw = firstApproved.raw_data as any;

  // InfinitePay / generic gateway format
  const items: any[] = Array.isArray(raw?.items) ? raw.items : [];
  items.forEach(it => {
    if (it?.id) ids.add(String(it.id));
    // Some webhooks store optional IDs under additional_info or meta
    if (it?.optional_id) ids.add(String(it.optional_id));
  });

  // Also check metadata for a snapshot of selected_optional_items
  const snapshot: any[] = Array.isArray(raw?.selected_optional_items)
    ? raw.selected_optional_items
    : [];
  snapshot.forEach(it => {
    if (it?.id) ids.add(String(it.id));
  });

  return ids;
};

const PaymentOriginModal: React.FC<PaymentOriginModalProps> = ({
  open, reserva, pagamentos, onClose,
  onAddPagamento, onUpdatePagamento, onRemovePagamento, onSave,
  formatarValor, calcularValorTotal, calcularValorPagoBruto, calcularTotalPago
}) => {
  const [pricingOptionName, setPricingOptionName] = useState<string | null>(null);
  const [participantOptionals, setParticipantOptionals] = useState<OptionalItem[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [openOrigem, setOpenOrigem] = useState(true);
  const [openOpcionais, setOpenOpcionais] = useState(true);
  const [openParcelas, setOpenParcelas] = useState(true);
  const [openHistorico, setOpenHistorico] = useState(false);

  useEffect(() => {
    if (!open || !reserva?.id) {
      setPricingOptionName(null);
      setParticipantOptionals([]);
      setPaymentLogs([]);
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);

    Promise.all([
      supabase
        .from('reservation_participants')
        .select('pricing_option_name, selected_optionals, participant_index')
        .eq('reserva_id', reserva.id),
      supabase
        .from('payment_logs')
        .select('*')
        .eq('reserva_id', reserva.id)
        .order('created_at', { ascending: true }),
    ]).then(([participantsRes, logsRes]) => {
      if (cancelled) return;

      const participants = participantsRes.data || [];
      const titular = participants.find((p: any) => p.participant_index === 1);
      setPricingOptionName(titular?.pricing_option_name || null);

      const allParticipantOpts: OptionalItem[] = [];
      participants.forEach((p: any) => {
        const opts = Array.isArray(p.selected_optionals) ? p.selected_optionals : [];
        opts.forEach((o: any) => allParticipantOpts.push({
          id: String(o.id || ''),
          name: o.name || '',
          price: Number(o.price || 0),
          quantity: Number(o.quantity || 1) || 1,
        }));
      });
      setParticipantOptionals(allParticipantOpts);

      setPaymentLogs((logsRes.data as PaymentLog[]) || []);
      setLoadingDetails(false);
    }).catch(() => {
      if (!cancelled) setLoadingDetails(false);
    });

    return () => { cancelled = true; };
  }, [open, reserva?.id]);

  if (!reserva) return null;

  const reservaOpcionais = mergeAllOptionals(
    reserva.adicionais as any,
    reserva.selected_optional_items as any
  );

  // Prefer per-participant optionals when present; otherwise fall back to reserva-level
  const opcionais: OptionalItem[] = participantOptionals.length > 0
    ? participantOptionals
    : reservaOpcionais;

  const originalIds = extractOriginalOptionalIds(paymentLogs);
  const hasOriginSignal = originalIds.size > 0;

  const valorTotal = calcularValorTotal(reserva);
  const valorPagoLiquido = calcularValorPagoBruto(reserva);
  const saldo = valorTotal - valorPagoLiquido;
  const totalParcelasComTaxas = calcularTotalPago();
  const temTaxas = Math.abs(totalParcelasComTaxas - valorPagoLiquido) > 0.01 && totalParcelasComTaxas > 0;

  const cancelada = reserva.status === 'cancelada' || reserva.status === 'cancelado';
  const refundValor = reserva.refund_amount || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>Pagamento</span>
            {reserva.reserva_numero && (
              <span className="text-sm text-muted-foreground font-normal">#{reserva.reserva_numero}</span>
            )}
            <span className="text-sm text-muted-foreground font-normal">— {reserva.cliente?.nome_completo}</span>
            {statusBadge(reserva.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timeline — marcos principais */}
          <div className="flex flex-wrap gap-3 text-xs pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Reserva:</span>
              <span className="font-medium">{formatDate(reserva.data_reserva)}</span>
            </div>
            {reserva.data_pagamento && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="font-medium">{formatDate(reserva.data_pagamento)}</span>
              </div>
            )}
            {cancelada && reserva.data_cancelamento && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Cancelamento:</span>
                <span className="font-medium">{formatDate(reserva.data_cancelamento)}</span>
              </div>
            )}
            {reserva.refund_date && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Reembolso:</span>
                <span className="font-medium">{formatDate(reserva.refund_date)}</span>
              </div>
            )}
          </div>

          {/* Origem do Pagamento */}
          <Collapsible open={openOrigem} onOpenChange={setOpenOrigem} className="border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-t-lg">
              <div className="flex items-center gap-2 font-medium">
                <Receipt className="h-4 w-4" />
                Origem do Pagamento
              </div>
              {openOrigem ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Package className="h-3.5 w-3.5" /> Pacote
                </span>
                <span className="font-medium">{pricingOptionName || '—'}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Valor do passeio</span>
                <span className="font-medium">{formatarValor(reserva.valor_passeio || 0)}</span>
              </div>
              {!!reserva.coupon_discount && reserva.coupon_discount > 0 && (
                <div className="flex justify-between items-center p-2 bg-emerald-50 rounded">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Tag className="h-3.5 w-3.5" />
                    Cupom {reserva.coupon_code ? `(${reserva.coupon_code})` : ''}
                  </span>
                  <span className="font-medium text-emerald-700">- {formatarValor(reserva.coupon_discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {reserva.capture_method === 'credit_card' ? <CreditCard className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                  Forma de pagamento
                </span>
                <span className="font-medium">{formatFormaPagamento(reserva)}</span>
              </div>
              {!!reserva.card_fee_amount && reserva.card_fee_amount > 0 && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Taxa do cartão</span>
                  <span className="font-medium">{formatarValor(reserva.card_fee_amount)}</span>
                </div>
              )}
              {(reserva as any).receipt_url && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Comprovante</span>
                  <a
                    href={(reserva as any).receipt_url}
                    target="_blank" rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Ver comprovante <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {((reserva as any).infinitepay_invoice_slug || (reserva as any).infinitepay_transaction_nsu) && (
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  {(reserva as any).infinitepay_invoice_slug && (
                    <div>Invoice: <span className="font-mono">{(reserva as any).infinitepay_invoice_slug}</span></div>
                  )}
                  {(reserva as any).infinitepay_transaction_nsu && (
                    <div>NSU: <span className="font-mono">{(reserva as any).infinitepay_transaction_nsu}</span></div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Opcionais */}
          <Collapsible open={openOpcionais} onOpenChange={setOpenOpcionais} className="border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-t-lg">
              <div className="flex items-center gap-2 font-medium">
                <Package className="h-4 w-4" />
                Opcionais {opcionais.length > 0 && <span className="text-muted-foreground font-normal">({opcionais.length})</span>}
              </div>
              {openOpcionais ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2 text-sm">
              {opcionais.length === 0 ? (
                <p className="text-muted-foreground text-center py-2">Nenhum opcional incluído</p>
              ) : (
                opcionais.map((opt, idx) => {
                  const wasIncluded = hasOriginSignal && originalIds.has(String(opt.id));
                  return (
                    <div key={`${opt.id}-${idx}`} className="flex justify-between items-center p-2 bg-muted/30 rounded gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{opt.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatarValor(opt.price)}{opt.quantity > 1 ? ` × ${opt.quantity}` : ''}
                        </div>
                      </div>
                      {hasOriginSignal && (
                        wasIncluded ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0 text-[10px]">
                            Incluso no pagamento
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0 text-[10px]">
                            Adicionado depois
                          </Badge>
                        )
                      )}
                      <span className="font-medium shrink-0">{formatarValor(opt.price * opt.quantity)}</span>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Reembolso (conditional) */}
          {refundValor > 0 && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-orange-900">
                <RotateCcw className="h-4 w-4" />
                Reembolso
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Valor</span>
                <span className="font-medium text-orange-900">{formatarValor(refundValor)}</span>
              </div>
              {reserva.refund_date && (
                <div className="flex justify-between">
                  <span className="text-orange-700">Data</span>
                  <span className="font-medium text-orange-900">{formatDate(reserva.refund_date)}</span>
                </div>
              )}
              {reserva.refund_reason && (
                <div className="flex justify-between gap-3">
                  <span className="text-orange-700 shrink-0">Motivo</span>
                  <span className="font-medium text-orange-900 text-right">{reserva.refund_reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Parcelas (editable) */}
          <Collapsible open={openParcelas} onOpenChange={setOpenParcelas} className="border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-t-lg">
              <div className="flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4" />
                Parcelas de Pagamento <span className="text-muted-foreground font-normal">({pagamentos.length})</span>
              </div>
              {openParcelas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-3">
              <div className="flex justify-end">
                <Button onClick={onAddPagamento} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Parcela
                </Button>
              </div>

              {pagamentos.map((pagamento, index) => (
                <div key={pagamento.id} className="grid grid-cols-5 gap-3 items-center p-3 border rounded-lg bg-muted/20">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Parcela</label>
                    <div className="text-sm font-semibold mt-0.5">{index + 1}</div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valor</label>
                    <Input
                      type="number" step="0.01"
                      value={pagamento.valor}
                      onChange={e => onUpdatePagamento(pagamento.id, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="R$ 0,00" className="mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Data</label>
                    <Input
                      type="date" value={pagamento.data}
                      onChange={e => onUpdatePagamento(pagamento.id, 'data', e.target.value)}
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Forma</label>
                    <Select value={pagamento.forma} onValueChange={v => onUpdatePagamento(pagamento.id, 'forma', v)}>
                      <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => onRemovePagamento(pagamento.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Total Pago</span>
                  <div className="text-base font-bold text-emerald-800 mt-0.5">{formatarValor(valorPagoLiquido)}</div>
                  <div className="text-xs text-emerald-600">{pagamentos.length} parcela(s)</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xs text-blue-700 font-medium uppercase tracking-wide">Valor Total</span>
                  <div className="text-base font-bold text-blue-800 mt-0.5">{formatarValor(valorTotal)}</div>
                </div>
                <div className={`p-3 rounded-lg border ${saldo <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${saldo <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {saldo <= 0 ? 'Quitado' : 'Saldo Restante'}
                  </span>
                  <div className={`text-base font-bold mt-0.5 ${saldo <= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                    {saldo <= 0 ? 'R$ 0,00' : formatarValor(saldo)}
                  </div>
                </div>
              </div>

              {temTaxas && (
                <p className="text-xs text-muted-foreground text-right">
                  Cobrado ao cliente (com taxas): {formatarValor(totalParcelasComTaxas)}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Histórico de Eventos */}
          <Collapsible open={openHistorico} onOpenChange={setOpenHistorico} className="border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-t-lg">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4" />
                Histórico de Eventos <span className="text-muted-foreground font-normal">({paymentLogs.length})</span>
              </div>
              {openHistorico ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              {loadingDetails ? (
                <p className="text-muted-foreground text-sm py-2 text-center">Carregando...</p>
              ) : paymentLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2 text-center">Nenhum evento registrado pelo gateway</p>
              ) : (
                <div className="space-y-2">
                  {paymentLogs.map(log => {
                    const isApproved = log.event_status === 'approved' || (log.event_type || '').includes('approved');
                    const isFailed = log.event_status === 'failed' || log.event_status === 'rejected';
                    const Icon = isApproved ? CheckCircle2 : isFailed ? AlertCircle : Clock;
                    const color = isApproved ? 'text-emerald-600' : isFailed ? 'text-red-600' : 'text-muted-foreground';
                    return (
                      <div key={log.id} className="flex items-start gap-2 p-2 bg-muted/20 rounded text-xs">
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium">{log.event_type}</span>
                            <span className="text-muted-foreground">{formatDateTime(log.created_at)}</span>
                          </div>
                          {log.event_message && (
                            <p className="text-muted-foreground mt-0.5">{log.event_message}</p>
                          )}
                          {!!log.amount && log.amount > 0 && (
                            <p className="text-muted-foreground">Valor: {formatarValor(log.amount)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Salvar Pagamentos</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentOriginModal;
