import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Tag, Pencil, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Reserva } from '@/components/ParticipantsTable';
import { mergeAllOptionals, OptionalItem } from '@/lib/optionals';

interface ValorTotalModalProps {
  open: boolean;
  reserva: Reserva | null;
  onClose: () => void;
  formatarValor: (value: number) => string;
  onSaveDesconto?: (reservaId: string, couponCode: string | null, couponDiscount: number) => Promise<void> | void;
}

const ValorTotalModal: React.FC<ValorTotalModalProps> = ({
  open, reserva, onClose, formatarValor, onSaveDesconto
}) => {
  const [pricingOptionName, setPricingOptionName] = useState<string | null>(null);
  const [participantOptionals, setParticipantOptionals] = useState<OptionalItem[]>([]);

  const [editingDesconto, setEditingDesconto] = useState(false);
  const [descontoInput, setDescontoInput] = useState('');
  const [cupomInput, setCupomInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !reserva?.id) {
      setPricingOptionName(null);
      setParticipantOptionals([]);
      setEditingDesconto(false);
      return;
    }

    setDescontoInput((reserva.coupon_discount || 0).toFixed(2));
    setCupomInput(reserva.coupon_code || '');

    let cancelled = false;
    supabase
      .from('reservation_participants')
      .select('pricing_option_name, selected_optionals, participant_index, is_staff')
      .eq('reserva_id', reserva.id)
      .then(({ data }) => {
        if (cancelled) return;
        const participants = data || [];
        const titular = participants.find((p: any) => p.participant_index === 1);
        setPricingOptionName(titular?.pricing_option_name || null);

        const allOpts: OptionalItem[] = [];
        participants
          .filter((p: any) => !p.is_staff)
          .forEach((p: any) => {
            const opts = Array.isArray(p.selected_optionals) ? p.selected_optionals : [];
            opts.forEach((o: any) => allOpts.push({
              id: String(o.id || ''),
              name: o.name || '',
              price: Number(o.price || 0),
              quantity: Number(o.quantity || 1) || 1,
            }));
          });
        setParticipantOptionals(allOpts);
      });

    return () => { cancelled = true; };
  }, [open, reserva?.id, reserva?.coupon_discount, reserva?.coupon_code]);

  if (!reserva) return null;

  const reservaOpcionais = mergeAllOptionals(
    reserva.adicionais as any,
    reserva.selected_optional_items as any
  );
  const opcionais: OptionalItem[] = participantOptionals.length > 0
    ? participantOptionals
    : reservaOpcionais;

  const valorBase = reserva.valor_passeio || 0;
  const couponDiscount = reserva.coupon_discount || 0;
  const opcionaisTotal = opcionais.reduce((s, o) => s + o.price * o.quantity, 0);
  const baseComDesconto = Math.max(0, valorBase - couponDiscount);
  const total = baseComDesconto + opcionaisTotal;

  const handleSaveDesconto = async () => {
    if (!onSaveDesconto) return;
    const valor = parseFloat(descontoInput) || 0;
    const code = cupomInput.trim() || null;
    setSaving(true);
    try {
      await onSaveDesconto(reserva.id, code, valor);
      setEditingDesconto(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDesconto = async () => {
    if (!onSaveDesconto) return;
    setSaving(true);
    try {
      await onSaveDesconto(reserva.id, null, 0);
      setEditingDesconto(false);
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

          {/* Cupom — visualização ou edição */}
          {editingDesconto ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-emerald-700">Código do cupom</Label>
                  <Input
                    value={cupomInput}
                    onChange={e => setCupomInput(e.target.value)}
                    placeholder="(opcional)"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-emerald-700">Desconto (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={descontoInput}
                    onChange={e => setDescontoInput(e.target.value)}
                    placeholder="0,00"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                {couponDiscount > 0 && (
                  <Button size="sm" variant="ghost" onClick={handleRemoveDesconto} disabled={saving}>
                    Remover
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditingDesconto(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveDesconto} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : couponDiscount > 0 ? (
            <div className="flex justify-between items-center p-2 bg-emerald-50 rounded gap-2">
              <span className="flex items-center gap-1.5 text-emerald-700 flex-1">
                <Tag className="h-3.5 w-3.5" />
                Cupom {reserva.coupon_code ? `(${reserva.coupon_code})` : ''}
              </span>
              <span className="font-medium text-emerald-700">- {formatarValor(couponDiscount)}</span>
              {onSaveDesconto && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-700" onClick={() => setEditingDesconto(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : onSaveDesconto ? (
            <Button
              variant="ghost" size="sm"
              className="w-full justify-start text-muted-foreground h-8 gap-1"
              onClick={() => setEditingDesconto(true)}
            >
              <Plus className="h-3 w-3" />
              Adicionar desconto / cupom
            </Button>
          ) : null}

          {/* Subtotal (base com desconto) */}
          {couponDiscount > 0 && !editingDesconto && (
            <div className="flex justify-between items-center px-2 text-xs text-muted-foreground">
              <span>Subtotal do passeio</span>
              <span>{formatarValor(baseComDesconto)}</span>
            </div>
          )}

          {/* Opcionais */}
          {opcionais.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide px-1">
                Opcionais (+)
              </div>
              {opcionais.map((opt, idx) => (
                <div key={`${opt.id}-${idx}`} className="flex justify-between items-center p-2 bg-muted/30 rounded gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{opt.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatarValor(opt.price)}{opt.quantity > 1 ? ` × ${opt.quantity}` : ''}
                    </div>
                  </div>
                  <span className="font-medium shrink-0">{formatarValor(opt.price * opt.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
            <span className="text-sm text-blue-700 font-medium">Valor Total</span>
            <span className="text-lg font-bold text-blue-800">{formatarValor(total)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ValorTotalModal;
