import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, MessageCircle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParticipantDetailsView } from '@/components/participant/ParticipantDetailsView';
import { ParticipantData } from '@/types/participant';

interface Reserva {
  id: string;
  reserva_numero?: string;
  data_reserva: string;
  valor_passeio: number;
  valor_pago: number;
  valor_total_com_opcionais: number;
  numero_participantes?: number;
  adicionais: Array<{ nome: string; valor: number }>;
  selected_optional_items?: Array<{ id: string; name: string; price: number; quantity: number }>;
  payment_status: string;
  payment_method?: string;
  capture_method?: string;
  mp_status?: string;
  installments?: number;
  card_fee_amount?: number;
  status: string;
  problema_saude: boolean;
  descricao_problema_saude?: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  ticket_enviado?: boolean;
  observacoes?: string;
  cliente: {
    id: string;
    nome_completo: string;
    cpf: string;
    email: string;
    whatsapp: string;
    data_nascimento: string;
  };
  ponto_embarque: {
    id?: string;
    nome: string;
    endereco?: string;
  };
  // Additional participant fields
  nivel_condicionamento?: string;
  assistencia_diferenciada?: boolean;
  descricao_assistencia_diferenciada?: string;
}

interface FormAnswer {
  id: string;
  question_text: string;
  answer: string;
  standard_field_key?: string;
}

interface ParticipantDetailsModalProps {
  reserva: Reserva | null;
  open: boolean;
  onClose: () => void;
  onEdit: (reserva: Reserva) => void;
  onWhatsApp: (whatsapp: string, nome: string) => void;
}

