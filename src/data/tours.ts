// Updated tour data with corrected dates
export interface Tour {
  id: string;
  name: string;
  date: string;
  city: string;
  pixPrice: number;
  cardPrice: number;
  month: string;
  image: string;
}

export interface TourDetails {
  id: string;
  name: string;
  about: string;
  itinerary: string;
  includes: string[];
  notIncludes: string[];
  departures: Array<{
    location: string;
    time: string;
  }>;
  whatToBring: string[];
  policy: string;
  pdfUrl: string;
  buyUrl: string;
}

export const tours: Tour[] = [
  // Agosto
  {
    id: "ago-1",
    name: "Passeio do Rio Gelado",
    date: "9 de agosto",
    city: "Jequiá da Praia - AL",
    pixPrice: 160.00,
    cardPrice: 192.00,
    month: "AGO",
    image: "/rio-gelado-novo-2025.jpg"
  },
  {
    id: "ago-2", 
    name: "Trilha dos Túneis",
    date: "17 de agosto",
    city: "Gravatá - PE",
    pixPrice: 249.00,
    cardPrice: 298.80,
    month: "AGO",
    image: "/lovable-uploads/678a7c6b-ef93-4530-945c-668861f3b087.png"
  },
  {
    id: "ago-3",
    name: "Trilha da Mata Verde",
    date: "23 de agosto", 
    city: "Maribondo - AL",
    pixPrice: 129.00,
    cardPrice: 154.80,
    month: "AGO",
    image: "/lovable-uploads/998b13cd-76f8-4633-92ce-8a393435d49d.png"
  },
  {
    id: "ago-4",
    name: "Vale do Catimbau",
    date: "30 e 31 de Agosto", 
    city: "Buíque - PE",
    pixPrice: 599.00,
    cardPrice: 718.80,
    month: "AGO",
    image: "/catimbau-novo-2025.jpg"
  },

  // Setembro
  {
    id: "set-1",
    name: "Chapada Diamantina",
    date: "12 a 16 de Setembro",
    city: "Lençóis - BA",
    pixPrice: 1599.00,
    cardPrice: 1918.80,
    month: "SET",
    image: "/lovable-uploads/112026cc-e089-4226-8c78-c0d52a3e0875.png"
  },
  {
    id: "set-2",
    name: "Trilha das Cachoeiras de Bonito",
    date: "20 de setembro",
    city: "Bonito - PE",
    pixPrice: 250.00,
    cardPrice: 300.00,
    month: "SET",
    image: "/lovable-uploads/7ef61d1a-9b56-49f8-a677-c135b6d223db.png"
  },
  {
    id: "set-3",
    name: "Trilha de Flexeiras",
    date: "21 de setembro",
    city: "Flexeiras - AL",
    pixPrice: 170.00,
    cardPrice: 204.00,
    month: "SET",
    image: "/lovable-uploads/fefc4fc1-7c79-40fe-8dc2-566ad12c9461.png"
  },
  {
    id: "set-4",
    name: "Camping de Jequiá",
    date: "27 e 28 de Setembro",
    city: "Jequiá da Praia - AL",
    pixPrice: 349.00,
    cardPrice: 418.80,
    month: "SET",
    image: "/lovable-uploads/f2fbeed0-5e2d-440b-b7b8-8244f2539ee2.png"
  },

  // Outubro
  {
    id: "out-1",
    name: "Trilha do Cacau",
    date: "5 de outubro",
    city: "Matriz de Camaragibe - AL",
    pixPrice: 175.00,
    cardPrice: 210.00,
    month: "OUT",
    image: "/lovable-uploads/055f875c-5342-478d-928b-c09c18a013cd.png"
  },
  {
    id: "out-2",
    name: "Trilha da Fazenda Guadalupe",
    date: "18 de outubro",
    city: "Boca da Mata - AL",
    pixPrice: 160.00,
    cardPrice: 192.00,
    month: "OUT",
    image: "/lovable-uploads/a8a9f4cf-5e4d-4ff8-84d6-b69acadfeab8.png"
  },
  {
    id: "out-3",
    name: "Rota das Cachoeiras do Paraíso",
    date: "19 de outubro",
    city: "São Benedito do Sul - PE",
    pixPrice: 190.00,
    cardPrice: 228.00,
    month: "OUT",
    image: "/lovable-uploads/803c0708-0cb8-4bfc-a09f-20032aba5e55.png"
  },
  {
    id: "out-4",
    name: "Cânions do São Francisco",
    date: "25 e 26 de Outubro",
    city: "Piranhas - AL",
    pixPrice: 649.00,
    cardPrice: 778.80,
    month: "OUT",
    image: "/lovable-uploads/2dc6dbb7-a6e7-4249-8b5b-31ee593ebf46.png"
  },

  // Novembro
  {
    id: "nov-1",
    name: "Trilha Cachoeira da Tiririca",
    date: "9 de novembro",
    city: "Murici - AL",
    pixPrice: 180.00,
    cardPrice: 216.00,
    month: "NOV",
    image: "/lovable-uploads/f700d5f7-d2fd-484e-a496-a06cb0cbf588.png"
  },
  {
    id: "nov-2",
    name: "Vale do Catimbau",
    date: "15 e 16 de Novembro",
    city: "Buíque - PE",
    pixPrice: 649.00,
    cardPrice: 778.80,
    month: "NOV",
    image: "/lovable-uploads/900d357c-03ee-4e0d-a029-527b165bee48.png"
  },
  {
    id: "nov-3",
    name: "Trilha do Rio São Miguel",
    date: "22 de novembro",
    city: "São Miguel dos Campos - AL",
    pixPrice: 170.00,
    cardPrice: 204.00,
    month: "NOV",
    image: "/lovable-uploads/68c6e77f-8154-4d77-a0a7-4149a1935e97.png"
  },

  // Dezembro
  {
    id: "dez-1",
    name: "Fazenda Guadalupe",
    date: "6 de dezembro",
    city: "Boca da Mata - AL",
    pixPrice: 170.00,
    cardPrice: 204.00,
    month: "DEZ",
    image: "/lovable-uploads/58e6cafb-8c69-43ac-a3ee-d302ec82a6ef.png"
  },
  {
    id: "dez-2",
    name: "Trilha das Cachoeiras de Bonito",
    date: "13 de dezembro", 
    city: "Bonito - PE",
    pixPrice: 250.00,
    cardPrice: 300.00,
    month: "DEZ",
    image: "/lovable-uploads/b100f2b4-897b-4a0a-8de2-145ca848364f.png"
  },
  {
    id: "dez-3",
    name: "CHAPADA DIAMANTINA",
    date: "27 de dez a 01 de jan",
    city: "Lençóis - BA",
    pixPrice: 1599.00,
    cardPrice: 1918.80,
    month: "DEZ",
    image: "/lovable-uploads/b0da3a86-cc9a-495d-8b71-ce10b4baa679.png"
  }
];

