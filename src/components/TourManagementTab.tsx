import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Clock,
  Star,
  ChevronLeft,
  TrendingUp,
  Users,
  Plus,
  Edit,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  CreditCard,
  ArrowLeftRight,
  Search,
  Filter,
  AlertCircle,
  UserCheck,
  AlertTriangle,
  Wallet,
  LayoutGrid,
  CalendarDays,
  List,
} from "lucide-react";
import TourManagement from "@/components/TourManagement";
import ToursDashboard from "@/components/ToursDashboard";
import AtendimentoMessagesModule from "@/components/AtendimentoMessagesModule";
import TourForm from "@/components/TourForm";
import PaymentsManagement from "@/components/PaymentsManagement";
import MovimentacaoFinanceira from "@/components/MovimentacaoFinanceira";
import { BulkPaymentConfigManager } from "@/components/BulkPaymentConfigManager";
import { CatalogCalendarView } from "@/components/CatalogCalendarView";
import { CatalogAnnualView } from "@/components/CatalogAnnualView";
import { CatalogDateAnalysis } from "@/components/CatalogDateAnalysis";
import { CatalogListView } from "@/components/CatalogListView";
import { Tour } from "@/hooks/useTours";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TourParticipantStats {
  confirmed: number;
  pending: number;
}

// Interface for gallery cover images
interface TourCoverImage {
  tour_id: string;
  image_url: string;
}

interface TourManagementTabProps {
  tours: Tour[];
  onRefresh?: () => void;
  viewMode?: string;
}

const MONTHS = [
  { key: "01", name: "Janeiro", short: "Jan" },
  { key: "02", name: "Fevereiro", short: "Fev" },
  { key: "03", name: "Março", short: "Mar" },
  { key: "04", name: "Abril", short: "Abr" },
  { key: "05", name: "Maio", short: "Mai" },
  { key: "06", name: "Junho", short: "Jun" },
  { key: "07", name: "Julho", short: "Jul" },
  { key: "08", name: "Agosto", short: "Ago" },
  { key: "09", name: "Setembro", short: "Set" },
  { key: "10", name: "Outubro", short: "Out" },
  { key: "11", name: "Novembro", short: "Nov" },
  { key: "12", name: "Dezembro", short: "Dez" },
];

