// Dados exatos do histórico de 2025 conforme PDF fornecido
export interface HistoricoTour2025 {
  index: number;
  month: string;
  name: string;
  date: string;
  faturamento: number;
  gastos: number;
  lucro: number;
  clientes: number;
  fatPorCliente: number;
  gastosPorCliente: number;
  lucroPorCliente: number;
}

export const HISTORICO_2025_DATA: HistoricoTour2025[] = [
  // JANEIRO
  { index: 1, month: 'Janeiro', name: 'Passeio do Rio Gelado', date: '06/01/2025', faturamento: 9000.00, gastos: 5455.68, lucro: 3544.32, clientes: 42, fatPorCliente: 214.29, gastosPorCliente: 129.90, lucroPorCliente: 84.39 },
  { index: 2, month: 'Janeiro', name: 'Fazenda Guadalupe', date: '18/01/2025', faturamento: 7410.00, gastos: 3648.00, lucro: 3762.00, clientes: 46, fatPorCliente: 161.09, gastosPorCliente: 79.30, lucroPorCliente: 81.78 },
  { index: 3, month: 'Janeiro', name: 'Trilha de Flexeiras', date: '26/01/2025', faturamento: 9036.50, gastos: 5665.84, lucro: 3370.66, clientes: 46, fatPorCliente: 196.45, gastosPorCliente: 123.17, lucroPorCliente: 73.28 },
  
  // FEVEREIRO
  { index: 4, month: 'Fevereiro', name: 'Trilha dos Túneis', date: '09/02/2025', faturamento: 8420.00, gastos: 5348.64, lucro: 3071.36, clientes: 41, fatPorCliente: 205.37, gastosPorCliente: 130.45, lucroPorCliente: 74.91 },
  { index: 5, month: 'Fevereiro', name: 'Passeio do Rio Gelado', date: '15/02/2025', faturamento: 6930.00, gastos: 4519.08, lucro: 2410.92, clientes: 24, fatPorCliente: 288.75, gastosPorCliente: 188.30, lucroPorCliente: 100.46 },
  { index: 6, month: 'Fevereiro', name: 'Chapada Diamantina', date: '28/02/2025', faturamento: 86480.50, gastos: 68418.60, lucro: 18061.90, clientes: 46, fatPorCliente: 1880.01, gastosPorCliente: 1487.36, lucroPorCliente: 392.65 },
  { index: 7, month: 'Fevereiro', name: 'Vale do Catimbau', date: '22/02/2025', faturamento: 2058.00, gastos: 1061.36, lucro: 996.64, clientes: 15, fatPorCliente: 137.20, gastosPorCliente: 70.76, lucroPorCliente: 66.44 },
  
  // MARÇO
  { index: 8, month: 'Março', name: 'Passeio do Rio Gelado', date: '16/03/2025', faturamento: 7565.00, gastos: 4758.44, lucro: 2806.56, clientes: 36, fatPorCliente: 210.14, gastosPorCliente: 132.18, lucroPorCliente: 77.96 },
  { index: 9, month: 'Março', name: 'Trilha da Mata Verde', date: '21/03/2025', faturamento: 16452.50, gastos: 13188.32, lucro: 3264.18, clientes: 29, fatPorCliente: 567.33, gastosPorCliente: 454.77, lucroPorCliente: 112.56 },
  { index: 10, month: 'Março', name: 'Trilha de Flexeiras', date: '29/03/2025', faturamento: 3060.00, gastos: 3060.00, lucro: 0.00, clientes: 18, fatPorCliente: 170.00, gastosPorCliente: 170.00, lucroPorCliente: 0.00 },
  
  // ABRIL
  { index: 11, month: 'Abril', name: 'Passeio do Rio Gelado', date: '06/04/2025', faturamento: 3205.00, gastos: 1273.60, lucro: 1931.40, clientes: 15, fatPorCliente: 213.67, gastosPorCliente: 84.91, lucroPorCliente: 128.76 },
  { index: 12, month: 'Abril', name: 'Chapada Diamantina', date: '17/04/2025', faturamento: 106730.00, gastos: 84443.74, lucro: 22286.26, clientes: 57, fatPorCliente: 1872.46, gastosPorCliente: 1481.47, lucroPorCliente: 390.99 },
  { index: 13, month: 'Abril', name: 'Trilha dos Túneis', date: '12/04/2025', faturamento: 6270.00, gastos: 4781.32, lucro: 1488.68, clientes: 33, fatPorCliente: 190.00, gastosPorCliente: 144.89, lucroPorCliente: 45.11 },
  { index: 14, month: 'Abril', name: 'Fazenda Guadalupe', date: '26/04/2025', faturamento: 6240.00, gastos: 3960.00, lucro: 2280.00, clientes: 48, fatPorCliente: 130.00, gastosPorCliente: 82.50, lucroPorCliente: 47.50 },
  { index: 15, month: 'Abril', name: 'Trilha do Catimbau', date: '13/04/2025', faturamento: 2270.00, gastos: 1763.76, lucro: 506.24, clientes: 19, fatPorCliente: 119.47, gastosPorCliente: 92.83, lucroPorCliente: 26.64 },
  { index: 16, month: 'Abril', name: 'Trilha de Flexeiras', date: '26/04/2025', faturamento: 6000.00, gastos: 4500.00, lucro: 1500.00, clientes: 50, fatPorCliente: 120.00, gastosPorCliente: 90.00, lucroPorCliente: 30.00 },
  { index: 17, month: 'Abril', name: 'Vale do Catimbau', date: '27/04/2025', faturamento: 0, gastos: 0.00, lucro: 0.00, clientes: 0, fatPorCliente: 0.00, gastosPorCliente: 0.00, lucroPorCliente: 0.00 },
  
  // MAIO
  { index: 18, month: 'Maio', name: 'Trilha de Flexeiras', date: '04/05/2025', faturamento: 850.00, gastos: 850.00, lucro: 0.00, clientes: 5, fatPorCliente: 170.00, gastosPorCliente: 170.00, lucroPorCliente: 0.00 },
  { index: 19, month: 'Maio', name: 'Fazenda Guadalupe', date: '10/05/2025', faturamento: 3200.00, gastos: 2043.76, lucro: 1156.24, clientes: 44, fatPorCliente: 72.73, gastosPorCliente: 46.45, lucroPorCliente: 26.28 },
  { index: 20, month: 'Maio', name: 'Trilha das Cachoeiras de Bonito', date: '25/05/2025', faturamento: 7150.00, gastos: 4628.96, lucro: 2521.04, clientes: 0, fatPorCliente: 0.00, gastosPorCliente: 0.00, lucroPorCliente: 0.00 },
  { index: 21, month: 'Maio', name: 'Passeio do Rio Gelado (EngenhARQ)', date: '31/05/2025', faturamento: 8689.50, gastos: 5259.28, lucro: 3430.22, clientes: 32, fatPorCliente: 271.55, gastosPorCliente: 164.35, lucroPorCliente: 107.19 },
  
  // JUNHO
  { index: 22, month: 'Junho', name: 'Trilha de Flexeiras (Cristiano)', date: '08/06/2025', faturamento: 2000.00, gastos: 1840.00, lucro: 160.00, clientes: 32, fatPorCliente: 62.50, gastosPorCliente: 57.50, lucroPorCliente: 5.00 },
  { index: 23, month: 'Junho', name: 'Chapada Diamantina', date: '15/06/2025', faturamento: 24267.50, gastos: 24767.50, lucro: -500.00, clientes: 14, fatPorCliente: 1733.39, gastosPorCliente: 1769.11, lucroPorCliente: -35.71 },
  { index: 24, month: 'Junho', name: 'Passeio do Rio Gelado', date: '29/06/2025', faturamento: 0, gastos: 0.00, lucro: 0.00, clientes: 0, fatPorCliente: 0.00, gastosPorCliente: 0.00, lucroPorCliente: 0.00 },
  
  // JULHO
  { index: 25, month: 'Julho', name: 'Passeio do Rio Gelado', date: '19/07/2025', faturamento: 2180.00, gastos: 1566.32, lucro: 613.68, clientes: 8, fatPorCliente: 272.50, gastosPorCliente: 195.79, lucroPorCliente: 76.71 },
  { index: 26, month: 'Julho', name: 'Fazenda Guadalupe', date: '20/07/2025', faturamento: 4800.00, gastos: 3613.17, lucro: 1186.83, clientes: 31, fatPorCliente: 154.84, gastosPorCliente: 116.55, lucroPorCliente: 38.28 },
  
  // AGOSTO
  { index: 27, month: 'Agosto', name: 'Trilha dos Túneis', date: '17/08/2025', faturamento: 11199.10, gastos: 9139.16, lucro: 2059.94, clientes: 29, fatPorCliente: 386.18, gastosPorCliente: 315.14, lucroPorCliente: 71.03 },
  { index: 28, month: 'Agosto', name: 'Trilha da Mata Verde', date: '23/08/2025', faturamento: 2962.00, gastos: 2378.76, lucro: 583.24, clientes: 19, fatPorCliente: 155.89, gastosPorCliente: 125.20, lucroPorCliente: 30.70 },
  { index: 29, month: 'Agosto', name: 'Trilha de Flexeiras (Grupo fechado)', date: '24/08/2025', faturamento: 3220.00, gastos: 2010.00, lucro: 1210.00, clientes: 30, fatPorCliente: 107.33, gastosPorCliente: 67.00, lucroPorCliente: 40.33 },
  { index: 30, month: 'Agosto', name: 'Vale do Catimbau', date: '30/08/2025', faturamento: 12283.05, gastos: 8378.36, lucro: 3904.69, clientes: 20, fatPorCliente: 614.15, gastosPorCliente: 418.92, lucroPorCliente: 195.23 },
  
  // SETEMBRO
  { index: 31, month: 'Setembro', name: 'Chapada Diamantina', date: '12/09/2025', faturamento: 86159.67, gastos: 65243.41, lucro: 20916.26, clientes: 46, fatPorCliente: 1873.04, gastosPorCliente: 1418.34, lucroPorCliente: 454.70 },
  { index: 32, month: 'Setembro', name: 'Trilha das Cachoeiras de Bonito', date: '20/09/2025', faturamento: 4960.00, gastos: 3437.52, lucro: 1522.48, clientes: 19, fatPorCliente: 261.05, gastosPorCliente: 180.92, lucroPorCliente: 80.13 },
  { index: 33, month: 'Setembro', name: 'Passeio do Rio Gelado (Petrosynergy)', date: '20/09/2025', faturamento: 2770.00, gastos: 2255.00, lucro: 515.00, clientes: 23, fatPorCliente: 120.43, gastosPorCliente: 98.04, lucroPorCliente: 22.39 },
  { index: 34, month: 'Setembro', name: 'Trilha de Flexeiras', date: '21/09/2025', faturamento: 5900.00, gastos: 3423.20, lucro: 2476.80, clientes: 30, fatPorCliente: 196.67, gastosPorCliente: 114.11, lucroPorCliente: 82.56 },
  { index: 35, month: 'Setembro', name: 'Camping de Jequiá', date: '27/09/2025', faturamento: 898.00, gastos: 898.00, lucro: 0.00, clientes: 2, fatPorCliente: 449.00, gastosPorCliente: 449.00, lucroPorCliente: 0.00 },
  
  // OUTUBRO
  { index: 36, month: 'Outubro', name: 'Trilha do Cacau', date: '05/10/2025', faturamento: 8972.00, gastos: 5747.72, lucro: 3224.28, clientes: 43, fatPorCliente: 208.65, gastosPorCliente: 133.67, lucroPorCliente: 74.98 },
  { index: 37, month: 'Outubro', name: 'Fazenda Guadalupe', date: '18/10/2025', faturamento: 3898.00, gastos: 3661.00, lucro: 237.00, clientes: 25, fatPorCliente: 155.92, gastosPorCliente: 146.44, lucroPorCliente: 9.48 },
  { index: 38, month: 'Outubro', name: 'Cachoeiras do Paraíso', date: '19/10/2025', faturamento: 3777.00, gastos: 2903.64, lucro: 873.36, clientes: 19, fatPorCliente: 198.79, gastosPorCliente: 152.82, lucroPorCliente: 45.97 },
  { index: 39, month: 'Outubro', name: 'Cânions do São Francisco', date: '25/10/2025', faturamento: 13530.00, gastos: 9896.10, lucro: 3633.90, clientes: 21, fatPorCliente: 644.29, gastosPorCliente: 471.24, lucroPorCliente: 173.04 },
  { index: 40, month: 'Outubro', name: 'Fazenda Guadalupe (Sicredi)', date: '25/10/2025', faturamento: 6750.00, gastos: 4755.00, lucro: 1995.00, clientes: 51, fatPorCliente: 132.35, gastosPorCliente: 93.24, lucroPorCliente: 39.12 },
  
  // NOVEMBRO
  { index: 41, month: 'Novembro', name: 'Trilha Cachoeira da Tiririca', date: '09/11/2025', faturamento: 7258.00, gastos: 4059.32, lucro: 3198.68, clientes: 33, fatPorCliente: 219.94, gastosPorCliente: 123.01, lucroPorCliente: 96.93 },
  { index: 42, month: 'Novembro', name: 'Vale do Catimbau', date: '15/11/2025', faturamento: 17016.00, gastos: 10760.32, lucro: 6255.68, clientes: 29, fatPorCliente: 586.76, gastosPorCliente: 371.05, lucroPorCliente: 215.71 },
  { index: 43, month: 'Novembro', name: 'Trilha do Rio São Miguel', date: '22/11/2025', faturamento: 2127.50, gastos: 2150.12, lucro: -22.62, clientes: 14, fatPorCliente: 151.96, gastosPorCliente: 153.58, lucroPorCliente: -1.62 },
  { index: 44, month: 'Novembro', name: 'Trilha dos Túneis', date: '23/11/2025', faturamento: 12311.00, gastos: 9450.15, lucro: 2860.85, clientes: 29, fatPorCliente: 424.52, gastosPorCliente: 325.87, lucroPorCliente: 98.65 },
  { index: 45, month: 'Novembro', name: 'Fazenda Guadalupe (Quartier)', date: '29/11/2025', faturamento: 8060.00, gastos: 5765.40, lucro: 2294.60, clientes: 60, fatPorCliente: 134.33, gastosPorCliente: 96.09, lucroPorCliente: 38.24 },
  
  // DEZEMBRO
  { index: 46, month: 'Dezembro', name: 'Fazenda Guadalupe', date: '06/12/2025', faturamento: 8584.00, gastos: 6514.00, lucro: 2070.00, clientes: 50, fatPorCliente: 171.68, gastosPorCliente: 130.28, lucroPorCliente: 41.40 },
  { index: 47, month: 'Dezembro', name: 'Trilha das Cachoeiras de Bonito', date: '13/12/2025', faturamento: 8890.00, gastos: 4971.20, lucro: 3918.80, clientes: 30, fatPorCliente: 296.33, gastosPorCliente: 165.71, lucroPorCliente: 130.63 },
  { index: 48, month: 'Dezembro', name: 'Passeio do Rio Gelado - Sylvia Pereira', date: '14/12/2025', faturamento: 10406.00, gastos: 7532.00, lucro: 2874.00, clientes: 68, fatPorCliente: 0.00, gastosPorCliente: 0.00, lucroPorCliente: 0.00 },
  { index: 49, month: 'Dezembro', name: 'Chapada Diamantina', date: '27/12/2025', faturamento: 180518.25, gastos: 149273.56, lucro: 31244.69, clientes: 100, fatPorCliente: 1805.18, gastosPorCliente: 1492.74, lucroPorCliente: 312.45 },
];

// Totais conforme PDF
export const HISTORICO_2025_TOTALS = {
  faturamento: 762714.07,
  gastos: 585018.31,
  lucro: 177695.76,
  clientes: 1521,
};
