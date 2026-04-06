import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Mail, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { logAction } from '@/hooks/useActivityLogger';

type Step = 'email' | 'password' | '2fa';

interface UserPreview {
  name: string;
  avatar_url: string | null;
  role: string;
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function AvatarCircle({ preview }: { preview: UserPreview }) {
  return (
    <div className="relative mx-auto">
      <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/30 shadow-2xl">
        {preview.avatar_url ? (
          <img src={preview.avatar_url} alt={preview.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {preview.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      {/* Online dot */}
      <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-green-400 rounded-full border-2 border-black/60" />
    </div>
  );
}

// ─── Main Auth page ───────────────────────────────────────────────────────────
const Auth = () => {
  useNoIndex();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userPreview, setUserPreview] = useState<UserPreview | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('user_roles').select('role').eq('user_id', session.user.id)
        .in('role', ['admin', 'staff']).maybeSingle()
        .then(({ data }) => { if (data) navigate('/admin'); else supabase.auth.signOut(); });
    });
  }, [navigate]);

  // ── Step 1: lookup user by email ──────────────────────────────────────────
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_login_preview', { p_email: email.trim() });
      if (error || !data || data.length === 0) {
        toast({ title: 'Email não reconhecido', description: 'Este email não tem acesso ao painel.', variant: 'destructive' });
        return;
      }
      setUserPreview(data[0] as UserPreview);
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: authenticate ──────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const { data: isValid } = await supabase.rpc('validate_auth_attempt', { email_input: email, ip_address: null });
      if (!isValid) {
        toast({ title: 'Bloqueado', description: 'Muitas tentativas. Aguarde 15 minutos.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        toast({ title: 'Senha incorreta', description: 'Verifique sua senha e tente novamente.', variant: 'destructive' });
        return;
      }

      const { data: roleRow } = await supabase.from('user_roles').select('role')
        .eq('user_id', data.user.id).in('role', ['admin', 'staff']).maybeSingle();
      if (!roleRow) {
        await supabase.auth.signOut();
        toast({ title: 'Acesso negado', variant: 'destructive' });
        return;
      }

      if (roleRow.role === 'staff') {
        const { data: profile } = await supabase.from('staff_profiles').select('is_active')
          .eq('user_id', data.user.id).maybeSingle();
        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          toast({ title: 'Conta desativada', description: 'Entre em contato com o administrador.', variant: 'destructive' });
          return;
        }
        await logAction('login');
        navigate('/admin');
        return;
      }

      const { data: twoFASetting } = await supabase.from('site_settings').select('setting_value')
        .eq('setting_key', 'admin_2fa_enabled').maybeSingle();

      if (twoFASetting?.setting_value === 'true') {
        setUserId(data.user.id);
        const res = await supabase.functions.invoke('send-admin-2fa-code', { body: { email, user_id: data.user.id } });
        if (res.error) {
          await supabase.auth.signOut();
          toast({ title: 'Erro ao enviar código 2FA', variant: 'destructive' });
          return;
        }
        setStep('2fa');
        toast({ title: 'Código enviado!', description: 'Verifique seu email.' });
      } else {
        await logAction('login');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: verify 2FA ────────────────────────────────────────────────────
  const handleVerify2FA = async () => {
    if (otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const res = await supabase.functions.invoke('verify-admin-2fa-code', { body: { email, code: otpCode } });
      if (res.error || !res.data?.valid) {
        toast({ title: res.data?.error || 'Código inválido ou expirado.', variant: 'destructive' });
        setOtpCode('');
        return;
      }
      await logAction('login');
      navigate('/admin');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId) return;
    setResending(true);
    const res = await supabase.functions.invoke('send-admin-2fa-code', { body: { email, user_id: userId } });
    if (res.error) toast({ title: 'Erro ao reenviar', variant: 'destructive' });
    else { toast({ title: 'Código reenviado!' }); setOtpCode(''); }
    setResending(false);
  };

  const resetToEmail = async () => {
    await supabase.auth.signOut();
    setStep('email');
    setPassword('');
    setOtpCode('');
    setUserPreview(null);
    setUserId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative flex items-end justify-center pb-12 md:pb-0 md:items-center">

      {/* Background photo — full screen */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/auth-bg.jpg)' }}
      />

      {/* Gradient overlay — black from bottom up */}
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-5">

        {/* Logo / brand — top of card area */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-white/50 text-xs tracking-[0.25em] uppercase mb-1">Área restrita</p>
          <h1 className="text-white text-2xl font-bold tracking-tight">Camaleão Ecoturismo</h1>
        </motion.div>

        {/* Form card */}
        <motion.div
          layout
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,6,20,0.72)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── Step: email ── */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="p-8"
              >
                <h2 className="text-white text-xl font-semibold mb-1">Bem-vindo de volta</h2>
                <p className="text-white/40 text-sm mb-7">Digite seu email para continuar</p>

                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="pl-10 h-11 bg-white/[0.07] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50"
                      style={{ WebkitTextFillColor: 'white', caretColor: 'white' }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-11 font-semibold text-white transition-all"
                    style={{ background: 'hsl(271 81% 56%)', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar →'}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── Step: password ── */}
            {step === 'password' && userPreview && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="p-8"
              >
                {/* User preview */}
                <div className="flex flex-col items-center mb-7">
                  <AvatarCircle preview={userPreview} />
                  <h2 className="text-white text-xl font-semibold mt-4">
                    Olá, {userPreview.name.split(' ')[0]}!
                  </h2>
                  <p className="text-white/35 text-sm mt-0.5">{email}</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoFocus
                      className="pr-10 h-11 bg-white/[0.07] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50"
                      style={{ WebkitTextFillColor: 'white', caretColor: 'white' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full h-11 font-semibold text-white"
                    style={{ background: 'hsl(271 81% 56%)', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                  </Button>
                </form>

                <button
                  onClick={resetToEmail}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm mt-5 mx-auto transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Trocar conta
                </button>
              </motion.div>
            )}

            {/* ── Step: 2FA ── */}
            {step === '2fa' && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="p-8"
              >
                <div className="flex flex-col items-center text-center mb-7">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
                  >
                    <Shield className="h-7 w-7 text-violet-400" />
                  </div>
                  <h2 className="text-white text-xl font-semibold">Verificação em 2 etapas</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Código enviado para<br />
                    <span className="text-white/65">{email}</span>
                  </p>
                </div>

                <div className="flex justify-center mb-5">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={handleVerify2FA}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map(i => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="bg-white/[0.07] border-white/10 text-white h-12 w-10"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerify2FA}
                  disabled={verifying || otpCode.length !== 6}
                  className="w-full h-11 font-semibold text-white"
                  style={{ background: 'hsl(271 81% 56%)', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
                </Button>

                <div className="flex justify-between text-sm mt-5">
                  <button
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {resending ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                  <button onClick={resetToEmail} className="text-white/30 hover:text-white/60 transition-colors">
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-white/20 text-xs mt-6"
        >
          © {new Date().getFullYear()} Camaleão Ecoturismo
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
