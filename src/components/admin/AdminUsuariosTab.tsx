import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  UserPlus, PowerOff, Power, Eye, EyeOff, RefreshCw,
  User, Activity, Shield, Clock, Calendar, LogIn, Camera, Loader2, Edit2,
} from 'lucide-react';
import { ALL_SECTIONS, SECTION_TO_TABS } from '@/hooks/useStaffPermissions';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Avatar upload helper ────────────────────────────────────────────────────

async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}.${ext}`;
  const { error } = await supabase.storage
    .from('staff-avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('staff-avatars').getPublicUrl(path);
  // Append timestamp to bust cache after re-upload
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ─── AvatarUpload component ───────────────────────────────────────────────────

function AvatarUpload({
  currentUrl,
  name,
  onFileSelected,
  uploading,
}: {
  currentUrl?: string | null;
  name?: string;
  onFileSelected: (file: File) => void;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB.'); return; }
    onFileSelected(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-primary/60 transition-colors group"
        title="Clique para enviar foto"
      >
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {name ? (
              <span className="text-2xl font-bold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <p className="text-xs text-muted-foreground">Clique para enviar foto</p>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaffUser {
  user_id: string;
  email: string;
  name: string | null;
  cargo: string | null;
  telefone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  role: string;
  last_login: string | null;
}

interface Permission {
  section: string;
  can_access: boolean;
}

interface ActivityLog {
  id: string;
  action_type: string;
  section: string | null;
  details: Record<string, unknown> | null;
  duration_sec: number | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec: number | null) {
  if (!sec || sec < 1) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

const ACTION_LABELS: Record<string, string> = {
  login:     'Login',
  logout:    'Logout',
  page_view: 'Página visitada',
  create:    'Criação',
  update:    'Edição',
  delete:    'Exclusão',
};

// ─── CreateUserModal ──────────────────────────────────────────────────────────

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName(''); setEmail(''); setCargo(''); setTelefone('');
    setPassword(''); setConfirmPassword('');
    setSelectedSections(new Set());
    setAvatarFile(null); setAvatarPreview(null);
  };

  const handleAvatarFile = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggleSection = (key: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Nome, email e senha são obrigatórios.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('create-staff-user', {
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          cargo: cargo.trim() || null,
          telefone: telefone.trim() || null,
          permissions: Array.from(selectedSections),
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const newUserId: string = response.data.user_id;

      // Upload avatar if provided
      if (avatarFile && newUserId) {
        try {
          const avatarUrl = await uploadAvatar(avatarFile, newUserId);
          await supabase.from('staff_profiles').update({ avatar_url: avatarUrl }).eq('user_id', newUserId);
        } catch {
          toast.warning('Usuário criado, mas houve erro ao enviar a foto. Você pode adicioná-la depois.');
        }
      }

      toast.success(`Usuário ${name} criado com sucesso!`);
      reset();
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Avatar upload */}
          <div className="flex justify-center">
            <AvatarUpload
              currentUrl={avatarPreview}
              name={name}
              onFileSelected={handleAvatarFile}
              uploading={loading}
            />
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome completo *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Maria Silva" />
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@email.com" />
            </div>
            <div>
              <Label>Cargo / Função</Label>
              <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Atendente" />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(62) 99999-9999" />
            </div>
            <div className="col-span-2">
              <Label>Senha inicial *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Confirmar senha *</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <Label className="text-sm font-semibold">Permissões de acesso</Label>
            <p className="text-xs text-muted-foreground mb-3">Selecione as seções que este usuário poderá acessar.</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SECTIONS.map(s => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedSections.has(s.key)}
                    onCheckedChange={() => toggleSection(s.key)}
                  />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-primary">
            {loading ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditPermissionsModal ─────────────────────────────────────────────────────

function EditPermissionsModal({
  user,
  open,
  onClose,
  onSaved,
}: {
  user: StaffUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setAvatarFile(null);
    setAvatarPreview(null);
    setLoadingPerms(true);
    supabase
      .from('staff_permissions')
      .select('section, can_access')
      .eq('user_id', user.user_id)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        ALL_SECTIONS.forEach(s => { map[s.key] = false; });
        (data || []).forEach(row => { map[row.section] = row.can_access; });
        setPermissions(map);
        setLoadingPerms(false);
      });
  }, [user, open]);

  const toggle = (key: string) =>
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));

  const handleAvatarFile = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Upload avatar if a new file was selected
      if (avatarFile) {
        const avatarUrl = await uploadAvatar(avatarFile, user.user_id);
        const { error: avatarError } = await supabase
          .from('staff_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('user_id', user.user_id);
        if (avatarError) throw avatarError;
      }

      // Save permissions
      const sections = ALL_SECTIONS.map(s => s.key);
      const canAccess = sections.map(k => permissions[k] ?? false);
      const { error } = await supabase.rpc('update_staff_permissions', {
        p_user_id: user.user_id,
        p_sections: sections,
        p_can_access: canAccess,
      });
      if (error) throw error;

      toast.success('Salvo com sucesso!');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatarUrl = avatarPreview || user?.avatar_url || null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Editar — {user?.name || user?.email}
          </DialogTitle>
        </DialogHeader>

        {loadingPerms ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Avatar */}
            <div className="flex justify-center">
              <AvatarUpload
                currentUrl={currentAvatarUrl}
                name={user?.name || undefined}
                onFileSelected={handleAvatarFile}
                uploading={loading}
              />
            </div>

            {/* Permissions */}
            <div>
              <p className="text-sm font-medium mb-3">Permissões de acesso</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SECTIONS.map(s => (
                  <label key={s.key} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={permissions[s.key] ?? false}
                      onCheckedChange={() => toggle(s.key)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || loadingPerms} className="bg-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ActivityModal ────────────────────────────────────────────────────────────

function ActivityModal({
  user,
  open,
  onClose,
}: {
  user: StaffUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);
    supabase
      .from('staff_activity_logs')
      .select('id, action_type, section, details, duration_sec, created_at')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs((data || []) as ActivityLog[]);
        setLoading(false);
      });
  }, [user, open]);

  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action_type === filterAction);

  // Stats
  const totalLogins = logs.filter(l => l.action_type === 'login').length;
  const totalPageViews = logs.filter(l => l.action_type === 'page_view' && !l.duration_sec).length;
  const totalTimeSec = logs.reduce((acc, l) => acc + (l.duration_sec || 0), 0);
  const avgTimeSec = totalPageViews > 0 ? Math.round(totalTimeSec / totalPageViews) : 0;

  // Section frequency chart
  const sectionCounts: Record<string, number> = {};
  logs.filter(l => l.section && l.action_type === 'page_view' && !l.duration_sec).forEach(l => {
    if (l.section) sectionCounts[l.section] = (sectionCounts[l.section] || 0) + 1;
  });
  const chartData = Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([section, count]) => ({
      section: ALL_SECTIONS.find(s => s.key === section)?.label || section,
      acessos: count,
    }));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Atividade de {user?.name || user?.email}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{totalLogins}</div>
                <div className="text-xs text-muted-foreground mt-1">Logins</div>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{totalPageViews}</div>
                <div className="text-xs text-muted-foreground mt-1">Páginas visitadas</div>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{formatDuration(avgTimeSec) || '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">Tempo médio/página</div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Seções mais acessadas</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="section" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="acessos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">Filtrar por ação:</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Log list */}
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">Nenhum registro encontrado.</div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {filtered.map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/40 text-sm">
                    <div className="shrink-0 mt-0.5">
                      {log.action_type === 'login' ? <LogIn className="h-4 w-4 text-green-500" /> :
                       log.action_type === 'logout' ? <LogIn className="h-4 w-4 text-red-400 rotate-180" /> :
                       log.action_type === 'page_view' ? <Eye className="h-4 w-4 text-blue-400" /> :
                       <Edit2 className="h-4 w-4 text-orange-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ACTION_LABELS[log.action_type] || log.action_type}</span>
                        {log.section && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {ALL_SECTIONS.find(s => s.key === log.section)?.label || log.section}
                          </Badge>
                        )}
                        {log.duration_sec && log.duration_sec > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{formatDuration(log.duration_sec)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatDate(log.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── AdminUsuariosTab ─────────────────────────────────────────────────────────

const AdminUsuariosTab: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [activityUser, setActivityUser] = useState<StaffUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_staff_users');
    if (error) {
      toast.error('Erro ao carregar usuários.');
    } else {
      setUsers((data || []) as StaffUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = async (user: StaffUser) => {
    setTogglingId(user.user_id);
    const { error } = await supabase.rpc('set_staff_active', {
      p_user_id: user.user_id,
      p_active: !user.is_active,
    });
    if (error) {
      toast.error(error.message || 'Erro ao alterar status.');
    } else {
      toast.success(user.is_active ? 'Usuário desativado.' : 'Usuário reativado.');
      fetchUsers();
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários do sistema</h2>
          <p className="text-sm text-muted-foreground">Gerencie colaboradores e suas permissões de acesso.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando usuários...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div
              key={user.user_id}
              className={`flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-opacity ${!user.is_active ? 'opacity-60' : ''}`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name || ''} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{user.name || '—'}</span>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                    {user.role === 'admin' ? 'Admin' : 'Colaborador'}
                  </Badge>
                  {!user.is_active && (
                    <Badge variant="destructive" className="text-xs">Desativado</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                {user.cargo && <div className="text-xs text-muted-foreground">{user.cargo}</div>}
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Criado em {formatDate(user.created_at)}
                  {user.last_login && (
                    <>
                      <span className="mx-1">·</span>
                      <LogIn className="h-3 w-3" />
                      Último login {formatDate(user.last_login)}
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" title="Ver atividade"
                  onClick={() => setActivityUser(user)}
                >
                  <Activity className="h-4 w-4" />
                </Button>
                {user.role === 'staff' && (
                  <>
                    <Button
                      variant="ghost" size="icon" title="Editar permissões"
                      onClick={() => setEditUser(user)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      title={user.is_active ? 'Desativar usuário' : 'Reativar usuário'}
                      onClick={() => toggleActive(user)}
                      disabled={togglingId === user.user_id}
                      className={user.is_active ? 'hover:text-destructive' : 'hover:text-green-600'}
                    >
                      {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchUsers}
      />
      <EditPermissionsModal
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSaved={fetchUsers}
      />
      <ActivityModal
        user={activityUser}
        open={!!activityUser}
        onClose={() => setActivityUser(null)}
      />
    </div>
  );
};

export default AdminUsuariosTab;
