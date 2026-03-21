import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TourCard } from "@/components/TourCard";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { ReservaModal } from "@/components/ReservaModal";
import { BannerCarousel } from "@/components/BannerCarousel";
import { TopMenu } from "@/components/TopMenu";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTours, Tour } from "@/hooks/useTours";
import { useMonthMessages } from "@/hooks/useMonthMessages";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import { Loader2, ChevronLeft, ChevronRight, MapPin, CalendarDays, SlidersHorizontal, Info, Instagram, Mail, Phone, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";

const monthNames: Record<string, string> = {
  JAN: "Janeiro", FEV: "Fevereiro", MAR: "Março", ABR: "Abril",
  MAI: "Maio", JUN: "Junho", JUL: "Julho", AGO: "Agosto",
  SET: "Setembro", OUT: "Outubro", NOV: "Novembro", DEZ: "Dezembro",
};

// Preference categories for filter
const PREFERENCE_CATEGORIES = [
  "Cachoeira", "Trilha leve", "Trilha longa", "Rapel",
  "Tirolesa", "Rope Jump", "Camping", "Feriado", "Indígena",
  "Viagem com crianças",
];

type FilterTab = "destino" | "data" | "preferencia";

const Index = () => {
  const { tours, loading } = useTours();
  const { messages } = useMonthMessages();
  const [hiddenMonthYears, setHiddenMonthYears] = useState<string[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["hidden_month_years"]);
      if (data) {
        const settings = data.reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string | null>);
        try {
          const parsed = settings["hidden_month_years"]
            ? JSON.parse(settings["hidden_month_years"])
            : [];
          setHiddenMonthYears(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHiddenMonthYears([]);
        }
      }
    };
    loadSettings();
  }, []);

  const tourIds = useMemo(() => tours.map((t) => t.id), [tours]);
  const { getCoverImage } = useTourCoverImages(tourIds);

  // Build months list
  const months = useMemo(() => {
    if (!tours.length) return [];
    const activeTours = tours.filter(
      (tour) => tour.is_active && tour.start_date && !tour.is_exclusive
    );
    const monthYearMap = new Map<string, { month: string; year: number; firstDate: Date }>();
    activeTours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      const year = date.getFullYear();
      const month = tour.month;
      const key = `${month}-${year}`;
      if (hiddenMonthYears.includes(key)) return;
      if (!monthYearMap.has(key)) {
        monthYearMap.set(key, { month, year, firstDate: date });
      }
    });
    return Array.from(monthYearMap.values())
      .sort((a, b) => a.firstDate.getTime() - b.firstDate.getTime())
      .map(({ month, year }) => ({
        id: `${month}-${year}`,
        label: month,
        name: monthNames[month] || month,
        month,
        year,
      }));
  }, [tours, hiddenMonthYears]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => sessionStorage.getItem("camaleao_selected_month") || ""
  );

  // Persist selected month so navigating back restores it
  useEffect(() => {
    if (selectedMonth) sessionStorage.setItem("camaleao_selected_month", selectedMonth);
  }, [selectedMonth]);
  const [reservaModalOpen, setReservaModalOpen] = useState(false);
  const [tourParaReserva, setTourParaReserva] = useState<Tour | null>(null);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTour, setWaitlistTour] = useState<Tour | null>(null);

  // Filter state
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("data");
  const [selectedDestino, setSelectedDestino] = useState<string>("");
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(true);
  const [destinoSearch, setDestinoSearch] = useState("");

  useEffect(() => {
    if (tours.length > 0 && months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0].id);
    } else if (tours.length > 0 && months.length > 0 && selectedMonth) {
      // If the saved month no longer exists in the list, fall back to the first
      if (!months.find(m => m.id === selectedMonth)) {
        setSelectedMonth(months[0].id);
      }
    }
  }, [tours, months, selectedMonth]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isFuture = (startDate: string) =>
    new Date(startDate + "T12:00:00") >= today;

  // All unique destination names — deduplicated by normalized name
  const destinations = useMemo(() => {
    const seen = new Map<string, string>(); // normalizedKey → original name
    tours
      .filter((t) => t.is_active && !t.is_exclusive && t.name)
      .forEach((t) => {
        const key = t.name.trim().toLowerCase();
        if (!seen.has(key)) seen.set(key, t.name.trim());
      });
    return Array.from(seen.values()).sort();
  }, [tours]);

  // Destinations filtered by search
  const filteredDestinations = useMemo(() => {
    if (!destinoSearch.trim()) return destinations;
    const q = destinoSearch.trim().toLowerCase();
    return destinations.filter((d) => d.toLowerCase().includes(q));
  }, [destinations, destinoSearch]);

  // Representative image per destination (first tour with an image)
  const destinationImages = useMemo(() => {
    const map = new Map<string, string>();
    tours
      .filter((t) => t.is_active && !t.is_exclusive && t.name)
      .forEach((t) => {
        const key = t.name.trim().toLowerCase();
        if (!map.has(key)) {
          const cover = getCoverImage(t.id);
          const img = cover?.imageUrl || t.image_url;
          if (img) map.set(key, img);
        }
      });
    return map;
  }, [tours, getCoverImage]);

  // Count of future tours per destination name
  const destinationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tours
      .filter((t) => t.is_active && !t.is_exclusive && t.start_date && isFuture(t.start_date))
      .forEach((t) => {
        const key = t.name.trim().toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    return counts;
  }, [tours, today]);


  // Tours filtered by month selector
  const filteredTours = useMemo(() => {
    if (!selectedMonth) return [];
    const [month, yearStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    return tours.filter((tour) => {
      if (!tour.is_active || !tour.start_date || tour.is_exclusive) return false;
      if (!isFuture(tour.start_date)) return false;
      const tourDate = new Date(tour.start_date + "T12:00:00");
      return tour.month === month && tourDate.getFullYear() === year;
    });
  }, [tours, selectedMonth, today]);

  // Tours filtered by destination/preference
  const searchFilteredTours = useMemo(() => {
    let result = tours.filter(
      (t) => t.is_active && !t.is_exclusive && t.start_date && isFuture(t.start_date)
    );
    if (selectedDestino) {
      const key = selectedDestino.trim().toLowerCase();
      result = result.filter((t) => t.name.trim().toLowerCase() === key);
    }
    if (selectedPreferences.length > 0) {
      result = result.filter((t) => {
        const haystack = [t.name, t.etiqueta, t.description, t.about]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return selectedPreferences.some((pref) =>
          haystack.includes(pref.toLowerCase())
        );
      });
    }
    return result;
  }, [tours, selectedDestino, selectedPreferences, today]);

  const isSearching = !!selectedDestino || selectedPreferences.length > 0;

  const currentMonthMessage = useMemo(() => {
    if (!selectedMonth) return null;
    const [month, yearStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    return messages.find(
      (msg) => msg.month === month && msg.year === year && msg.is_active
    );
  }, [messages, selectedMonth]);

  const currentMonthIndex = useMemo(
    () => months.findIndex((m) => m.id === selectedMonth),
    [selectedMonth, months]
  );

  const monthButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleMonthChange = useCallback(
    (monthId: string) => {
      setSelectedMonth(monthId);
      setSelectedDestino("");
      setSelectedPreferences([]);
      setTimeout(() => {
        const container = document.getElementById("months-scroll-container");
        const button = monthButtonsRef.current.get(monthId);
        if (container && button) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const scrollLeft =
            button.offsetLeft - containerRect.width / 2 + buttonRect.width / 2;
          container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
      }, 50);
    },
    []
  );

  const handleReservar = useCallback((tour: Tour) => {
    setTourParaReserva(tour);
    setReservaModalOpen(true);
  }, []);

  const displayedTours = isSearching ? searchFilteredTours : filteredTours;
  const selectedMonthData = months.find((m) => m.id === selectedMonth);


  return (
    <div className="min-h-screen bg-background">
      {/* Top Menu */}
      <TopMenu />

      {/* Banner Carousel */}
      <div className="bg-primary/5">
        <BannerCarousel />
      </div>

      {/* Filter Bar — Vivalá style */}
      <div className="bg-background border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2">
          {/* Filter Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-2">
            <button
              onClick={() => activeFilterTab === "data" ? setFilterOpen(o => !o) : (setActiveFilterTab("data"), setFilterOpen(true))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeFilterTab === "data" && filterOpen
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Data
            </button>
            <button
              onClick={() => activeFilterTab === "destino" ? setFilterOpen(o => !o) : (setActiveFilterTab("destino"), setFilterOpen(true))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeFilterTab === "destino" && filterOpen
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {selectedDestino || "Destino"}
            </button>
            <button
              onClick={() => activeFilterTab === "preferencia" ? setFilterOpen(o => !o) : (setActiveFilterTab("preferencia"), setFilterOpen(true))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeFilterTab === "preferencia" && filterOpen
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {selectedPreferences.length > 0
                ? `${selectedPreferences.length} filtro${selectedPreferences.length > 1 ? "s" : ""}`
                : "Preferências"}
            </button>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="pb-1">
              {activeFilterTab === "data" && (
                <div className="relative flex items-center">
                  <button
                    onClick={() => {
                      const container = document.getElementById("months-scroll-container");
                      if (container) container.scrollBy({ left: -150, behavior: "smooth" });
                    }}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div
                    id="months-scroll-container"
                    className="flex-1 overflow-x-auto"
                    style={{ scrollbarWidth: "none" }}
                  >
                    <div className="flex gap-2 pb-1 min-w-max">
                      {months.map((month, index) => {
                        const showYear =
                          index === 0 ||
                          month.year !== months[index - 1].year;
                        return (
                          <React.Fragment key={month.id}>
                            {showYear && index > 0 && (
                              <div className="flex items-center px-1">
                                <div className="w-px h-5 bg-border" />
                              </div>
                            )}
                            <button
                              ref={(el) => {
                                if (el) monthButtonsRef.current.set(month.id, el);
                              }}
                              onClick={() => handleMonthChange(month.id)}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                selectedMonth === month.id && !isSearching
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              }`}
                            >
                              {selectedMonth === month.id
                                ? month.name.toUpperCase()
                                : month.label.toUpperCase()}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const container = document.getElementById("months-scroll-container");
                      if (container) container.scrollBy({ left: 150, behavior: "smooth" });
                    }}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {activeFilterTab === "destino" && (
                <div className="flex flex-wrap gap-2 max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {destinations.map((dest) => (
                    <button
                      key={dest}
                      onClick={() => { setSelectedDestino(dest); setFilterOpen(false); }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedDestino === dest
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              )}

              {activeFilterTab === "preferencia" && (
                <div className="flex flex-wrap gap-2 max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {PREFERENCE_CATEGORIES.map((pref) => (
                    <button
                      key={pref}
                      onClick={() =>
                        setSelectedPreferences((prev) =>
                          prev.includes(pref)
                            ? prev.filter((p) => p !== pref)
                            : [...prev, pref]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedPreferences.includes(pref)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tours Section */}
      <main className={`max-w-7xl mx-auto px-4 md:px-8 py-4 ${(activeFilterTab === "destino" || activeFilterTab === "preferencia") && filterOpen ? "invisible pointer-events-none" : ""}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Carregando expedições...</p>
          </div>
        ) : (
          <>
            {/* Section header — only show when searching */}
            {isSearching && (
              <div className="mb-4">
                <p className="text-muted-foreground text-sm">
                  {displayedTours.length} resultado{displayedTours.length !== 1 ? "s" : ""}
                  {selectedDestino && (
                    <>
                      {" para "}
                      <span className="font-medium text-foreground">{selectedDestino}</span>
                    </>
                  )}
                  {" · "}
                  <button
                    onClick={() => { setSelectedDestino(""); setSelectedPreferences([]); }}
                    className="text-primary hover:underline"
                  >
                    Limpar filtros
                  </button>
                </p>
              </div>
            )}

            {/* Month message */}
            {!isSearching && currentMonthMessage && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <p className="text-sm leading-relaxed text-foreground">
                  {currentMonthMessage.message}
                </p>
              </div>
            )}

            {/* Tours grid */}
            {displayedTours.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  Nenhuma expedição disponível
                  {selectedMonthData ? ` em ${selectedMonthData.name}` : ""}.
                </p>
                {months.length > 0 && !isSearching && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => handleMonthChange(months[0].id)}
                  >
                    Ver próximas datas
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {displayedTours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    onReservar={handleReservar}
                    preloadedCover={getCoverImage(tour.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a0533] text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <img src={logoImage} alt="Camaleão Ecoturismo" className="h-10 w-auto mb-3 brightness-200" />
              <p className="text-white/70 text-sm leading-relaxed">
                Trilhas, cachoeiras e aventuras inesquecíveis em Alagoas e região.
                Segurança, organização e muito contato com a natureza.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/50">
                Navegação
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="/" className="hover:text-white transition-colors">Início</a></li>
                <li><a href="/sobre" className="hover:text-white transition-colors">Sobre nós</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/cliente" className="hover:text-white transition-colors">Portal do cliente</a></li>
                <li><a href="/politicas/cancelamento" className="hover:text-white transition-colors">Política de cancelamento</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/50">
                Contato
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0 opacity-60" />
                  <a href="https://wa.me/5582993649454" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    (82) 99364-9454
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0 opacity-60" />
                  <a href="mailto:contato@camaleaoecoturismo.com.br" className="hover:text-white transition-colors">
                    contato@camaleaoecoturismo.com.br
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 shrink-0 opacity-60" />
                  <a href="https://instagram.com/camaleaoecoturismo" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    @camaleaoecoturismo
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
            <p>© {new Date().getFullYear()} Camaleão Ecoturismo. Todos os direitos reservados.</p>
            <p>CNPJ: 38.778.474/0001-31</p>
          </div>
        </div>
      </footer>

      {/* Reserva Modal */}
      <ReservaModal
        isOpen={reservaModalOpen}
        onClose={() => setReservaModalOpen(false)}
        tour={tourParaReserva}
      />

      {/* Waitlist Modal */}
      <WaitlistModal
        open={waitlistModalOpen}
        onOpenChange={(open) => {
          setWaitlistModalOpen(open);
          if (!open) setWaitlistTour(null);
        }}
        tourId={waitlistTour?.id || ""}
        tourName={waitlistTour?.name || ""}
      />

      {/* Floating Contact Button */}
      <FloatingContactButton />
    </div>
  );
};

export default Index;
