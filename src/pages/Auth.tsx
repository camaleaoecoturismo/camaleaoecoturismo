import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Mail, Loader2, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { logAction } from '@/hooks/useActivityLogger';

type Step = 'email' | 'password' | '2fa';

interface UserPreview {
  name: string;
  avatar_url: string | null;
  role: string;
}

// ─── Animated background blobs ───────────────────────────────────────────────
function Blobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-green-700/10 rounded-full blur-[80px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
    </div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function AvatarCircle({ preview }: { preview: UserPreview }) {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl mx-auto">
        {preview.avatar_url ? (
          <img src={preview.avatar_url} alt={preview.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {preview.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-[#0f1a14] flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
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
      // Rate limit check
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

      // Check role
      const { data: roleRow } = await supabase.from('user_roles').select('role')
        .eq('user_id', data.user.id).in('role', ['admin', 'staff']).maybeSingle();
      if (!roleRow) {
        await supabase.auth.signOut();
        toast({ title: 'Acesso negado', variant: 'destructive' });
        return;
      }

      // Staff: check active
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

      // Admin: check 2FA
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a1510] relative">
      <Blobs />

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-2xl font-bold text-white tracking-tight">Camaleão Ecoturismo</div>
          <div className="text-sm text-white/40 mt-1">Painel Administrativo</div>
        </motion.div>

        {/* Card */}
        <motion.div
          layout
          className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <AnimatePresence mode="wait">

            {/* ── Step: email ── */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">Bem-vindo de volta</h2>
                <p className="text-white/50 text-sm mb-6">Digite seu email para continuar</p>
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="pl-10 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500/60 focus:ring-emerald-500/20 h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all"
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* User preview */}
                <div className="flex flex-col items-center mb-6">
                  <AvatarCircle preview={userPreview} />
                  <h2 className="text-xl font-semibold text-white mt-4">
                    Olá, {userPreview.name.split(' ')[0]}!
                  </h2>
                  <p className="text-white/40 text-sm mt-0.5">{email}</p>
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
                      className="pr-10 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500/60 focus:ring-emerald-500/20 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                  </Button>
                </form>

                <button
                  onClick={resetToEmail}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mt-4 mx-auto transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Trocar conta
                </button>
              </motion.div>
            )}

            {/* ── Step: 2FA ── */}
            {step === '2fa' && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Shield className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Verificação em 2 etapas</h2>
                  <p className="text-white/50 text-sm mt-1">
                    Código enviado para<br />
                    <span className="text-white/70">{email}</span>
                  </p>
                </div>

                <div className="flex justify-center mb-5">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={handleVerify2FA}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map(i => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="bg-white/[0.06] border-white/10 text-white h-12 w-10"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerify2FA}
                  disabled={verifying || otpCode.length !== 6}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
                </Button>

                <div className="flex justify-between text-sm mt-4">
                  <button
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {resending ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                  <button onClick={resetToEmail} className="text-white/40 hover:text-white/70 transition-colors">
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
          transition={{ delay: 0.5 }}
          className="text-center text-white/20 text-xs mt-6"
        >
          © {new Date().getFullYear()} Camaleão Ecoturismo
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
