import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, KeyRound, Eye, EyeOff, Settings, AlertTriangle, List, Calendar, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTours } from '@/hooks/useTours';

interface AdminSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_MONTHS = [
  { key: 'JAN', name: 'Janeiro' },
  { key: 'FEV', name: 'Fevereiro' },
  { key: 'MAR', name: 'Março' },
  { key: 'ABR', name: 'Abril' },
  { key: 'MAI', name: 'Maio' },
  { key: 'JUN', name: 'Junho' },
  { key: 'JUL', name: 'Julho' },
  { key: 'AGO', name: 'Agosto' },
  { key: 'SET', name: 'Setembro' },
  { key: 'OUT', name: 'Outubro' },
  { key: 'NOV', name: 'Novembro' },
  { key: 'DEZ', name: 'Dezembro' },
];

const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ open, onOpenChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get tours to determine available month-year combinations
  const { tours } = useTours();
  
  // Settings states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [financeiroPasswordEnabled, setFinanceiroPasswordEnabled] = useState(false);
  const [listViewEnabled, setListViewEnabled] = useState(false);
  const [hiddenMonthYears, setHiddenMonthYears] = useState<string[]>([]); // Format: "JAN-2025"
  const [newFinanceiroPassword, setNewFinanceiroPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newAccessPassword, setNewAccessPassword] = useState('');
  const [confirmAccessPassword, setConfirmAccessPassword] = useState('');
  const [showNewAccessPassword, setShowNewAccessPassword] = useState(false);
  
  // Available month-year combinations from tours
  const availableMonthYears = useMemo(() => {
    if (!tours.length) return [];
    
    const activeTours = tours.filter(tour => tour.is_active && tour.start_date && !tour.is_exclusive);
    const monthYearSet = new Map<string, { month: string; year: number; firstDate: Date }>();
    
    activeTours.forEach(tour => {
      const date = new Date(tour.start_date);
      const year = date.getFullYear();
      const month = tour.month;
      const key = `${month}-${year}`;
      
      if (!monthYearSet.has(key)) {
        monthYearSet.set(key, { month, year, firstDate: date });
      }
    });
    
    return Array.from(monthYearSet.entries())
      .sort((a, b) => a[1].firstDate.getTime() - b[1].firstDate.getTime())
      .map(([key, value]) => ({
        key,
        month: value.month,
        year: value.year,
        label: `${ALL_MONTHS.find(m => m.key === value.month)?.name || value.month} ${value.year}`
      }));
  }, [tours]);
  
  // Load current settings
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  // Reset authentication when modal closes
  useEffect(() => {
    if (!open) {
      setIsAuthenticated(false);
      setAccessPassword('');
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['admin_2fa_enabled', 'financeiro_password_enabled', 'financeiro_password', 'list_view_enabled', 'hidden_month_years']);
      
      if (error) throw error;
      
      const settings = data?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, string | null>);
      
      setTwoFactorEnabled(settings?.['admin_2fa_enabled'] === 'true');
      setFinanceiroPasswordEnabled(settings?.['financeiro_password_enabled'] === 'true' || !!settings?.['financeiro_password']);
      setListViewEnabled(settings?.['list_view_enabled'] === 'true');
      
      // Parse hidden month-years
      try {
        const parsed = settings?.['hidden_month_years'] ? JSON.parse(settings['hidden_month_years']) : [];
        setHiddenMonthYears(Array.isArray(parsed) ? parsed : []);
      } catch {
        setHiddenMonthYears([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Check admin settings password
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_settings_password')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;

      if (!data?.setting_value) {
        toast.error('Nenhuma senha configurada. Defina admin_settings_password em site_settings no Supabase.');
        return;
      }

      if (accessPassword === data.setting_value) {
        setIsAuthenticated(true);
        setAccessPassword('');
      } else {
        toast.error('Senha incorreta');
      }
    } catch (error) {
      console.error('Error checking password:', error);
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
    } catch (error) {
      console.error('Error updating 2FA:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleListView = async (enabled: boolean) => {
    try {
      await updateSetting('list_view_enabled', enabled.toString());
      setListViewEnabled(enabled);
      toast.success(`Visualização em lista ${enabled ? 'ativada' : 'desativada'}`);
    } catch (error) {
      console.error('Error updating list view:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleFinanceiroPassword = async (enabled: boolean) => {
    try {
      await updateSetting('financeiro_password_enabled', enabled.toString());
      setFinanceiroPasswordEnabled(enabled);
      if (!enabled) {
        await updateSetting('financeiro_password', '');
      }
      toast.success(`Senha do financeiro ${enabled ? 'ativada' : 'desativada'}`);
    } catch (error) {
      console.error('Error updating financeiro password:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleMonthYear = async (monthYearKey: string) => {
    try {
      let newHiddenMonthYears: string[];
      if (hiddenMonthYears.includes(monthYearKey)) {
        // Remove from hidden (show the month-year)
        newHiddenMonthYears = hiddenMonthYears.filter(m => m !== monthYearKey);
      } else {
        // Add to hidden (hide the month-year)
        newHiddenMonthYears = [...hiddenMonthYears, monthYearKey];
      }
      
      await updateSetting('hidden_month_years', JSON.stringify(newHiddenMonthYears));
      setHiddenMonthYears(newHiddenMonthYears);
    } catch (error) {
      console.error('Error updating hidden month-years:', error);
      toast.error('Erro ao atualizar meses');
    }
  };

  const handleSaveFinanceiroPassword = async () => {
    if (!newFinanceiroPassword.trim()) {
      toast.error('Digite uma senha válida');
      return;
    }
    
    try {
      await updateSetting('financeiro_password', newFinanceiroPassword);
      await updateSetting('financeiro_password_enabled', 'true');
      setNewFinanceiroPassword('');
      setFinanceiroPasswordEnabled(true);
      toast.success('Senha do financeiro atualizada');
    } catch (error) {
      console.error('Error saving financeiro password:', error);
      toast.error('Erro ao salvar senha');
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
    
    if (newAccessPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    try {
      await updateSetting('admin_settings_password', newAccessPassword);
      setNewAccessPassword('');
      setConfirmAccessPassword('');
      toast.success('Senha de acesso às configurações atualizada');
    } catch (error) {
      console.error('Error saving access password:', error);
      toast.error('Erro ao salvar senha');
    }
  };

  // Count visible month-years
  const visibleCount = availableMonthYears.filter(my => !hiddenMonthYears.includes(my.key)).length;

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
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleToggle2FA}
                />
              </div>
              
              <Separator />
              
              {/* Financeiro Password Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Senha do Financeiro</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exigir senha para acessar a área financeira
                    </p>
                  </div>
                  <Switch
                    checked={financeiroPasswordEnabled}
                    onCheckedChange={handleToggleFinanceiroPassword}
                  />
                </div>
                
                {financeiroPasswordEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="financeiroPassword" className="text-xs">Nova senha do financeiro</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="financeiroPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newFinanceiroPassword}
                          onChange={(e) => setNewFinanceiroPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button size="sm" onClick={handleSaveFinanceiroPassword} disabled={!newFinanceiroPassword}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* List View Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Visualização em Lista</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exibir opção de alternar entre cards e lista na página inicial
                  </p>
                </div>
                <Switch
                  checked={listViewEnabled}
                  onCheckedChange={handleToggleListView}
                />
              </div>
              
              <Separator />
              
              {/* Hidden Months Configuration */}
              <div className="space-y-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Meses Visíveis na Página Inicial</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione quais meses/anos devem aparecer nos cards principais ({visibleCount} de {availableMonthYears.length} visíveis)
                  </p>
                </div>
                
                {availableMonthYears.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">
                    Nenhum passeio ativo encontrado.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {availableMonthYears.map((monthYear) => {
                      const isVisible = !hiddenMonthYears.includes(monthYear.key);
                      return (
                        <div
                          key={monthYear.key}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            isVisible 
                              ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' 
                              : 'bg-muted/50 border-muted hover:bg-muted'
                          }`}
                          onClick={() => handleToggleMonthYear(monthYear.key)}
                        >
                          <Checkbox 
                            checked={isVisible}
                            onCheckedChange={() => handleToggleMonthYear(monthYear.key)}
                            className="pointer-events-none"
                          />
                          <span className={`text-xs ${isVisible ? 'font-medium' : 'text-muted-foreground'}`}>
                            {monthYear.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Change Access Password */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Label className="text-sm font-medium">Alterar Senha de Acesso</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Altere a senha usada para acessar estas configurações
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
