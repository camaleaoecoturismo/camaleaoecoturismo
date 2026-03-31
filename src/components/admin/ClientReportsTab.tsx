import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Users, Star, Award, Wallet, Search, ArrowUpDown, Send, Loader2,
  TrendingUp, Crown, Plus, Minus, Edit, UserCheck,
  CheckCircle, XCircle, MessageSquare, Save, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientReport {
  id: string;
  account_id: string | null;
  nome_completo: string;
  cpf: string;
  email: string;
  whatsapp: string;
  tours_count: number;
  total_spent: number;
  total_points: number;
  badges_count: number;
  level_name: string | null;
  level_color: string | null;
  has_account: boolean;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  is_active: boolean;
}

interface LevelDefinition {
  id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  icon: string;
  color: string;
  benefits: string;
  order_index: number;
}

interface ClientReportsTabProps {
  viewMode?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ClientReportsTab = ({ viewMode = 'clientes' }: ClientReportsTabProps) => {
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'tours_count' | 'total_spent' | 'total_points'>('total_spent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  // Points adjustment state
  const [pointsDialog, setPointsDialog] = useState(false);
  const [pointsClient, setPointsClient] = useState<ClientReport | null>(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsType, setPointsType] = useState<'bonus' | 'deduction'>('bonus');
  const [savingPoints, setSavingPoints] = useState(false);

  // Badge edit state
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [badgeForm, setBadgeForm] = useState<Partial<BadgeDefinition>>({});
  const [savingBadge, setSavingBadge] = useState(false);

  // Badge assign state
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignBadge, setAssignBadge] = useState<BadgeDefinition | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assigningSaving, setAssigningSaving] = useState(false);

  // Level edit state
  const [editingLevel, setEditingLevel] = useState<LevelDefinition | null>(null);
  const [levelForm, setLevelForm] = useState<Partial<LevelDefinition>>({});
  const [savingLevel, setSavingLevel] = useState(false);

