import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Package, Tag, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Reserva } from '@/components/ParticipantsTable';
import { mergeAllOptionals, OptionalItem } from '@/lib/optionals';

interface ValorTotalModalProps {
  open: boolean;
  reserva: Reserva | null;
  onClose: () => void;
  onSaveManualTotal: (reservaId: string, valor: number) => Promise<void> | void;
  formatarValor: (value: number) => string;
}

interface PaymentLog {
  id: string;
  event_type: string;
  event_status: string | null;
  raw_data: any;
  created_at: string;
}

const extractOriginalOptionalIds = (logs: PaymentLog[]): Set<string> => {
  const firstApproved = logs.find(l =>
    l.event_status === 'approved' ||
    (l.event_type || '').toLowerCase().includes('approved')
  );
  if (!firstApproved?.raw_data) return new Set();
  const ids = new Set<string>();
  const raw = firstApproved.raw_data as any;
  const items: any[] = Array.isArray(raw?.items) ? raw.items : [];
  items.forEach(it => {
    if (it?.id) ids.add(String(it.id));
    if (it?.optional_id) ids.add(String(it.optional_id));
  });
  const snapshot: any[] = Array.isArray(raw?.selected_optional_items) ? raw.selected_optional_items : [];
  snapshot.forEach(it => { if (it?.id) ids.add(String(it.id)); });
  return ids;
};

const ValorTotalModal: React.FC<ValorTotalModalProps> = ({
  open, reserva, onClose, onSaveManualTotal, formatarValor
}) => {
  const [pricingOptionName, setPricingOptionName] = useState<string | null>(null);
  const [participantOptionals, setParticipantOptionals] = useState<OptionalItem[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [manualValue, setManualValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !reserva?.id) {
      setPricingOptionName(null);
      setParticipantOptionals([]);
      setPaymentLogs([]);
      setIsEditing(false);
      return;
    }

    let cancelled = false;
    Promise.all([
      supabase
        .from('reservation_participants')
        .select('pricing_option_name, selected_optionals, participant_index')
        .eq('reserva_id', reserva.id),
      supabase
        .from('payment_logs')
        .select('id, event_type, event_status, raw_data, created_at')
        .eq('reserva_id', reserva.id)
        .order('created_at', { ascending: true }),
    ]).then(([participantsRes, logsRes]) => {
      if (cancelled) return;
      const participants = participantsRes.data || [];
      const titular = participants.find((p: any) => p.participant_index === 1);
      setPricingOptionName(titular?.pricing_option_name || null);
      const allOpts: OptionalItem[] = [];
      participants.forEach((p: any) => {
        const opts = Array.isArray(p.selected_optionals) ? p.selected_optionals : [];
        opts.forEach((o: any) => allOpts.push({
          id: String(o.id || ''),
          name: o.name || '',
          price: Number(o.price || 0),
          quantity: Number(o.quantity || 1) || 1,
        }));
      });
      setParticipantOptionals(allOpts);
      setPaymentLogs((logsRes.data as PaymentLog[]) || []);
    });
    return () => { cancelled = true; };
  }, [open, reserva?.id]);

  useEffect(() => {
    if (open && reserva) {
      setManualValue((reserva.valor_total_com_opcionais || 0).toFixed(2));
    }
  }, [open, reserva]);

  if (!reserva) return null;

  const reservaOpcionais = mergeAllOptionals(
    reserva.adicionais as any,
    reserva.selected_optional_items as any
  );
  const opcionais: OptionalItem[] = participantOptionals.length > 0
    ? participantOptionals
    : reservaOpcionais;

  const originalIds = extractOriginalOptionalIds(paymentLogs);
  const hasOriginSignal = originalIds.size > 0;

  const valorBase = reserva.valor_passeio || 0;
  const couponDiscount = reserva.coupon_discount || 0;
  const opcionaisTotal = opcionais.reduce((s, o) => s + o.price * o.quantity, 0);
  const totalCalculado = Math.max(0, valorBase - couponDiscount) + opcionaisTotal;
  const valorSalvo = reserva.valor_total_com_opcionais || 0;
  const temOverride = Math.abs(valorSalvo - totalCalculado) > 0.01 && valorSalvo > 0;

  const handleSave = async () => {
    const num = parseFloat(manualValue) || 0;
    setSaving(true);
    try {
      await onSaveManualTotal(reserva.id, num);
      setIsEditing(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Valor Total
            <span className="text-sm font-normal text-muted-foreground">— {reserva.cliente?.nome_completo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Pacote */}
          <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Pacote
              {pricingOptionName && <span className="text-foreground font-medium ml-1">{pricingOptionName}</span>}
            </span>
            <span className="font-medium">{formatarValor(valorBase)}</span>
          </div>

          {/* Cupom */}
          {couponDiscount > 0 && (
            <div className="flex justify-between items-center p-2 bg-emerald-50 rounded">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Tag className="h-3.5 w-3.5" />
                Cupom {reserva.coupon_code ? `(${reserva.coupon_code})` : ''}
              </span>
              <span className="font-medium text-emerald-700">- {formatarValor(couponDiscount)}</span>
            </div>
          )}

          {/* Opcionais */}
          {opcionais.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide px-1 pt-1">
                Opcionais
              </div>
              {opcionais.map((opt, idx) => {
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
              })}
            </div>
          )}

          {/* Total calculado */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
            <span className="text-sm text-blue-700 font-medium">Total calculado</span>
            <span className="text-lg font-bold text-blue-800">{formatarValor(totalCalculado)}</span>
          </div>

          {/* Valor salvo / override */}
          <div className={`p-3 rounded-lg border ${temOverride ? 'bg-amber-50 border-amber-200' : 'bg-muted/30'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${temOverride ? 'text-amber-800' : ''}`}>
                  Valor salvo
                </span>
                {temOverride && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                    Personalizado
                  </Badge>
                )}
              </div>
              {!isEditing && (
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 gap-1">
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Digite o novo valor total (R$). Este valor substitui o calculado automaticamente.
                </Label>
                <Input
                  type="number" step="0.01"
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  autoFocus
                />
              </div>
            ) : (
              <div className="text-lg font-bold">{formatarValor(valorSalvo)}</div>
            )}
          </div>

          {temOverride && !isEditing && (
            <p className="text-xs text-muted-foreground text-center">
              O valor salvo difere do calculado. Edite para ajustar ou use o cálculo automático.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setManualValue(valorSalvo.toFixed(2));
              }} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ValorTotalModal;
