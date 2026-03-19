-- Inserir todos os passeios do sistema anterior no banco de dados

-- Passeios de Agosto
INSERT INTO tours (name, city, state, date, pix_price, card_price, month, image_url, about, itinerary, includes, not_includes, departures, what_to_bring, policy, pdf_url, buy_url) VALUES
('Passeio do Rio Gelado', 'Jequiá da Praia', 'AL', '2025-08-09', 160.00, 192.00, 'AGO', '/rio-gelado-novo-2025.jpg',
'O Passeio do Rio Gelado é uma experiência imersiva na natureza de Jequiá da Praia, em Alagoas, perfeita para quem deseja relaxar e se reconectar com o ambiente natural. Durante um dia inteiro, você vai navegar por uma das lagoas mais preservadas do estado, caminhar por uma trilha leve dentro de uma Reserva Extrativista e viver o momento mais esperado do passeio: a flutuação nas águas tranquilas do Rio Gelado. É uma atividade indicada para todas as idades, especialmente para quem quer ter um primeiro contato com ecoturismo, combinando aventura e contemplação em um cenário paradisíaco.',
'06h00 – Início do embarque nos pontos indicados
09h00 – Início do passeio com barco pela Laguna de Jequiá (30min)
10h00 - Trilha leve de 1 km na Reserva Extrativista da Lagoa de Jequiá
11h00 – Flutuação pelo Rio Gelado (4 km)
Banho de lagoa e descanso em rancho de pescadores
Retorno de barco à base de apoio
12h30 – Almoço regional (opcional, R$ 40,00)
16h30 – Previsão de início do desembarque em Maceió',
'• Transporte ida e volta
• Trilha de nível fácil
• Passeio de barco pela lagoa
• Flutuação no Rio Gelado
• Guia de turismo credenciado
• Bombeiro civil para segurança
• Seguro Aventura
• Cobertura fotográfica (fotos enviadas pelo WhatsApp)',
'• Almoço (R$ 40,00, opcional)
• Itens não especificados',
'• Posto Shell (Veloz), Próx. Shopping Pátio – Antares - 06h00
• Empresarial Humberto Lobo – Serraria - 06h15
• Posto Stella Maris + GNV – Jatiúca - 06h30
• Praça da Faculdade – Prado - 06h50',
'• Mochila
• Roupas leves e confortáveis
• Camisa de manga longa e calça (cargo, tactel ou legging)
• Sandália, tênis e ou bota
• Roupa de banho
• Boné e protetor solar
• Água e lanches leves (frutas, castanhas, barras de cereal)
• Evitar jejum ou alimentos pesados antes da trilha',
'A reserva da sua vaga só é efetivada mediante pagamento, que pode ser realizado das seguintes formas: Pix à vista (forma mais rápida e prática), Cartão de crédito (em até 12x), Pix parcelado. Cancelamento por iniciativa do cliente: Mais de 30 dias antes do passeio: taxa de 10%, Entre 30 e 21 dias antes do passeio: taxa de 20%, Menos de 21 dias antes: taxa de 20% + custos já pagos a fornecedores. No-Show: não haverá reembolso, sendo retido 100% do valor pago.',
'https://example.com/rio-gelado.pdf', 'https://wa.me/5582993649454?text=Quero%20comprar%20Rio%20Gelado'),

('Trilha dos Túneis', 'Gravatá', 'PE', '2025-08-17', 249.00, 298.80, 'AGO', '/lovable-uploads/678a7c6b-ef93-4530-945c-668861f3b087.png',
'Explore os famosos túneis de Gravatá em uma aventura única por paisagens deslumbrantes.',
'05h00 - Saída | 08h00 - Chegada | 09h00 - Início da trilha | 12h00 - Almoço | 14h00 - Exploração dos túneis | 17h00 - Retorno',
'• Transporte
• Guia especializado
• Seguro
• Lanche',
'• Alimentação completa
• Equipamentos pessoais',
'• Recife Centro - 05h00
• Shopping Recife - 05h30',
'• Calçado de trilha
• Roupa confortável
• Protetor solar
• Mochila pequena
• Documento',
'Cancelamento até 48h antes sem custos. Sujeito a condições climáticas.',
'https://example.com/tuneis.pdf', 'https://wa.me/5581999999999?text=Interesse%20Trilha%20Túneis'),

