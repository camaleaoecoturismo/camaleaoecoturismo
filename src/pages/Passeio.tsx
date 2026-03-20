import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { ReservaModal } from "@/components/ReservaModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { RoteiroAccessModal } from "@/components/RoteiroAccessModal";
import { TourGalleryCarousel } from "@/components/TourGalleryCarousel";
import { TourBoardingPointsDisplay } from "@/components/TourBoardingPointsDisplay";
import { Button } from "@/components/ui/button";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import { Tour } from "@/hooks/useTours";
import { PixIcon } from "@/components/icons/PixIcon";
import DOMPurify from "dompurify";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  FileText,
  Clock,
  Info,
  Map as MapIcon,
  CheckSquare,
  CreditCard,
  Plus,
  Minus,
} from "lucide-react";

const INSTALLMENT_FEES: Record<number, number> = {
  1: 4.20, 2: 6.09, 3: 7.01, 4: 7.91, 5: 8.80, 6: 9.67,
  7: 12.59, 8: 13.42, 9: 14.25, 10: 15.06, 11: 15.87, 12: 16.66,
};

// WhatsApp SVG icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Passeio = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [roteiroOpen, setRoteiroOpen] = useState(false);
  const [inclusoTab, setInclusoTab] = useState<"incluso" | "nao_incluso">("incluso");
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [relatedCoverImages, setRelatedCoverImages] = useState<Map<string, string>>(new Map());
  const [depoimentos, setDepoimentos] = useState<
    Array<{ id: string; nome: string; foto_url: string | null; texto: string; nota: number }>
  >([]);
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>({});
  const [showInstallments, setShowInstallments] = useState(false);

  const { availability } = useTourAvailability(tour?.id);

  useEffect(() => {
    if (!tourId) return;
    const fetchTour = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tourId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const query = db
        .from("tours")
        .select(`*, pricing_options:tour_pricing_options(id, option_name, description, pix_price, card_price)`);
      const { data, error } = await (isUuid
        ? query.eq("id", tourId)
        : query.eq("slug", tourId)
      ).single();

      if (error || !data) { navigate("/"); return; }
      setTour(data as unknown as Tour);

      const today = new Date().toISOString().split("T")[0];
      const { data: related } = await db
        .from("tours")
        .select(`*, pricing_options:tour_pricing_options(id, option_name, pix_price, card_price)`)
        .eq("city", data.city)
        .eq("is_active", true)
        .neq("id", data.id)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(8);
      const relatedList = (related as unknown as Tour[]) || [];
      setRelatedTours(relatedList);
      if (relatedList.length > 0) {
        const ids = relatedList.map((t: Tour) => t.id);
        const { data: covers } = await supabase
          .from('tour_gallery_images')
          .select('tour_id, image_url')
          .in('tour_id', ids)
          .eq('is_cover', true);
        if (covers) {
          const m = new Map<string, string>();
          covers.forEach(c => m.set(c.tour_id, c.image_url));
          setRelatedCoverImages(m);
        }
      }

      const { data: deps } = await db
        .from("depoimentos")
        .select("id, nome, foto_url, texto, nota, tour_id")
        .eq("ativo", true)
        .order("display_order")
        .order("created_at", { ascending: false });
      if (deps && deps.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tourDeps = deps.filter((d: any) => d.tour_id === data.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const generalDeps = deps.filter((d: any) => !d.tour_id);
        setDepoimentos([...tourDeps, ...generalDeps].slice(0, 12));
      }
      setLoading(false);
    };
    fetchTour();
  }, [tourId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!tour) return null;

  const isSoldOut =
    availability?.isSoldOut ||
    tour.vagas_fechadas ||
    tour.etiqueta === "Vagas encerradas" ||
    tour.etiqueta === "vagas encerradas";

  const start = new Date(tour.start_date + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureTour = start >= today;
  const end = tour.end_date ? new Date(tour.end_date + "T12:00:00") : null;
  const durationDays = end
    ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  const dateStr = (() => {
    const s = `${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} de ${start.getFullYear()}`;
    if (end && tour.end_date !== tour.start_date)
      return `${start.getDate()} a ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]} de ${end.getFullYear()}`;
    return s;
  })();

  const minPrice = tour.pricing_options?.length > 0
    ? Math.min(...tour.pricing_options.map((o) => o.pix_price))
    : tour.valor_padrao || 0;

  const selectedTotal = tour.pricing_options?.reduce
    ? tour.pricing_options.reduce((sum, opt) => sum + (opt.pix_price * (packageQuantities[opt.id] || 0)), 0)
    : 0;
  const installmentBase = selectedTotal > 0 ? selectedTotal : minPrice;

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const sanitize = (html: string | null) =>
    DOMPurify.sanitize(html || "", {
      ALLOWED_TAGS: ["p","br","strong","em","u","s","ul","ol","li","h1","h2","h3","h4","a","blockquote","img","details","summary","table","thead","tbody","tr","th","td","div","span","pre","code"],
      ALLOWED_ATTR: ["href","target","rel","src","alt","class","style","open"],
    });

  const handleWhatsApp = () => {
    const msg = `Olá! Gostaria de saber mais sobre o passeio *${tour.name}*.`;
    window.open(`https://wa.me/5582993649454?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const showEtiqueta =
    tour.etiqueta &&
    tour.etiqueta !== "Histórico" &&
    tour.etiqueta !== "Vagas encerradas" &&
    tour.etiqueta !== "vagas encerradas";

  // Section nav items — only show sections that have content
  type NavItem = { id: string; label: string; icon: React.ElementType };
  const navItems: NavItem[] = [
    { id: "sobre", label: "Sobre", icon: Info, show: !!tour.about },
    { id: "roteiro", label: "Roteiro", icon: MapIcon, show: !!tour.itinerary },
    { id: "incluso", label: "Incluso", icon: CheckSquare, show: !!(tour.includes || tour.not_includes) },
    { id: "embarques", label: "Embarques", icon: MapPin, show: true },
  ].filter((item): item is NavItem & { show: boolean } => item.show).map(({ id, label, icon }) => ({ id, label, icon }));

  const midIndex = Math.ceil(navItems.length / 2);

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <div className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        {/* Gallery slider fills the hero */}
        <TourGalleryCarousel
          tourId={tour.id}
          coverImage={tour.image_url}
          tourName={tour.name}
          isSoldOut={isSoldOut}
          fill
        />

        {/* Top gradient (behind menu) */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/65 to-transparent z-10 pointer-events-none" />
        {/* Bottom gradient (behind text) */}
        <div className="absolute bottom-0 inset-x-0 h-3/4 bg-gradient-to-t from-black/85 via-black/35 to-transparent z-10 pointer-events-none" />

        {/* TopMenu — transparent */}
        <div className="absolute top-0 inset-x-0 z-20">
          <TopMenu transparent />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-[68px] left-4 z-20 flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Tour info — bottom left */}
        <div className="absolute bottom-0 left-0 right-16 z-20 px-5 pb-5 md:px-8">
          {(tour.city || tour.state) && (
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">
              {[tour.city, tour.state?.toUpperCase()].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1 className="font-europa text-3xl md:text-4xl font-bold text-white tracking-wide leading-tight mb-1.5 drop-shadow-md">
            {tour.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/70 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dateStr}
            </span>
            {durationDays > 1 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {durationDays} dias
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isSoldOut && (
              <span className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">Esgotado</span>
            )}
            {!isSoldOut && availability && (
              <span className="bg-green-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />
                {availability.availableSpots} vagas
              </span>
            )}
            {tour.is_featured && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-md">⭐ DESTAQUE</span>
            )}
            {showEtiqueta && (
              <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                {tour.etiqueta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-2xl mx-auto px-4 pb-40">

        {/* Action buttons */}
        <div className="flex gap-3 mb-8 mt-5">
          {tour.pdf_file_path && (
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setRoteiroOpen(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver roteiro
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <WhatsAppIcon className="w-4 h-4 mr-2" />
            Falar com atendente
          </Button>
        </div>

        {/* Sobre */}
        {tour.about && (
          <section id="sobre" className="mb-8 scroll-mt-4">
            <h2 className="font-semibold text-lg text-primary mb-3">Sobre o passeio</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.about) }} />
          </section>
        )}

        {/* Roteiro */}
        {tour.itinerary && (
          <section id="roteiro" className="mb-8 scroll-mt-4">
            <h2 className="font-semibold text-lg text-primary mb-3">Roteiro</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.itinerary) }} />
          </section>
        )}

        {/* Incluso / Não incluso */}
        {(tour.includes || tour.not_includes) && (
          <section id="incluso" className="mb-8 scroll-mt-4">
            <h2 className="font-semibold text-lg text-primary mb-3">Inclusos</h2>
            {tour.includes && tour.not_includes ? (
              <>
                <div className="flex justify-center border-b border-border mb-4">
                  <button
                    onClick={() => setInclusoTab("incluso")}
                    className={`px-8 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ✓ Incluso
                  </button>
                  <button
                    onClick={() => setInclusoTab("nao_incluso")}
                    className={`px-8 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "nao_incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ✗ Não incluso
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitize(inclusoTab === "incluso" ? tour.includes : tour.not_includes) }} />
              </>
            ) : (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitize(tour.includes || tour.not_includes) }} />
            )}
          </section>
        )}

        {/* Pontos de embarque */}
        <section id="embarques" className="mb-8 scroll-mt-4">
          <h2 className="font-semibold text-lg text-primary mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pontos de embarque
          </h2>
          <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
        </section>

        {/* Reservar / Valores */}
        <section id="valores" className="mb-8 scroll-mt-4">
          <div className="border border-border rounded-2xl p-5 bg-card shadow-sm space-y-4">

            {isSoldOut && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-600">Vagas esgotadas para este passeio</p>
              </div>
            )}

            {tour.pricing_options && tour.pricing_options.length > 0 ? (
              <>
                {/* Package selectors */}
                <p className="text-sm font-semibold text-foreground">
                  {isSoldOut ? "Pacotes disponíveis" : "Selecione os pacotes"}
                </p>
                <div className="space-y-2">
                  {tour.pricing_options.map((opt) => {
                    const qty = packageQuantities[opt.id] || 0;
                    return (
                      <div key={opt.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSoldOut ? "border-border/50 opacity-60" : "border-border"}`}>
                        <div>
                          <p className="text-sm font-medium text-foreground">{opt.option_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PixIcon size={13} />
                            <span className="text-sm font-bold text-primary">{formatCurrency(opt.pix_price)}</span>
                            <span className="text-xs text-muted-foreground">/ pessoa</span>
                          </div>
                        </div>
                        {!isSoldOut && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPackageQuantities(prev => ({ ...prev, [opt.id]: Math.max(0, (prev[opt.id] || 0) - 1) }))}
                              disabled={qty === 0}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground disabled:opacity-30 hover:border-primary hover:text-primary transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm">{qty}</span>
                            <button
                              onClick={() => setPackageQuantities(prev => ({ ...prev, [opt.id]: Math.min(10, (prev[opt.id] || 0) + 1) }))}
                              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Running total */}
                {Object.values(packageQuantities).some(q => q > 0) && (
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                    {tour.pricing_options.filter(opt => (packageQuantities[opt.id] || 0) > 0).map(opt => (
                      <div key={opt.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{packageQuantities[opt.id]}x {opt.option_name}</span>
                        <span>{formatCurrency(opt.pix_price * (packageQuantities[opt.id] || 0))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1">
                      <span>Total no PIX</span>
                      <span className="text-primary">{formatCurrency(
                        tour.pricing_options.reduce((sum, opt) => sum + (opt.pix_price * (packageQuantities[opt.id] || 0)), 0)
                      )}</span>
                    </div>
                  </div>
                )}

                {/* Installment toggle */}
                {minPrice > 0 && (
                  <>
                    <button
                      onClick={() => setShowInstallments(!showInstallments)}
                      className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Ver parcelamento no cartão</span>
                      {showInstallments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showInstallments && (
                      <div className="border border-border rounded-xl overflow-hidden text-xs">
                        <div className="grid grid-cols-3 bg-muted/60 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <span>Parcelas</span>
                          <span className="text-center">Valor/mês</span>
                          <span className="text-right">Total</span>
                        </div>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
                          const total = installmentBase * (1 + INSTALLMENT_FEES[n] / 100);
                          const monthly = total / n;
                          return (
                            <div key={n} className="grid grid-cols-3 px-3 py-2 border-t border-border/40 items-center">
                              <span className="font-medium text-foreground">{n === 1 ? "À vista" : `${n}x`}</span>
                              <span className="text-center font-semibold text-primary">{formatCurrency(monthly)}</span>
                              <span className="text-right text-muted-foreground">{formatCurrency(total)}</span>
                            </div>
                          );
                        })}
                        <p className="text-muted-foreground text-[10px] px-3 py-2 border-t border-border/50 bg-muted/30">
                          {installmentBase > minPrice ? "*Total selecionado." : "*Menor pacote."} Juros InfinitePay.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* No pricing options — simple price display */
              <>
                {minPrice > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">A partir de</p>
                    <div className="flex items-center gap-2">
                      <PixIcon size={20} />
                      <p className="text-3xl font-bold text-primary">{formatCurrency(minPrice)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">no PIX / à vista</p>
                  </div>
                )}
                {minPrice > 0 && (
                  <>
                    <button
                      onClick={() => setShowInstallments(!showInstallments)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showInstallments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Ver parcelamento no cartão
                    </button>
                    {showInstallments && (
                      <div className="border border-border rounded-xl overflow-hidden text-xs">
                        <div className="grid grid-cols-3 bg-muted/60 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <span>Parcelas</span>
                          <span className="text-center">Valor/mês</span>
                          <span className="text-right">Total</span>
                        </div>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
                          const total = minPrice * (1 + INSTALLMENT_FEES[n] / 100);
                          const monthly = total / n;
                          return (
                            <div key={n} className="grid grid-cols-3 px-3 py-2 border-t border-border/40 items-center">
                              <span className="font-medium text-foreground">{n === 1 ? "À vista" : `${n}x`}</span>
                              <span className="text-center font-semibold text-primary">{formatCurrency(monthly)}</span>
                              <span className="text-right text-muted-foreground">{formatCurrency(total)}</span>
                            </div>
                          );
                        })}
                        <p className="text-muted-foreground text-[10px] px-3 py-2 border-t border-border/50 bg-muted/30">*Juros InfinitePay.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Availability */}
            {!isSoldOut && availability && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Users className="w-4 h-4" />
                <span>{availability.availableSpots} vagas disponíveis</span>
              </div>
            )}

            {/* CTA */}
            {isSoldOut ? (
              <div className="space-y-2">
                <div className="w-full bg-muted text-muted-foreground text-center py-3 rounded-lg text-sm font-medium">Vagas Esgotadas</div>
                {isFutureTour && (
                  <Button variant="outline" className="w-full border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setWaitlistOpen(true)}>
                    <Bell className="w-4 h-4 mr-2" />
                    Entrar na lista de espera
                  </Button>
                )}
              </div>
            ) : tour.pricing_options && tour.pricing_options.length > 0 ? (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold"
                onClick={() => setReservaOpen(true)}
                disabled={!Object.values(packageQuantities).some(q => q > 0)}
              >
                {Object.values(packageQuantities).some(q => q > 0) ? "Continuar →" : "Selecione um pacote"}
              </Button>
            ) : (
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold" onClick={() => setReservaOpen(true)}>
                Reservar agora
              </Button>
            )}

            <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors py-1">
              <WhatsAppIcon className="w-4 h-4" />
              Falar com atendente
            </button>

            <div className="pt-2 border-t border-border text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Data</span>
                <span className="font-medium text-foreground">{dateStr}</span>
              </div>
              {durationDays > 1 && (
                <div className="flex justify-between">
                  <span>Duração</span>
                  <span className="font-medium text-foreground">{durationDays} dias</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Local</span>
                <span className="font-medium text-foreground">{[tour.city, tour.state?.toUpperCase()].filter(Boolean).join(", ")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Próximas datas */}
        {relatedTours.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-3">Próximas datas</h2>
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x -mx-4 px-4">
              {relatedTours.map((related) => {
                const relStart = new Date(related.start_date + "T12:00:00");
                const relEnd = related.end_date ? new Date(related.end_date + "T12:00:00") : null;
                const relPrice = related.pricing_options?.length > 0
                  ? Math.min(...related.pricing_options.map((o) => o.pix_price))
                  : related.valor_padrao || 0;
                const relDays = relEnd
                  ? Math.ceil((relEnd.getTime() - relStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  : 1;
                return (
                  <button
                    key={related.id}
                    onClick={() => navigate(`/passeio/${related.slug || related.id}`)}
                    className="w-44 shrink-0 snap-start text-left rounded-xl border border-border overflow-hidden hover:border-primary hover:shadow-sm transition-all bg-card"
                  >
                    {(relatedCoverImages.get(related.id) || related.image_url) && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={relatedCoverImages.get(related.id) || related.image_url!} alt={related.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{related.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {relStart.getDate()} de {MONTH_NAMES[relStart.getMonth()]}
                        {relDays > 1 ? ` · ${relDays} dias` : ""}
                      </p>
                      {relPrice > 0 && <p className="text-xs font-bold text-primary">{formatCurrency(relPrice)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Depoimentos */}
        {depoimentos.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-xl text-primary mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              O que dizem nossos viajantes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depoimentos.map((d) => (
                <div key={d.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {d.foto_url ? (
                      <img src={d.foto_url} alt={d.nome} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {d.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{d.nome}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < d.nota ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">"{d.texto}"</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── SECTION NAV BAR with elevated center Reservar button ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
        <div className="flex items-end max-w-lg mx-auto px-2">
          {navItems.slice(0, midIndex).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)} className="flex-1 flex flex-col items-center gap-0.5 py-3 text-muted-foreground hover:text-primary transition-colors">
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}

          {/* Center elevated Reservar button */}
          <div className="flex-1 flex flex-col items-center -mt-5 pb-2">
            <button
              onClick={isSoldOut && isFutureTour ? () => setWaitlistOpen(true) : !isSoldOut ? () => scrollTo("valores") : undefined}
              disabled={isSoldOut && !isFutureTour}
              className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center border-4 border-white dark:border-card transition-colors ${
                isSoldOut && isFutureTour ? "bg-orange-500 hover:bg-orange-600 text-white"
                : isSoldOut ? "bg-muted text-muted-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isSoldOut && isFutureTour ? <Bell className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </button>
            <span className={`text-[10px] font-semibold leading-none mt-1 ${isSoldOut && isFutureTour ? "text-orange-500" : isSoldOut ? "text-muted-foreground" : "text-primary"}`}>
              {isSoldOut && isFutureTour ? "Espera" : "Reservar"}
            </span>
          </div>

          {navItems.slice(midIndex).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)} className="flex-1 flex flex-col items-center gap-0.5 py-3 text-muted-foreground hover:text-primary transition-colors">
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ReservaModal
        isOpen={reservaOpen}
        onClose={() => setReservaOpen(false)}
        tour={tour}
        preSelectedQuantities={tour.pricing_options?.length > 0 ? packageQuantities : undefined}
      />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} tourId={tour.id} tourName={tour.name} />
      {tour.pdf_file_path && (
        <RoteiroAccessModal
          open={roteiroOpen}
          onOpenChange={setRoteiroOpen}
          tourId={tour.id}
          tourName={tour.name}
          pdfFilePath={tour.pdf_file_path}
        />
      )}
    </div>
  );
};

export default Passeio;
