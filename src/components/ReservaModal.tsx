import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tour } from "@/hooks/useTours";
import { validarCPF, validarTelefone, formatarCPF, formatarTelefone, cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar,
  ArrowLeft,
  FileText,
  X,
  MessageCircle,
  Loader2,
  Plus,
  Minus,
  Copy,
  RefreshCw,
  CheckCircle,
  CreditCard,
  ShoppingCart,
  Tag,
  Gift,
  AlertTriangle,
  ZoomIn,
} from "lucide-react";
import { PixIcon } from "@/components/icons/PixIcon";
import { TypingIndicator } from "./TypingIndicator";
import { ChatMessage } from "./ChatMessage";
import { SeatSelectionModal } from "./transport/SeatSelectionModal";
import { useAnalytics } from "@/hooks/useAnalyticsTracking";
import { ParticipantsDataForm, createEmptyParticipantForm } from "./reservation/ParticipantsDataForm";
import { ShopCheckoutGallery, CheckoutShopItem } from "./shop/ShopCheckoutGallery";
import DOMPurify from "dompurify";

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  expiration_date: string;
}

interface Cliente {
  id: string;
  cpf: string;
  nome_completo: string;
  whatsapp: string;
  data_nascimento: string;
  email: string;
}

interface PontoEmbarque {
  id: string;
  nome: string;
  endereco: string;
  horario: string | null;
}

interface ReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
  preSelectedQuantities?: Record<string, number>;
}

interface OptionItem {
  label: string;
  value: string;
}

interface TourQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: OptionItem[] | null;
  is_required: boolean;
  order_index: number;
  question_category: string;
  standard_field_key: string | null;
  is_active: boolean;
  condition_field_key: string | null;
  condition_value: string | null;
}

