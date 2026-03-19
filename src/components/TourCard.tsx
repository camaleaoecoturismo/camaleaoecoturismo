import React, { memo, useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Route,
  Package,
  MapPin,
  Backpack,
  MessageCircle,
  CreditCard,
  ShoppingBag,
  Bell,
} from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { WaitlistModal } from "@/components/WaitlistModal";
import { RoteiroAccessModal } from "@/components/RoteiroAccessModal";
import { TourBoardingPointsDisplay } from "./TourBoardingPointsDisplay";
import { TourGalleryCarousel } from "./TourGalleryCarousel";
import { motion, AnimatePresence } from "framer-motion";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import DOMPurify from "dompurify";
import { PixIcon } from "@/components/icons/PixIcon";
import { supabase } from "@/integrations/supabase/client";

interface OptionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
}
const INSTALLMENT_FEES: Record<number, number> = {
  1: 4.4,
  2: 6.5,
  3: 7.5,
  4: 8.6,
  5: 9.6,
  6: 10.7,
  7: 14.4,
  8: 15.5,
  9: 16.6,
  10: 17.7,
  11: 18.9,
  12: 20.0,
};
interface TourCardProps {
  tour: Tour;
  onMoreInfo?: (tourId: string) => void;
  onReservar?: (tour: Tour) => void;
  isExpanded?: boolean;
  onToggleExpand?: (tourId: string) => void;
  preloadedCover?: {
    imageUrl: string;
    cropPosition: { x: number; y: number; scale: number };
  } | null;
}
function TourCardComponent({ tour, onMoreInfo, onReservar, isExpanded = false, onToggleExpand, preloadedCover }: TourCardProps) {
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [roteiroModalOpen, setRoteiroModalOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [simulationPrice, setSimulationPrice] = useState<number | null>(null);
  const [simulationPackageName, setSimulationPackageName] = useState<string | null>(null);
  const [optionalItems, setOptionalItems] = useState<OptionalItem[]>([]);
  const expandedContentRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const wasExpandedRef = useRef(isExpanded);

  // Fetch optional items for this tour
  useEffect(() => {
    const fetchOptionalItems = async () => {
      const { data } = await supabase
        .from('tour_optional_items')
        .select('*')
        .eq('tour_id', tour.id)
        .eq('is_active', true)
        .order('order_index');
      
      if (data) {
        setOptionalItems(data);
      }
    };

    if (isExpanded) {
      fetchOptionalItems();
    }
  }, [tour.id, isExpanded]);

  // Scroll to card top when expanding
  React.useEffect(() => {
    if (isExpanded && !wasExpandedRef.current && cardRef.current) {
      // Small delay to allow animation to start
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Use availability hook to determine if sold out
  const { availability } = useTourAvailability(tour.id);

  // Check sold out from availability, from vagas_fechadas, OR from etiqueta
  const isSoldOutFromAvailability = availability?.isSoldOut ?? false;
  const isSoldOutFromVagasFechadas = (tour as any).vagas_fechadas === true;
  const isSoldOutFromEtiqueta = tour.etiqueta === "Vagas encerradas" || tour.etiqueta === "vagas encerradas";
  const isSoldOut = isSoldOutFromAvailability || isSoldOutFromVagasFechadas || isSoldOutFromEtiqueta;
  
  // Check if tour date hasn't passed yet (for waitlist CTA)
  const tourStartDate = new Date(tour.start_date + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureTour = tourStartDate >= today;
  const showWaitlistCTA = isSoldOut && isFutureTour;
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  };
  const formatDateBadge = () => {
    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const dayNamesFull = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
    ];
    const dayNamesAbbr = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const startDate = new Date(tour.start_date + "T12:00:00");
    const month = monthNames[startDate.getMonth()];
    const startDay = startDate.getDate();
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const endDate = new Date(tour.end_date + "T12:00:00");
      const endDay = endDate.getDate();
      const startDayName = dayNamesAbbr[startDate.getDay()];
      const endDayName = dayNamesAbbr[endDate.getDay()];

      // Calculate number of days
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Use "e" for 2 days, "à" for 3+ days
      const connector = diffDays === 2 ? "e" : "à";
      return {
        month,
        days: `${startDay} ${connector} ${endDay}`,
        weekDays: `${startDayName} ${connector} ${endDayName}`,
      };
    }
    return {
      month,
      days: String(startDay),
      weekDays: dayNamesFull[startDate.getDay()],
    };
  };
  const formatTourDate = () => {
    const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const startDate = new Date(tour.start_date + "T12:00:00");
    const startFormatted = `${startDate.getDate()} de ${monthNames[startDate.getMonth()]}`;
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const endDate = new Date(tour.end_date + "T12:00:00");
      const endFormatted = `${endDate.getDate()} de ${monthNames[endDate.getMonth()]}`;
      return `${startFormatted} a ${endFormatted}`;
    }
    return startFormatted;
  };
  const calculateDaysOfWeek = () => {
    const dayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const startDate = new Date(tour.start_date + "T12:00:00");
      const endDate = new Date(tour.end_date + "T12:00:00");
      return `de ${dayNames[startDate.getDay()]} a ${dayNames[endDate.getDay()]}`;
    } else {
      const singleDate = new Date(tour.start_date + "T12:00:00");
      return dayNames[singleDate.getDay()];
    }
  };
  const dateInfo = formatDateBadge();
  const formattedDate = {
    dateNumber: formatTourDate(),
    dayOfWeek: calculateDaysOfWeek(),
  };
  const defaultPricing =
    tour.pricing_options?.length > 0
      ? tour.pricing_options.reduce((min, option) => (option.pix_price < min.pix_price ? option : min))
      : {
          pix_price: 0,
          card_price: 0,
          option_name: "Padrão",
        };
  const basePrice = defaultPricing.pix_price;
  const pixDiscountPercent = (tour as any).pix_discount_percent || 0;
  const pixPriceWithDiscount = basePrice * (1 - pixDiscountPercent / 100);
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target;
    const elementTarget = target instanceof Element ? target : null;

    // Quando expandido: só fecha/abre se clicar no cabeçalho (imagem/título)
    if (isExpanded && !elementTarget?.closest('[data-tourcard-toggle="true"]')) return;

    // Se o clique foi dentro do conteúdo expandido (abas/embarques/scroll), não fechar o card
    if (target instanceof Node && expandedContentRef.current?.contains(target)) return;
    if (elementTarget?.closest('[data-tourcard-interactive="true"]')) return;
    if (onToggleExpand) {
      onToggleExpand(tour.id);
    }
  };
  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) {
      setWaitlistModalOpen(true);
      return;
    }
    if (onReservar) {
      onReservar(tour);
    }
  };
  const handleOpenPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tour.pdf_file_path) return;
    // Open the roteiro access modal instead of directly opening the PDF
    setRoteiroModalOpen(true);
  };
  return (
    <>
      <Card
        ref={cardRef}
        className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl bg-card ${tour.is_featured ? "ring-2 ring-yellow-400 ring-offset-2 shadow-[0_0_20px_rgba(250,204,21,0.4)]" : "border-0"}`}
        onClick={handleCardClick}
      >
        {/* Image Container with Gallery Carousel */}
        <div data-tourcard-toggle="true" className={`relative ${isSoldOut ? "opacity-70" : ""}`}>
          <TourGalleryCarousel
            tourId={tour.id}
            coverImage={tour.image_url}
            tourName={tour.name}
            isSoldOut={isSoldOut}
            onImageClick={() => onToggleExpand?.(tour.id)}
            isExpanded={isExpanded}
            preloadedCover={preloadedCover}
          />

          {/* Date Badge */}
          <div className="absolute -bottom-5 right-3 bg-primary text-primary-foreground px-4 py-2 rounded-md text-center min-w-[70px] shadow-lg z-10">
            <div className="text-xs font-medium leading-tight">{dateInfo.month}</div>
            <div className="text-base font-bold leading-tight">{dateInfo.days}</div>
            <div className="text-[10px] font-normal leading-tight opacity-90">{dateInfo.weekDays}</div>
          </div>

          {/* Sold Out Badge */}
          {isSoldOut && (
            <div className="absolute top-3 left-3 text-destructive-foreground px-2.5 py-1 rounded-md text-xs font-semibold shadow-lg z-10 bg-red-500">
              Vagas encerradas
            </div>
          )}

          {/* Featured Badge */}
          {tour.is_featured && !isSoldOut && (
            <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-md text-xs font-bold shadow-lg z-10 flex items-center gap-1">
              ⭐ Destaque
            </div>
          )}

          {/* Other Labels (Últimas vagas, etc) */}
          {tour.etiqueta && !isSoldOut && !tour.is_featured && tour.etiqueta !== "Histórico" && (
            <div className="absolute top-3 left-3 bg-orange-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-lg z-10">
              {tour.etiqueta}
            </div>
          )}
        </div>

        {/* Info Container - Minimal */}
        <div data-tourcard-toggle="true" className="p-3">
          <div className={isSoldOut ? "opacity-70" : ""}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
              {tour.city}, {tour.state}
            </p>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-primary text-base leading-tight line-clamp-2 flex-1">{tour.name}</h3>
              <div className="text-primary shrink-0 mt-0.5 flex items-center gap-1">
                {!isExpanded && <span className="text-[10px] text-muted-foreground">ver mais</span>}
                {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </div>
            </div>
          </div>
          
          {/* Waitlist CTA for sold out future tours - outside opacity wrapper */}
          {showWaitlistCTA && !isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setWaitlistModalOpen(true);
              }}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-3 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
            >
              <Bell className="w-4 h-4" />
              <span>Quero ser avisado se surgir vaga!</span>
            </button>
          )}
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="overflow-hidden"
            >
              <div ref={expandedContentRef} data-tourcard-interactive="true" className="px-3 pb-3 space-y-3">
                {/* Tabs do conteúdo */}
                <Tabs defaultValue="about" className="w-full" onClick={(e) => e.stopPropagation()}>
                  <TabsList className="grid grid-cols-3 gap-0.5 h-auto p-0.5 bg-muted rounded-lg mb-2">
                    <TabsTrigger
                      value="about"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Sobre
                    </TabsTrigger>
                    <TabsTrigger
                      value="itinerary"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Resumo
                    </TabsTrigger>
                    <TabsTrigger
                      value="includes"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Incluso
                    </TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-3 gap-0.5 h-auto p-0.5 bg-muted rounded-lg mb-2">
                    <TabsTrigger
                      value="departures"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Embarques
                    </TabsTrigger>
                    <TabsTrigger
                      value="bring"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Levar
                    </TabsTrigger>
                    <TabsTrigger
                      value="payment"
                      className="text-xs py-1.5 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium rounded"
                    >
                      Pacotes
                    </TabsTrigger>
                  </TabsList>

                  <div className="max-h-52 overflow-y-auto">
                    <TabsContent
                      value="about"
                      className="mt-0 text-[11px] text-foreground leading-relaxed [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5"
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(tour.about || "Informações sobre o passeio não disponíveis.", {
                            ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li"],
                            ALLOWED_ATTR: ["href", "target", "rel"],
                          }),
                        }}
                      />
                    </TabsContent>

                    <TabsContent
                      value="itinerary"
                      className="mt-0 text-[11px] text-foreground leading-relaxed [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5"
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(tour.itinerary || "Itinerário não disponível.", {
                            ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li"],
                            ALLOWED_ATTR: ["href", "target", "rel"],
                          }),
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="includes" className="mt-0 space-y-2">
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-white text-[10px]">✓</span>
                          </div>
                          <span className="text-green-700 dark:text-green-400 font-semibold text-[11px]">Incluso</span>
                        </div>
                        <div
                          className="text-[11px] text-foreground leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(tour.includes || "Não informado.", {
                              ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
                              ALLOWED_ATTR: [],
                            }),
                          }}
                        />
                      </div>
                      {tour.not_includes && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-[10px]">✕</span>
                            </div>
                            <span className="text-red-700 dark:text-red-400 font-semibold text-[11px]">
                              Não incluso
                            </span>
                          </div>
                          <div
                            className="text-[11px] text-foreground leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(tour.not_includes, {
                                ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
                                ALLOWED_ATTR: [],
                              }),
                            }}
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="departures" className="mt-0" tabIndex={-1} onFocus={(e) => e.preventDefault()}>
                      <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
                    </TabsContent>

                    <TabsContent
                      value="bring"
                      className="mt-0 text-[11px] text-foreground leading-relaxed [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5"
                    >
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Backpack className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                            O que levar
                          </span>
                        </div>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(tour.what_to_bring || "Informações não disponíveis.", {
                              ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
                              ALLOWED_ATTR: [],
                            }),
                          }}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="payment" className="mt-0 space-y-3">
                      {tour.pricing_options && tour.pricing_options.length > 0 ? (
                        <div className="space-y-3">
                          {tour.pricing_options.map((option, index) => {
                            // Fatores multiplicadores para parcelamento
                            const fatoresMultiplicadores: Record<number, number> = {
                              1: 1.0438,
                              2: 1.0648,
                              3: 1.0754,
                              4: 1.0859,
                              5: 1.0965,
                              6: 1.1071,
                              7: 1.144,
                              8: 1.155,
                              9: 1.1662,
                              10: 1.1773,
                              11: 1.1886,
                              12: 1.1999,
                            };
                            const valorTotal12x = option.pix_price * fatoresMultiplicadores[12];
                            const valor12x = valorTotal12x / 12;
                            return (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-2.5">
                                {/* Header do pacote */}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Package className="w-3.5 h-3.5 text-purple-500" />
                                  <span className="font-semibold text-foreground text-xs">{option.option_name}</span>
                                </div>

                                {option.description && (
                                  <p className="text-[9px] text-muted-foreground mb-2 leading-tight">
                                    {option.description}
                                  </p>
                                )}

                                {/* Preços lado a lado */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  {/* PIX */}
                                  <div className="bg-green-50/70 rounded-md p-1.5 px-0 py-[10px]">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                      <PixIcon size={10} />
                                      <span className="text-[8px] font-medium uppercase text-green-600">PIX</span>
                                    </div>
                                    <p className="text-xs font-bold text-green-600 text-center">
                                      {formatCurrency(option.pix_price)}
                                    </p>
                                  </div>

                                  {/* Cartão */}
                                  <div className="bg-blue-50/70 rounded-md p-1.5">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                      <CreditCard className="w-2.5 h-2.5 text-blue-500" />
                                      <span className="text-[8px] font-medium uppercase text-blue-600">CARTÃO</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-blue-600 text-center">
                                      até 12x {formatCurrency(valor12x)}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSimulationPrice(option.pix_price);
                                        setSimulationPackageName(option.option_name);
                                        setSimulationModalOpen(true);
                                      }}
                                      className="text-[8px] text-blue-400 hover:text-blue-600 underline underline-offset-1 mt-0.5 block mx-auto"
                                    >
                                      ver simulação
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Preço único</p>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(pixPriceWithDiscount)}
                          </span>
                          <span className="text-[10px] ml-1 text-green-600 dark:text-green-400">no PIX</span>
                        </div>
                      )}

                      {/* Opcionais específicos do passeio */}
                      {optionalItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                            <span className="font-semibold text-foreground text-xs">Opcionais</span>
                            <span className="text-[9px] text-muted-foreground">(contratar à parte)</span>
                          </div>
                          <div className="space-y-2">
                            {optionalItems.map((item) => (
                              <div 
                                key={item.id} 
                                className="bg-orange-50/50 border border-orange-200/50 rounded-lg p-2 flex gap-2"
                              >
                                {item.image_url && (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-md shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-medium text-foreground text-[11px] leading-tight">
                                      {item.name}
                                    </span>
                                    <span className="text-xs font-bold text-orange-600 shrink-0">
                                      {formatCurrency(item.price)}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>

                {/* Preço */}
                <div className="text-center border-t pt-3">
                  {pixDiscountPercent > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <span className="text-[11px] text-muted-foreground line-through">
                        {formatCurrency(basePrice)}
                      </span>
                      <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                        -{pixDiscountPercent}%
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mb-0.5">A partir de</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-2xl font-black text-green-600">{formatCurrency(pixPriceWithDiscount)}</span>
                    <div className="flex items-center gap-1">
                      <PixIcon size={14} />
                      <span className="text-[10px] font-semibold text-green-600 uppercase">PIX</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimulationPrice(null);
                      setSimulationPackageName(null);
                      setSimulationModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-medium mt-1.5"
                  >
                    <CreditCard className="w-3 h-3" />
                    ou até 12x no cartão · <span className="underline underline-offset-2">ver simulação</span>
                  </button>
                </div>

                {/* Botões - Roteiro, Falar com atendente e Reservar */}
                <div className="flex gap-1 pt-1">
                  {tour.pdf_file_path && (
                    <Button
                      variant="purple"
                      size="sm"
                      onClick={handleOpenPdf}
                      className="flex-1 px-2 text-[10px] min-w-0 text-primary-foreground bg-primary hover:bg-primary/90"
                    >
                      <FileText className="w-3 h-3 mr-0.5 shrink-0" />
                      <span className="truncate">Roteiro</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const message = `Olá! Gostaria de mais informações sobre o passeio: ${tour.name}`;
                      window.open(`https://wa.me/5582993649454?text=${encodeURIComponent(message)}`, "_blank");
                    }}
                    className="flex-1 px-2 text-[10px] min-w-0 border-green-500 text-green-600 bg-green-50 hover:bg-green-100"
                  >
                    <svg className="w-3 h-3 mr-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.984 3.687" />
                    </svg>
                    <span className="truncate">Atendente</span>
                  </Button>

                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleReserve}
                    className="flex-1 px-2 text-[10px] min-w-0 bg-lime-600 hover:bg-lime-500"
                  >
                    <ShoppingCart className="w-3 h-3 mr-0.5 shrink-0" />
                    <span className="truncate">{isSoldOut ? "Lista de espera" : "Reservar"}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Waitlist Modal */}
      <WaitlistModal
        open={waitlistModalOpen}
        onOpenChange={setWaitlistModalOpen}
        tourId={tour.id}
        tourName={tour.name}
      />

      {/* Roteiro Access Modal */}
      {tour.pdf_file_path && (
        <RoteiroAccessModal
          open={roteiroModalOpen}
          onOpenChange={setRoteiroModalOpen}
          tourId={tour.id}
          tourName={tour.name}
          pdfFilePath={tour.pdf_file_path}
        />
      )}

      {/* Simulation Modal */}
      <Dialog open={simulationModalOpen} onOpenChange={setSimulationModalOpen}>
        <DialogContent className="max-w-xs w-[90vw] p-0 overflow-hidden rounded-xl">
          <div className="bg-primary text-primary-foreground p-3">
            <h3 className="font-semibold text-sm">Simulação de Parcelamento</h3>
            <p className="text-primary-foreground/80 text-xs truncate">
              {simulationPackageName ? `${tour.name} - ${simulationPackageName}` : tour.name}
            </p>
          </div>
          <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => {
              const fee = INSTALLMENT_FEES[installment];
              const priceToSimulate = simulationPrice ?? basePrice;
              const totalWithFee = priceToSimulate * (1 + fee / 100);
              const installmentAmount = totalWithFee / installment;
              const isNoFee = installment === 1;
              return (
                <div
                  key={installment}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-md text-xs ${isNoFee ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}
                >
                  <span className="font-medium text-foreground w-10">{installment}x</span>
                  <span className="text-foreground flex-1 text-center">{formatCurrency(installmentAmount)}</span>
                  <span className={`font-semibold text-right w-20 ${isNoFee ? "text-green-600" : "text-foreground"}`}>
                    {formatCurrency(totalWithFee)}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export const TourCard = memo(TourCardComponent);
