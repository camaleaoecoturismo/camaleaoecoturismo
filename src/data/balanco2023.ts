// Dados EXATOS do Balanço Anual 2023 - copiados da planilha original (PDF)

export interface MonthData2023 {
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

// Dados mensais de 2023 (Janeiro a Dezembro) - EXATAMENTE como no PDF
// Nota: impostoRenda não existia em 2023, calculado como 0
export const BALANCO_2023_DATA: MonthData2023[] = [
  // Janeiro
  {
    faturamento: 9056.86,
    gastosViagem: 5674.30,
    saldoBruto: 3382.56,
    manutencao: 695.72,
    impostoRenda: 0,
    proLabore: 806.05,
    gastosTotais: 6370.02,
    saldoLiquido: 2686.84,
    numClientes: 70
  },
  // Fevereiro
  {
    faturamento: 24377.92,
    gastosViagem: 15502.64,
    saldoBruto: 8875.28,
    manutencao: 1760.32,
    impostoRenda: 0,
    proLabore: 2134.49,
    gastosTotais: 17262.96,
    saldoLiquido: 7114.96,
    numClientes: 139
  },
  // Março
  {
    faturamento: 12954.35,
    gastosViagem: 8095.72,
    saldoBruto: 4858.63,
    manutencao: 1024.36,
    impostoRenda: 0,
    proLabore: 1150.28,
    gastosTotais: 9120.08,
    saldoLiquido: 3834.27,
    numClientes: 90
  },
  // Abril
  {
    faturamento: 4619.23,
    gastosViagem: 2995.50,
    saldoBruto: 1623.73,
    manutencao: 541.82,
    impostoRenda: 0,
    proLabore: 324.57,
    gastosTotais: 3537.32,
    saldoLiquido: 1081.91,
    numClientes: 27
  },
  // Maio
  {
    faturamento: 13624.15,
    gastosViagem: 10072.25,
    saldoBruto: 3551.90,
    manutencao: 3370.72,
    impostoRenda: 0,
    proLabore: 54.35,
    gastosTotais: 13442.97,
    saldoLiquido: 181.18,
    numClientes: 81
  },
  // Junho
  {
    faturamento: 7925.36,
    gastosViagem: 5826.05,
    saldoBruto: 2099.31,
    manutencao: 689.32,
    impostoRenda: 0,
    proLabore: 423.00,
    gastosTotais: 6515.37,
    saldoLiquido: 1409.99,
    numClientes: 36
  },
  // Julho
  {
    faturamento: 18883.32,
    gastosViagem: 11667.85,
    saldoBruto: 7215.47,
    manutencao: 788.92,
    impostoRenda: 0,
    proLabore: 1927.97,
    gastosTotais: 12456.77,
    saldoLiquido: 6426.55,
    numClientes: 108
  },
  // Agosto
  {
    faturamento: 10260.35,
    gastosViagem: 6775.25,
    saldoBruto: 3485.10,
    manutencao: 687.02,
    impostoRenda: 0,
    proLabore: 839.42,
    gastosTotais: 7462.27,
    saldoLiquido: 2798.08,
    numClientes: 46
  },
  // Setembro
  {
    faturamento: 16686.09,
    gastosViagem: 12363.25,
    saldoBruto: 4322.84,
    manutencao: 852.42,
    impostoRenda: 0,
    proLabore: 1041.13,
    gastosTotais: 13215.67,
    saldoLiquido: 3470.42,
    numClientes: 68
  },
  // Outubro
  {
    faturamento: 6537.00,
    gastosViagem: 5436.10,
    saldoBruto: 1100.90,
    manutencao: 801.57,
    impostoRenda: 0,
    proLabore: 89.80,
    gastosTotais: 6237.67,
    saldoLiquido: 299.33,
    numClientes: 45
  },
  // Novembro
  {
    faturamento: 18048.46,
    gastosViagem: 12406.00,
    saldoBruto: 5642.46,
    manutencao: 343.47,
    impostoRenda: 0,
    proLabore: 1589.70,
    gastosTotais: 12749.47,
    saldoLiquido: 5298.99,
    numClientes: 91
  },
  // Dezembro
  {
    faturamento: 0,
    gastosViagem: 0,
    saldoBruto: 0,
    manutencao: 0,
    impostoRenda: 0,
    proLabore: 0,
    gastosTotais: 0,
    saldoLiquido: 0,
    numClientes: 0
  }
];

// Totais de 2023 - EXATAMENTE como no PDF
export const BALANCO_2023_TOTALS = {
  faturamento: 142973.09,
  gastosViagem: 96814.91,
  saldoBruto: 46158.18,
  manutencao: 11555.66,
  impostoRenda: 0,
  proLabore: 10380.76,
  gastosTotais: 108370.57,
  saldoLiquido: 34602.52,
  numClientes: 801,
  filledMonths: 11 // Dezembro sem dados
};