('Trilha da Mata Verde', 'Maribondo', 'AL', '2025-08-23', 129.00, 154.80, 'AGO', '/lovable-uploads/998b13cd-76f8-4633-92ce-8a393435d49d.png',
'Aventure-se na exuberante Mata Verde de Maribondo, com trilhas em meio à natureza preservada.',
'06h00 - Saída | 08h30 - Chegada | 09h00 - Início da trilha | 12h00 - Pausa para lanche | 15h00 - Exploração | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche de trilha',
'• Alimentação completa
• Equipamentos pessoais',
'• Maceió Centro - 06h00',
'• Tênis ou bota de trilha
• Roupa leve
• Protetor solar
• Repelente
• Água',
'Cancelamento até 48h antes. Mínimo 6 pessoas.',
'https://example.com/mata-verde.pdf', 'https://wa.me/5582999999999?text=Quero%20Trilha%20Mata%20Verde'),

('Vale do Catimbau', 'Buíque', 'PE', '2025-08-30', 599.00, 718.80, 'AGO', '/catimbau-novo-2025.jpg',
'Duas modalidades: hospedagem em pousada ou camping. Explore o incrível Vale do Catimbau com suas formações rochosas únicas.',
'Dia 1: Saída, chegada, trilhas principais, pernoite | Dia 2: Trilhas complementares, banhos, retorno',
'• Transporte
• Guia especializado
• Hospedagem/camping
• Seguro
• Café da manhã',
'• Algumas refeições
• Equipamentos de camping pessoais',
'• Recife Centro - 06h00',
'• Roupas para 2 dias
• Calçado de trilha
• Protetor solar
• Medicamentos pessoais
• Saco de dormir (camping)',
'Cancelamento até 7 dias antes. Duas opções de acomodação disponíveis.',
'https://example.com/catimbau.pdf', 'https://wa.me/5581999999999?text=Interesse%20Vale%20Catimbau'),

-- Passeios de Setembro
('Chapada Diamantina', 'Lençóis', 'BA', '2025-09-12', 1599.00, 1918.80, 'SET', '/lovable-uploads/112026cc-e089-4226-8c78-c0d52a3e0875.png',
'Uma expedição de 5 dias pela majestosa Chapada Diamantina, com cachoeiras, poços e paisagens de tirar o fôlego.',
'5 dias de aventura com trilhas diárias, cachoeiras, grutas e paisagens únicas da Chapada Diamantina.',
'• Transporte
• Hospedagem
• Guias especializados
• Seguro
• Café da manhã',
'• Almoços e jantares
• Bebidas
• Equipamentos pessoais',
'• Salvador Centro - 06h00',
'• Roupas para 5 dias
• Calçado de trilha
• Mochila grande
• Medicamentos
• Protetor solar',
'Cancelamento até 15 dias antes. Duas opções de acomodação.',
'https://example.com/chapada.pdf', 'https://wa.me/5571999999999?text=Interesse%20Chapada%20Diamantina'),

('Trilha das Cachoeiras de Bonito', 'Bonito', 'PE', '2025-09-20', 250.00, 300.00, 'SET', '/lovable-uploads/7ef61d1a-9b56-49f8-a677-c135b6d223db.png',
'Descubra as belas cachoeiras de Bonito em Pernambuco, com banhos refrescantes e paisagens encantadoras.',
'06h00 - Saída | 09h00 - Chegada | 10h00 - Trilha primeira cachoeira | 14h00 - Segunda cachoeira | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Alimentação completa
• Equipamentos pessoais',
'• Recife Centro - 06h00',
'• Roupa de banho
• Tênis de trilha
• Protetor solar
• Toalha
• Lanche extra',
'Cancelamento até 48h antes.',
'https://example.com/bonito-pe.pdf', 'https://wa.me/5581999999999?text=Quero%20Cachoeiras%20Bonito'),

