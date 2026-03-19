import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Key, RefreshCw, Search, CheckCircle, XCircle, Loader2, Clock, Pause, Play, Timer } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";

async function callRocaApi(action: string, params: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/roca-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg',
    },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

function useCountdown(targetTime: string, enabled: boolean) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setTimeLeft('');
      setIsPast(false);
      return;
    }

    const calculate = () => {
      const now = new Date();
      const [hours, minutes] = targetTime.split(':').map(Number);
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      // If target time already passed today, the execution already ran (or should have run)
      if (target <= now) {
        setIsPast(true);
        target.setDate(target.getDate() + 1);
      } else {
        setIsPast(false);
      }

      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime, enabled]);

  return { timeLeft, isPast };
}

export function RocaSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokenUsuario, setTokenUsuario] = useState('');
  const [cartaOferta, setCartaOferta] = useState('');
  const [senha, setSenha] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [hasSenha, setHasSenha] = useState(false);
  const [hasJwt, setHasJwt] = useState(false);
  const [jwtUpdatedAt, setJwtUpdatedAt] = useState<string | null>(null);
  const [generatingJwt, setGeneratingJwt] = useState(false);
  const [testing, setTesting] = useState(false);
  const [buscaCartaOferta, setBuscaCartaOferta] = useState('');
  const [buscaResult, setBuscaResult] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Auto-execution settings
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoTime, setAutoTime] = useState('20:00');
  const [editingTime, setEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState('20:00');

  const { timeLeft, isPast } = useCountdown(autoTime, autoEnabled);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const result = await callRocaApi('get_settings');
    if (result.settings) {
      setCartaOferta(result.settings.carta_oferta || '');
      setHasToken(result.settings.has_tokenusuario);
      setHasSenha(result.settings.has_senha);
      setHasJwt(result.settings.has_jwt);
      setJwtUpdatedAt(result.settings.jwt_updated_at);
      setAutoEnabled(result.settings.auto_execute_enabled ?? true);
      setAutoTime(result.settings.auto_execute_time ?? '20:00');
      setTempTime(result.settings.auto_execute_time ?? '20:00');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const params: any = { carta_oferta: cartaOferta };
    if (tokenUsuario) params.tokenusuario = tokenUsuario;
    if (senha) params.senha = senha;

    const result = await callRocaApi('save_settings', params);
    if (result.success) {
      toast.success('Configurações salvas');
      setTokenUsuario('');
      setSenha('');
      await loadSettings();
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleToggleAutoExecution = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    const result = await callRocaApi('save_settings', {
      carta_oferta: cartaOferta,
      auto_execute_enabled: enabled,
    });
    if (result.success) {
      toast.success(enabled ? 'Execução automática ativada' : 'Execução automática pausada');
    } else {
      setAutoEnabled(!enabled);
      toast.error('Erro ao atualizar');
    }
  };

  const handleSaveTime = async () => {
    const result = await callRocaApi('save_settings', {
      carta_oferta: cartaOferta,
      auto_execute_time: tempTime,
    });
    if (result.success) {
      setAutoTime(tempTime);
      setEditingTime(false);
      toast.success(`Horário atualizado para ${tempTime}`);
    } else {
      toast.error('Erro ao atualizar horário');
    }
  };

  const handleGenerateJwt = async () => {
    setGeneratingJwt(true);
    const result = await callRocaApi('generate_jwt');
    if (result.success) {
      toast.success('JWT gerado com sucesso');
      await loadSettings();
    } else {
      toast.error(result.error || 'Erro ao gerar JWT');
    }
    setGeneratingJwt(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const result = await callRocaApi('test_connection');
    if (result.connected) {
      toast.success('Conexão OK com a Roca!');
    } else {
      toast.error(`Falha na conexão (HTTP ${result.status_code})`);
    }
    setTesting(false);
  };

  const handleBuscarCartaOferta = async () => {
    if (!buscaCartaOferta.trim()) return;
    setBuscando(true);
    setBuscaResult(null);
    const result = await callRocaApi('lembrar_carta_oferta', { busca: buscaCartaOferta.trim() });
    setBuscaResult(JSON.stringify(result.data, null, 2));
    setBuscando(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Seguro Aventura (Roca)</h2>
          <p className="text-sm text-muted-foreground">Configure a integração com a API da Roca Seguros</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={hasToken ? 'default' : 'outline'} className="gap-1">
          {hasToken ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          Token Usuário
        </Badge>
        <Badge variant={hasJwt ? 'default' : 'outline'} className="gap-1">
          {hasJwt ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          JWT {jwtUpdatedAt && `(${new Date(jwtUpdatedAt).toLocaleDateString('pt-BR')})`}
        </Badge>
        <Badge variant={cartaOferta ? 'default' : 'outline'} className="gap-1">
          {cartaOferta ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          Carta Oferta
        </Badge>
      </div>

      {/* Auto-Execution Card */}
      <Card className={autoEnabled ? 'border-primary/30 bg-primary/5' : 'border-muted'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Execução Automática</CardTitle>
            </div>
            <Switch
              checked={autoEnabled}
              onCheckedChange={handleToggleAutoExecution}
            />
          </div>
          <CardDescription>
            {autoEnabled
              ? 'O seguro será executado automaticamente na véspera de cada passeio'
              : 'Execução automática pausada — somente execução manual'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Countdown */}
          {autoEnabled && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isPast ? `Já executou hoje às ${autoTime}` : 'Próxima verificação automática em'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-bold text-primary tabular-nums">
                      {timeLeft}
                    </span>
                    {isPast && (
                      <Badge variant="outline" className="text-xs">já executou</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!autoEnabled && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <Pause className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Automação interrompida</p>
                <p className="text-xs text-muted-foreground">O seguro não será executado automaticamente. Execute manualmente no painel do passeio.</p>
              </div>
            </div>
          )}

          {/* Time Editor */}
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap text-sm">Horário programado:</Label>
            {editingTime ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={tempTime}
                  onChange={e => setTempTime(e.target.value)}
                  className="w-32"
                />
                <Button size="sm" onClick={handleSaveTime}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTime(false); setTempTime(autoTime); }}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-lg">{autoTime}</span>
                <span className="text-xs text-muted-foreground">(horário de Brasília)</span>
                <Button size="sm" variant="ghost" onClick={() => setEditingTime(true)}>
                  Editar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais</CardTitle>
          <CardDescription>Os valores sensíveis são salvos criptografados no servidor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Token Usuário (API Key)</Label>
            <Input
              type="password"
              placeholder={hasToken ? '••••••• (já configurado)' : 'Cole o tokenusuario aqui'}
              value={tokenUsuario}
              onChange={e => setTokenUsuario(e.target.value)}
            />
          </div>
          <div>
            <Label>Carta Oferta (Código de Parceiro)</Label>
            <Input
              placeholder="Ex: 10054949-80/2021"
              value={cartaOferta}
              onChange={e => setCartaOferta(e.target.value)}
            />
          </div>
          <div>
            <Label>Senha (opcional)</Label>
            <Input
              type="password"
              placeholder={hasSenha ? '••••••• (já configurada)' : 'Senha da Roca (se aplicável)'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleGenerateJwt} disabled={generatingJwt || !cartaOferta}>
              {generatingJwt ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Gerar/Atualizar JWT
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !hasJwt}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
          </div>

          <div className="border-t pt-3 space-y-2">
            <Label>Lembrar Carta Oferta (busca por e-mail, CPF ou CNPJ)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite e-mail, CPF ou CNPJ"
                value={buscaCartaOferta}
                onChange={e => setBuscaCartaOferta(e.target.value)}
              />
              <Button variant="outline" onClick={handleBuscarCartaOferta} disabled={buscando || !hasToken}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {buscaResult && (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{buscaResult}</pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
