import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, UserPlus, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Users, Search, Edit, Trash2, BarChart3, ClipboardList, Filter, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validarCPF, validarTelefone, formatarCPF, formatarTelefone } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { ClientesAnalytics } from './ClientesAnalytics';
import ReservasAdmin from './ReservasAdmin';
import { InteressadosGlobalList } from './InteressadosGlobalList';
import { SupportTopicsManagement } from './SupportTopicsManagement';
import { ClientCreditsManagement } from './credits';

interface ClienteForm {
  nome_completo: string;
  cpf: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
}

interface Cliente {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  created_at: string;
}

interface ProcessedClient extends ClienteForm {
  status: 'success' | 'error' | 'duplicate';
  error?: string;
}

interface ClientesCadastroProps {
  viewMode?: string;
}

export function ClientesCadastro({ viewMode = 'reservas' }: ClientesCadastroProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'created_at' | 'nome_completo'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const PAGE_SIZE = 30;
  const [formData, setFormData] = useState<ClienteForm>({
    nome_completo: '',
    cpf: '',
    email: '',
    whatsapp: '',
    data_nascimento: ''
  });
  const [uploadResults, setUploadResults] = useState<ProcessedClient[]>([]);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [gsLoading, setGsLoading] = useState(false);
  const { toast } = useToast();

  const fetchClientes = useCallback(async (searchStr = searchApplied, pageNum = page) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortAsc })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (searchStr.trim()) {
        const term = searchStr.trim();
        const cleanCpf = term.replace(/\D/g, '');
        // Use ilike for server-side search
        if (cleanCpf.length >= 3) {
          query = query.or(`nome_completo.ilike.%${term}%,email.ilike.%${term}%,cpf.ilike.%${cleanCpf}%`);
        } else {
          query = query.or(`nome_completo.ilike.%${term}%,email.ilike.%${term}%`);
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setClientes(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [searchApplied, page, sortBy, sortAsc, toast]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleSearch = () => {
    setPage(0);
    setSearchApplied(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchApplied('');
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Função para converter data brasileira para ISO
  const convertDateToISO = (dateStr: string): string => {
    // Se já está no formato ISO, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Se está no formato brasileiro DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Se está no formato DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      cpf: '',
      email: '',
      whatsapp: '',
      data_nascimento: ''
    });
  };

  const validateForm = (): boolean => {
    if (!formData.nome_completo || !formData.cpf || !formData.email || !formData.whatsapp || !formData.data_nascimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive"
      });
      return false;
    }

    if (!validarCPF(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive"
      });
      return false;
    }

    if (!validarTelefone(formData.whatsapp)) {
      toast({
        title: "WhatsApp inválido",
        description: "Por favor, insira um número de WhatsApp válido.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const downloadPlanilhaModelo = () => {
    // Criar dados modelo
    const modeloData = [
      {
        'Nome': 'João Silva Santos',
        'CPF': '12345678901',
        'Email': 'joao@email.com',
        'WhatsApp': '11987654321',
        'Data de Nascimento': '1990-05-15'
      },
      {
        'Nome': 'Maria Oliveira Costa',
        'CPF': '98765432100',
        'Email': 'maria@email.com',
        'WhatsApp': '11912345678',
        'Data de Nascimento': '1985-08-22'
      }
    ];

    // Criar workbook e worksheet
    const ws = XLSX.utils.json_to_sheet(modeloData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // Nome
      { wch: 15 }, // CPF
      { wch: 25 }, // Email
      { wch: 15 }, // WhatsApp
      { wch: 18 }  // Data de Nascimento
    ];
    ws['!cols'] = colWidths;

    // Download do arquivo
    XLSX.writeFile(wb, 'modelo_clientes.xlsx');
    
    toast({
      title: "Download iniciado",
      description: "A planilha modelo foi baixada com sucesso.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .insert({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
          email: formData.email,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          data_nascimento: formData.data_nascimento
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Cliente já existe",
            description: "Já existe um cliente cadastrado com este CPF.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Cliente cadastrado!",
          description: "Cliente foi cadastrado com sucesso.",
        });
        resetForm();
        fetchClientes(); // Recarregar lista de clientes
      }
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast({
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o cliente. Tente novamente.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const processRows = async (jsonData: any[]): Promise<ProcessedClient[]> => {
    const processedClients: ProcessedClient[] = [];

    for (const row of jsonData as any[]) {
      const cliente: ClienteForm = {
        nome_completo: row['Nome'] || row['nome'] || row['nome_completo'] || '',
        cpf: String(row['CPF'] || row['cpf'] || '').replace(/\D/g, ''),
        email: row['Email'] || row['email'] || '',
        whatsapp: String(row['WhatsApp'] || row['whatsapp'] || row['Telefone'] || row['telefone'] || '').replace(/\D/g, ''),
        data_nascimento: convertDateToISO(String(row['Data de Nascimento'] || row['data_nascimento'] || row['nascimento'] || ''))
      };

      let processedClient: ProcessedClient = { ...cliente, status: 'success' };

      // Validações
      if (!cliente.nome_completo || !cliente.cpf || !cliente.email || !cliente.whatsapp || !cliente.data_nascimento) {
        processedClient.status = 'error';
        processedClient.error = 'Campos obrigatórios em branco';
      } else if (!validarCPF(cliente.cpf)) {
        processedClient.status = 'error';
        processedClient.error = 'CPF inválido';
      } else if (!validarTelefone(cliente.whatsapp)) {
        processedClient.status = 'error';
        processedClient.error = 'WhatsApp inválido';
      } else {
        // Tentar inserir no banco
        try {
          const { error } = await supabase
            .from('clientes')
            .insert({
              nome_completo: cliente.nome_completo,
              cpf: cliente.cpf,
              email: cliente.email,
              whatsapp: cliente.whatsapp,
              data_nascimento: cliente.data_nascimento
            });

          if (error) {
            if (error.code === '23505') {
              processedClient.status = 'duplicate';
              processedClient.error = 'Cliente já existe';
            } else {
              processedClient.status = 'error';
              processedClient.error = error.message;
            }
          }
        } catch (error) {
          processedClient.status = 'error';
          processedClient.error = 'Erro ao inserir no banco';
        }
      }

      processedClients.push(processedClient);
    }

    return processedClients;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadResults([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedClients = await processRows(jsonData as any[]);
      setUploadResults(processedClients);
      fetchClientes(); // Recarregar lista de clientes

      const successCount = processedClients.filter(c => c.status === 'success').length;
      const errorCount = processedClients.filter(c => c.status === 'error').length;
      const duplicateCount = processedClients.filter(c => c.status === 'duplicate').length;

      toast({
        title: "Upload concluído",
        description: `${successCount} clientes inseridos, ${duplicateCount} duplicados, ${errorCount} erros.`,
      });

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro no arquivo",
        description: "Erro ao processar o arquivo Excel. Verifique o formato.",
        variant: "destructive"
      });
    }

    setLoading(false);
    e.target.value = '';
  };

  const buildCsvUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      const match = u.pathname.match(/spreadsheets\/d\/([^\/]+)/);
      const id = match?.[1];
      const hashGidMatch = u.hash.match(/gid=(\d+)/);
      const gidFromHash = hashGidMatch?.[1];
      const gid = u.searchParams.get('gid') || gidFromHash || '0';
      if (!id) return null;
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    } catch {
      return null;
    }
  };

  const handleImportFromGoogleSheets = async () => {
    if (!googleSheetsUrl) {
      toast({
        title: "Informe o link",
        description: "Cole o link do Google Sheets para importar.",
        variant: "destructive"
      });
      return;
    }

    setGsLoading(true);
    setUploadResults([]);

    try {
      const csvUrl = buildCsvUrl(googleSheetsUrl);
      if (!csvUrl) {
        throw new Error("URL do Google Sheets inválida.");
      }

      const { data: csvText, error: fnError } = await supabase.functions.invoke<string>('gsheets-proxy', {
        body: { url: csvUrl }
      });
      if (fnError || !csvText) {
        throw new Error(fnError?.message || 'Não foi possível acessar a planilha (verifique se está pública ou publicada).');
      }

      const workbook = XLSX.read(csvText, { type: 'string' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedClients = await processRows(jsonData as any[]);
      setUploadResults(processedClients);
      fetchClientes();

      const successCount = processedClients.filter(c => c.status === 'success').length;
      const errorCount = processedClients.filter(c => c.status === 'error').length;
      const duplicateCount = processedClients.filter(c => c.status === 'duplicate').length;

      toast({
        title: "Importação concluída",
        description: `${successCount} clientes inseridos, ${duplicateCount} duplicados, ${errorCount} erros.`,
      });
    } catch (error: any) {
      console.error('Erro ao importar do Google Sheets:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Falha ao importar do Google Sheets.",
        variant: "destructive"
      });
    } finally {
      setGsLoading(false);
    }
  };
  // Render content based on viewMode
  const renderContent = () => {
    switch (viewMode) {
      case 'reservas':
        return <ReservasAdmin />;
      case 'atendimento':
        return <SupportTopicsManagement />;
      case 'lista':
        return (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <CardTitle>Clientes Cadastrados ({totalCount})</CardTitle>
                </div>
                {/* Search bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, email ou CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} className="shrink-0">
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </Button>
                  {searchApplied && (
                    <Button variant="outline" onClick={handleClearSearch} className="shrink-0">
                      <X className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Ordenar por:</span>
                  </div>
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(0); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Data de cadastro</SelectItem>
                      <SelectItem value="nome_completo">Nome</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSortAsc(!sortAsc); setPage(0); }}
                  >
                    {sortAsc ? '↑ Crescente' : '↓ Decrescente'}
                  </Button>
                  {searchApplied && (
                    <Badge variant="secondary" className="ml-2">
                      Buscando: "{searchApplied}" — {totalCount} resultado(s)
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span>Carregando clientes...</span>
                </div>
              ) : clientes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchApplied ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado'}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {clientes.map((cliente) => (
                      <Card key={cliente.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">{cliente.nome_completo}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">CPF:</span> {formatarCPF(cliente.cpf)}
                              </div>
                              <div>
                                <span className="font-medium">Email:</span> {cliente.email}
                              </div>
                              <div>
                                <span className="font-medium">WhatsApp:</span> {formatarTelefone(cliente.whatsapp)}
                              </div>
                              <div>
                                <span className="font-medium">Nascimento:</span> {(() => {
                                  const [year, month, day] = cliente.data_nascimento.split('-').map(Number);
                                  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                })()}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cadastrado em: {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            Ativo
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <span className="text-sm text-muted-foreground">
                        Página {page + 1} de {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => setPage(p => p - 1)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages - 1}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      case 'cadastro':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      value={formData.nome_completo}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                      placeholder="Nome completo do cliente"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formatarCPF(formData.cpf)}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      value={formatarTelefone(formData.whatsapp)}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      case 'planilha':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Upload de Planilha Excel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A planilha deve conter as colunas: <strong>Nome</strong>, <strong>CPF</strong>, <strong>Email</strong>, <strong>WhatsApp</strong> e <strong>Data de Nascimento</strong>
                  </AlertDescription>
                </Alert>
                
                <Button 
                  variant="outline" 
                  onClick={downloadPlanilhaModelo}
                  className="flex items-center gap-2 ml-4 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Baixar Modelo
                </Button>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Selecione um arquivo Excel</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Formatos suportados: .xlsx, .xls
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="max-w-xs mx-auto"
                />
              </div>

              <div className="border rounded-lg p-6 space-y-3">
                <p className="text-lg font-medium">Importar do Google Sheets</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    placeholder="Cole o link do Google Sheets (ex: https://docs.google.com/spreadsheets/d/ID/edit#gid=0)"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    className="md:flex-1"
                  />
                  <Button onClick={handleImportFromGoogleSheets} disabled={gsLoading}>
                    {gsLoading ? 'Importando...' : 'Importar do Google Sheets'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A planilha deve estar pública ou publicada e conter as colunas Nome, CPF, Email, WhatsApp e Data de Nascimento.
                </p>
              </div>

              {loading && (
                <div className="text-center">
                  <p>Processando arquivo...</p>
                </div>
              )}

              {gsLoading && (
                <div className="text-center">
                  <p>Importando do Google Sheets...</p>
                </div>
              )}
              {uploadResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultados do Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {uploadResults.map((cliente, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          {cliente.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {cliente.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {cliente.status === 'duplicate' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                          
                          <div className="flex-1">
                            <p className="font-medium">{cliente.nome_completo}</p>
                            <p className="text-sm text-muted-foreground">{formatarCPF(cliente.cpf)}</p>
                            {cliente.error && (
                              <p className="text-sm text-red-600">{cliente.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        );
      case 'analytics':
        return <ClientesAnalytics clientes={clientes} />;
      case 'interessados':
        return <InteressadosGlobalList />;
      case 'creditos':
        return <ClientCreditsManagement />;
      default:
        return <ReservasAdmin />;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
}