import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Check, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdditionalParticipant {
  id: string;
  reserva_id: string;
  participant_index: number;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  problema_saude: boolean;
  descricao_problema_saude: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  nivel_condicionamento: string | null;
  assistencia_diferenciada: boolean;
  descricao_assistencia_diferenciada: string | null;
  ticket_enviado: boolean;
  observacoes: string | null;
  ponto_embarque_id: string | null;
  plano_saude?: boolean;
  nome_plano_saude?: string;
}

interface BoardingPoint {
  id: string;
  nome: string;
  endereco?: string;
}

interface TourCustomQuestion {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  options: string[] | null;
  standard_field_key: string | null;
  is_active: boolean;
  condition_field_key: string | null;
  condition_value: string | null;
}

interface PricingOption {
  id: string;
  option_name: string;
  pix_price: number;
}

interface AdditionalParticipantModalProps {
  open: boolean;
  onClose: () => void;
  participant: AdditionalParticipant | null;
  reservaId: string;
  participantIndex: number;
  onSaved: () => void;
  boardingPoints: BoardingPoint[];
  tourId?: string;
}

// Standard field mapping - maps standard_field_key to formData field
const STANDARD_FIELD_MAP: Record<string, string> = {
  'cpf': 'cpf',
  'nome_completo': 'nome_completo',
  'whatsapp': 'whatsapp',
  'data_nascimento': 'data_nascimento',
  'email': 'email',
  'ponto_embarque_id': 'ponto_embarque_id',
  'nivel_condicionamento': 'nivel_condicionamento',
  'problema_saude': 'problema_saude',
  'descricao_problema_saude': 'descricao_problema_saude',
  'plano_saude': 'plano_saude',
  'nome_plano_saude': 'nome_plano_saude',
  'assistencia_diferenciada': 'assistencia_diferenciada',
  'descricao_assistencia_diferenciada': 'descricao_assistencia_diferenciada',
  'contato_emergencia': 'contato_emergencia',
  'contato_emergencia_nome': 'contato_emergencia_nome',
  'contato_emergencia_telefone': 'contato_emergencia_telefone',
  'observacoes': 'observacoes',
};

// Fields to skip in dynamic rendering (handled internally)
const SKIP_STANDARD_FIELDS = [
  'numero_participantes',
  'aceita_politica', 
  'aceita_cancelamento',
];