export const tourDetails: Record<string, TourDetails> = {
  "ago-1": {
    id: "ago-1",
    name: "Passeio do Rio Gelado",
    about: "<p><strong>Uma experiência única em Jequiá da Praia - AL</strong></p><p>O Passeio do Rio Gelado é uma <strong>experiência imersiva na natureza</strong> de Jequiá da Praia, em Alagoas, perfeita para quem deseja relaxar e se reconectar com o ambiente natural.</p><p><strong>Destaques do passeio:</strong></p><ul><li>Navegação por uma das lagoas mais preservadas do estado</li><li>Trilha leve dentro de uma Reserva Extrativista</li><li>Flutuação nas águas tranquilas do Rio Gelado</li><li>Atividade indicada para todas as idades</li></ul><p>Uma experiência que combina <strong>aventura e contemplação</strong> em um cenário paradisíaco, ideal para o primeiro contato com ecoturismo.</p>",
    itinerary: "<p><strong>Roteiro Completo do Dia:</strong></p><ul><li><strong>06h00</strong> – Início do embarque nos pontos indicados</li><li><strong>09h00</strong> – Início do passeio com barco pela Laguna de Jequiá (30min)</li><li><strong>10h00</strong> – Trilha leve de 1 km na Reserva Extrativista da Lagoa de Jequiá</li><li><strong>11h00</strong> – Flutuação pelo Rio Gelado (4 km)</li><li><strong>12h00</strong> – Banho de lagoa e descanso em rancho de pescadores</li><li><strong>12h30</strong> – Almoço regional (opcional, R$ 40,00)</li><li><strong>13h30</strong> – Retorno de barco à base de apoio</li><li><strong>16h30</strong> – Previsão de início do desembarque em Maceió</li></ul>",
    includes: [
      "Transporte ida e volta",
      "Trilha de nível fácil",
      "Passeio de barco pela lagoa",
      "Flutuação no Rio Gelado",
      "Guia de turismo credenciado",
      "Bombeiro civil para segurança",
      "Seguro Aventura",
      "Cobertura fotográfica (fotos enviadas pelo WhatsApp)"
    ],
    notIncludes: [
      "Almoço (R$ 40,00, opcional)",
      "Itens não especificados"
    ],
    departures: [
      { location: "Posto Shell (Veloz), Próx. Shopping Pátio – Antares", time: "06h00" },
      { location: "Empresarial Humberto Lobo – Serraria", time: "06h15" },
      { location: "Posto Stella Maris + GNV – Jatiúca", time: "06h30" },
      { location: "Praça da Faculdade – Prado", time: "06h50" }
    ],
    whatToBring: [
      "Mochila",
      "Roupas leves e confortáveis",
      "Camisa de manga longa e calça (cargo, tactel ou legging)",
      "Sandália, tênis e ou bota",
      "Roupa de banho",
      "Boné e protetor solar",
      "Água e lanches leves (frutas, castanhas, barras de cereal)",
      "Evitar jejum ou alimentos pesados antes da trilha"
    ],
    policy: "Política de Reservas e Cancelamento\n\nA reserva da sua vaga só é efetivada mediante pagamento, que pode ser realizado das seguintes formas:\n• Pix à vista (forma mais rápida e prática)\n• Cartão de crédito (em até 12x)\n• Pix parcelado (pelo menos 30% de entrada via Pix, dividindo o restante pela quantidade de meses que ainda restam para o evento ou quitando tudo no cartão)\n\nApós a confirmação do pagamento, enviaremos um ticket de confirmação e, próximo à viagem, você será incluído em um grupo exclusivo no WhatsApp com informações detalhadas, dicas e atualizações do passeio.\n\nCancelamento por iniciativa do cliente:\n• Você poderá substituir sua vaga por outro participante nas mesmas condições contratadas\n• Em pacotes com hospedagem, caso não seja apartamento individual, o substituto deve ser do mesmo sexo\n• Também é possível transferir sua reserva para outro passeio, mediante acordo com a agência\n• Caso nenhuma das opções seja viável, será realizado reembolso com taxa de cancelamento:\n  - Mais de 30 dias antes do passeio: taxa de 10%\n  - Entre 30 e 21 dias antes do passeio: taxa de 20%\n  - Menos de 21 dias antes: taxa de 20% + custos já pagos a fornecedores\n\nNo-Show (não comparecimento): Em caso de não comparecimento na data e horário agendados, não haverá reembolso, sendo retido 100% do valor pago.\n\nPara ler a política completa: www.camaleaoecoturismo.com/politica-de-reservas",
    pdfUrl: "https://example.com/rio-gelado.pdf",
    buyUrl: "https://wa.me/5582993649454?text=Quero%20comprar%20Rio%20Gelado"
  },
  "ago-2": {
    id: "ago-2", 
    name: "Trilha dos Túneis",
    about: "<p><strong>Aventura pelos Túneis de Gravatá - PE</strong></p><p>Explore os <strong>famosos túneis de Gravatá</strong> em uma aventura única por paisagens deslumbrantes do interior pernambucano.</p><p><strong>Experiência única:</strong></p><ul><li>Caminhada pelos túneis históricos</li><li>Paisagens montanhosas espetaculares</li><li>Contato com a história local</li><li>Fotografia em cenários únicos</li></ul>",
    itinerary: "<p><strong>Programação do Dia:</strong></p><ul><li><strong>05h00</strong> - Saída de Recife</li><li><strong>08h00</strong> - Chegada em Gravatá</li><li><strong>09h00</strong> - Início da trilha</li><li><strong>12h00</strong> - Pausa para almoço</li><li><strong>14h00</strong> - Exploração dos túneis</li><li><strong>16h00</strong> - Tempo livre para fotos</li><li><strong>17h00</strong> - Retorno para Recife</li></ul>",
    includes: [
      "Transporte",
      "Guia especializado",
      "Seguro",
      "Lanche"
    ],
    notIncludes: [
      "Alimentação completa",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "05h00" },
      { location: "Shopping Recife", time: "05h30" }
    ],
    whatToBring: [
      "Calçado de trilha",
      "Roupa confortável",
      "Protetor solar",
      "Mochila pequena",
      "Documento"
    ],
    policy: "Cancelamento até 48h antes sem custos. Sujeito a condições climáticas.",
    pdfUrl: "https://example.com/tuneis.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Interesse%20Trilha%20Túneis"
  },
  "ago-3": {
    id: "ago-3",
    name: "Trilha da Mata Verde",
    about: "<p><strong>Natureza Preservada em Maribondo - AL</strong></p><p>Aventure-se na <strong>exuberante Mata Verde de Maribondo</strong>, uma das áreas mais preservadas de Alagoas.</p><p><strong>O que você vai encontrar:</strong></p><ul><li>Trilhas em meio à mata atlântica</li><li>Fauna e flora diversificadas</li><li>Cachoeiras e riachos cristalinos</li><li>Contato direto com a natureza</li></ul>",
    itinerary: "<p><strong>Roteiro Completo:</strong></p><ul><li><strong>06h00</strong> - Saída de Maceió</li><li><strong>08h30</strong> - Chegada em Maribondo</li><li><strong>09h00</strong> - Início da trilha principal</li><li><strong>12h00</strong> - Pausa para lanche na natureza</li><li><strong>13h00</strong> - Continuação da exploração</li><li><strong>15h00</strong> - Banho de cachoeira</li><li><strong>16h00</strong> - Tempo livre</li><li><strong>17h00</strong> - Retorno para Maceió</li></ul>",
    includes: [
      "Transporte",
      "Guia local",
      "Seguro",
      "Lanche de trilha"
    ],
    notIncludes: [
      "Alimentação completa",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h00" }
    ],
    whatToBring: [
      "Tênis ou bota de trilha",
      "Roupa leve",
      "Protetor solar",
      "Repelente",
      "Água"
    ],
    policy: "Cancelamento até 48h antes. Mínimo 6 pessoas.",
    pdfUrl: "https://example.com/mata-verde.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Trilha%20Mata%20Verde"
  },
  "ago-4": {
    id: "ago-4",
    name: "Vale do Catimbau",
    
    about: "<p><strong>Vale do Catimbau - Buíque, PE</strong></p><p>Explore o <strong>incrível Vale do Catimbau</strong> com suas formações rochosas únicas e paisagens de tirar o fôlego.</p><p><strong>Duas modalidades disponíveis:</strong></p><ul><li><strong>Hospedagem em pousada</strong> - Conforto e comodidade</li><li><strong>Camping</strong> - Experiência mais selvagem</li></ul><p><strong>Destaques:</strong></p><ul><li>Formações rochosas milenares</li><li>Trilhas de diferentes níveis</li><li>Arte rupestre</li><li>Fauna e flora do caatinga</li></ul>",
    itinerary: "<p><strong>Programação de 2 Dias:</strong></p><p><strong>Dia 1:</strong></p><ul><li>Saída de Recife pela manhã</li><li>Chegada e acomodação</li><li>Trilhas principais do vale</li><li>Pernoite (pousada ou camping)</li></ul><p><strong>Dia 2:</strong></p><ul><li>Café da manhã</li><li>Trilhas complementares</li><li>Banhos em cachoeiras</li><li>Retorno para Recife</li></ul>",
    includes: [
      "Transporte",
      "Guia especializado",
      "Hospedagem/camping",
      "Seguro",
      "Café da manhã"
    ],
    notIncludes: [
      "Algumas refeições",
      "Equipamentos de camping pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupas para 2 dias",
      "Calçado de trilha",
      "Protetor solar",
      "Medicamentos pessoais",
      "Saco de dormir (camping)"
    ],
    policy: "Cancelamento até 7 dias antes. Duas opções de acomodação disponíveis.",
    pdfUrl: "https://example.com/catimbau.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Interesse%20Vale%20Catimbau"
  },
  "set-1": {
    id: "set-1",
    name: "Chapada Diamantina",
    about: "<p><strong>Expedição Chapada Diamantina - 5 Dias</strong></p><p>Uma <strong>expedição completa de 5 dias</strong> pela majestosa Chapada Diamantina, explorando cachoeiras, poços cristalinos e paisagens de tirar o fôlego.</p><p><strong>Destaques da expedição:</strong></p><ul><li>Cachoeira da Fumaça (2ª maior do Brasil)</li><li>Poço Azul e Poço Encantado</li><li>Gruta da Lapa Doce</li><li>Vale do Pati</li><li>Morro do Pai Inácio</li></ul><p>Uma experiência <strong>transformadora</strong> em um dos destinos mais espetaculares do Brasil.</p>",
    itinerary: "<p><strong>Programação de 5 Dias:</strong></p><p><strong>Dia 1:</strong></p><ul><li>Viagem Salvador - Lençóis</li><li>Check-in na hospedagem</li><li>Trilha do Morro do Pai Inácio</li><li>Pôr do sol panorâmico</li></ul><p><strong>Dia 2:</strong></p><ul><li>Cachoeira da Fumaça</li><li>Trilha de 6km (ida e volta)</li><li>Almoço na trilha</li></ul><p><strong>Dia 3:</strong></p><ul><li>Poço Azul (flutuação)</li><li>Poço Encantado</li><li>Tarde livre em Lençóis</li></ul><p><strong>Dia 4:</strong></p><ul><li>Gruta da Lapa Doce</li><li>Trilha do Ribeirão do Meio</li><li>Tobogã natural</li></ul><p><strong>Dia 5:</strong></p><ul><li>Café da manhã</li><li>Check-out</li><li>Retorno para Salvador</li></ul>",
    includes: [
      "Transporte",
      "Hospedagem",
      "Guias especializados",
      "Seguro",
      "Café da manhã"
    ],
    notIncludes: [
      "Almoços e jantares",
      "Bebidas",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Salvador Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupas para 5 dias",
      "Calçado de trilha",
      "Mochila grande",
      "Medicamentos",
      "Protetor solar"
    ],
    policy: "Cancelamento até 15 dias antes. Duas opções de acomodação.",
    pdfUrl: "https://example.com/chapada.pdf",
    buyUrl: "https://wa.me/5571999999999?text=Interesse%20Chapada%20Diamantina"
  },
  "set-2": {
    id: "set-2",
    name: "Trilha das Cachoeiras de Bonito",
    about: "<p><strong>Cachoeiras de Bonito - PE</strong></p><p>Descubra as <strong>belas cachoeiras de Bonito</strong> em Pernambuco, com banhos refrescantes e paisagens encantadoras da mata atlântica.</p><p><strong>O que te espera:</strong></p><ul><li>Múltiplas cachoeiras cristalinas</li><li>Trilhas em meio à mata atlântica</li><li>Piscinas naturais para banho</li><li>Fauna e flora preservadas</li></ul>",
    itinerary: "<p><strong>Roteiro das Cachoeiras:</strong></p><ul><li><strong>06h00</strong> - Saída de Recife</li><li><strong>09h00</strong> - Chegada em Bonito</li><li><strong>10h00</strong> - Trilha para primeira cachoeira</li><li><strong>12h00</strong> - Banho e descanso</li><li><strong>13h00</strong> - Almoço local</li><li><strong>14h00</strong> - Segunda cachoeira</li><li><strong>16h00</strong> - Tempo livre para fotos</li><li><strong>17h00</strong> - Retorno para Recife</li></ul>",
    includes: [
      "Transporte",
      "Guia local",
      "Seguro",
      "Lanche"
    ],
    notIncludes: [
      "Alimentação completa",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Tênis de trilha",
      "Protetor solar",
      "Toalha",
      "Lanche extra"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/bonito-pe.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Quero%20Cachoeiras%20Bonito"
  },
  "set-3": {
    id: "set-3",
    name: "Trilha de Flexeiras",
    about: "<p><strong>Trilha de Flexeiras - AL</strong></p><p>Uma <strong>trilha incrível em Flexeiras</strong>, Alagoas, oferecendo paisagens rurais autênticas e contato direto com a natureza do interior alagoano.</p><p><strong>Experiência rural:</strong></p><ul><li>Paisagens do interior alagoano</li><li>Contato com a vida rural</li><li>Trilhas em meio à caatinga</li><li>Cultura local preservada</li></ul>",
    itinerary: "<p><strong>Programação Rural:</strong></p><ul><li><strong>06h30</strong> - Saída de Maceió</li><li><strong>08h30</strong> - Chegada em Flexeiras</li><li><strong>09h00</strong> - Início da trilha principal</li><li><strong>12h00</strong> - Pausa para lanche rural</li><li><strong>13h00</strong> - Exploração da área</li><li><strong>15h00</strong> - Interação com comunidade local</li><li><strong>16h30</strong> - Tempo livre</li><li><strong>17h30</strong> - Retorno para Maceió</li></ul>",
    includes: [
      "Transporte",
      "Guia",
      "Seguro",
      "Lanche"
    ],
    notIncludes: [
      "Almoço",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h30" }
    ],
    whatToBring: [
      "Calçado confortável",
      "Roupa leve",
      "Chapéu",
      "Protetor solar",
      "Água"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/flexeiras.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Interesse%20Trilha%20Flexeiras"
  },
  "set-4": {
    id: "set-4",
    name: "Camping de Jequiá",
    about: "<p><strong>Camping nas Falésias de Jequiá</strong></p><p>Uma <strong>experiência de camping única</strong> nas falésias de Jequiá da Praia, com vista deslumbrante para o mar e aventura garantida.</p><p><strong>Experiência selvagem:</strong></p><ul><li>Acampamento em falésias à beira-mar</li><li>Vista panorâmica do oceano</li><li>Trilhas costeiras</li><li>Fogueira na praia</li><li>Observação de estrelas</li></ul>",
    itinerary: "<p><strong>Aventura de 2 Dias:</strong></p><p><strong>Dia 1:</strong></p><ul><li><strong>07h00</strong> - Saída de Maceió</li><li><strong>09h00</strong> - Chegada e montagem do acampamento</li><li><strong>10h30</strong> - Trilha pelas falésias</li><li><strong>12h30</strong> - Almoço no acampamento</li><li><strong>14h00</strong> - Atividades aquáticas</li><li><strong>18h00</strong> - Fogueira e jantar</li><li><strong>20h00</strong> - Observação de estrelas</li></ul><p><strong>Dia 2:</strong></p><ul><li><strong>06h00</strong> - Nascer do sol na falésia</li><li><strong>08h00</strong> - Café da manhã</li><li><strong>09h30</strong> - Desmontagem do acampamento</li><li><strong>11h00</strong> - Última trilha</li><li><strong>14h00</strong> - Retorno para Maceió</li></ul>",
    includes: [
      "Transporte",
      "Equipamentos de camping",
      "Guia",
      "Seguro",
      "Café da manhã"
    ],
    notIncludes: [
      "Refeições principais",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "07h00" }
    ],
    whatToBring: [
      "Roupas para 2 dias",
      "Saco de dormir próprio",
      "Lanterna",
      "Protetor solar",
      "Repelente"
    ],
    policy: "Cancelamento até 7 dias antes. Sujeito a condições climáticas.",
    pdfUrl: "https://example.com/camping-falesias.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Camping%20Falésias"
  },
  "out-1": {
    id: "out-1",
    name: "Trilha do Cacau",
    about: "Conheça a trilha histórica do cacau em Matriz de Camaragibe, mergulhando na cultura local e paisagens rurais.",
    itinerary: "06h00 - Saída | 08h00 - Chegada | 09h00 - Trilha do cacau | 12h00 - Almoço rural | 15h00 - Atividades | 17h00 - Retorno",
    includes: [
      "Transporte",
      "Guia local",
      "Almoço rural",
      "Seguro"
    ],
    notIncludes: [
      "Bebidas",
      "Compras pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupa confortável",
      "Calçado fechado",
      "Protetor solar",
      "Repelente",
      "Câmera"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/trilha-cacau.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Trilha%20Cacau"
  },
  "out-2": {
    id: "out-2",
    name: "Trilha da Fazenda Guadalupe",
    about: "Uma experiência rural completa na Fazenda Guadalupe, com trilhas, atividades rurais e contato com a natureza.",
    itinerary: "06h30 - Saída | 08h30 - Chegada | 09h00 - Trilha | 12h00 - Atividades rurais | 15h00 - Banho no açude | 17h00 - Retorno",
    includes: [
      "Transporte",
      "Guia",
      "Lanche rural",
      "Seguro"
    ],
    notIncludes: [
      "Almoço",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h30" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Calçado apropriado",
      "Protetor solar",
      "Toalha",
      "Roupa extra"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/fazenda-guadalupe.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Interesse%20Fazenda%20Guadalupe"
  },
  "out-3": {
    id: "out-3",
    name: "Rota das Cachoeiras do Paraíso",
    about: "Descubra o paraíso das cachoeiras em São Benedito do Sul, com múltiplas quedas d'água e piscinas naturais.",
    itinerary: "05h30 - Saída | 08h30 - Primeira cachoeira | 11h00 - Segunda cachoeira | 14h00 - Terceira cachoeira | 17h00 - Retorno",
    includes: [
      "Transporte",
      "Guia especializado",
      "Lanche",
      "Seguro"
    ],
    notIncludes: [
      "Almoço",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "05h30" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Tênis de trilha",
      "Protetor solar",
      "Toalha",
      "Mochila à prova d'água"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/cachoeiras-paraiso.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Quero%20Cachoeiras%20Paraíso"
  },
  "out-4": {
    id: "out-4",
    name: "Cânions do São Francisco",
    about: "Uma expedição pelos impressionantes cânions do Rio São Francisco em Piranhas, com passeio de catamarã e paisagens únicas.",
    itinerary: "Dia 1: Chegada, catamarã, hospedagem | Dia 2: Trilhas nos cânions, atividades, retorno",
    includes: [
      "Transporte",
      "Hospedagem",
      "Passeio de catamarã",
      "Guias",
      "Seguro"
    ],
    notIncludes: [
      "Algumas refeições",
      "Bebidas",
      "Atividades extras"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupas para 2 dias",
      "Protetor solar",
      "Óculos de sol",
      "Medicamentos",
      "Câmera"
    ],
    policy: "Cancelamento até 7 dias antes. Duas opções de acomodação.",
    pdfUrl: "https://example.com/canions-sao-francisco.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Interesse%20Cânions%20São%20Francisco"
  },
  "nov-1": {
    id: "nov-1",
    name: "Trilha Cachoeira da Tiririca",
    about: "Uma das mais belas cachoeiras de Alagoas, localizada em Murici, com trilha moderada e banho refrescante.",
    itinerary: "06h00 - Saída | 08h00 - Chegada | 09h00 - Início da trilha | 11h00 - Cachoeira | 15h00 - Retorno da trilha | 17h00 - Volta",
    includes: [
      "Transporte",
      "Guia especializado",
      "Seguro",
      "Lanche de trilha"
    ],
    notIncludes: [
      "Alimentação completa",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Calçado de trilha",
      "Protetor solar",
      "Toalha",
      "Mochila pequena"
    ],
    policy: "Cancelamento até 48h antes. Trilha de nível moderado.",
    pdfUrl: "https://example.com/tiririca.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Cachoeira%20Tiririca"
  },
  "nov-2": {
    id: "nov-2",
    name: "Vale do Catimbau",
    about: "Retorno ao Vale do Catimbau com novas trilhas e experiências. Duas modalidades: pousada ou camping.",
    itinerary: "Dia 1: Saída, chegada, trilhas diferentes, pernoite | Dia 2: Novas explorações, atividades, retorno",
    includes: [
      "Transporte",
      "Hospedagem/camping",
      "Guias",
      "Seguro",
      "Café da manhã"
    ],
    notIncludes: [
      "Algumas refeições",
      "Equipamentos de camping pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupas para 2 dias",
      "Calçado de trilha",
      "Protetor solar",
      "Medicamentos pessoais",
      "Saco de dormir (camping)"
    ],
    policy: "Cancelamento até 7 dias antes. Duas opções de hospedagem.",
    pdfUrl: "https://example.com/catimbau-nov.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Interesse%20Vale%20Catimbau%20Nov"
  },
  "nov-3": {
    id: "nov-3",
    name: "Trilha do Rio São Miguel",
    about: "Explore as margens do Rio São Miguel em uma trilha única por São Miguel dos Campos, com paisagens ribeirinhas.",
    itinerary: "06h30 - Saída | 08h30 - Chegada | 09h00 - Trilha do rio | 12h00 - Pausa | 15h00 - Atividades aquáticas | 17h30 - Retorno",
    includes: [
      "Transporte",
      "Guia local",
      "Seguro",
      "Lanche"
    ],
    notIncludes: [
      "Almoço",
      "Equipamentos aquáticos"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h30" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Calçado que pode molhar",
      "Protetor solar",
      "Toalha",
      "Roupa extra"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/rio-sao-miguel.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Rio%20São%20Miguel"
  },
  "nov-4": {
    id: "nov-4",
    name: "Viagem Surpresa",
    about: "Uma aventura misteriosa! O destino será revelado próximo à data da viagem. Prepare-se para uma experiência única e inesquecível.",
    itinerary: "Itinerário será revelado com antecedência de 1 semana. Prepare-se para 2 dias de aventura!",
    includes: [
      "Transporte",
      "Hospedagem",
      "Todas as atividades",
      "Guias",
      "Seguro"
    ],
    notIncludes: [
      "Algumas refeições",
      "Bebidas",
      "Compras pessoais"
    ],
    departures: [
      { location: "A definir", time: "A definir" }
    ],
    whatToBring: [
      "Roupas variadas",
      "Calçados confortáveis",
      "Protetor solar",
      "Medicamentos",
      "Espírito aventureiro"
    ],
    policy: "Cancelamento até 15 dias antes. Destino será revelado 1 semana antes.",
    pdfUrl: "https://example.com/surpresa.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Viagem%20Surpresa"
  },
  "dez-1": {
    id: "dez-1",
    name: "Trilha da Fazenda Guadalupe",
    about: "Retorno à Fazenda Guadalupe em dezembro, com atividades especiais de fim de ano e clima festivo.",
    itinerary: "06h30 - Saída | 08h30 - Chegada | 09h00 - Trilha | 12h00 - Atividades especiais | 15h00 - Confraternização | 17h00 - Retorno",
    includes: [
      "Transporte",
      "Guia",
      "Lanche especial",
      "Atividades de confraternização",
      "Seguro"
    ],
    notIncludes: [
      "Almoço",
      "Bebidas",
      "Lembranças"
    ],
    departures: [
      { location: "Maceió Centro", time: "06h30" }
    ],
    whatToBring: [
      "Roupa festiva",
      "Calçado apropriado",
      "Protetor solar",
      "Câmera",
      "Bom humor"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/guadalupe-dez.pdf",
    buyUrl: "https://wa.me/5582999999999?text=Quero%20Guadalupe%20Dezembro"
  },
  "dez-2": {
    id: "dez-2",
    name: "Trilha das Cachoeiras de Bonito",
    about: "Encerre o ano com as belas cachoeiras de Bonito, em uma experiência revigorante antes do Natal.",
    itinerary: "06h00 - Saída | 09h00 - Chegada | 10h00 - Primeira cachoeira | 13h00 - Almoço | 15h00 - Segunda cachoeira | 17h00 - Retorno",
    includes: [
      "Transporte",
      "Guia local",
      "Almoço especial",
      "Seguro"
    ],
    notIncludes: [
      "Bebidas",
      "Equipamentos pessoais"
    ],
    departures: [
      { location: "Recife Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupa de banho",
      "Tênis de trilha",
      "Protetor solar",
      "Toalha",
      "Espírito natalino"
    ],
    policy: "Cancelamento até 48h antes.",
    pdfUrl: "https://example.com/bonito-dez.pdf",
    buyUrl: "https://wa.me/5581999999999?text=Quero%20Bonito%20Dezembro"
  },
  "dez-3": {
    id: "dez-3",
    name: "Chapada Diamantina - Réveillon",
    about: "<p><strong>Réveillon na Chapada Diamantina - 6 Dias</strong></p><p>Celebre a <strong>chegada do novo ano</strong> na majestosa Chapada Diamantina! Uma experiência única de 6 dias com festa de réveillon inesquecível.</p><p><strong>Programação especial:</strong></p><ul><li>Trilhas exclusivas da temporada</li><li>Festa de réveillon em Lençóis</li><li>Shows e celebração no centro histórico</li><li>Experiência gastronômica especial</li></ul>",
    itinerary: "<p><strong>Programação Especial de 6 Dias:</strong></p><p><strong>28/12 - Domingo (Dia 1):</strong></p><ul><li><strong>Manhã:</strong> Poço Azul – flutuação em águas cristalinas (atividade leve, sem trilha)</li><li><strong>Almoço:</strong> No local</li><li><strong>Tarde:</strong> Parque da Muritiba – trilha leve passando por Serrano, Salão de Areias, Poço Halley e Cachoeirinha</li><li><strong>Fim de tarde:</strong> City Tour em Lençóis</li><li><strong>Noite:</strong> Livre na cidade</li></ul><p><strong>29/12 - Segunda-feira (Dia 2):</strong></p><ul><li><strong>Manhã:</strong> Cachoeira do Poço do Diabo (trilha de 3 km ida e volta, nível médio)</li><li><strong>Tarde:</strong> Vale das Piscinas (Rio Mucugezinho) para banho e almoço</li><li><strong>Pós-almoço:</strong> Trilha do Ribeirão do Meio (7 km ida e volta, com tobogã natural)</li><li><strong>Noite:</strong> Livre</li></ul><p><strong>30/12 - Terça-feira (Dia 3):</strong></p><ul><li><strong>Manhã:</strong> Fazenda Pratinha – flutuação, tirolesa, caiaque, gruta azul e atividades opcionais</li><li><strong>Tarde:</strong> Gruta da Lapa Doce – visita guiada com lanternas</li><li><strong>Fim de tarde:</strong> Morro do Pai Inácio – subida de 500 metros para o pôr do sol</li><li><strong>Noite:</strong> Livre em Lençóis</li></ul><p><strong>31/12 - Quarta-feira (Dia 4 - Réveillon):</strong></p><ul><li><strong>Manhã:</strong> Cachoeira do Mosquito (trilha leve, 1,5 km cada trecho)</li><li><strong>Almoço:</strong> Na Fazenda Santo Antônio</li><li><strong>Tarde:</strong> Tempo livre em Lençóis para descanso e preparação para a festa</li><li><strong>Noite:</strong> <strong>Festa de Réveillon em Lençóis</strong>, com shows e celebração no centro histórico</li></ul><p><strong>01/01 - Quinta-feira (Dia 5 - Retorno):</strong></p><ul><li><strong>Café da manhã:</strong> Tranquilo e manhã livre</li><li><strong>Início da viagem de volta:</strong> Após o check-out</li><li><strong>Paradas:</strong> Para jantar e descanso durante o percurso</li><li><strong>Chegada prevista:</strong> Em Maceió à noite</li></ul>",
    includes: [
      "Transporte",
      "Hospedagem completa",
      "Festa de réveillon",
      "Todas as refeições do dia 31",
      "Guias especializados",
      "Seguro"
    ],
    notIncludes: [
      "Algumas refeições",
      "Bebidas alcoólicas extras",
      "Atividades opcionais"
    ],
    departures: [
      { location: "Salvador Centro", time: "06h00" }
    ],
    whatToBring: [
      "Roupas para 6 dias",
      "Roupa de festa",
      "Calçado de trilha",
      "Medicamentos",
      "Muita disposição"
    ],
    policy: "Cancelamento até 30 dias antes. Vagas limitadas para o réveillon.",
    pdfUrl: "https://example.com/reveillon-chapada.pdf",
    buyUrl: "https://wa.me/5571999999999?text=Quero%20Réveillon%20Chapada"
  }
};