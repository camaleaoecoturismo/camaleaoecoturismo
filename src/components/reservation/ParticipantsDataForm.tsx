import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneInput } from '@/components/ui/phone-input';
import { Loader2, User, ChevronDown, ChevronUp, Plus, Minus, ShoppingCart, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validarCPF, validarTelefone, formatarCPF, cn } from '@/lib/utils';
import { NIVEL_CONDICIONAMENTO_OPTIONS, COMO_CONHECEU_OPTIONS } from '@/types/participant';

interface BoardingPoint {
  id: string;
  nome: string;
  endereco: string;
  horario?: string | null;
}

export interface SelectedOptionalItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OptionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface ParticipantFormData {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  data_nascimento_dia: string;
  data_nascimento_mes: string;
  data_nascimento_ano: string;
  whatsapp: string;
  whatsapp_country_code: string;
  email: string;
  ponto_embarque_id: string;
  ponto_embarque_personalizado: string;
  nivel_condicionamento: string;
  problema_saude: boolean;
  descricao_problema_saude: string;
  plano_saude: boolean;
  nome_plano_saude: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  contato_emergencia_country_code: string;
  como_conheceu: string;
  como_conheceu_outro: string;
  instagram: string;
  // Package info
  pricingOptionId: string;
  pricingOptionName: string;
  pricingOptionPrice: number;
  // Optional items for this participant
  selectedOptionals: SelectedOptionalItem[];
}

interface ParticipantsDataFormProps {
  participants: ParticipantFormData[];
  onParticipantsChange: (participants: ParticipantFormData[]) => void;
  boardingPoints: BoardingPoint[];
  onConfirm: () => void;
  isLoading?: boolean;
  tourName?: string;
  optionalItems?: OptionalItem[];
}

export const createEmptyParticipantForm = (
  pricingOptionId: string,
  pricingOptionName: string,
  pricingOptionPrice: number
): ParticipantFormData => ({
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  data_nascimento_dia: '',
  data_nascimento_mes: '',
  data_nascimento_ano: '',
  whatsapp: '',
  whatsapp_country_code: '+55',
  email: '',
  ponto_embarque_id: '',
  ponto_embarque_personalizado: '',
  nivel_condicionamento: '',
  problema_saude: false,
  descricao_problema_saude: '',
  plano_saude: false,
  nome_plano_saude: '',
  contato_emergencia_nome: '',
  contato_emergencia_telefone: '',
  contato_emergencia_country_code: '+55',
  como_conheceu: '',
  como_conheceu_outro: '',
  instagram: '',
  pricingOptionId,
  pricingOptionName,
  pricingOptionPrice,
  selectedOptionals: []
});

// Generate day options (01-31)
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

// Month options
const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

// Generate year options (current year - 100 to current year - 5)
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 96 }, (_, i) => String(currentYear - 5 - i));

