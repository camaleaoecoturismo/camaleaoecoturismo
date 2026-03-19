// Dados EXATOS do Balanço Anual 2025 - copiados da planilha original (PDF)
// Esses dados são usados APENAS para 2025, substituindo os cálculos do banco de dados

export interface MonthData2025 {
  faturamento: number;
  gastosViagem: number;
  saldoBruto: number;
  manutencao: number;
  impostoRenda: number;
  proLabore: number;
  gastosTotais: number;
  saldoLiquido: number;
  numClientes: number;
}

// Dados mensais de 2025 (Janeiro a Dezembro) - EXATAMENTE como no PDF
export const BALANCO_2025_DATA: MonthData2025[] = [
  // Janeiro
  {
    faturamento: 25446.50,
    gastosViagem: 14769.52,
    saldoBruto: 10676.98,
    manutencao: 376.30,
    impostoRenda: 1526.79,
    proLabore: 1518.00,
    gastosTotais: 18190.61,
    saldoLiquido: 7255.89,
    numClientes: 134
  },
  // Fevereiro
  {
    faturamento: 103888.50,
    gastosViagem: 79347.68,
    saldoBruto: 24540.82,
    manutencao: 1669.30,
    impostoRenda: 6233.31,
    proLabore: 1518.00,
    gastosTotais: 88768.29,
    saldoLiquido: 15120.21,
    numClientes: 126
  },
  // Março
  {
    faturamento: 27077.50,
    gastosViagem: 21006.76,
    saldoBruto: 6070.74,
    manutencao: 286.30,
    impostoRenda: 1624.65,
    proLabore: 1518.00,
    gastosTotais: 24435.71,
    saldoLiquido: 2641.79,
    numClientes: 83
  },
  // Abril
  {
    faturamento: 130715.00,
    gastosViagem: 100722.42,
    saldoBruto: 29992.58,
    manutencao: 1212.30,
    impostoRenda: 7842.90,
    proLabore: 1518.00,
    gastosTotais: 111295.62,
    saldoLiquido: 19419.38,
    numClientes: 222
  },
  // Maio
  {
    faturamento: 19889.50,
    gastosViagem: 12782.00,
    saldoBruto: 7107.50,
    manutencao: 2395.30,
    impostoRenda: 1193.37,
    proLabore: 1518.00,
    gastosTotais: 17888.67,
    saldoLiquido: 2000.83,
    numClientes: 105
  },
  // Junho
  {
    faturamento: 26267.50,
    gastosViagem: 26607.50,
    saldoBruto: -340.00,
    manutencao: 1595.30,
    impostoRenda: 1576.05,
    proLabore: 1518.00,
    gastosTotais: 31296.85,
    saldoLiquido: -5029.35,
    numClientes: 46
  },
  // Julho
  {
    faturamento: 6980.00,
    gastosViagem: 5179.49,
    saldoBruto: 1800.51,
    manutencao: 2395.30,
    impostoRenda: 418.80,
    proLabore: 1518.00,
    gastosTotais: 9511.59,
    saldoLiquido: -2531.59,
    numClientes: 39
  },
  // Agosto
  {
    faturamento: 29664.15,
    gastosViagem: 21906.28,
    saldoBruto: 7757.87,
    manutencao: 1895.30,
    impostoRenda: 1779.85,
    proLabore: 1518.00,
    gastosTotais: 27099.43,
    saldoLiquido: 2564.72,
    numClientes: 98
  },
  // Setembro
  {
    faturamento: 100687.67,
    gastosViagem: 75257.13,
    saldoBruto: 25430.54,
    manutencao: 2299.30,
    impostoRenda: 6041.26,
    proLabore: 1518.00,
    gastosTotais: 85115.69,
    saldoLiquido: 15571.98,
    numClientes: 120
  },
  // Outubro
  {
    faturamento: 36927.00,
    gastosViagem: 26963.46,
    saldoBruto: 9963.54,
    manutencao: 3150.30,
    impostoRenda: 2215.62,
    proLabore: 1518.00,
    gastosTotais: 33847.38,
    saldoLiquido: 3079.62,
    numClientes: 159
  },
  // Novembro
  {
    faturamento: 46772.50,
    gastosViagem: 32185.31,
    saldoBruto: 14587.19,
    manutencao: 3095.30,
    impostoRenda: 2806.35,
    proLabore: 1518.00,
    gastosTotais: 39604.96,
    saldoLiquido: 7167.54,
    numClientes: 165
  },
  // Dezembro
  {
    faturamento: 208398.25,
    gastosViagem: 168290.76,
    saldoBruto: 40107.49,
    manutencao: 5304.63,
    impostoRenda: 12503.90,
    proLabore: 1518.00,
    gastosTotais: 187617.29,
    saldoLiquido: 20780.97,
    numClientes: 248
  }
];

// Totais de 2025 - EXATAMENTE como no PDF
export const BALANCO_2025_TOTALS = {
  faturamento: 762714.07,
  gastosViagem: 585018.31,
  saldoBruto: 177695.76,
  manutencao: 25674.93,
  impostoRenda: 45762.84,
  proLabore: 18216.00,
  gastosTotais: 674672.08,
  saldoLiquido: 88041.99,
  numClientes: 1545,
  filledMonths: 12
};
