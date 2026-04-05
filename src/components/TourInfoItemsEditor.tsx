import { useState, useEffect, useMemo, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import * as LucideIcons from "lucide-react";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, ChevronUp, ChevronDown, Loader2, GripVertical } from "lucide-react";

interface TourInfoItem {
  id: string;
  tour_id: string;
  title: string;
  icon: string;
  content: string;
  display_order: number;
  active: boolean;
}

interface TourInfoItemsEditorProps {
  tourId: string;
}

const TOUR_INFO_ICONS: { name: string; label: string }[] = [
  { name: "AlertTriangle", label: "Aviso" },
  { name: "Info", label: "Info" },
  { name: "Clock", label: "Horário" },
  { name: "MapPin", label: "Local" },
  { name: "Calendar", label: "Calendário" },
  { name: "CalendarX", label: "Cancelamento" },
  { name: "CirclePlus", label: "Adicionar" },
  { name: "Star", label: "Destaque" },
  { name: "Shield", label: "Segurança" },
  { name: "Users", label: "Grupo" },
  { name: "Backpack", label: "Equipamentos" },
  { name: "Umbrella", label: "Clima" },
  { name: "Camera", label: "Fotos" },
  { name: "Phone", label: "Contato" },
  { name: "CreditCard", label: "Pagamento" },
  { name: "FileText", label: "Documento" },
  { name: "CheckCircle", label: "Confirmado" },
  { name: "XCircle", label: "Negado" },
];

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return <Info className={className} />;
  return <Icon className={className} />;
}

function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-9 h-9 p-0 shrink-0"
          type="button"
          title="Escolher ícone"
        >
          <DynIcon name={value} className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {TOUR_INFO_ICONS.map(icon => (
            <button
              key={icon.name}
              type="button"
              title={icon.label}
              onClick={() => { onChange(icon.name); setOpen(false); }}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:bg-muted ${
                value === icon.name ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "text-muted-foreground"
              }`}
            >
              <DynIcon name={icon.name} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TourInfoItemsEditor({ tourId }: TourInfoItemsEditorProps) {
  const [items, setItems] = useState<TourInfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["blockquote"],
      ["clean"],
    ],
  }), []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("tour_info_items")
        .select("*")
        .eq("tour_id", tourId)
        .order("display_order");
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar informações", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [tourId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async () => {
    setAddingNew(true);
    try {
      const { data, error } = await (supabase as any)
        .from("tour_info_items")
        .insert({
          tour_id: tourId,
          title: "",
          icon: "Info",
          content: "",
          display_order: items.length,
          active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setItems(prev => [...prev, data]);
      setExpandedId(data.id);
    } catch (e: any) {
      toast({ title: "Erro ao adicionar item", description: e.message, variant: "destructive" });
    } finally {
      setAddingNew(false);
    }
  };

  const updateLocal = (id: string, field: keyof TourInfoItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const saveItem = async (item: TourInfoItem) => {
    setSavingId(item.id);
    try {
      const { error } = await (supabase as any)
        .from("tour_info_items")
        .update({
          title: item.title,
          icon: item.icon,
          content: item.content,
          active: item.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      toast({ title: "Salvo!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    setDeletingId(id);
    try {
      const { error } = await (supabase as any)
        .from("tour_info_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast({ title: "Item removido" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = items.findIndex(i => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const newItems = [...items];
    const aOrder = newItems[swapIdx].display_order;
    const bOrder = newItems[idx].display_order;
    newItems[idx] = { ...newItems[idx], display_order: aOrder };
    newItems[swapIdx] = { ...newItems[swapIdx], display_order: bOrder };
    newItems.sort((x, y) => x.display_order - y.display_order);
    setItems(newItems);
    await Promise.all([
      (supabase as any).from("tour_info_items").update({ display_order: aOrder }).eq("id", id),
      (supabase as any).from("tour_info_items").update({ display_order: bOrder }).eq("id", newItems[idx === 0 ? 1 : idx - 1].id),
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Itens expandíveis que aparecem na página pública do passeio, abaixo dos pontos de embarque.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addItem}
          disabled={addingNew}
          className="shrink-0 gap-1"
        >
          {addingNew ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground">
          Nenhum item configurado. Clique em "Adicionar" para criar o primeiro.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isSaving = savingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div key={item.id} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                {/* Header row */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <DynIcon name={item.icon} className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {item.title || <em className="text-muted-foreground">Sem título</em>}
                  </span>
                  {!item.active && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">oculto</span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveItem(item.id, "down")}
                      disabled={idx === items.length - 1}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-2">
                      <IconPicker value={item.icon} onChange={val => updateLocal(item.id, "icon", val)} />
                      <Input
                        type="text"
                        placeholder="Título (ex: Observações importantes:)"
                        value={item.title}
                        onChange={e => updateLocal(item.id, "title", e.target.value)}
                        className="flex-1 h-9 text-sm"
                      />
                    </div>

                    {/* Rich text content */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Conteúdo</p>
                      <ReactQuill
                        theme="snow"
                        value={item.content}
                        onChange={value => updateLocal(item.id, "content", value)}
                        modules={quillModules}
                        style={{ minHeight: "120px" }}
                      />
                    </div>

                    {/* Visibility + Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={e => updateLocal(item.id, "active", e.target.checked)}
                          className="rounded"
                        />
                        Visível na página pública
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteItem(item.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-3 gap-1 text-xs"
                          onClick={() => saveItem(item)}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TourInfoItemsEditor;