interface OptionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface SelectedOptional {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Assignment of optional item to specific participant
interface OptionalAssignment {
  optionalId: string;
  optionalName: string;
  optionalPrice: number;
  participantIndex: number; // Index in fullParticipantsData
  participantName: string;
}

interface CouponData {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
}

interface FormData {
  nome_completo: string;
  whatsapp: string;
  dia_nascimento: string;
  mes_nascimento: string;
  ano_nascimento: string;
  cpf: string;
  email: string;
  numero_participantes: string;
  ponto_embarque_id: string;
  ponto_embarque_personalizado: string;
  problema_saude: boolean;
  descricao_problema_saude: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  instagram: string;
  custom_answers: Record<string, string>;
  aceita_politica: boolean;
  payment_method: "pix" | "credit_card" | "whatsapp";
}

interface ChatMessageType {
  type: "question" | "answer";
  text: string;
}

// Full participant data for multi-participant form
interface FullParticipantData {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  data_nascimento_dia: string;
  data_nascimento_mes: string;
  data_nascimento_ano: string;
  whatsapp: string;
  whatsapp_country_code: string;
  email: string;
  ponto_embarque_id: string;
  ponto_embarque_personalizado: string;
  nivel_condicionamento: string;
  problema_saude: boolean;
  descricao_problema_saude: string;
  plano_saude: boolean;
  nome_plano_saude: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  contato_emergencia_country_code: string;
  como_conheceu: string;
  como_conheceu_outro: string;
  pricingOptionId: string;
  pricingOptionName: string;
  pricingOptionPrice: number;
  selectedOptionals: Array<{ id: string; name: string; price: number; quantity: number }>;
}
export function ReservaModal({ isOpen, onClose, tour, preSelectedQuantities }: ReservaModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [questions, setQuestions] = useState<TourQuestion[]>([]);
  const [pontosEmbarque, setPontosEmbarque] = useState<PontoEmbarque[]>([]);
  const [optionalItems, setOptionalItems] = useState<OptionalItem[]>([]);
  const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptional[]>([]);
  const [optionalAssignments, setOptionalAssignments] = useState<OptionalAssignment[]>([]);
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyContent, setPolicyContent] = useState("");
  const [policyPdfUrl, setPolicyPdfUrl] = useState<string | null>(null);
  const [policyDisplayMode, setPolicyDisplayMode] = useState<'text' | 'pdf'>('text');
  const [policyImageUrl, setPolicyImageUrl] = useState<string | null>(null);
  const [cancellationDisplayMode, setCancellationDisplayMode] = useState<'text' | 'image'>('text');
  const [showPolicyLightbox, setShowPolicyLightbox] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showCurrentQuestion, setShowCurrentQuestion] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [reservaId, setReservaId] = useState<string | null>(null);
  const [showGoToPaymentButton, setShowGoToPaymentButton] = useState(false);
  const [showPaymentCard, setShowPaymentCard] = useState(false);
  const [showPixCheckout, setShowPixCheckout] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [realPaidAmount, setRealPaidAmount] = useState<number | null>(null);
  const [pulvarCampos, setPularCampos] = useState<string[]>([]);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPixPayment, setCheckingPixPayment] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponField, setShowCouponField] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [hasTransportConfig, setHasTransportConfig] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [selectedShopItems, setSelectedShopItems] = useState<CheckoutShopItem[]>([]);

  // Package selection state - with full participant data
  const [showPackageSelection, setShowPackageSelection] = useState(false);
  const [showParticipantsDataForm, setShowParticipantsDataForm] = useState(false);
  const [fullParticipantsData, setFullParticipantsData] = useState<FullParticipantData[]>([]);
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>({});

  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const analytics = useAnalytics();
  
  // Form abandonment tracking
  const [trackingSessionId, setTrackingSessionId] = useState<string>('');
  const trackingIdRef = useRef<string | null>(null);
  const currentStepRef = useRef<number>(1); // Track current step for abandonment
  
  const [formData, setFormData] = useState<FormData>({
    nome_completo: "",
    whatsapp: "",
    dia_nascimento: "",
    mes_nascimento: "",
    ano_nascimento: "",
    cpf: "",
    email: "",
    instagram: "",
    numero_participantes: "1",
    ponto_embarque_id: "",
    ponto_embarque_personalizado: "",
    problema_saude: false,
    descricao_problema_saude: "",
    contato_emergencia_nome: "",
    contato_emergencia_telefone: "",
    custom_answers: {},
    aceita_politica: false,
    payment_method: "pix",
  });

  // Fetch global questions and tour data
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !tour) return;

      // Fetch global questions from form_question_templates (active ones only, ordered)
      const { data: questionsData } = await supabase
        .from("form_question_templates")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      const mappedQuestions = (questionsData || []).map((q) => ({
        id: q.id,
        question_text: q.title,
        question_type: q.field_type,
        options: (q.options as unknown as OptionItem[] | null) || null,
        is_required: q.is_required,
        order_index: q.order_index,
        question_category: "standard",
        standard_field_key: q.standard_field_key || null,
        is_active: q.is_active,
        condition_field_key: q.condition_field_key || null,
        condition_value: q.condition_value || null,
      }));
      setQuestions(mappedQuestions);

      // Fetch boarding points
      const { data: pontosData } = await supabase
        .from("tour_boarding_points")
        .select("id, nome, endereco, horario")
        .eq("tour_id", tour.id)
        .order("order_index");
      setPontosEmbarque(pontosData || []);

      // Fetch policy settings (text, image, pdf and display modes)
      const { data: policySettings } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "reservation_policy", 
          "cancellation_policy_image", 
          "cancellation_display_mode",
          "terms_pdf_url",
          "terms_display_mode"
        ]);
      
      if (policySettings) {
        for (const setting of policySettings) {
          if (setting.setting_key === "reservation_policy") {
            setPolicyContent(setting.setting_value || "");
          } else if (setting.setting_key === "terms_pdf_url") {
            setPolicyPdfUrl(setting.setting_value || null);
          } else if (setting.setting_key === "terms_display_mode") {
            setPolicyDisplayMode((setting.setting_value as 'text' | 'pdf') || 'text');
          } else if (setting.setting_key === "cancellation_policy_image") {
            setPolicyImageUrl(setting.setting_value || null);
          } else if (setting.setting_key === "cancellation_display_mode") {
            setCancellationDisplayMode((setting.setting_value as 'text' | 'image') || 'text');
          }
        }
      }

      // Fetch optional items
      const { data: optionalsData } = await supabase
        .from("tour_optional_items")
        .select("*")
        .eq("tour_id", tour.id)
        .eq("is_active", true)
        .order("order_index");
      setOptionalItems(optionalsData || []);

      // Check if tour has transport config with seat selection enabled
      const { data: transportConfig } = await supabase
        .from("tour_transport_config")
        .select("id, seat_selection_enabled")
        .eq("tour_id", tour.id)
        .maybeSingle();
      setHasTransportConfig(transportConfig?.seat_selection_enabled === true);

      // Set default payment method based on tour config
      if (tour.payment_mode === "whatsapp") {
        setFormData((prev) => ({
          ...prev,
          payment_method: "whatsapp",
        }));
      }
    };
    fetchData();
  }, [isOpen, tour]);

  // Start chat when modal opens - show package selection first (if tour has packages)
  useEffect(() => {
    if (isOpen && questions.length > 0 && chatMessages.length === 0 && tour) {
      const hasPreSelection = preSelectedQuantities && Object.values(preSelectedQuantities).some(q => q > 0);

      if (hasPreSelection && tour.pricing_options && tour.pricing_options.length > 0) {
        // Packages already chosen on the page — skip selection, go straight to participants form
        setTimeout(() => {
          const quantities = preSelectedQuantities!;
          setPackageQuantities(quantities);
          const participants: FullParticipantData[] = [];
          Object.entries(quantities).forEach(([optionId, qty]) => {
            const option = tour.pricing_options?.find(o => o.id === optionId);
            if (option && qty > 0) {
              for (let i = 0; i < qty; i++) {
                participants.push(createEmptyParticipantForm(optionId, option.option_name, option.pix_price));
              }
            }
          });
          setFullParticipantsData(participants);
          setFormData(prev => ({ ...prev, numero_participantes: participants.length.toString() }));
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setChatMessages([{ type: "question", text: "Preencha os dados de cada participante:" }]);
            setShowParticipantsDataForm(true);
          }, 800);
          updateTrackingProgress('package_selection', 1);
        }, 300);
      } else if (tour.pricing_options && tour.pricing_options.length > 0) {
        // No pre-selection: show package selection inside the modal
        setTimeout(() => {
          setShowPackageSelection(true);
          updateTrackingProgress('package_selection', 1);
        }, 500);
      } else {
        // Fallback to old flow for tours without packages
        setTimeout(() => showNextQuestion(), 500);
      }
    }
  }, [isOpen, questions, tour]);

  // Lock body scroll when modal is open (vertical + horizontal)
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const html = document.documentElement;

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const originalBodyOverflow = body.style.overflow;
    const originalBodyPosition = body.style.position;
    const originalBodyWidth = body.style.width;
    const originalBodyTop = body.style.top;
    const originalBodyLeft = body.style.left;
    const originalBodyOverscroll = body.style.overscrollBehavior;

    const originalHtmlOverflow = html.style.overflow;
    const originalHtmlOverscroll = html.style.overscrollBehavior;

    // Prevent page from moving behind the modal (including iOS overscroll)
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    body.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;

    return () => {
      html.style.overflow = originalHtmlOverflow;
      html.style.overscrollBehavior = originalHtmlOverscroll;

      body.style.overflow = originalBodyOverflow;
      body.style.position = originalBodyPosition;
      body.style.width = originalBodyWidth;
      body.style.top = originalBodyTop;
      body.style.left = originalBodyLeft;
      body.style.overscrollBehavior = originalBodyOverscroll;

      window.scrollTo(scrollX, scrollY);
    };
  }, [isOpen]);

  // Reset when modal opens and track analytics
  useEffect(() => {
    if (isOpen && tour) {
      setChatMessages([]);
      setCurrentQuestionIndex(0);
      setShowCurrentQuestion(false);
      setInputDisabled(true);
      setReservaId(null);
      setShowGoToPaymentButton(false);
      setShowPaymentCard(false);
      setPularCampos([]);
      // Reset package selection
      setShowPackageSelection(false);
      setShowParticipantsDataForm(false);
      setFullParticipantsData([]);
      setPackageQuantities({});
      setSelectedShopItems([]);

      // Track modal open
      analytics.trackModalOpen("reserva", tour.id, tour.name);
      
      // Initialize form abandonment tracking
      const sessionId = crypto.randomUUID();
      setTrackingSessionId(sessionId);
      trackingIdRef.current = null;
    }
    return () => {
      if (isOpen) {
        analytics.trackModalClose("reserva");
      }
    };
  }, [isOpen, tour]);

  // Determine tracking step (1-5) based on current context and field
  // 1 = Escolha do Pacote, 2 = Dados Pessoais, 3 = Política de Cancelamento, 4 = Termos e Condições, 5 = Pagamento
  const getTrackingStep = (fieldName: string): number => {
    // Step 5: Payment related fields or payment card visible
    const paymentFields = ['payment_method', 'pix', 'credit_card', 'whatsapp_payment', 'card_processing', 'pix_checkout', 'card_checkout'];
    if (paymentFields.includes(fieldName) || showPaymentCard || showPixCheckout) {
      return 5;
    }
    
    // Step 4: Terms and conditions
    const termsFields = ['aceita_termos', 'aceita_politica', 'termos'];
    if (termsFields.includes(fieldName)) {
      return 4;
    }
    
    // Step 3: Cancellation policy
    const cancellationFields = ['aceita_cancelamento', 'cancelamento'];
    if (cancellationFields.includes(fieldName)) {
      return 3;
    }
    
    // Step 1: Package selection (pricing options, modal opened, optional items selection)
    const packageFields = ['pricing_option', 'optional_items', 'modal_opened', 'package_selection', 'package_confirmed'];
    if (packageFields.includes(fieldName) || showPackageSelection) {
      return 1;
    }
    
    // Step 2: Personal data and all other fields (including custom questions, participants form)
    return 2;
  };

  // Form abandonment tracking function
  const updateTrackingProgress = async (fieldName: string, explicitStep?: number) => {
    if (!trackingSessionId || !tour) return;
    
    const deviceType = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const stepReached = explicitStep ?? getTrackingStep(fieldName);
    
    // Always update the current step ref for abandonment tracking
    currentStepRef.current = stepReached;
    
    try {
      const updateData: any = {
        step_reached: stepReached,
        last_field: fieldName,
        last_activity_at: new Date().toISOString()
      };
      
      // Update contact info if available - check both formData and fullParticipantsData
      const primaryParticipant = fullParticipantsData.length > 0 ? fullParticipantsData[0] : null;
      const cpf = formData.cpf || primaryParticipant?.cpf;
      const nome = formData.nome_completo || primaryParticipant?.nome_completo;
      const whatsapp = formData.whatsapp || primaryParticipant?.whatsapp;
      const email = formData.email || primaryParticipant?.email;
      
      if (cpf) updateData.cpf = cpf.replace(/\D/g, '');
      if (nome) updateData.nome = nome;
      if (whatsapp) updateData.whatsapp = whatsapp.replace(/\D/g, '');
      if (email) updateData.email = email;
      
      if (!trackingIdRef.current) {
        // Use upsert with the unique constraint on session_id + tour_id
        console.log('ReservaModal: Upserting tracking record for tour:', tour.name, 'field:', fieldName, 'step:', stepReached);
        const { data, error } = await supabase
          .from('form_abandonment_tracking')
          .upsert({
            session_id: trackingSessionId,
            tour_id: tour.id,
            tour_name: tour.name,
            step_reached: stepReached,
            last_field: fieldName,
            cpf: cpf?.replace(/\D/g, '') || null,
            nome: nome || null,
            whatsapp: whatsapp?.replace(/\D/g, '') || null,
            email: email || null,
            device_type: deviceType,
            last_activity_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,tour_id',
            ignoreDuplicates: false
          })
          .select('id')
          .single();
        
        if (error) {
          console.error('ReservaModal: Error upserting tracking record:', error);
        } else if (data) {
          console.log('ReservaModal: Tracking record upserted with id:', data.id, 'step:', stepReached);
          trackingIdRef.current = data.id;
        }
      } else {
        console.log('ReservaModal: Updating tracking record:', trackingIdRef.current, 'field:', fieldName, 'step:', stepReached);
        await supabase
          .from('form_abandonment_tracking')
          .update(updateData)
          .eq('id', trackingIdRef.current);
      }
    } catch (error) {
      console.error('ReservaModal: Error tracking form progress:', error);
    }
  };

  // Initialize tracking when modal opens - runs once per modal open
  useEffect(() => {
    if (isOpen && tour && trackingSessionId) {
      // Small delay to ensure package selection tracking runs first if applicable
      const timer = setTimeout(() => {
        if (!trackingIdRef.current) {
          console.log('ReservaModal: Initializing tracking (fallback)...');
          updateTrackingProgress('modal_opened', 1);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, tour, trackingSessionId]);

  // Mark as completed ONLY when payment is confirmed (not just reservation created)
  useEffect(() => {
    if (paymentComplete && trackingIdRef.current && reservaId) {
      supabase
        .from('form_abandonment_tracking')
        .update({
          completed: true,
          converted_to_reserva: true,
          reserva_id: reservaId
        })
        .eq('id', trackingIdRef.current)
        .then(() => console.log('ReservaModal: Tracking marked as completed after payment'));
    }
  }, [paymentComplete, reservaId]);

  // Handle browser/tab close - register abandonment
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (trackingIdRef.current && !paymentComplete) {
        // Use sendBeacon for reliability on page unload
        const payload = JSON.stringify({
          step_reached: currentStepRef.current,
          last_activity_at: new Date().toISOString(),
          last_field: 'browser_closed'
        });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/form_abandonment_tracking?id=eq.${trackingIdRef.current}`,
          payload
        );
      }
    };

    if (isOpen && !paymentComplete) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, paymentComplete]);

  // PIX polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showPixCheckout && pixData && !paymentComplete) {
      interval = setInterval(checkPixPaymentStatus, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showPixCheckout, pixData, paymentComplete]);
  const scrollToBottom = () => {
    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const scrollToTop = () => {
    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  };
  // Helper function to check if condition is met
  const isConditionMet = (q: TourQuestion): boolean => {
    if (!q.condition_field_key || !q.condition_value) return true;
    const condKey = q.condition_field_key;
    const expectedValue = q.condition_value;

    // Handle problema_saude (stored in formData directly)
    if (condKey === "problema_saude") {
      return formData.problema_saude === (expectedValue === "true");
    }

    // Find the parent question by standard_field_key
    const parentQuestion = questions.find((pq) => pq.standard_field_key === condKey);
    if (parentQuestion) {
      const parentAnswer = formData.custom_answers[parentQuestion.id];
      if (parentAnswer) {
        return parentAnswer === expectedValue || parentAnswer.toLowerCase() === expectedValue.toLowerCase();
      }
      // If no answer yet, condition not met
      return false;
    }
    return true;
  };
  const getActiveQuestions = () => {
    return questions.filter((q) => {
      // Skip if condition is not met
      if (!isConditionMet(q)) return false;

      // When using package flow, skip all individual data questions (handled in ParticipantsDataForm)
      if (tour?.pricing_options && tour.pricing_options.length > 0 && fullParticipantsData.length > 0) {
        const skipFields = [
          "cpf",
          "nome_completo",
          "whatsapp",
          "data_nascimento",
          "email",
          "numero_participantes",
          "ponto_embarque_id",
          "problema_saude",
          "descricao_problema_saude",
          "contato_emergencia",
          "nivel_condicionamento",
          "assistencia_diferenciada",
          "descricao_assistencia_diferenciada",
        ];
        if (q.standard_field_key && skipFields.includes(q.standard_field_key)) {
          return false;
        }
      }

      // Skip questions for fields already filled from CPF lookup (old flow)
      if (q.standard_field_key && pulvarCampos.includes(q.standard_field_key)) return false;
      // Skip numero_participantes when tour has pricing options (packages handle this)
      if (q.standard_field_key === "numero_participantes" && tour?.pricing_options && tour.pricing_options.length > 0) {
        return false;
      }
      return true;
    });
  };
  const showNextQuestion = async () => {
    const activeQuestions = getActiveQuestions();
    console.log("DEBUG showNextQuestion:", {
      currentQuestionIndex,
      activeQuestionsLength: activeQuestions.length,
      isEnd: currentQuestionIndex >= activeQuestions.length,
    });

    if (currentQuestionIndex >= activeQuestions.length) {
      // All questions answered - create reservation and go directly to checkout
      console.log("DEBUG: End of questions - creating reservation and going to checkout");
      setShowCurrentQuestion(false);
      setIsTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsTyping(false);

      // Add message
      setChatMessages((prev) => [
        ...prev,
        {
          type: "question",
          text: "🎉 Ótimo! Agora finalize sua reserva realizando o pagamento abaixo.",
        },
      ]);

      // Create the reservation first, then show checkout
      await finalizarReserva();
      scrollToBottom();
      return;
    }
    setInputDisabled(true);
    setIsTyping(true);
    setShowCurrentQuestion(false);
    const typingDelay = Math.random() * 1000 + 500;
    await new Promise((resolve) => setTimeout(resolve, typingDelay));
    setIsTyping(false);
    setShowCurrentQuestion(true);

    // Track question start and update abandonment tracking step
    const currentQ = activeQuestions[currentQuestionIndex];
    if (currentQ) {
      analytics.trackFormQuestionStart(currentQ.id, currentQ.question_text);
      
      // Track step based on question type when it's SHOWN (not just answered)
      const fieldKey = currentQ.standard_field_key || currentQ.id;
      if (fieldKey === 'aceita_cancelamento') {
        updateTrackingProgress('aceita_cancelamento_shown', 3);
      } else if (fieldKey === 'aceita_politica') {
        updateTrackingProgress('aceita_politica_shown', 4);
      }
    }
    setTimeout(() => {
      setInputDisabled(false);
      scrollToBottom();
    }, 800);
    scrollToBottom();
  };
  const getCurrentQuestion = (): TourQuestion | null => {
    const activeQuestions = getActiveQuestions();
    return activeQuestions[currentQuestionIndex] || null;
  };
  const buscarClientePorCPF = async (cpf: string) => {
    const cleanedCPF = cpf.trim().replace(/\D/g, "");
    if (cleanedCPF.length < 11) return;

    const { data, error } = await supabase.rpc("get_client_by_cpf", {
      lookup_cpf: cleanedCPF,
    });

    const cliente = Array.isArray(data) ? (data[0] as unknown as Cliente | undefined) : undefined;

    if (!error && cliente) {
      setClienteExistente(cliente);
      const dataNascimento = new Date(cliente.data_nascimento + "T12:00:00");
      setFormData((prev) => ({
        ...prev,
        nome_completo: cliente.nome_completo,
        whatsapp: cliente.whatsapp,
        dia_nascimento: dataNascimento.getDate().toString().padStart(2, "0"),
        mes_nascimento: (dataNascimento.getMonth() + 1).toString().padStart(2, "0"),
        ano_nascimento: dataNascimento.getFullYear().toString(),
        email: cliente.email,
        problema_saude: (cliente as any).problema_saude || false,
        descricao_problema_saude: (cliente as any).descricao_problema_saude || "",
        contato_emergencia_nome: (cliente as any).contato_emergencia_nome || "",
        contato_emergencia_telefone: (cliente as any).contato_emergencia_telefone || "",
      }));
      const camposPreenchidos = ["nome_completo", "whatsapp", "data_nascimento", "email"];
      if ((cliente as any).contato_emergencia_nome) camposPreenchidos.push("contato_emergencia");
      setPularCampos(camposPreenchidos);
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "question",
            text: `🎉 Bem-vindo(a) de volta, ${cliente.nome_completo}!`,
          },
        ]);
        setIsTyping(false);
        scrollToBottom();
      }, 1500);
    } else {
      setClienteExistente(null);
    }
  };
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Track field change in real-time - using dynamic step detection
    updateTrackingProgress(field);
    
    if (field === "cpf" && typeof value === "string") {
      const cpfLimpo = value.replace(/\D/g, "");
      if (cpfLimpo.length === 11) {
        setIsTyping(true);
        buscarClientePorCPF(cpfLimpo);
      }
    }
  };
  const isFieldValid = (question: TourQuestion): boolean => {
    const key = question.standard_field_key;
    if (key) {
      switch (key) {
        case "cpf":
          return formData.cpf.replace(/\D/g, "").length === 11 && validarCPF(formData.cpf);
        case "nome_completo":
          return formData.nome_completo.trim().length > 0;
        case "whatsapp":
          return validarTelefone(formData.whatsapp);
        case "data_nascimento":
          return !!(formData.dia_nascimento && formData.mes_nascimento && formData.ano_nascimento);
        case "email":
          return formData.email.includes("@") && formData.email.includes(".");
        case "numero_participantes":
          const num = parseInt(formData.numero_participantes);
          return num >= 1 && num <= 10;
        case "ponto_embarque_id":
          return formData.ponto_embarque_id.length > 0;
        case "problema_saude":
          return true;
        case "descricao_problema_saude":
          return !formData.problema_saude || formData.descricao_problema_saude.trim().length > 0;
        case "contato_emergencia":
          return true;
        case "nivel_condicionamento":
        case "assistencia_diferenciada":
        case "descricao_assistencia_diferenciada":
          // These are handled via custom_answers
          if (!question.is_required) return true;
          const customAnswer = formData.custom_answers[question.id];
          return !!(customAnswer && customAnswer.trim().length > 0);
        case "aceita_politica":
        case "aceita_cancelamento":
          // Policy acceptances are handled via custom_answers
          const policyAnswer = formData.custom_answers[question.id];
          return policyAnswer === "Sim";
      }
    }

    // Custom question validation
    if (!question.is_required) return true;
    const answer = formData.custom_answers[question.id];
    return !!(answer && answer.trim().length > 0);
  };
  const getFieldDisplayValue = (question: TourQuestion): string => {
    const key = question.standard_field_key;
    if (key) {
      switch (key) {
        case "cpf":
          return formatarCPF(formData.cpf);
        case "nome_completo":
          return formData.nome_completo;
        case "whatsapp":
          return formatarTelefone(formData.whatsapp);
        case "data_nascimento":
          return `${formData.dia_nascimento}/${formData.mes_nascimento}/${formData.ano_nascimento}`;
        case "email":
          return formData.email;
        case "numero_participantes":
          return `${formData.numero_participantes} ${parseInt(formData.numero_participantes) === 1 ? "vaga" : "vagas"}`;
        case "ponto_embarque_id":
          return pontosEmbarque.find((p) => p.id === formData.ponto_embarque_id)?.nome || "";
        case "problema_saude":
          return formData.problema_saude ? "Sim" : "Não";
        case "descricao_problema_saude":
          return formData.descricao_problema_saude;
        case "contato_emergencia":
          return formData.contato_emergencia_nome || formData.contato_emergencia_telefone
            ? `${formData.contato_emergencia_nome} - ${formData.contato_emergencia_telefone}`
            : "(não informado)";
        case "nivel_condicionamento":
        case "assistencia_diferenciada":
        case "descricao_assistencia_diferenciada":
        case "aceita_politica":
        case "aceita_cancelamento":
          return formData.custom_answers[question.id] || "";
      }
    }
    return formData.custom_answers[question.id] || "";
  };
  const nextField = async () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    if (!isFieldValid(currentQuestion)) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha este campo corretamente.",
        variant: "destructive",
      });
      return;
    }

    // Track question answer
    analytics.trackFormQuestionAnswer(currentQuestion.id);
    
    // Track form abandonment progress - using dynamic step detection
    const fieldKey = currentQuestion.standard_field_key || currentQuestion.id;
    updateTrackingProgress(fieldKey);

    // Add answer to chat
    const answerText = getFieldDisplayValue(currentQuestion);
    setChatMessages((prev) => [
      ...prev,
      {
        type: "answer",
        text: answerText,
      },
    ]);
    setCurrentQuestionIndex((prev) => prev + 1);
    await showNextQuestion();
  };
  const prevField = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setChatMessages((prev) => prev.slice(0, -2));
    }
  };

  // Calculate selection preview total from packageQuantities (used during package selection step)
  const packageSelectionPreviewTotal = tour?.pricing_options
    ? Object.entries(packageQuantities).reduce((sum, [optionId, qty]) => {
        const option = tour.pricing_options?.find((o) => o.id === optionId);
        return sum + (option?.pix_price || 0) * qty;
      }, 0)
    : 0;

  // Calculate totals based on full participants data (used after package selection is confirmed)
  const packageSubtotal = fullParticipantsData.reduce((sum, p) => sum + p.pricingOptionPrice, 0);
  const basePrice = tour?.valor_padrao || 0;
  const quantity =
    fullParticipantsData.length > 0 ? fullParticipantsData.length : parseInt(formData.numero_participantes) || 1;
  // Use package subtotal if packages are selected, otherwise fallback to valor_padrao
  const subtotal = fullParticipantsData.length > 0 ? packageSubtotal : basePrice * quantity;
  
  // Calculate optionals total using the same consolidated logic used for saving
  // This ensures display total always matches what gets saved/charged
  const consolidatedOptionalsForTotal = (() => {
    const allOptionals: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    
    const addOpt = (opt: { id: string; name: string; price: number; quantity: number }) => {
      const existing = allOptionals.find(o => o.id === opt.id);
      if (existing) {
        existing.quantity += opt.quantity;
      } else {
        allOptionals.push({ ...opt });
      }
    };
    
    // Source 1: per-participant optionals
    for (const participant of fullParticipantsData) {
      if (participant.selectedOptionals?.length > 0) {
        for (const opt of participant.selectedOptionals) {
          addOpt(opt);
        }
      }
    }
    
    // Source 2: optionalAssignments
    for (const assignment of optionalAssignments) {
      addOpt({
        id: assignment.optionalId,
        name: assignment.optionalName,
        price: assignment.optionalPrice,
        quantity: 1
      });
    }
    
    // Source 3: selectedOptionals (skip if already in assignments)
    for (const opt of selectedOptionals) {
      const assignmentCount = optionalAssignments.filter(a => a.optionalId === opt.id).length;
      if (assignmentCount > 0) continue;
      addOpt(opt);
    }
    
    return allOptionals;
  })();
  
  const optionalsTotal = consolidatedOptionalsForTotal.reduce((sum, o) => sum + o.price * o.quantity, 0);
  
  // Calculate shop items total
  const shopItemsTotal = selectedShopItems.reduce((sum, item) => sum + item.subtotal, 0);
  
  const baseTotal = subtotal + optionalsTotal + shopItemsTotal;

  // Apply coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.tipo === "porcentagem") {
      couponDiscount = baseTotal * (appliedCoupon.valor / 100);
    } else {
      couponDiscount = Math.min(appliedCoupon.valor, baseTotal);
    }
  }
  const afterDiscount = baseTotal - couponDiscount;

  // Taxa de cartão removida - agora os juros de parcelamento são calculados no checkout
  // A taxa de processamento base (4,98%) é assumida pelo vendedor
  const total = Math.round(afterDiscount * 100) / 100;
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  const applyCoupon = async () => {
    if (!couponCode.trim() || !tour) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("codigo", couponCode.toUpperCase().trim())
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setCouponError("Cupom não encontrado ou inativo");
        return;
      }

      // Check if coupon is for this tour or universal
      if (data.tour_id && data.tour_id !== tour.id) {
        setCouponError("Este cupom não é válido para este passeio");
        return;
      }

      // Check date validity
      const now = new Date();
      if (data.data_inicio && new Date(data.data_inicio) > now) {
        setCouponError("Este cupom ainda não está ativo");
        return;
      }
      if (data.data_fim && new Date(data.data_fim) < now) {
        setCouponError("Este cupom expirou");
        return;
      }

      // Check usage limit
      if (data.maximo_usos && data.usos_atual >= data.maximo_usos) {
        setCouponError("Este cupom atingiu o limite de uso");
        return;
      }
      setAppliedCoupon({
        id: data.id,
        codigo: data.codigo,
        tipo: data.tipo,
        valor: data.valor,
      });
      setCouponCode("");
    } catch (error: any) {
      setCouponError("Erro ao validar cupom");
    } finally {
      setApplyingCoupon(false);
    }
  };
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };
  
  // Helper function to consolidate optionals from all sources
  const getConsolidatedOptionals = () => {
    const allOptionals: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    const addedIds = new Set<string>();
    
    const addOptional = (opt: { id: string; name: string; price: number; quantity: number }) => {
      const existing = allOptionals.find(o => o.id === opt.id);
      if (existing) {
        existing.quantity += opt.quantity;
      } else {
        allOptionals.push({ id: opt.id, name: opt.name, price: opt.price, quantity: opt.quantity });
      }
      addedIds.add(opt.id);
    };
    
    // Source 1: fullParticipantsData[i].selectedOptionals (per-participant optionals from form)
    for (const participant of fullParticipantsData) {
      if (participant.selectedOptionals?.length > 0) {
        for (const opt of participant.selectedOptionals) {
          addOptional(opt);
        }
      }
    }
    
    // Source 2: optionalAssignments (when user assigns optionals to specific participants)
    for (const assignment of optionalAssignments) {
      addOptional({
        id: assignment.optionalId,
        name: assignment.optionalName,
        price: assignment.optionalPrice,
        quantity: 1
      });
    }
    
    // Source 3: selectedOptionals (main checkbox selection state)
    // Always include these - they are the primary source when user selects via checkboxes
    // Only skip if already added via assignments to avoid double counting
    for (const opt of selectedOptionals) {
      // Skip if this optional was already added via optionalAssignments
      const assignmentCount = optionalAssignments.filter(a => a.optionalId === opt.id).length;
      if (assignmentCount > 0) {
        // Already counted via assignments, skip
        continue;
      }
      // Add the full quantity from selectedOptionals
      addOptional(opt);
    }
    
    return allOptionals;
  };
  const toggleOptional = (item: OptionalItem) => {
    const existing = selectedOptionals.find((o) => o.id === item.id);
    if (existing) {
      setSelectedOptionals(selectedOptionals.filter((o) => o.id !== item.id));
      // Also remove all assignments for this optional
      setOptionalAssignments(prev => prev.filter(a => a.optionalId !== item.id));
    } else {
      setSelectedOptionals([
        ...selectedOptionals,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
  };
  const updateOptionalQuantity = (itemId: string, delta: number) => {
    setSelectedOptionals(prev => {
      const updated = prev.map((o) =>
        o.id === itemId
          ? {
              ...o,
              quantity: Math.max(1, Math.min(10, o.quantity + delta)),
            }
          : o,
      );
      
      // Get the new quantity for this item
      const newItem = updated.find(o => o.id === itemId);
      if (newItem) {
        // Adjust assignments to match new quantity
        setOptionalAssignments(prevAssignments => {
          const itemAssignments = prevAssignments.filter(a => a.optionalId === itemId);
          const otherAssignments = prevAssignments.filter(a => a.optionalId !== itemId);
          
          if (itemAssignments.length > newItem.quantity) {
            // Remove excess assignments
            return [...otherAssignments, ...itemAssignments.slice(0, newItem.quantity)];
          }
          return prevAssignments;
        });
      }
      
      return updated;
    });
  };
  
  // Assign an optional item to a specific participant
  const assignOptionalToParticipant = (optionalId: string, assignmentIndex: number, participantIndex: number) => {
    const optional = selectedOptionals.find(o => o.id === optionalId);
    const participant = fullParticipantsData[participantIndex];
    if (!optional || !participant) return;
    
    setOptionalAssignments(prev => {
      // Find existing assignments for this optional
      const otherOptionalAssignments = prev.filter(a => a.optionalId !== optionalId);
      const thisOptionalAssignments = prev.filter(a => a.optionalId === optionalId);
      
      // Create or update the assignment at the given index
      const newAssignment: OptionalAssignment = {
        optionalId: optional.id,
        optionalName: optional.name,
        optionalPrice: optional.price,
        participantIndex,
        participantName: participant.nome_completo || `Participante ${participantIndex + 1}`,
      };
      
      // Replace or add assignment at index
      const updatedAssignments = [...thisOptionalAssignments];
      updatedAssignments[assignmentIndex] = newAssignment;
      
      return [...otherOptionalAssignments, ...updatedAssignments];
    });
  };
  
  // Get participant name for display
  const getParticipantName = (index: number): string => {
    const participant = fullParticipantsData[index];
    if (!participant) return `Participante ${index + 1}`;
    return participant.nome_completo || `Participante ${index + 1}`;
  };
  const finalizarReserva = async () => {
    if (!tour) return;
    setLoading(true);
    try {
      // Use full participants data count if available
      const numParticipants =
        fullParticipantsData.length > 0 ? fullParticipantsData.length : parseInt(formData.numero_participantes) || 1;

      const { data: availability, error: availError } = await supabase.rpc("check_tour_availability", {
        p_tour_id: tour.id,
        p_requested_spots: numParticipants,
      });
      if (availError) {
        console.error("Error checking availability:", availError);
      } else if (availability === false) {
        toast({
          title: "Vagas insuficientes",
          description: "Desculpe, não há vagas suficientes disponíveis para este passeio.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get first participant data for main client record
      const firstParticipant = fullParticipantsData[0];

      // For full participant flow, use first participant's data as the buyer
      let clienteId = clienteExistente?.id;
      const buyerCpf = fullParticipantsData.length > 0 ? firstParticipant.cpf : formData.cpf;
      const buyerNome = fullParticipantsData.length > 0 ? firstParticipant.nome_completo : formData.nome_completo;
      const buyerWhatsapp = fullParticipantsData.length > 0 ? firstParticipant.whatsapp : formData.whatsapp;
      const buyerEmail = fullParticipantsData.length > 0 ? firstParticipant.email : formData.email;
      const buyerNascimento =
        fullParticipantsData.length > 0
          ? firstParticipant.data_nascimento
          : `${formData.ano_nascimento}-${formData.mes_nascimento.padStart(2, "0")}-${formData.dia_nascimento.padStart(2, "0")}`;
      const buyerProblemaSaude =
        fullParticipantsData.length > 0 ? firstParticipant.problema_saude : formData.problema_saude;
      const buyerDescProblemaSaude =
        fullParticipantsData.length > 0 ? firstParticipant.descricao_problema_saude : formData.descricao_problema_saude;
      const buyerContatoNome =
        fullParticipantsData.length > 0 ? firstParticipant.contato_emergencia_nome : formData.contato_emergencia_nome;
      const buyerContatoTel =
        fullParticipantsData.length > 0
          ? firstParticipant.contato_emergencia_telefone
          : formData.contato_emergencia_telefone;
      const buyerPontoEmbarqueRaw =
        fullParticipantsData.length > 0 ? firstParticipant.ponto_embarque_id : formData.ponto_embarque_id;
      const buyerPontoEmbarque = buyerPontoEmbarqueRaw === 'outro' ? null : buyerPontoEmbarqueRaw;

      if (!clienteId) {
        const newClienteId = crypto.randomUUID();
        const cpfClean = buyerCpf.replace(/\D/g, "");

        const { error: clienteInsertError } = await supabase.from("clientes").insert({
          id: newClienteId,
          cpf: cpfClean,
          nome_completo: buyerNome,
          whatsapp: buyerWhatsapp.replace(/\D/g, ""),
          data_nascimento: buyerNascimento,
          email: buyerEmail,
          problema_saude: buyerProblemaSaude || false,
          descricao_problema_saude: buyerProblemaSaude ? buyerDescProblemaSaude : null,
          contato_emergencia_nome: buyerContatoNome || null,
          contato_emergencia_telefone: buyerContatoTel?.replace(/\D/g, "") || null,
          instagram: formData.instagram?.trim() || null,
          capture_method: "website_modal",
        });

        if (clienteInsertError) {
          if ((clienteInsertError as any)?.code === "23505") {
            const { data: existing, error: existingError } = await supabase.rpc("get_client_by_cpf", {
              lookup_cpf: cpfClean,
            });
            if (existingError) throw existingError;

            const existingCliente = Array.isArray(existing) ? (existing[0] as any) : null;
            if (!existingCliente?.id) throw clienteInsertError;
            clienteId = existingCliente.id as string;
          } else {
            throw clienteInsertError;
          }
        } else {
          clienteId = newClienteId;
        }
      }

      if (!clienteId) {
        throw new Error("Não foi possível identificar o cliente para criar a reserva.");
      }

      const newReservaId = crypto.randomUUID();
      // Calculate valor_passeio from full participants data or fallback
      const valorPasseio =
        fullParticipantsData.length > 0 ? packageSubtotal : (tour.valor_padrao || 0) * numParticipants;

      const { error: reservaError } = await supabase.from("reservas").insert({
        id: newReservaId,
        cliente_id: clienteId,
        tour_id: tour.id,
        ponto_embarque_id: buyerPontoEmbarque,
        contato_emergencia_nome: buyerContatoNome || null,
        contato_emergencia_telefone: buyerContatoTel?.replace(/\D/g, "") || null,
        problema_saude: buyerProblemaSaude || false,
        descricao_problema_saude: buyerProblemaSaude ? buyerDescProblemaSaude : null,
        numero_participantes: numParticipants,
        status: "pendente",
        payment_status: "pendente",
        capture_method: "website_modal",
        valor_passeio: valorPasseio,
        valor_total_com_opcionais: valorPasseio,
      });
      if (reservaError) throw reservaError;

      // Save custom answers
      const customAnswers = Object.entries(formData.custom_answers)
        .filter(([_, answer]) => answer)
        .map(([questionId, answer]) => ({
          reserva_id: newReservaId,
          question_id: questionId,
          answer: answer,
        }));
      if (customAnswers.length > 0) {
        await supabase.from("reservation_custom_answers").insert(customAnswers);
      }

      // Save shop order items
      if (selectedShopItems.length > 0) {
        const shopOrderItems = selectedShopItems.map(item => {
          const variationLabel = item.variation 
            ? Object.values(item.variation.variation_values).join(', ')
            : null;
          return {
            reserva_id: newReservaId,
            product_id: item.product.id,
            variation_id: item.variation?.id || null,
            product_name: item.product.name,
            variation_label: variationLabel,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
          };
        });
        
        const { error: shopError } = await supabase
          .from("shop_order_items")
          .insert(shopOrderItems);
        
        if (shopError) {
          console.error("Error saving shop order items:", shopError);
        }
      }

      // Create participant records
      const pIds: string[] = [];
      const pNames: string[] = [];

      if (fullParticipantsData.length > 0) {
        // Create participants from full data form - all participants have complete data
        console.log("Creating participants from fullParticipantsData:", fullParticipantsData.length);
        for (let i = 0; i < fullParticipantsData.length; i++) {
          const p = fullParticipantsData[i];
          const participantId = crypto.randomUUID();

          const { error: participantError } = await supabase.from("reservation_participants").insert({
            id: participantId,
            reserva_id: newReservaId,
            participant_index: i + 1,
            nome_completo: p.nome_completo,
            cpf: p.cpf.replace(/\D/g, ""),
            data_nascimento: p.data_nascimento,
            whatsapp: p.whatsapp.replace(/\D/g, ""),
            email: p.email,
            problema_saude: p.problema_saude || false,
            descricao_problema_saude: p.problema_saude ? p.descricao_problema_saude : null,
            contato_emergencia_nome: p.contato_emergencia_nome || null,
            contato_emergencia_telefone: p.contato_emergencia_telefone?.replace(/\D/g, "") || null,
            ponto_embarque_id: p.ponto_embarque_id === 'outro' ? null : p.ponto_embarque_id,
            ponto_embarque_personalizado: p.ponto_embarque_id === 'outro' ? p.ponto_embarque_personalizado : null,
            nivel_condicionamento: p.nivel_condicionamento || null,
            instagram: (p as any).instagram?.trim() || null,
            como_conheceu: p.como_conheceu === 'outro'
              ? `Outro: ${p.como_conheceu_outro || ''}`.trim()
              : (p.como_conheceu || null),
            pricing_option_id: p.pricingOptionId || null,
            pricing_option_name: p.pricingOptionName || null,
            selected_optionals: p.selectedOptionals?.length > 0 ? JSON.parse(JSON.stringify(p.selectedOptionals)) : null,
          });

          if (participantError) {
            console.error("Error creating participant:", participantError);
          } else {
            console.log("Participant created successfully:", participantId, p.nome_completo);
          }

          pIds.push(participantId);
          pNames.push(p.nome_completo);
        }
      } else {
        // Fallback: Create primary participant without package (old flow)
        console.log("Using fallback flow for participant creation, numero_participantes:", formData.numero_participantes);
        const dataNascimento = `${formData.ano_nascimento}-${formData.mes_nascimento.padStart(2, "0")}-${formData.dia_nascimento.padStart(2, "0")}`;
        const participantId = crypto.randomUUID();
        
        const { error: participantError } = await supabase.from("reservation_participants").insert({
          id: participantId,
          reserva_id: newReservaId,
          participant_index: 1,
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ""),
          data_nascimento: dataNascimento,
          whatsapp: formData.whatsapp.replace(/\D/g, ""),
          email: formData.email,
          problema_saude: formData.problema_saude || false,
          descricao_problema_saude: formData.problema_saude ? formData.descricao_problema_saude : null,
          contato_emergencia_nome: formData.contato_emergencia_nome || null,
          contato_emergencia_telefone: formData.contato_emergencia_telefone?.replace(/\D/g, "") || null,
          ponto_embarque_id: formData.ponto_embarque_id === 'outro' ? null : formData.ponto_embarque_id,
          ponto_embarque_personalizado: formData.ponto_embarque_id === 'outro' ? formData.ponto_embarque_personalizado : null,
        });
        
        if (participantError) {
          console.error("Error creating primary participant:", participantError);
        } else {
          console.log("Primary participant created successfully:", participantId);
        }
        
        pIds.push(participantId);
        pNames.push(formData.nome_completo);

        // Create placeholder participants for remaining spots
        const numP = parseInt(formData.numero_participantes) || 1;
        for (let i = 2; i <= numP; i++) {
          const additionalId = crypto.randomUUID();
          const { error: additionalError } = await supabase.from("reservation_participants").insert({
            id: additionalId,
            reserva_id: newReservaId,
            participant_index: i,
            nome_completo: `Participante ${i}`,
            ponto_embarque_id: formData.ponto_embarque_id === 'outro' ? null : formData.ponto_embarque_id,
            ponto_embarque_personalizado: formData.ponto_embarque_id === 'outro' ? formData.ponto_embarque_personalizado : null,
          });
          
          if (additionalError) {
            console.error("Error creating additional participant:", additionalError);
          }
          
          pIds.push(additionalId);
          pNames.push(`Participante ${i}`);
        }
      }

      setReservaId(newReservaId);
      setParticipantIds(pIds);
      setParticipantNames(pNames);

      // If tour has transport config with seat selection, show seat selection before payment
      if (hasTransportConfig) {
        setShowSeatSelection(true);
      } else {
        setShowPaymentCard(true);
        // Track entering payment step
        updateTrackingProgress('payment_card_shown', 5);
      }
      scrollToBottom();
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      toast({
        title: "Erro ao criar reserva",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const checkPixPaymentStatus = async () => {
    if (!pixData?.payment_id || checkingPixPayment || !reservaId) return;
    setCheckingPixPayment(true);
    try {
      const { data: reserva } = await supabase
        .from("reservas")
        .select("payment_status, mp_status")
        .eq("id", reservaId)
        .single();
      if (reserva?.payment_status === "pago" || reserva?.mp_status === "approved") {
        setRealPaidAmount(afterDiscount); // PIX não tem juros
        setPaymentComplete(true);
        setShowPixCheckout(false);
        toast({
          title: "Pagamento confirmado!",
        });
      }
    } catch (error) {
      console.error("Error checking payment:", error);
    } finally {
      setCheckingPixPayment(false);
    }
  };
  const copyPixCode = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      toast({
        title: "Código copiado!",
      });
      setTimeout(() => setPixCopied(false), 3000);
    } catch (error) {
      console.error("Error copying:", error);
    }
  };
  const generatePixPayment = async () => {
    if (!tour || !reservaId) return;
    setProcessingPayment(true);
    try {
      // Consolidate optionals from all sources
      const consolidatedOptionals = getConsolidatedOptionals();
      
      await supabase
        .from("reservas")
        .update({
          selected_optional_items: JSON.parse(JSON.stringify(consolidatedOptionals)),
          valor_total_com_opcionais: afterDiscount,
          payment_method: "pix",
        })
        .eq("id", reservaId);
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          reserva_id: reservaId,
          tour_name: tour.name,
          tour_id: tour.id,
          client_name: formData.nome_completo,
          client_email: formData.email,
          client_cpf: formData.cpf.replace(/\D/g, ""),
          transaction_amount: afterDiscount,
          description: `Reserva ${tour.name}`,
        },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setPixData({
        payment_id: data.payment_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        ticket_url: data.ticket_url,
        expiration_date: data.expiration_date,
      });
      setShowPixCheckout(true);
      // Track PIX checkout
      updateTrackingProgress('pix_checkout', 5);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };
  const processarPagamento = async () => {
    console.log("processarPagamento called", {
      tour: !!tour,
      reservaId,
      paymentMethod: formData.payment_method,
    });
    if (!tour || !reservaId) {
      console.error("processarPagamento: Missing tour or reservaId", {
        tour: !!tour,
        reservaId,
      });
      toast({
        title: "Erro",
        description: "Reserva nao encontrada. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // Handle WhatsApp payment - keep existing behavior
    if (formData.payment_method === "whatsapp") {
      // Consolidate optionals from all sources
      const consolidatedOptionals = getConsolidatedOptionals();
      
      await supabase
        .from("reservas")
        .update({
          selected_optional_items: JSON.parse(JSON.stringify(consolidatedOptionals)),
          valor_total_com_opcionais: total,
        })
        .eq("id", reservaId);
      handleWhatsAppRedirect();
      return;
    }

    // For PIX and Credit Card - use InfinitePay
    setProcessingPayment(true);
    try {
      // Update participant records with their assigned optionals
      if (fullParticipantsData.length > 0 && optionalAssignments.length > 0 && participantIds.length > 0) {
        // Group assignments by participant
        const participantOptionals: Record<number, Array<{ id: string; name: string; price: number; quantity: number }>> = {};
        
        for (const assignment of optionalAssignments) {
          if (!participantOptionals[assignment.participantIndex]) {
            participantOptionals[assignment.participantIndex] = [];
          }
          // Check if this optional already exists for this participant
          const existing = participantOptionals[assignment.participantIndex].find(o => o.id === assignment.optionalId);
          if (existing) {
            existing.quantity += 1;
          } else {
            participantOptionals[assignment.participantIndex].push({
              id: assignment.optionalId,
              name: assignment.optionalName,
              price: assignment.optionalPrice,
              quantity: 1,
            });
          }
        }
        
        // Update each participant with their optionals
        for (const [indexStr, optionals] of Object.entries(participantOptionals)) {
          const index = parseInt(indexStr);
          const participantId = participantIds[index];
          if (participantId && optionals.length > 0) {
            await supabase
              .from("reservation_participants")
              .update({ selected_optionals: JSON.parse(JSON.stringify(optionals)) })
              .eq("id", participantId);
          }
        }
      }

      // Use consolidated optionals helper
      const optionalsToSave = getConsolidatedOptionals();
      
      // Update reservation with selected items first - wait and verify
      console.log("Updating reservation with optionals:", optionalsToSave, "total:", afterDiscount);

      const { error: updateError } = await supabase
        .from("reservas")
        .update({
          selected_optional_items: JSON.parse(JSON.stringify(optionalsToSave)),
          valor_total_com_opcionais: afterDiscount,
          payment_method: formData.payment_method === "pix" ? "pix" : "cartao",
        })
        .eq("id", reservaId);

      if (updateError) {
        console.error("Error updating reservation with optionals:", updateError);
        throw new Error("Erro ao salvar itens opcionais");
      }

      // Small delay to ensure DB consistency
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Prepare shop items for the edge function
      const shopItemsForPayment = selectedShopItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        variation_id: item.variation?.id || null,
        variation_label: item.variation 
          ? Object.values(item.variation.variation_values).join(', ')
          : null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal
      }));

      // Call the InfinitePay link creation function - pass optionals and shop items directly to avoid race conditions
      const { data, error } = await supabase.functions.invoke("create-infinitepay-link", {
        body: { 
          reserva_id: reservaId,
          selected_optionals: optionalsToSave,
          selected_shop_items: shopItemsForPayment,
          coupon_code: appliedCoupon?.codigo || null,
          coupon_discount: couponDiscount
        },
      });

      if (error) {
        console.error("InfinitePay link error:", error);
        throw new Error(error.message || "Erro ao criar link de pagamento");
      }

      if (data?.error) {
        console.error("InfinitePay API error:", data.error);
        throw new Error(data.error);
      }

      if (!data?.checkout_url) {
        throw new Error("Nao foi possivel obter o link de pagamento");
      }

      console.log("InfinitePay checkout URL:", data.checkout_url);

      // Redirect to InfinitePay checkout
      window.location.href = data.checkout_url;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };
  const handleWhatsAppRedirect = () => {
    let messageText = `Oi, sou ${formData.nome_completo}. Quero fazer a reserva da experiência ${tour?.name}:\n\n`;
    
    // Dados da Viagem
    messageText += `*DADOS DA VIAGEM:*\n`;
    messageText += `• Destino: ${tour?.name}\n`;
    messageText += `• Cidade: ${tour?.city}, ${tour?.state}\n`;
    messageText += `• Número de participantes: ${formData.numero_participantes}\n`;
    if (tour?.start_date) {
      // Parse date parts directly to avoid timezone issues
      const [year, month, day] = tour.start_date.split('-').map(Number);
      messageText += `• Data de início: ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}\n`;
    }
    if (tour?.end_date) {
      const [year, month, day] = tour.end_date.split('-').map(Number);
      messageText += `• Data de fim: ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}\n`;
    }
    
    // Valor Total - usar a variável 'total' já calculada no componente
    messageText += `\n*VALOR TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
    
    // If we have full participants data (multi-participant form), use that
    if (fullParticipantsData.length > 0) {
      fullParticipantsData.forEach((participant, index) => {
        messageText += `\n*PARTICIPANTE ${index + 1}:*\n`;
        messageText += `• Nome: ${participant.nome_completo}\n`;
        messageText += `• CPF: ${formatarCPF(participant.cpf)}\n`;
        messageText += `• WhatsApp: ${formatarTelefone(participant.whatsapp)}\n`;
        messageText += `• Email: ${participant.email}\n`;
        if (participant.data_nascimento) {
          messageText += `• Data de nascimento: ${format(new Date(participant.data_nascimento + "T12:00:00"), "dd/MM/yyyy")}\n`;
        } else if (participant.data_nascimento_dia && participant.data_nascimento_mes && participant.data_nascimento_ano) {
          messageText += `• Data de nascimento: ${participant.data_nascimento_dia}/${participant.data_nascimento_mes}/${participant.data_nascimento_ano}\n`;
        }
        
        // Ponto de Embarque
        const pontoEmbarque = pontosEmbarque.find((p) => p.id === participant.ponto_embarque_id);
        if (pontoEmbarque) {
          messageText += `• Ponto de embarque: ${pontoEmbarque.nome}\n`;
          if (pontoEmbarque.endereco) {
            messageText += `• Endereço: ${pontoEmbarque.endereco}\n`;
          }
        }
        
        // Nível de Condicionamento
        if (participant.nivel_condicionamento) {
          messageText += `• Nível de condicionamento: ${participant.nivel_condicionamento}\n`;
        }
        
        // Informações de Saúde
        messageText += `• Problema de saúde: ${participant.problema_saude ? 'Sim' : 'Não'}\n`;
        if (participant.problema_saude && participant.descricao_problema_saude) {
          messageText += `• Descrição: ${participant.descricao_problema_saude}\n`;
        }
        
        // Plano de Saúde
        if (participant.plano_saude && participant.nome_plano_saude) {
          messageText += `• Plano de saúde: ${participant.nome_plano_saude}\n`;
        }
        
        // Contato de Emergência
        if (participant.contato_emergencia_nome || participant.contato_emergencia_telefone) {
          messageText += `• Contato de emergência: ${participant.contato_emergencia_nome || ''} - ${formatarTelefone(participant.contato_emergencia_telefone) || ''}\n`;
        }
        
        // Opcionais do participante
        if (participant.selectedOptionals && participant.selectedOptionals.length > 0) {
          messageText += `• Itens adicionais: `;
          messageText += participant.selectedOptionals.map(opt => `${opt.name} (${opt.quantity}x)`).join(', ');
          messageText += `\n`;
        }
      });
    } else {
      // Fallback to formData for single participant flow
      const pontoEmbarque = pontosEmbarque.find((p) => p.id === formData.ponto_embarque_id);
      
      messageText += `\n*DADOS PESSOAIS:*\n`;
      messageText += `• Nome: ${formData.nome_completo}\n`;
      messageText += `• CPF: ${formatarCPF(formData.cpf)}\n`;
      messageText += `• WhatsApp: ${formatarTelefone(formData.whatsapp)}\n`;
      messageText += `• Email: ${formData.email}\n`;
      if (formData.dia_nascimento && formData.mes_nascimento && formData.ano_nascimento) {
        messageText += `• Data de nascimento: ${formData.dia_nascimento}/${formData.mes_nascimento}/${formData.ano_nascimento}\n`;
      }
      
      // Ponto de Embarque
      if (pontoEmbarque) {
        messageText += `• Ponto de embarque: ${pontoEmbarque.nome}\n`;
        if (pontoEmbarque.endereco) {
          messageText += `• Endereço: ${pontoEmbarque.endereco}\n`;
        }
      }
      
      // Contato de Emergência
      if (formData.contato_emergencia_nome || formData.contato_emergencia_telefone) {
        messageText += `\n*CONTATO DE EMERGÊNCIA:*\n`;
        if (formData.contato_emergencia_nome) {
          messageText += `• Nome: ${formData.contato_emergencia_nome}\n`;
        }
        if (formData.contato_emergencia_telefone) {
          messageText += `• Telefone: ${formatarTelefone(formData.contato_emergencia_telefone)}\n`;
        }
      }
      
      // Informações de Saúde
      messageText += `\n*INFORMAÇÕES DE SAÚDE:*\n`;
      messageText += `• Problema de saúde: ${formData.problema_saude ? 'Sim' : 'Não'}\n`;
      if (formData.problema_saude && formData.descricao_problema_saude) {
        messageText += `• Descrição: ${formData.descricao_problema_saude}\n`;
      }
      
      // Respostas de perguntas customizadas
      if (Object.keys(formData.custom_answers).length > 0) {
        messageText += `\n*INFORMAÇÕES ADICIONAIS:*\n`;
        Object.entries(formData.custom_answers).forEach(([questionId, answer]) => {
          const question = questions.find(q => q.id === questionId);
          if (question && answer) {
            messageText += `• ${question.question_text}: ${answer}\n`;
          }
        });
      }
    }
    
    // Consolidate ALL optionals for display
    const allOptionalsForWhatsApp: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    
    // Add optionals from each participant
    for (const participant of fullParticipantsData) {
      if (participant.selectedOptionals && participant.selectedOptionals.length > 0) {
        for (const opt of participant.selectedOptionals) {
          const existing = allOptionalsForWhatsApp.find(o => o.id === opt.id);
          if (existing) {
            existing.quantity += opt.quantity;
          } else {
            allOptionalsForWhatsApp.push({
              id: opt.id,
              name: opt.name,
              price: opt.price,
              quantity: opt.quantity
            });
          }
        }
      }
    }
    
    // Fallback to legacy selectedOptionals if no participant-level ones
    const optionalsToShow = allOptionalsForWhatsApp.length > 0 ? allOptionalsForWhatsApp : selectedOptionals;
    
    // Itens Adicionais consolidados
    if (optionalsToShow.length > 0) {
      messageText += `\n*ITENS ADICIONAIS (RESUMO):*\n`;
      optionalsToShow.forEach(opt => {
        messageText += `• ${opt.name} (${opt.quantity}x) - R$ ${(opt.price * opt.quantity).toFixed(2).replace('.', ',')}\n`;
      });
    }
    
    messageText += `\nTermos e Condições aceitos.\nPolítica de Cancelamento aceita.\n\nAguardo informações sobre pagamento para confirmar a reserva.`;
    
    // IMPORTANT: Save consolidated optionals to database before redirect
    const consolidatedForWhatsApp = getConsolidatedOptionals();
    if (reservaId) {
      supabase
        .from("reservas")
        .update({
          selected_optional_items: consolidatedForWhatsApp.length > 0 ? JSON.parse(JSON.stringify(consolidatedForWhatsApp)) : null,
          valor_total_com_opcionais: afterDiscount,
        })
        .eq("id", reservaId)
        .then(({ error }) => {
          if (error) console.error("Error saving optionals for WhatsApp redirect:", error);
        });
    }
    
    const whatsappURL = `https://wa.me/5582993649454?text=${encodeURIComponent(messageText)}`;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = whatsappURL;
    } else {
      const popup = window.open(whatsappURL, "_blank");
      if (!popup) window.location.href = whatsappURL;
    }
  };
  const resetForm = () => {
    setFormData({
      nome_completo: "",
      whatsapp: "",
      dia_nascimento: "",
      mes_nascimento: "",
      ano_nascimento: "",
      cpf: "",
      email: "",
      instagram: "",
      numero_participantes: "1",
      ponto_embarque_id: "",
      ponto_embarque_personalizado: "",
      problema_saude: false,
      descricao_problema_saude: "",
      contato_emergencia_nome: "",
      contato_emergencia_telefone: "",
      custom_answers: {},
      aceita_politica: false,
      payment_method: "pix",
    });
    setCurrentQuestionIndex(0);
    setChatMessages([]);
    setClienteExistente(null);
    setReservaId(null);
    setSelectedOptionals([]);
    setShowGoToPaymentButton(false);
    setShowPaymentCard(false);
    setShowCardCheckout(false);
    setShowPixCheckout(false);
    setPaymentComplete(false);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setShowCouponField(false);
    setShowSeatSelection(false);
    setParticipantIds([]);
    setParticipantNames([]);
    // Reset package selection
    setShowPackageSelection(false);
    setShowParticipantsDataForm(false);
    setFullParticipantsData([]);
    setPackageQuantities({});
    onClose();
  };

  // Package selection handlers - now creates FullParticipantData entries
  const handlePackageQuantityChange = (optionId: string, optionName: string, optionPrice: number, delta: number) => {
    const currentQty = packageQuantities[optionId] || 0;
    const newQty = Math.max(0, Math.min(10, currentQty + delta));

    setPackageQuantities((prev) => ({
      ...prev,
      [optionId]: newQty,
    }));

    // Update full participants data list
    setFullParticipantsData((prev) => {
      // Remove all participants of this option
      const otherParticipants = prev.filter((p) => p.pricingOptionId !== optionId);
      // Add new participants for this option
      const newParticipants: FullParticipantData[] = [];
      for (let i = 0; i < newQty; i++) {
        // Try to preserve existing data
        const existingData = prev.filter((p) => p.pricingOptionId === optionId)[i];
        newParticipants.push(existingData || createEmptyParticipantForm(optionId, optionName, optionPrice));
      }
      return [...otherParticipants, ...newParticipants];
    });
  };

  const getTotalSelectedParticipants = () => {
    return Object.values(packageQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  const isPackageSelectionValid = () => {
    return getTotalSelectedParticipants() > 0;
  };

  const confirmPackageSelection = async () => {
    if (!isPackageSelectionValid()) {
      toast({
        title: "Selecione ao menos uma vaga",
        description: "Escolha quantas vagas deseja reservar em cada pacote.",
        variant: "destructive",
      });
      return;
    }

    const totalParticipants = getTotalSelectedParticipants();

    // Build summary of selected packages
    const packageSummary = Object.entries(packageQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([optionId, qty]) => {
        const option = tour?.pricing_options?.find((o) => o.id === optionId);
        return option ? `${qty}x ${option.option_name}` : "";
      })
      .filter(Boolean)
      .join(", ");

    // Add answer to chat
    setChatMessages((prev) => [
      ...prev,
      {
        type: "answer",
        text: packageSummary,
      },
    ]);

    // Update formData with total participants
    setFormData((prev) => ({
      ...prev,
      numero_participantes: fullParticipantsData.length.toString(),
    }));

    // Show participants data form instead of continuing with questions
    setShowPackageSelection(false);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "question",
        text: "Agora preencha os dados de cada participante:",
        },
      ]);
      setShowParticipantsDataForm(true);
      // Track entering personal data step
      updateTrackingProgress('participants_data_form', 2);
      scrollToTop();
    }, 800);
  };


  const handleParticipantsDataConfirm = async () => {
    // All participants data is valid - now show policy/terms questions
    setShowParticipantsDataForm(false);

    // Add summary to chat
    const names = fullParticipantsData.map((p) => p.nome_completo).join(", ");
    setChatMessages((prev) => [
      ...prev,
      {
        type: "answer",
        text: `Dados preenchidos: ${names}`,
      },
    ]);

    // Track that personal data was completed (still step 2 - Dados Pessoais)
    updateTrackingProgress('dados_pessoais_completos', 2);

    // Check if there are policy questions to show
    const activeQuestions = getActiveQuestions();

    if (activeQuestions.length > 0) {
      // There are policy/terms questions - show them
      setCurrentQuestionIndex(0);
      setIsTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsTyping(false);
      await showNextQuestion();
    } else {
      // No additional questions - go directly to payment
      setIsTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsTyping(false);

      setChatMessages((prev) => [
        ...prev,
        {
          type: "question",
          text: "🎉 Ótimo! Agora finalize sua reserva realizando o pagamento abaixo.",
        },
      ]);

      await finalizarReserva();
    }
    scrollToBottom();
  };
  const renderInputField = (question: TourQuestion) => {
    const key = question.standard_field_key;
    const inputClass =
      "bg-white text-gray-800 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400";
    if (key) {
      switch (key) {
        case "cpf":
          return (
            <Input
              placeholder="Digite seu CPF"
              value={formatarCPF(formData.cpf)}
              onChange={(e) => handleInputChange("cpf", e.target.value.replace(/\D/g, ""))}
              maxLength={14}
              disabled={inputDisabled}
              onKeyPress={(e) => e.key === "Enter" && isFieldValid(question) && nextField()}
              className={inputClass}
            />
          );
        case "nome_completo":
          return (
            <Input
              placeholder="Digite seu nome completo"
              value={formData.nome_completo}
              onChange={(e) => handleInputChange("nome_completo", e.target.value)}
              disabled={inputDisabled}
              onKeyPress={(e) => e.key === "Enter" && isFieldValid(question) && nextField()}
              className={inputClass}
            />
          );
        case "whatsapp":
          return (
            <Input
              placeholder="(00) 00000-0000"
              value={formatarTelefone(formData.whatsapp)}
              onChange={(e) => handleInputChange("whatsapp", e.target.value.replace(/\D/g, ""))}
              maxLength={15}
              disabled={inputDisabled}
              onKeyPress={(e) => e.key === "Enter" && isFieldValid(question) && nextField()}
              className={inputClass}
            />
          );
        case "data_nascimento":
          const dias = Array.from(
            {
              length: 31,
            },
            (_, i) => i + 1,
          );
          const meses = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
          ];
          const anos = Array.from(
            {
              length: 100,
            },
            (_, i) => new Date().getFullYear() - i,
          );
          return (
            <div className="flex gap-2">
              <Select value={formData.dia_nascimento} onValueChange={(v) => handleInputChange("dia_nascimento", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  {dias.map((d) => (
                    <SelectItem key={d} value={d.toString().padStart(2, "0")}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.mes_nascimento} onValueChange={(v) => handleInputChange("mes_nascimento", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString().padStart(2, "0")}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.ano_nascimento} onValueChange={(v) => handleInputChange("ano_nascimento", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        case "email":
          return (
            <Input
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={inputDisabled}
              onKeyPress={(e) => e.key === "Enter" && isFieldValid(question) && nextField()}
              className={inputClass}
            />
          );
        case "instagram":
          return (
            <Input
              type="text"
              placeholder="@seuinstagram"
              value={formData.instagram}
              onChange={(e) => handleInputChange("instagram", e.target.value.replace(/\s/g, ""))}
              disabled={inputDisabled}
              onKeyPress={(e) => e.key === "Enter" && nextField()}
              className={inputClass}
            />
          );
        case "numero_participantes":
          return (
            <div className="flex items-center justify-center gap-4 p-2 bg-white rounded-lg border border-gray-300">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const c = parseInt(formData.numero_participantes);
                  if (c > 1) handleInputChange("numero_participantes", (c - 1).toString());
                }}
                disabled={inputDisabled || parseInt(formData.numero_participantes) <= 1}
                className="w-10 h-10 p-0 bg-purple-700 hover:bg-purple-600 text-primary-foreground text-3xl"
              >
                -
              </Button>
              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-2xl font-bold text-primary">{formData.numero_participantes}</span>
                <span className="text-sm text-primary/70">
                  {parseInt(formData.numero_participantes) === 1 ? "vaga" : "vagas"}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const c = parseInt(formData.numero_participantes);
                  if (c < 10) handleInputChange("numero_participantes", (c + 1).toString());
                }}
                disabled={inputDisabled || parseInt(formData.numero_participantes) >= 10}
                className="w-10 h-10 p-0 bg-primary text-primary-foreground text-2xl"
              >
                +
              </Button>
            </div>
          );
        case "ponto_embarque_id":
          return (
            <Select
              value={formData.ponto_embarque_id}
              onValueChange={(v) => handleInputChange("ponto_embarque_id", v)}
              disabled={inputDisabled}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Selecione seu ponto de embarque" />
              </SelectTrigger>
              <SelectContent>
                {pontosEmbarque.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.horario ? `${p.horario} - ` : ''}{p.nome}{p.endereco ? ` - ${p.endereco}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case "problema_saude":
          return (
            <div className="flex gap-3">
              <Button
                type="button"
                variant={formData.problema_saude ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    problema_saude: true,
                  }));
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "answer",
                      text: "Sim",
                    },
                  ]);
                  setCurrentQuestionIndex((prev) => prev + 1);
                  setTimeout(() => showNextQuestion(), 500);
                }}
                disabled={inputDisabled}
              >
                Sim
              </Button>
              <Button
                type="button"
                variant={!formData.problema_saude ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    problema_saude: false,
                  }));
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "answer",
                      text: "Não",
                    },
                  ]);
                  setCurrentQuestionIndex((prev) => prev + 1);
                  setTimeout(() => showNextQuestion(), 500);
                }}
                disabled={inputDisabled}
              >
                Não
              </Button>
            </div>
          );
        case "descricao_problema_saude":
          return (
            <Textarea
              placeholder="Descreva seu problema de saúde..."
              value={formData.descricao_problema_saude}
              onChange={(e) => handleInputChange("descricao_problema_saude", e.target.value)}
              disabled={inputDisabled}
              className={inputClass}
            />
          );
        case "contato_emergencia":
          return (
            <div className="space-y-2">
              <Input
                placeholder="Nome do contato"
                value={formData.contato_emergencia_nome}
                onChange={(e) => handleInputChange("contato_emergencia_nome", e.target.value)}
                disabled={inputDisabled}
                className={inputClass}
              />
              <Input
                placeholder="Telefone do contato"
                value={formatarTelefone(formData.contato_emergencia_telefone)}
                onChange={(e) => handleInputChange("contato_emergencia_telefone", e.target.value.replace(/\D/g, ""))}
                maxLength={15}
                disabled={inputDisabled}
                className={inputClass}
              />
            </div>
          );
        case "aceita_politica":
          // Termos e Condições - mostra botão para ler termos primeiro
          return (
            <div className="space-y-3">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowPolicyModal(true)}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-1" />
                Ler Termos e Condições
              </Button>
              {/* Accept/Reject buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-green-600 hover:text-white"
                  onClick={async () => {
                    // Track Termos e Condições acceptance (step 4)
                    updateTrackingProgress('aceita_politica', 4);
                    
                    const activeQuestions = getActiveQuestions();
                    const isLast = currentQuestionIndex >= activeQuestions.length - 1;
                    setFormData((prev) => ({
                      ...prev,
                      custom_answers: {
                        ...prev.custom_answers,
                        [question.id]: "Sim",
                      },
                    }));
                    setChatMessages((prev) => [
                      ...prev,
                      { type: "answer", text: "Sim, aceito" },
                    ]);

                    if (isLast) {
                      setShowCurrentQuestion(false);
                      setIsTyping(true);
                      await new Promise((resolve) => setTimeout(resolve, 800));
                      setIsTyping(false);
                      setChatMessages((prev) => [
                        ...prev,
                        { type: "question", text: "🎉 Ótimo! Agora finalize sua reserva realizando o pagamento abaixo." },
                      ]);
                      await finalizarReserva();
                      scrollToBottom();
                    } else {
                      setCurrentQuestionIndex((prev) => prev + 1);
                      setTimeout(() => showNextQuestion(), 500);
                    }
                  }}
                  disabled={inputDisabled}
                >
                  ✅ Sim, aceito
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-red-600 hover:text-white"
                  onClick={() => {
                    setChatMessages((prev) => [
                      ...prev,
                      { type: "answer", text: "❌ Não aceito" },
                      { type: "question", text: "Para viajar com a Camaleão, é necessário estar de acordo com nossa política. Caso não concorde, esta viagem pode não ser a melhor opção para você. Deseja reconsiderar?" },
                    ]);
                    scrollToBottom();
                  }}
                  disabled={inputDisabled}
                >
                  ❌ Não aceito
                </Button>
              </div>
            </div>
          );
        case "aceita_cancelamento":
          // Política de Cancelamento - mostra a imagem (se configurada) ou texto
          return (
            <div className="space-y-4">
              {cancellationDisplayMode === "image" && policyImageUrl ? (
                <div 
                  className="rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:shadow-lg transition-shadow -mx-6 sm:-mx-8 md:-mx-10"
                  onClick={() => setShowPolicyLightbox(true)}
                >
                  <img 
                    src={policyImageUrl} 
                    alt="Política de Cancelamento" 
                    className="w-full h-auto object-contain bg-white"
                  />
                  <div className="bg-gray-100 text-center py-2 text-sm text-gray-600 flex items-center justify-center gap-1">
                    <ZoomIn className="h-4 w-4" />
                    Clique para ampliar
                  </div>
                </div>
              ) : policyContent ? (
                <div
                  className="prose prose-sm max-w-none p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto -mx-2 sm:-mx-4"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(policyContent) }}
                />
              ) : null}
              
              {/* Accept/Reject buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-green-600 hover:text-white"
                  onClick={async () => {
                    // Track Política de Cancelamento acceptance (step 3)
                    updateTrackingProgress('aceita_cancelamento', 3);
                    
                    const activeQuestions = getActiveQuestions();
                    const isLast = currentQuestionIndex >= activeQuestions.length - 1;
                    setFormData((prev) => ({
                      ...prev,
                      custom_answers: {
                        ...prev.custom_answers,
                        [question.id]: "Sim",
                      },
                    }));
                    setChatMessages((prev) => [
                      ...prev,
                      { type: "answer", text: "Sim, aceito" },
                    ]);

                    if (isLast) {
                      setShowCurrentQuestion(false);
                      setIsTyping(true);
                      await new Promise((resolve) => setTimeout(resolve, 800));
                      setIsTyping(false);
                      setChatMessages((prev) => [
                        ...prev,
                        { type: "question", text: "🎉 Ótimo! Agora finalize sua reserva realizando o pagamento abaixo." },
                      ]);
                      await finalizarReserva();
                      scrollToBottom();
                    } else {
                      setCurrentQuestionIndex((prev) => prev + 1);
                      setTimeout(() => showNextQuestion(), 500);
                    }
                  }}
                  disabled={inputDisabled}
                >
                  ✅ Sim, aceito
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-red-600 hover:text-white"
                  onClick={() => {
                    setChatMessages((prev) => [
                      ...prev,
                      { type: "answer", text: "❌ Não aceito" },
                      { type: "question", text: "Para viajar com a Camaleão, é necessário estar de acordo com nossa política. Caso não concorde, esta viagem pode não ser a melhor opção para você. Deseja reconsiderar?" },
                    ]);
                    scrollToBottom();
                  }}
                  disabled={inputDisabled}
                >
                  ❌ Não aceito
                </Button>
              </div>
            </div>
          );
        case "nivel_condicionamento":
          // Render as radio with options from database
          if (question.options && question.options.length > 0) {
            return (
              <RadioGroup
                value={formData.custom_answers[question.id] || ""}
                onValueChange={(v) => {
                  setFormData((prev) => ({
                    ...prev,
                    custom_answers: {
                      ...prev.custom_answers,
                      [question.id]: v,
                    },
                  }));
                }}
                disabled={inputDisabled}
                className="space-y-2"
              >
                {question.options.map((opt) => (
                  <div
                    key={opt.value}
                    className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/50 transition-colors"
                  >
                    <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} className="mt-0.5" />
                    <Label
                      htmlFor={`${question.id}-${opt.value}`}
                      className="text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            );
          }
          return null;
        case "assistencia_diferenciada":
          return (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    custom_answers: {
                      ...prev.custom_answers,
                      [question.id]: "Sim",
                    },
                  }));
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "answer",
                      text: "Sim",
                    },
                  ]);
                  setCurrentQuestionIndex((prev) => prev + 1);
                  setTimeout(() => showNextQuestion(), 500);
                }}
                disabled={inputDisabled}
              >
                Sim
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    custom_answers: {
                      ...prev.custom_answers,
                      [question.id]: "Não",
                    },
                  }));
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "answer",
                      text: "Não",
                    },
                  ]);
                  setCurrentQuestionIndex((prev) => prev + 1);
                  setTimeout(() => showNextQuestion(), 500);
                }}
                disabled={inputDisabled}
              >
                Não
              </Button>
            </div>
          );
        case "descricao_assistencia_diferenciada":
          return (
            <Textarea
              placeholder="Descreva a assistência diferenciada que você precisa..."
              value={formData.custom_answers[question.id] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  custom_answers: {
                    ...prev.custom_answers,
                    [question.id]: e.target.value,
                  },
                }))
              }
              disabled={inputDisabled}
              className={inputClass}
            />
          );
      }
    }

    // Custom question types - radio with options
    if (question.question_type === "radio" && question.options) {
      return (
        <RadioGroup
          value={formData.custom_answers[question.id] || ""}
          onValueChange={(v) => {
            setFormData((prev) => ({
              ...prev,
              custom_answers: {
                ...prev.custom_answers,
                [question.id]: v,
              },
            }));
          }}
          disabled={inputDisabled}
          className="space-y-2"
        >
          {question.options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/50 transition-colors"
            >
              <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} className="mt-0.5" />
              <Label
                htmlFor={`${question.id}-${opt.value}`}
                className="text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    // Select dropdown with options
    if (question.question_type === "select" && question.options) {
      return (
        <Select
          value={formData.custom_answers[question.id] || ""}
          onValueChange={(v) =>
            setFormData((prev) => ({
              ...prev,
              custom_answers: {
                ...prev.custom_answers,
                [question.id]: v,
              },
            }))
          }
          disabled={inputDisabled}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || "placeholder"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (question.question_type === "boolean") {
      return (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                custom_answers: {
                  ...prev.custom_answers,
                  [question.id]: "Sim",
                },
              }));
              setTimeout(nextField, 500);
            }}
          >
            Sim
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                custom_answers: {
                  ...prev.custom_answers,
                  [question.id]: "Não",
                },
              }));
              setTimeout(nextField, 500);
            }}
          >
            Não
          </Button>
        </div>
      );
    }
    if (question.question_type === "textarea") {
      return (
        <Textarea
          placeholder="Digite sua resposta..."
          value={formData.custom_answers[question.id] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              custom_answers: {
                ...prev.custom_answers,
                [question.id]: e.target.value,
              },
            }))
          }
          disabled={inputDisabled}
          className={inputClass}
        />
      );
    }
    return (
      <Input
        placeholder="Digite sua resposta..."
        value={formData.custom_answers[question.id] || ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            custom_answers: {
              ...prev.custom_answers,
              [question.id]: e.target.value,
            },
          }))
        }
        disabled={inputDisabled}
        onKeyPress={(e) => e.key === "Enter" && isFieldValid(question) && nextField()}
        className={inputClass}
      />
    );
  };
  if (!tour) return null;
  const currentQuestion = getCurrentQuestion();
  const hasFormData = () => {
    // Check if user has entered any data
    if (formData.nome_completo || formData.cpf || formData.email || formData.whatsapp) return true;
    if (fullParticipantsData.some((p) => p.nome_completo || p.cpf || p.email)) return true;
    if (Object.values(packageQuantities).some((qty) => qty > 0)) return true;
    if (chatMessages.length > 0) return true;
    return false;
  };

  const handleDialogClose = async (open: boolean) => {
    if (!open) {
      // If payment is complete, just close
      if (paymentComplete) {
        resetForm();
        return;
      }
      // If user has entered data, show confirmation
      if (hasFormData()) {
        setShowCloseConfirmation(true);
        return;
      }
      // No data entered - still register abandonment if tracking exists
      if (trackingIdRef.current) {
        console.log('ReservaModal: Registering abandonment (no data), step:', currentStepRef.current);
        await supabase
          .from('form_abandonment_tracking')
          .update({
            step_reached: currentStepRef.current,
            last_field: 'modal_closed_no_data',
            last_activity_at: new Date().toISOString()
          })
          .eq('id', trackingIdRef.current);
      }
      resetForm();
    }
  };

  const confirmClose = async () => {
    // Register abandonment before closing (if not paid)
    if (trackingIdRef.current && !paymentComplete) {
      console.log('ReservaModal: Registering abandonment on close, step:', currentStepRef.current);
      await supabase
        .from('form_abandonment_tracking')
        .update({
          step_reached: currentStepRef.current,
          last_field: 'modal_closed',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', trackingIdRef.current);
    }
    setShowCloseConfirmation(false);
    resetForm();
  };

  return (
    <>
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem dados preenchidos no formulário. Se fechar agora, poderá perder as informações inseridas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar reservando</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg pr-8">
                <Calendar className="h-5 w-5" />
                <span className="truncate">Reservar: {tour.name}</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Chat Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50 to-white p-4 space-y-3"
          >
            {/* Welcome message - always show at the beginning */}
            <div className="flex justify-start">
              <div className="bg-purple-600 text-white rounded-2xl rounded-tl-md p-3 max-w-[85%] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
                    alt="Camaleão"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium">Camaleão</span>
                </div>
                <p className="text-sm">
                  Olá! 👋 Vamos fazer sua reserva para <strong>{tour.name}</strong>. Responda algumas perguntas rápidas!
                </p>
              </div>
            </div>

            {/* Chat messages */}
            {chatMessages.map((msg, i) => (
              <ChatMessage key={i} type={msg.type} text={msg.text} animate={true} />
            ))}

            {isTyping && <TypingIndicator />}

            {/* Package Selection Step - shows after CPF, replaces numero_participantes */}
            {showPackageSelection && tour?.pricing_options && tour.pricing_options.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="bg-purple-600 text-white rounded-2xl rounded-tl-md p-3 max-w-[85%] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src="/lovable-uploads/4713f0b0-8f15-45fc-b910-a38475e4148a.png"
                        alt="Camaleão"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium">Camaleão</span>
                    </div>
                    <p className="text-sm">Quantas vagas deseja reservar? Selecione os pacotes:</p>
                  </div>
                </div>

                {/* Package selection cards - simplified, no name inputs here */}
                <Card className="bg-white shadow-lg border-purple-200">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Escolha os pacotes
                    </h3>

                    {tour.pricing_options.map((option) => {
                      const qty = packageQuantities[option.id] || 0;

                      return (
                        <div key={option.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{option.option_name}</p>
                              {option.description && (
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                              )}
                              <p className="text-sm font-bold text-primary mt-1">
                                {formatCurrency(option.pix_price)}{" "}
                                <span className="text-xs font-normal text-muted-foreground">por pessoa</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePackageQuantityChange(option.id, option.option_name, option.pix_price, -1)
                                }
                                disabled={qty <= 0}
                                className="w-8 h-8 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-bold">{qty}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePackageQuantityChange(option.id, option.option_name, option.pix_price, 1)
                                }
                                disabled={qty >= 10}
                                className="w-8 h-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Summary */}
                    {getTotalSelectedParticipants() > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total de vagas:</span>
                          <span className="font-medium">{getTotalSelectedParticipants()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span>Valor total:</span>
                          <span className="text-primary">{formatCurrency(packageSelectionPreviewTotal)}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={confirmPackageSelection}
                      disabled={!isPackageSelectionValid()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Continuar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Participants Data Form - shows after package selection */}
            {showParticipantsDataForm && (
              <div className="space-y-4">
                <ParticipantsDataForm
                  participants={fullParticipantsData}
                  onParticipantsChange={setFullParticipantsData}
                  boardingPoints={pontosEmbarque}
                  onConfirm={handleParticipantsDataConfirm}
                  isLoading={loading}
                  tourName={tour?.name}
                  optionalItems={optionalItems}
                />
              </div>
            )}

            {/* Current question or Payment card */}
            {!showPaymentCard && showCurrentQuestion && currentQuestion && (
              <>
                <ChatMessage type="question" text={currentQuestion.question_text} animate={true} />
                <div className="flex justify-end">
                  <div className="w-[85%]">{renderInputField(currentQuestion)}</div>
                </div>
                <div className="flex justify-between items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={prevField}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={nextField}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Enviar
                  </Button>
                </div>
              </>
            )}

            {/* Go to Payment Button */}
            {showGoToPaymentButton && !showPaymentCard && !paymentComplete && (
              <div className="flex justify-center w-full">
                <Button
                  onClick={async () => {
                    setShowGoToPaymentButton(false);
                    setIsTyping(true);
                    await new Promise((resolve) => setTimeout(resolve, 800));
                    setIsTyping(false);
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "question",
                        text: "🎉 Ótimo! Agora finalize sua reserva realizando o pagamento abaixo.",
                      },
                    ]);
                    await finalizarReserva();
                    scrollToBottom();
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg h-auto"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Ir para Pagamento
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Payment Card integrated in chat */}
            {showPaymentCard && !showPixCheckout && !paymentComplete && (
              <div className="flex justify-start w-full">
                <Card className="w-full bg-white shadow-lg border-purple-200">
                  <CardContent className="p-4 space-y-4">
                    {/* Optional Items */}
                    {optionalItems.length > 0 && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Itens adicionais
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Personalize sua experiência! Adicione itens extras à sua reserva:
                          </p>
                        </div>
                        {optionalItems.map((item) => {
                          const selected = selectedOptionals.find((o) => o.id === item.id);
                          const hasMultipleParticipants = fullParticipantsData.length > 1;
                          
                          return (
                            <div key={item.id} className="space-y-2">
                              <div
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                  selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                                )}
                                onClick={() => toggleOptional(item)}
                              >
                                <Checkbox checked={!!selected} className="shrink-0" />
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {selected && (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateOptionalQuantity(item.id, -1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-6 text-center text-sm">{selected.quantity}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateOptionalQuantity(item.id, 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <span className="font-medium text-sm text-primary">{formatCurrency(item.price)}</span>
                                </div>
                              </div>
                              
                              {/* Participant assignment dropdowns - show when selected and multiple participants */}
                              {selected && hasMultipleParticipants && (
                                <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <p className="text-xs text-muted-foreground">
                                    Para quem é este item? (selecione {selected.quantity} participante{selected.quantity > 1 ? 's' : ''}):
                                  </p>
                                  {Array.from({ length: selected.quantity }).map((_, assignmentIdx) => {
                                    const currentAssignments = optionalAssignments.filter(a => a.optionalId === item.id);
                                    const currentAssignment = currentAssignments[assignmentIdx];
                                    
                                    return (
                                      <div key={assignmentIdx} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-16 shrink-0">
                                          Item {assignmentIdx + 1}:
                                        </span>
                                        <select
                                          value={currentAssignment?.participantIndex ?? ''}
                                          onChange={(e) => {
                                            const participantIndex = parseInt(e.target.value);
                                            if (!isNaN(participantIndex)) {
                                              assignOptionalToParticipant(item.id, assignmentIdx, participantIndex);
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex-1 h-8 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                          <option value="">Selecione o participante</option>
                                          {fullParticipantsData.map((p, pIdx) => (
                                            <option key={pIdx} value={pIdx}>
                                              {p.nome_completo || `Participante ${pIdx + 1}`}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Coupon Section */}
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">{appliedCoupon.codigo}</span>
                          <span className="text-sm text-green-600">
                            ({appliedCoupon.tipo === "porcentagem"
                              ? `${appliedCoupon.valor}%`
                              : formatCurrency(appliedCoupon.valor)}{" "}
                            de desconto)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeCoupon}
                          className="text-red-600 hover:text-red-700 h-7"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : showCouponField ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Digite o código do cupom"
                            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            onKeyPress={(e) => e.key === "Enter" && applyCoupon()}
                            autoFocus
                          />
                          <Button
                            onClick={applyCoupon}
                            disabled={applyingCoupon || !couponCode.trim()}
                            size="sm"
                            variant="outline"
                          >
                            {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                          </Button>
                        </div>
                        {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCouponField(true)}
                        className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                      >
                        Possui um cupom de desconto?
                      </button>
                    )}

                    {/* Shop Items Gallery */}
                    {tour && (
                      <ShopCheckoutGallery
                        tourId={tour.id}
                        selectedItems={selectedShopItems}
                        onItemsChange={setSelectedShopItems}
                      />
                    )}

                    {/* Order Summary */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Passeio ({quantity}x)</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {selectedOptionals.map((o) => (
                        <div key={o.id} className="flex justify-between">
                          <span>
                            {o.name} ({o.quantity}x)
                          </span>
                          <span>{formatCurrency(o.price * o.quantity)}</span>
                        </div>
                      ))}
                      {selectedShopItems.map((item) => {
                        const variationLabel = item.variation 
                          ? Object.values(item.variation.variation_values).join(', ')
                          : '';
                        return (
                          <div key={item.product.id + (item.variation?.id || '')} className="flex justify-between">
                            <span>
                              {item.product.name}{variationLabel ? ` (${variationLabel})` : ''} ({item.quantity}x)
                            </span>
                            <span>{formatCurrency(item.subtotal)}</span>
                          </div>
                        );
                      })}
                      {appliedCoupon && couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Desconto ({appliedCoupon.codigo})</span>
                          <span>-{formatCurrency(couponDiscount)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(afterDiscount)}</span>
                        </div>
                      </div>
                      {formData.payment_method === "credit_card"}
                    </div>

                    {/* Payment Methods */}
                    <RadioGroup
                      value={formData.payment_method}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_method: v as any,
                        }))
                      }
                    >
                      {(tour.payment_mode === "mercadopago" || tour.payment_mode === "both") && (
                        <>
                          <div
                            className={cn(
                              "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer",
                              formData.payment_method === "pix" ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                            )}
                          >
                            <RadioGroupItem value="pix" id="pix" />
                            <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                              <PixIcon size={20} className="text-emerald-600" />
                              <div>
                                <p className="font-medium">PIX</p>
                                <p className="text-xs text-muted-foreground">Pagamento instantaneo</p>
                              </div>
                              <span className="ml-auto font-bold text-emerald-600">
                                {formatCurrency(afterDiscount)}
                              </span>
                            </Label>
                          </div>
                          <div
                            className={cn(
                              "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer",
                              formData.payment_method === "credit_card"
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <RadioGroupItem value="credit_card" id="credit_card" />
                            <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer flex-1">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium">Cartao de Credito</p>
                                <p className="text-xs text-muted-foreground">Parcele em ate 12x</p>
                              </div>
                              <span className="ml-auto font-bold text-blue-600">{formatCurrency(afterDiscount)}</span>
                            </Label>
                          </div>
                        </>
                      )}
                      {(tour.payment_mode === "whatsapp" || tour.payment_mode === "both") && (
                        <div
                          className={cn(
                            "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer",
                            formData.payment_method === "whatsapp"
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <RadioGroupItem value="whatsapp" id="whatsapp" />
                          <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer flex-1">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">Combinar pagamento pelo WhatsApp</p>
                              <p className="text-xs text-muted-foreground">PIX parcelado</p>
                            </div>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>

                    <Button
                      onClick={processarPagamento}
                      disabled={processingPayment || loading}
                      className="w-48 bg-primary hover:bg-primary/90 h-12 text-base mx-auto rounded-lg transition-all duration-200 shadow-md hover:shadow-lg gap-[8px] flex-row flex items-center justify-center pb-0"
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : formData.payment_method === "whatsapp" ? (
                        <>
                          <MessageCircle className="w-5 h-5 mr-2" />
                          WhatsApp
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pagar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PIX Checkout */}
            {showPixCheckout && pixData && (
              <Card className="w-full">
                <CardContent className="p-4 space-y-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPixCheckout(false);
                      setPixData(null);
                    }}
                    className="self-start"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                  <div className="flex items-center justify-center gap-2">
                    <PixIcon size={20} />
                    <span className="font-bold">PIX</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(afterDiscount)}</p>
                  <div className="bg-white p-4 rounded-lg border-2 inline-block">
                    <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Clique em "Copiar código PIX" e realize o pagamento 
                      <span className="font-medium text-foreground"></span> com o app do seu banco
                    </p>
                    <p className="text-xs text-muted-foreground">ou escaneie o QR CODE com o App de seu banco.</p>
                  </div>
                  <Button onClick={copyPixCode} variant="outline" className="w-full bg-gray-200 hover:bg-gray-100">
                    <Copy className="h-4 w-4 mr-2" />
                    {pixCopied ? "Copiado!" : "Copiar código PIX"}
                  </Button>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className={`h-4 w-4 ${checkingPixPayment ? "animate-spin" : ""}`} />
                      <span className="font-medium">Aguardando pagamento...</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Após pagamento, a confirmação aparecerá automaticamente aqui.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Success */}
            {paymentComplete && (
              <div className="space-y-4 pb-4">
                {/* Success Header */}
                <div className="text-center py-4 space-y-2">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-green-700">Reserva Confirmada!</h2>
                  <p className="text-sm text-muted-foreground">Sua inscrição foi realizada com sucesso</p>
                </div>

                {/* Reservation Summary */}
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-purple-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resumo da sua inscrição
                    </h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="text-muted-foreground">Passeio</span>
                        <span className="font-medium text-right max-w-[60%]">{tour?.name}</span>
                      </div>
                      {tour?.start_date && (
                        <div className="flex justify-between py-1 border-b border-purple-100">
                          <span className="text-muted-foreground">Data</span>
                          <span className="font-medium">
                            {format(new Date(tour.start_date + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="text-muted-foreground">Participante</span>
                        <span className="font-medium">{formData.nome_completo}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="text-muted-foreground">Nº de pessoas</span>
                        <span className="font-medium">{formData.numero_participantes}</span>
                      </div>
                      {pontosEmbarque.find((p) => p.id === formData.ponto_embarque_id) && (
                        <div className="flex justify-between py-1 border-b border-purple-100">
                          <span className="text-muted-foreground">Embarque</span>
                          <span className="font-medium text-right max-w-[60%]">
                            {pontosEmbarque.find((p) => p.id === formData.ponto_embarque_id)?.nome}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Valor pago</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(realPaidAmount ?? afterDiscount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Info */}
                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-green-900">Grupo do WhatsApp</h3>
                        <p className="text-xs text-green-700 leading-relaxed">
                          Alguns dias antes da viagem, criaremos um grupo no WhatsApp com todos os participantes para
                          enviar informações detalhadas e tirar dúvidas.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    Você receberá um <strong>e-mail de confirmação</strong> com todos os detalhes da sua reserva.
                  </p>
                  <p className="text-sm text-center text-muted-foreground">
                    Qualquer dúvida, entre em contato pelo nosso WhatsApp:
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => window.open("https://wa.me/5582993649454", "_blank")}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    (82) 99364-9454
                  </Button>
                </div>

                {/* Close Button */}
                <Button onClick={resetForm} className="w-full bg-primary hover:bg-primary/90">
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>

        {/* Policy Modal */}
        <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
          <DialogContent className={policyDisplayMode === 'pdf' && policyPdfUrl ? "max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 overflow-hidden flex flex-col" : "max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"}>
            <DialogHeader className={policyDisplayMode === 'pdf' && policyPdfUrl ? "px-4 py-3 border-b flex-shrink-0" : ""}>
              <Button
                onClick={() => setShowPolicyModal(false)}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10"
              >
                <X className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-base font-semibold">Termos e Condições de Participação</DialogTitle>
            </DialogHeader>
            {policyDisplayMode === 'pdf' && policyPdfUrl ? (
              <iframe
                src={`${policyPdfUrl}#view=FitH&toolbar=0&navpanes=0`}
                className="w-full flex-1 border-0"
                title="Termos e Condições de Participação"
                style={{ minHeight: 0 }}
              />
            ) : (
              <div
                className="prose prose-sm max-w-none overflow-y-auto flex-1 p-4 rich-text-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(policyContent || "<p>Carregando...</p>", {
                    ALLOWED_TAGS: [
                      "p",
                      "br",
                      "strong",
                      "em",
                      "u",
                      "s",
                      "a",
                      "ul",
                      "ol",
                      "li",
                      "blockquote",
                      "h1",
                      "h2",
                      "h3",
                      "h4",
                      "h5",
                      "h6",
                      "pre",
                      "code",
                      "span",
                      "div",
                      "sub",
                      "sup",
                    ],
                    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
                    ALLOW_DATA_ATTR: false,
                  }),
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Policy Image Lightbox */}
        <Dialog open={showPolicyLightbox} onOpenChange={setShowPolicyLightbox}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
            <DialogHeader>
              <Button
                onClick={() => setShowPolicyLightbox(false)}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10 bg-white/80 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </Button>
              <DialogTitle className="sr-only">Política de Cancelamento</DialogTitle>
            </DialogHeader>
            {policyImageUrl && (
              <div className="overflow-auto max-h-[85vh]">
                <img 
                  src={policyImageUrl} 
                  alt="Política de Cancelamento" 
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Seat Selection Modal */}
        {tour && reservaId && (
          <SeatSelectionModal
            isOpen={showSeatSelection}
            onClose={() => {
              setShowSeatSelection(false);
              setShowPaymentCard(true);
            }}
            tourId={tour.id}
            reservaId={reservaId}
            participantIds={participantIds}
            participantNames={participantNames}
            onComplete={() => {
              setShowSeatSelection(false);
              setShowPaymentCard(true);
              scrollToBottom();
            }}
          />
        )}
      </Dialog>
    </>
  );
}
