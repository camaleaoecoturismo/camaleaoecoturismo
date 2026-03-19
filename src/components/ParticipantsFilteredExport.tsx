import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter, FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FilterableParticipant {
  nome: string;
  cpf: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  pacote: string;
  embarque: string;
  status_pagamento: string;
  valor_base: number;
  valor_pago: number;
  opcionais: string[];
  condicionamento: string;
  problema_saude: boolean;
  descricao_problema_saude: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  observacoes: string;
  tipo: string;
}

interface ParticipantsFilteredExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: FilterableParticipant[];
  availableOptionals: string[];
  availablePackages: string[];
  availableBoardingPoints: string[];
  availablePaymentStatuses: string[];
  tourName?: string;
  tourDate?: string;
  tourEndDate?: string | null;
  tourCity?: string;
  tourState?: string;
  tourVagas?: number | null;
  totalParticipants?: number;
}

type FilterKey = 'opcionais' | 'pacote' | 'embarque' | 'status_pagamento' | 'condicionamento' | 'tipo';

const CONDICIONAMENTO_OPTIONS = ['Sedentário', 'Iniciante', 'Intermediário', 'Avançado', 'Atleta'];
const TIPO_OPTIONS = [
  { value: 'titular', label: 'Titular' },
  { value: 'adicional', label: 'Adicional' },
  { value: 'equipe', label: 'Equipe' },
];

const ALL_COLUMNS: { key: string; label: string; filterKey?: FilterKey }[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'data_nascimento', label: 'Data Nasc.' },
  { key: 'pacote', label: 'Pacote', filterKey: 'pacote' },
  { key: 'embarque', label: 'Embarque', filterKey: 'embarque' },
  { key: 'status_pagamento', label: 'Status Pgto', filterKey: 'status_pagamento' },
  { key: 'valor_base', label: 'Valor Base' },
  { key: 'valor_pago', label: 'Valor Pago' },
  { key: 'opcionais', label: 'Opcionais', filterKey: 'opcionais' },
  { key: 'condicionamento', label: 'Condicionamento', filterKey: 'condicionamento' },
  { key: 'problema_saude', label: 'Problema Saúde' },
  { key: 'descricao_problema_saude', label: 'Desc. Problema Saúde' },
  { key: 'contato_emergencia_nome', label: 'Contato Emergência' },
  { key: 'contato_emergencia_telefone', label: 'Tel. Emergência' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'tipo', label: 'Tipo', filterKey: 'tipo' },
];

