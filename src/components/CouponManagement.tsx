import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Tag, Percent, DollarSign, Edit2, X, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  codigo: string;
  tipo: 'porcentagem' | 'valor_fixo';
  valor: number;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  maximo_usos: number | null;
  usos_atual: number;
  tour_id: string | null;
  meses_validade: number | null;
  created_at: string;
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
  is_active: boolean;
}

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const { toast } = useToast();

  // New coupon form state
  const [newCoupon, setNewCoupon] = useState({
    codigo: '',
    tipo: 'porcentagem' as 'porcentagem' | 'valor_fixo',
    valor: 0,
    ativo: true,
    data_inicio: '',
    data_fim: '',
    maximo_usos: '',
    tour_id: '',
    meses_validade: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [couponsRes, toursRes] = await Promise.all([
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('tours')
          .select('id, name, start_date, is_active')
          .eq('is_active', true)
          .gte('start_date', today)
          .order('start_date', { ascending: true })
      ]);

      if (couponsRes.error) throw couponsRes.error;
      if (toursRes.error) throw toursRes.error;

      setCoupons((couponsRes.data || []) as Coupon[]);
      setTours(toursRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    if (!newCoupon.codigo.trim()) {
      toast({ title: "Código é obrigatório", variant: "destructive" });
      return;
    }
    if (newCoupon.valor <= 0) {
      toast({ title: "Valor deve ser maior que zero", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        codigo: newCoupon.codigo.toUpperCase().trim(),
        tipo: newCoupon.tipo,
        valor: newCoupon.valor,
        ativo: newCoupon.ativo,
        data_inicio: newCoupon.data_inicio || null,
        data_fim: newCoupon.data_fim || null,
        maximo_usos: newCoupon.maximo_usos ? parseInt(newCoupon.maximo_usos) : null,
        tour_id: newCoupon.tour_id || null,
        meses_validade: newCoupon.meses_validade ? parseInt(newCoupon.meses_validade) : null
      };

      const { data, error } = await supabase.from('coupons').insert(couponData).select().single();
      if (error) throw error;

      setCoupons([data as Coupon, ...coupons]);
      setShowNewForm(false);
      resetNewCoupon();
      toast({ title: "Cupom criado com sucesso!" });
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast({ title: "Erro ao criar cupom", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateCoupon = async (coupon: Coupon) => {
    try {
      const { error } = await supabase.from('coupons').update({
        codigo: coupon.codigo,
        tipo: coupon.tipo,
        valor: coupon.valor,
        ativo: coupon.ativo,
        data_inicio: coupon.data_inicio,
        data_fim: coupon.data_fim,
        maximo_usos: coupon.maximo_usos,
        tour_id: coupon.tour_id,
        meses_validade: coupon.meses_validade
      }).eq('id', coupon.id);

      if (error) throw error;
      setEditingId(null);
      toast({ title: "Cupom atualizado!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar cupom", description: error.message, variant: "destructive" });
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(coupons.filter(c => c.id !== id));
      toast({ title: "Cupom excluído!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir cupom", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const updated = { ...coupon, ativo: !coupon.ativo };
    setCoupons(coupons.map(c => c.id === coupon.id ? updated : c));
    await updateCoupon(updated);
  };

  const resetNewCoupon = () => {
    setNewCoupon({
      codigo: '',
      tipo: 'porcentagem',
      valor: 0,
      ativo: true,
      data_inicio: '',
      data_fim: '',
      maximo_usos: '',
      tour_id: '',
      meses_validade: ''
    });
  };

  const getTourName = (tourId: string | null) => {
    if (!tourId) return 'Todos os passeios';
    const tour = tours.find(t => t.id === tourId);
    if (!tour) return 'Passeio não encontrado';
    return `${tour.name} - ${format(new Date(tour.start_date + 'T12:00:00'), 'dd/MM/yyyy')}`;
  };

  const formatTourOption = (tour: Tour) => {
    return `${tour.name} - ${format(new Date(tour.start_date + 'T12:00:00'), 'dd/MM/yyyy')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Cupons de Desconto
        </h2>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* New Coupon Form */}
      {showNewForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Novo Cupom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Código do Cupom *</Label>
                <Input
                  placeholder="Ex: DESCONTO20"
                  value={newCoupon.codigo}
                  onChange={(e) => setNewCoupon({ ...newCoupon, codigo: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <Label>Tipo de Desconto *</Label>
                <Select
                  value={newCoupon.tipo}
                  onValueChange={(v) => setNewCoupon({ ...newCoupon, tipo: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step={newCoupon.tipo === 'porcentagem' ? '1' : '0.01'}
                  min="0"
                  max={newCoupon.tipo === 'porcentagem' ? '100' : undefined}
                  placeholder={newCoupon.tipo === 'porcentagem' ? '10' : '50.00'}
                  value={newCoupon.valor || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valor: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={newCoupon.data_inicio}
                  onChange={(e) => setNewCoupon({ ...newCoupon, data_inicio: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={newCoupon.data_fim}
                  onChange={(e) => setNewCoupon({ ...newCoupon, data_fim: e.target.value })}
                />
              </div>

              <div>
                <Label>Máximo de Usos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={newCoupon.maximo_usos}
                  onChange={(e) => setNewCoupon({ ...newCoupon, maximo_usos: e.target.value })}
                />
              </div>

              <div>
                <Label>Válido por (meses)</Label>
                <Select
                  value={newCoupon.meses_validade || 'unlimited'}
                  onValueChange={(v) => setNewCoupon({ ...newCoupon, meses_validade: v === 'unlimited' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem restrição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Sem restrição</SelectItem>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="2">2 meses</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Passeios nos próximos X meses
                </p>
              </div>

              <div className="md:col-span-2">
                <Label>Restringir a Passeio</Label>
                <Select
                  value={newCoupon.tour_id || 'all'}
                  onValueChange={(v) => setNewCoupon({ ...newCoupon, tour_id: v === 'all' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os passeios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os passeios</SelectItem>
                    {tours.map(tour => (
                      <SelectItem key={tour.id} value={tour.id}>{formatTourOption(tour)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newCoupon.ativo}
                onCheckedChange={(v) => setNewCoupon({ ...newCoupon, ativo: v })}
              />
              <Label>Cupom Ativo</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={createCoupon} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Criar Cupom
              </Button>
              <Button variant="outline" onClick={() => { setShowNewForm(false); resetNewCoupon(); }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum cupom cadastrado. Clique em "Novo Cupom" para criar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {coupons.map(coupon => (
            <Card key={coupon.id} className={!coupon.ativo ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                      {coupon.tipo === 'porcentagem' ? (
                        <Percent className="h-5 w-5 text-primary" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{coupon.codigo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${coupon.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {coupon.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {coupon.tipo === 'porcentagem' ? `${coupon.valor}% de desconto` : `R$ ${coupon.valor.toFixed(2)} de desconto`}
                        </span>
                        {' • '}
                        {getTourName(coupon.tour_id)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="text-center">
                      <p className="text-xs">Usos</p>
                      <p className="font-medium">{coupon.usos_atual}{coupon.maximo_usos ? `/${coupon.maximo_usos}` : ''}</p>
                    </div>

                    {coupon.meses_validade && (
                      <div className="text-center">
                        <p className="text-xs">Meses</p>
                        <p className="font-medium">{coupon.meses_validade}</p>
                      </div>
                    )}
                    
                    {coupon.data_inicio && (
                      <div className="text-center">
                        <p className="text-xs">Início</p>
                        <p className="font-medium">{format(new Date(coupon.data_inicio), 'dd/MM/yy')}</p>
                      </div>
                    )}
                    
                    {coupon.data_fim && (
                      <div className="text-center">
                        <p className="text-xs">Fim</p>
                        <p className="font-medium">{format(new Date(coupon.data_fim), 'dd/MM/yy')}</p>
                      </div>
                    )}

                    <Switch
                      checked={coupon.ativo}
                      onCheckedChange={() => toggleActive(coupon)}
                    />
                    
                    <Button variant="ghost" size="sm" onClick={() => deleteCoupon(coupon.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}