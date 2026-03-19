import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle, Home } from 'lucide-react';
import logo from '@/assets/logo.png';
type AuthStep = 'credentials' | 'forgot-password' | 'reset-sent' | 'confirm-email';
type RegisterStep = 'cpf' | 'details' | 'password';
const ClientAuth = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginType, setLoginType] = useState<'email' | 'cpf'>('email');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('credentials');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('cpf');
  const [resetEmail, setResetEmail] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+55');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpfFound, setCpfFound] = useState(false);
  const [pendingClienteId, setPendingClienteId] = useState<string | null>(null);
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
        // Check if this is a CLIENT account (not admin)
        const {
          data: clientAccount
        } = await supabase.from('client_accounts').select('id').eq('user_id', session.user.id).maybeSingle();
        if (clientAccount) {
          navigate('/minha-conta');
          return;
        }

        // Check if this is an admin
        const {
          data: adminRole
        } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle();
        if (adminRole) {
          await supabase.auth.signOut();
          toast({
            title: "Sessão de administrador encerrada",
            description: "Para acessar a área do cliente, faça login com sua conta de cliente."
          });
        }
      }
    };
    checkAuth();
  }, [navigate, toast]);
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };
  const cleanCPF = (cpf: string) => cpf.replace(/\D/g, '');
  const cleanPhone = (phone: string) => phone.replace(/\D/g, '');
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  const createClientAccountAndProcessReservations = async (userId: string, clienteId: string) => {
    const {
      error: accountError
    } = await supabase.from('client_accounts').insert({
      user_id: userId,
      cliente_id: clienteId
    });
    if (accountError) {
      console.error('Error creating client account:', accountError);
      return;
    }
    const {
      data: reservas
    } = await supabase.from('reservas').select('id').eq('cliente_id', clienteId).in('status', ['confirmada', 'confirmado']).eq('payment_status', 'pago');
    if (reservas && reservas.length > 0) {
      for (const reserva of reservas) {
        await supabase.rpc('process_completed_tour', {
          p_reserva_id: reserva.id
        });
      }
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginType === 'email' ? email : cleanCPF(cpf);
    if (!identifier || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      let loginEmail = email;
      if (loginType === 'cpf') {
        // Use secure RPC function for CPF lookup (doesn't expose full client data)
        const {
          data: cliente,
          error: clienteError
        } = await supabase.rpc('lookup_client_by_cpf', { search_cpf: cleanCPF(cpf) });
        if (clienteError || !cliente || cliente.length === 0) {
          toast({
            title: "CPF não encontrado",
            description: "Este CPF não está cadastrado ou não possui conta.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        loginEmail = cliente[0].email;
      }
      const {
        data: authData,
        error
      } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });
      if (error) {
        if (error.message?.includes('Email not confirmed')) {
          toast({
            title: "E-mail não confirmado",
            description: "Verifique seu e-mail e clique no link de confirmação.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no login",
            description: "Credenciais inválidas. Verifique seus dados.",
            variant: "destructive"
          });
        }
      } else if (authData.user) {
        const {
          data: existingAccount
        } = await supabase.from('client_accounts').select('id').eq('user_id', authData.user.id).maybeSingle();
        if (!existingAccount) {
          const clienteId = authData.user.user_metadata?.cliente_id;
          if (clienteId) {
            await createClientAccountAndProcessReservations(authData.user.id, clienteId);
          } else {
            // Use secure RPC function for email lookup
            const {
              data: clienteData
            } = await supabase.rpc('lookup_client_by_email', { search_email: loginEmail });
            const cliente = clienteData && clienteData.length > 0 ? clienteData[0] : null;
            if (cliente) {
              await createClientAccountAndProcessReservations(authData.user.id, cliente.id);
            }
          }
        }
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!"
        });
        navigate('/minha-conta');
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
  const handleCheckCPF = async () => {
    const cleanedCPF = cleanCPF(cpf);
    if (cleanedCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido com 11 dígitos.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Use secure RPC function for CPF lookup
      const {
        data: clienteData,
        error
      } = await supabase.rpc('lookup_client_by_cpf', { search_cpf: cleanedCPF });
      const cliente = clienteData && clienteData.length > 0 ? clienteData[0] : null;
      if (error) {
        console.error('Error checking CPF:', error);
        toast({
          title: "Erro ao verificar CPF",
          description: "Tente novamente.",
          variant: "destructive"
        });
        return;
      }
      if (cliente) {
        // Check if account already exists
        const {
          data: existingAccount
        } = await supabase.from('client_accounts').select('id').eq('cliente_id', cliente.id).maybeSingle();
        if (existingAccount) {
          toast({
            title: "Conta já existe",
            description: "Já existe uma conta para este CPF. Faça login.",
            variant: "destructive"
          });
          setActiveTab('login');
          setLoginType('cpf');
          return;
        }

        // CPF found - auto-fill data
        setNomeCompleto(cliente.nome_completo || '');
        setEmail(cliente.email || '');
        setWhatsapp(cliente.whatsapp ? formatPhone(cliente.whatsapp) : '');
        setDataNascimento(cliente.data_nascimento || '');
        setPendingClienteId(cliente.id);
        setCpfFound(true);
        setRegisterStep('password');
      } else {
        setCpfFound(false);
        setRegisterStep('details');
      }
    } catch (error) {
      console.error('Error checking CPF:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDetailsSubmit = async () => {
    if (!nomeCompleto || !dataNascimento || !whatsapp || !email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    const cleanedPhone = cleanPhone(whatsapp);
    if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
      toast({
        title: "WhatsApp inválido",
        description: "Digite um número de WhatsApp válido.",
        variant: "destructive"
      });
      return;
    }
    setRegisterStep('password');
  };
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a senha.",
        variant: "destructive"
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas são diferentes.",
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
    const cleanedCPF = cleanCPF(cpf);
    const cleanedPhone = cleanPhone(whatsapp);
    const userEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      let clienteId = pendingClienteId;

      // If client doesn't exist, create them first
      if (!cpfFound) {
        const {
          data: newCliente,
          error: createError
        } = await supabase.from('clientes').insert({
          cpf: cleanedCPF,
          nome_completo: nomeCompleto.trim(),
          email: userEmail,
          whatsapp: cleanedPhone,
          data_nascimento: dataNascimento,
          capture_method: 'client_portal_signup'
        }).select('id').single();
        if (createError) {
          console.error('Error creating client:', createError);
          toast({
            title: "Erro ao criar cadastro",
            description: createError.message || "Tente novamente.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        clienteId = newCliente.id;
      }

      // Create Supabase Auth user
      const {
        data: authData,
        error: signUpError
      } = await supabase.auth.signUp({
        email: userEmail,
        password,
        options: {
          data: {
            cliente_id: clienteId,
            full_name: nomeCompleto
          },
          emailRedirectTo: `${window.location.origin}/cliente`
        }
      });
      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('User already registered')) {
          toast({
            title: "E-mail já cadastrado",
            description: "Este e-mail já possui uma conta. Faça login ou recupere sua senha.",
            variant: "destructive"
          });
          setActiveTab('login');
        } else {
          toast({
            title: "Erro ao criar conta",
            description: signUpError.message,
            variant: "destructive"
          });
        }
        setLoading(false);
        return;
      }

      // Check if user was created and session exists (email confirmation disabled)
      if (authData?.session) {
        // Auto-logged in - create client account link
        if (clienteId) {
          await createClientAccountAndProcessReservations(authData.user!.id, clienteId);
        }
        
        // Trigger welcome email
        try {
          await supabase.functions.invoke('trigger-email', {
            body: {
              trigger_event: 'account_created',
              to_email: userEmail,
              data: {
                nome: nomeCompleto.split(' ')[0],
                portal_link: `${window.location.origin}/minha-conta`
              }
            }
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't block user flow for email errors
        }
        
        toast({
          title: "Conta criada com sucesso!",
          description: "Bem-vindo à Área do Cliente!"
        });
        navigate('/minha-conta');
      } else if (authData?.user?.identities && authData.user.identities.length > 0) {
        // User created but needs email confirmation
        setStep('confirm-email');
        
        // Trigger welcome email even for unconfirmed accounts
        try {
          await supabase.functions.invoke('trigger-email', {
            body: {
              trigger_event: 'account_created',
              to_email: userEmail,
              data: {
                nome: nomeCompleto.split(' ')[0],
                portal_link: `${window.location.origin}/minha-conta`
              }
            }
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
        
        toast({
          title: "Verifique seu e-mail",
          description: "Enviamos um link de confirmação para " + userEmail
        });
      } else if (authData?.user?.identities?.length === 0) {
        // Email already registered
        toast({
          title: "E-mail já cadastrado",
          description: "Este e-mail já possui uma conta. Faça login ou recupere sua senha.",
          variant: "destructive"
        });
        setActiveTab('login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Campo obrigatório",
        description: "Digite seu e-mail.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/cliente`;

      // Call edge function to send password reset email via Resend
      const response = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail.trim().toLowerCase(),
          redirectUrl: redirectUrl
        }
      });
      if (response.error) {
        console.error('Password reset error:', response.error);
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar o email. Tente novamente.",
          variant: "destructive"
        });
      } else {
        setStep('reset-sent');
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada."
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/cliente`
        }
      });
      if (error) {
        toast({
          title: "Erro ao reenviar",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "E-mail reenviado!",
          description: "Verifique sua caixa de entrada."
        });
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

  // Confirm Email Screen
  if (step === 'confirm-email') {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="Camaleão Ecoturismo" className="h-20" />
            </div>
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Verifique seu E-mail
            </CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>Clique no link do e-mail para ativar sua conta.</p>
              <p className="text-xs">Se não encontrar o e-mail, verifique a pasta de spam.</p>
            </div>

            <div className="flex flex-col gap-2 text-center">
              <Button type="button" variant="outline" onClick={handleResendConfirmation} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reenviar e-mail
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
              setStep('credentials');
              setActiveTab('login');
            }}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Link to="/" className="mt-6">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
            <Home className="w-4 h-4 mr-2" />
            Voltar para o site
          </Button>
        </Link>
      </div>;
  }

  // Forgot Password Screen
  if (step === 'forgot-password') {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="Camaleão Ecoturismo" className="h-20" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Recuperar Senha
            </CardTitle>
            <CardDescription>
              Digite seu e-mail para receber o link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Seu e-mail" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="pl-10" required />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Enviar Link de Recuperação
              </Button>
            </form>

            <div className="text-center">
              <Button type="button" variant="ghost" size="sm" onClick={() => {
              setStep('credentials');
              setResetEmail('');
            }}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Link to="/" className="mt-6">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
            <Home className="w-4 h-4 mr-2" />
            Voltar para o site
          </Button>
        </Link>
      </div>;
  }

  // Reset Sent Screen
  if (step === 'reset-sent') {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="Camaleão Ecoturismo" className="h-20" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              E-mail Enviado!
            </CardTitle>
            <CardDescription>
              Enviamos um link de recuperação para <strong>{resetEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
              <p className="text-xs">Se não encontrar o e-mail, verifique a pasta de spam.</p>
            </div>

            <div className="flex flex-col gap-2 text-center">
              <Button type="button" variant="outline" onClick={() => setStep('forgot-password')}>
                Enviar novamente
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
              setStep('credentials');
              setResetEmail('');
            }}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Link to="/" className="mt-6">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
            <Home className="w-4 h-4 mr-2" />
            Voltar para o site
          </Button>
        </Link>
      </div>;
  }

  // Main Login/Register Screen
  return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img alt="Camaleão Ecoturismo" src="/lovable-uploads/6713efa9-8258-4a00-9dac-d73040e6e3cf.png" className="h-10" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Área do Cliente
          </CardTitle>
          <CardDescription>
            Acesse sua conta para ver seu histórico, pontuação e selos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button type="button" variant={loginType === 'email' ? 'default' : 'outline'} size="sm" onClick={() => setLoginType('email')} className="flex-1">
                    <Mail className="w-4 h-4 mr-1" />
                    E-mail
                  </Button>
                  <Button type="button" variant={loginType === 'cpf' ? 'default' : 'outline'} size="sm" onClick={() => setLoginType('cpf')} className="flex-1">
                    <User className="w-4 h-4 mr-1" />
                    CPF
                  </Button>
                </div>

                {loginType === 'email' ? <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div> : <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} maxLength={14} className="pl-10" required />
                  </div>}

                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Entrar
                </Button>

                <div className="text-center">
                  <Button type="button" variant="link" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setStep('forgot-password')}>
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              {registerStep === 'cpf' && <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Digite seu CPF para começar
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="cpfRegister">CPF</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="cpfRegister" type="text" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} maxLength={14} className="pl-10" autoFocus />
                    </div>
                  </div>

                  <Button onClick={handleCheckCPF} disabled={loading || cleanCPF(cpf).length !== 11} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    Continuar
                  </Button>
                </div>}

              {registerStep === 'details' && <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete seus dados
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="nomeCompleto" type="text" placeholder="Seu nome completo" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} className="pl-10" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input id="dataNascimento" type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <PhoneInput
                      id="whatsapp"
                      value={whatsapp}
                      onChange={setWhatsapp}
                      countryCode={whatsappCountryCode}
                      onCountryCodeChange={setWhatsappCountryCode}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailRegister">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="emailRegister" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setRegisterStep('cpf')} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={handleDetailsSubmit} disabled={loading || !nomeCompleto || !dataNascimento || !whatsapp || !email} className="flex-1">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Continuar
                    </Button>
                  </div>
                </div>}

              {registerStep === 'password' && <form onSubmit={handleRegister} className="space-y-4">
                  {cpfFound && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800">
                        <strong>Olá, {nomeCompleto.split(' ')[0]}!</strong> Encontramos seu cadastro. Crie uma senha para acessar sua conta.
                      </p>
                    </div>}

                  <p className="text-sm text-muted-foreground mb-4">
                    Crie uma senha para acessar sua conta
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="passwordRegister">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="passwordRegister" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required autoFocus />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPasswordRegister">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="confirmPasswordRegister" type="password" placeholder="Repita a senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                  if (cpfFound) {
                    setRegisterStep('cpf');
                    setCpfFound(false);
                  } else {
                    setRegisterStep('details');
                  }
                }} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button type="submit" disabled={loading || !password || !confirmPassword} className="flex-1">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Criar Conta
                    </Button>
                  </div>
                </form>}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Link to="/" className="mt-6">
        <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
          <Home className="w-4 h-4 mr-2" />
          Voltar para o site
        </Button>
      </Link>
    </div>;
};
export default ClientAuth;