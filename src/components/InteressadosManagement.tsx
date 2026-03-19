import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Download, Search, Loader2, FileText, Trash2, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Interessado {
  id: string;
  nome: string;
  whatsapp: string;
  origem: string;
  created_at: string;
  aceite_novidades: boolean;
}

interface InteressadosManagementProps {
  tourId: string;
  tourName: string;
}

export function InteressadosManagement({ tourId, tourName }: InteressadosManagementProps) {
  const [interessados, setInteressados] = useState<Interessado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedInteressado, setSelectedInteressado] = useState<Interessado | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchInteressados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interessados')
        .select('*')
        .eq('passeio_id', tourId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInteressados(data || []);
    } catch (error) {
      console.error('Error fetching interessados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os interessados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteressados();
  }, [tourId]);

  const filteredInteressados = interessados.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.whatsapp.includes(searchTerm)
  );

  const formatWhatsApp = (phone: string) => {
    // Format for display: +55 (82) 99999-9999
    if (phone.startsWith('+55') && phone.length >= 13) {
      const digits = phone.replace(/\D/g, '');
      const ddd = digits.substring(2, 4);
      const firstPart = digits.substring(4, 9);
      const secondPart = digits.substring(9);
      return `(${ddd}) ${firstPart}-${secondPart}`;
    }
    return phone;
  };

  const handleWhatsApp = (whatsapp: string, nome: string) => {
    const message = `Olá ${nome}! Vi que você teve interesse no passeio: ${tourName}. Posso te ajudar?`;
    const cleanPhone = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = async () => {
    if (!selectedInteressado) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('interessados')
        .delete()
        .eq('id', selectedInteressado.id);

      if (error) throw error;

      setInteressados(prev => prev.filter(i => i.id !== selectedInteressado.id));
      toast({
        title: 'Removido',
        description: 'Interessado removido com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting interessado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o interessado.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedInteressado(null);
    }
  };

  const exportToCSV = () => {
    if (interessados.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Não há interessados para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Nome', 'WhatsApp', 'Origem', 'Data de Acesso', 'Aceita Novidades'];
    const rows = interessados.map(item => [
      item.nome,
      item.whatsapp,
      item.origem,
      format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      item.aceite_novidades ? 'Sim' : 'Não',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interessados_${tourName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado',
      description: `${interessados.length} interessados exportados com sucesso.`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">
            Interessados ({interessados.length})
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-60"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={interessados.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Estas pessoas acessaram o roteiro do passeio. Não ocupam vaga e não são participantes.
        </p>
      </div>

      {/* Table */}
      {filteredInteressados.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum interessado encontrado.' : 'Nenhum interessado registrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">WhatsApp</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Origem</TableHead>
                  <TableHead className="font-semibold">Data de Acesso</TableHead>
                  <TableHead className="font-semibold text-center">Novidades</TableHead>
                  <TableHead className="font-semibold text-center w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteressados.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleWhatsApp(item.whatsapp, item.nome)}
                        className="flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {formatWhatsApp(item.whatsapp)}
                      </button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        <FileText className="w-3 h-3" />
                        {item.origem}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.aceite_novidades ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="w-3 h-3 mr-1" />
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSelectedInteressado(item);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover interessado?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja remover <strong>{selectedInteressado?.nome}</strong> da lista de interessados?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
