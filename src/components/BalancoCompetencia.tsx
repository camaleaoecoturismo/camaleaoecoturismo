import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tour {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
}

interface Reservation {
  id: string;
  tour_id: string;
  status: string;
  payment_status: string;
  valor_pago: number | null;
  valor_passeio: number | null;
  valor_total_com_opcionais: number | null;
  data_pagamento: string | null;
  numero_participantes: number | null;
  card_fee_amount?: number | null;
  selected_optional_items?: any[] | null;
  capture_method?: string | null;
}

interface TourCost {
  id: string;
  tour_id: string;
  product_service: string;
  quantity: number;
  unit_value: number;
  auto_scale_participants?: boolean;
  auto_scale_optional_item_id?: string | null;
  auto_scale_pricing_option_id?: string | null;
}

interface MonthlyGeneralCost {
  id: string;
  month: string;
  year: number;
  expense_name: string;
  quantity: number;
  unit_value: number;
  expense_type: string;
}

interface RecurringCost {
  id: string;
  expense_name: string;
  unit_value: number;
  expense_type: string;
  status: 'ativo' | 'pausado' | 'encerrado';
  start_date: string;
  end_date: string | null;
}

interface ParticipantData {
  id: string;
  reserva_id: string;
  pricing_option_id: string | null;
  selected_optionals: any[] | null;
}

interface Parcela {
  reserva_id: string;
  valor: number;
  data_pagamento: string;
}

