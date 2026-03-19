import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, User, Calendar, Mail, Phone, MapPin, Heart, AlertCircle, Activity, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ParticipantData, 
  formatCPF, 
  formatPhone, 
  calculateAge,
  getNivelCondicionamentoLabel,
  PARTICIPANT_SECTIONS 
} from '@/types/participant';

interface BoardingPoint {
  id: string;
  nome: string;
  endereco?: string;
}

interface ParticipantDetailsViewProps {
  participant: ParticipantData;
  boardingPoints?: BoardingPoint[];
  showAdminFields?: boolean;
}

export const ParticipantDetailsView: React.FC<ParticipantDetailsViewProps> = ({
  participant,
  boardingPoints = [],
  showAdminFields = false
}) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência` });
  };

  const getBoardingPointName = (id: string) => {
    const point = boardingPoints.find(p => p.id === id);
    return point?.nome || 'Não informado';
  };

  const getBoardingPointAddress = (id: string) => {
    const point = boardingPoints.find(p => p.id === id);
    return point?.endereco || '';
  };

  return (
    <div className="space-y-6">
      {/* Dados Pessoais */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          DADOS PESSOAIS
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">CPF:</span>
            <span className="text-sm">{formatCPF(participant.cpf)}</span>
            {participant.cpf && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => copyToClipboard(participant.cpf, 'CPF')}>
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
          {participant.data_nascimento && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(participant.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                <span className="text-muted-foreground ml-1">({calculateAge(participant.data_nascimento)} anos)</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{participant.email || 'Não informado'}</span>
            {participant.email && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => copyToClipboard(participant.email, 'Email')}>
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatPhone(participant.whatsapp) || 'Não informado'}</span>
            {participant.whatsapp && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => copyToClipboard(participant.whatsapp, 'WhatsApp')}>
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Ponto de Embarque */}
      {participant.ponto_embarque_id && (
        <>
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              PONTO DE EMBARQUE
            </h4>
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm font-medium text-primary">{getBoardingPointName(participant.ponto_embarque_id)}</div>
              {getBoardingPointAddress(participant.ponto_embarque_id) && (
                <div className="text-xs text-muted-foreground">{getBoardingPointAddress(participant.ponto_embarque_id)}</div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Condicionamento Físico */}
      {participant.nivel_condicionamento && (
        <>
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              CONDICIONAMENTO FÍSICO
            </h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">{getNivelCondicionamentoLabel(participant.nivel_condicionamento)}</span>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Saúde e Assistência */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            SAÚDE
          </h4>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Problema de Saúde:</span>
              <Badge variant={participant.problema_saude ? "destructive" : "secondary"}>
                {participant.problema_saude ? 'Sim' : 'Não'}
              </Badge>
            </div>
            {participant.problema_saude && participant.descricao_problema_saude && (
              <div className="text-sm text-muted-foreground bg-red-50 p-2 rounded mt-2">
                {participant.descricao_problema_saude}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            ASSISTÊNCIA DIFERENCIADA
          </h4>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Necessita:</span>
              <Badge variant={participant.assistencia_diferenciada ? "default" : "secondary"}>
                {participant.assistencia_diferenciada ? 'Sim' : 'Não'}
              </Badge>
            </div>
            {participant.assistencia_diferenciada && participant.descricao_assistencia_diferenciada && (
              <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded mt-2">
                {participant.descricao_assistencia_diferenciada}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Contato de Emergência */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          CONTATO DE EMERGÊNCIA
        </h4>
        <div className="p-3 bg-muted/50 rounded-lg">
          {participant.contato_emergencia_nome ? (
            <>
              <div className="text-sm font-medium">{participant.contato_emergencia_nome}</div>
              <div className="text-sm text-muted-foreground">{formatPhone(participant.contato_emergencia_telefone)}</div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">Não informado</span>
          )}
        </div>
      </div>

      {/* Observações (Admin) */}
      {showAdminFields && participant.observacoes && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">OBSERVAÇÕES</h4>
            <div className="p-3 bg-muted/50 rounded-lg text-sm">{participant.observacoes}</div>
          </div>
        </>
      )}
    </div>
  );
};
