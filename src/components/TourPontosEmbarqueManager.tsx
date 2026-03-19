import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Save } from "lucide-react";
interface PontoEmbarque {
  id: string;
  nome: string;
  endereco: string;
  ativo: boolean;
}
interface TourPontosEmbarqueManagerProps {
  tourId: string;
  tourName: string;
}
export function TourPontosEmbarqueManager({
  tourId,
  tourName
}: TourPontosEmbarqueManagerProps) {
  const [pontosEmbarque, setPontosEmbarque] = useState<PontoEmbarque[]>([]);
  const [pontosSelecionados, setPontosSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoPonto, setNovoPonto] = useState({
    nome: '',
    endereco: ''
  });
  const [criandoPonto, setCriandoPonto] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchPontosEmbarque();
    fetchPontosSelecionados();
  }, [tourId]);
  const fetchPontosEmbarque = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('pontos_embarque').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      setPontosEmbarque(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pontos de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchPontosSelecionados = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tour_pontos_embarque').select('ponto_embarque_id').eq('tour_id', tourId);
      if (error) throw error;
      const selectedIds = new Set(data?.map(item => item.ponto_embarque_id) || []);
      setPontosSelecionados(selectedIds);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pontos selecionados",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handlePontoToggle = (pontoId: string) => {
    const newSelected = new Set(pontosSelecionados);
    if (newSelected.has(pontoId)) {
      newSelected.delete(pontoId);
    } else {
      newSelected.add(pontoId);
    }
    setPontosSelecionados(newSelected);
  };
  const savePontosEmbarque = async () => {
    setSaving(true);
    try {
      // Primeiro, remover todos os pontos existentes do tour
      await supabase.from('tour_pontos_embarque').delete().eq('tour_id', tourId);

      // Inserir os novos pontos selecionados
      if (pontosSelecionados.size > 0) {
        const insertData = Array.from(pontosSelecionados).map(pontoId => ({
          tour_id: tourId,
          ponto_embarque_id: pontoId
        }));
        const {
          error
        } = await supabase.from('tour_pontos_embarque').insert(insertData);
        if (error) throw error;
      }
      toast({
        title: "Pontos de embarque atualizados!",
        description: `${pontosSelecionados.size} pontos configurados para este tour.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar pontos de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const criarNovoPonto = async () => {
    if (!novoPonto.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o ponto de embarque.",
        variant: "destructive"
      });
      return;
    }
    setCriandoPonto(true);
    try {
      const {
        data,
        error
      } = await supabase.from('pontos_embarque').insert({
        nome: novoPonto.nome.trim(),
        endereco: novoPonto.endereco.trim() || null,
        ativo: true
      }).select().single();
      if (error) throw error;

      // Adicionar o novo ponto à lista
      setPontosEmbarque(prev => [...prev, data]);

      // Selecionar automaticamente o novo ponto para o tour atual
      setPontosSelecionados(prev => new Set(prev).add(data.id));

      // Limpar o formulário e fechar o dialog
      setNovoPonto({
        nome: '',
        endereco: ''
      });
      setIsDialogOpen(false);
      toast({
        title: "Ponto de embarque criado!",
        description: `${data.nome} foi adicionado e selecionado para este tour.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar ponto de embarque",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCriandoPonto(false);
    }
  };
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Carregando pontos de embarque...</div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pontos de Embarque - {tourName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione os pontos de embarque disponíveis para este tour. Os clientes poderão escolher entre estes pontos ao fazer a reserva.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pontosEmbarque.length === 0 ? <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum ponto de embarque encontrado.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Novo Ponto
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo Ponto de Embarque</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="nome">Nome do Ponto *</Label>
                      <Input id="nome" placeholder="ex: Centro de Maceió, Shopping Iguatemi..." value={novoPonto.nome} onChange={e => setNovoPonto(prev => ({
                    ...prev,
                    nome: e.target.value
                  }))} />
                    </div>
                    <div>
                      <Label htmlFor="endereco">Endereço (opcional)</Label>
                      <Input id="endereco" placeholder="Endereço completo do ponto de embarque" value={novoPonto.endereco} onChange={e => setNovoPonto(prev => ({
                    ...prev,
                    endereco: e.target.value
                  }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setNovoPonto({
                    nome: '',
                    endereco: ''
                  });
                }}>
                      Cancelar
                    </Button>
                    <Button onClick={criarNovoPonto} disabled={criandoPonto}>
                      {criandoPonto ? 'Criando...' : 'Criar Ponto'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div> : <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pontosEmbarque.map(ponto => <div key={ponto.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Checkbox id={ponto.id} checked={pontosSelecionados.has(ponto.id)} onCheckedChange={() => handlePontoToggle(ponto.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={ponto.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {ponto.nome}
                      </label>
                      {ponto.endereco && <p className="text-xs text-muted-foreground mt-1">
                          {ponto.endereco}
                        </p>}
                    </div>
                  </div>)}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {pontosSelecionados.size} de {pontosEmbarque.length} pontos selecionados
                </div>
                <div className="flex gap-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Ponto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Novo Ponto de Embarque</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="nome">Nome do Ponto *</Label>
                          <Input id="nome" placeholder="ex: Centro de Maceió, Shopping Iguatemi..." value={novoPonto.nome} onChange={e => setNovoPonto(prev => ({
                        ...prev,
                        nome: e.target.value
                      }))} />
                        </div>
                        <div>
                          <Label htmlFor="endereco">Endereço (opcional)</Label>
                          <Input id="endereco" placeholder="Endereço completo do ponto de embarque" value={novoPonto.endereco} onChange={e => setNovoPonto(prev => ({
                        ...prev,
                        endereco: e.target.value
                      }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                      setIsDialogOpen(false);
                      setNovoPonto({
                        nome: '',
                        endereco: ''
                      });
                    }}>
                          Cancelar
                        </Button>
                        <Button onClick={criarNovoPonto} disabled={criandoPonto}>
                          {criandoPonto ? 'Criando...' : 'Criar Ponto'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={savePontosEmbarque} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </>}
        </CardContent>
      </Card>

      {pontosSelecionados.size > 0 && <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pontos Selecionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(pontosSelecionados).map(pontoId => {
            const ponto = pontosEmbarque.find(p => p.id === pontoId);
            return ponto ? <div key={pontoId} className="inline-flex items-center gap-1 px-2 py-1 text-primary rounded-md text-xs bg-lime-500">
                    <MapPin className="h-3 w-3" />
                    {ponto.nome}
                  </div> : null;
          })}
            </div>
          </CardContent>
        </Card>}
    </div>;
}