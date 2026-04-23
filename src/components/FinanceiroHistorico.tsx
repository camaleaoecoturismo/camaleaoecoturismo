import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HISTORICO_2025_DATA, HISTORICO_2025_TOTALS } from '@/data/historico2025';
import HistoricoChartsModal from './charts/HistoricoChartsModal';
import { supabase } from "@/integrations/supabase/client";

interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais?: number | null;
  capture_method?: string | null;
  numero_participantes?: number | null;
  card_fee_amount?: number | null;
  coupon_discount?: number | null;
  refund_amount?: number | null;
  adicionais?: any[] | null;
  selected_optional_items?: any[] | null;
}

interface TourCost {
  id: string;
  tour_id: string;
  quantity: number;
  unit_value: number;
  valor_pago: number;
}

interface FinanceiroHistoricoProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  selectedYear: number;
}

const formatCurrency = (value: number) => {
  if (value < 0) {
    return `-R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const FinanceiroHistorico: React.FC<FinanceiroHistoricoProps> = ({
  tours,
  reservations,
  allTourCosts,
  selectedYear
}) => {
  const [showChartsModal, setShowChartsModal] = useState(false);
  const [reservaTotalPago, setReservaTotalPago] = useState<Record<string, number>>({});

  // Soma parcelas por reserva — usada para calcular o valor realmente recebido
  // em passeios que já aconteceram (mesma lógica de getValorPagoSemJuros).
  useEffect(() => {
    const ids = reservations.map(r => r.id);
    if (ids.length === 0) {
      setReservaTotalPago({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('reserva_parcelas')
        .select('reserva_id, valor')
        .in('reserva_id', ids);
      if (cancelled) return;
      const map: Record<string, number> = {};
      (data || []).forEach((p: { reserva_id: string; valor: number }) => {
        map[p.reserva_id] = (map[p.reserva_id] || 0) + Number(p.valor || 0);
      });
      setReservaTotalPago(map);
    })();
    return () => { cancelled = true; };
  }, [reservations]);

  // Helper to check if reservation is confirmed
  const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

  // Valor efetivamente recebido pela reserva (líquido de taxa de cartão, menos reembolso parcial).
  // Preferimos a soma de reserva_parcelas quando existir; fallback usa valor_pago − card_fee.
  const isCardMethod = (method?: string | null) => {
    const m = (method || '').toLowerCase();
    return m.includes('cartao') || m.includes('cartão') || m.includes('card') || m === 'credit_card';
  };
  const getValorRecebidoLiquido = (r: Reservation): number => {
    const parcelasSum = reservaTotalPago[r.id];
    let base = 0;
    if (typeof parcelasSum === 'number' && parcelasSum > 0) {
      base = parcelasSum;
    } else {
      const raw = r.valor_pago || 0;
      if (isCardMethod(r.payment_method) && raw > 0) {
        const fee = Number(r.card_fee_amount || 0);
        base = fee > 0 ? Math.max(0, raw - fee) : (r.valor_total_com_opcionais || r.valor_passeio || raw);
      } else {
        base = raw;
      }
    }
    const refund = Number(r.refund_amount || 0);
    return Math.max(0, base - refund);
  };
  // Filter tours by selected year and sort by date
  const yearTours = useMemo(() => {
    return tours
      .filter(t => new Date(t.start_date).getFullYear() === selectedYear)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [tours, selectedYear]);

  // Filter reservations based on year
  const filteredReservations = useMemo(() => {
    if (selectedYear === 2025) {
      return reservations.filter(r => r.capture_method === 'historico');
    }
    return reservations.filter(r => isConfirmed(r.status));
  }, [reservations, selectedYear]);

  // Group tours by month for dynamic data
  const toursByMonth = useMemo(() => {
    const grouped: Record<string, { month: string; monthNum: number; tours: Tour[] }> = {};
    
    yearTours.forEach(tour => {
      const date = new Date(tour.start_date);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const monthNum = date.getMonth();
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          monthNum,
          tours: []
        };
      }
      grouped[monthKey].tours.push(tour);
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => value);
  }, [yearTours]);

  // Para 2025: usar dados estáticos do PDF
  // Para outros anos: calcular dinamicamente
  const tourData = useMemo(() => {
    if (selectedYear === 2025) {
      // Agrupar dados estáticos por mês
      const monthGroups: Record<string, typeof HISTORICO_2025_DATA> = {};
      HISTORICO_2025_DATA.forEach(tour => {
        if (!monthGroups[tour.month]) {
          monthGroups[tour.month] = [];
        }
        monthGroups[tour.month].push(tour);
      });
      
      const monthOrder = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return monthOrder
        .filter(month => monthGroups[month])
        .map(month => ({
          month,
          tours: monthGroups[month]
        }));
    }

    // Cálculo dinâmico para outros anos
    // Passeios cuja data já passou → faturamento realizado (caixa líquido recebido).
    // Passeios futuros/hoje → faturamento projetado (valor dos passeios + opcionais contratados).
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let globalIndex = 0;
    return toursByMonth.map(monthGroup => {
      const toursWithData = monthGroup.tours.map(tour => {
        globalIndex++;
        const tourDate = new Date(tour.start_date);
        tourDate.setHours(0, 0, 0, 0);
        const isPast = tourDate < hoje;

        const tourCosts = allTourCosts.filter(c => c.tour_id === tour.id);

        let faturamento = 0;
        let clientes = 0;

        if (isPast) {
          // Realizado: exclui cancelado/reembolsado total/transferido; para reembolso parcial,
          // getValorRecebidoLiquido já deduz refund_amount.
          const realizadas = filteredReservations.filter(r => {
            if (r.tour_id !== tour.id) return false;
            if (!isConfirmed(r.status)) return false;
            if (r.status === 'transferido') return false;
            if (r.payment_status === 'reembolsado') return false;
            return true;
          });
          faturamento = realizadas.reduce((sum, r) => sum + getValorRecebidoLiquido(r), 0);
          clientes = realizadas.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
        } else {
          // Projetado: valor dos passeios + opcionais, menos cupom.
          const tourReservations = filteredReservations.filter(r => r.tour_id === tour.id && isConfirmed(r.status));
          faturamento = tourReservations.reduce((sum, r) => {
            const valorBase = r.valor_passeio || 0;
            const cupom = Number(r.coupon_discount || 0);

            let adicionaisTotal = 0;
            if (r.adicionais && Array.isArray(r.adicionais)) {
              adicionaisTotal = (r.adicionais as any[]).reduce((addSum, add) => addSum + (add?.valor || 0), 0);
            }

            let optionalsTotal = 0;
            if (r.selected_optional_items && Array.isArray(r.selected_optional_items)) {
              optionalsTotal = (r.selected_optional_items as any[]).reduce((optSum, opt) => {
                return optSum + ((opt?.price || 0) * (opt?.quantity || 1));
              }, 0);
            }

            return sum + Math.max(0, valorBase - cupom) + adicionaisTotal + optionalsTotal;
          }, 0);
          clientes = tourReservations.reduce((sum, r) => sum + (r.numero_participantes || 1), 0);
        }

        const gastos = tourCosts.reduce((sum, c) => sum + (c.quantity * c.unit_value), 0);
        const lucro = faturamento - gastos;
        
        const fatPorCliente = clientes > 0 ? faturamento / clientes : 0;
        const gastosPorCliente = clientes > 0 ? gastos / clientes : 0;
        const lucroPorCliente = clientes > 0 ? lucro / clientes : 0;
        
        return {
          index: globalIndex,
          name: tour.name,
          date: format(new Date(tour.start_date), 'dd/MM/yyyy'),
          faturamento,
          gastos,
          lucro,
          clientes,
          fatPorCliente,
          gastosPorCliente,
          lucroPorCliente,
          isPast
        };
      });

      return {
        month: monthGroup.month,
        tours: toursWithData
      };
    });
  }, [toursByMonth, filteredReservations, allTourCosts, selectedYear, reservaTotalPago]);

  // Calculate totals
  const totals = useMemo(() => {
    if (selectedYear === 2025) {
      return HISTORICO_2025_TOTALS;
    }

    let totalFaturamento = 0;
    let totalGastos = 0;
    let totalClientes = 0;
    
    tourData.forEach(monthGroup => {
      monthGroup.tours.forEach((t: any) => {
        totalFaturamento += t.faturamento;
        totalGastos += t.gastos;
        totalClientes += t.clientes;
      });
    });
    
    const totalLucro = totalFaturamento - totalGastos;
    
    return {
      faturamento: totalFaturamento,
      gastos: totalGastos,
      lucro: totalLucro,
      clientes: totalClientes
    };
  }, [tourData, selectedYear]);

  const totalTours = tourData.reduce((sum, m) => sum + m.tours.length, 0);

  return (
    <div className="space-y-4">
      {/* Charts Modal */}
      <HistoricoChartsModal
        open={showChartsModal}
        onOpenChange={setShowChartsModal}
        tourData={tourData}
        selectedYear={selectedYear}
      />
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3 w-3" />
            Faturamento
          </div>
          <p className="text-sm font-bold text-primary">{formatCurrency(totals.faturamento)}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="h-3 w-3" />
            Gastos
          </div>
          <p className="text-sm font-bold text-destructive">{formatCurrency(totals.gastos)}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            Lucro
          </div>
          <p className={`text-sm font-bold ${totals.lucro >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {formatCurrency(totals.lucro)}
          </p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Users className="h-3 w-3" />
            Clientes
          </div>
          <p className="text-sm font-bold">{totals.clientes}</p>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Histórico de Passeios - {selectedYear}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChartsModal(true)}
                className="gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                Gráficos
              </Button>
              <Badge variant="secondary" className="text-xs">{totalTours} passeios</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[70px] font-bold py-2 px-2">Mês</TableHead>
                  <TableHead className="w-[30px] text-center font-bold py-2 px-1">#</TableHead>
                  <TableHead className="min-w-[140px] font-bold py-2 px-2">Trilha</TableHead>
                  <TableHead className="w-[70px] text-center font-bold py-2 px-1">Data</TableHead>
                  <TableHead className="text-right font-bold py-2 px-2 whitespace-nowrap">Faturamento</TableHead>
                  <TableHead className="text-right font-bold py-2 px-2 whitespace-nowrap">Gastos</TableHead>
                  <TableHead className="text-right font-bold py-2 px-2">Lucro</TableHead>
                  <TableHead className="text-center font-bold py-2 px-1">Cli.</TableHead>
                  <TableHead className="text-right font-bold py-2 px-1 whitespace-nowrap">Fat/Cli</TableHead>
                  <TableHead className="text-right font-bold py-2 px-1 whitespace-nowrap">Gas/Cli</TableHead>
                  <TableHead className="text-right font-bold py-2 px-1 whitespace-nowrap">Luc/Cli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tourData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                      Nenhum passeio encontrado para {selectedYear}
                    </TableCell>
                  </TableRow>
                ) : (
                  tourData.map((monthGroup, monthIndex) => (
                    monthGroup.tours.map((tourItem: any, tourIndex: number) => (
                      <TableRow 
                        key={`${monthGroup.month}-${tourIndex}`}
                        className={tourItem.lucro < 0 ? 'bg-red-50' : ''}
                      >
                        {/* Month - Only show on first row of month */}
                        <TableCell className="font-medium align-top py-1.5 px-2">
                          {tourIndex === 0 && (
                            <Badge variant="outline" className="whitespace-nowrap text-[10px] px-1.5 py-0">
                              {monthGroup.month.substring(0, 3)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground py-1.5 px-1">
                          {tourItem.index}
                        </TableCell>
                        <TableCell className="font-medium py-1.5 px-2 max-w-[180px] truncate" title={tourItem.name}>
                          {tourItem.name}
                        </TableCell>
                        <TableCell className="text-center py-1.5 px-1">
                          {tourItem.date}
                        </TableCell>
                        <TableCell
                          className="text-right font-medium text-primary py-1.5 px-2"
                          title={tourItem.isPast === false ? 'Projetado — passeio ainda não realizado' : (tourItem.isPast ? 'Realizado — caixa líquido recebido' : undefined)}
                        >
                          {formatCurrency(tourItem.faturamento)}
                          {tourItem.isPast === false && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">proj.</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive py-1.5 px-2">
                          {formatCurrency(tourItem.gastos)}
                        </TableCell>
                        <TableCell className={`text-right font-bold py-1.5 px-2 ${tourItem.lucro >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(tourItem.lucro)}
                        </TableCell>
                        <TableCell className="text-center py-1.5 px-1">
                          {tourItem.clientes}
                        </TableCell>
                        <TableCell className="text-right py-1.5 px-1">
                          {formatCurrency(tourItem.fatPorCliente)}
                        </TableCell>
                        <TableCell className="text-right py-1.5 px-1">
                          {formatCurrency(tourItem.gastosPorCliente)}
                        </TableCell>
                        <TableCell className={`text-right py-1.5 px-1 ${tourItem.lucroPorCliente >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(tourItem.lucroPorCliente)}
                        </TableCell>
                      </TableRow>
                    ))
                  ))
                )}
                
                {/* Totals Row */}
                {tourData.length > 0 && (
                  <TableRow className="bg-muted font-bold border-t-2">
                    <TableCell colSpan={4} className="text-right py-2 px-2">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right text-primary py-2 px-2">
                      {formatCurrency(totals.faturamento)}
                    </TableCell>
                    <TableCell className="text-right text-destructive py-2 px-2">
                      {formatCurrency(totals.gastos)}
                    </TableCell>
                    <TableCell className={`text-right py-2 px-2 ${totals.lucro >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(totals.lucro)}
                    </TableCell>
                    <TableCell className="text-center py-2 px-1">
                      {totals.clientes}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroHistorico;
