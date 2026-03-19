import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, MapPin, Star } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientProfileProps {
  clientData: {
    total_points: number;
    cliente: {
      nome_completo: string;
      cpf: string;
      email: string;
      whatsapp: string;
      data_nascimento: string;
    };
    level: {
      name: string;
      color: string;
      benefits: string;
    } | null;
  };
}

const ClientProfile = ({ clientData }: ClientProfileProps) => {
  const formatCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };

  // Parse date-only string as local date to avoid timezone issues
  const parseDateAsLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const birthDate = parseDateAsLocal(clientData.cliente.data_nascimento);
  const age = differenceInYears(new Date(), birthDate);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 h-24 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <User className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>
        <CardContent className="pt-16 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{clientData.cliente.nome_completo}</h2>
              {clientData.level && (
                <Badge 
                  className="mt-2"
                  style={{ 
                    backgroundColor: clientData.level.color + '20', 
                    color: clientData.level.color,
                    borderColor: clientData.level.color
                  }}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {clientData.level.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Star className="w-6 h-6" />
              {clientData.total_points} pontos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-medium">{formatCPF(clientData.cliente.cpf)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">
                  {format(birthDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  <span className="text-muted-foreground ml-2">({age} anos)</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium break-all">{clientData.cliente.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{formatPhone(clientData.cliente.whatsapp)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Benefits */}
      {clientData.level && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Benefícios do Nível {clientData.level.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{clientData.level.benefits}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientProfile;
