import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2, DoorOpen, Edit, Save, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accommodation, AccommodationRoom, ROOM_TYPES, GENDER_RESTRICTIONS } from './types';

interface AccommodationConfigModalProps {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourName: string;
}

export const AccommodationConfigModal: React.FC<AccommodationConfigModalProps> = ({
  open,
  onClose,
  tourId,
  tourName,
}) => {
  const { toast } = useToast();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [rooms, setRooms] = useState<Record<string, AccommodationRoom[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editingAccommodation, setEditingAccommodation] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [newAccommodation, setNewAccommodation] = useState({ name: '', address: '', phone: '', notes: '' });
  const [showNewAccommodation, setShowNewAccommodation] = useState(false);
  const [newRoom, setNewRoom] = useState<Record<string, { name: string; room_type: string; capacity: number; gender_restriction: string; notes: string }>>({});
  const [showNewRoom, setShowNewRoom] = useState<string | null>(null);

  useEffect(() => {
    if (open && tourId) {
      fetchData();
    }
  }, [open, tourId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch accommodations
      const { data: accData, error: accError } = await supabase
        .from('tour_accommodations')
        .select('*')
        .eq('tour_id', tourId)
        .order('order_index');

      if (accError) throw accError;
      setAccommodations(accData || []);

      // Fetch rooms for each accommodation
      if (accData && accData.length > 0) {
        const accIds = accData.map(a => a.id);
        const { data: roomsData, error: roomsError } = await supabase
          .from('accommodation_rooms')
          .select('*')
          .in('accommodation_id', accIds)
          .order('order_index');

        if (roomsError) throw roomsError;

        const roomsMap: Record<string, AccommodationRoom[]> = {};
        (roomsData || []).forEach(room => {
          if (!roomsMap[room.accommodation_id]) {
            roomsMap[room.accommodation_id] = [];
          }
          roomsMap[room.accommodation_id].push(room);
        });
        setRooms(roomsMap);
      } else {
        setRooms({});
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar hospedagens', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccommodation = async () => {
    if (!newAccommodation.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('tour_accommodations').insert({
        tour_id: tourId,
        name: newAccommodation.name,
        address: newAccommodation.address || null,
        phone: newAccommodation.phone || null,
        notes: newAccommodation.notes || null,
        order_index: accommodations.length,
      });

      if (error) throw error;

      toast({ title: 'Hospedagem adicionada' });
      setNewAccommodation({ name: '', address: '', phone: '', notes: '' });
      setShowNewAccommodation(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar hospedagem', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccommodation = async (acc: Accommodation) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tour_accommodations')
        .update({
          name: acc.name,
          address: acc.address,
          phone: acc.phone,
          notes: acc.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', acc.id);

      if (error) throw error;
      toast({ title: 'Hospedagem atualizada' });
      setEditingAccommodation(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccommodation = async (accId: string) => {
    if (!confirm('Excluir esta hospedagem e todos os quartos?')) return;

    try {
      const { error } = await supabase.from('tour_accommodations').delete().eq('id', accId);
      if (error) throw error;
      toast({ title: 'Hospedagem removida' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddRoom = async (accId: string) => {
    const roomData = newRoom[accId];
    if (!roomData?.name.trim()) {
      toast({ title: 'Nome do quarto obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('accommodation_rooms').insert({
        accommodation_id: accId,
        name: roomData.name,
        room_type: roomData.room_type || 'duplo',
        capacity: roomData.capacity || 2,
        gender_restriction: roomData.gender_restriction === 'none' ? null : (roomData.gender_restriction || null),
        notes: roomData.notes || null,
        order_index: (rooms[accId]?.length || 0),
      });

      if (error) throw error;

      toast({ title: 'Quarto adicionado' });
      setNewRoom(prev => ({ ...prev, [accId]: { name: '', room_type: 'duplo', capacity: 2, gender_restriction: 'none', notes: '' } }));
      setShowNewRoom(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar quarto', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoom = async (room: AccommodationRoom) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('accommodation_rooms')
        .update({
          name: room.name,
          room_type: room.room_type,
          capacity: room.capacity,
          gender_restriction: room.gender_restriction === 'none' ? null : (room.gender_restriction || null),
          notes: room.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id);

      if (error) throw error;
      toast({ title: 'Quarto atualizado' });
      setEditingRoom(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Excluir este quarto?')) return;

    try {
      const { error } = await supabase.from('accommodation_rooms').delete().eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Quarto removido' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const getRoomTypeLabel = (type: string) => ROOM_TYPES.find(t => t.value === type)?.label || type;
  const getGenderLabel = (gender?: string | null) => {
    if (!gender) return null;
    return GENDER_RESTRICTIONS.find(g => g.value === gender)?.label;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurar Hospedagens - {tourName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add new accommodation button */}
            {!showNewAccommodation && (
              <Button onClick={() => setShowNewAccommodation(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pousada/Hospedagem
              </Button>
            )}

            {/* New accommodation form */}
            {showNewAccommodation && (
              <Card className="border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Nova Hospedagem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newAccommodation.name}
                        onChange={e => setNewAccommodation(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Pousada Sol Nascente"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={newAccommodation.phone}
                        onChange={e => setNewAccommodation(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={newAccommodation.address}
                      onChange={e => setNewAccommodation(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Rua, número, bairro..."
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={newAccommodation.notes}
                      onChange={e => setNewAccommodation(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notas adicionais..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddAccommodation} disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewAccommodation(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List of accommodations */}
            {accommodations.length === 0 && !showNewAccommodation ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma hospedagem cadastrada. Adicione a primeira!
              </div>
            ) : (
              accommodations.map(acc => (
                <Card key={acc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <Building2 className="h-5 w-5 text-primary" />
                        {editingAccommodation === acc.id ? (
                          <Input
                            value={acc.name}
                            onChange={e => setAccommodations(prev => prev.map(a => a.id === acc.id ? { ...a, name: e.target.value } : a))}
                            className="w-64"
                          />
                        ) : (
                          <CardTitle className="text-lg">{acc.name}</CardTitle>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {editingAccommodation === acc.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateAccommodation(acc)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingAccommodation(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditingAccommodation(acc.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteAccommodation(acc.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {acc.address && <p className="text-sm text-muted-foreground ml-9">{acc.address}</p>}
                  </CardHeader>
                  <CardContent>
                    {/* Rooms list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <DoorOpen className="h-4 w-4" />
                          Quartos ({rooms[acc.id]?.length || 0})
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowNewRoom(acc.id);
                            setNewRoom(prev => ({
                              ...prev,
                              [acc.id]: { name: '', room_type: 'duplo', capacity: 2, gender_restriction: 'none', notes: '' }
                            }));
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Quarto
                        </Button>
                      </div>

                      {/* New room form */}
                      {showNewRoom === acc.id && (
                        <Card className="border-dashed">
                          <CardContent className="p-3 space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                placeholder="Nome do quarto *"
                                value={newRoom[acc.id]?.name || ''}
                                onChange={e => setNewRoom(prev => ({
                                  ...prev,
                                  [acc.id]: { ...prev[acc.id], name: e.target.value }
                                }))}
                              />
                              <Select
                                value={newRoom[acc.id]?.room_type || 'duplo'}
                                onValueChange={v => setNewRoom(prev => ({
                                  ...prev,
                                  [acc.id]: { ...prev[acc.id], room_type: v }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROOM_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                placeholder="Vagas"
                                min={1}
                                max={20}
                                value={newRoom[acc.id]?.capacity || 2}
                                onChange={e => setNewRoom(prev => ({
                                  ...prev,
                                  [acc.id]: { ...prev[acc.id], capacity: parseInt(e.target.value) || 2 }
                                }))}
                              />
                              <Select
                                value={newRoom[acc.id]?.gender_restriction || 'none'}
                                onValueChange={v => setNewRoom(prev => ({
                                  ...prev,
                                  [acc.id]: { ...prev[acc.id], gender_restriction: v }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Restrição" />
                                </SelectTrigger>
                                <SelectContent>
                                  {GENDER_RESTRICTIONS.map(g => (
                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddRoom(acc.id)} disabled={saving}>
                                <Save className="h-3 w-3 mr-1" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setShowNewRoom(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Existing rooms */}
                      <div className="grid gap-2">
                        {(rooms[acc.id] || []).map(room => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                              {editingRoom === room.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={room.name}
                                    onChange={e => setRooms(prev => ({
                                      ...prev,
                                      [acc.id]: prev[acc.id].map(r => r.id === room.id ? { ...r, name: e.target.value } : r)
                                    }))}
                                    className="w-32 h-8"
                                  />
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={room.capacity}
                                    onChange={e => setRooms(prev => ({
                                      ...prev,
                                      [acc.id]: prev[acc.id].map(r => r.id === room.id ? { ...r, capacity: parseInt(e.target.value) || 2 } : r)
                                    }))}
                                    className="w-16 h-8"
                                  />
                                </div>
                              ) : (
                                <>
                                  <span className="font-medium">{room.name}</span>
                                  <Badge variant="outline">{getRoomTypeLabel(room.room_type)}</Badge>
                                  <Badge variant="secondary">{room.capacity} vagas</Badge>
                                  {getGenderLabel(room.gender_restriction) && (
                                    <Badge variant="outline" className="text-xs">
                                      {getGenderLabel(room.gender_restriction)}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {editingRoom === room.id ? (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleUpdateRoom(room)}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRoom(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRoom(room.id)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRoom(room.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!rooms[acc.id] || rooms[acc.id].length === 0) && showNewRoom !== acc.id && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhum quarto cadastrado
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