const ParticipantDetailsModal: React.FC<ParticipantDetailsModalProps> = ({
  reserva,
  open,
  onClose,
  onEdit,
  onWhatsApp
}) => {
  const { toast } = useToast();
  const [formAnswers, setFormAnswers] = useState<FormAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [boardingPoints, setBoardingPoints] = useState<{ id: string; nome: string; endereco?: string }[]>([]);

  useEffect(() => {
    if (reserva && open) {
      fetchFormAnswers();
      // Create boarding points array with the current boarding point
      if (reserva.ponto_embarque) {
        setBoardingPoints([{
          id: reserva.ponto_embarque.id || '',
          nome: reserva.ponto_embarque.nome,
          endereco: reserva.ponto_embarque.endereco
        }]);
      }
    }
  }, [reserva, open]);

  const fetchFormAnswers = async () => {
    if (!reserva) return;
    
    setLoadingAnswers(true);
    try {
      const { data, error } = await supabase
        .from('reservation_custom_answers')
        .select(`
          id,
          answer,
          tour_custom_questions!inner (
            question_text,
            standard_field_key
          )
        `)
        .eq('reserva_id', reserva.id);

      if (error) throw error;

      const answers = (data || []).map((item: any) => ({
        id: item.id,
        question_text: item.tour_custom_questions?.question_text || '',
        answer: item.answer || '',
        standard_field_key: item.tour_custom_questions?.standard_field_key
      }));

      setFormAnswers(answers);
    } catch (error: any) {
      console.error('Erro ao buscar respostas:', error);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const formatarValor = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPaymentMethodLabel = (method?: string) => {
    const normalized = reserva?.capture_method === 'credit_card'
      ? 'cartao'
      : reserva?.capture_method === 'pix'
        ? 'pix'
        : method;

    switch (normalized) {
      case 'pix':
        return 'PIX';
      case 'cartao':
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return normalized || 'Não informado';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmado':
      case 'confirmada':
        return 'default';
      case 'cancelado':
      case 'cancelada':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pago':
      case 'approved':
        return 'default';
      case 'rejeitado':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!reserva) return null;

  // Convert reservation to participant data
  const participantData: ParticipantData = {
    nome_completo: reserva.cliente.nome_completo,
    cpf: reserva.cliente.cpf,
    data_nascimento: reserva.cliente.data_nascimento,
    whatsapp: reserva.cliente.whatsapp,
    whatsapp_country_code: (reserva as any).whatsapp_country_code || '+55',
    email: reserva.cliente.email,
    ponto_embarque_id: reserva.ponto_embarque?.id || '',
    nivel_condicionamento: reserva.nivel_condicionamento || '',
    problema_saude: reserva.problema_saude,
    descricao_problema_saude: reserva.descricao_problema_saude || '',
    plano_saude: (reserva as any).plano_saude || false,
    nome_plano_saude: (reserva as any).nome_plano_saude || '',
    assistencia_diferenciada: reserva.assistencia_diferenciada || false,
    descricao_assistencia_diferenciada: reserva.descricao_assistencia_diferenciada || '',
    contato_emergencia_nome: reserva.contato_emergencia_nome,
    contato_emergencia_telefone: reserva.contato_emergencia_telefone,
    contato_emergencia_country_code: (reserva as any).contato_emergencia_country_code || '+55',
    como_conheceu: (reserva as any).como_conheceu || '',
    como_conheceu_outro: (reserva as any).como_conheceu_outro || '',
    observacoes: reserva.observacoes
  };

  // Calculate totals
  const valorAdicionais = (reserva.adicionais || []).reduce((sum, add) => sum + add.valor, 0);
  const valorOpcionais = (reserva.selected_optional_items || []).reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const valorTotal = (reserva.valor_passeio || 0) + valorAdicionais + valorOpcionais;
  const saldo = (reserva.valor_pago || 0) - valorTotal;

  // Filter out standard fields from form answers
  const customFormAnswers = formAnswers.filter(a => 
    !['cpf', 'nome_completo', 'email', 'whatsapp', 'data_nascimento', 'ponto_embarque_id', 
      'problema_saude', 'descricao_problema_saude', 'contato_emergencia', 'aceita_politica', 
      'aceita_cancelamento', 'nivel_condicionamento', 'assistencia_diferenciada', 
      'descricao_assistencia_diferenciada'].includes(a.standard_field_key || '')
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{reserva.cliente.nome_completo}</span>
            {reserva.reserva_numero && (
              <Badge variant="outline" className="font-mono text-xs">
                {reserva.reserva_numero}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Cards */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getStatusBadgeVariant(reserva.status)} className="capitalize">
              {reserva.status}
            </Badge>
            <Badge variant={getPaymentStatusBadgeVariant(reserva.payment_status)} className="capitalize">
              {reserva.payment_status}
            </Badge>
            {reserva.ticket_enviado && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Ticket Enviado
              </Badge>
            )}
          </div>

          <Separator />

          {/* Dados do Participante (unified component) */}
          <ParticipantDetailsView
            participant={participantData}
            boardingPoints={boardingPoints}
            showAdminFields={true}
          />

          <Separator />

          {/* Dados da Reserva */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              DADOS DA RESERVA
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-2 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground">Inscrito em</span>
                <div className="text-sm font-medium">
                  {new Date(reserva.data_reserva).toLocaleDateString('pt-BR')} às {new Date(reserva.data_reserva).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground">Nº de Participantes</span>
                <div className="text-sm font-medium">{reserva.numero_participantes || 1} pessoa(s)</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financeiro */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              FINANCEIRO
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm">Valor do Passeio</span>
                <span className="text-sm font-medium">{formatarValor(reserva.valor_passeio || 0)}</span>
              </div>
              
              {reserva.selected_optional_items && reserva.selected_optional_items.length > 0 && (
                <div className="p-2 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600 font-medium">Itens Opcionais</span>
                  {reserva.selected_optional_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm mt-1">
                      <span>{item.name} {item.quantity > 1 && `(${item.quantity}x)`}</span>
                      <span>{formatarValor(item.price * (item.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              )}

              {reserva.adicionais && reserva.adicionais.length > 0 && (
                <div className="p-2 bg-amber-50 rounded-lg">
                  <span className="text-xs text-amber-600 font-medium">Adicionais Manuais</span>
                  {reserva.adicionais.map((add, idx) => (
                    <div key={idx} className="flex justify-between text-sm mt-1">
                      <span>{add.nome}</span>
                      <span>{formatarValor(add.valor)}</span>
                    </div>
                  ))}
                </div>
              )}

              {reserva.card_fee_amount && reserva.card_fee_amount > 0 && (
                <div className="flex justify-between p-2 bg-muted/50 rounded-lg text-muted-foreground">
                  <span className="text-sm">Taxa do Cartão</span>
                  <span className="text-sm">{formatarValor(reserva.card_fee_amount)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between p-2 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">Valor Total</span>
                <span className="text-sm font-bold text-primary">{formatarValor(valorTotal)}</span>
              </div>
              <div className="flex justify-between p-2 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">Valor Pago</span>
                <span className="text-sm font-bold text-green-700">{formatarValor(reserva.valor_pago || 0)}</span>
              </div>
              {saldo !== 0 && (
                <div className={`flex justify-between p-2 rounded-lg ${saldo < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <span className={`text-sm font-medium ${saldo < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {saldo < 0 ? 'Valor Restante' : 'Crédito / Excedente'}
                  </span>
                  <span className={`text-sm font-bold ${saldo < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {saldo < 0 ? `- ${formatarValor(Math.abs(saldo))}` : `+ ${formatarValor(saldo)}`}
                  </span>
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-3 pt-2">
                <div className="p-2 bg-muted/50 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground">Método</span>
                  <div className="text-sm font-medium">{getPaymentMethodLabel(reserva.payment_method)}</div>
                </div>
                {reserva.installments && reserva.installments > 1 && (
                  <div className="p-2 bg-muted/50 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground">Parcelas</span>
                    <div className="text-sm font-medium">{reserva.installments}x</div>
                  </div>
                )}
                {reserva.mp_status && (
                  <div className="p-2 bg-muted/50 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground">Status MP</span>
                    <div className="text-sm font-medium capitalize">{reserva.mp_status}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Respostas Customizadas do Formulário */}
          {customFormAnswers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 text-sm text-muted-foreground">RESPOSTAS ADICIONAIS</h4>
                {loadingAnswers ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-2">
                    {customFormAnswers.map(answer => (
                      <div key={answer.id} className="p-2 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">{answer.question_text}</div>
                        <div className="text-sm font-medium">{answer.answer || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onEdit(reserva)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Dados
            </Button>
            <Button variant="outline" className="text-green-600 hover:text-green-700" onClick={() => onWhatsApp(reserva.cliente.whatsapp, reserva.cliente.nome_completo)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantDetailsModal;
