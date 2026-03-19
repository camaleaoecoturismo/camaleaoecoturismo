import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Route, Package, MapPin, Backpack, FileText, ShoppingCart, MessageCircle, CreditCard, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { TourBoardingPointsDisplay } from "./TourBoardingPointsDisplay";
import { Tour } from '@/hooks/useTours';
import DOMPurify from 'dompurify';
import { useAnalytics } from '@/hooks/useAnalyticsTracking';
import { PixIcon } from "@/components/icons/PixIcon";
interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
  onReservar?: (tour: Tour) => void;
}
export function TourModal({
  isOpen,
  onClose,
  tour,
  onReservar
}: TourModalProps) {
  const [showSimulation, setShowSimulation] = useState<{
    [key: number]: boolean;
  }>({});
  const [activeTab, setActiveTab] = useState('about');
  const analytics = useAnalytics();

  // Track modal open/close
  useEffect(() => {
    if (isOpen && tour) {
      analytics.trackModalOpen('tour_info', tour.id, tour.name);
      analytics.trackTabChange('tour_info', 'about');
      setActiveTab('about');
    }
    return () => {
      if (isOpen) {
        analytics.trackModalClose('tour_info');
      }
    };
  }, [isOpen, tour]);

  // Track tab changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    analytics.trackTabChange('tour_info', tabValue);
  };

  if (!tour) return null;

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  // Formatar data baseado na nova estrutura
  const formatTourDate = () => {
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const startDate = new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR');
      const endDate = new Date(tour.end_date + 'T12:00:00').toLocaleDateString('pt-BR');
      return `${startDate} a ${endDate}`;
    }
    return new Date(tour.start_date + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  // Pegar a primeira opção de preço para exibir
  const defaultPricing = tour.pricing_options?.[0] || {
    pix_price: 0,
    card_price: 0,
    option_name: 'Padrão'
  };

  // Função para reservar no WhatsApp
  const handleReserveWhatsApp = () => {
    const tourDate = formatTourDate();
    let priceInfo = '';
    if (tour.pricing_options?.length > 1) {
      priceInfo = '\n💰 Opções de preços:\n';
      tour.pricing_options.forEach(option => {
        priceInfo += `• ${option.option_name}: ${formatCurrency(option.pix_price)} (PIX) ou ${formatCurrency(option.card_price)} (Cartão)\n`;
      });
    } else {
      priceInfo = `\n💰 ${formatCurrency(defaultPricing.pix_price)} (PIX) ou ${formatCurrency(defaultPricing.card_price)} (Cartão)`;
    }
    const message = `Olá! 🌟\n\nGostaria de reservar uma vaga para:\n\n*${tour.name}*\n📅 ${tourDate}\n🏙️ ${tour.city}${priceInfo}\n\nPoderia me ajudar com a reserva? 😊`;
    const whatsappUrl = `https://wa.me/5582993649454?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Função para abrir o PDF do roteiro
  const handleOpenPdf = () => {
    if (tour.pdf_file_path) {
      const pdfUrl = `https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-pdfs/${tour.pdf_file_path}`;
      window.open(pdfUrl, '_blank');
    }
  };

  // Função para falar com atendente no WhatsApp
  const handleContactWhatsApp = () => {
    const tourDate = formatTourDate();
    const message = `Olá!\n\nEstou vendo informações sobre o passeio:\n\n*${tour.name}*\n${tourDate}\n${tour.city}, ${tour.state}\n\nGostaria de falar com um atendente para esclarecer algumas dúvidas. Poderia me ajudar?`;
    const whatsappUrl = `https://wa.me/5582993649454?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Helper functions for text parsing
  const parseList = (text: string | null) => {
    if (!text) return [];
    return text.split('\n').filter(item => item.trim());
  };
  return <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-4xl mx-auto max-h-[85vh] sm:max-h-[90vh] overflow-hidden bg-slate-50 border border-slate-200 shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-300 top-4 left-1/2 -translate-x-1/2 translate-y-0 flex flex-col">
        <DialogHeader className="pb-3 relative flex-shrink-0">
          <Button onClick={onClose} variant="ghost" size="sm" className="absolute right-0 top-0 h-6 w-6 p-0 text-base bg-transparent text-purple-600">
            
          </Button>
          <DialogTitle className="text-card-foreground text-lg font-bold leading-tight pr-8">
            {tour.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto scrollbar-smooth" style={{
        scrollBehavior: 'smooth'
      }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Primeira linha de abas com wrap responsivo */}
            <div className="flex flex-wrap gap-1 sm:gap-0.5 mb-2">
              <TabsList className="flex flex-wrap w-full gap-1 sm:grid sm:grid-cols-3 sm:gap-0.5 h-auto p-0.5 bg-slate-100 rounded-lg">
                <TabsTrigger value="about" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <Info className="w-3 h-3 mr-0.5" />
                  <span className="hidden xs:inline">Sobre</span>
                  <span className="xs:hidden">Sobre</span>
                </TabsTrigger>
                <TabsTrigger value="itinerary" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <Route className="w-3 h-3 mr-0.5" />
                  <span className="hidden xs:inline">Itinerário</span>
                  <span className="xs:hidden">Rota</span>
                </TabsTrigger>
                <TabsTrigger value="includes" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <Package className="w-3 h-3 mr-0.5" />
                  Incluso
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Segunda linha de abas com wrap responsivo */}
            <div className="flex flex-wrap gap-1 sm:gap-0.5 mb-4">
              <TabsList className="flex flex-wrap w-full gap-1 sm:grid sm:grid-cols-3 sm:gap-0.5 h-auto p-0.5 bg-slate-100 rounded-lg">
                <TabsTrigger value="departures" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <MapPin className="w-3 h-3 mr-0.5" />
                  <span className="hidden xs:inline">Embarques</span>
                  <span className="xs:hidden">Embarques</span>
                </TabsTrigger>
                <TabsTrigger value="bring" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <Backpack className="w-3 h-3 mr-0.5" />
                  <span className="hidden xs:inline">O que levar</span>
                  <span className="xs:hidden">O que levar</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-xs py-1.5 px-2 sm:px-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-black data-[state=inactive]:bg-slate-50 font-medium transition-all rounded flex-1 sm:flex-none">
                  <FileText className="w-3 h-3 mr-0.5" />
                  Valores
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="px-1 pb-4">
              <TabsContent value="about" className="space-y-4 mt-0">
                <div className="text-sm text-card-foreground leading-relaxed" dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(tour.about || 'Informações sobre o passeio não disponíveis.', {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'style']
                })
              }} />
              </TabsContent>
              
              <TabsContent value="itinerary" className="space-y-4 mt-0">
                <div className="text-sm text-card-foreground leading-relaxed" dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(tour.itinerary || 'Itinerário não disponível.', {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'style']
                })
              }} />
              </TabsContent>
              
              <TabsContent value="includes" className="space-y-4 mt-0">
                <div>
                  <h4 className="font-semibold text-sm text-card-foreground mb-3 flex items-center">
                    <span className="text-success mr-2">✅</span>
                    Incluso:
                  </h4>
                  <div className="text-sm text-card-foreground leading-relaxed" dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(tour.includes || 'Informações sobre itens inclusos não disponíveis.', {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'style']
                  })
                }} />
                </div>
                
                {tour.not_includes && <div className="mt-4">
                    <h4 className="font-semibold text-sm text-card-foreground mb-3 flex items-center">
                      <span className="text-destructive mr-2">❌</span>
                      Não incluso:
                    </h4>
                    <div className="text-sm text-card-foreground leading-relaxed" dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(tour.not_includes || '', {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'style']
                  })
                }} />
                  </div>}
              </TabsContent>
              
              <TabsContent value="departures" className="space-y-4 mt-0">
                <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
              </TabsContent>
              
              <TabsContent value="bring" className="space-y-4 mt-0">
                <div className="text-sm text-card-foreground leading-relaxed" dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(tour.what_to_bring || 'Informações sobre o que levar não disponíveis.', {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'style']
                })
              }} />
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <h4 className="font-bold text-base text-card-foreground text-center flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Escolha seu pacote
                  </h4>
                  
                  {/* Mostrar opções de preços se disponíveis */}
{tour.pricing_options && tour.pricing_options.length > 0 && (
                    <div className="grid gap-3">
                      {tour.pricing_options.map((option, index) => {
                        // Fatores multiplicadores para parcelamento
                        const fatoresMultiplicadores: Record<number, number> = {
                          1: 1.0438,
                          2: 1.0648,
                          3: 1.0754,
                          4: 1.0859,
                          5: 1.0965,
                          6: 1.1071,
                          7: 1.1440,
                          8: 1.1550,
                          9: 1.1662,
                          10: 1.1773,
                          11: 1.1886,
                          12: 1.1999
                        };
                        const valorTotal12x = option.pix_price * fatoresMultiplicadores[12];
                        const valor12x = valorTotal12x / 12;
                        
                        return (
                          <div 
                            key={index} 
                            className="relative bg-white border-2 border-purple-100 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300"
                          >
                            {/* Header do pacote */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-lg text-slate-800">{option.option_name}</h5>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Preços em cards lado a lado */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* PIX Card */}
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-2">
                                    <PixIcon size={16} className="text-green-600" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                                      PIX
                                    </span>
                                  </div>
                                  <span className="text-2xl font-extrabold text-green-600 block">
                                    {formatCurrency(option.pix_price)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Cartão Card */}
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                                      CARTÃO
                                    </span>
                                  </div>
                                  <span className="text-lg font-extrabold text-blue-600 block">
                                    12x de {formatCurrency(valor12x)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Botão de simulação */}
                            <button
                              onClick={() => setShowSimulation(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 mt-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors border border-purple-100"
                            >
                              <CreditCard className="w-4 h-4" />
                              {showSimulation[index] ? 'Ocultar simulação de parcelas' : 'Ver simulação de parcelas'}
                              {showSimulation[index] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* Tabela de simulação (colapsável) */}
                            {showSimulation[index] && (
                              <div className="mt-3 border border-purple-100 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gradient-to-r from-purple-600 to-purple-700">
                                      <th className="py-2.5 px-3 text-left font-semibold text-white">Parcelas</th>
                                      <th className="py-2.5 px-3 text-left font-semibold text-white">Valor/Mês</th>
                                      <th className="py-2.5 px-3 text-left font-semibold text-white">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(fatoresMultiplicadores).map(([parcelas, fator], rowIndex) => {
                                      const valorTotalComJuros = option.pix_price * fator;
                                      const valorParcela = valorTotalComJuros / parseInt(parcelas);
                                      return (
                                        <tr 
                                          key={parcelas} 
                                          className={`border-b border-purple-50 last:border-b-0 ${
                                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-purple-50/50'
                                          } hover:bg-purple-100/50 transition-colors`}
                                        >
                                          <td className="py-2 px-3 font-semibold text-purple-700">{parcelas}x</td>
                                          <td className="py-2 px-3 text-slate-700">{formatCurrency(valorParcela)}</td>
                                          <td className="py-2 px-3 text-slate-600">{formatCurrency(valorTotalComJuros)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Dica:</strong> Garanta sua vaga com pelo menos 30% de entrada pelo PIX. Se preferir, parcele o restante.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Botões fixos no rodapé */}
        <div className="flex flex-col xs:flex-row gap-1.5 pt-4 border-t border-border flex-shrink-0 bg-slate-50">
          {tour.pdf_file_path && <Button onClick={handleOpenPdf} variant="outline" className="flex-1 text-white bg-purple-600 border-purple-600 hover:bg-purple-700 font-medium py-2 text-xs leading-tight text-center">
              <div className="flex items-center justify-center gap-1">
                <FileText className="w-3 h-3" />
                <div className="flex flex-col xs:hidden">
                  <span className="whitespace-nowrap">Roteiro completo</span>
                </div>
                <div className="hidden xs:flex xs:flex-col">
                  <span className="whitespace-nowrap">Roteiro</span>
                  <span className="whitespace-nowrap">completo</span>
                </div>
              </div>
            </Button>}
          <Button onClick={handleContactWhatsApp} variant="outline" className="flex-1 text-white bg-green-600 border-green-600 hover:bg-green-700 font-medium py-2 text-xs leading-tight text-center">
            <div className="flex items-center justify-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.984 3.687" />
              </svg>
              <div className="flex flex-col xs:hidden">
                <span className="whitespace-nowrap">Falar com atendente</span>
              </div>
              <div className="hidden xs:flex xs:flex-col">
                <span className="whitespace-nowrap">Falar com</span>
                <span className="whitespace-nowrap">atendente</span>
              </div>
            </div>
          </Button>
          <Button onClick={() => onReservar?.(tour)} className="flex-1 font-medium py-2 text-xs bg-lime-600 hover:bg-lime-500 text-primary-foreground">
            <ShoppingCart className="w-3 h-3 mr-1" />
            Reservar
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}