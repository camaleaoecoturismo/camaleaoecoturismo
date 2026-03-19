import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMonthMessages } from "@/hooks/useMonthMessages";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const monthNames: Record<string, string> = {
  "JAN": "Janeiro",
  "FEV": "Fevereiro",
  "MAR": "Março",
  "ABR": "Abril",
  "MAI": "Maio",
  "JUN": "Junho",
  "JUL": "Julho",
  "AGO": "Agosto",
  "SET": "Setembro",
  "OUT": "Outubro",
  "NOV": "Novembro",
  "DEZ": "Dezembro"
};

const monthIds = Object.keys(monthNames);

export const MonthMessageManagement = () => {
  const { messages, loading, refetch } = useMonthMessages();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    month: "JAN",
    year: new Date().getFullYear(),
    message: "Em breve atualizações de viagens",
    is_active: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('month_messages')
          .update({
            message: formData.message,
            is_active: formData.is_active
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Mensagem atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from('month_messages')
          .insert([formData]);

        if (error) throw error;
        toast.success("Mensagem criada com sucesso!");
      }

      setFormData({
        month: "JAN",
        year: new Date().getFullYear(),
        message: "Em breve atualizações de viagens",
        is_active: false
      });
      setEditingId(null);
      refetch();
    } catch (error: any) {
      console.error('Error saving message:', error);
      toast.error(error.message || "Erro ao salvar mensagem");
    }
  };

  const handleEdit = (message: any) => {
    setEditingId(message.id);
    setFormData({
      month: message.month,
      year: message.year,
      message: message.message,
      is_active: message.is_active
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mensagem?")) return;

    try {
      const { error } = await supabase
        .from('month_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Mensagem excluída com sucesso!");
      refetch();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error("Erro ao excluir mensagem");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('month_messages')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? "Mensagem desativada" : "Mensagem ativada");
      refetch();
    } catch (error: any) {
      console.error('Error toggling message:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Mensagem" : "Nova Mensagem de Mês"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Mês</Label>
                <Select
                  value={formData.month}
                  onValueChange={(value) => setFormData({ ...formData, month: value })}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthIds.map(month => (
                      <SelectItem key={month} value={month}>
                        {monthNames[month]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  disabled={!!editingId}
                  min={2024}
                  max={2030}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Em breve atualizações de viagens"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativar mensagem</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? <><Pencil className="w-4 h-4 mr-2" /> Atualizar</> : <><Plus className="w-4 h-4 mr-2" /> Criar</>}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      month: "JAN",
                      year: new Date().getFullYear(),
                      message: "Em breve atualizações de viagens",
                      is_active: false
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma mensagem cadastrada
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {monthNames[message.month]} {message.year}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${message.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {message.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{message.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(message.id, message.is_active)}
                    >
                      {message.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(message)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(message.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
