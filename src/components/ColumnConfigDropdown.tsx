import React, { useState } from 'react';
import { Eye, EyeOff, GripVertical, Save, Folder, Trash2, Plus, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width?: number;
  bgColor?: string;
  textColor?: string;
}

export interface ColumnPreset {
  id: string;
  name: string;
  columns: ColumnConfig[];
}

interface ColumnConfigDropdownProps {
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  onReorderColumns: (columns: ColumnConfig[]) => void;
  onApplyPreset: (columns: ColumnConfig[]) => void;
  onUpdateColumnStyle?: (columnId: string, updates: Partial<ColumnConfig>) => void;
  storageKey?: string;
}

const COLUMN_COLORS = [
  { label: 'Padrão', value: '' },
  { label: 'Verde', value: '#dcfce7', textValue: '#166534' },
  { label: 'Azul', value: '#dbeafe', textValue: '#1e40af' },
  { label: 'Amarelo', value: '#fef9c3', textValue: '#854d0e' },
  { label: 'Roxo', value: '#f3e8ff', textValue: '#6b21a8' },
  { label: 'Rosa', value: '#fce7f3', textValue: '#9d174d' },
  { label: 'Laranja', value: '#ffedd5', textValue: '#9a3412' },
  { label: 'Cinza', value: '#f3f4f6', textValue: '#374151' },
];

const DEFAULT_PRESETS: ColumnPreset[] = [
  {
    id: 'completo',
    name: 'Completo',
    columns: [
      { id: 'index', label: '#', visible: true, order: 0 },
      { id: 'ticket', label: 'Ticket', visible: true, order: 1 },
      { id: 'download_ticket', label: 'Ingresso', visible: true, order: 2 },
      { id: 'nome', label: 'Nome', visible: true, order: 3 },
      { id: 'pacote', label: 'Pacote', visible: true, order: 4 },
      { id: 'poltrona', label: 'Poltrona', visible: true, order: 5 },
      { id: 'cpf', label: 'CPF', visible: true, order: 6 },
      { id: 'email', label: 'Email', visible: true, order: 7 },
      { id: 'whatsapp', label: 'WhatsApp', visible: true, order: 8 },
      { id: 'data_nascimento', label: 'Nascimento', visible: true, order: 9 },
      { id: 'idade', label: 'Idade', visible: true, order: 10 },
      { id: 'condicionamento', label: 'Condicionamento', visible: true, order: 11 },
      { id: 'embarque', label: 'Embarque', visible: true, order: 12 },
      { id: 'valor_base', label: 'Valor Base', visible: true, order: 13 },
      { id: 'opcionais', label: 'Opcionais', visible: true, order: 14 },
      { id: 'valor_total', label: 'Valor Total', visible: true, order: 15 },
      { id: 'valor_pago', label: 'Valor Pago', visible: true, order: 16 },
      { id: 'saldo', label: 'Saldo', visible: true, order: 17 },
      { id: 'metodo', label: 'Método Pag.', visible: true, order: 18 },
      { id: 'parcelas', label: 'Parcelas', visible: true, order: 19 },
      { id: 'status_pagamento', label: 'Status Pag.', visible: true, order: 20 },
      { id: 'data_reserva', label: 'Inscrito em', visible: true, order: 21 },
      { id: 'emergencia_nome', label: 'Contato Emerg.', visible: true, order: 22 },
      { id: 'emergencia_telefone', label: 'Tel. Emerg.', visible: true, order: 23 },
      { id: 'problema_saude', label: 'Prob. Saúde', visible: true, order: 24 },
      { id: 'plano_saude', label: 'Plano Saúde', visible: true, order: 25 },
      { id: 'assistencia_diferenciada', label: 'Assist. Diferenciada', visible: true, order: 26 },
      { id: 'observacoes', label: 'Observações', visible: true, order: 27 },
      { id: 'acoes', label: 'Ações', visible: true, order: 28 },
    ]
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    columns: [
      { id: 'index', label: '#', visible: true, order: 0 },
      { id: 'ticket', label: 'Ticket', visible: false, order: 1 },
      { id: 'download_ticket', label: 'Ingresso', visible: false, order: 2 },
      { id: 'nome', label: 'Nome', visible: true, order: 3 },
      { id: 'pacote', label: 'Pacote', visible: true, order: 4 },
      { id: 'poltrona', label: 'Poltrona', visible: false, order: 5 },
      { id: 'cpf', label: 'CPF', visible: true, order: 6 },
      { id: 'email', label: 'Email', visible: false, order: 7 },
      { id: 'whatsapp', label: 'WhatsApp', visible: false, order: 8 },
      { id: 'data_nascimento', label: 'Nascimento', visible: false, order: 9 },
      { id: 'idade', label: 'Idade', visible: false, order: 10 },
      { id: 'condicionamento', label: 'Condicionamento', visible: false, order: 11 },
      { id: 'embarque', label: 'Embarque', visible: false, order: 12 },
      { id: 'valor_base', label: 'Valor Base', visible: true, order: 13 },
      { id: 'opcionais', label: 'Opcionais', visible: true, order: 14 },
      { id: 'valor_total', label: 'Valor Total', visible: true, order: 15 },
      { id: 'valor_pago', label: 'Valor Pago', visible: true, order: 16 },
      { id: 'saldo', label: 'Saldo', visible: true, order: 17 },
      { id: 'metodo', label: 'Método Pag.', visible: true, order: 18 },
      { id: 'parcelas', label: 'Parcelas', visible: true, order: 19 },
      { id: 'status_pagamento', label: 'Status Pag.', visible: true, order: 20 },
      { id: 'acoes', label: 'Ações', visible: true, order: 28 },
    ]
  },
  {
    id: 'operacional',
    name: 'Operacional',
    columns: [
      { id: 'index', label: '#', visible: true, order: 0 },
      { id: 'ticket', label: 'Ticket', visible: true, order: 1 },
      { id: 'download_ticket', label: 'Ingresso', visible: true, order: 2 },
      { id: 'nome', label: 'Nome', visible: true, order: 3 },
      { id: 'pacote', label: 'Pacote', visible: true, order: 4 },
      { id: 'poltrona', label: 'Poltrona', visible: true, order: 5 },
      { id: 'whatsapp', label: 'WhatsApp', visible: true, order: 8 },
      { id: 'idade', label: 'Idade', visible: true, order: 10 },
      { id: 'embarque', label: 'Embarque', visible: true, order: 12 },
      { id: 'status_pagamento', label: 'Status Pag.', visible: true, order: 20 },
      { id: 'data_reserva', label: 'Inscrito em', visible: true, order: 21 },
      { id: 'emergencia_nome', label: 'Contato Emerg.', visible: true, order: 22 },
      { id: 'emergencia_telefone', label: 'Tel. Emerg.', visible: true, order: 23 },
      { id: 'problema_saude', label: 'Prob. Saúde', visible: true, order: 24 },
      { id: 'observacoes', label: 'Observações', visible: true, order: 27 },
      { id: 'acoes', label: 'Ações', visible: true, order: 28 },
    ]
  },
  {
    id: 'minimo',
    name: 'Mínimo',
    columns: [
      { id: 'index', label: '#', visible: true, order: 0 },
      { id: 'ticket', label: 'Ticket', visible: true, order: 1 },
      { id: 'download_ticket', label: 'Ingresso', visible: true, order: 2 },
      { id: 'nome', label: 'Nome', visible: true, order: 3 },
      { id: 'embarque', label: 'Embarque', visible: true, order: 12 },
      { id: 'valor_total', label: 'Valor Total', visible: true, order: 15 },
      { id: 'saldo', label: 'Saldo', visible: true, order: 17 },
      { id: 'status_pagamento', label: 'Status Pag.', visible: true, order: 20 },
      { id: 'acoes', label: 'Ações', visible: true, order: 28 },
    ]
  }
];

