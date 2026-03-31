import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Calendar, Star, Pencil, X, Check, Loader2 } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientProfileProps {
  clientData: {
    total_points: number;
    cliente: {
      id: string;
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
  onUpdate?: (updates: { nome_completo: string; email: string; whatsapp: string; data_nascimento: string }) => void;
}

const ClientProfile = ({ clientData, onUpdate }: ClientProfileProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: clientData.cliente.nome_completo,
    email: clientData.cliente.email,
    whatsapp: clientData.cliente.whatsapp,
    data_nascimento: clientData.cliente.data_nascimento,
  });

  const formatCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };

  const parseDateAsLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const birthDate = parseDateAsLocal(clientData.cliente.data_nascimento);
  const age = differenceInYears(new Date(), birthDate);

  const handleCancel = () => {
    setForm({
      nome_completo: clientData.cliente.nome_completo,
      email: clientData.cliente.email,
      whatsapp: clientData.cliente.whatsapp,
      data_nascimento: clientData.cliente.data_nascimento,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.nome_completo.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('clientes')
      .update({
        nome_completo: form.nome_completo.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        data_nascimento: form.data_nascimento,
      })
      .eq('id', clientData.cliente.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Dados atualizados com sucesso!' });
    onUpdate?.(form);
    setIsEditing(false);
  };

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
                    borderColor: clientData.level.color,
                  }}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {clientData.level.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Star className="w-6 h-6" />
                {clientData.total_points} pontos
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      {isEditing ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Editar dados</CardTitle>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={form.nome_completo}
                  onChange={e => setForm(f => ({ ...f, nome_completo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nascimento">Data de nascimento</Label>
                <Input
                  id="nascimento"
                  type="date"
                  value={form.data_nascimento}
                  onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="(82) 99999-9999"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Salvar alterações
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* View mode */
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
      )}

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
