import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, KeyRound, Eye, EyeOff, Settings, AlertTriangle, WrenchIcon, MonitorSmartphone, LogOut, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActiveSession {
  id: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
  user_id: string;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)} dias`;
}

const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ open, onOpenChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Settings states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  // Change admin password
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);

  // Change modal access password
  const [newAccessPassword, setNewAccessPassword] = useState('');
  const [confirmAccessPassword, setConfirmAccessPassword] = useState('');
  const [showNewAccessPassword, setShowNewAccessPassword] = useState(false);

  // Active sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentDeviceFp, setCurrentDeviceFp] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadSessions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) {
      setIsAuthenticated(false);
      setAccessPassword('');
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['admin_2fa_enabled', 'maintenance_mode']);

      const settings = (data || []).reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, string | null>);

      setTwoFactorEnabled(settings['admin_2fa_enabled'] === 'true');
      setMaintenanceEnabled(settings['maintenance_mode'] === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id ?? null;
      setCurrentUserId(uid);
      setCurrentDeviceFp(localStorage.getItem('admin_device_fp'));

      const { data } = await (supabase.from('admin_2fa_sessions' as any) as any)
        .select('id, device_fingerprint, ip_address, created_at, expires_at, user_id')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_settings_password')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data?.setting_value) {
        toast.error('Nenhuma senha configurada.');
        return;
      }

      if (accessPassword === data.setting_value) {
        setIsAuthenticated(true);
        setAccessPassword('');
      } else {
        toast.error('Senha incorreta');
      }
    } catch (error) {
      toast.error('Erro ao verificar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
    if (error) throw error;
  };

  const handleToggle2FA = async (enabled: boolean) => {
    try {
      await updateSetting('admin_2fa_enabled', enabled.toString());
      setTwoFactorEnabled(enabled);
      toast.success(`Verificação em duas etapas ${enabled ? 'ativada' : 'desativada'}`);
    } catch {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      await updateSetting('maintenance_mode', enabled.toString());
      setMaintenanceEnabled(enabled);
      toast.success(`Modo manutenção ${enabled ? 'ativado' : 'desativado'}`);
    } catch {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleSaveAdminPassword = async () => {
    if (!newAdminPassword.trim()) {
      toast.error('Digite uma senha válida');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newAdminPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newAdminPassword });
      if (error) throw error;
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      toast.success('Senha do administrador alterada com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha');
    }
  };

  const handleSaveAccessPassword = async () => {
    if (!newAccessPassword.trim()) {
      toast.error('Digite uma senha válida');
      return;
    }
    if (newAccessPassword !== confirmAccessPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newAccessPassword.length < 4) {
      toast.error('A senha deve ter no mínimo 4 caracteres');
      return;
    }
    try {
      await updateSetting('admin_settings_password', newAccessPassword);
      setNewAccessPassword('');
      setConfirmAccessPassword('');
      toast.success('Senha de acesso às configurações atualizada');
    } catch {
      toast.error('Erro ao salvar senha');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await (supabase.from('admin_2fa_sessions' as any) as any).delete().eq('id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Sessão encerrada');
    } catch {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!currentUserId) return;
    try {
      await (supabase.from('admin_2fa_sessions' as any) as any)
        .delete()
        .eq('user_id', currentUserId);
      setSessions([]);
      localStorage.removeItem('admin_device_fp');
      toast.success('Todas as sessões foram encerradas');
    } catch {
      toast.error('Erro ao encerrar sessões');
    }
  };

  const isCurrentSession = (s: ActiveSession) =>
    s.device_fingerprint && s.device_fingerprint === currentDeviceFp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!isAuthenticated ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Configurações Avançadas
              </DialogTitle>
              <DialogDescription>
                Digite a senha para acessar as configurações de administrador
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAccessSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="accessPassword">Senha de Acesso</Label>
                <div className="relative">
                  <Input
                    id="accessPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Digite a senha"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !accessPassword}>
                {isLoading ? 'Verificando...' : 'Acessar'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configurações de Administrador
              </DialogTitle>
              <DialogDescription>
                Gerencie as configurações de segurança do sistema
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">

              {/* 2FA Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Verificação em Duas Etapas</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exigir código de verificação por e-mail ao fazer login
                  </p>
                </div>
                <Switch checked={twoFactorEnabled} onCheckedChange={handleToggle2FA} />
              </div>

              <Separator />

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Modo Manutenção</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exibir página de manutenção para visitantes do site
                  </p>
                </div>
                <Switch checked={maintenanceEnabled} onCheckedChange={handleToggleMaintenance} />
              </div>

              <Separator />

              {/* Change Admin Password */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Alterar Senha do Admin</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Altera a senha de acesso ao painel administrativo
                </p>

                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="newAdminPassword" className="text-xs">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newAdminPassword"
                        type={showNewAdminPassword ? 'text' : 'password'}
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmAdminPassword" className="text-xs">Confirmar nova senha</Label>
                    <Input
                      id="confirmAdminPassword"
                      type="password"
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveAdminPassword}
                    disabled={!newAdminPassword || !confirmAdminPassword}
                  >
                    Alterar Senha
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Active Sessions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Sessões Ativas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSessions} title="Atualizar">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    {sessions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={handleRevokeAllSessions}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Encerrar todas
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dispositivos autorizados com verificação em duas etapas
                </p>

                {sessionsLoading ? (
                  <p className="text-xs text-muted-foreground pl-6">Carregando...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">Nenhuma sessão ativa encontrada.</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {s.ip_address || 'IP desconhecido'}
                            </span>
                            {isCurrentSession(s) && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                este dispositivo
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">Criada {formatRelative(s.created_at)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevokeSession(s.id)}
                          title="Encerrar sessão"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Change Modal Access Password */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Label className="text-sm font-medium">Alterar Senha de Acesso</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Senha usada para abrir este painel de configurações
                </p>

                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="newAccessPassword" className="text-xs">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newAccessPassword"
                        type={showNewAccessPassword ? 'text' : 'password'}
                        value={newAccessPassword}
                        onChange={(e) => setNewAccessPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewAccessPassword(!showNewAccessPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewAccessPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmAccessPassword" className="text-xs">Confirmar nova senha</Label>
                    <Input
                      id="confirmAccessPassword"
                      type="password"
                      value={confirmAccessPassword}
                      onChange={(e) => setConfirmAccessPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveAccessPassword}
                    disabled={!newAccessPassword || !confirmAccessPassword}
                  >
                    Alterar Senha de Acesso
                  </Button>
                </div>
              </div>

            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminSettingsModal;
