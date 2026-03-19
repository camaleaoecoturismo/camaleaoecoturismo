import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Mail, Loader2 } from 'lucide-react';
const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        const {
          data: adminRole
        } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle();
        if (adminRole) {
          navigate('/admin');
        } else {
          await supabase.auth.signOut();
        }
      }
    };
    checkAuth();
  }, [navigate]);
  const send2FACode = async (userEmail: string, userIdParam: string) => {
    try {
      const response = await supabase.functions.invoke('send-admin-2fa-code', {
        body: {
          email: userEmail,
          user_id: userIdParam
        }
      });
      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar código');
      }
      return true;
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      return false;
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Email e senha são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data: isValid,
        error: validationError
      } = await supabase.rpc('validate_auth_attempt', {
        email_input: email,
        ip_address: null
      });
      if (validationError || !isValid) {
        toast({
          title: "Tentativas de login bloqueadas",
          description: "Muitas tentativas de login. Tente novamente em 15 minutos.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        toast({
          title: "Erro no login",
          description: "Credenciais inválidas. Verifique seu email e senha.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Check if user is admin
      const {
        data: adminRole
      } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle();
      if (!adminRole) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar o painel administrativo.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Check if 2FA is enabled
      const { data: settingData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_2fa_enabled')
        .maybeSingle();
      
      const is2FAEnabled = settingData?.setting_value === 'true';

      if (is2FAEnabled) {
        // Send 2FA code
        setUserId(data.user.id);
        const codeSent = await send2FACode(email, data.user.id);
        if (codeSent) {
          setStep('2fa');
          toast({
            title: "Código enviado!",
            description: "Verifique seu email para o código de verificação."
          });
        } else {
          await supabase.auth.signOut();
          toast({
            title: "Erro na verificação",
            description: "Não foi possível enviar o código de verificação. Tente novamente.",
            variant: "destructive"
          });
        }
      } else {
        // 2FA disabled, go directly to admin
        toast({
          title: "Login realizado!",
          description: "Redirecionando para o painel administrativo..."
        });
        navigate('/admin');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleVerify2FA = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite o código de 6 dígitos enviado para seu email.",
        variant: "destructive"
      });
      return;
    }
    setVerifying(true);
    try {
      const response = await supabase.functions.invoke('verify-admin-2fa-code', {
        body: {
          email,
          code: otpCode
        }
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      if (response.data?.valid) {
        toast({
          title: "Verificação concluída!",
          description: "Redirecionando para o painel administrativo..."
        });
        navigate('/admin');
      } else {
        toast({
          title: "Código inválido",
          description: response.data?.error || "O código está incorreto ou expirado.",
          variant: "destructive"
        });
        setOtpCode('');
      }
    } catch (error) {
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar o código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };
  const handleResendCode = async () => {
    if (!userId) return;
    setResending(true);
    try {
      const codeSent = await send2FACode(email, userId);
      if (codeSent) {
        toast({
          title: "Código reenviado!",
          description: "Verifique seu email para o novo código."
        });
        setOtpCode('');
      } else {
        toast({
          title: "Erro ao reenviar",
          description: "Não foi possível reenviar o código. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setResending(false);
    }
  };
  const handleCancelVerification = async () => {
    await supabase.auth.signOut();
    setStep('login');
    setOtpCode('');
    setUserId(null);
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-700">
            Camaleão Ecoturismo
          </CardTitle>
          <CardDescription className="text-purple-700">
            Painel Administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'login' ? <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary">
                {loading ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </> : 'Entrar'}
              </Button>
            </form> : <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Verificação em Duas Etapas</h3>
                <p className="text-sm text-muted-foreground">
                  Enviamos um código de 6 dígitos para seu e-mail.  
                </p>
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{email}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={handleVerify2FA}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button onClick={handleVerify2FA} disabled={verifying || otpCode.length !== 6} className="w-full bg-primary">
                {verifying ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </> : 'Verificar Código'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button variant="ghost" size="sm" onClick={handleResendCode} disabled={resending}>
                  {resending ? 'Reenviando...' : 'Reenviar código'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelVerification} className="text-muted-foreground">
                  Cancelar
                </Button>
              </div>
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default Auth;