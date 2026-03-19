/**
 * Unified optionals management
 * All optionals are now stored in reservas.selected_optional_items (JSON array)
 * Legacy reservas.adicionais is read but never written
 */

export interface OptionalItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface LegacyAdicional {
  nome: string;
  valor: number;
}

/**
 * Normalizes legacy adicionais to the new OptionalItem format
 */
export function normalizeLegacyAdicionais(adicionais: LegacyAdicional[] | null | undefined): OptionalItem[] {
  if (!adicionais || !Array.isArray(adicionais)) return [];
  
  return adicionais.map((add, index) => ({
    id: `legacy_${index}_${Date.now()}`,
    name: add.nome || '',
    price: add.valor || 0,
    quantity: 1
  }));
}

/**
 * Normalizes selected_optional_items to ensure all fields are present
 */
export function normalizeOptionalItems(items: any[] | null | undefined): OptionalItem[] {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => ({
    id: item.id || `item_${Date.now()}_${Math.random()}`,
    name: item.name || '',
    price: item.price || 0,
    quantity: item.quantity || 1
  }));
}

/**
 * Merges legacy adicionais with selected_optional_items into a single unified list
 * Used when reading data - combines both sources
 */
export function mergeAllOptionals(
  adicionais: LegacyAdicional[] | null | undefined,
  selectedOptionalItems: any[] | null | undefined
): OptionalItem[] {
  const fromAdicionais = normalizeLegacyAdicionais(adicionais);
  const fromSelected = normalizeOptionalItems(selectedOptionalItems);
  
  return [...fromAdicionais, ...fromSelected];
}

/**
 * Calculates the total value of all optionals
 */
export function calculateOptionalsTotal(optionals: OptionalItem[]): number {
  return optionals.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Formats optionals for display (grouped by name with quantities)
 */
export function formatOptionalsForDisplay(optionals: OptionalItem[]): { displayItems: string[]; total: number } {
  if (!optionals || optionals.length === 0) {
    return { displayItems: [], total: 0 };
  }

  // Group by name
  const grouped: Record<string, { totalQty: number; totalPrice: number }> = {};
  
  optionals.forEach(item => {
    if (!grouped[item.name]) {
      grouped[item.name] = { totalQty: 0, totalPrice: 0 };
    }
    grouped[item.name].totalQty += item.quantity;
    grouped[item.name].totalPrice += item.price * item.quantity;
  });

  const displayItems = Object.entries(grouped).map(([name, data]) => {
    return data.totalQty > 1 ? `${name} (x${data.totalQty})` : name;
  });

  const total = optionals.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return { displayItems, total };
}

/**
 * Prepares optionals for saving to database
 * Returns a clean JSON-safe array
 */
export function prepareOptionalsForSave(optionals: OptionalItem[]): any[] {
  return optionals.map(o => ({
    id: o.id,
    name: o.name,
    price: o.price,
    quantity: o.quantity
  }));
}