  // Message state
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'promo' | 'reminder' | 'alert'>('info');
  const [msgTarget, setMsgTarget] = useState<'all' | 'level' | 'client'>('all');
  const [msgLevel, setMsgLevel] = useState('');
  const [msgClientSearch, setMsgClientSearch] = useState('');
  const [msgClientId, setMsgClientId] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: clientes }, { data: accounts }, { data: reservas }, { data: badgesData }, { data: levelsData }, { data: clientBadges }] = await Promise.all([
      supabase.from('clientes').select('id, nome_completo, cpf, email, whatsapp').order('nome_completo'),
      supabase.from('client_accounts').select('id, cliente_id, total_points'),
      supabase.from('reservas').select('cliente_id, valor_pago, status, payment_status'),
      supabase.from('badge_definitions').select('*').order('requirement_value'),
      supabase.from('level_definitions').select('*').order('order_index'),
      supabase.from('client_badges').select('client_account_id'),
    ]);

    if (clientes && reservas) {
      const accountsMap = new Map(accounts?.map(a => [a.cliente_id, a]) || []);
      const badgesCountMap = new Map<string, number>();

      if (clientBadges && accounts) {
        accounts.forEach(acc => {
          const count = clientBadges.filter(b => b.client_account_id === acc.id).length;
          badgesCountMap.set(acc.cliente_id, count);
        });
      }

      const clientReports: ClientReport[] = clientes.map(cliente => {
        const clienteReservas = (reservas || []).filter(r =>
          r.cliente_id === cliente.id &&
          ['confirmada', 'confirmado'].includes(r.status) &&
          r.payment_status === 'pago'
        );
        const toursCount = clienteReservas.length;
        const totalSpent = clienteReservas.reduce((s, r) => s + (Number(r.valor_pago) || 0), 0);
        const account = accountsMap.get(cliente.id);
        const totalPoints = account?.total_points || 0;

        let levelName = null, levelColor = null;
        if (levelsData) {
          const level = levelsData.find(l => l.min_points <= totalPoints && (l.max_points === null || l.max_points >= totalPoints));
          if (level) { levelName = level.name; levelColor = level.color; }
        }

        return {
          id: cliente.id,
          account_id: account?.id || null,
          nome_completo: cliente.nome_completo,
          cpf: cliente.cpf,
          email: cliente.email,
          whatsapp: cliente.whatsapp,
          tours_count: toursCount,
          total_spent: totalSpent,
          total_points: totalPoints,
          badges_count: badgesCountMap.get(cliente.id) || 0,
          level_name: levelName,
          level_color: levelColor,
          has_account: !!account,
        };
      });

      setClients(clientReports);
    }

    if (badgesData) setBadges(badgesData);
    if (levelsData) setLevels(levelsData);
    setLoading(false);
  };

  // ─── Points adjustment ─────────────────────────────────────────────────────

  const openPointsDialog = (client: ClientReport) => {
    setPointsClient(client);
    setPointsAmount('');
    setPointsReason('');
    setPointsType('bonus');
    setPointsDialog(true);
  };

  const handleAdjustPoints = async () => {
    if (!pointsClient?.account_id) {
      toast({ title: 'Cliente sem conta', description: 'Este cliente não tem conta na área do cliente.', variant: 'destructive' });
      return;
    }
    const amount = parseInt(pointsAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Informe uma quantidade válida', variant: 'destructive' });
      return;
    }
    if (!pointsReason.trim()) {
      toast({ title: 'Informe o motivo', variant: 'destructive' });
      return;
    }
    setSavingPoints(true);
    const delta = pointsType === 'bonus' ? amount : -amount;

    const { error: historyError } = await supabase.from('client_points_history').insert({
      client_account_id: pointsClient.account_id,
      points: delta,
      description: pointsReason.trim(),
      transaction_type: pointsType,
    });

    if (historyError) {
      toast({ title: 'Erro ao registrar pontos', variant: 'destructive' });
      setSavingPoints(false);
      return;
    }

    const newTotal = Math.max(0, pointsClient.total_points + delta);
    await supabase.from('client_accounts').update({ total_points: newTotal }).eq('id', pointsClient.account_id);

    toast({ title: `${delta > 0 ? '+' : ''}${delta} pontos aplicados com sucesso!` });
    setSavingPoints(false);
    setPointsDialog(false);
    fetchData();
  };

  // ─── Badge edit ────────────────────────────────────────────────────────────

  const openBadgeEdit = (badge: BadgeDefinition) => {
    setEditingBadge(badge);
    setBadgeForm({ name: badge.name, description: badge.description, points_reward: badge.points_reward, color: badge.color, is_active: badge.is_active });
  };

  const handleSaveBadge = async () => {
    if (!editingBadge) return;
    setSavingBadge(true);
    const { error } = await supabase.from('badge_definitions').update(badgeForm).eq('id', editingBadge.id);
    setSavingBadge(false);
    if (error) { toast({ title: 'Erro ao salvar selo', variant: 'destructive' }); return; }
    toast({ title: 'Selo atualizado!' });
    setEditingBadge(null);
    fetchData();
  };

  const handleToggleBadge = async (badge: BadgeDefinition) => {
    const { error } = await supabase.from('badge_definitions').update({ is_active: !badge.is_active }).eq('id', badge.id);
    if (!error) { toast({ title: badge.is_active ? 'Selo desativado' : 'Selo ativado' }); fetchData(); }
  };

  // ─── Badge assign ──────────────────────────────────────────────────────────

  const openAssignDialog = (badge: BadgeDefinition) => {
    setAssignBadge(badge);
    setAssignSearch('');
    setAssignDialog(true);
  };

  const handleAssignBadge = async (client: ClientReport) => {
    if (!client.account_id || !assignBadge) return;
    setAssigningSaving(true);
    const { error } = await supabase.from('client_badges').insert({
      client_account_id: client.account_id,
      badge_id: assignBadge.id,
      earned_at: new Date().toISOString(),
    });
    setAssigningSaving(false);
    if (error?.code === '23505') {
      toast({ title: 'Cliente já tem este selo', variant: 'destructive' }); return;
    }
    if (error) { toast({ title: 'Erro ao atribuir selo', variant: 'destructive' }); return; }
    toast({ title: `Selo "${assignBadge.name}" atribuído a ${client.nome_completo}!` });
    setAssignDialog(false);
    fetchData();
  };

  // ─── Level edit ────────────────────────────────────────────────────────────

  const openLevelEdit = (level: LevelDefinition) => {
    setEditingLevel(level);
    setLevelForm({ name: level.name, min_points: level.min_points, max_points: level.max_points, benefits: level.benefits, color: level.color, icon: level.icon });
  };

  const handleSaveLevel = async () => {
    if (!editingLevel) return;
    setSavingLevel(true);
    const { error } = await supabase.from('level_definitions').update(levelForm).eq('id', editingLevel.id);
    setSavingLevel(false);
    if (error) { toast({ title: 'Erro ao salvar nível', variant: 'destructive' }); return; }
    toast({ title: 'Nível atualizado!' });
    setEditingLevel(null);
    fetchData();
  };

  // ─── Send message ──────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast({ title: 'Preencha título e mensagem', variant: 'destructive' }); return;
    }
    setSendingMsg(true);

    let targetAccounts: string[] = [];

    if (msgTarget === 'all') {
      const { data } = await supabase.from('client_accounts').select('id');
      targetAccounts = (data || []).map(a => a.id);
    } else if (msgTarget === 'level') {
      const targetClients = clients.filter(c => c.level_name === msgLevel && c.account_id);
      targetAccounts = targetClients.map(c => c.account_id!);
    } else if (msgTarget === 'client') {
      const found = clients.find(c => c.id === msgClientId && c.account_id);
      if (found?.account_id) targetAccounts = [found.account_id];
    }

    if (targetAccounts.length === 0) {
      toast({ title: 'Nenhum destinatário encontrado', variant: 'destructive' });
      setSendingMsg(false);
      return;
    }

    const rows = targetAccounts.map(id => ({
      client_account_id: id,
      title: msgTitle.trim(),
      message: msgBody.trim(),
      type: msgType,
    }));

    const { error } = await supabase.from('client_communications').insert(rows);
    setSendingMsg(false);
    if (error) { toast({ title: 'Erro ao enviar mensagens', variant: 'destructive' }); return; }
    toast({ title: `Mensagem enviada para ${targetAccounts.length} cliente(s)!` });
    setMsgTitle('');
    setMsgBody('');
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const handleSort = (field: 'tours_count' | 'total_spent' | 'total_points') => {
    if (sortField === field) setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const filteredClients = clients
    .filter(c =>
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] - b[sortField]));

  const msgFilteredClients = clients.filter(c =>
    c.has_account && (
      c.nome_completo.toLowerCase().includes(msgClientSearch.toLowerCase()) ||
      c.cpf.includes(msgClientSearch)
    )
  );

  const assignFilteredClients = clients.filter(c =>
    c.has_account && (
      c.nome_completo.toLowerCase().includes(assignSearch.toLowerCase()) ||
      c.cpf.includes(assignSearch)
    )
  );

  const uniqueLevels = [...new Set(clients.map(c => c.level_name).filter(Boolean))];

  const typeConfig = {
    info:     { label: 'Informação', color: 'bg-blue-100 text-blue-700' },
    promo:    { label: 'Promoção',   color: 'bg-green-100 text-green-700' },
    reminder: { label: 'Lembrete',   color: 'bg-amber-100 text-amber-700' },
    alert:    { label: 'Alerta',     color: 'bg-red-100 text-red-700' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Renders ──────────────────────────────────────────────────────────────

  // ── Clientes ──
  const renderClients = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-7 h-7 text-primary" />, value: clients.length, label: 'Com passeios' },
          { icon: <UserCheck className="w-7 h-7 text-emerald-600" />, value: clients.filter(c => c.has_account).length, label: 'Com conta ativa' },
          { icon: <Wallet className="w-7 h-7 text-blue-600" />, value: `R$ ${clients.reduce((s, c) => s + c.total_spent, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, label: 'Receita total' },
          { icon: <Crown className="w-7 h-7 text-amber-600" />, value: clients.filter(c => c.total_spent >= 1000).length, label: 'Clientes top' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="pt-4 flex items-center gap-3">{s.icon}<div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Clientes com Passeios</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('tours_count')} className="h-7 px-1 text-xs">Passeios <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                  <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('total_spent')} className="h-7 px-1 text-xs">Gasto <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('total_points')} className="h-7 px-1 text-xs">Pontos <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                  <TableHead>Selos</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{client.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{client.tours_count}</Badge></TableCell>
                    <TableCell className="text-sm">R$ {client.total_spent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>
                      {client.level_name
                        ? <Badge style={{ backgroundColor: client.level_color + '20', color: client.level_color ?? undefined }}>{client.level_name}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm"><Star className="w-3 h-3 text-amber-500" />{client.total_points}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm"><Award className="w-3 h-3 text-purple-500" />{client.badges_count}</span>
                    </TableCell>
                    <TableCell>
                      {client.has_account
                        ? <Badge className="bg-emerald-500 text-xs">Ativa</Badge>
                        : <Badge variant="secondary" className="text-xs">Sem conta</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ajustar pontos" onClick={() => openPointsDialog(client)} disabled={!client.has_account}>
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Enviar mensagem" disabled={!client.has_account}
                          onClick={async () => {
                            if (!client.account_id) return;
                            const { error } = await supabase.from('client_communications').insert({ client_account_id: client.account_id, title: 'Mensagem da Camaleão', message: 'Olá! Passando para lembrar que temos passeios incríveis esperando por você.', type: 'info' });
                            if (!error) toast({ title: 'Mensagem enviada!' });
                          }}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Pontos ──
  const renderPoints = () => (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-primary">{clients.reduce((s, c) => s + c.total_points, 0)}</p><p className="text-sm text-muted-foreground">Total de pontos distribuídos</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-primary">{clients.filter(c => c.total_points > 0).length}</p><p className="text-sm text-muted-foreground">Clientes com pontos</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground mb-1">Regra atual</p><p className="text-sm font-medium">R$ 10 gastos = 1 ponto</p></CardContent></Card>
      </div>

      {/* Adjust points */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" />Ajustar Pontos de um Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              {searchTerm && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {clients.filter(c => c.has_account && (c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf.includes(searchTerm))).slice(0, 8).map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm flex justify-between"
                      onClick={() => { openPointsDialog(c); setSearchTerm(''); }}>
                      <span>{c.nome_completo}</span>
                      <span className="text-muted-foreground">{c.total_points} pts</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Selecione um cliente para abrir o formulário de ajuste de pontos.</p>
          </div>
        </CardContent>
      </Card>

      {/* Table ordered by points */}
      <Card>
        <CardHeader><CardTitle>Ranking de Pontos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...clients].sort((a, b) => b.total_points - a.total_points).filter(c => c.has_account).map((client, i) => (
                <TableRow key={client.id}>
                  <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                  <TableCell><p className="font-medium text-sm">{client.nome_completo}</p></TableCell>
                  <TableCell>
                    {client.level_name
                      ? <Badge style={{ backgroundColor: client.level_color + '20', color: client.level_color ?? undefined }}>{client.level_name}</Badge>
                      : '—'}
                  </TableCell>
                  <TableCell><span className="flex items-center gap-1 font-semibold"><Star className="w-3 h-3 text-amber-500" />{client.total_points}</span></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openPointsDialog(client)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // ── Selos ──
  const renderBadges = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{badges.length} selos configurados · {badges.filter(b => b.is_active).length} ativos</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map(badge => (
          <Card key={badge.id} className={badge.is_active ? '' : 'opacity-60'}>
            <CardContent className="pt-4">
              {editingBadge?.id === badge.id ? (
                <div className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={badgeForm.name ?? ''} onChange={e => setBadgeForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Descrição</Label><Textarea value={badgeForm.description ?? ''} onChange={e => setBadgeForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                  <div className="space-y-1"><Label className="text-xs">Pontos de recompensa</Label><Input type="number" value={badgeForm.points_reward ?? ''} onChange={e => setBadgeForm(f => ({ ...f, points_reward: parseInt(e.target.value) }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Cor (hex)</Label><Input value={badgeForm.color ?? ''} onChange={e => setBadgeForm(f => ({ ...f, color: e.target.value }))} /></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveBadge} disabled={savingBadge}>{savingBadge ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingBadge(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: badge.color + '20' }}>
                      <Award className="w-5 h-5" style={{ color: badge.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className="text-xs">{badge.requirement_type}: {badge.requirement_value}</Badge>
                    <Badge className="bg-amber-500 text-xs">+{badge.points_reward} pts</Badge>
                    {!badge.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openBadgeEdit(badge)} className="text-xs h-7"><Edit className="h-3 w-3 mr-1" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => openAssignDialog(badge)} className="text-xs h-7"><UserCheck className="h-3 w-3 mr-1" />Atribuir</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleBadge(badge)} className="text-xs h-7">
                      {badge.is_active ? <XCircle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-emerald-500" />}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ── Níveis ──
  const renderLevels = () => (
    <div className="space-y-4">
      {levels.map((level, idx) => (
        <Card key={level.id} style={{ borderLeftColor: level.color, borderLeftWidth: 4 }}>
          <CardContent className="pt-4">
            {editingLevel?.id === level.id ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={levelForm.name ?? ''} onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Ícone (emoji)</Label><Input value={levelForm.icon ?? ''} onChange={e => setLevelForm(f => ({ ...f, icon: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Pontos mínimos</Label><Input type="number" value={levelForm.min_points ?? ''} onChange={e => setLevelForm(f => ({ ...f, min_points: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Pontos máximos (vazio = sem limite)</Label><Input type="number" value={levelForm.max_points ?? ''} onChange={e => setLevelForm(f => ({ ...f, max_points: e.target.value ? parseInt(e.target.value) : null }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Cor (hex)</Label><Input value={levelForm.color ?? ''} onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))} /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Benefícios</Label><Textarea value={levelForm.benefits ?? ''} onChange={e => setLevelForm(f => ({ ...f, benefits: e.target.value }))} rows={2} /></div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button size="sm" onClick={handleSaveLevel} disabled={savingLevel}>{savingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingLevel(null)}><X className="h-3.5 w-3.5" /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: level.color }}>
                  {level.icon || idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: level.color }}>{level.name}</p>
                  <p className="text-xs text-muted-foreground">{level.benefits}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{level.min_points} – {level.max_points ?? '∞'} pontos</Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground mb-1">{clients.filter(c => c.level_name === level.name).length} clientes</p>
                  <Button size="sm" variant="outline" onClick={() => openLevelEdit(level)} className="text-xs h-7"><Edit className="h-3 w-3 mr-1" />Editar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── Mensagens ──
  const renderMensagens = () => (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Enviar Mensagem para Clientes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo de mensagem</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(typeConfig) as [typeof msgType, typeof typeConfig[typeof msgType]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setMsgType(key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${msgType === key ? cfg.color + ' border-current' : 'border-border text-muted-foreground'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} placeholder="Ex: Nova aventura disponível!" />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4} placeholder="Escreva a mensagem aqui..." />
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <Label>Destinatários</Label>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Todos os clientes' },
                { id: 'level', label: 'Por nível' },
                { id: 'client', label: 'Cliente específico' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setMsgTarget(opt.id as typeof msgTarget)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${msgTarget === opt.id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {msgTarget === 'level' && (
              <Select value={msgLevel} onValueChange={setMsgLevel}>
                <SelectTrigger><SelectValue placeholder="Selecione o nível..." /></SelectTrigger>
                <SelectContent>
                  {uniqueLevels.map(l => <SelectItem key={l!} value={l!}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {msgTarget === 'client' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." value={msgClientSearch} onChange={e => setMsgClientSearch(e.target.value)} className="pl-10" />
                </div>
                {msgClientSearch && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {msgFilteredClients.slice(0, 6).map(c => (
                      <button key={c.id} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${msgClientId === c.id ? 'bg-primary/10 font-semibold' : ''}`}
                        onClick={() => { setMsgClientId(c.id); setMsgClientSearch(c.nome_completo); }}>
                        {c.nome_completo} <span className="text-muted-foreground ml-1">· {c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg border bg-muted/30 text-sm">
            <p className="font-semibold text-xs text-muted-foreground mb-1">PRÉVIA</p>
            <p className="font-semibold">{msgTitle || 'Título da mensagem'}</p>
            <p className="text-muted-foreground mt-0.5">{msgBody || 'Corpo da mensagem aparecerá aqui...'}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold ${typeConfig[msgType].color}`}>{typeConfig[msgType].label}</span>
          </div>

          <Button onClick={handleSendMessage} disabled={sendingMsg} className="w-full sm:w-auto">
            {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Mensagem
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Dialogs ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Points adjustment dialog */}
      <Dialog open={pointsDialog} onOpenChange={setPointsDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" />Ajustar Pontos — {pointsClient?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Pontos atuais: <strong>{pointsClient?.total_points}</strong></p>
            <div className="flex gap-2">
              <button onClick={() => setPointsType('bonus')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${pointsType === 'bonus' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-border text-muted-foreground'}`}>
                <Plus className="h-4 w-4" />Adicionar
              </button>
              <button onClick={() => setPointsType('deduction')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${pointsType === 'deduction' ? 'bg-red-50 border-red-500 text-red-700' : 'border-border text-muted-foreground'}`}>
                <Minus className="h-4 w-4" />Remover
              </button>
            </div>
            <div className="space-y-1.5"><Label>Quantidade de pontos</Label><Input type="number" min="1" placeholder="Ex: 50" value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Motivo</Label><Input placeholder="Ex: Bônus por indicação" value={pointsReason} onChange={e => setPointsReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdjustPoints} disabled={savingPoints}>
              {savingPoints ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge assign dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir "{assignBadge?.name}" a um cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {assignFilteredClients.slice(0, 10).map(c => (
                <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                  onClick={() => handleAssignBadge(c)} disabled={assigningSaving}>
                  <p className="text-sm font-medium">{c.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">{c.email} · {c.badges_count} selos</p>
                </button>
              ))}
              {assignFilteredClients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Render view */}
      {viewMode === 'clientes'    && renderClients()}
      {viewMode === 'pontos'      && renderPoints()}
      {viewMode === 'selos'       && renderBadges()}
      {viewMode === 'niveis'      && renderLevels()}
      {viewMode === 'mensagens'   && renderMensagens()}
      {viewMode === 'recompensas' && renderLevels()}
    </div>
  );
};

export default ClientReportsTab;