const TourManagementTab: React.FC<TourManagementTabProps> = ({ tours, onRefresh, viewMode = "dashboard" }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [managingTour, setManagingTour] = useState<Tour | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [showBulkPaymentConfig, setShowBulkPaymentConfig] = useState(false);
  
  // Catálogo view mode: 'cards', 'calendar', 'annual', or 'analysis'
  const [catalogViewMode, setCatalogViewMode] = useState<'cards' | 'calendar' | 'annual' | 'analysis' | 'list'>('annual');
  const [calendarStartDate, setCalendarStartDate] = useState<Date | null>(null);

  // Catálogo filters
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativos" | "inativos">("todos");
  const [filterTime, setFilterTime] = useState<"todos" | "futuros" | "passados">("todos");
  const [filterYears, setFilterYears] = useState<number[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Participantes filters (separate from Catálogo)
  const [partFilterStatus, setPartFilterStatus] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [partFilterTime, setPartFilterTime] = useState<"todos" | "futuros" | "passados">("todos");
  const [partFilterYears, setPartFilterYears] = useState<number[]>([]);
  const [partFilterMonths, setPartFilterMonths] = useState<string[]>([]);
  const [partSearchTerm, setPartSearchTerm] = useState("");

  // Participant stats per tour
  const [tourStats, setTourStats] = useState<Record<string, TourParticipantStats>>({});
  
  // Gallery cover images per tour
  const [tourCoverImages, setTourCoverImages] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Fetch participant stats for all tours
  const fetchTourStats = useCallback(async () => {
    if (tours.length === 0) return;

    const tourIds = tours.map((t) => t.id);

    const { data, error } = await supabase
      .from("reservas")
      .select("tour_id, status, payment_status, numero_participantes, valor_pago, valor_passeio")
      .in("tour_id", tourIds);

    if (error) {
      console.error("Error fetching tour stats:", error);
      return;
    }

    const stats: Record<string, TourParticipantStats> = {};
    tourIds.forEach((id) => {
      stats[id] = { confirmed: 0, pending: 0 };
    });

    data?.forEach((reserva) => {
      const participants = reserva.numero_participantes || 1;

      // Check if canceled/refunded/transferred - these should NOT count
      const isCancelado = reserva.status === "cancelado" || reserva.status === "cancelada";
      const isReembolsado = reserva.payment_status === "reembolsado" || reserva.payment_status === "reembolso_parcial";
      const isTransferido = reserva.status === "transferido";

      if (isCancelado || isReembolsado || isTransferido) {
        return; // Skip these entirely
      }

      // Count as confirmed if status is confirmed OR payment is complete
      const isConfirmed =
        reserva.status === "confirmado" || reserva.status === "confirmada" || reserva.payment_status === "pago";
      if (isConfirmed) {
        stats[reserva.tour_id].confirmed += participants;

        // "Pendentes" = confirmados que NÃO pagaram 100% do valor
        const valorPago = reserva.valor_pago || 0;
        const valorPasseio = reserva.valor_passeio || 0;
        if (valorPasseio > 0 && valorPago < valorPasseio) {
          stats[reserva.tour_id].pending += participants;
        }
      }
    });

    setTourStats(stats);
  }, [tours]);

  useEffect(() => {
    fetchTourStats();
  }, [fetchTourStats]);

  // Fetch gallery cover images for all tours
  const fetchTourCoverImages = useCallback(async () => {
    if (tours.length === 0) return;

    const tourIds = tours.map((t) => t.id);

    const { data, error } = await supabase
      .from("tour_gallery_images")
      .select("tour_id, image_url")
      .in("tour_id", tourIds)
      .eq("is_cover", true);

    if (error) {
      console.error("Error fetching tour cover images:", error);
      return;
    }

    const coverImages: Record<string, string> = {};
    data?.forEach((img) => {
      coverImages[img.tour_id] = img.image_url;
    });

    setTourCoverImages(coverImages);
  }, [tours]);

  useEffect(() => {
    fetchTourCoverImages();
  }, [fetchTourCoverImages]);

  // Real-time subscription for reservas and tours updates
  useEffect(() => {
    const reservasChannel = supabase
      .channel('tour-management-reservas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas'
        },
        () => {
          console.log('TourManagementTab: Reservas updated, refetching stats...');
          fetchTourStats();
        }
      )
      .subscribe();

    const toursChannel = supabase
      .channel('tour-management-tours-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours'
        },
        () => {
          console.log('TourManagementTab: Tours updated, calling onRefresh...');
          onRefresh?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservasChannel);
      supabase.removeChannel(toursChannel);
    };
  }, [fetchTourStats, onRefresh]);

  // Get all available years from tours
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    tours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [tours]);

  // Set current year as default
  React.useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else {
        setSelectedYear(availableYears[0]);
      }
    }
  }, [availableYears, selectedYear]);

  // Reset form/management state when viewMode changes
  React.useEffect(() => {
    setShowForm(false);
    setEditingTour(null);
    setManagingTour(null);
    setShowBulkPaymentConfig(false);
  }, [viewMode]);

  // Get tours count per month for the selected year
  const toursByMonth = useMemo(() => {
    if (!selectedYear) return {};
    const result: Record<string, Tour[]> = {};
    tours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      if (date.getFullYear() === selectedYear) {
        const monthKey = String(date.getMonth() + 1).padStart(2, "0");
        if (!result[monthKey]) {
          result[monthKey] = [];
        }
        result[monthKey].push(tour);
      }
    });

    Object.keys(result).forEach((month) => {
      result[month].sort((a, b) => new Date(a.start_date + "T12:00:00").getTime() - new Date(b.start_date + "T12:00:00").getTime());
    });
    return result;
  }, [tours, selectedYear]);

  // Get tours for selected month
  const selectedMonthTours = useMemo(() => {
    if (!selectedMonth) return [];
    return toursByMonth[selectedMonth] || [];
  }, [toursByMonth, selectedMonth]);

  // Get total tours for selected year
  const totalToursInYear = useMemo(() => {
    return Object.values(toursByMonth).reduce((acc, monthTours) => acc + monthTours.length, 0);
  }, [toursByMonth]);

  // Get months with tours
  const monthsWithTours = useMemo(() => {
    return MONTHS.filter((month) => (toursByMonth[month.key] || []).length > 0);
  }, [toursByMonth]);

  // Format date range
  const formatDateRange = (tour: Tour) => {
    const startDate = new Date(tour.start_date + "T12:00:00");
    const formattedStart = startDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const endDate = new Date(tour.end_date + "T12:00:00");
      const formattedEnd = endDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      return `${formattedStart} - ${formattedEnd}`;
    }
    return formattedStart;
  };

  // Calculate days until tour
  const getDaysUntil = (tour: Tour) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tourDate = tour.start_date; // already YYYY-MM-DD
    if (todayStr === tourDate) return 0;
    const todayMs = new Date(todayStr + "T12:00:00").getTime();
    const tourMs = new Date(tourDate + "T12:00:00").getTime();
    const diffDays = Math.round((tourMs - todayMs) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Navigate to previous/next year
  const navigateYear = (direction: "prev" | "next") => {
    if (!selectedYear) return;
    const currentIndex = availableYears.indexOf(selectedYear);
    if (direction === "prev" && currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
      setSelectedMonth(null);
    } else if (direction === "next" && currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1]);
      setSelectedMonth(null);
    }
  };

  // Tour actions
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este passeio?")) return;
    try {
      const { error } = await supabase.from("tours").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Passeio excluído com sucesso!" });
      onRefresh?.();
    } catch (error) {
      toast({ title: "Erro ao excluir passeio", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("tours").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      toast({ title: !currentStatus ? "Passeio ativado!" : "Passeio desativado!" });
      onRefresh?.();
    } catch (error) {
      toast({ title: "Erro ao alterar status do passeio", variant: "destructive" });
    }
  };

  const handleDuplicate = async (tour: Tour) => {
    try {
      const tourCopy = {
        name: `${tour.name} (Cópia)`,
        city: tour.city,
        state: tour.state,
        start_date: tour.start_date,
        end_date: tour.end_date,
        image_url: tour.image_url,
        month: tour.month,
        about: tour.about,
        itinerary: tour.itinerary,
        includes: tour.includes,
        not_includes: tour.not_includes,
        departures: tour.departures,
        what_to_bring: tour.what_to_bring,
        policy: tour.policy,
        pdf_file_path: tour.pdf_file_path,
        buy_url: tour.buy_url,
        link_pagamento: tour.link_pagamento,
        etiqueta: tour.etiqueta,
        is_active: false,
        is_exclusive: tour.is_exclusive,
        pro_labore: tour.pro_labore || 0,
        gastos_viagem: tour.gastos_viagem || 0,
        gastos_manutencao: tour.gastos_manutencao || 0,
        imposto_renda: tour.imposto_renda || 0,
        valor_padrao: tour.valor_padrao || 0,
      };

      const { data: newTour, error: tourError } = await supabase.from("tours").insert(tourCopy).select().single();
      if (tourError) throw tourError;

      // Copy pricing options
      if (tour.pricing_options && tour.pricing_options.length > 0) {
        const pricingOptionsCopy = tour.pricing_options.map((option) => ({
          tour_id: newTour.id,
          option_name: option.option_name,
          description: option.description,
          pix_price: option.pix_price,
          card_price: option.card_price,
        }));
        await supabase.from("tour_pricing_options").insert(pricingOptionsCopy);
      }

      // Copy boarding points
      const { data: boardingPoints } = await supabase.from("tour_boarding_points").select("*").eq("tour_id", tour.id);
      if (boardingPoints && boardingPoints.length > 0) {
        const boardingPointsCopy = boardingPoints.map((point) => ({
          tour_id: newTour.id,
          nome: point.nome,
          endereco: point.endereco,
          order_index: point.order_index,
        }));
        await supabase.from("tour_boarding_points").insert(boardingPointsCopy);
      }

      // Questions are now global, no need to copy per-tour questions

      toast({
        title: "Passeio duplicado com sucesso!",
        description: "O passeio foi criado como inativo.",
      });
      onRefresh?.();
    } catch (error) {
      console.error("Error duplicating tour:", error);
      toast({ title: "Erro ao duplicar passeio", variant: "destructive" });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTour(null);
    onRefresh?.();
  };

  // ============ CATÁLOGO FILTERS ============

  // Get available years from tours for Catálogo filter
  const availableYearsForCatalogo = useMemo(() => {
    const yearsMap = new Map<number, number>();
    tours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      const year = date.getFullYear();
      yearsMap.set(year, (yearsMap.get(year) || 0) + 1);
    });
    return Array.from(yearsMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year);
  }, [tours]);

  // Toggle year filter
  const toggleYearFilter = (year: number) => {
    setFilterYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  // Get available months from tours for Catálogo filter (filtered by selected years)
  const availableMonthsForCatalogo = useMemo(() => {
    const monthsSet = new Map<string, { key: string; name: string; short: string; count: number }>();
    tours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      const year = date.getFullYear();

      if (filterYears.length > 0 && !filterYears.includes(year)) {
        return;
      }

      const monthKey = String(date.getMonth() + 1).padStart(2, "0");
      const monthData = MONTHS.find((m) => m.key === monthKey);
      if (monthData) {
        if (monthsSet.has(monthKey)) {
          monthsSet.get(monthKey)!.count++;
        } else {
          monthsSet.set(monthKey, { ...monthData, count: 1 });
        }
      }
    });
    return Array.from(monthsSet.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [tours, filterYears]);

  // Toggle month filter
  const toggleMonthFilter = (monthKey: string) => {
    setFilterMonths((prev) => (prev.includes(monthKey) ? prev.filter((m) => m !== monthKey) : [...prev, monthKey]));
  };

  // Filtered and sorted tours for Catálogo
  const filteredCatalogoTours = useMemo(() => {
    let result = [...tours];

    if (filterStatus === "ativos") {
      result = result.filter((t) => t.is_active);
    } else if (filterStatus === "inativos") {
      result = result.filter((t) => !t.is_active);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (filterTime === "futuros") {
      result = result.filter((t) => new Date(t.start_date + "T12:00:00") >= today);
    } else if (filterTime === "passados") {
      result = result.filter((t) => new Date(t.start_date + "T12:00:00") < today);
    }

    if (filterYears.length > 0) {
      result = result.filter((t) => {
        const date = new Date(t.start_date + "T12:00:00");
        return filterYears.includes(date.getFullYear());
      });
    }

    if (filterMonths.length > 0) {
      result = result.filter((t) => {
        const date = new Date(t.start_date + "T12:00:00");
        const monthKey = String(date.getMonth() + 1).padStart(2, "0");
        return filterMonths.includes(monthKey);
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(term) || t.city.toLowerCase().includes(term));
    }

    result.sort((a, b) => new Date(b.start_date + "T12:00:00").getTime() - new Date(a.start_date + "T12:00:00").getTime());

    return result;
  }, [tours, filterStatus, filterTime, filterYears, filterMonths, searchTerm]);

  // ============ PARTICIPANTES FILTERS ============

  // Get available years for Participantes filter
  const availableYearsForPart = useMemo(() => {
    const yearsMap = new Map<number, number>();
    let filteredTours = [...tours];

    if (partFilterStatus === "ativos") {
      filteredTours = filteredTours.filter((t) => t.is_active);
    } else if (partFilterStatus === "inativos") {
      filteredTours = filteredTours.filter((t) => !t.is_active);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (partFilterTime === "futuros") {
      filteredTours = filteredTours.filter((t) => new Date(t.start_date + "T12:00:00") >= today);
    } else if (partFilterTime === "passados") {
      filteredTours = filteredTours.filter((t) => new Date(t.start_date + "T12:00:00") < today);
    }

    filteredTours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      const year = date.getFullYear();
      yearsMap.set(year, (yearsMap.get(year) || 0) + 1);
    });
    return Array.from(yearsMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year);
  }, [tours, partFilterStatus, partFilterTime]);

  // Toggle year filter for Participantes
  const togglePartYearFilter = (year: number) => {
    setPartFilterYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  // Get available months for Participantes filter (filtered by selected years)
  const availableMonthsForPart = useMemo(() => {
    const monthsSet = new Map<string, { key: string; name: string; short: string; count: number }>();
    let filteredTours = [...tours];

    if (partFilterStatus === "ativos") {
      filteredTours = filteredTours.filter((t) => t.is_active);
    } else if (partFilterStatus === "inativos") {
      filteredTours = filteredTours.filter((t) => !t.is_active);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (partFilterTime === "futuros") {
      filteredTours = filteredTours.filter((t) => new Date(t.start_date + "T12:00:00") >= today);
    } else if (partFilterTime === "passados") {
      filteredTours = filteredTours.filter((t) => new Date(t.start_date + "T12:00:00") < today);
    }

    filteredTours.forEach((tour) => {
      const date = new Date(tour.start_date + "T12:00:00");
      const year = date.getFullYear();

      if (partFilterYears.length > 0 && !partFilterYears.includes(year)) {
        return;
      }

      const monthKey = String(date.getMonth() + 1).padStart(2, "0");
      const monthData = MONTHS.find((m) => m.key === monthKey);
      if (monthData) {
        if (monthsSet.has(monthKey)) {
          monthsSet.get(monthKey)!.count++;
        } else {
          monthsSet.set(monthKey, { ...monthData, count: 1 });
        }
      }
    });
    return Array.from(monthsSet.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [tours, partFilterStatus, partFilterTime, partFilterYears]);

  // Toggle month filter for Participantes
  const togglePartMonthFilter = (monthKey: string) => {
    setPartFilterMonths((prev) => (prev.includes(monthKey) ? prev.filter((m) => m !== monthKey) : [...prev, monthKey]));
  };

  // Filtered tours for Participantes
  const filteredPartTours = useMemo(() => {
    let result = [...tours];

    if (partFilterStatus === "ativos") {
      result = result.filter((t) => t.is_active);
    } else if (partFilterStatus === "inativos") {
      result = result.filter((t) => !t.is_active);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (partFilterTime === "futuros") {
      result = result.filter((t) => new Date(t.start_date + "T12:00:00") >= today);
    } else if (partFilterTime === "passados") {
      result = result.filter((t) => new Date(t.start_date + "T12:00:00") < today);
    }

    if (partFilterYears.length > 0) {
      result = result.filter((t) => {
        const date = new Date(t.start_date + "T12:00:00");
        return partFilterYears.includes(date.getFullYear());
      });
    }

    if (partFilterMonths.length > 0) {
      result = result.filter((t) => {
        const date = new Date(t.start_date + "T12:00:00");
        const monthKey = String(date.getMonth() + 1).padStart(2, "0");
        return partFilterMonths.includes(monthKey);
      });
    }

    if (partSearchTerm.trim()) {
      const term = partSearchTerm.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(term) || t.city.toLowerCase().includes(term));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.start_date + "T12:00:00");
      const dateB = new Date(b.start_date + "T12:00:00");
      const isFutureA = dateA >= today;
      const isFutureB = dateB >= today;

      if (isFutureA && !isFutureB) return -1;
      if (!isFutureA && isFutureB) return 1;

      if (isFutureA && isFutureB) {
        return dateA.getTime() - dateB.getTime();
      }

      return dateB.getTime() - dateA.getTime();
    });

    return result;
  }, [tours, partFilterStatus, partFilterTime, partFilterYears, partFilterMonths, partSearchTerm]);

  // If showing form, render it
  if (showForm) {
    return (
      <TourForm
        tour={editingTour}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setEditingTour(null);
        }}
      />
    );
  }

  // If managing a tour, show the TourManagement component
  if (managingTour) {
    return (
      <TourManagement
        tour={managingTour}
        onBack={() => setManagingTour(null)}
        onTourUpdated={onRefresh}
      />
    );
  }

  // If showing bulk payment config, render it
  if (showBulkPaymentConfig) {
    return (
      <BulkPaymentConfigManager
        tours={tours}
        onBack={() => setShowBulkPaymentConfig(false)}
        onRefresh={onRefresh}
      />
    );
  }

  // Render content based on viewMode
  const renderViewContent = () => {
    switch (viewMode) {
      case "dashboard":
        return <ToursDashboard tours={tours} />;
      case "pagamentos":
        return <PaymentsManagement />;
      case "movimentacao":
        return <MovimentacaoFinanceira />;
      case "atendimento":
        return <AtendimentoMessagesModule />;
      case "participantes":
        return renderParticipantesView();
      case "catalogo":
        return renderCatalogoView();
      case "gerenciar":
      default:
        return renderParticipantesView();
    }
  };

  // View for Participantes - focused on selecting tour and managing participants
  const renderParticipantesView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Gerenciar Participantes</h2>
      </div>

      {/* Filters Section */}
      <Card className="bg-gray-50/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar passeio..."
                value={partSearchTerm}
                onChange={(e) => setPartSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">Status:</span>
              <div className="flex bg-white rounded-lg border p-1 gap-1">
                <button
                  onClick={() => setPartFilterStatus("todos")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterStatus === "todos" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setPartFilterStatus("ativos")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterStatus === "ativos" ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setPartFilterStatus("inativos")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterStatus === "inativos" ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Inativos
                </button>
              </div>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">Período:</span>
              <div className="flex bg-white rounded-lg border p-1 gap-1">
                <button
                  onClick={() => setPartFilterTime("todos")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterTime === "todos" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setPartFilterTime("futuros")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterTime === "futuros" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Futuros
                </button>
                <button
                  onClick={() => setPartFilterTime("passados")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    partFilterTime === "passados" ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Passados
                </button>
              </div>
            </div>
          </div>

          {/* Year and Month Filters - Visual Chips */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Year Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500 font-medium">Anos:</span>
                <div className="flex flex-wrap gap-2">
                  {availableYearsForPart.map(({ year, count }) => {
                    const isSelected = partFilterYears.includes(year);
                    return (
                      <button
                        key={year}
                        onClick={() => togglePartYearFilter(year)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          flex items-center gap-1.5 border
                          ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                          }
                        `}
                      >
                        {year}
                        <span
                          className={`
                          text-xs px-1.5 py-0.5 rounded-full
                          ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
                        `}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {partFilterYears.length > 0 && (
                  <button
                    onClick={() => setPartFilterYears([])}
                    className="text-xs text-gray-400 hover:text-blue-600 underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              {/* Month Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500 font-medium">Meses:</span>
                <div className="flex flex-wrap gap-2">
                  {availableMonthsForPart.map((month) => {
                    const isSelected = partFilterMonths.includes(month.key);
                    return (
                      <button
                        key={month.key}
                        onClick={() => togglePartMonthFilter(month.key)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          flex items-center gap-1.5 border
                          ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-primary/5"
                          }
                        `}
                      >
                        {month.short}
                        <span
                          className={`
                          text-xs px-1.5 py-0.5 rounded-full
                          ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
                        `}
                        >
                          {month.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {partFilterMonths.length > 0 && (
                  <button
                    onClick={() => setPartFilterMonths([])}
                    className="text-xs text-gray-400 hover:text-primary underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
            <Badge variant="secondary" className="bg-white">
              {filteredPartTours.length}{" "}
              {filteredPartTours.length === 1 ? "passeio encontrado" : "passeios encontrados"}
            </Badge>
            {(partFilterStatus !== "ativos" ||
              partFilterTime !== "todos" ||
              partFilterYears.length > 0 ||
              partFilterMonths.length > 0 ||
              partSearchTerm) && (
              <button
                onClick={() => {
                  setPartFilterStatus("ativos");
                  setPartFilterTime("todos");
                  setPartFilterYears([]);
                  setPartFilterMonths([]);
                  setPartSearchTerm("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tours Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPartTours.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {tours.length === 0
                  ? "Nenhum passeio cadastrado."
                  : "Nenhum passeio corresponde aos filtros selecionados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPartTours.map((tour) => {
            const daysUntil = getDaysUntil(tour);
            const isPast = daysUntil < 0;
            const isToday = daysUntil === 0;
            const isSoon = daysUntil > 0 && daysUntil <= 7;

            return (
              <Card
                key={tour.id}
                className={`
                  overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer
                  ${isPast ? "opacity-70" : ""}
                  ${isToday ? "ring-2 ring-emerald-500" : ""}
                `}
                onClick={() => setManagingTour(tour)}
              >
                {/* Tour Image */}
                <div className="h-36 bg-gray-100 relative">
                  {(tour.image_url || tourCoverImages[tour.id]) ? (
                    <img src={tourCoverImages[tour.id] || tour.image_url || ''} alt={tour.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-gray-300" />
                    </div>
                  )}

                  {/* Days Badge - Overlay */}
                  <div
                    className={`
                    absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg
                    ${isPast ? "bg-gray-600 text-white" : ""}
                    ${isToday ? "bg-emerald-500 text-white" : ""}
                    ${isSoon && !isToday ? "bg-amber-500 text-white" : ""}
                    ${!isPast && !isToday && !isSoon ? "bg-blue-500 text-white" : ""}
                  `}
                  >
                    {isPast ? "Realizado" : isToday ? "Hoje!" : `${daysUntil} dias`}
                  </div>

                  {/* Status Badge - Overlay */}
                  {tour.is_exclusive && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-teal-500/90 text-white text-xs flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Exclusivo
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Tour Info */}
                  <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">{tour.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateRange(tour)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {tour.city}
                    </span>
                  </div>

                  {/* Spots and participant stats */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {/* Vagas Ocupadas - mostra ocupadas/total */}
                    {tour.vagas !== null && tour.vagas !== undefined && tour.vagas > 0 ? (
                      (() => {
                        const confirmed = tourStats[tour.id]?.confirmed || 0;
                        const totalVagas = tour.vagas;
                        const percentage = Math.round((confirmed / totalVagas) * 100);
                        const vagasDisponiveis = Math.max(0, totalVagas - confirmed);
                        const isFull = vagasDisponiveis === 0;
                        
                        return (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isFull 
                                ? "text-red-600 border-red-300 bg-red-50" 
                                : percentage >= 80 
                                  ? "text-amber-600 border-amber-300 bg-amber-50"
                                  : "text-gray-600 border-gray-300 bg-gray-50"
                            }`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {confirmed}/{totalVagas} ({percentage}%) • {vagasDisponiveis} disponíveis
                          </Badge>
                        );
                      })()
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sem limite • {tourStats[tour.id]?.confirmed || 0} confirmados
                      </Badge>
                    )}

                    {/* Pending participants - pagamento parcial */}
                    {tourStats[tour.id]?.pending > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {tourStats[tour.id].pending} pagamentos pendentes
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingTour(tour);
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-1.5" />
                      Participantes
                    </Button>
                    {!tour.is_exclusive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/reserva/${tour.id}`;
                          navigator.clipboard.writeText(link);
                          toast({ title: "Link copiado!", description: "Link de cadastro copiado para a área de transferência." });
                        }}
                        title="Copiar link de cadastro"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // View for Catálogo - focused on tour structure management
  const renderCatalogoView = () => {
    // Handler for editing tour from calendar
    const handleEditFromCalendar = (tour: Tour) => {
      setEditingTour(tour);
      setShowForm(true);
    };

    return (
      <div className="space-y-6">
        {/* Header with View Toggle and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">Catálogo de Passeios</h2>
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <button
                onClick={() => setCatalogViewMode('annual')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  catalogViewMode === 'annual' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Anual
              </button>
              <button
                onClick={() => setCatalogViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  catalogViewMode === 'calendar' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Mensal
              </button>
              <button
                onClick={() => setCatalogViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  catalogViewMode === 'cards' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </button>
              <button
                onClick={() => setCatalogViewMode('analysis')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  catalogViewMode === 'analysis' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Análise IA
              </button>
              <button
                onClick={() => setCatalogViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  catalogViewMode === 'list' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkPaymentConfig(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Configurar Pagamentos
            </Button>
            <Button
              onClick={() => {
                setEditingTour(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Passeio
            </Button>
          </div>
        </div>

        {/* Monthly Calendar View */}
        {catalogViewMode === 'calendar' && (
          <CatalogCalendarView 
            tours={tours} 
            onEditTour={handleEditFromCalendar}
            initialDate={calendarStartDate}
          />
        )}

        {/* Annual View */}
        {catalogViewMode === 'annual' && (
          <CatalogAnnualView 
            tours={tours.map(t => ({
              id: t.id,
              nome: t.name,
              data_passeio: t.start_date,
              data_fim: t.end_date,
              ativo: t.is_active,
              isExclusive: t.is_exclusive
            }))}
            onMonthClick={(date) => {
              setCalendarStartDate(date);
              setCatalogViewMode('calendar');
            }}
          />
        )}

        {/* Analysis View */}
        {catalogViewMode === 'analysis' && (
          <CatalogDateAnalysis 
            tours={tours.map(t => ({
              id: t.id,
              nome: t.name,
              data_passeio: t.start_date,
              data_fim: t.end_date,
              ativo: t.is_active,
              isExclusive: t.is_exclusive,
              isFeatured: t.is_featured,
              cidade: t.city
            }))}
            currentYear={new Date().getFullYear()}
          />
        )}

        {/* List View */}
        {catalogViewMode === 'list' && (
          <CatalogListView 
            tours={tours.map(t => ({
              id: t.id,
              nome: t.name,
              data_passeio: t.start_date,
              data_fim: t.end_date,
              cidade: t.city,
              estado: t.state,
              ativo: t.is_active,
              isExclusive: t.is_exclusive,
              isFeatured: t.is_featured
            }))}
          />
        )}

        {/* Cards View - Filters Section */}
        {catalogViewMode === 'cards' && (
          <>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar passeio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Status:</span>
                <div className="flex bg-white rounded-lg border p-1 gap-1">
                  <button
                    onClick={() => setFilterStatus("todos")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterStatus === "todos" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterStatus("ativos")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterStatus === "ativos" ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Ativos
                  </button>
                  <button
                    onClick={() => setFilterStatus("inativos")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterStatus === "inativos" ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Inativos
                  </button>
                </div>
              </div>

              {/* Time Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Período:</span>
                <div className="flex bg-white rounded-lg border p-1 gap-1">
                  <button
                    onClick={() => setFilterTime("todos")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterTime === "todos" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterTime("futuros")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterTime === "futuros" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Futuros
                  </button>
                  <button
                    onClick={() => setFilterTime("passados")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterTime === "passados" ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Passados
                  </button>
                </div>
              </div>
            </div>

            {/* Year and Month Filters - Visual Chips */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-6 flex-wrap">
                {/* Year Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-500 font-medium">Anos:</span>
                  <div className="flex flex-wrap gap-2">
                    {availableYearsForCatalogo.map(({ year, count }) => {
                      const isSelected = filterYears.includes(year);
                      return (
                        <button
                          key={year}
                          onClick={() => toggleYearFilter(year)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            flex items-center gap-1.5 border
                            ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                            }
                          `}
                        >
                          {year}
                          <span
                            className={`
                            text-xs px-1.5 py-0.5 rounded-full
                            ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
                          `}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {filterYears.length > 0 && (
                    <button
                      onClick={() => setFilterYears([])}
                      className="text-xs text-gray-400 hover:text-blue-600 underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-200 hidden sm:block" />

                {/* Month Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-500 font-medium">Meses:</span>
                  <div className="flex flex-wrap gap-2">
                    {availableMonthsForCatalogo.map((month) => {
                      const isSelected = filterMonths.includes(month.key);
                      return (
                        <button
                          key={month.key}
                          onClick={() => toggleMonthFilter(month.key)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            flex items-center gap-1.5 border
                            ${
                              isSelected
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-primary/5"
                            }
                          `}
                        >
                          {month.short}
                          <span
                            className={`
                            text-xs px-1.5 py-0.5 rounded-full
                            ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
                          `}
                          >
                            {month.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {filterMonths.length > 0 && (
                    <button
                      onClick={() => setFilterMonths([])}
                      className="text-xs text-gray-400 hover:text-primary underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
              <Badge variant="secondary" className="bg-white">
                {filteredCatalogoTours.length}{" "}
                {filteredCatalogoTours.length === 1 ? "passeio encontrado" : "passeios encontrados"}
              </Badge>
              {(filterStatus !== "todos" ||
                filterTime !== "todos" ||
                filterYears.length > 0 ||
                filterMonths.length > 0 ||
                searchTerm) && (
                <button
                  onClick={() => {
                    setFilterStatus("todos");
                    setFilterTime("todos");
                    setFilterYears([]);
                    setFilterMonths([]);
                    setSearchTerm("");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tours Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCatalogoTours.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">
                  {tours.length === 0
                    ? "Nenhum passeio cadastrado."
                    : "Nenhum passeio corresponde aos filtros selecionados."}
                </p>
                {tours.length === 0 && (
                  <Button
                    onClick={() => {
                      setEditingTour(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Passeio
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredCatalogoTours.map((tour) => {
              const daysUntil = getDaysUntil(tour);
              const isPast = daysUntil < 0;
              const isToday = daysUntil === 0;
              const isSoon = daysUntil > 0 && daysUntil <= 7;

              return (
                <Card
                  key={tour.id}
                  className={`
                    overflow-hidden transition-all duration-200 hover:shadow-lg
                    ${isPast ? "opacity-70" : ""}
                    ${isToday ? "ring-2 ring-emerald-500" : ""}
                  `}
                >
                  {/* Tour Image - Use gallery cover if available */}
                  <div className="h-32 bg-gray-100 relative">
                    {(tourCoverImages[tour.id] || tour.image_url) ? (
                      <img 
                        src={tourCoverImages[tour.id] || tour.image_url} 
                        alt={tour.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-8 w-8 text-gray-300" />
                      </div>
                    )}

                    {/* Days Badge - Overlay */}
                    <div
                      className={`
                      absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full shadow-lg
                      ${isPast ? "bg-gray-600 text-white" : ""}
                      ${isToday ? "bg-emerald-500 text-white" : ""}
                      ${isSoon && !isToday ? "bg-amber-500 text-white" : ""}
                      ${!isPast && !isToday && !isSoon ? "bg-blue-500 text-white" : ""}
                    `}
                    >
                      {isPast ? "Realizado" : isToday ? "Hoje!" : `${daysUntil} dias`}
                    </div>

                    {/* Status Badges - Overlay */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {!tour.is_active && <Badge className="bg-gray-800/80 text-white text-[10px]">Inativo</Badge>}
                      {tour.is_exclusive && (
                        <Badge className="bg-teal-500/90 text-white text-[10px] flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          Exclusivo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-3">
                    {/* Tour Info */}
                    <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{tour.name}</h3>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateRange(tour)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tour.city}
                      </span>
                    </div>

                    {/* Action Buttons - Catálogo Focus */}
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTour(tour);
                          setShowForm(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(tour)} title="Duplicar">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={tour.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleActive(tour.id, tour.is_active)}
                        title={tour.is_active ? "Desativar" : "Ativar"}
                      >
                        {tour.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(tour.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Render content based on viewMode */}
      {renderViewContent()}
    </div>
  );
};

export default TourManagementTab;
