import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TourCard } from "@/components/TourCard";
import { TourListItem } from "@/components/TourListItem";
import { ToursAccordionView } from "@/components/ToursAccordionView";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { TourModal } from "@/components/TourModal";
import { ReservaModal } from "@/components/ReservaModal";
import { BannerCarousel } from "@/components/BannerCarousel";
import { TopMenu } from "@/components/TopMenu";
import { ViewModeToggle, ViewMode } from "@/components/ViewModeToggle";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTours, Tour } from "@/hooks/useTours";
import { useMonthMessages } from "@/hooks/useMonthMessages";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import logoImage from "@/assets/logo.png";
import footerBanner from "@/assets/footer-banner.png";
import { Loader2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const monthNames: Record<string, string> = {
  JAN: "Janeiro",
  FEV: "Fevereiro",
  MAR: "Março",
  ABR: "Abril",
  MAI: "Maio",
  JUN: "Junho",
  JUL: "Julho",
  AGO: "Agosto",
  SET: "Setembro",
  OUT: "Outubro",
  NOV: "Novembro",
  DEZ: "Dezembro"
};
const Index = () => {
  const {
    tours,
    loading
  } = useTours();
  const {
    messages
  } = useMonthMessages();
  
  // Check if list view is enabled from settings
  const [listViewEnabled, setListViewEnabled] = useState(false);
  const [hiddenMonthYears, setHiddenMonthYears] = useState<string[]>([]); // Format: "JAN-2025"
  
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['list_view_enabled', 'hidden_month_years']);
      
      if (data) {
        const settings = data.reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string | null>);
        
        setListViewEnabled(settings['list_view_enabled'] === 'true');
        
        // Parse hidden month-years
        try {
          const parsed = settings['hidden_month_years'] ? JSON.parse(settings['hidden_month_years']) : [];
          setHiddenMonthYears(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHiddenMonthYears([]);
        }
      }
    };
    loadSettings();
  }, []);
  
  // Pre-load cover images for all tours
  const tourIds = useMemo(() => tours.map(t => t.id), [tours]);
  const { getCoverImage, loading: coverImagesLoading } = useTourCoverImages(tourIds);

  // Gerar meses dinamicamente baseado nos tours ativos, ordenados cronologicamente
  const months = useMemo(() => {
    if (!tours.length) return [];

    // Extrair mês e ano de cada tour ativo e não exclusivo (exclusivos não aparecem nos cards públicos)
    const activeTours = tours.filter(tour => tour.is_active && tour.start_date && !tour.is_exclusive);

    // Criar um mapa de mês-ano únicos com a primeira data de cada combinação
    const monthYearMap = new Map<string, {
      month: string;
      year: number;
      firstDate: Date;
    }>();
    activeTours.forEach(tour => {
      const date = new Date(tour.start_date + 'T12:00:00');
      const year = date.getFullYear();
      const month = tour.month;
      const key = `${month}-${year}`;
      
      // Skip hidden month-years (format: "JAN-2025")
      if (hiddenMonthYears.includes(key)) return;
      
      if (!monthYearMap.has(key)) {
        monthYearMap.set(key, {
          month,
          year,
          firstDate: date
        });
      }
    });

    // Converter para array e ordenar cronologicamente
    const sortedMonthYears = Array.from(monthYearMap.values()).sort((a, b) => {
      return a.firstDate.getTime() - b.firstDate.getTime();
    });

    // Verificar se há meses de anos diferentes
    const years = new Set(sortedMonthYears.map(my => my.year));
    const hasMultipleYears = years.size > 1;

    // Retornar array formatado
    return sortedMonthYears.map(({
      month,
      year
    }) => ({
      id: `${month}-${year}`,
      label: month,
      name: monthNames[month] || month,
      // Fallback to month label if name not found
      month: month,
      year: year
    }));
  }, [tours, hiddenMonthYears]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaModalOpen, setReservaModalOpen] = useState(false);
  const [tourParaReserva, setTourParaReserva] = useState<Tour | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [cardOpacities, setCardOpacities] = useState<Map<string, number>>(new Map());
  const [activatedCards, setActivatedCards] = useState<Set<string>>(new Set());
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTour, setWaitlistTour] = useState<Tour | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);
  const swipeStarted = useRef<boolean>(false);

  // Quando os tours carregarem, definir o primeiro mês disponível
  useEffect(() => {
    if (tours.length > 0 && months.length > 0 && !selectedMonth) {
      // Definir o primeiro mês disponível
      setSelectedMonth(months[0].id);
    }
  }, [tours, months, selectedMonth]);
  const filteredTours = useMemo(() => {
    // Extrair mês e ano do selectedMonth (formato: "MES-ANO" ex: "AGO-2025")
    if (!selectedMonth) return [];
    const [month, yearStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    return tours.filter(tour => {
      // Filtrar tours ativos, não exclusivos, com data válida
      if (!tour.is_active || !tour.start_date || tour.is_exclusive) return false;
      const tourDate = new Date(tour.start_date + 'T12:00:00');
      const tourYear = tourDate.getFullYear();
      return tour.month === month && tourYear === year;
    });
  }, [tours, selectedMonth]);

  // Get active message for selected month
  const currentMonthMessage = useMemo(() => {
    if (!selectedMonth) return null;
    const [month, yearStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    return messages.find(msg => msg.month === month && msg.year === year && msg.is_active);
  }, [messages, selectedMonth]);
  const selectedMonthName = useMemo(() => selectedMonth, [selectedMonth]);
  const currentMonthIndex = useMemo(() => months.findIndex(m => m.id === selectedMonth), [selectedMonth, months]);

  // Get next and previous month tours for swipe preview
  const nextMonthTours = useMemo(() => {
    const nextIndex = currentMonthIndex + 1;
    return nextIndex < months.length ? tours.filter(tour => tour.month === months[nextIndex].id && tour.is_active) : [];
  }, [currentMonthIndex, tours, months]);
  const prevMonthTours = useMemo(() => {
    const prevIndex = currentMonthIndex - 1;
    return prevIndex >= 0 ? tours.filter(tour => tour.month === months[prevIndex].id && tour.is_active) : [];
  }, [currentMonthIndex, tours, months]);

  // Observer for sticky header shadow when overlapping cards
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // When the tours section starts going under the sticky header, show shadow
      setIsScrolled(!entry.isIntersecting);
    }, {
      rootMargin: "-80px 0px 0px 0px",
      // Account for sticky header height
      threshold: 0
    });
    const toursSection = document.querySelector("[data-tours-section]");
    if (toursSection) {
      observer.observe(toursSection);
    }
    return () => observer.disconnect();
  }, []);

  // Intersection Observer for gradient opacity effect
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const newOpacities = new Map(cardOpacities);
      const newActivatedCards = new Set(activatedCards);
      entries.forEach(entry => {
        const cardId = entry.target.getAttribute("data-tour-id");
        if (cardId) {
          // If card is already activated, keep it at 100%
          if (activatedCards.has(cardId)) {
            newOpacities.set(cardId, 1);
            return;
          }
          const rect = entry.boundingClientRect;
          const windowHeight = window.innerHeight;

          // Check if card is fully visible (completely in viewport)
          const isFullyVisible = rect.top >= 0 && rect.bottom <= windowHeight;
          if (isFullyVisible) {
            // Card is fully visible, set to 100% and mark as activated
            newOpacities.set(cardId, 1);
            newActivatedCards.add(cardId);
          } else {
            // Check if card is partially visible from bottom (entering view)
            const cardBottom = rect.bottom;
            const cardTop = rect.top;

            // Only show gradient effect when card is entering from bottom
            if (cardTop < windowHeight && cardBottom > windowHeight) {
              // Card is partially visible from bottom - apply gradient effect
              // Gradient should only affect the bottom 80px (increased height)
              const gradientHeight = 80;
              const visibleFromBottom = windowHeight - cardTop;
              const opacity = Math.min(visibleFromBottom / gradientHeight, 1);
              newOpacities.set(cardId, Math.max(0.3, opacity));
            } else if (cardTop >= 0 && cardTop < windowHeight) {
              // Card is entering from bottom and partially visible
              newOpacities.set(cardId, 1);
              newActivatedCards.add(cardId);
            } else {
              // Card is not visible or already passed
              if (!activatedCards.has(cardId)) {
                newOpacities.set(cardId, 0.3);
              }
            }
          }
        }
      });
      setCardOpacities(newOpacities);
      if (newActivatedCards.size !== activatedCards.size) {
        setActivatedCards(newActivatedCards);
      }
    }, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      rootMargin: "0px"
    });

    // Observe all tour cards
    const tourCards = document.querySelectorAll("[data-tour-id]");
    tourCards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredTours, cardOpacities, activatedCards]);
  const handleMoreInfo = useCallback((tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setSelectedTour(tour);
      setModalOpen(true);
    }
  }, [tours]);
  const handleReservar = useCallback((tour: Tour) => {
    setTourParaReserva(tour);
    setReservaModalOpen(true);
  }, []);
  const handleBuy = useCallback((tourId: string) => {
    // Fallback para WhatsApp genérico
    window.open("https://wa.me/5531999999999?text=Gostaria%20de%20mais%20informações", "_blank");
  }, []);
  const handleWaitlist = useCallback((tour: Tour) => {
    setWaitlistTour(tour);
    setWaitlistModalOpen(true);
  }, []);
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // Reset card states when switching views
    setExpandedCardId(null);
    setCardOpacities(new Map());
    setActivatedCards(new Set());
  }, []);
  const monthButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const handleMonthChange = useCallback((monthId: string) => {
    setSelectedMonth(monthId);
    setCardOpacities(new Map());
    setExpandedCardId(null); // Reset expanded card when changing month

    // Centralizar o mês selecionado no container
    setTimeout(() => {
      const container = document.getElementById('months-scroll-container');
      const button = monthButtonsRef.current.get(monthId);
      if (container && button) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const scrollLeft = button.offsetLeft - containerRect.width / 2 + buttonRect.width / 2;
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }, 50);
  }, []);
  const handleToggleExpand = useCallback((tourId: string) => {
    setExpandedCardId(prev => prev === tourId ? null : tourId);
  }, []);

  // Swipe functionality with direction detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = touchStartX.current;
    touchEndY.current = touchStartY.current;
    isHorizontalSwipe.current = false;
    swipeStarted.current = false;
    setIsTransitioning(false);
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isTransitioning) return;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    const deltaX = Math.abs(touchEndX.current - touchStartX.current);
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);

    // Only start detecting swipe after minimum movement
    if (!swipeStarted.current && (deltaX > 10 || deltaY > 10)) {
      swipeStarted.current = true;
      // Determine if this is a horizontal or vertical swipe
      isHorizontalSwipe.current = deltaX > deltaY;
    }

    // Only apply offset if it's a horizontal swipe
    if (swipeStarted.current && isHorizontalSwipe.current) {
      const currentOffset = touchEndX.current - touchStartX.current;

      // Limit the offset to prevent dragging too far
      const maxOffset = 150;
      const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, currentOffset));
      setSwipeOffset(limitedOffset);

      // Prevent default scroll behavior for horizontal swipes
      e.preventDefault();
    }
  }, [isTransitioning]);
  const handleTouchEnd = useCallback(() => {
    // Only process swipe if it was determined to be horizontal
    if (!swipeStarted.current || !isHorizontalSwipe.current) {
      setSwipeOffset(0);
      return;
    }
    const swipeDistanceX = touchStartX.current - touchEndX.current;
    const swipeDistanceY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;
    setIsTransitioning(true);
    if (Math.abs(swipeDistanceX) > minSwipeDistance) {
      if (swipeDistanceX > 0) {
        // Swipe left - go to next month
        const nextIndex = currentMonthIndex + 1;
        if (nextIndex < months.length) {
          setSelectedMonth(months[nextIndex].id);
        }
      } else {
        // Swipe right - go to previous month
        const prevIndex = currentMonthIndex - 1;
        if (prevIndex >= 0) {
          setSelectedMonth(months[prevIndex].id);
        }
      }
    }

    // Reset state after transition
    setTimeout(() => {
      setSwipeOffset(0);
      setIsTransitioning(false);
      isHorizontalSwipe.current = false;
      swipeStarted.current = false;
    }, 300);
  }, [currentMonthIndex, months]);
  return <div className="min-h-screen" style={{
    backgroundColor: "#7C12D1"
  }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Top Menu */}
      <TopMenu className="border-solid border-muted-foreground border-0 bg-[#7c12d3]" />
      
      {/* Hero Section */}
      

      {/* Banner Carousel */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto bg-[#7c12d1]">
        <BannerCarousel />
      </div>

      {/* Month Selector - Sticky - Only show in grid mode or when list view is disabled */}
      {(viewMode === "grid" || !listViewEnabled) && (
        <div style={{
          backgroundColor: "#7C12D1"
        }} className={`sticky top-0 z-10 px-[3px] md:px-8 py-[15px] md:py-6 transition-shadow duration-300 ${isScrolled ? "shadow-lg" : ""}`}>
          <div className="relative flex items-center max-w-full">
            {/* Left Arrow */}
            <button onClick={() => {
              const container = document.getElementById('months-scroll-container');
              if (container) container.scrollBy({
                left: -150,
                behavior: 'smooth'
              });
            }} className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10" aria-label="Scroll left">
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Scrollable Months Container */}
            <div id="months-scroll-container" className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth" style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
              <div className="flex gap-2 md:gap-4 pb-2 px-2 min-w-max items-center sm:justify-center sm:w-full">
                {months.map((month, index) => {
                  const showYearDivider = index > 0 && month.year !== months[index - 1].year;
                  return (
                    <React.Fragment key={month.id}>
                      {showYearDivider && (
                        <div className="flex flex-col items-center mx-0.5">
                          <div className="h-4 w-[0.5px] bg-white"></div>
                          <span className="text-[8px] text-white mt-0.5 font-light tracking-tighter">{month.year}</span>
                        </div>
                      )}
                      <Button 
                        ref={el => {
                          if (el) monthButtonsRef.current.set(month.id, el);
                        }} 
                        variant={selectedMonth === month.id ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => handleMonthChange(month.id)} 
                        className={`transition-all duration-300 ease-out overflow-hidden whitespace-nowrap md:text-base md:px-6 md:py-3 md:h-auto border-white ${selectedMonth === month.id ? "bg-white text-primary hover:bg-white hover:text-primary min-w-[120px] md:min-w-[150px]" : "bg-transparent text-white hover:bg-white hover:text-primary min-w-[60px] md:min-w-[100px] group"}`}
                      >
                        <span className={`transition-all duration-300 ease-out ${selectedMonth === month.id ? "text-primary" : "text-white group-hover:text-primary"}`}>
                          {selectedMonth === month.id ? month.name.toUpperCase() : month.label}
                        </span>
                      </Button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Right Arrow */}
            <button onClick={() => {
              const container = document.getElementById('months-scroll-container');
              if (container) container.scrollBy({
                left: 150,
                behavior: 'smooth'
              });
            }} className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10" aria-label="Scroll right">
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* View Mode Toggle - Only show if list view is enabled */}
            {listViewEnabled && (
              <div className="ml-2 md:ml-4 flex-shrink-0">
                <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tours Section */}
      <div data-tours-section className="relative overflow-hidden px-4 md:px-8 pb-8 pt-6 max-w-7xl mx-auto bg-[#7c12d1]">
        {loading ? (
          <div className="text-center py-8 md:py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-16 h-16 md:w-24 md:h-24 opacity-80 animate-spin text-white" />
              <p className="text-lg md:text-xl font-medium text-primary-foreground">Carregando experiências...</p>
            </div>
          </div>
        ) : (viewMode === "list" && listViewEnabled) ? (
          /* List/Accordion View */
          <div className="bg-white rounded-lg overflow-hidden">
            {/* Toggle back to grid */}
            <div className="flex justify-end p-3 border-b border-gray-100">
              <ViewModeToggle value={viewMode} onChange={handleViewModeChange} variant="light" />
            </div>
            <ToursAccordionView
              months={months}
              tours={tours}
              onMoreInfo={handleMoreInfo}
              onReservar={handleReservar}
              onWaitlist={handleWaitlist}
            />
          </div>
        ) : (
          /* Grid View */
          <div className="transition-transform duration-200 ease-out" style={{
            transform: `translateX(${swipeOffset}px)`,
            opacity: swipeOffset === 0 ? 1 : Math.max(0.3, 1 - Math.abs(swipeOffset) / 150),
            transition: isTransitioning ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none"
          }}>
            {/* Month Message if active */}
            {currentMonthMessage && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border bg-[#7C12D1] border-primary">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-foreground border-secondary" />
                <p className="text-sm leading-relaxed text-primary-foreground">{currentMonthMessage.message}</p>
              </div>
            )}

            {filteredTours.length === 0 ? (
              <div className="text-center py-8 md:py-16">
                <p className="text-lg md:text-xl text-primary-foreground">Nenhum passeio disponível para este mês.</p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                {filteredTours.map((tour) => (
                  <div 
                    key={tour.id} 
                    data-tour-id={tour.id} 
                    className="transition-all duration-300 ease-out" 
                    style={{
                      opacity: cardOpacities.get(tour.id) || 0.3,
                      transform: "translateY(0)"
                    }}
                  >
                    <TourCard 
                      tour={tour} 
                      onMoreInfo={handleMoreInfo} 
                      onReservar={handleReservar} 
                      isExpanded={expandedCardId === tour.id} 
                      onToggleExpand={handleToggleExpand} 
                      preloadedCover={getCoverImage(tour.id)} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Next Month Tours (shown when swiping left) - Only on mobile and grid mode */}
        {viewMode === "grid" && swipeOffset < 0 && nextMonthTours.length > 0 && (
          <div className="absolute top-6 left-0 right-0 px-4 md:hidden" style={{
            transform: `translateX(${100 + swipeOffset / 150 * 100}%)`,
            opacity: Math.abs(swipeOffset) / 150,
            transition: isTransitioning ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none"
          }}>
            <div className="space-y-4">
              {nextMonthTours.map((tour) => (
                <div key={`next-${tour.id}`} className="opacity-100 transform translate-y-0">
                  <TourCard tour={tour} onMoreInfo={handleMoreInfo} onReservar={handleReservar} preloadedCover={getCoverImage(tour.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Month Tours (shown when swiping right) - Only on mobile and grid mode */}
        {viewMode === "grid" && swipeOffset > 0 && prevMonthTours.length > 0 && (
          <div className="absolute top-6 left-0 right-0 px-4 md:hidden" style={{
            transform: `translateX(${-100 + swipeOffset / 150 * 100}%)`,
            opacity: Math.abs(swipeOffset) / 150,
            transition: isTransitioning ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none"
          }}>
            <div className="space-y-4">
              {prevMonthTours.map((tour) => (
                <div key={`prev-${tour.id}`} className="opacity-100 transform translate-y-0">
                  <TourCard tour={tour} onMoreInfo={handleMoreInfo} onReservar={handleReservar} preloadedCover={getCoverImage(tour.id)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="w-full">
        
      </div>

      {/* Modal */}
      <TourModal isOpen={modalOpen} onClose={() => setModalOpen(false)} tour={selectedTour} onReservar={handleReservar} />

      {/* Reserva Modal */}
      <ReservaModal isOpen={reservaModalOpen} onClose={() => setReservaModalOpen(false)} tour={tourParaReserva} />

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
    </div>;
};
export default Index;