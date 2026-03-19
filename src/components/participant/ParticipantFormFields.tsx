import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhoneInput } from "@/components/ui/phone-input";
import { ParticipantData, NIVEL_CONDICIONAMENTO_OPTIONS, COMO_CONHECEU_OPTIONS, PARTICIPANT_SECTIONS } from "@/types/participant";
import { Loader2 } from "lucide-react";

interface BoardingPoint {
  id: string;
  nome: string;
  endereco?: string;
  horario?: string | null;
}

interface ParticipantFormFieldsProps {
  data: ParticipantData;
  onChange: (field: keyof ParticipantData, value: string | boolean) => void;
  boardingPoints: BoardingPoint[];
  onCpfBlur?: () => void;
  isLookingUpCpf?: boolean;
  showAdminFields?: boolean;
  disabled?: boolean;
}

export const ParticipantFormFields: React.FC<ParticipantFormFieldsProps> = ({
  data,
  onChange,
  boardingPoints,
  onCpfBlur,
  isLookingUpCpf = false,
  showAdminFields = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      {PARTICIPANT_SECTIONS.filter((section) => !section.adminOnly || showAdminFields).map((section) => (
        <div key={section.id} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{section.title}</h4>

          {section.id === "dados_pessoais" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cpf">CPF</Label>
                <div className="relative">
                  <Input
                    id="cpf"
                    value={data.cpf}
                    onChange={(e) => onChange("cpf", e.target.value)}
                    onBlur={onCpfBlur}
                    placeholder="000.000.000-00"
                    className="pr-8"
                    disabled={disabled}
                  />
                  {isLookingUpCpf && (
                    <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  value={data.nome_completo}
                  onChange={(e) => onChange("nome_completo", e.target.value)}
                  placeholder="Nome completo"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={data.data_nascimento}
                  onChange={(e) => onChange("data_nascimento", e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <PhoneInput
                  id="whatsapp"
                  value={data.whatsapp}
                  onChange={(value) => onChange("whatsapp", value)}
                  countryCode={data.whatsapp_country_code || '+55'}
                  onCountryCodeChange={(code) => onChange("whatsapp_country_code", code)}
                  placeholder="(00) 00000-0000"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {section.id === "embarque" && (
            <Select
              value={data.ponto_embarque_id}
              onValueChange={(value) => onChange("ponto_embarque_id", value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ponto de embarque" />
              </SelectTrigger>
              <SelectContent>
                {boardingPoints.map((point) => (
                  <SelectItem key={point.id} value={point.id}>
                    {point.horario ? `${point.horario} - ` : ''}{point.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {section.id === "condicionamento" && (
            <Select
              value={data.nivel_condicionamento}
              onValueChange={(value) => onChange("nivel_condicionamento", value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {NIVEL_CONDICIONAMENTO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {section.id === "saude" && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  checked={data.problema_saude}
                  onCheckedChange={(checked) => onChange("problema_saude", checked)}
                  disabled={disabled}
                />
                <Label>
                  Existe alguma condição de saúde, alergia, uso de medicamentos ou algo relacionado à sua saúde que
                  possa impactar sua experiência?
                </Label>
              </div>
              {data.problema_saude && (
                <Textarea
                  value={data.descricao_problema_saude}
                  onChange={(e) => onChange("descricao_problema_saude", e.target.value)}
                  placeholder="Descreva detalhadamente..."
                  rows={2}
                  disabled={disabled}
                />
              )}
              
              <div className="flex items-center gap-3 mt-4">
                <Switch
                  checked={data.plano_saude}
                  onCheckedChange={(checked) => {
                    onChange("plano_saude", checked);
                    if (!checked) {
                      onChange("nome_plano_saude", "");
                    }
                  }}
                  disabled={disabled}
                />
                <Label>Possui plano de saúde?</Label>
              </div>
              {data.plano_saude && (
                <Input
                  value={data.nome_plano_saude}
                  onChange={(e) => onChange("nome_plano_saude", e.target.value)}
                  placeholder="Nome do plano de saúde"
                  disabled={disabled}
                />
              )}
            </>
          )}

          {section.id === "assistencia" && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  checked={data.assistencia_diferenciada}
                  onCheckedChange={(checked) => onChange("assistencia_diferenciada", checked)}
                  disabled={disabled}
                />
                <Label>Precisa de assistência diferenciada?</Label>
              </div>
              {data.assistencia_diferenciada && (
                <Textarea
                  value={data.descricao_assistencia_diferenciada}
                  onChange={(e) => onChange("descricao_assistencia_diferenciada", e.target.value)}
                  placeholder="Descreva a assistência necessária..."
                  rows={2}
                  disabled={disabled}
                />
              )}
            </>
          )}

          {section.id === "emergencia" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contato_emergencia_nome">Nome</Label>
                <Input
                  id="contato_emergencia_nome"
                  value={data.contato_emergencia_nome}
                  onChange={(e) => onChange("contato_emergencia_nome", e.target.value)}
                  placeholder="Nome do contato"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contato_emergencia_telefone">Telefone</Label>
                <PhoneInput
                  id="contato_emergencia_telefone"
                  value={data.contato_emergencia_telefone}
                  onChange={(value) => onChange("contato_emergencia_telefone", value)}
                  countryCode={data.contato_emergencia_country_code || '+55'}
                  onCountryCodeChange={(code) => onChange("contato_emergencia_country_code", code)}
                  placeholder="(00) 00000-0000"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {section.id === "como_conheceu" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Como ficou sabendo dessa viagem?</Label>
              <RadioGroup
                value={data.como_conheceu}
                onValueChange={(value) => {
                  onChange("como_conheceu", value);
                  if (value !== 'outro') {
                    onChange("como_conheceu_outro", "");
                  }
                }}
                disabled={disabled}
                className="space-y-1"
              >
                {COMO_CONHECEU_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center gap-3 p-2.5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    onClick={() => {
                      if (disabled) return;
                      onChange("como_conheceu", option.value);
                      if (option.value !== "outro") {
                        onChange("como_conheceu_outro", "");
                      }
                    }}
                  >
                    <RadioGroupItem 
                      value={option.value} 
                      id={`como-conheceu-${option.value}`} 
                      className="h-4 w-4 shrink-0" 
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </RadioGroup>
              
              {data.como_conheceu === 'outro' && (
                <Input
                  value={data.como_conheceu_outro}
                  onChange={(e) => onChange("como_conheceu_outro", e.target.value)}
                  placeholder="Descreva como conheceu..."
                  disabled={disabled}
                  className="mt-2"
                />
              )}
            </div>
          )}

          {section.id === "observacoes" && showAdminFields && (
            <Textarea
              value={data.observacoes || ""}
              onChange={(e) => onChange("observacoes", e.target.value)}
              placeholder="Observações internas (visível apenas para admin)..."
              rows={3}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  );
};