const PRESETS_STORAGE_KEY = 'participants_table_presets';

const ColumnConfigDropdown: React.FC<ColumnConfigDropdownProps> = ({
  columns,
  onToggleColumn,
  onReorderColumns,
  onApplyPreset,
  onUpdateColumnStyle,
  storageKey = PRESETS_STORAGE_KEY
}) => {
  const visibleCount = columns.filter(c => c.visible).length;
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingColorColumn, setEditingColorColumn] = useState<string | null>(null);
  
  // Load custom presets from localStorage
  const [customPresets, setCustomPresets] = useState<ColumnPreset[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const allPresets = [...DEFAULT_PRESETS, ...customPresets];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === targetIndex) return;

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
    const [removed] = sortedColumns.splice(sourceIndex, 1);
    sortedColumns.splice(targetIndex, 0, removed);
    
    const reordered = sortedColumns.map((col, idx) => ({ ...col, order: idx }));
    onReorderColumns(reordered);
  };

  const handleApplyPreset = (preset: ColumnPreset) => {
    onApplyPreset(preset.columns);
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: ColumnPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      columns: columns.map(c => ({ ...c }))
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    localStorage.setItem(storageKey, JSON.stringify(updatedPresets));
    setNewPresetName('');
    setShowSaveInput(false);
  };

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    setCustomPresets(updatedPresets);
    localStorage.setItem(storageKey, JSON.stringify(updatedPresets));
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Eye className="h-4 w-4" />
          <span className="text-xs">Colunas: {visibleCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Presets Section */}
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Presets</h4>
          <div className="flex flex-wrap gap-1.5">
            {allPresets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => handleApplyPreset(preset)}
                >
                  <Folder className="h-3 w-3 mr-1" />
                  {preset.name}
                </Button>
                {preset.id.startsWith('custom_') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeletePreset(preset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {/* Save new preset */}
          <div className="mt-2">
            {showSaveInput ? (
              <div className="flex gap-1.5">
                <Input
                  placeholder="Nome do preset"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                <Button 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => {
                    setShowSaveInput(false);
                    setNewPresetName('');
                  }}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full justify-start text-muted-foreground"
                onClick={() => setShowSaveInput(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Salvar configuração atual
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Column List */}
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-medium text-foreground">Colunas visíveis</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Arraste para reordenar</p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {sortedColumns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div 
                className="flex-1 flex items-center gap-2 min-w-0"
                style={{ 
                  backgroundColor: column.bgColor || 'transparent',
                  color: column.textColor || 'inherit',
                  padding: column.bgColor ? '2px 6px' : '0',
                  borderRadius: '4px'
                }}
              >
                <span className="text-sm truncate">{column.label}</span>
              </div>
              {onUpdateColumnStyle && (
                <Popover open={editingColorColumn === column.id} onOpenChange={(open) => setEditingColorColumn(open ? column.id : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted"
                      style={{ backgroundColor: column.bgColor || 'transparent' }}
                    >
                      <Palette className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-4 gap-1">
                      {COLUMN_COLORS.map((color) => (
                        <button
                          key={color.label}
                          onClick={() => {
                            onUpdateColumnStyle(column.id, { 
                              bgColor: color.value || undefined, 
                              textColor: color.textValue || undefined 
                            });
                            setEditingColorColumn(null);
                          }}
                          className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color.value || '#ffffff' }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Switch
                checked={column.visible}
                onCheckedChange={() => onToggleColumn(column.id)}
                className="scale-75"
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnConfigDropdown;
