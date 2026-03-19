import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LogOut, QrCode, ChevronRight, Calendar, Users, Search,
  CheckCircle2, Circle, AlertCircle, MapPin, Phone, Baby,
  ShieldAlert, Package, ArrowLeft, Loader2, Eye, EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Guia {
  id: string;
  nome: string;
  email: string;
}

interface TourAtribuido {
  tour_id: string;
  tours: {
    id: string;
    name: string;
    start_date: string;
    end_date: string | null;
    city: string;
    state: string;
    image_url: string | null;
  };
}

interface Participant {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  problema_saude: boolean | null;
  descricao_problema_saude: string | null;
  nivel_condicionamento: string | null;
  assistencia_diferenciada: boolean | null;
  descricao_assistencia_diferenciada: string | null;
  pricing_option_name: string | null;
  selected_optionals: any;
  ponto_embarque_personalizado: string | null;
  reserva?: {
    payment_status: string;
    reserva_numero: string | null;
  };
  ticket?: {
    id: string;
    qr_token: string;
    checkin_at: string | null;
    boarding_point_name: string | null;
    boarding_time: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const age = (dob: string) => {
  const b = new Date(dob);
  const today = new Date();
  let a = today.getFullYear() - b.getFullYear();
  if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};

// ─── View: Login ──────────────────────────────────────────────────────────────

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("E-mail ou senha incorretos");
      setLoading(false);
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Área do Guia</h1>
          <p className="text-sm text-muted-foreground mt-1">Camaleão Ecoturismo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── View: Dashboard (lista de passeios) ──────────────────────────────────────

function DashboardView({
  guia,
  tours,
  onSelectTour,
  onLogout,
}: {
  guia: Guia;
  tours: TourAtribuido[];
  onSelectTour: (tourId: string) => void;
  onLogout: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = tours.filter(
    (t) => new Date(t.tours.start_date + "T12:00:00") >= today
  );
  const past = tours.filter(
    (t) => new Date(t.tours.start_date + "T12:00:00") < today
  );

  const TourCard = ({ t }: { t: TourAtribuido }) => {
    const start = new Date(t.tours.start_date + "T12:00:00");
    const isPast = start < today;
    return (
      <button
        onClick={() => onSelectTour(t.tours.id)}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left"
      >
        {t.tours.image_url ? (
          <img
            src={t.tours.image_url}
            alt={t.tours.name}
            className="w-14 h-14 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-6 w-6 text-primary/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">
            {t.tours.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.tours.city}, {t.tours.state}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDate(t.tours.start_date)}
              {t.tours.end_date && t.tours.end_date !== t.tours.start_date
                ? ` – ${formatDate(t.tours.end_date)}`
                : ""}
            </span>
            {isPast && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                Encerrado
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="font-semibold text-foreground text-sm">{guia.nome}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {tours.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum passeio atribuído ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde o administrador te atribuir a um passeio.
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Próximos ({upcoming.length})
                </h2>
                <div className="space-y-2">
                  {upcoming.map((t) => <TourCard key={t.tour_id} t={t} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Anteriores ({past.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {past.map((t) => <TourCard key={t.tour_id} t={t} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── View: Participantes + Check-in ──────────────────────────────────────────

function CheckinView({
  tourId,
  guiaId,
  onBack,
}: {
  tourId: string;
  guiaId: string;
  onBack: () => void;
}) {
  const [tourName, setTourName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tourId]);

  const loadData = async () => {
    setLoading(true);

    // Tour name
    const { data: tour } = await supabase
      .from("tours")
      .select("name")
      .eq("id", tourId)
      .single();
    if (tour) setTourName(tour.name);

    // Participants via reservas
    const { data: reservas } = await supabase
      .from("reservas")
      .select("id, reserva_numero, payment_status")
      .eq("tour_id", tourId)
      .in("payment_status", ["approved", "pending"]);

    if (!reservas?.length) { setLoading(false); return; }

    const reservaIds = reservas.map((r) => r.id);

    const { data: parts } = await supabase
      .from("reservation_participants")
      .select(`
        id, nome_completo, cpf, data_nascimento, whatsapp,
        problema_saude, descricao_problema_saude,
        nivel_condicionamento, assistencia_diferenciada,
        descricao_assistencia_diferenciada, pricing_option_name,
        selected_optionals, ponto_embarque_personalizado, reserva_id
      `)
      .in("reserva_id", reservaIds)
      .eq("is_staff", false)
      .order("nome_completo");

    // Tickets for check-in status
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, qr_token, checkin_at, boarding_point_name, boarding_time, participant_id")
      .eq("tour_id", tourId);

    const ticketsByParticipant: Record<string, any> = {};
    tickets?.forEach((t) => {
      if (t.participant_id) ticketsByParticipant[t.participant_id] = t;
    });

    const reservaMap: Record<string, any> = {};
    reservas.forEach((r) => { reservaMap[r.id] = r; });

    const enriched: Participant[] = (parts || []).map((p: any) => ({
      ...p,
      reserva: reservaMap[p.reserva_id],
      ticket: ticketsByParticipant[p.id] || null,
    }));

    setParticipants(enriched);
    setLoading(false);
  };

  const handleCheckin = async (participant: Participant) => {
    if (!participant.ticket) {
      toast.error("Ticket não encontrado para este participante");
      return;
    }
    if (participant.ticket.checkin_at) {
      toast.info("Check-in já realizado");
      return;
    }

    setCheckingIn(participant.id);
    const { error } = await supabase
      .from("tickets")
      .update({
        checkin_at: new Date().toISOString(),
        checkin_by: (await supabase.auth.getUser()).data.user?.id,
        status: "used",
      })
      .eq("id", participant.ticket.id);

    if (error) {
      toast.error("Erro ao fazer check-in");
    } else {
      toast.success(`Check-in de ${participant.nome_completo} confirmado!`);
      await loadData();
    }
    setCheckingIn(null);
  };

  const filtered = participants.filter((p) =>
    !search ||
    p.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf && p.cpf.includes(search))
  );

  const checkedIn = filtered.filter((p) => p.ticket?.checkin_at);
  const notCheckedIn = filtered.filter((p) => !p.ticket?.checkin_at);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{tourName}</p>
              <p className="text-xs text-muted-foreground">
                {checkedIn.length}/{participants.length} check-ins realizados
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: participants.length ? `${(checkedIn.length / participants.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum participante confirmado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aguardando check-in */}
            {notCheckedIn.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Aguardando ({notCheckedIn.length})
                </h3>
                <div className="space-y-2">
                  {notCheckedIn.map((p) => (
                    <ParticipantCard
                      key={p.id}
                      participant={p}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onCheckin={handleCheckin}
                      checkingIn={checkingIn === p.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Já fizeram check-in */}
            {checkedIn.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">
                  Presentes ({checkedIn.length})
                </h3>
                <div className="space-y-2 opacity-70">
                  {checkedIn.map((p) => (
                    <ParticipantCard
                      key={p.id}
                      participant={p}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onCheckin={handleCheckin}
                      checkingIn={checkingIn === p.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Participant Card ─────────────────────────────────────────────────────────

function ParticipantCard({
  participant: p,
  expanded,
  onToggle,
  onCheckin,
  checkingIn,
}: {
  participant: Participant;
  expanded: boolean;
  onToggle: () => void;
  onCheckin: (p: Participant) => void;
  checkingIn: boolean;
}) {
  const checked = !!p.ticket?.checkin_at;
  const hasAlert = p.problema_saude || p.assistencia_diferenciada;

  return (
    <div className={`rounded-xl border transition-all ${checked ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20" : "border-border bg-card"}`}>
      {/* Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Status icon */}
        <button
          onClick={() => !checked && onCheckin(p)}
          disabled={checkingIn || checked}
          className="shrink-0"
          title={checked ? "Check-in realizado" : "Fazer check-in"}
        >
          {checkingIn ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : checked ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>

        {/* Name + info */}
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{p.nome_completo}</span>
            {hasAlert && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {p.pricing_option_name && (
              <span className="text-xs text-muted-foreground">{p.pricing_option_name}</span>
            )}
            {p.ticket?.boarding_point_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                {p.ticket.boarding_point_name}
              </span>
            )}
            {checked && p.ticket?.checkin_at && (
              <span className="text-xs text-green-600">
                {new Date(p.ticket.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </button>

        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50">
          <div className="grid grid-cols-2 gap-2 pt-3">
            {p.cpf && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CPF</p>
                <p className="text-sm font-medium">{p.cpf}</p>
              </div>
            )}
            {p.data_nascimento && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Idade</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                  {age(p.data_nascimento)} anos ({formatDate(p.data_nascimento)})
                </p>
              </div>
            )}
            {p.whatsapp && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">WhatsApp</p>
                <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`}
                  target="_blank" rel="noreferrer"
                  className="text-sm font-medium text-green-600 flex items-center gap-1 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {p.whatsapp}
                </a>
              </div>
            )}
            {p.nivel_condicionamento && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Condicionamento</p>
                <p className="text-sm font-medium capitalize">{p.nivel_condicionamento}</p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {p.problema_saude && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/50">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Problema de saúde
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">{p.descricao_problema_saude || "Não especificado"}</p>
            </div>
          )}
          {p.assistencia_diferenciada && (
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900/50">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5 mb-1">
                <AlertCircle className="h-3.5 w-3.5" /> Assistência diferenciada
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300">{p.descricao_assistencia_diferenciada || "Não especificado"}</p>
            </div>
          )}

          {/* Optionals */}
          {p.selected_optionals && Array.isArray(p.selected_optionals) && p.selected_optionals.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Package className="h-3 w-3" /> Opcionais
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.selected_optionals.map((opt: any, i: number) => (
                  <span key={i} className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
                    {typeof opt === "string" ? opt : opt.name || opt.label || JSON.stringify(opt)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boarding */}
          {(p.ticket?.boarding_point_name || p.ponto_embarque_personalizado) && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Embarque
              </p>
              <p className="text-sm">{p.ticket?.boarding_point_name || p.ponto_embarque_personalizado}</p>
              {p.ticket?.boarding_time && (
                <p className="text-xs text-muted-foreground">{p.ticket.boarding_time}</p>
              )}
            </div>
          )}

          {/* Check-in button */}
          {!checked && (
            <Button
              onClick={() => onCheckin(p)}
              disabled={checkingIn}
              className="w-full h-9 bg-primary hover:bg-primary/90"
            >
              {checkingIn ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Presença
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type View = "login" | "dashboard" | "checkin";

export default function GuiaPage() {
  const [view, setView] = useState<View>("login");
  const [guia, setGuia] = useState<Guia | null>(null);
  const [tours, setTours] = useState<TourAtribuido[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkSession());
    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setView("login"); setCheckingSession(false); return; }

    const { data: guiaData } = await supabase
      .from("guias")
      .select("id, nome, email")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!guiaData) { setView("login"); setCheckingSession(false); return; }

    setGuia(guiaData);
    await loadTours(guiaData.id);
    setView("dashboard");
    setCheckingSession(false);
  };

  const loadTours = async (guiaId: string) => {
    const { data } = await supabase
      .from("guia_passeios")
      .select(`
        tour_id,
        tours (id, name, start_date, end_date, city, state, image_url)
      `)
      .eq("guia_id", guiaId)
      .order("tour_id");
    if (data) setTours(data as unknown as TourAtribuido[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setGuia(null);
    setTours([]);
    setView("login");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (view === "login") return <LoginView onLogin={checkSession} />;

  if (view === "checkin" && selectedTourId && guia) {
    return (
      <CheckinView
        tourId={selectedTourId}
        guiaId={guia.id}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "dashboard" && guia) {
    return (
      <DashboardView
        guia={guia}
        tours={tours}
        onSelectTour={(id) => { setSelectedTourId(id); setView("checkin"); }}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}