export const ParticipantsDataForm: React.FC<ParticipantsDataFormProps> = ({
  participants,
  onParticipantsChange,
  boardingPoints,
  onConfirm,
  tourName,
  isLoading = false,
  optionalItems = []
}) => {
  const [expandedParticipants, setExpandedParticipants] = useState<Set<number>>(new Set([0]));
  const [lookingUpCpf, setLookingUpCpf] = useState<number | null>(null);
  const [healthTouched, setHealthTouched] = useState<Set<number>>(new Set());
  const participantRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);

  // Scroll to participant when expanded
  useEffect(() => {
    if (scrollToIndex !== null && participantRefs.current[scrollToIndex]) {
      setTimeout(() => {
        participantRefs.current[scrollToIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        setScrollToIndex(null);
      }, 50);
    }
  }, [scrollToIndex]);

  const isParticipantValid = (p: ParticipantFormData): boolean => {
    if (!p.nome_completo.trim() || p.nome_completo.trim().length < 3) return false;
    if (!p.cpf || p.cpf.replace(/\D/g, '').length !== 11 || !validarCPF(p.cpf)) return false;
    if (!p.data_nascimento) return false;
    if (!p.whatsapp || !validarTelefone(p.whatsapp)) return false;
    if (!p.email || !p.email.includes('@') || !p.email.includes('.')) return false;
    // Boarding point: either a selected ID or a custom one (when "outro" is selected)
    if (!p.ponto_embarque_id) return false;
    if (p.ponto_embarque_id === 'outro' && !p.ponto_embarque_personalizado.trim()) return false;
    // Physical conditioning is now required
    if (!p.nivel_condicionamento) return false;
    // If health issue is marked, description is required
    if (p.problema_saude && !p.descricao_problema_saude.trim()) return false;
    // Emergency contact is now required
    if (!p.contato_emergencia_nome.trim() || p.contato_emergencia_nome.trim().length < 3) return false;
    if (!p.contato_emergencia_telefone || !validarTelefone(p.contato_emergencia_telefone)) return false;

    // How did you learn about Camaleão is required
    if (!p.como_conheceu) return false;
    if (p.como_conheceu === 'outro' && !p.como_conheceu_outro.trim()) return false;
    return true;
  };

  // Get list of missing fields for a participant
  const getMissingFields = (p: ParticipantFormData): string[] => {
    const missing: string[] = [];
    if (!p.nome_completo.trim() || p.nome_completo.trim().length < 3) missing.push('Nome completo');
    if (!p.cpf || p.cpf.replace(/\D/g, '').length !== 11 || !validarCPF(p.cpf)) missing.push('CPF inválido');
    if (!p.data_nascimento) missing.push('Data de nascimento');
    if (!p.whatsapp || !validarTelefone(p.whatsapp)) missing.push('WhatsApp inválido');
    if (!p.email || !p.email.includes('@') || !p.email.includes('.')) missing.push('E-mail inválido');
    if (!p.ponto_embarque_id) missing.push('Ponto de embarque');
    if (p.ponto_embarque_id === 'outro' && !p.ponto_embarque_personalizado.trim()) missing.push('Endereço do ponto de embarque');
    if (!p.nivel_condicionamento) missing.push('Nível de condicionamento');
    if (p.problema_saude && !p.descricao_problema_saude.trim()) missing.push('Descrição do problema de saúde');
    if (!p.contato_emergencia_nome.trim() || p.contato_emergencia_nome.trim().length < 3) missing.push('Nome do contato de emergência');
    if (!p.contato_emergencia_telefone || !validarTelefone(p.contato_emergencia_telefone)) missing.push('Telefone de emergência inválido');

    if (!p.como_conheceu) missing.push('Como conheceu a Camaleão');
    if (p.como_conheceu === 'outro' && !p.como_conheceu_outro.trim()) missing.push('Como conheceu (Outro)');
    return missing;
  };

  // State for showing missing fields message
  const [showMissingMessage, setShowMissingMessage] = useState<number | null>(null);

  // Handle "continue to next participant" button click
  const handleContinueToNext = (currentIndex: number) => {
    const currentParticipant = participants[currentIndex];
    const isValid = isParticipantValid(currentParticipant);
    
    if (!isValid) {
      setShowMissingMessage(currentIndex);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowMissingMessage(null), 5000);
      return;
    }
    
    // Clear any previous missing message
    setShowMissingMessage(null);
    
    // Move to next participant
    const nextIndex = currentIndex + 1;
    if (nextIndex < participants.length) {
      setExpandedParticipants(new Set([nextIndex]));
      setScrollToIndex(nextIndex);
    }
  };

  const allParticipantsValid = participants.every(isParticipantValid);

  // Check if a participant can be expanded (previous must be valid)
  const canExpandParticipant = (index: number): boolean => {
    if (index === 0) return true; // First participant can always be expanded
    // Check if all previous participants are valid
    for (let i = 0; i < index; i++) {
      if (!isParticipantValid(participants[i])) {
        return false;
      }
    }
    return true;
  };

  const toggleExpanded = (index: number) => {
    // Only allow expansion if conditions are met
    if (!expandedParticipants.has(index) && !canExpandParticipant(index)) {
      return; // Don't expand if previous participants aren't complete
    }
    
    setExpandedParticipants(prev => {
      // If clicking on expanded item, close it
      if (prev.has(index)) {
        const next = new Set(prev);
        next.delete(index);
        return next;
      }
      // Otherwise, open only this one (accordion behavior) and scroll to it
      setScrollToIndex(index);
      return new Set([index]);
    });
  };

  const updateParticipant = (index: number, field: keyof ParticipantFormData, value: string | boolean) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };

    // If updating any date part, also update the combined date
    if (field === 'data_nascimento_dia' || field === 'data_nascimento_mes' || field === 'data_nascimento_ano') {
      const p = updated[index];
      const dia = field === 'data_nascimento_dia' ? (value as string) : p.data_nascimento_dia;
      const mes = field === 'data_nascimento_mes' ? (value as string) : p.data_nascimento_mes;
      const ano = field === 'data_nascimento_ano' ? (value as string) : p.data_nascimento_ano;

      if (dia && mes && ano) {
        updated[index].data_nascimento = `${ano}-${mes}-${dia}`;
      }
    }

    // Mark health fields as user-edited (prevents CPF lookup from overriding)
    if (field === 'problema_saude' || field === 'descricao_problema_saude') {
      setHealthTouched(prev => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }

    // If health issue is unchecked, also clear the description
    if (field === 'problema_saude' && value === false) {
      updated[index].descricao_problema_saude = '';
    }

    // If health insurance is unchecked, also clear the plan name
    if (field === 'plano_saude' && value === false) {
      updated[index].nome_plano_saude = '';
    }

    onParticipantsChange(updated);
  };

  // Helper for updating multiple fields at once.
  // Needed to avoid sequential updates based on stale `participants` props.
  const updateParticipantFields = (index: number, patch: Partial<ParticipantFormData>) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], ...patch };
    onParticipantsChange(updated);
  };

  const setBoardingPoint = (participantIndex: number, value: string) => {
    const updated = [...participants];
    const current = updated[participantIndex];

    updated[participantIndex] = {
      ...current,
      ponto_embarque_id: value,
      ponto_embarque_personalizado: value === "outro" ? current.ponto_embarque_personalizado : "",
    };

    onParticipantsChange(updated);
  };

  // Toggle optional item for a specific participant
  const toggleParticipantOptional = (participantIndex: number, item: OptionalItem) => {
    const updated = [...participants];
    const current = updated[participantIndex];
    const currentOptionals = current.selectedOptionals || [];
    const existing = currentOptionals.find((o) => o.id === item.id);

    if (existing) {
      // Remove the optional
      updated[participantIndex] = {
        ...current,
        selectedOptionals: currentOptionals.filter((o) => o.id !== item.id),
      };
    } else {
      // Add the optional with quantity 1
      updated[participantIndex] = {
        ...current,
        selectedOptionals: [
          ...currentOptionals,
          { id: item.id, name: item.name, price: item.price, quantity: 1 },
        ],
      };
    }

    onParticipantsChange(updated);
  };

  // Update quantity for a participant's optional item
  const updateParticipantOptionalQuantity = (participantIndex: number, itemId: string, delta: number) => {
    const updated = [...participants];
    const current = updated[participantIndex];
    const currentOptionals = current.selectedOptionals || [];

    updated[participantIndex] = {
      ...current,
      selectedOptionals: currentOptionals.map((o) =>
        o.id === itemId
          ? { ...o, quantity: Math.max(1, Math.min(10, o.quantity + delta)) }
          : o
      ),
    };

    onParticipantsChange(updated);
  };

  const lookupClientByCpf = async (index: number, cpf: string) => {
    const cleanedCPF = cpf.replace(/\D/g, '');
    if (cleanedCPF.length !== 11) return;

    setLookingUpCpf(index);
    try {
      const { data, error } = await supabase.rpc('get_client_by_cpf', {
        lookup_cpf: cleanedCPF
      });

      const cliente = Array.isArray(data) ? (data[0] as any) : null;

      if (!error && cliente) {
        const updated = [...participants];
        const current = updated[index];

        // Only prefill empty fields; never overwrite what the user already typed.
        const next: ParticipantFormData = { ...current };

        if (!current.nome_completo.trim() && cliente.nome_completo) {
          next.nome_completo = cliente.nome_completo;
        }

        if (!current.whatsapp.trim() && cliente.whatsapp) {
          next.whatsapp = cliente.whatsapp;
        }

        if (!current.email.trim() && cliente.email) {
          next.email = cliente.email;
        }

        // Prefill birth date only if empty
        if (!current.data_nascimento && cliente.data_nascimento) {
          next.data_nascimento = cliente.data_nascimento;

          const parts = String(cliente.data_nascimento).split('-');
          if (parts.length === 3) {
            next.data_nascimento_ano = parts[0] || '';
            next.data_nascimento_mes = parts[1] || '';
            next.data_nascimento_dia = parts[2] || '';
          }
        }

        // Prefill emergency contact only if empty
        if (!current.contato_emergencia_nome.trim() && cliente.contato_emergencia_nome) {
          next.contato_emergencia_nome = cliente.contato_emergencia_nome;
        }

        if (!current.contato_emergencia_telefone.trim() && cliente.contato_emergencia_telefone) {
          next.contato_emergencia_telefone = cliente.contato_emergencia_telefone;
        }

        // Prefill health fields ONLY if the user hasn't edited them yet
        if (!healthTouched.has(index)) {
          if (typeof cliente.problema_saude === 'boolean') {
            next.problema_saude = cliente.problema_saude;
          }
          if (cliente.descricao_problema_saude) {
            next.descricao_problema_saude = cliente.descricao_problema_saude;
          }
        }

        updated[index] = next;
        onParticipantsChange(updated);
      }
    } catch (error) {
      console.error('Error looking up CPF:', error);
    } finally {
      setLookingUpCpf(null);
    }
  };

  const getParticipantProgress = (p: ParticipantFormData): number => {
    let filled = 0;
    let total = 10; // Required fields: nome, cpf, nascimento, whatsapp, email, embarque, condicionamento, contato_nome, contato_tel, como_conheceu
    if (p.como_conheceu === 'outro') total += 1;
    if (p.nome_completo.trim().length >= 3) filled++;
    if (p.cpf.replace(/\D/g, '').length === 11) filled++;
    if (p.data_nascimento) filled++;
    if (p.whatsapp.replace(/\D/g, '').length >= 10) filled++;
    if (p.email.includes('@')) filled++;
    if (p.ponto_embarque_id) filled++;
    if (p.nivel_condicionamento) filled++;
    if (p.contato_emergencia_nome.trim().length >= 3) filled++;
    if (p.contato_emergencia_telefone.replace(/\D/g, '').length >= 10) filled++;
    if (p.como_conheceu) filled++;
    if (p.como_conheceu === 'outro' && p.como_conheceu_outro.trim()) filled++;
    return Math.round((filled / total) * 100);
  };

  return (
    <Card className="bg-white shadow-lg border-purple-200">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados dos participantes
          </h3>
          <p className="text-xs text-muted-foreground">
            Preencha os dados de cada pessoa que participará da experiência
          </p>
        </div>

        <div className="space-y-3">
          {participants.map((participant, index) => {
            const isExpanded = expandedParticipants.has(index);
            const progress = getParticipantProgress(participant);
            const isValid = isParticipantValid(participant);
            const canExpand = canExpandParticipant(index);
            const isLocked = !canExpand && !isExpanded;

            return (
              <div 
                key={index}
                ref={el => participantRefs.current[index] = el}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  isLocked && "opacity-60"
                )}
              >
                {/* Participant Header - Always visible */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(index)}
                  disabled={isLocked}
                  className={cn(
                    "w-full p-3 flex items-center justify-between transition-colors",
                    isLocked 
                      ? "bg-muted/20 cursor-not-allowed" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      isValid ? 'bg-green-500 text-white' : 
                      isLocked ? 'bg-gray-200 text-gray-400' : 'bg-purple-100 text-purple-700'
                    )}>
                      {isValid ? '✓' : isLocked ? '🔒' : index + 1}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {participant.nome_completo || `Participante ${index + 1}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {participant.pricingOptionName}
                        </Badge>
                        {isLocked ? (
                          <span className="text-xs text-muted-foreground">
                            Complete o participante anterior primeiro
                          </span>
                        ) : !isValid && (
                          <span className="text-xs text-muted-foreground">
                            {progress}% preenchido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isLocked && (
                    isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )
                  )}
                </button>

                {/* Participant Form - Expandable */}
                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {/* CPF and Name */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">CPF *</Label>
                        <div className="relative">
                          <Input
                            value={formatarCPF(participant.cpf)}
                            onChange={(e) => updateParticipant(index, 'cpf', e.target.value.replace(/\D/g, ''))}
                            onBlur={() => lookupClientByCpf(index, participant.cpf)}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="text-sm"
                          />
                          {lookingUpCpf === index && (
                            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome Completo *</Label>
                        <Input
                          value={participant.nome_completo}
                          onChange={(e) => updateParticipant(index, 'nome_completo', e.target.value)}
                          placeholder="Nome completo"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Birth date - Separate fields */}
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Nascimento *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <select
                            value={participant.data_nascimento_dia}
                            onChange={(e) => updateParticipant(index, 'data_nascimento_dia', e.target.value)}
                            className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Dia</option>
                            {DAY_OPTIONS.map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={participant.data_nascimento_mes}
                            onChange={(e) => updateParticipant(index, 'data_nascimento_mes', e.target.value)}
                            className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Mês</option>
                            {MONTH_OPTIONS.map(month => (
                              <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={participant.data_nascimento_ano}
                            onChange={(e) => updateParticipant(index, 'data_nascimento_ano', e.target.value)}
                            className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Ano</option>
                            {YEAR_OPTIONS.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp and Email */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">WhatsApp *</Label>
                        <PhoneInput
                          value={participant.whatsapp}
                          onChange={(value) => updateParticipant(index, 'whatsapp', value.replace(/\D/g, ''))}
                          countryCode={participant.whatsapp_country_code || '+55'}
                          onCountryCodeChange={(code) => updateParticipant(index, 'whatsapp_country_code', code)}
                          placeholder="(00) 00000-0000"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">E-mail *</Label>
                        <Input
                          type="email"
                          value={participant.email}
                          onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                          placeholder="email@exemplo.com"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Instagram (optional) */}
                    <div className="space-y-1">
                      <Label className="text-xs">Instagram <span className="text-muted-foreground">(opcional)</span></Label>
                      <Input
                        type="text"
                        value={participant.instagram}
                        onChange={(e) => updateParticipant(index, 'instagram', e.target.value.replace(/\s/g, ''))}
                        placeholder="@seuinstagram"
                        className="text-sm"
                      />
                    </div>

                    {/* Boarding point - Select */}
                    <div className="space-y-2">
                      <Label className="text-xs">Ponto de Embarque *</Label>
                      <select
                        value={participant.ponto_embarque_id}
                        onChange={(e) => setBoardingPoint(index, e.target.value)}
                        className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione o ponto de embarque...</option>
                        {boardingPoints.map((point) => (
                          <option key={point.id} value={point.id}>
                            {point.horario ? `${point.horario} - ` : ''}{point.nome}{point.endereco ? ` (${point.endereco})` : ''}
                          </option>
                        ))}
                        <option value="outro">Outro local (na rota)</option>
                      </select>
                      
                      {/* Custom boarding point input and info */}
                      {participant.ponto_embarque_id === 'outro' && (
                        <div className="ml-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="bg-muted/40 border border-border rounded-md p-2">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Podemos adicionar outros pontos que estejam na rota de embarque, sujeito à aprovação da equipe da Camaleão.{' '}
                              <a 
                                href={`https://wa.me/5582993649454?text=${encodeURIComponent(`Olá! Gostaria de adicionar um ponto de embarque na rota para o passeio "${tourName || 'Camaleão'}". O local seria: `)}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-semibold text-primary underline hover:opacity-80"
                              >
                                Consultar equipe
                              </a>
                            </p>
                          </div>
                          <Input
                            value={participant.ponto_embarque_personalizado}
                            onChange={(e) => updateParticipant(index, 'ponto_embarque_personalizado', e.target.value)}
                            placeholder="Digite o endereço do ponto de embarque"
                            className={cn(
                              "text-sm",
                              participant.ponto_embarque_id === 'outro' && !participant.ponto_embarque_personalizado.trim() && "border-primary/50 focus:border-primary"
                            )}
                          />
                          {participant.ponto_embarque_id === 'outro' && !participant.ponto_embarque_personalizado.trim() && (
                            <p className="text-xs text-muted-foreground">Informe o endereço do ponto de embarque desejado.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Physical conditioning - Select */}
                    <div className="space-y-2">
                      <Label className="text-xs">Nível de Condicionamento Físico *</Label>
                      <select
                        value={participant.nivel_condicionamento}
                        onChange={(e) => updateParticipant(index, 'nivel_condicionamento', e.target.value)}
                        className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione seu nível...</option>
                        {NIVEL_CONDICIONAMENTO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Health issues */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Switch
                          id={`health-${index}`}
                          checked={participant.problema_saude}
                          onCheckedChange={(checked) => {
                            updateParticipant(index, 'problema_saude', checked);
                          }}
                          className="mt-0.5 shrink-0"
                        />
                        <Label 
                          htmlFor={`health-${index}`}
                          className="text-xs cursor-pointer leading-relaxed"
                        >
                          Existe alguma condição de saúde, alergia, uso de medicamentos ou algo relacionado à sua saúde que possa impactar sua experiência?
                        </Label>
                      </div>
                      {participant.problema_saude && (
                        <div className="space-y-1">
                          <Textarea
                            value={participant.descricao_problema_saude}
                            onChange={(e) => updateParticipant(index, 'descricao_problema_saude', e.target.value)}
                            placeholder="Descreva detalhadamente... (obrigatório)"
                            rows={2}
                            className={cn(
                              "text-sm",
                              participant.problema_saude && !participant.descricao_problema_saude.trim() && "border-red-300 focus:border-red-500"
                            )}
                            required
                          />
                          {participant.problema_saude && !participant.descricao_problema_saude.trim() && (
                            <p className="text-xs text-red-500">Por favor, descreva detalhadamente sua condição de saúde.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Health insurance */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Switch
                          id={`health-insurance-${index}`}
                          checked={participant.plano_saude === true}
                          onCheckedChange={(checked) => {
                            updateParticipant(index, 'plano_saude', checked);
                          }}
                          className="mt-0.5 shrink-0"
                        />
                        <Label 
                          htmlFor={`health-insurance-${index}`}
                          className="text-xs cursor-pointer leading-relaxed"
                        >
                          Você possui plano de saúde?
                        </Label>
                      </div>
                      {participant.plano_saude && (
                        <div className="space-y-1">
                          <Input
                            value={participant.nome_plano_saude}
                            onChange={(e) => updateParticipant(index, 'nome_plano_saude', e.target.value)}
                            placeholder="Nome do plano de saúde"
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Emergency contact - Required */}
                    <div className="space-y-2">
                      <Label className="text-xs">Contato de Emergência *</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          value={participant.contato_emergencia_nome}
                          onChange={(e) => updateParticipant(index, 'contato_emergencia_nome', e.target.value)}
                          placeholder="Nome do contato"
                          className="text-sm"
                        />
                        <PhoneInput
                          value={participant.contato_emergencia_telefone}
                          onChange={(value) => updateParticipant(index, 'contato_emergencia_telefone', value.replace(/\D/g, ''))}
                          countryCode={participant.contato_emergencia_country_code || '+55'}
                          onCountryCodeChange={(code) => updateParticipant(index, 'contato_emergencia_country_code', code)}
                          placeholder="Telefone do contato"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* How did you learn about Camaleão */}
                    <div className="space-y-2">
                      <Label className="text-xs">Como conheceu a Camaleão? *</Label>
                      <RadioGroup
                        value={participant.como_conheceu}
                        onValueChange={(v) => {
                          updateParticipantFields(index, {
                            como_conheceu: v,
                            // Clear the free-text field when switching away from "outro"
                            ...(v !== 'outro' ? { como_conheceu_outro: '' } : {}),
                          });
                        }}
                        className="space-y-2"
                      >
                        {COMO_CONHECEU_OPTIONS.map((opt) => (
                          <div
                            key={opt.value}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              updateParticipantFields(index, {
                                como_conheceu: opt.value,
                                ...(opt.value !== 'outro' ? { como_conheceu_outro: '' } : {}),
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                updateParticipantFields(index, {
                                  como_conheceu: opt.value,
                                  ...(opt.value !== 'outro' ? { como_conheceu_outro: '' } : {}),
                                });
                              }
                            }}
                            className="flex items-start space-x-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                          >
                            <RadioGroupItem
                              value={opt.value}
                              id={`como-${index}-${opt.value}`}
                              className="mt-0.5 h-3.5 w-3.5"
                            />
                            <Label
                              htmlFor={`como-${index}-${opt.value}`}
                              className="text-xs font-normal cursor-pointer flex-1"
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

                      {participant.como_conheceu === 'outro' && (
                        <Input
                          value={participant.como_conheceu_outro}
                          onChange={(e) => updateParticipant(index, 'como_conheceu_outro', e.target.value)}
                          placeholder="Descreva como conheceu..."
                          className="text-sm mt-2"
                        />
                      )}
                    </div>
                    {index < participants.length - 1 && (
                      <div className="pt-4 border-t space-y-2">
                        {showMissingMessage === index && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-800">
                              <p className="font-medium mb-1">Preencha os campos obrigatórios:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {getMissingFields(participant).map((field, i) => (
                                  <li key={i}>{field}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleContinueToNext(index)}
                          className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                        >
                          Continuar para Participante {index + 2}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary and Continue Button */}
        <div className="pt-2 space-y-3">
          <div className="text-xs text-center text-muted-foreground">
            {participants.filter(isParticipantValid).length} de {participants.length} participantes com dados completos
          </div>
          
          {/* Show all missing fields message */}
          {showMissingMessage === -1 && !allParticipantsValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 mb-1">Dados incompletos</p>
                  {participants.map((p, idx) => {
                    const missing = getMissingFields(p);
                    if (missing.length === 0) return null;
                    return (
                      <div key={idx} className="text-red-600 mb-1">
                        <span className="font-medium">Participante {idx + 1}:</span> {missing.join(', ')}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={() => {
              if (!allParticipantsValid) {
                setShowMissingMessage(-1);
                // Find first invalid participant and expand it
                const firstInvalidIndex = participants.findIndex(p => !isParticipantValid(p));
                if (firstInvalidIndex >= 0) {
                  setExpandedParticipants(new Set([firstInvalidIndex]));
                  setScrollToIndex(firstInvalidIndex);
                }
                // Auto-hide after 8 seconds
                setTimeout(() => setShowMissingMessage(null), 8000);
                return;
              }
              onConfirm();
            }}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Continuar para pagamento'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};