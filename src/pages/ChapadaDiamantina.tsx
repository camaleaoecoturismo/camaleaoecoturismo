import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TopMenu } from "@/components/TopMenu";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { TourModal } from "@/components/TourModal";
import { ReservaModal } from "@/components/ReservaModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTours, Tour } from "@/hooks/useTours";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import logoImage from "@/assets/logo.png";
import footerBanner from "@/assets/footer-banner.png";
import { 
  Mountain, 
  Users, 
  Calendar, 
  MapPin, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  MessageCircle,
  Compass,
  Heart,
  Shield,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// SEO: Define page metadata
const pageTitle = "Chapada Diamantina | Camaleão Ecoturismo";
const pageDescription = "Explore a Chapada Diamantina com quem mais entende do destino. Roteiros exclusivos, grupos especiais e experiências únicas nas mais belas paisagens do Brasil.";

const ChapadaDiamantina = () => {
  const { tours, loading } = useTours();
  
  // Filter tours related to Chapada Diamantina
  const chapadaTours = useMemo(() => {
    return tours.filter(tour => 
      tour.is_active && 
      tour.name.toLowerCase().includes('chapada') &&
      new Date(tour.start_date + 'T12:00:00') >= new Date()
    ).sort((a, b) => new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime());
  }, [tours]);

  const tourIds = useMemo(() => chapadaTours.map(t => t.id), [chapadaTours]);
  const { getCoverImage } = useTourCoverImages(tourIds);

  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaModalOpen, setReservaModalOpen] = useState(false);
  const [tourParaReserva, setTourParaReserva] = useState<Tour | null>(null);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTour, setWaitlistTour] = useState<Tour | null>(null);

  // Set page title for SEO
  useEffect(() => {
    document.title = pageTitle;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    }
  }, []);

  const handleMoreInfo = (tour: Tour) => {
    setSelectedTour(tour);
    setModalOpen(true);
  };

  const handleReservar = (tour: Tour) => {
    setTourParaReserva(tour);
    setReservaModalOpen(true);
  };

  const handleWaitlist = (tour: Tour) => {
    setWaitlistTour(tour);
    setWaitlistModalOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Roteiros por região - as 3 portas de entrada da Chapada
  const roteirosRegioes = [
    {
      id: "lencois",
      nome: "Lençóis",
      subtitulo: "A Capital do Diamante",
      descricao: "Região mais tradicional e acessível da Chapada. Ruas de pedra, casario colonial e os atrativos mais icônicos do destino. Ideal para primeira visita.",
      atrativos: [
        {
          nome: "Morro do Pai Inácio",
          descricao: "1120m de altitude com um dos visuais mais bonitos do Brasil. Cartão-postal da Chapada.",
          dificuldade: "Fácil",
          distancia: "2km"
        },
        {
          nome: "Poço Azul",
          descricao: "Caverna alagada com águas intensamente azuis. Flutuação inesquecível com snorkel.",
          dificuldade: "Fácil",
          distancia: "Sem trilha"
        },
        {
          nome: "Fazenda Pratinha",
          descricao: "TOP 3 da Chapada! Águas cristalinas, Gruta Azul, tirolesa e flutuação com tartarugas.",
          dificuldade: "Fácil",
          distancia: "Sem trilha"
        },
        {
          nome: "Gruta da Lapa Doce",
          descricao: "Segunda maior caverna do Brasil. Estalactites e estalagmites milenares.",
          dificuldade: "Fácil-Moderado",
          distancia: "4km"
        },
        {
          nome: "Cachoeira do Mosquito",
          descricao: "70m de queda em meio a grandiosos paredões rochosos. Uma das mais acessíveis.",
          dificuldade: "Fácil",
          distancia: "2km"
        },
        {
          nome: "Ribeirão do Meio",
          descricao: "Tobogã natural em pedra com piscina cristalina. Diversão garantida!",
          dificuldade: "Fácil",
          distancia: "7km"
        },
        {
          nome: "Poço do Diabo",
          descricao: "Cachoeira de 20m com tirolesa e rapel para os aventureiros.",
          dificuldade: "Fácil",
          distancia: "3km"
        }
      ],
      inclui: [
        "Transporte ida e volta com 2 motoristas",
        "3 diárias em pousada em Lençóis",
        "Café da manhã nos 3 dias",
        "Guia local nativo experiente",
        "Guia de turismo credenciado",
        "Deslocamento até os atrativos",
        "Cobertura fotográfica",
        "Seguro Aventura",
        "Pulseira de identificação",
        "Lanches na viagem"
      ],
      destaque: "Mais popular",
      cor: "from-emerald-500 to-teal-600",
      imagem: "/chapada-diamantina.jpg"
    },
    {
      id: "ibicoara",
      nome: "Ibicoara",
      subtitulo: "Portal das Cachoeiras",
      descricao: "Região sul da Chapada, famosa pelas cachoeiras monumentais e paisagens selvagens. Para quem busca natureza mais intocada.",
      atrativos: [
        {
          nome: "Cachoeira da Fumacinha",
          descricao: "Uma das trilhas mais desafiadoras e recompensadoras da Chapada. 340m de queda.",
          dificuldade: "Difícil",
          distancia: "14km"
        },
        {
          nome: "Cachoeira do Buracão",
          descricao: "Imponente queda de 85m dentro de um cânion. Imperdível!",
          dificuldade: "Moderado",
          distancia: "6km"
        },
        {
          nome: "Cachoeira da Fumegante",
          descricao: "Névoa constante que parece fumaça. Cenário surreal.",
          dificuldade: "Moderado",
          distancia: "4km"
        },
        {
          nome: "Cachoeira do Licuri",
          descricao: "Poço perfeito para banho cercado por vegetação nativa.",
          dificuldade: "Fácil",
          distancia: "2km"
        }
      ],
      inclui: [
        "Transporte ida e volta",
        "Hospedagem em pousada local",
        "Café da manhã",
        "Guia local especializado",
        "Deslocamento interno",
        "Cobertura fotográfica",
        "Seguro Aventura"
      ],
      destaque: null,
      cor: "from-blue-500 to-indigo-600",
      imagem: "/cachoeiras-bonito.jpg"
    },
    {
      id: "mucuge",
      nome: "Mucugê",
      subtitulo: "A Joia Histórica",
      descricao: "Cidade histórica tombada pelo patrimônio, cercada por trilhas espetaculares e campos de sempre-vivas. Charme e natureza em equilíbrio.",
      atrativos: [
        {
          nome: "Cachoeira dos Cristais",
          descricao: "Sequência de quedas d'água e poços cristalinos para banho.",
          dificuldade: "Fácil",
          distancia: "3km"
        },
        {
          nome: "Cemitério Bizantino",
          descricao: "Único no Brasil, com arquitetura única e vista panorâmica da cidade.",
          dificuldade: "Fácil",
          distancia: "Sem trilha"
        },
        {
          nome: "Projeto Sempre Viva",
          descricao: "Campos de flores nativas e educação ambiental.",
          dificuldade: "Fácil",
          distancia: "Sem trilha"
        },
        {
          nome: "Cachoeira do Tiburtino",
          descricao: "Queda d'água próxima à cidade, ótima para banho.",
          dificuldade: "Fácil",
          distancia: "2km"
        }
      ],
      inclui: [
        "Transporte ida e volta",
        "Hospedagem em pousada histórica",
        "Café da manhã",
        "Guia local",
        "Deslocamento interno",
        "Cobertura fotográfica",
        "Seguro Aventura"
      ],
      destaque: null,
      cor: "from-amber-500 to-orange-600",
      imagem: "/vale-catimbau.jpg"
    }
  ];

  // Differentials
  const diferenciais = [
    {
      titulo: "Curadoria de Roteiros",
      descricao: "Cada passeio é pensado para proporcionar a melhor experiência, com equilíbrio entre aventura e contemplação.",
      icon: Star
    },
    {
      titulo: "Equipe Experiente",
      descricao: "Guias certificados e apaixonados pelo destino, com anos de vivência na região.",
      icon: Users
    },
    {
      titulo: "Organização Completa",
      descricao: "Transporte, hospedagem, alimentação e logística. Você só precisa aproveitar.",
      icon: Shield
    },
    {
      titulo: "Grupos Especiais",
      descricao: "Viajantes com o mesmo perfil, criando conexões e amizades para a vida toda.",
      icon: Heart
    }
  ];

  // Testimonials
  const depoimentos = [
    {
      nome: "Mariana Silva",
      texto: "A melhor viagem da minha vida! A organização impecável e os guias maravilhosos fizeram toda a diferença.",
      local: "São Paulo, SP"
    },
    {
      nome: "Pedro Henrique",
      texto: "Já viajei várias vezes com a Camaleão e sempre superam as expectativas. A Chapada foi inesquecível!",
      local: "Belo Horizonte, MG"
    },
    {
      nome: "Ana Carolina",
      texto: "Paisagens de tirar o fôlego, grupo incrível e memórias para sempre. Recomendo demais!",
      local: "Recife, PE"
    }
  ];

  // State for selected region tab
  const [selectedRegion, setSelectedRegion] = useState("lencois");

  const formatDate = (dateStr: string, endDateStr?: string | null) => {
    const startDate = new Date(dateStr);
    const formattedStart = format(startDate, "dd 'de' MMMM", { locale: ptBR });
    
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      const formattedEnd = format(endDate, "dd 'de' MMMM", { locale: ptBR });
      return `${formattedStart} a ${formattedEnd}`;
    }
    
    return formattedStart;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Menu */}
      <TopMenu className="bg-background border-b" />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('/chapada-diamantina.jpg')`,
            filter: 'brightness(0.6)'
          }}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/90 text-white px-4 py-1.5 text-sm">
            Destino Carro-Chefe
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Chapada Diamantina
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-4 max-w-2xl mx-auto">
            com a Camaleão Ecoturismo
          </p>
          
          <p className="text-base md:text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Descubra um dos destinos mais espetaculares do Brasil com quem mais entende do assunto
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
              onClick={() => scrollToSection('datas')}
            >
              Ver roteiros e datas
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
              onClick={() => window.open('https://wa.me/5581999999999?text=Olá! Gostaria de saber mais sobre a Chapada Diamantina', '_blank')}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com atendimento
            </Button>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Sobre o Destino */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Sobre a Chapada Diamantina
          </h2>
          
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-lg leading-relaxed mb-6">
              Localizada no coração da Bahia, a <strong className="text-foreground">Chapada Diamantina</strong> é um dos 
              destinos naturais mais impressionantes do Brasil. Com uma extensão de mais de 38 mil km², 
              o Parque Nacional abriga uma diversidade extraordinária de paisagens.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              <strong className="text-foreground">Cachoeiras majestosas</strong>, cânions profundos, cavernas milenares, 
              <strong className="text-foreground"> vales verdejantes</strong> e picos que tocam as nuvens. Cada trilha revela 
              um novo espetáculo da natureza, convidando você a uma jornada de descobertas e reconexão.
            </p>
            
            <p className="text-lg leading-relaxed">
              As vilas históricas de <strong className="text-foreground">Lençóis, Igatu, Mucugê e Vale do Capão</strong> guardam 
              a memória dos tempos do garimpo de diamantes e oferecem uma hospitalidade única, com gastronomia local 
              autêntica e um ritmo de vida que convida à contemplação.
            </p>
          </div>
        </div>
      </section>

      {/* Por que viajar com a Camaleão */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Por que viajar para a Chapada com a Camaleão
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mais de 10 anos de experiência levando grupos para vivenciarem o melhor deste destino
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {diferenciais.map((diferencial, index) => (
              <Card key={index} className="border-0 shadow-sm bg-background hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <diferencial.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{diferencial.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{diferencial.descricao}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Nossos Roteiros - 3 Regiões */}
      <section id="roteiros" className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nossos Roteiros na Chapada
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Três regiões, três experiências únicas. Escolha a sua porta de entrada para este paraíso.
            </p>
          </div>
          
          {/* Region Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {roteirosRegioes.map((regiao) => (
              <Button
                key={regiao.id}
                variant={selectedRegion === regiao.id ? "default" : "outline"}
                size="lg"
                onClick={() => setSelectedRegion(regiao.id)}
                className="min-w-[140px]"
              >
                {regiao.nome}
                {regiao.destaque && (
                  <Badge variant="secondary" className="ml-2 text-xs">{regiao.destaque}</Badge>
                )}
              </Button>
            ))}
          </div>
          
          {/* Selected Region Content */}
          {roteirosRegioes.filter(r => r.id === selectedRegion).map((regiao) => (
            <div key={regiao.id} className="space-y-8">
              {/* Region Header */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden shadow-lg">
                  <img 
                    src={regiao.imagem} 
                    alt={regiao.nome}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${regiao.cor} opacity-40`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h3 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{regiao.nome}</h3>
                      <p className="text-xl opacity-90 drop-shadow-md">{regiao.subtitulo}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-lg text-muted-foreground mb-6">
                    {regiao.descricao}
                  </p>
                  
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    O que está incluso
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {regiao.inclui.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Attractions Grid */}
              <div>
                <h4 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Principais Atrativos
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {regiao.atrativos.map((atrativo, idx) => (
                    <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-foreground mb-2">{atrativo.nome}</h5>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{atrativo.descricao}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <Badge variant="outline" className="font-normal">
                            {atrativo.dificuldade}
                          </Badge>
                          {atrativo.distancia !== "Sem trilha" && (
                            <span className="text-muted-foreground">{atrativo.distancia}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* CTA for this region */}
              <div className="text-center pt-6">
                <Button 
                  size="lg"
                  onClick={() => scrollToSection('datas')}
                  className="px-8"
                >
                  Ver datas para {regiao.nome}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Datas Disponíveis */}
      <section id="datas" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Próximas Datas Disponíveis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Confira as próximas viagens para a Chapada Diamantina
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando datas...</p>
            </div>
          ) : chapadaTours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapadaTours.slice(0, 6).map((tour) => {
                const coverImageData = getCoverImage(tour.id);
                const coverImage = coverImageData?.imageUrl || '/chapada-diamantina.jpg';
                const isEsgotado = tour.vagas_fechadas;
                
                return (
                  <Card 
                    key={tour.id} 
                    className="border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => handleMoreInfo(tour)}
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={coverImage} 
                        alt={tour.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Date badge */}
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-white/90 text-foreground text-xs px-2 py-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(tour.start_date, tour.end_date)}
                        </Badge>
                      </div>
                      
                      {isEsgotado && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{tour.name}</h3>
                      
                      {tour.valor_padrao && tour.valor_padrao > 0 && (
                        <p className="text-lg font-bold text-primary mb-3">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tour.valor_padrao)}
                        </p>
                      )}
                      
                      <Button 
                        className="w-full"
                        variant={isEsgotado ? "outline" : "default"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEsgotado) {
                            handleWaitlist(tour);
                          } else {
                            handleReservar(tour);
                          }
                        }}
                      >
                        {isEsgotado ? "Lista de Espera" : "Reservar Vaga"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-background rounded-lg">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Novas datas em breve</h3>
              <p className="text-muted-foreground mb-6">
                Entre em contato para ser avisado sobre as próximas viagens
              </p>
              <Button 
                onClick={() => window.open('https://wa.me/5581999999999?text=Olá! Gostaria de ser avisado sobre as próximas datas para a Chapada Diamantina', '_blank')}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Entrar em contato
              </Button>
            </div>
          )}
          
          {chapadaTours.length > 6 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg" onClick={() => window.location.href = '/'}>
                Ver todas as datas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Para quem é */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Para Quem é Essa Experiência
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🥾</div>
                <h3 className="font-semibold text-foreground mb-2">Aventureiros</h3>
                <p className="text-sm text-muted-foreground">
                  Para quem gosta de trilhas moderadas a intensas e não tem medo de desafios
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">📸</div>
                <h3 className="font-semibold text-foreground mb-2">Contemplativos</h3>
                <p className="text-sm text-muted-foreground">
                  Para quem busca paisagens únicas, momentos de silêncio e conexão com a natureza
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="font-semibold text-foreground mb-2">Sociáveis</h3>
                <p className="text-sm text-muted-foreground">
                  Para quem gosta de viajar em grupo e fazer novas amizades pelo caminho
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-10 p-6 bg-primary/5 rounded-xl border border-primary/10">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Níveis de dificuldade
            </h3>
            <p className="text-muted-foreground">
              Oferecemos roteiros com diferentes níveis de exigência física. Desde caminhadas leves 
              até travessias desafiadoras, há uma opção ideal para você. Consulte nossa equipe para 
              encontrar o roteiro perfeito para seu condicionamento.
            </p>
          </div>
        </div>
      </section>

      {/* Como funcionam as viagens */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como Funcionam as Viagens
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              { 
                step: "1", 
                titulo: "Escolha seu roteiro", 
                descricao: "Selecione a data e o tipo de experiência que mais combina com você" 
              },
              { 
                step: "2", 
                titulo: "Reserve sua vaga", 
                descricao: "Faça sua inscrição online com pagamento seguro via PIX ou cartão" 
              },
              { 
                step: "3", 
                titulo: "Receba as informações", 
                descricao: "Você receberá todos os detalhes: o que levar, ponto de encontro e cronograma" 
              },
              { 
                step: "4", 
                titulo: "Embarque na aventura", 
                descricao: "Transporte, guias, hospedagem e refeições — tudo organizado para você aproveitar" 
              }
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.titulo}</h3>
                  <p className="text-muted-foreground">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              O Que Dizem Nossos Viajantes
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {depoimentos.map((depoimento, index) => (
              <Card key={index} className="border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{depoimento.texto}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{depoimento.nome}</p>
                    <p className="text-sm text-muted-foreground">{depoimento.local}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <div className="inline-flex items-center gap-6 text-muted-foreground">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">100+</p>
                <p className="text-sm">Grupos realizados</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">2000+</p>
                <p className="text-sm">Viajantes</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">10+</p>
                <p className="text-sm">Anos de experiência</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Conhecer a Chapada Diamantina?
          </h2>
          <p className="text-lg opacity-90 mb-10 max-w-2xl mx-auto">
            Escolha sua data, reserve sua vaga e prepare-se para uma experiência transformadora
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="px-8 py-6 text-lg"
              onClick={() => scrollToSection('datas')}
            >
              Ver roteiros disponíveis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
              onClick={() => window.open('https://wa.me/5581999999999?text=Olá! Gostaria de saber mais sobre a Chapada Diamantina', '_blank')}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="Camaleão Ecoturismo" className="h-12 w-auto brightness-0 invert" />
              <div>
                <p className="font-semibold">Camaleão Ecoturismo</p>
                <p className="text-sm opacity-70">Aventuras que transformam</p>
              </div>
            </div>
            
            <div className="flex gap-6 text-sm opacity-70">
              <a href="/" className="hover:opacity-100 transition-opacity">Início</a>
              <a href="#datas" onClick={(e) => { e.preventDefault(); scrollToSection('datas'); }} className="hover:opacity-100 transition-opacity">Datas</a>
              <a href="https://wa.me/5581999999999" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">Contato</a>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm opacity-50">
            © {new Date().getFullYear()} Camaleão Ecoturismo. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Floating Contact Button */}
      <FloatingContactButton />

      {/* Modals */}
      {selectedTour && (
        <TourModal
          tour={selectedTour}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedTour(null);
          }}
          onReservar={(tour) => {
            setModalOpen(false);
            handleReservar(tour);
          }}
        />
      )}

      {tourParaReserva && (
        <ReservaModal
          tour={tourParaReserva}
          isOpen={reservaModalOpen}
          onClose={() => {
            setReservaModalOpen(false);
            setTourParaReserva(null);
          }}
        />
      )}

      {waitlistTour && (
        <WaitlistModal
          open={waitlistModalOpen}
          onOpenChange={(open) => {
            setWaitlistModalOpen(open);
            if (!open) setWaitlistTour(null);
          }}
          tourId={waitlistTour.id}
          tourName={waitlistTour.name}
        />
      )}
    </div>
  );
};

export default ChapadaDiamantina;