const ParticipantsFilteredExport: React.FC<ParticipantsFilteredExportProps> = ({
  open,
  onOpenChange,
  participants,
  availableOptionals,
  availablePackages,
  availableBoardingPoints,
  availablePaymentStatuses,
  tourName,
  tourDate,
  tourEndDate,
  tourCity,
  tourState,
  tourVagas,
  totalParticipants,
}) => {
  const { toast } = useToast();

  const [selectedOptionals, setSelectedOptionals] = useState<Set<string>>(new Set());
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [selectedBoardingPoints, setSelectedBoardingPoints] = useState<Set<string>>(new Set());
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<Set<string>>(new Set());
  const [selectedCondicionamento, setSelectedCondicionamento] = useState<Set<string>>(new Set());
  const [selectedTipos, setSelectedTipos] = useState<Set<string>>(new Set());
  const [optionalFilterMode, setOptionalFilterMode] = useState<'any' | 'all'>('any');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_COLUMNS.map(c => c.key)));

  // Load company logo from settings
  useEffect(() => {
    const loadLogo = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_logo_url')
        .single();
      if (data?.setting_value) {
        setLogoBase64(data.setting_value);
      }
    };
    if (open) loadLogo();
  }, [open]);

  const toggleSetItem = (set: Set<string>, item: string): Set<string> => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      if (selectedOptionals.size > 0) {
        if (optionalFilterMode === 'any') {
          if (!Array.from(selectedOptionals).some(opt => p.opcionais.includes(opt))) return false;
        } else {
          if (!Array.from(selectedOptionals).every(opt => p.opcionais.includes(opt))) return false;
        }
      }
      if (selectedPackages.size > 0 && !selectedPackages.has(p.pacote)) return false;
      if (selectedBoardingPoints.size > 0 && !selectedBoardingPoints.has(p.embarque)) return false;
      if (selectedPaymentStatuses.size > 0 && !selectedPaymentStatuses.has(p.status_pagamento)) return false;
      if (selectedCondicionamento.size > 0 && !selectedCondicionamento.has(p.condicionamento)) return false;
      if (selectedTipos.size > 0 && !selectedTipos.has(p.tipo)) return false;
      return true;
    });
  }, [participants, selectedOptionals, selectedPackages, selectedBoardingPoints, selectedPaymentStatuses, selectedCondicionamento, selectedTipos, optionalFilterMode]);

  const activeFilterKeys = useMemo(() => {
    const keys: FilterKey[] = [];
    if (selectedOptionals.size > 0) keys.push('opcionais');
    if (selectedPackages.size > 0) keys.push('pacote');
    if (selectedBoardingPoints.size > 0) keys.push('embarque');
    if (selectedPaymentStatuses.size > 0) keys.push('status_pagamento');
    if (selectedCondicionamento.size > 0) keys.push('condicionamento');
    if (selectedTipos.size > 0) keys.push('tipo');
    return keys;
  }, [selectedOptionals, selectedPackages, selectedBoardingPoints, selectedPaymentStatuses, selectedCondicionamento, selectedTipos]);

  // When opcionais filter is active, split into individual columns per selected optional
  const previewColumns = useMemo(() => {
    // Start with columns the user has selected
    const visibleCols = ALL_COLUMNS.filter(col => selectedColumns.has(col.key));
    
    // If optional filters are active, expand opcionais into individual columns
    if (selectedOptionals.size > 0) {
      const result: { key: string; label: string; filterKey?: FilterKey }[] = [];
      for (const col of visibleCols) {
        if (col.key === 'opcionais') {
          Array.from(selectedOptionals).forEach(opt => {
            result.push({ key: `opcional_${opt}`, label: opt, filterKey: 'opcionais' });
          });
        } else {
          result.push(col);
        }
      }
      return result;
    }
    
    return visibleCols;
  }, [selectedColumns, selectedOptionals]);

  const hasActiveFilters = activeFilterKeys.length > 0;

  const clearAllFilters = () => {
    setSelectedOptionals(new Set());
    setSelectedPackages(new Set());
    setSelectedBoardingPoints(new Set());
    setSelectedPaymentStatuses(new Set());
    setSelectedCondicionamento(new Set());
    setSelectedTipos(new Set());
  };

  const getCellValue = (p: FilterableParticipant, key: string): string => {
    // Handle individual optional columns
    if (key.startsWith('opcional_')) {
      const optName = key.replace('opcional_', '');
      return p.opcionais.includes(optName) ? 'Sim' : 'Não';
    }
    
    switch (key) {
      case 'nome': return p.nome;
      case 'cpf': return p.cpf;
      case 'email': return p.email;
      case 'whatsapp': return p.whatsapp;
      case 'data_nascimento': return p.data_nascimento;
      case 'pacote': return p.pacote || '-';
      case 'embarque': return p.embarque || '-';
      case 'status_pagamento': return p.status_pagamento;
      case 'valor_base': return `R$ ${p.valor_base?.toFixed(2) || '0.00'}`;
      case 'valor_pago': return `R$ ${p.valor_pago?.toFixed(2) || '0.00'}`;
      case 'opcionais': return p.opcionais.join(', ') || '-';
      case 'condicionamento': return p.condicionamento || '-';
      case 'problema_saude': return p.problema_saude ? 'Sim' : 'Não';
      case 'descricao_problema_saude': return p.descricao_problema_saude || '-';
      case 'contato_emergencia_nome': return p.contato_emergencia_nome || '-';
      case 'contato_emergencia_telefone': return p.contato_emergencia_telefone || '-';
      case 'observacoes': return p.observacoes || '-';
      case 'tipo': return p.tipo === 'titular' ? 'Titular' : p.tipo === 'adicional' ? 'Adicional' : 'Equipe';
      default: return '-';
    }
  };

  const buildExportRows = () => {
    return filteredParticipants.map((p, i) => {
      const row: Record<string, string | number> = { '#': i + 1 };
      previewColumns.forEach(col => {
        row[col.label] = getCellValue(p, col.key);
      });
      return row;
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const formatTourDate = () => {
    const start = formatDate(tourDate);
    const end = formatDate(tourEndDate);
    if (start && end && end !== start) return `${start} a ${end}`;
    return start;
  };

  const tourLocation = [tourCity, tourState].filter(Boolean).join(' - ');

  const handleExportXLSX = () => {
    if (filteredParticipants.length === 0) {
      toast({ title: "Nenhum participante para exportar", variant: "destructive" });
      return;
    }
    const data = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    const fileName = tourName ? `participantes-${tourName}.xlsx` : 'participantes_filtrados.xlsx';
    XLSX.writeFile(wb, fileName);
    toast({ title: `${filteredParticipants.length} participante(s) exportado(s) em XLSX` });
  };

  const handleExportPDF = () => {
    if (filteredParticipants.length === 0) {
      toast({ title: "Nenhum participante para exportar", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({ orientation: previewColumns.length > 3 ? 'landscape' : 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let yPos = 10;
    const logoSize = 16;

    // Add logo if available
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, 8, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    const textX = logoBase64 ? 14 + logoSize + 4 : 14;

    // Tour name
    if (tourName) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(tourName, textX, yPos + 3);
      yPos += 5;
    }

    // Location + Date on same line
    const infoParts: string[] = [];
    if (tourLocation) infoParts.push(tourLocation);
    if (formatTourDate()) infoParts.push(formatTourDate());
    if (infoParts.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(infoParts.join('  •  '), textX, yPos + 3);
      yPos += 4;
    }

    // Vagas + Total participants
    const metaParts: string[] = [];
    if (tourVagas) metaParts.push(`Vagas: ${tourVagas}`);
    const total = totalParticipants ?? participants.length;
    metaParts.push(`Participantes: ${total}`);
    if (hasActiveFilters) metaParts.push(`Filtrados: ${filteredParticipants.length}`);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(metaParts.join('  |  '), textX, yPos + 3);
    yPos += 4;

    // Filter info
    if (hasActiveFilters) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      const filterLabels: string[] = [];
      if (selectedOptionals.size > 0) filterLabels.push(`Opcionais: ${Array.from(selectedOptionals).join(', ')}`);
      if (selectedPackages.size > 0) filterLabels.push(`Pacotes: ${Array.from(selectedPackages).join(', ')}`);
      if (selectedBoardingPoints.size > 0) filterLabels.push(`Embarque: ${Array.from(selectedBoardingPoints).join(', ')}`);
      if (selectedPaymentStatuses.size > 0) filterLabels.push(`Pgto: ${Array.from(selectedPaymentStatuses).join(', ')}`);
      if (selectedCondicionamento.size > 0) filterLabels.push(`Cond: ${Array.from(selectedCondicionamento).join(', ')}`);
      if (selectedTipos.size > 0) filterLabels.push(`Tipo: ${Array.from(selectedTipos).map(t => TIPO_OPTIONS.find(o => o.value === t)?.label || t).join(', ')}`);
      doc.text(`Filtros: ${filterLabels.join(' | ')}`, textX, yPos + 3);
      yPos += 4;
    }

    // Separator line
    yPos = Math.max(yPos, logoBase64 ? 10 + logoSize + 2 : yPos) + 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 3;

    const headers = ['#', ...previewColumns.map(c => c.label)];
    const body = filteredParticipants.map((p, i) => [
      String(i + 1),
      ...previewColumns.map(col => getCellValue(p, col.key)),
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: yPos,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
    });

    const fileName = tourName ? `participantes-${tourName}.pdf` : 'participantes_filtrados.pdf';
    doc.save(fileName);
    toast({ title: `${filteredParticipants.length} participante(s) exportado(s) em PDF` });
  };

  const renderFilterSection = (
    title: string,
    items: string[],
    selected: Set<string>,
    onToggle: (item: string) => void
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</Label>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {items.map(item => (
            <label
              key={item}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors ${
                selected.has(item)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 border-border hover:bg-muted'
              }`}
            >
              <Checkbox
                checked={selected.has(item)}
                onCheckedChange={() => onToggle(item)}
                className="h-3 w-3 hidden"
              />
              {item}
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Exportar com Filtros
          </DialogTitle>
          {tourName && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{tourName}</span>
              {tourLocation && <span> • {tourLocation}</span>}
              {formatTourDate() && <span> • {formatTourDate()}</span>}
              {tourVagas && <span> • {tourVagas} vagas</span>}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Filters */}
          <div className="space-y-3">
            {availableOptionals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opcionais</Label>
                  {selectedOptionals.size > 1 && (
                    <Select value={optionalFilterMode} onValueChange={(v) => setOptionalFilterMode(v as 'any' | 'all')}>
                      <SelectTrigger className="h-6 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer um</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {availableOptionals.map(item => (
                    <label
                      key={item}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors ${
                        selectedOptionals.has(item)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 border-border hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedOptionals.has(item)}
                        onCheckedChange={() => setSelectedOptionals(prev => toggleSetItem(prev, item))}
                        className="h-3 w-3 hidden"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {renderFilterSection('Pacote', availablePackages, selectedPackages, (item) => setSelectedPackages(prev => toggleSetItem(prev, item)))}
            {renderFilterSection('Ponto de Embarque', availableBoardingPoints, selectedBoardingPoints, (item) => setSelectedBoardingPoints(prev => toggleSetItem(prev, item)))}
            {renderFilterSection('Status de Pagamento', availablePaymentStatuses, selectedPaymentStatuses, (item) => setSelectedPaymentStatuses(prev => toggleSetItem(prev, item)))}
            {renderFilterSection('Condicionamento', CONDICIONAMENTO_OPTIONS.filter(c => participants.some(p => p.condicionamento === c)), selectedCondicionamento, (item) => setSelectedCondicionamento(prev => toggleSetItem(prev, item)))}
            {renderFilterSection(
              'Tipo de Participante',
              TIPO_OPTIONS.filter(t => participants.some(p => p.tipo === t.value)).map(t => t.label),
              selectedTipos,
              (item) => {
                const mapped = TIPO_OPTIONS.find(t => t.label === item)?.value || item;
                setSelectedTipos(prev => toggleSetItem(prev, mapped));
              }
            )}
          </div>

          {/* Column Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colunas visíveis</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setSelectedColumns(new Set(ALL_COLUMNS.map(c => c.key)))}>Todas</Button>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setSelectedColumns(new Set(['nome']))}>Mínimo</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {ALL_COLUMNS.map(col => (
                <label
                  key={col.key}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors ${
                    selectedColumns.has(col.key)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 border-border hover:bg-muted'
                  } ${col.key === 'nome' ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => {
                      if (col.key === 'nome') return;
                      setSelectedColumns(prev => toggleSetItem(prev, col.key));
                    }}
                    className="h-3 w-3 hidden"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Summary bar */}
          <div className="pt-2 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredParticipants.length}</span> de {participants.length} participantes
              {hasActiveFilters && (
                <span className="ml-2 text-xs">
                  • Colunas: # + {previewColumns.map(c => c.label).join(', ')}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Preview Table */}
          {filteredParticipants.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="text-xs font-medium text-muted-foreground px-3 py-1.5 bg-muted/30 border-b">
                Pré-visualização ({Math.min(filteredParticipants.length, 20)} de {filteredParticipants.length})
              </div>
              <ScrollArea className="max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-2 py-1.5 text-left font-semibold w-8">#</th>
                      {previewColumns.map(col => (
                        <th key={col.key} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.slice(0, 20).map((p, i) => (
                      <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        {previewColumns.map(col => (
                          <td key={col.key} className="px-2 py-1 max-w-[200px] truncate">
                            {getCellValue(p, col.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportXLSX}
            disabled={filteredParticipants.length === 0}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            XLSX ({filteredParticipants.length})
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={filteredParticipants.length === 0}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF ({filteredParticipants.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantsFilteredExport;