('Trilha de Flexeiras', 'Flexeiras', 'AL', '2025-09-21', 170.00, 204.00, 'SET', '/lovable-uploads/fefc4fc1-7c79-40fe-8dc2-566ad12c9461.png',
'Uma trilha incrível em Flexeiras, Alagoas, com paisagens rurais e contato direto com a natureza.',
'06h30 - Saída | 08h30 - Chegada | 09h00 - Início da trilha | 12h00 - Pausa | 15h00 - Exploração | 17h30 - Retorno',
'• Transporte
• Guia
• Seguro
• Lanche',
'• Almoço
• Equipamentos pessoais',
'• Maceió Centro - 06h30',
'• Calçado confortável
• Roupa leve
• Chapéu
• Protetor solar
• Água',
'Cancelamento até 48h antes.',
'https://example.com/flexeiras.pdf', 'https://wa.me/5582999999999?text=Interesse%20Trilha%20Flexeiras'),

('Camping de Jequiá', 'Jequiá da Praia', 'AL', '2025-09-27', 349.00, 418.80, 'SET', '/lovable-uploads/f2fbeed0-5e2d-440b-b7b8-8244f2539ee2.png',
'Uma experiência de camping único nas falésias de Jequiá da Praia, com vista para o mar e aventura garantida.',
'Dia 1: Chegada, montagem do acampamento, trilhas | Dia 2: Atividades aquáticas, desmontagem, retorno',
'• Transporte
• Equipamentos de camping
• Guia
• Seguro
• Café da manhã',
'• Refeições principais
• Equipamentos pessoais',
'• Maceió Centro - 07h00',
'• Roupas para 2 dias
• Saco de dormir próprio
• Lanterna
• Protetor solar
• Repelente',
'Cancelamento até 7 dias antes. Sujeito a condições climáticas.',
'https://example.com/camping-falesias.pdf', 'https://wa.me/5582999999999?text=Quero%20Camping%20Falésias'),

-- Passeios de Outubro
('Trilha do Cacau', 'Matriz de Camaragibe', 'AL', '2025-10-05', 175.00, 210.00, 'OUT', '/lovable-uploads/055f875c-5342-478d-928b-c09c18a013cd.png',
'Conheça a trilha histórica do cacau em Matriz de Camaragibe, mergulhando na cultura local e paisagens rurais.',
'06h00 - Saída | 08h00 - Chegada | 09h00 - Trilha do cacau | 12h00 - Almoço rural | 15h00 - Atividades | 17h00 - Retorno',
'• Transporte
• Guia local
• Almoço rural
• Seguro',
'• Bebidas
• Compras pessoais',
'• Maceió Centro - 06h00',
'• Roupa confortável
• Calçado fechado
• Protetor solar
• Repelente
• Câmera',
'Cancelamento até 48h antes.',
'https://example.com/trilha-cacau.pdf', 'https://wa.me/5582999999999?text=Quero%20Trilha%20Cacau'),

('Trilha da Fazenda Guadalupe', 'Boca da Mata', 'AL', '2025-10-18', 160.00, 192.00, 'OUT', '/lovable-uploads/a8a9f4cf-5e4d-4ff8-84d6-b69acadfeab8.png',
'Explore a Fazenda Guadalupe com suas trilhas ecológicas e paisagens rurais encantadoras.',
'06h00 - Saída | 08h00 - Chegada | 09h00 - Trilha na fazenda | 12h00 - Almoço | 15h00 - Atividades rurais | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Almoço completo
• Equipamentos pessoais',
'• Maceió Centro - 06h00',
'• Roupa confortável
• Calçado de trilha
• Protetor solar
• Chapéu
• Água',
'Cancelamento até 48h antes.',
'https://example.com/fazenda-guadalupe.pdf', 'https://wa.me/5582999999999?text=Quero%20Fazenda%20Guadalupe'),

