import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  MessageCircle,
  Wallet,
  Loader2,
  ArrowLeft,
  Save,
  CheckSquare,
  Square,
  Calendar,
  MapPin,
  Filter,
} from 'lucide-react';
import { Tour } from '@/hooks/useTours';

interface BulkPaymentConfigManagerProps {
  tours: Tour[];
  onBack: () => void;
  onRefresh?: () => void;
}

type PaymentMode = 'whatsapp' | 'mercadopago' | 'both';

interface TourPaymentData {
  id: string;
  name: string;
  start_date: string;
  city: string;
  payment_mode: PaymentMode;
  is_active: boolean;
  selected: boolean;
  hasChanges: boolean;
}

const PAYMENT_MODE_LABELS: Record<PaymentMode, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: {
    label: 'PIX Parcelado',
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  mercadopago: {
    label: 'InfinitePay',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  both: {
    label: 'Ambos',
    icon: <Wallet className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
};

export const BulkPaymentConfigManager: React.FC<BulkPaymentConfigManagerProps> = ({
  tours,
  onBack,
  onRefresh,
}) => {
  const [tourPayments, setTourPayments] = useState<TourPaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const { toast } = useToast();

  // Initialize tour payment data
  useEffect(() => {
    const data: TourPaymentData[] = tours.map((tour) => ({
      id: tour.id,
      name: tour.name,
      start_date: tour.start_date,
      city: tour.city,
      payment_mode: (tour.payment_mode || 'whatsapp') as PaymentMode,
      is_active: tour.is_active,
      selected: false,
      hasChanges: false,
    }));
    setTourPayments(data);
    setLoading(false);
  }, [tours]);

  // Filter tours
  const filteredTours = useMemo(() => {
    let result = [...tourPayments];
    
    if (filterActive === 'ativos') {
      result = result.filter((t) => t.is_active);
    } else if (filterActive === 'inativos') {
      result = result.filter((t) => !t.is_active);
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    return result;
  }, [tourPayments, filterActive]);

  // Selected tours
  const selectedTours = useMemo(() => {
    return filteredTours.filter((t) => t.selected);
  }, [filteredTours]);

  // Tours with changes
  const toursWithChanges = useMemo(() => {
    return tourPayments.filter((t) => t.hasChanges);
  }, [tourPayments]);

  // Toggle selection
  const toggleSelection = useCallback((tourId: string) => {
    setTourPayments((prev) =>
      prev.map((t) =>
        t.id === tourId ? { ...t, selected: !t.selected } : t
      )
    );
  }, []);

  // Select all visible
  const selectAllVisible = useCallback(() => {
    const visibleIds = new Set(filteredTours.map((t) => t.id));
    const allSelected = filteredTours.every((t) => t.selected);
    
    setTourPayments((prev) =>
      prev.map((t) =>
        visibleIds.has(t.id) ? { ...t, selected: !allSelected } : t
      )
    );
  }, [filteredTours]);

  // Change payment mode for a single tour
  const changePaymentMode = useCallback((tourId: string, newMode: PaymentMode) => {
    setTourPayments((prev) =>
      prev.map((t) => {
        if (t.id !== tourId) return t;
        const originalTour = tours.find((tour) => tour.id === tourId);
        const originalMode = (originalTour?.payment_mode || 'whatsapp') as PaymentMode;
        return {
          ...t,
          payment_mode: newMode,
          hasChanges: newMode !== originalMode,
        };
      })
    );
  }, [tours]);

  // Apply payment mode to selected tours
  const applyToSelected = useCallback((mode: PaymentMode) => {
    setTourPayments((prev) =>
      prev.map((t) => {
        if (!t.selected) return t;
        const originalTour = tours.find((tour) => tour.id === t.id);
        const originalMode = (originalTour?.payment_mode || 'whatsapp') as PaymentMode;
        return {
          ...t,
          payment_mode: mode,
          hasChanges: mode !== originalMode,
        };
      })
    );
  }, [tours]);

  // Save all changes
  const saveAllChanges = async () => {
    if (toursWithChanges.length === 0) return;

    setSaving(true);
    try {
      const updates = toursWithChanges.map((tour) =>
        supabase
          .from('tours')
          .update({ payment_mode: tour.payment_mode })
          .eq('id', tour.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(`${errors.length} erros ao salvar`);
      }

      toast({
        title: 'Alterações salvas!',
        description: `${toursWithChanges.length} passeio(s) atualizado(s).`,
      });

      // Reset changes state
      setTourPayments((prev) =>
        prev.map((t) => ({ ...t, hasChanges: false, selected: false }))
      );

      onRefresh?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configurar Pagamentos em Massa</h2>
            <p className="text-sm text-muted-foreground">
              Altere o método de pagamento de múltiplos passeios de uma vez
            </p>
          </div>
        </div>

        {toursWithChanges.length > 0 && (
          <Button onClick={saveAllChanges} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar {toursWithChanges.length} Alteraç{toursWithChanges.length === 1 ? 'ão' : 'ões'}
          </Button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side - Selection controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                className="gap-2"
              >
                {filteredTours.every((t) => t.selected) ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {filteredTours.every((t) => t.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>

              {selectedTours.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedTours.length} selecionado(s)
                </span>
              )}

              {/* Filter */}
              <div className="flex items-center gap-2 ml-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex bg-background rounded-lg border p-1 gap-1">
                  {(['todos', 'ativos', 'inativos'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterActive(status)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                        filterActive === status
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Bulk apply buttons */}
            {selectedTours.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Aplicar aos selecionados:</span>
                {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant="outline"
                    size="sm"
                    onClick={() => applyToSelected(mode)}
                    className={`gap-1.5 ${PAYMENT_MODE_LABELS[mode].color}`}
                  >
                    {PAYMENT_MODE_LABELS[mode].icon}
                    {PAYMENT_MODE_LABELS[mode].label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tours List */}
      <div className="space-y-2">
        {filteredTours.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum passeio encontrado com os filtros atuais.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTours.map((tour) => (
            <Card
              key={tour.id}
              className={`transition-all ${
                tour.hasChanges ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''
              } ${tour.selected ? 'bg-primary/5 border-primary/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={tour.selected}
                    onCheckedChange={() => toggleSelection(tour.id)}
                    className="h-5 w-5"
                  />

                  {/* Tour Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">{tour.name}</h3>
                      {!tour.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                      {tour.hasChanges && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          Alterado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tour.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tour.city}
                      </span>
                    </div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="flex items-center gap-2">
                    {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => {
                      const isSelected = tour.payment_mode === mode;
                      const config = PAYMENT_MODE_LABELS[mode];
                      return (
                        <button
                          key={mode}
                          onClick={() => changePaymentMode(tour.id, mode)}
                          className={`
                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                            transition-all border
                            ${
                              isSelected
                                ? config.color + ' ring-2 ring-offset-1 ring-current/30'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }
                          `}
                        >
                          {config.icon}
                          <span className="hidden sm:inline">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <span>
          Mostrando {filteredTours.length} de {tourPayments.length} passeios
        </span>
        {toursWithChanges.length > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {toursWithChanges.length} alteraç{toursWithChanges.length === 1 ? 'ão' : 'ões'} pendente(s)
          </Badge>
        )}
      </div>
    </div>
  );
};
