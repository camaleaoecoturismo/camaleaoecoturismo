import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle } from 'lucide-react';

interface CancelReservationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CancelReservationData) => Promise<void>;
  reservaId: string;
  participantName: string;
  valorPago: number;
}

export interface CancelReservationData {
  motivo_cancelamento: string;
  motivo_detalhes?: string;
  refund_type: 'nenhum' | 'total' | 'parcial';
  refund_amount: number;
  refund_method?: string;
}

const MOTIVOS_CANCELAMENTO = [
  { value: 'desistencia_cliente', label: 'Desistência do cliente' },
  { value: 'problemas_saude', label: 'Problemas de saúde' },
  { value: 'conflito_agenda', label: 'Conflito de agenda' },
  { value: 'problemas_financeiros', label: 'Problemas financeiros' },
  { value: 'transferencia_passeio', label: 'Transferência para outro passeio' },
  { value: 'passeio_cancelado', label: 'Passeio cancelado pela empresa' },
  { value: 'clima', label: 'Condições climáticas' },
  { value: 'nao_compareceu', label: 'Não compareceu (no-show)' },
  { value: 'outro', label: 'Outro motivo' },
];

const METODOS_REEMBOLSO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Estorno no cartão' },
  { value: 'credito', label: 'Crédito para próximo passeio' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
];

const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  open,
  onClose,
  onConfirm,
  reservaId,
  participantName,
  valorPago
}) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [motivoDetalhes, setMotivoDetalhes] = useState('');
  const [refundType, setRefundType] = useState<'nenhum' | 'total' | 'parcial'>('nenhum');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('');

  const handleConfirm = async () => {
    if (!motivo) {
      return;
    }

    setLoading(true);
    try {
      let finalRefundAmount = 0;
      if (refundType === 'total') {
        finalRefundAmount = valorPago;
      } else if (refundType === 'parcial') {
        finalRefundAmount = parseFloat(refundAmount) || 0;
      }

      await onConfirm({
        motivo_cancelamento: motivo,
        motivo_detalhes: motivoDetalhes || undefined,
        refund_type: refundType,
        refund_amount: finalRefundAmount,
        refund_method: refundType !== 'nenhum' ? refundMethod : undefined,
      });
      
      // Reset form
      setMotivo('');
      setMotivoDetalhes('');
      setRefundType('nenhum');
      setRefundAmount('');
      setRefundMethod('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Reserva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Participante</p>
            <p className="font-medium">{participantName}</p>
            {valorPago > 0 && (
              <p className="text-sm mt-1">
                Valor pago: <span className="font-medium text-green-600">{formatCurrency(valorPago)}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do cancelamento *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_CANCELAMENTO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {motivo === 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="motivo_detalhes">Descreva o motivo</Label>
              <Textarea
                id="motivo_detalhes"
                value={motivoDetalhes}
                onChange={(e) => setMotivoDetalhes(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                rows={2}
              />
            </div>
          )}

          {valorPago > 0 && (
            <>
              <div className="space-y-3">
                <Label>Reembolso</Label>
                <RadioGroup 
                  value={refundType} 
                  onValueChange={(v) => setRefundType(v as 'nenhum' | 'total' | 'parcial')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nenhum" id="nenhum" />
                    <Label htmlFor="nenhum" className="font-normal cursor-pointer">
                      Sem reembolso
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="total" id="total" />
                    <Label htmlFor="total" className="font-normal cursor-pointer">
                      Reembolso total ({formatCurrency(valorPago)})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcial" id="parcial" />
                    <Label htmlFor="parcial" className="font-normal cursor-pointer">
                      Reembolso parcial
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {refundType === 'parcial' && (
                <div className="space-y-2">
                  <Label htmlFor="refund_amount">Valor do reembolso</Label>
                  <Input
                    id="refund_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={valorPago}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              )}

              {refundType !== 'nenhum' && (
                <div className="space-y-2">
                  <Label htmlFor="refund_method">Método do reembolso</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Como foi reembolsado?" />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_REEMBOLSO.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={loading || !motivo}
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelReservationModal;