('Rota das Cachoeiras do Paraíso', 'São Benedito do Sul', 'PE', '2025-10-19', 190.00, 228.00, 'OUT', '/lovable-uploads/803c0708-0cb8-4bfc-a09f-20032aba5e55.png',
'Descubra as cachoeiras paradisíacas de São Benedito do Sul em uma jornada inesquecível.',
'06h00 - Saída | 09h00 - Chegada | 10h00 - Primeira cachoeira | 12h00 - Almoço | 14h00 - Segunda cachoeira | 17h00 - Retorno',
'• Transporte
• Guia especializado
• Seguro
• Lanche',
'• Almoço completo
• Equipamentos pessoais',
'• Recife Centro - 06h00',
'• Roupa de banho
• Tênis de trilha
• Protetor solar
• Toalha
• Lanche extra',
'Cancelamento até 48h antes.',
'https://example.com/cachoeiras-paraiso.pdf', 'https://wa.me/5581999999999?text=Quero%20Cachoeiras%20Paraíso'),

('Cânions do São Francisco', 'Piranhas', 'AL', '2025-10-25', 649.00, 778.80, 'OUT', '/lovable-uploads/2dc6dbb7-a6e7-4249-8b5b-31ee593ebf46.png',
'Explore os majestosos cânions do Rio São Francisco em uma aventura de dois dias inesquecível.',
'Dia 1: Saída, chegada, exploração dos cânions, pernoite | Dia 2: Trilhas complementares, passeio de barco, retorno',
'• Transporte
• Hospedagem
• Guia especializado
• Seguro
• Café da manhã',
'• Algumas refeições
• Equipamentos pessoais',
'• Maceió Centro - 07h00',
'• Roupas para 2 dias
• Calçado de trilha
• Protetor solar
• Medicamentos pessoais
• Chapéu',
'Cancelamento até 7 dias antes.',
'https://example.com/canions-sao-francisco.pdf', 'https://wa.me/5582999999999?text=Quero%20Cânions%20São%20Francisco'),

-- Passeios de Novembro
('Trilha Cachoeira da Tiririca', 'Murici', 'AL', '2025-11-09', 180.00, 216.00, 'NOV', '/lovable-uploads/f700d5f7-d2fd-484e-a496-a06cb0cbf588.png',
'Aventure-se na trilha da Cachoeira da Tiririca, uma das mais belas de Alagoas.',
'06h00 - Saída | 08h30 - Chegada | 09h00 - Início da trilha | 12h00 - Pausa | 14h00 - Cachoeira | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Almoço completo
• Equipamentos pessoais',
'• Maceió Centro - 06h00',
'• Roupa de banho
• Tênis de trilha
• Protetor solar
• Toalha
• Repelente',
'Cancelamento até 48h antes.',
'https://example.com/cachoeira-tiririca.pdf', 'https://wa.me/5582999999999?text=Quero%20Cachoeira%20Tiririca'),

('Vale do Catimbau', 'Buíque', 'PE', '2025-11-15', 649.00, 778.80, 'NOV', '/lovable-uploads/900d357c-03ee-4e0d-a029-527b165bee48.png',
'Segunda edição do Vale do Catimbau com hospedagem em pousada ou camping.',
'Dia 1: Saída, chegada, trilhas principais, pernoite | Dia 2: Trilhas complementares, banhos, retorno',
'• Transporte
• Guia especializado
• Hospedagem/camping
• Seguro
• Café da manhã',
'• Algumas refeições
• Equipamentos de camping pessoais',
'• Recife Centro - 06h00',
'• Roupas para 2 dias
• Calçado de trilha
• Protetor solar
• Medicamentos pessoais
• Saco de dormir (camping)',
'Cancelamento até 7 dias antes. Duas opções de acomodação disponíveis.',
'https://example.com/catimbau-nov.pdf', 'https://wa.me/5581999999999?text=Interesse%20Vale%20Catimbau%20Nov'),