interface BalancoCompetenciaProps {
  tours: Tour[];
  reservations: Reservation[];
  allTourCosts: TourCost[];
  allMonthlyGeneralCosts: MonthlyGeneralCost[];
  recurringCosts: RecurringCost[];
  selectedYear: number;
  onYearChange?: (year: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IR_RATE = 0.06;

const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmt = (v: number) =>
  v === 0 ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtSigned = (v: number) => {
  if (v === 0) return '—';
  const s = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Math.abs(v));
  return v >= 0 ? `+${s}` : `-${s}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isConfirmed = (status: string) => status === 'confirmada' || status === 'confirmado';

const calcRealTourValue = (r: Reservation): number => {
  const base = r.valor_passeio || 0;
  let optionals = 0;
  if (r.selected_optional_items && Array.isArray(r.selected_optional_items)) {
    optionals = r.selected_optional_items.reduce((s: number, o: any) => s + ((o.price || 0) * (o.quantity || 1)), 0);
  }
  return base + optionals;
};

const calcEffectiveQty = (
  cost: TourCost,
  confirmedCount: number,
  participants: ParticipantData[],
  tourReservations: Reservation[],
): number => {
  if (cost.auto_scale_optional_item_id) {
    let count = 0;
    participants.forEach(p => {
      if (p.selected_optionals?.some((o: any) => o.id === cost.auto_scale_optional_item_id || o.optional_id === cost.auto_scale_optional_item_id)) count++;
    });
    tourReservations.forEach(r => {
      (r.selected_optional_items || []).forEach((o: any) => {
        if (o.id === cost.auto_scale_optional_item_id) count += o.quantity || 1;
      });
    });
    return count || 0;
  }
  if (cost.auto_scale_pricing_option_id) {
    return participants.filter(p => p.pricing_option_id === cost.auto_scale_pricing_option_id).length;
  }
  if (cost.auto_scale_participants && confirmedCount > 0) return confirmedCount;
  return cost.quantity;
};

// ─── Component ────────────────────────────────────────────────────────────────

const BalancoCompetencia: React.FC<BalancoCompetenciaProps> = ({
  tours,
  reservations,
  allTourCosts,
  allMonthlyGeneralCosts,
  recurringCosts,
  selectedYear,
  onYearChange,
}) => {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [internalYear, setInternalYear] = useState(selectedYear);

  const year = onYearChange ? selectedYear : internalYear;
  const setYear = onYearChange ?? setInternalYear;

  useEffect(() => {
    const fetch = async () => {
      const [pRes, partRes] = await Promise.all([
        supabase.from('reserva_parcelas').select('reserva_id, valor, data_pagamento'),
        supabase.from('reservation_participants' as any).select('id, reserva_id, pricing_option_id, selected_optionals'),
      ]);
      setParcelas((pRes.data || []) as Parcela[]);
      setParticipants(((partRes.data || []) as any[]).map((p: any) => ({
        id: p.id,
        reserva_id: p.reserva_id,
        pricing_option_id: p.pricing_option_id || null,
        selected_optionals: Array.isArray(p.selected_optionals) ? p.selected_optionals : null,
      })));
    };
    fetch();
  }, []);

  const parcelasMap = useMemo(() => {
    const map = new Map<string, Parcela[]>();
    parcelas.forEach(p => {
      const arr = map.get(p.reserva_id) || [];
      arr.push(p);
      map.set(p.reserva_id, arr);
    });
    return map;
  }, [parcelas]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const monthlyData = useMemo(() => {
    return MONTH_ABBR.map((_, mi) => {
      const monthStart = startOfMonth(new Date(year, mi));
      const monthEnd = endOfMonth(monthStart);
      const monthKey = `${year}-${String(mi + 1).padStart(2, '0')}`;

      // Tours that START in this month
      const monthTours = tours.filter(t => {
        const d = new Date(t.start_date + 'T12:00:00');
        return d >= monthStart && d <= monthEnd;
      });

      // Confirmed reservations for those tours
      const monthReservations = reservations.filter(r =>
        isConfirmed(r.status) && monthTours.some(t => t.id === r.tour_id)
      );

      // RECEITA: sum all parcelas for those reservations (no date filter)
      let receita = 0;
      monthReservations.forEach(r => {
        const rParcelas = parcelasMap.get(r.id);
        if (rParcelas && rParcelas.length > 0) {
          rParcelas.forEach(p => { receita += Number(p.valor); });
        } else if (r.valor_pago) {
          // Fallback: net value (subtract card fees)
          receita += r.valor_pago - (r.card_fee_amount || 0);
        }
      });

      // GASTOS VIAGEM: tour costs attributed to tour month (same as BalancoAnual)
      let gastosViagem = 0;
      monthTours.forEach(tour => {
        const costs = allTourCosts.filter(c => c.tour_id === tour.id);
        const tourRes = monthReservations.filter(r => r.tour_id === tour.id);
        const confirmedCount = tourRes.reduce((s, r) => s + (r.numero_participantes || 1), 0);
        const tourParticipants = participants.filter(p => tourRes.some(r => r.id === p.reserva_id));
        costs.forEach(c => {
          gastosViagem += calcEffectiveQty(c, confirmedCount, tourParticipants, tourRes) * c.unit_value;
        });
      });

      // CUSTOS MENSAIS
      const monthCosts = allMonthlyGeneralCosts.filter(c => c.month === monthKey && c.year === year);
      const proLabore = monthCosts.filter(c => c.expense_type === 'pro_labore').reduce((s, c) => s + c.quantity * c.unit_value, 0);
      const custosPontuais = monthCosts.filter(c => c.expense_type !== 'pro_labore').reduce((s, c) => s + c.quantity * c.unit_value, 0);

      // RECORRENTES
      const monthMid = new Date(year, mi, 15);
      const activeRecurring = recurringCosts.filter(c => {
        if (c.status !== 'ativo') return false;
        const start = new Date(c.start_date + 'T12:00:00');
        if (start > monthMid) return false;
        if (c.end_date) {
          const end = new Date(c.end_date + 'T12:00:00');
          if (end < new Date(year, mi, 1)) return false;
        }
        return true;
      }).reduce((s, c) => s + c.unit_value, 0);

      const manutencao = custosPontuais + activeRecurring;
      const ir = receita * IR_RATE;
      const gastosTotal = gastosViagem + manutencao + proLabore + ir;
      const resultado = receita - gastosTotal;

      const isFuture = monthEnd > today;
      const hasData = receita > 0 || gastosViagem > 0 || manutencao > 0;

      // Detail: per-tour breakdown
      const tourDetail = monthTours.map(tour => {
        const tourRes = monthReservations.filter(r => r.tour_id === tour.id);
        let tourReceita = 0;
        tourRes.forEach(r => {
          const rParcelas = parcelasMap.get(r.id);
          if (rParcelas && rParcelas.length > 0) {
            rParcelas.forEach(p => { tourReceita += Number(p.valor); });
          } else if (r.valor_pago) {
            tourReceita += r.valor_pago - (r.card_fee_amount || 0);
          }
        });
        const costs = allTourCosts.filter(c => c.tour_id === tour.id);
        const confirmedCount = tourRes.reduce((s, r) => s + (r.numero_participantes || 1), 0);
        const tourParticipants = participants.filter(p => tourRes.some(r => r.id === p.reserva_id));
        let tourCusto = 0;
        costs.forEach(c => { tourCusto += calcEffectiveQty(c, confirmedCount, tourParticipants, tourRes) * c.unit_value; });

        return { tour, receita: tourReceita, custo: tourCusto, clientes: tourRes.length };
      });

      return { mi, receita, gastosViagem, manutencao, proLabore, ir, gastosTotal, resultado, isFuture, hasData, tourDetail };
    });
  }, [tours, reservations, allTourCosts, allMonthlyGeneralCosts, recurringCosts, parcelasMap, participants, year, today]);

  // Running accumulator
  const withAccumulated = useMemo(() => {
    let acc = 0;
    return monthlyData.map(m => {
      if (m.hasData) acc += m.resultado;
      return { ...m, acumulado: m.hasData ? acc : null };
    });
  }, [monthlyData]);

  const totals = useMemo(() => {
    const rows = withAccumulated.filter(m => m.hasData);
    return {
      receita: rows.reduce((s, m) => s + m.receita, 0),
      gastosViagem: rows.reduce((s, m) => s + m.gastosViagem, 0),
      manutencao: rows.reduce((s, m) => s + m.manutencao, 0),
      proLabore: rows.reduce((s, m) => s + m.proLabore, 0),
      ir: rows.reduce((s, m) => s + m.ir, 0),
      resultado: rows.reduce((s, m) => s + m.resultado, 0),
    };
  }, [withAccumulated]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    tours.forEach(t => { if (t.start_date) years.add(Number(t.start_date.slice(0, 4))); });
    return [...years].sort((a, b) => b - a);
  }, [tours]);

  const detailData = detailMonth !== null ? withAccumulated[detailMonth] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Balanço por Mês de Passeio</h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Receita e custos atribuídos ao mês do passeio, independente de quando o pagamento foi feito.</span>
          </div>
        </div>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28 bg-white text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {availableYears.map(y => <SelectItem key={y} value={String(y)} className="text-foreground">{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Mês</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Receita</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">G. Viagem</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Fixos + PL</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">IR (6%)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Resultado</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {withAccumulated.map((m, i) => {
                  const isCurrentMonth = new Date().getMonth() === m.mi && new Date().getFullYear() === year;
                  if (!m.hasData && m.isFuture) return null;

                  return (
                    <tr
                      key={i}
                      onClick={() => m.hasData ? setDetailMonth(m.mi) : undefined}
                      className={[
                        'border-b border-slate-100 transition-colors',
                        m.hasData ? 'cursor-pointer hover:bg-slate-50' : 'opacity-40',
                        isCurrentMonth ? 'bg-blue-50/50' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                          {MONTH_ABBR[m.mi]}
                          {isCurrentMonth && <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0">atual</Badge>}
                          {m.isFuture && m.hasData && <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">parcial</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">{m.hasData ? fmt(m.receita) : '—'}</td>
                      <td className="px-4 py-3 text-right text-red-600">{m.hasData ? fmt(m.gastosViagem) : '—'}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{m.hasData ? fmt(m.manutencao + m.proLabore) : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{m.hasData ? fmt(m.ir) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${m.resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.hasData ? fmtSigned(m.resultado) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${(m.acumulado ?? 0) >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                        {m.acumulado !== null ? fmt(m.acumulado) : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                  <td className="px-4 py-3 text-slate-700">TOTAL</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(totals.receita)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(totals.gastosViagem)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt(totals.manutencao + totals.proLabore)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{fmt(totals.ir)}</td>
                  <td className={`px-4 py-3 text-right ${totals.resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(totals.resultado)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailMonth !== null} onOpenChange={open => { if (!open) setDetailMonth(null); }}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {detailMonth !== null ? MONTH_FULL[detailMonth] : ''} {year} — Detalhe por Passeio
            </DialogTitle>
          </DialogHeader>
          {detailData && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pr-2">
                {detailData.tourDetail.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum passeio neste mês.</p>
                )}
                {detailData.tourDetail.map(({ tour, receita, custo, clientes }) => {
                  const resultado = receita - custo;
                  return (
                    <div key={tour.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{tour.name}</p>
                        <p className="text-xs text-muted-foreground">{clientes} cliente{clientes !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex gap-6 shrink-0 text-right text-xs">
                        <div>
                          <p className="text-muted-foreground">Receita</p>
                          <p className="font-medium text-green-700">{fmt(receita)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Custo</p>
                          <p className="font-medium text-red-600">{fmt(custo)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Resultado</p>
                          <p className={`font-semibold ${resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(resultado)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Month subtotal */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center px-3">
                  <span className="text-sm font-semibold text-slate-700">Subtotal do mês</span>
                  <div className="flex gap-6 text-right text-xs">
                    <div>
                      <p className="text-muted-foreground">Receita</p>
                      <p className="font-semibold text-green-700">{fmt(detailData.receita)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">G. Viagem</p>
                      <p className="font-semibold text-red-600">{fmt(detailData.gastosViagem)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fixos+PL+IR</p>
                      <p className="font-semibold text-orange-600">{fmt(detailData.manutencao + detailData.proLabore + detailData.ir)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resultado</p>
                      <p className={`font-semibold ${detailData.resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(detailData.resultado)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BalancoCompetencia;