const AdditionalParticipantModal: React.FC<AdditionalParticipantModalProps> = ({
  open,
  onClose,
  participant,
  reservaId,
  participantIndex,
  onSaved,
  boardingPoints,
  tourId
}) => {
  const { toast } = useToast();
  const [loading, setSaving] = useState(false);
  const [lookingUpCpf, setLookingUpCpf] = useState(false);
  const [ticketEnviado, setTicketEnviado] = useState(false);
  
  // Form data for standard fields
  const [formData, setFormData] = useState<Record<string, any>>({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    whatsapp: '',
    email: '',
    ponto_embarque_id: '',
    ponto_embarque_personalizado: '',
    nivel_condicionamento: '',
    problema_saude: false,
    descricao_problema_saude: '',
    plano_saude: false,
    nome_plano_saude: '',
    assistencia_diferenciada: false,
    descricao_assistencia_diferenciada: '',
    contato_emergencia_nome: '',
    contato_emergencia_telefone: '',
    como_conheceu: '',
    como_conheceu_outro: '',
    observacoes: '',
    valor_passeio: '',
    pricing_option_id: '',
    pricing_option_name: ''
  });
  
  // Dynamic questions and answers
  const [tourQuestions, setTourQuestions] = useState<TourCustomQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);

  // Fetch tour questions and pricing options
  useEffect(() => {
    const fetchTourData = async () => {
      if (!tourId || !open) return;
      
      setLoadingQuestions(true);
      try {
        // Fetch questions and pricing options in parallel
        const [questionsResult, pricingResult] = await Promise.all([
          supabase
            .from('tour_custom_questions')
            .select('id, question_text, question_type, is_required, options, standard_field_key, is_active, condition_field_key, condition_value')
            .eq('tour_id', tourId)
            .eq('is_active', true)
            .order('order_index', { ascending: true }),
          supabase
            .from('tour_pricing_options')
            .select('id, option_name, pix_price')
            .eq('tour_id', tourId)
            .order('pix_price', { ascending: true })
        ]);

        if (questionsResult.error) throw questionsResult.error;
        
        // Filter out fields that shouldn't be shown in admin modal
        const filteredQuestions = (questionsResult.data || []).filter(q => 
          !SKIP_STANDARD_FIELDS.includes(q.standard_field_key || '')
        );
        
        setTourQuestions(filteredQuestions);
        setPricingOptions(pricingResult.data || []);

        // Fetch existing custom answers for truly custom questions
        if (reservaId) {
          const { data: answers, error: answersError } = await supabase
            .from('reservation_custom_answers')
            .select('question_id, answer')
            .eq('reserva_id', reservaId);

          if (answersError) throw answersError;
          
          const answersMap: Record<string, string> = {};
          answers?.forEach(a => {
            answersMap[a.question_id] = a.answer || '';
          });
          setCustomAnswers(answersMap);
        }
      } catch (error) {
        console.error('Error fetching tour data:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchTourData();
  }, [tourId, reservaId, open]);

  // Initialize form data when participant changes
  useEffect(() => {
    if (participant) {
      // Check if participant has custom boarding point (ponto_embarque_personalizado set and no ponto_embarque_id)
      const hasCustomBoarding = !participant.ponto_embarque_id && (participant as any).ponto_embarque_personalizado;
      setFormData({
        nome_completo: participant.nome_completo || '',
        cpf: participant.cpf || '',
        data_nascimento: participant.data_nascimento || '',
        whatsapp: participant.whatsapp || '',
        email: participant.email || '',
        ponto_embarque_id: hasCustomBoarding ? 'outro' : (participant.ponto_embarque_id || ''),
        ponto_embarque_personalizado: (participant as any).ponto_embarque_personalizado || '',
        nivel_condicionamento: participant.nivel_condicionamento || '',
        problema_saude: participant.problema_saude || false,
        descricao_problema_saude: participant.descricao_problema_saude || '',
        plano_saude: participant.plano_saude || false,
        nome_plano_saude: participant.nome_plano_saude || '',
        assistencia_diferenciada: participant.assistencia_diferenciada || false,
        descricao_assistencia_diferenciada: participant.descricao_assistencia_diferenciada || '',
        contato_emergencia_nome: participant.contato_emergencia_nome || '',
        contato_emergencia_telefone: participant.contato_emergencia_telefone || '',
        como_conheceu: (participant as any).como_conheceu || '',
        como_conheceu_outro: (participant as any).como_conheceu_outro || '',
        observacoes: participant.observacoes || '',
        valor_passeio: '',
        pricing_option_id: (participant as any).pricing_option_id || '',
        pricing_option_name: (participant as any).pricing_option_name || ''
      });
      setTicketEnviado(participant.ticket_enviado || false);
    } else {
      // If this is participant index 1 (titular) without a record, fetch from reserva/cliente
      if (participantIndex === 1 && reservaId) {
        const fetchTitularData = async () => {
          try {
            const { data: reservaData } = await supabase
              .from('reservas')
              .select(`
                *,
                clientes!fk_reservas_cliente(id, nome_completo, cpf, email, whatsapp, data_nascimento, contato_emergencia_nome, contato_emergencia_telefone, problema_saude, descricao_problema_saude)
              `)
              .eq('id', reservaId)
              .single();
            
            if (reservaData) {
              const cliente = reservaData.clientes;
              // Try to infer pricing option from valor_passeio
              let inferredPricingId = '';
              let inferredPricingName = '';
              if (reservaData.valor_passeio && pricingOptions.length > 0) {
                const matchingOption = pricingOptions.find(opt => opt.pix_price === reservaData.valor_passeio);
                if (matchingOption) {
                  inferredPricingId = matchingOption.id;
                  inferredPricingName = matchingOption.option_name;
                }
              }
              
              setFormData({
                nome_completo: cliente?.nome_completo || '',
                cpf: cliente?.cpf || '',
                data_nascimento: cliente?.data_nascimento || '',
                whatsapp: cliente?.whatsapp || '',
                email: cliente?.email || '',
                ponto_embarque_id: reservaData.ponto_embarque_id || '',
                ponto_embarque_personalizado: '',
                nivel_condicionamento: '',
                problema_saude: reservaData.problema_saude || cliente?.problema_saude || false,
                descricao_problema_saude: reservaData.descricao_problema_saude || cliente?.descricao_problema_saude || '',
                plano_saude: reservaData.plano_saude || false,
                nome_plano_saude: reservaData.nome_plano_saude || '',
                assistencia_diferenciada: false,
                descricao_assistencia_diferenciada: '',
                contato_emergencia_nome: reservaData.contato_emergencia_nome || cliente?.contato_emergencia_nome || '',
                contato_emergencia_telefone: reservaData.contato_emergencia_telefone || cliente?.contato_emergencia_telefone || '',
                observacoes: reservaData.observacoes || '',
                valor_passeio: reservaData.valor_passeio?.toString() || '',
                pricing_option_id: inferredPricingId,
                pricing_option_name: inferredPricingName
              });
              setTicketEnviado(reservaData.ticket_enviado || false);
            }
          } catch (error) {
            console.error('Error fetching titular data:', error);
          }
        };
        fetchTitularData();
      } else {
        setFormData({
          nome_completo: '',
          cpf: '',
          data_nascimento: '',
          whatsapp: '',
          email: '',
          ponto_embarque_id: '',
          ponto_embarque_personalizado: '',
          nivel_condicionamento: '',
          problema_saude: false,
          descricao_problema_saude: '',
          plano_saude: false,
          nome_plano_saude: '',
          assistencia_diferenciada: false,
          descricao_assistencia_diferenciada: '',
          contato_emergencia_nome: '',
          contato_emergencia_telefone: '',
          como_conheceu: '',
          como_conheceu_outro: '',
          observacoes: '',
          valor_passeio: '',
          pricing_option_id: '',
          pricing_option_name: ''
        });
      }
      setTicketEnviado(false);
      setCustomAnswers({});
    }
  }, [participant, open, participantIndex, reservaId, pricingOptions]);

  const handleCpfBlur = async () => {
    if (!formData.cpf || formData.cpf.length < 11) return;
    
    const cpfNormalized = formData.cpf.replace(/\D/g, '');
    if (cpfNormalized.length !== 11) return;
    
    setLookingUpCpf(true);
    try {
      // Use secure RPC function for CPF lookup
      const { data: clienteData } = await supabase.rpc('lookup_client_by_cpf', { search_cpf: cpfNormalized });
      const data = clienteData && clienteData.length > 0 ? clienteData[0] : null;

      if (data) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.nome_completo || prev.nome_completo,
          email: data.email || prev.email,
          whatsapp: data.whatsapp || prev.whatsapp,
          data_nascimento: data.data_nascimento || prev.data_nascimento
          // Note: contact info, health info not returned by RPC for privacy
        }));
        toast({
          title: "Cliente encontrado!",
          description: "Dados preenchidos automaticamente."
        });
      }
    } catch (error) {
      console.error('Error looking up CPF:', error);
    } finally {
      setLookingUpCpf(false);
    }
  };

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomAnswerChange = (questionId: string, value: string) => {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Check if a conditional question should be shown
  const shouldShowQuestion = (question: TourCustomQuestion): boolean => {
    if (!question.condition_field_key || !question.condition_value) {
      return true;
    }

    const conditionFieldKey = question.condition_field_key;
    const expectedValue = question.condition_value;

    // Check in formData first (for standard fields)
    if (conditionFieldKey in formData) {
      const currentValue = formData[conditionFieldKey];
      if (typeof currentValue === 'boolean') {
        return (expectedValue === 'true') === currentValue;
      }
      return String(currentValue) === expectedValue;
    }

    // Check in customAnswers (for custom question dependencies)
    const answer = customAnswers[conditionFieldKey];
    return answer === expectedValue;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cpfNormalized = formData.cpf?.replace(/\D/g, '') || '';
      
      const { data: reservaData, error: reservaError } = await supabase
        .from('reservas')
        .select('tour_id, reserva_numero, valor_pago, numero_participantes')
        .eq('id', reservaId)
        .maybeSingle();

      if (reservaError) {
        console.error('Error fetching reserva:', reservaError);
      }

      let tourStartDate = new Date().toISOString().split('T')[0];
      if (reservaData?.tour_id) {
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('start_date')
          .eq('id', reservaData.tour_id)
          .maybeSingle();
        
        if (tourError) {
          console.error('Error fetching tour:', tourError);
        }
        if (tourData?.start_date) {
          tourStartDate = tourData.start_date;
        }
      }

      let boardingPointName = '';
      let boardingPointAddress = '';
      if (formData.ponto_embarque_id) {
        const { data: bpData, error: bpError } = await supabase
          .from('tour_boarding_points')
          .select('nome, endereco')
          .eq('id', formData.ponto_embarque_id)
          .maybeSingle();
        
        if (bpError) {
          console.error('Error fetching boarding point:', bpError);
        }
        if (bpData) {
          boardingPointName = bpData.nome;
          boardingPointAddress = bpData.endereco || '';
        }
      }

      let participantId: string;

      const participantRecord = {
        nome_completo: formData.nome_completo || null,
        cpf: cpfNormalized || null,
        data_nascimento: formData.data_nascimento || null,
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
        ponto_embarque_id: formData.ponto_embarque_id === 'outro' ? null : (formData.ponto_embarque_id || null),
        ponto_embarque_personalizado: formData.ponto_embarque_id === 'outro' ? (formData.ponto_embarque_personalizado || null) : null,
        nivel_condicionamento: formData.nivel_condicionamento || null,
        problema_saude: formData.problema_saude,
        descricao_problema_saude: formData.descricao_problema_saude || null,
        plano_saude: formData.plano_saude,
        nome_plano_saude: formData.nome_plano_saude || null,
        assistencia_diferenciada: formData.assistencia_diferenciada,
        descricao_assistencia_diferenciada: formData.descricao_assistencia_diferenciada || null,
        contato_emergencia_nome: formData.contato_emergencia_nome || null,
        contato_emergencia_telefone: formData.contato_emergencia_telefone || null,
        como_conheceu: formData.como_conheceu === 'outro' 
          ? `Outro: ${formData.como_conheceu_outro || ''}`.trim() 
          : (formData.como_conheceu || null),
        observacoes: formData.observacoes || null,
        pricing_option_id: formData.pricing_option_id || null,
        pricing_option_name: formData.pricing_option_name || null,
        updated_at: new Date().toISOString()
      };

      if (participant?.id) {
        participantId = participant.id;
        const { error } = await supabase
          .from('reservation_participants')
          .update(participantRecord)
          .eq('id', participant.id);
        
        if (error) throw error;
      } else {
        const { data: newParticipant, error } = await supabase
          .from('reservation_participants')
          .insert({
            reserva_id: reservaId,
            participant_index: participantIndex,
            ...participantRecord
          })
          .select('id')
          .single();
        
        if (error) throw error;
        participantId = newParticipant.id;
      }

      // For participant index 1 (titular), also update the cliente and reserva tables
      if (participantIndex === 1) {
        // Fetch the reserva to get cliente_id
        const { data: reservaInfo } = await supabase
          .from('reservas')
          .select('cliente_id')
          .eq('id', reservaId)
          .single();

        if (reservaInfo?.cliente_id) {
          // Update cliente
          const cpfForCliente = cpfNormalized || undefined;
          await supabase
            .from('clientes')
            .update({
              nome_completo: formData.nome_completo || undefined,
              cpf: cpfForCliente,
              email: formData.email || undefined,
              whatsapp: formData.whatsapp || undefined,
              data_nascimento: formData.data_nascimento || undefined,
              contato_emergencia_nome: formData.contato_emergencia_nome || null,
              contato_emergencia_telefone: formData.contato_emergencia_telefone || null,
              problema_saude: formData.problema_saude,
              descricao_problema_saude: formData.descricao_problema_saude || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', reservaInfo.cliente_id);
        }

        // Update reserva
        await supabase
          .from('reservas')
          .update({
            ponto_embarque_id: formData.ponto_embarque_id === 'outro' ? null : (formData.ponto_embarque_id || null),
            problema_saude: formData.problema_saude,
            descricao_problema_saude: formData.descricao_problema_saude || null,
            plano_saude: formData.plano_saude,
            nome_plano_saude: formData.nome_plano_saude || null,
            contato_emergencia_nome: formData.contato_emergencia_nome || null,
            contato_emergencia_telefone: formData.contato_emergencia_telefone || null,
            observacoes: formData.observacoes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', reservaId);
      }

      // Save custom answers (for questions without standard_field_key)
      const customQuestions = tourQuestions.filter(q => !q.standard_field_key);
      if (customQuestions.length > 0) {
        for (const question of customQuestions) {
          const answer = customAnswers[question.id] || '';
          
          const { data: existingAnswer } = await supabase
            .from('reservation_custom_answers')
            .select('id')
            .eq('reserva_id', reservaId)
            .eq('question_id', question.id)
            .maybeSingle();

          if (existingAnswer) {
            await supabase
              .from('reservation_custom_answers')
              .update({ answer })
              .eq('id', existingAnswer.id);
          } else if (answer) {
            await supabase
              .from('reservation_custom_answers')
              .insert({
                reserva_id: reservaId,
                question_id: question.id,
                answer
              });
          }
        }
      }

      // Create/update ticket
      if (formData.nome_completo && reservaData?.tour_id) {
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('id')
          .eq('participant_id', participantId)
          .maybeSingle();

        if (existingTicket) {
          await supabase
            .from('tickets')
            .update({
              participant_name: formData.nome_completo,
              participant_cpf: cpfNormalized || null,
              boarding_point_name: boardingPointName,
              boarding_point_address: boardingPointAddress,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTicket.id);
        } else {
          const ticketNumber = `TKT${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          await supabase
            .from('tickets')
            .insert([{
              reserva_id: reservaId,
              participant_id: participantId,
              tour_id: reservaData.tour_id,
              participant_name: formData.nome_completo,
              participant_cpf: cpfNormalized || null,
              boarding_point_name: boardingPointName,
              boarding_point_address: boardingPointAddress,
              trip_date: tourStartDate,
              amount_paid: (reservaData.valor_pago || 0) / (reservaData.numero_participantes || 1),
              reservation_number: reservaData.reserva_numero,
              ticket_number: ticketNumber,
              status: 'active'
            }]);
        }
      }

      toast({
        title: "Salvo!",
        description: "Dados do participante salvos com sucesso."
      });
      
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving participant:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar participante.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Render a question field based on its type and standard_field_key
  const renderQuestionField = (question: TourCustomQuestion) => {
    const standardKey = question.standard_field_key;
    const questionId = question.id;
    
    // For standard fields, use formData; for custom, use customAnswers
    const getValue = (): any => {
      if (standardKey && STANDARD_FIELD_MAP[standardKey]) {
        return formData[STANDARD_FIELD_MAP[standardKey]] || '';
      }
      return customAnswers[questionId] || '';
    };
    
    const setValue = (value: any) => {
      if (standardKey && STANDARD_FIELD_MAP[standardKey]) {
        handleFieldChange(STANDARD_FIELD_MAP[standardKey], value);
      } else {
        handleCustomAnswerChange(questionId, String(value));
      }
    };

    const value = getValue();

    // Handle emergency contact special case
    if (standardKey === 'contato_emergencia') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome do Contato</Label>
            <Input
              value={formData.contato_emergencia_nome || ''}
              onChange={(e) => handleFieldChange('contato_emergencia_nome', e.target.value)}
              placeholder="Nome do contato"
            />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input
              value={formData.contato_emergencia_telefone || ''}
              onChange={(e) => handleFieldChange('contato_emergencia_telefone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      );
    }

    // Handle boarding point selection
    if (standardKey === 'ponto_embarque_id') {
      const isCustom = value === 'outro';
      return (
        <div className="space-y-2">
          <Select value={value} onValueChange={(val) => {
            setValue(val);
            // Clear custom boarding point if not "outro"
            if (val !== 'outro') {
              handleFieldChange('ponto_embarque_personalizado', '');
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o ponto de embarque" />
            </SelectTrigger>
            <SelectContent>
              {boardingPoints.map((point) => (
                <SelectItem key={point.id} value={point.id}>
                  {point.nome}
                </SelectItem>
              ))}
              <SelectItem value="outro" className="text-amber-700 font-medium">
                📍 Outro local (personalizado)
              </SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <div className="space-y-1">
              <Label className="text-xs text-amber-600">Endereço do ponto personalizado</Label>
              <Input
                value={formData.ponto_embarque_personalizado || ''}
                onChange={(e) => handleFieldChange('ponto_embarque_personalizado', e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - Centro"
                className="border-amber-300 focus:border-amber-500"
              />
              <p className="text-xs text-muted-foreground">
                Informe o endereço completo do ponto de embarque desejado.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Handle conditioning level
    if (standardKey === 'nivel_condicionamento') {
      const options = question.options || ['Sedentário', 'Leve', 'Moderado', 'Ativo', 'Atleta'];
      return (
        <RadioGroup value={value} onValueChange={(val) => setValue(val)} className="space-y-2">
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${questionId}-${option}`} />
              <Label htmlFor={`${questionId}-${option}`} className="font-normal cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    // Handle by question_type
    switch (question.question_type) {
      case 'cpf':
        return (
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleCpfBlur}
              placeholder="000.000.000-00"
              className="pr-8"
            />
            {lookingUpCpf && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => setValue(checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value === true || value === 'true' ? 'Sim' : 'Não'}
            </span>
          </div>
        );

      case 'radio':
      case 'select':
        const selectOptions = question.options || [];
        if (question.question_type === 'radio') {
          return (
            <RadioGroup value={value} onValueChange={(val) => setValue(val)} className="space-y-2">
              {selectOptions.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${questionId}-${option}`} />
                  <Label htmlFor={`${questionId}-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          );
        }
        return (
          <Select value={value} onValueChange={(val) => setValue(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite sua resposta..."
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite um número"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="email@exemplo.com"
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite sua resposta"
          />
        );
    }
  };

  const isPending = !formData.nome_completo;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isPending ? `Cadastrar Participante ${participantIndex}` : `Editar Participante ${participantIndex}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {loadingQuestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando formulário...</span>
            </div>
          ) : tourQuestions.length > 0 ? (
            <div className="space-y-4">
              {/* Pricing Option Selector */}
              {pricingOptions.length > 0 && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="flex items-center gap-1 text-purple-800">
                    Pacote *
                  </Label>
                  <Select 
                    value={formData.pricing_option_id} 
                    onValueChange={(val) => {
                      const selected = pricingOptions.find(p => p.id === val);
                      handleFieldChange('pricing_option_id', val);
                      handleFieldChange('pricing_option_name', selected?.option_name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.option_name} - R$ {option.pix_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {tourQuestions.map((question) => {
                // Check conditional visibility
                if (!shouldShowQuestion(question)) {
                  return null;
                }

                return (
                  <div key={question.id} className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {question.question_text}
                      {question.is_required && <span className="text-destructive">*</span>}
                    </Label>
                    {renderQuestionField(question)}
                  </div>
                );
              })}
              
              {/* Admin-only: Observações */}
              <div className="space-y-2 border-t pt-4 mt-4">
                <Label className="text-muted-foreground">Observações (admin)</Label>
                <Textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => handleFieldChange('observacoes', e.target.value)}
                  placeholder="Observações internas..."
                  rows={2}
                />
              </div>
            </div>
          ) : (
            // Fallback: complete form fields if no tour questions configured
            <div className="space-y-4">
              {/* Pricing Option Selector */}
              {pricingOptions.length > 0 && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="flex items-center gap-1 text-purple-800">
                    Pacote *
                  </Label>
                  <Select 
                    value={formData.pricing_option_id} 
                    onValueChange={(val) => {
                      const selected = pricingOptions.find(p => p.id === val);
                      handleFieldChange('pricing_option_id', val);
                      handleFieldChange('pricing_option_name', selected?.option_name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.option_name} - R$ {option.pix_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.nome_completo}
                    onChange={(e) => handleFieldChange('nome_completo', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <div className="relative">
                    <Input
                      value={formData.cpf}
                      onChange={(e) => handleFieldChange('cpf', e.target.value)}
                      onBlur={handleCpfBlur}
                      placeholder="000.000.000-00"
                    />
                    {lookingUpCpf && (
                      <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp</Label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleFieldChange('data_nascimento', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ponto de Embarque</Label>
                  <Select
                    value={formData.ponto_embarque_id}
                    onValueChange={(val) => {
                      handleFieldChange('ponto_embarque_id', val);
                      if (val !== 'outro') {
                        handleFieldChange('ponto_embarque_personalizado', '');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {boardingPoints.map((point) => (
                        <SelectItem key={point.id} value={point.id}>
                          {point.nome}
                        </SelectItem>
                      ))}
                      <SelectItem value="outro" className="text-amber-700 font-medium">
                        📍 Outro local (personalizado)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.ponto_embarque_id === 'outro' && (
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600">Endereço do ponto personalizado</Label>
                  <Input
                    value={formData.ponto_embarque_personalizado || ''}
                    onChange={(e) => handleFieldChange('ponto_embarque_personalizado', e.target.value)}
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    className="border-amber-300 focus:border-amber-500"
                  />
                </div>
              )}

              {/* Nível de Condicionamento */}
              <div className="space-y-2">
                <Label>Nível de Condicionamento Físico</Label>
                <RadioGroup 
                  value={formData.nivel_condicionamento} 
                  onValueChange={(val) => handleFieldChange('nivel_condicionamento', val)}
                  className="flex flex-wrap gap-4"
                >
                  {['Sedentário', 'Leve', 'Moderado', 'Ativo', 'Atleta'].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`cond-${option}`} />
                      <Label htmlFor={`cond-${option}`} className="font-normal cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Problema de Saúde */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="problema_saude"
                    checked={formData.problema_saude}
                    onCheckedChange={(checked) => handleFieldChange('problema_saude', checked)}
                  />
                  <Label htmlFor="problema_saude" className="cursor-pointer">Possui algum problema de saúde?</Label>
                </div>
                {formData.problema_saude && (
                  <Textarea
                    value={formData.descricao_problema_saude || ''}
                    onChange={(e) => handleFieldChange('descricao_problema_saude', e.target.value)}
                    placeholder="Descreva o problema de saúde..."
                    rows={2}
                  />
                )}
              </div>

              {/* Plano de Saúde */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="plano_saude"
                    checked={formData.plano_saude}
                    onCheckedChange={(checked) => handleFieldChange('plano_saude', checked)}
                  />
                  <Label htmlFor="plano_saude" className="cursor-pointer">Possui plano de saúde?</Label>
                </div>
                {formData.plano_saude && (
                  <Input
                    value={formData.nome_plano_saude || ''}
                    onChange={(e) => handleFieldChange('nome_plano_saude', e.target.value)}
                    placeholder="Nome do plano de saúde"
                  />
                )}
              </div>

              {/* Assistência Diferenciada */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="assistencia_diferenciada"
                    checked={formData.assistencia_diferenciada}
                    onCheckedChange={(checked) => handleFieldChange('assistencia_diferenciada', checked)}
                  />
                  <Label htmlFor="assistencia_diferenciada" className="cursor-pointer">Necessita de assistência diferenciada?</Label>
                </div>
                {formData.assistencia_diferenciada && (
                  <Textarea
                    value={formData.descricao_assistencia_diferenciada || ''}
                    onChange={(e) => handleFieldChange('descricao_assistencia_diferenciada', e.target.value)}
                    placeholder="Descreva a necessidade de assistência..."
                    rows={2}
                  />
                )}
              </div>

              {/* Contato de Emergência */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Contato de Emergência</Label>
                  <Input
                    value={formData.contato_emergencia_nome || ''}
                    onChange={(e) => handleFieldChange('contato_emergencia_nome', e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone de Emergência</Label>
                  <Input
                    value={formData.contato_emergencia_telefone || ''}
                    onChange={(e) => handleFieldChange('contato_emergencia_telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2 border-t pt-4 mt-4">
                <Label className="text-muted-foreground">Observações (admin)</Label>
                <Textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => handleFieldChange('observacoes', e.target.value)}
                  placeholder="Observações internas..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {ticketEnviado && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 mx-6">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Ticket enviado</span>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.nome_completo}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <UserPlus className="mr-2 h-4 w-4" />
            {participant?.id ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdditionalParticipantModal;
