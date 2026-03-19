import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Users, Check, X, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ParsedParticipant {
  nome_completo: string;
  whatsapp: string;
  data_nascimento: string;
  email: string;
  cpf: string;
  problema_saude: boolean;
  descricao_problema_saude: string;
  contato_emergencia: string;
  ponto_embarque_id?: string;
  valid: boolean;
  errors: string[];
}

interface BulkParticipantUploadProps {
  tourId: string;
  boardingPoints: Array<{ id: string; nome: string }>;
  onSuccess: () => void;
  valorPadrao?: number;
}

// Normalize WhatsApp number - remove country code 55 if present, keep only 10-11 digits
const normalizeWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  // Remove country code 55 if present (Brazilian numbers)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

// Download template Excel file
const downloadTemplate = () => {
  const headers = [
    'Nome completo',
    'Whatsapp',
    'Data de Nascimento',
    'Email',
    'CPF',
    'Problema de Saúde',
    'Qual?',
    'Contato de emergência',
    'Ponto de embarque'
  ];
  
  const exampleData = [
    ['João da Silva', '82999999999', '01/01/1990', 'joao@email.com', '12345678900', 'Não', '', 'Maria (mãe)', 'Maceió'],
    ['Maria Santos', '82988888888', '15/05/1985', 'maria@email.com', '98765432100', 'Sim', 'Diabetes', 'Pedro (marido)', 'Arapiraca']
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Nome
    { wch: 15 }, // Whatsapp
    { wch: 18 }, // Data Nascimento
    { wch: 25 }, // Email
    { wch: 14 }, // CPF
    { wch: 16 }, // Problema Saúde
    { wch: 20 }, // Qual?
    { wch: 25 }, // Contato Emergência
    { wch: 20 }  // Ponto Embarque
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
  XLSX.writeFile(wb, 'modelo_importacao_participantes.xlsx');
};

const BulkParticipantUpload: React.FC<BulkParticipantUploadProps> = ({
  tourId,
  boardingPoints,
  onSuccess,
  valorPadrao = 0
}) => {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [parsedParticipants, setParsedParticipants] = useState<ParsedParticipant[]>([]);
  const [defaultBoardingPoint, setDefaultBoardingPoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const { toast } = useToast();

  // Find boarding point ID by name
  const findBoardingPointId = (name: string): string | undefined => {
    if (!name) return undefined;
    const normalizedName = name.toLowerCase().trim();
    const found = boardingPoints.find(bp => 
      bp.nome.toLowerCase().trim() === normalizedName ||
      bp.nome.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(bp.nome.toLowerCase())
    );
    return found?.id;
  };

  // Parse text input - new column order
  const parseTextInput = (text: string): ParsedParticipant[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const participants: ParsedParticipant[] = [];

    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      
      // Expected order: Nome, Whatsapp, Data Nascimento, Email, CPF, Problema Saúde, Qual?, Contato Emergência, Ponto Embarque
      const participant: ParsedParticipant = {
        nome_completo: parts[0] || '',
        whatsapp: normalizeWhatsApp(parts[1] || ''),
        data_nascimento: '',
        email: (parts[3] || '').toLowerCase(),
        cpf: (parts[4] || '').replace(/\D/g, ''),
        problema_saude: ['sim', 's', 'yes', 'true', '1'].includes((parts[5] || '').toLowerCase()),
        descricao_problema_saude: parts[6] || '',
        contato_emergencia: parts[7] || '',
        ponto_embarque_id: findBoardingPointId(parts[8] || '') || defaultBoardingPoint,
        valid: false,
        errors: []
      };

      // Parse date (column 2)
      const dateValue = parts[2];
      if (dateValue) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
          const [day, month, year] = dateValue.split('/');
          participant.data_nascimento = `${year}-${month}-${day}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          participant.data_nascimento = dateValue;
        }
      }

      // Validate
      if (!participant.nome_completo) participant.errors.push('Nome obrigatório');
      if (!participant.cpf || participant.cpf.length !== 11) participant.errors.push('CPF inválido');
      if (!participant.email || !participant.email.includes('@')) participant.errors.push('Email inválido');
      if (!participant.whatsapp || participant.whatsapp.length < 10 || participant.whatsapp.length > 11) participant.errors.push('WhatsApp inválido');
      if (!participant.data_nascimento) participant.errors.push('Data nascimento obrigatória');

      participant.valid = participant.errors.length === 0;
      participants.push(participant);
    }

    return participants;
  };

  // Parse Excel/CSV file - new column order
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Skip header row if it exists
        const startRow = jsonData[0]?.some((cell: any) => 
          typeof cell === 'string' && 
          ['nome', 'cpf', 'email', 'whatsapp', 'telefone', 'nascimento'].some(h => 
            cell.toLowerCase().includes(h)
          )
        ) ? 1 : 0;

        const participants: ParsedParticipant[] = [];
        
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          // Column order: Nome, Whatsapp, Data Nascimento, Email, CPF, Problema Saúde, Qual?, Contato Emergência, Ponto Embarque
          const problemaSaudeValue = String(row[5] || '').toLowerCase();
          
          const participant: ParsedParticipant = {
            nome_completo: String(row[0] || '').trim(),
            whatsapp: normalizeWhatsApp(String(row[1] || '')),
            data_nascimento: '',
            email: String(row[3] || '').trim().toLowerCase(),
            cpf: String(row[4] || '').replace(/\D/g, ''),
            problema_saude: ['sim', 's', 'yes', 'true', '1'].includes(problemaSaudeValue),
            descricao_problema_saude: String(row[6] || '').trim(),
            contato_emergencia: String(row[7] || '').trim(),
            ponto_embarque_id: findBoardingPointId(String(row[8] || '')) || defaultBoardingPoint,
            valid: false,
            errors: []
          };

          // Parse date (column 2)
          const dateValue = row[2];
          if (dateValue) {
            if (typeof dateValue === 'number') {
              // Excel date serial number
              const date = XLSX.SSF.parse_date_code(dateValue);
              participant.data_nascimento = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            } else {
              const dateStr = String(dateValue);
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('/');
                participant.data_nascimento = `${year}-${month}-${day}`;
              } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                participant.data_nascimento = dateStr;
              }
            }
          }

          // Validate
          if (!participant.nome_completo) participant.errors.push('Nome obrigatório');
          if (!participant.cpf || participant.cpf.length !== 11) participant.errors.push('CPF inválido');
          if (!participant.email || !participant.email.includes('@')) participant.errors.push('Email inválido');
          if (!participant.whatsapp || participant.whatsapp.length < 10 || participant.whatsapp.length > 11) participant.errors.push('WhatsApp inválido');
          if (!participant.data_nascimento) participant.errors.push('Data nascimento obrigatória');

          participant.valid = participant.errors.length === 0;
          participants.push(participant);
        }

        setParsedParticipants(participants);
        setStep('preview');
      } catch (error) {
        toast({
          title: 'Erro ao processar arquivo',
          description: 'Verifique se o arquivo está no formato correto.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTextParse = () => {
    if (!textInput.trim()) {
      toast({
        title: 'Texto vazio',
        description: 'Cole os dados dos participantes.',
        variant: 'destructive'
      });
      return;
    }
    const participants = parseTextInput(textInput);
    setParsedParticipants(participants);
    setStep('preview');
  };

  const updateParticipant = (index: number, field: keyof ParsedParticipant, value: string | boolean) => {
    setParsedParticipants(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      
      // Revalidate
      const p = updated[index];
      p.errors = [];
      if (!p.nome_completo) p.errors.push('Nome obrigatório');
      if (!p.cpf || p.cpf.replace(/\D/g, '').length !== 11) p.errors.push('CPF inválido');
      if (!p.email || !p.email.includes('@')) p.errors.push('Email inválido');
      if (!p.whatsapp || p.whatsapp.replace(/\D/g, '').length < 10) p.errors.push('WhatsApp inválido');
      if (!p.data_nascimento) p.errors.push('Data nascimento obrigatória');
      p.valid = p.errors.length === 0;
      
      return updated;
    });
  };

  const removeParticipant = (index: number) => {
    setParsedParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validParticipants = parsedParticipants.filter(p => p.valid);
    
    if (validParticipants.length === 0) {
      toast({
        title: 'Nenhum participante válido',
        description: 'Corrija os erros antes de importar.',
        variant: 'destructive'
      });
      return;
    }

    if (!defaultBoardingPoint && validParticipants.some(p => !p.ponto_embarque_id)) {
      toast({
        title: 'Ponto de embarque',
        description: 'Selecione um ponto de embarque padrão ou preencha na planilha.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const participant of validParticipants) {
        try {
          // Check if client exists
          const { data: existingClient } = await supabase
            .from('clientes')
            .select('id')
            .eq('cpf', participant.cpf)
            .maybeSingle();

          let clienteId: string;

          if (existingClient) {
            clienteId = existingClient.id;
          } else {
            // Create new client
            const { data: newClient, error: clientError } = await supabase
              .from('clientes')
              .insert({
                nome_completo: participant.nome_completo,
                cpf: participant.cpf,
                email: participant.email,
                whatsapp: participant.whatsapp,
                data_nascimento: participant.data_nascimento,
                problema_saude: participant.problema_saude,
                descricao_problema_saude: participant.descricao_problema_saude || null,
                contato_emergencia_nome: participant.contato_emergencia || null,
                capture_method: 'bulk_import'
              })
              .select()
              .single();

            if (clientError) throw clientError;
            clienteId = newClient.id;
          }

          // Create reservation
          const { error: reservaError } = await supabase
            .from('reservas')
            .insert({
              cliente_id: clienteId,
              tour_id: tourId,
              ponto_embarque_id: participant.ponto_embarque_id || defaultBoardingPoint,
              contato_emergencia_nome: participant.contato_emergencia || null,
              contato_emergencia_telefone: null,
              problema_saude: participant.problema_saude,
              descricao_problema_saude: participant.descricao_problema_saude || null,
              valor_passeio: valorPadrao,
              status: 'confirmado',
              payment_status: 'pendente',
              capture_method: 'bulk_import'
            });

          if (reservaError) throw reservaError;
          successCount++;
        } catch (error) {
          console.error('Error adding participant:', error);
          errorCount++;
        }
      }

      toast({
        title: 'Importação concluída',
        description: `${successCount} participantes adicionados${errorCount > 0 ? `, ${errorCount} erros` : ''}.`
      });

      if (successCount > 0) {
        onSuccess();
        setOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTextInput('');
    setParsedParticipants([]);
    setStep('input');
  };

  const validCount = parsedParticipants.filter(p => p.valid).length;
  const invalidCount = parsedParticipants.filter(p => !p.valid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Importar em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Participantes em Massa
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ponto de Embarque Padrão (usado quando não informado na planilha)</Label>
              <Select value={defaultBoardingPoint} onValueChange={setDefaultBoardingPoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ponto de embarque" />
                </SelectTrigger>
                <SelectContent>
                  {boardingPoints.map(bp => (
                    <SelectItem key={bp.id} value={bp.id}>{bp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Colar Texto</TabsTrigger>
                <TabsTrigger value="file">Importar Planilha</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label>Cole os dados dos participantes</Label>
                  <Textarea
                    placeholder={`Cole os dados separados por vírgula, ponto e vírgula ou tab:

Nome Completo, Whatsapp, Data Nascimento, Email, CPF, Problema Saúde, Qual?, Contato Emergência, Ponto Embarque

Exemplo:
João Silva, 82999999999, 01/01/1990, joao@email.com, 12345678900, Não, , Maria (mãe), Maceió
Maria Santos, 82988888888, 15/05/1985, maria@email.com, 98765432100, Sim, Diabetes, Pedro (marido), Arapiraca`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                <Button onClick={handleTextParse} className="w-full">
                  Processar Texto
                </Button>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Formato esperado das colunas (nesta ordem):
                    </p>
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      Nome completo | Whatsapp | Data de Nascimento | Email | CPF | Problema de Saúde | Qual? | Contato de emergência | Ponto de embarque
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Modelo de Planilha
                  </Button>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Ou importe sua planilha preenchida:</p>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv,.numbers"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  {validCount} válidos
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} com erros
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Voltar
              </Button>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Saúde</TableHead>
                    <TableHead>Qual?</TableHead>
                    <TableHead>Contato Emerg.</TableHead>
                    <TableHead>Ponto Emb.</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedParticipants.map((participant, index) => (
                    <TableRow key={index} className={!participant.valid ? 'bg-red-50' : ''}>
                      <TableCell>
                        {participant.valid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span title={participant.errors.join(', ')}>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.nome_completo}
                          onChange={(e) => updateParticipant(index, 'nome_completo', e.target.value)}
                          className="h-8 text-sm min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.whatsapp}
                          onChange={(e) => updateParticipant(index, 'whatsapp', e.target.value)}
                          className="h-8 text-sm w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={participant.data_nascimento}
                          onChange={(e) => updateParticipant(index, 'data_nascimento', e.target.value)}
                          className="h-8 text-sm w-[140px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.email}
                          onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                          className="h-8 text-sm min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.cpf}
                          onChange={(e) => updateParticipant(index, 'cpf', e.target.value)}
                          className="h-8 text-sm w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={participant.problema_saude ? 'sim' : 'nao'}
                          onValueChange={(v) => updateParticipant(index, 'problema_saude', v === 'sim')}
                        >
                          <SelectTrigger className="h-8 text-sm w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao">Não</SelectItem>
                            <SelectItem value="sim">Sim</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.descricao_problema_saude}
                          onChange={(e) => updateParticipant(index, 'descricao_problema_saude', e.target.value)}
                          className="h-8 text-sm min-w-[100px]"
                          placeholder={participant.problema_saude ? 'Descreva...' : ''}
                          disabled={!participant.problema_saude}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={participant.contato_emergencia}
                          onChange={(e) => updateParticipant(index, 'contato_emergencia', e.target.value)}
                          className="h-8 text-sm min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={participant.ponto_embarque_id || defaultBoardingPoint}
                          onValueChange={(v) => updateParticipant(index, 'ponto_embarque_id', v)}
                        >
                          <SelectTrigger className="h-8 text-sm min-w-[120px]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {boardingPoints.map(bp => (
                              <SelectItem key={bp.id} value={bp.id}>{bp.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || validCount === 0}
                className="min-w-[150px]"
              >
                {loading ? 'Importando...' : `Importar ${validCount} participantes`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkParticipantUpload;