('Trilha do Rio São Miguel', 'São Miguel dos Campos', 'AL', '2025-11-22', 170.00, 204.00, 'NOV', '/lovable-uploads/68c6e77f-8154-4d77-a0a7-4149a1935e97.png',
'Explore as belezas naturais do Rio São Miguel em uma trilha refrescante.',
'06h00 - Saída | 08h00 - Chegada | 09h00 - Trilha | 12h00 - Banho no rio | 15h00 - Exploração | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Almoço completo
• Equipamentos pessoais',
'• Maceió Centro - 06h00',
'• Roupa de banho
• Tênis confortável
• Protetor solar
• Toalha
• Água',
'Cancelamento até 48h antes.',
'https://example.com/rio-sao-miguel.pdf', 'https://wa.me/5582999999999?text=Quero%20Rio%20São%20Miguel'),

-- Passeios de Dezembro
('Fazenda Guadalupe', 'Boca da Mata', 'AL', '2025-12-06', 170.00, 204.00, 'DEZ', '/lovable-uploads/58e6cafb-8c69-43ac-a3ee-d302ec82a6ef.png',
'Segunda edição da Fazenda Guadalupe com suas trilhas ecológicas e paisagens rurais.',
'06h00 - Saída | 08h00 - Chegada | 09h00 - Trilha na fazenda | 12h00 - Almoço | 15h00 - Atividades rurais | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Almoço completo
• Equipamentos pessoais',
'• Maceió Centro - 06h00',
'• Roupa confortável
• Calçado de trilha
• Protetor solar
• Chapéu
• Água',
'Cancelamento até 48h antes.',
'https://example.com/fazenda-guadalupe-dez.pdf', 'https://wa.me/5582999999999?text=Quero%20Fazenda%20Guadalupe%20Dez'),

('Trilha das Cachoeiras de Bonito', 'Bonito', 'PE', '2025-12-13', 250.00, 300.00, 'DEZ', '/lovable-uploads/b100f2b4-897b-4a0a-8de2-145ca848364f.png',
'Segunda edição das Cachoeiras de Bonito para finalizar o ano com aventura.',
'06h00 - Saída | 09h00 - Chegada | 10h00 - Trilha primeira cachoeira | 14h00 - Segunda cachoeira | 17h00 - Retorno',
'• Transporte
• Guia local
• Seguro
• Lanche',
'• Alimentação completa
• Equipamentos pessoais',
'• Recife Centro - 06h00',
'• Roupa de banho
• Tênis de trilha
• Protetor solar
• Toalha
• Lanche extra',
'Cancelamento até 48h antes.',
'https://example.com/bonito-pe-dez.pdf', 'https://wa.me/5581999999999?text=Quero%20Cachoeiras%20Bonito%20Dez'),

('CHAPADA DIAMANTINA', 'Lençóis', 'BA', '2025-12-27', 1599.00, 1918.80, 'DEZ', '/lovable-uploads/b0da3a86-cc9a-495d-8b71-ce10b4baa679.png',
'Edição especial de fim de ano da Chapada Diamantina - 5 dias de aventura para encerrar 2025.',
'5 dias de aventura com trilhas diárias, cachoeiras, grutas e paisagens únicas da Chapada Diamantina.',
'• Transporte
• Hospedagem
• Guias especializados
• Seguro
• Café da manhã',
'• Almoços e jantares
• Bebidas
• Equipamentos pessoais',
'• Salvador Centro - 06h00',
'• Roupas para 5 dias
• Calçado de trilha
• Mochila grande
• Medicamentos
• Protetor solar',
'Cancelamento até 15 dias antes. Duas opções de acomodação.',
'https://example.com/chapada-dez.pdf', 'https://wa.me/5571999999999?text=Interesse%20Chapada%20Diamantina%20Dez');