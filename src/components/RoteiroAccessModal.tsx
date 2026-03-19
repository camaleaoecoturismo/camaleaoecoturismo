import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import logoBranco from "@/assets/logo-branco.png";
interface RoteiroAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourName: string;
  pdfFilePath: string;
}
const STORAGE_KEY = "camaleao_lead_data";
export function RoteiroAccessModal({
  open,
  onOpenChange,
  tourId,
  tourName,
  pdfFilePath
}: RoteiroAccessModalProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("+55");
  const [consentimento, setConsentimento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const {
    toast
  } = useToast();

  // Load saved data from localStorage when modal opens
  useEffect(() => {
    if (open) {
      setShowSuccess(false);
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const {
            nome: savedNome,
            whatsapp: savedWhatsapp,
            countryCode: savedCountryCode
          } = JSON.parse(savedData);
          if (savedNome) setNome(savedNome);
          if (savedWhatsapp) setWhatsapp(savedWhatsapp);
          if (savedCountryCode) setCountryCode(savedCountryCode);
          setHasSavedData(Boolean(savedNome && savedWhatsapp));
        }
      } catch (e) {
        console.error("Error loading saved lead data:", e);
      }
    }
  }, [open]);
  const cleanWhatsApp = (phone: string) => {
    return phone.replace(/\D/g, "");
  };
  const validateForm = () => {
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome completo.",
        variant: "destructive"
      });
      return false;
    }
    const cleanPhone = cleanWhatsApp(whatsapp);
    if (cleanPhone.length < 10) {
      toast({
        title: "WhatsApp inválido",
        description: "Por favor, informe um número de WhatsApp válido.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };
  const openPdfViewer = () => {
    const rawUrl = `https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-pdfs/${pdfFilePath}`;
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  };

  // Handler for returning users - opens PDF directly without async delay
  const handleQuickAccess = () => {
    // Save lead silently in background (duplicate check is done by Supabase)
    const fullWhatsapp = `${countryCode}${cleanWhatsApp(whatsapp)}`;
    supabase.from("interessados").select("id").eq("whatsapp", fullWhatsapp).eq("passeio_id", tourId).maybeSingle().then(({
      data: existing
    }) => {
      if (!existing) {
        supabase.from("interessados").insert({
          nome: nome.trim(),
          whatsapp: fullWhatsapp,
          passeio_id: tourId,
          origem: "roteiro",
          aceite_novidades: consentimento
        });
      }
    });

    // Open PDF immediately (not blocked by popup blocker)
    openPdfViewer();
    onOpenChange(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // CRITICAL: Open PDF immediately on user click - BEFORE any async operations
    // This prevents popup blockers from blocking the window.open call
    openPdfViewer();

    // Save data to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        nome: nome.trim(),
        whatsapp: cleanWhatsApp(whatsapp),
        countryCode
      }));
    } catch (e) {
      console.error("Error saving lead data to localStorage:", e);
    }

    // Close modal
    onOpenChange(false);

    // Save lead to database in background (non-blocking)
    const fullWhatsapp = `${countryCode}${cleanWhatsApp(whatsapp)}`;
    (async () => {
      try {
        const {
          data: existing
        } = await supabase.from("interessados").select("id").eq("whatsapp", fullWhatsapp).eq("passeio_id", tourId).maybeSingle();
        if (!existing) {
          await supabase.from("interessados").insert({
            nome: nome.trim(),
            whatsapp: fullWhatsapp,
            passeio_id: tourId,
            origem: "roteiro",
            aceite_novidades: consentimento
          });
        }
      } catch (error) {
        console.error("Error saving interested lead:", error);
      }
    })();
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] p-0 overflow-hidden border-0 bg-primary rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-start gap-3">
            <img src={logoBranco} alt="Logo" className="w-12 h-12 object-contain flex-shrink-0" />
            <div>
              <DialogTitle className="text-xl font-bold text-primary-foreground leading-tight">
                Roteiro completo
              </DialogTitle>
              <p className="text-primary-foreground/80 text-sm mt-1 line-clamp-2">{tourName}</p>
            </div>
          </div>
        </div>

        {showSuccess ? <div className="px-6 pb-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-bold text-xl text-primary-foreground mb-2">Acesso liberado!</h3>
            <p className="text-primary-foreground/80 text-sm">Aproveite o roteiro. Abrindo em instantes...</p>
          </div> : <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-5">
            {hasSavedData ? <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                  <p className="text-primary-foreground text-sm">
                    Olá, <strong>{nome}</strong>! Clique abaixo para acessar o roteiro.
                  </p>
                  <button type="button" onClick={() => setHasSavedData(false)} className="text-primary-foreground/70 text-xs underline mt-1 hover:text-primary-foreground">
                    Não é você? Alterar dados
                  </button>
                </div>
                <div className="flex justify-center">
                  <Button type="button" onClick={handleQuickAccess} className="h-12 px-8 bg-white text-primary hover:bg-white/90 font-semibold text-base shadow-lg">
                    Acessar roteiro
                  </Button>
                </div>
                <p className="text-center text-primary-foreground/70 text-xs">Seus dados estão protegidos conosco.</p>
              </div> : <>
                <p className="text-primary-foreground/90 text-lg font-sans font-extrabold text-left">Acesse o PDF completo para mais informações:</p>

                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-primary-foreground font-medium">
                    Nome completo *
                  </Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required disabled={loading} maxLength={100} className="bg-white border-0 h-12 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-white/50" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-primary-foreground font-medium">
                    WhatsApp *
                  </Label>
                  <PhoneInput id="whatsapp" value={whatsapp} onChange={setWhatsapp} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="(00) 00000-0000" disabled={loading} className="[&>button]:border-0 [&>button]:bg-white [&>button]:h-12 [&>input]:border-0 [&>input]:bg-white [&>input]:h-12 bg-white rounded-md overflow-hidden border-0" />
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <Checkbox id="consentimento" checked={consentimento} onCheckedChange={checked => setConsentimento(checked === true)} disabled={loading} className="mt-1 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-primary" />
                  <div className="flex-1">
                    <Label htmlFor="consentimento" className="text-primary-foreground font-medium text-sm leading-snug cursor-pointer">
                      Quero receber novidades e próximos roteiros da Camaleão Ecoturismo
                    </Label>
                    
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button type="submit" className="h-12 px-8 bg-white text-primary hover:bg-white/90 font-semibold text-base shadow-lg" disabled={loading}>
                    {loading ? <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </> : "Acessar roteiro"}
                  </Button>
                </div>
                
              </>}
          </form>}
      </DialogContent>
    </Dialog>;
}