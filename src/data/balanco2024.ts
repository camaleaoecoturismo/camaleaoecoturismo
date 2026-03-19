// Dados EXATOS do Balanço Anual 2024 - copiados da planilha original (PDF)

export interface MonthData2024 {
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

// Dados mensais de 2024 (Janeiro a Dezembro) - EXATAMENTE como no PDF
// Nota: impostoRenda não existia em 2024, calculado como 0
export const BALANCO_2024_DATA: MonthData2024[] = [
  // Janeiro
  {
    faturamento: 22971.04,
    gastosViagem: 13537.01,
    saldoBruto: 9434.03,
    manutencao: 1581.50,
    impostoRenda: 0,
    proLabore: 2355.76,
    gastosTotais: 15118.51,
    saldoLiquido: 7852.53,
    numClientes: 136
  },
  // Fevereiro
  {
    faturamento: 20485.52,
    gastosViagem: 13495.63,
    saldoBruto: 6989.89,
    manutencao: 331.00,
    impostoRenda: 0,
    proLabore: 1997.67,
    gastosTotais: 13826.63,
    saldoLiquido: 6658.89,
    numClientes: 98
  },
  // Março
  {
    faturamento: 26977.07,
    gastosViagem: 15343.44,
    saldoBruto: 11633.63,
    manutencao: 991.00,
    impostoRenda: 0,
    proLabore: 3192.79,
    gastosTotais: 16334.44,
    saldoLiquido: 10642.63,
    numClientes: 170
  },
  // Abril
  {
    faturamento: 19303.69,
    gastosViagem: 13475.42,
    saldoBruto: 5828.27,
    manutencao: 873.14,
    impostoRenda: 0,
    proLabore: 1486.54,
    gastosTotais: 14348.56,
    saldoLiquido: 4955.13,
    numClientes: 99
  },
  // Maio
  {
    faturamento: 11391.39,
    gastosViagem: 9319.35,
    saldoBruto: 2072.05,
    manutencao: 331.00,
    impostoRenda: 0,
    proLabore: 522.31,
    gastosTotais: 9650.35,
    saldoLiquido: 1741.05,
    numClientes: 63
  },
  // Junho
  {
    faturamento: 6403.13,
    gastosViagem: 5602.16,
    saldoBruto: 800.98,
    manutencao: 181.00,
    impostoRenda: 0,
    proLabore: 185.99,
    gastosTotais: 5783.16,
    saldoLiquido: 619.98,
    numClientes: 49
  },
  // Julho
  {
    faturamento: 7859.19,
    gastosViagem: 5140.88,
    saldoBruto: 2718.31,
    manutencao: 181.00,
    impostoRenda: 0,
    proLabore: 761.19,
    gastosTotais: 5321.88,
    saldoLiquido: 2537.31,
    numClientes: 29
  },
  // Agosto
  {
    faturamento: 11763.46,
    gastosViagem: 8723.71,
    saldoBruto: 3039.75,
    manutencao: 181.00,
    impostoRenda: 0,
    proLabore: 857.63,
    gastosTotais: 8904.71,
    saldoLiquido: 2858.75,
    numClientes: 69
  },
  // Setembro
  {
    faturamento: 31512.46,
    gastosViagem: 20520.13,
    saldoBruto: 10992.34,
    manutencao: 2462.64,
    impostoRenda: 0,
    proLabore: 2558.91,
    gastosTotais: 22982.77,
    saldoLiquido: 8529.70,
    numClientes: 109
  },
  // Outubro
  {
    faturamento: 15576.50,
    gastosViagem: 10474.34,
    saldoBruto: 5102.16,
    manutencao: 991.00,
    impostoRenda: 0,
    proLabore: 1233.35,
    gastosTotais: 11465.34,
    saldoLiquido: 4111.16,
    numClientes: 93
  },
  // Novembro
  {
    faturamento: 50981.05,
    gastosViagem: 36264.26,
    saldoBruto: 14716.79,
    manutencao: 1019.17,
    impostoRenda: 0,
    proLabore: 4109.29,
    gastosTotais: 37283.43,
    saldoLiquido: 13697.62,
    numClientes: 200
  },
  // Dezembro
  {
    faturamento: 9417.15,
    gastosViagem: 1019.17,
    saldoBruto: 8397.98,
    manutencao: 270.90,
    impostoRenda: 0,
    proLabore: 142.43,
    gastosTotais: 8942.38,
    saldoLiquido: 474.77,
    numClientes: 71
  }
];

// Totais de 2024 - EXATAMENTE como no PDF
export const BALANCO_2024_TOTALS = {
  faturamento: 234641.66,
  gastosViagem: 152915.50,
  saldoBruto: 81726.16,
  manutencao: 9394.35,
  impostoRenda: 0,
  proLabore: 19403.85,
  gastosTotais: 169962.16,
  saldoLiquido: 64679.50,
  numClientes: 1186,
  filledMonths: 12
};
