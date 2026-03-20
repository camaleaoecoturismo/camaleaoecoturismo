import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, X, FileText, Percent, Check, Loader2 } from 'lucide-react';
import { Tour, TourPricingOption } from '@/hooks/useTours';

import { TourBoardingPointsManager } from '@/components/TourBoardingPointsManager';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TourOptionalItemsManager } from '@/components/TourOptionalItemsManager';
import { TourPaymentConfig } from '@/components/TourPaymentConfig';
import { TourTransportConfig } from '@/components/transport/TourTransportConfig';
import { TourGalleryManager } from '@/components/TourGalleryManager';

const MONTHS_PT = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function generateSlug(name: string, startDate: string): string {
  const date = new Date(startDate + "T12:00:00");
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const aaaa = date.getFullYear();
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${dd}-${mm}-${aaaa}`;
}

// Taxas de parcelamento InfinitePay
const INSTALLMENT_FEES: Record<number, number> = {
  1: 4.4, 2: 6.5, 3: 7.5, 4: 8.6, 5: 9.6, 6: 10.7,
  7: 14.4, 8: 15.5, 9: 16.6, 10: 17.7, 11: 18.9, 12: 20.0
};

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
  month: z.string().optional(),
  
  about: z.string().optional(),
  itinerary: z.string().optional(),
  includes: z.string().optional(),
  not_includes: z.string().optional(),
  departures: z.string().optional(),
  pdf_file_path: z.string().optional(),
  whatsapp_group_link: z.string().optional(),
  etiqueta: z.string().optional(),
  description: z.string().optional(),
  card_name_split: z.number().nullable().optional(),
  card_prefix_size: z.string().default('xs'),
  card_main_size: z.string().default('2xl'),
  is_exclusive: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  has_accommodation: z.boolean().default(false),
  valor_padrao: z.number().min(0, 'Valor deve ser positivo').default(0),
  vagas: z.number().min(1, 'Vagas deve ser maior que 0').nullable().optional(),
  pix_discount_percent: z.number().min(0).max(100).default(0),
  pricing_options: z.array(z.object({
    option_name: z.string().min(1, 'Nome da opção é obrigatório'),
    description: z.string().optional(),
    pix_price: z.number().min(0, 'Preço deve ser positivo'),
  })).min(1, 'Pelo menos uma opção de preço é obrigatória'),
});

interface TourFormProps {
  tour?: Tour | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Categoria {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
}

const TourForm = ({ tour, onSuccess, onCancel }: TourFormProps) => {
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPdfPath, setCurrentPdfPath] = useState<string | null>(null);
  const [allCategorias, setAllCategorias] = useState<Categoria[]>([]);
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<string[]>([]);
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      city: '',
      state: '',
      start_date: '',
      end_date: '',
      month: '',
      
      about: '',
      itinerary: '',
      includes: '',
      not_includes: '',
      departures: '',
      pdf_file_path: '',
      whatsapp_group_link: '',
      etiqueta: '',
      description: '',
      card_name_split: null,
      card_prefix_size: 'xs',
      card_main_size: '2xl',
      is_exclusive: false,
      is_featured: false,
      has_accommodation: false,
      valor_padrao: 0,
      vagas: null,
      pix_discount_percent: 0,
      pricing_options: [
        { option_name: 'Padrão', description: '', pix_price: 0 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricing_options',
  });

  useEffect(() => {
    if (tour) {
      form.reset({
        name: tour.name || '',
        city: tour.city || '',
        state: tour.state || '',
        start_date: tour.start_date || '',
        end_date: tour.end_date || '',
        month: tour.month || '',
        
        about: tour.about || '',
        itinerary: tour.itinerary || '',
        includes: tour.includes || '',
        not_includes: tour.not_includes || '',
        departures: tour.departures || '',
        pdf_file_path: tour.pdf_file_path || '',
        whatsapp_group_link: (tour as any).whatsapp_group_link || '',
        etiqueta: tour.etiqueta || '',
        description: tour.description || '',
        card_name_split: tour.card_name_split ?? null,
        card_prefix_size: tour.card_prefix_size || 'xs',
        card_main_size: tour.card_main_size || '2xl',
        is_exclusive: tour.is_exclusive || false,
        is_featured: (tour as any).is_featured || false,
        has_accommodation: (tour as any).has_accommodation || false,
        valor_padrao: tour.valor_padrao || 0,
        vagas: tour.vagas ?? null,
        pix_discount_percent: (tour as any).pix_discount_percent || 0,
        pricing_options: tour.pricing_options?.length > 0 
          ? tour.pricing_options.map(option => ({
              option_name: option.option_name,
              description: option.description || '',
              pix_price: option.pix_price,
            }))
          : [{ option_name: 'Padrão', description: '', pix_price: 0 }],
      });
      setCurrentPdfPath(tour.pdf_file_path);
    }
  }, [tour, form]);

  // Load all active categories
  useEffect(() => {
    supabase
      .from('categorias_passeio')
      .select('id, nome, icone, cor')
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => { if (data) setAllCategorias(data); });
  }, []);

  // Load tour's selected categories
  useEffect(() => {
    if (!tour) return;
    supabase
      .from('tour_categorias')
      .select('categoria_id')
      .eq('tour_id', tour.id)
      .then(({ data }) => {
        if (data) setSelectedCategoriaIds(data.map((r) => r.categoria_id));
      });
  }, [tour]);

  const toggleCategoria = (id: string) => {
    setSelectedCategoriaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const saveCategoriasForTour = async (tourId: string) => {
    await supabase.from('tour_categorias').delete().eq('tour_id', tourId);
    if (selectedCategoriaIds.length > 0) {
      await supabase.from('tour_categorias').insert(
        selectedCategoriaIds.map((cid) => ({ tour_id: tourId, categoria_id: cid }))
      );
    }
  };

  // Auto-save function for existing tours
  const autoSave = useCallback(async (values: z.infer<typeof formSchema>) => {
    if (!tour) return; // Only auto-save for existing tours
    
    setAutoSaving(true);
    try {
      const tourData = {
        name: values.name,
        city: values.city,
        state: values.state,
        start_date: values.start_date,
        end_date: values.end_date || null,
        month: MONTHS_PT[new Date(values.start_date + "T12:00:00").getMonth()],
        about: values.about || null,
        itinerary: values.itinerary || null,
        includes: values.includes || null,
        not_includes: values.not_includes || null,
        departures: values.departures || null,
        whatsapp_group_link: values.whatsapp_group_link || null,
        etiqueta: values.etiqueta || null,
        description: values.description || null,
        card_name_split: values.card_name_split ?? null,
        card_prefix_size: values.card_prefix_size || 'xs',
        card_main_size: values.card_main_size || '2xl',
        slug: generateSlug(values.name, values.start_date),
        is_exclusive: values.is_exclusive || false,
        is_featured: values.is_featured || false,
        has_accommodation: values.has_accommodation || false,
        valor_padrao: values.valor_padrao || 0,
        vagas: values.vagas || null,
        pix_discount_percent: values.pix_discount_percent || 0,
      };

      const { error } = await supabase.from('tours').update(tourData).eq('id', tour.id);
      if (error) throw error;

      // Update pricing options
      await supabase.from('tour_pricing_options').delete().eq('tour_id', tour.id);
      
      const pricingOptionsToInsert = values.pricing_options.map(option => {
        const cardPrice = option.pix_price * (1 + INSTALLMENT_FEES[12] / 100);
        return {
          tour_id: tour.id,
          option_name: option.option_name,
          description: option.description || null,
          pix_price: option.pix_price,
          card_price: cardPrice,
        };
      });

      const { error: pricingError } = await supabase.from('tour_pricing_options').insert(pricingOptionsToInsert);
      if (pricingError) throw pricingError;

      await saveCategoriasForTour(tour.id);
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Auto-save error:', error);
      toast({ title: "Erro ao salvar automaticamente", description: error.message, variant: "destructive" });
    } finally {
      setAutoSaving(false);
    }
  }, [tour, toast]);

  // Watch for form changes and trigger auto-save
  useEffect(() => {
    if (!tour) return; // Only auto-save for existing tours
    
    const subscription = form.watch((values) => {
      // Skip initial load
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for debounced save (1.5 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        const formValues = form.getValues();
        // Validate before saving
        const result = formSchema.safeParse(formValues);
        if (result.success) {
          autoSave(result.data);
        }
      }, 1500);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form, tour, autoSave]);

  const handlePdfUpload = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from('tour-pdfs')
        .upload(fileName, file);
      if (error) throw error;
      return fileName;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      return null;
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro de autenticação", description: "Você precisa estar logado.", variant: "destructive" });
        setLoading(false);
        return;
      }

      let tourId = tour?.id;
      let pdfPath = currentPdfPath;

      if (pdfFile) {
        pdfPath = await handlePdfUpload(pdfFile);
        if (!pdfPath) {
          toast({ title: "Erro ao fazer upload do PDF", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      const tourData = {
        name: values.name,
        city: values.city,
        state: values.state,
        start_date: values.start_date,
        end_date: values.end_date || null,
        month: MONTHS_PT[new Date(values.start_date + "T12:00:00").getMonth()],
        image_url: null,
        about: values.about || null,
        itinerary: values.itinerary || null,
        includes: values.includes || null,
        not_includes: values.not_includes || null,
        departures: values.departures || null,
        pdf_file_path: pdfPath || null,
        whatsapp_group_link: values.whatsapp_group_link || null,
        etiqueta: values.etiqueta || null,
        description: values.description || null,
        card_name_split: values.card_name_split ?? null,
        card_prefix_size: values.card_prefix_size || 'xs',
        card_main_size: values.card_main_size || '2xl',
        slug: generateSlug(values.name, values.start_date),
        is_exclusive: values.is_exclusive || false,
        is_featured: values.is_featured || false,
        valor_padrao: values.valor_padrao || 0,
        vagas: values.vagas || null,
        pix_discount_percent: values.pix_discount_percent || 0,
      };

      if (tour) {
        const { error } = await supabase.from('tours').update(tourData).eq('id', tour.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('tours').insert(tourData).select().single();
        if (error) throw error;
        tourId = data.id;
      }

      if (tourId) {
        if (tour) {
          await supabase.from('tour_pricing_options').delete().eq('tour_id', tourId);
        }

        const pricingOptionsToInsert = values.pricing_options.map(option => {
          // Preço cartão = preço base + 17.28% (12x)
          const cardPrice = option.pix_price * (1 + INSTALLMENT_FEES[12] / 100);
          return {
            tour_id: tourId,
            option_name: option.option_name,
            description: option.description || null,
            pix_price: option.pix_price,
            card_price: cardPrice,
          };
        });

        const { error: pricingError } = await supabase.from('tour_pricing_options').insert(pricingOptionsToInsert);
        if (pricingError) throw pricingError;

        await saveCategoriasForTour(tourId);
      }

      toast({ title: tour ? "Passeio atualizado!" : "Passeio criado!" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const watchPixPrice = form.watch('pricing_options.0.pix_price') || 0;
  const watchPixDiscount = form.watch('pix_discount_percent') || 0;
  const pixPriceWithDiscount = watchPixPrice * (1 - watchPixDiscount / 100);
  const cardPrice12x = watchPixPrice * (1 + INSTALLMENT_FEES[12] / 100);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-800">
              {tour ? 'Editar Passeio' : 'Novo Passeio'}
            </h1>
          </div>
          
          {/* Auto-save status indicator */}
          {tour && (
            <div className="flex items-center gap-2 text-sm">
              {autoSaving ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1.5 text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  Salvo
                </span>
              ) : null}
            </div>
          )}
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 bg-white border">
            <TabsTrigger value="geral" className="text-xs sm:text-sm">Geral</TabsTrigger>
            <TabsTrigger value="galeria" disabled={!tour} className="text-xs sm:text-sm">Galeria</TabsTrigger>
            <TabsTrigger value="pontos" disabled={!tour} className="text-xs sm:text-sm">Embarque</TabsTrigger>
            <TabsTrigger value="opcionais" disabled={!tour} className="text-xs sm:text-sm">Opcionais</TabsTrigger>
            <TabsTrigger value="transporte" disabled={!tour} className="text-xs sm:text-sm">Transporte</TabsTrigger>
            <TabsTrigger value="pagamento" disabled={!tour} className="text-xs sm:text-sm">Pagamento</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Informações Básicas */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-slate-700">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Nome do Passeio</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do passeio" {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="Estado" {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Data Início</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Data Fim</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Descrição curta</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Trilhas, cachoeiras e cultura indígena na Chapada" {...field} className="bg-white" />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Frase curta exibida abaixo do nome no card.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nome do card — estilo */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome no card</p>
                      <FormField
                        control={form.control}
                        name="card_name_split"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Palavras pequenas (topo)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="Ex: 2 → primeiras 2 palavras ficam pequenas"
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value !== '' ? parseInt(e.target.value) : null)}
                                className="bg-white"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Deixe vazio para automático (tudo menos a última palavra). 0 = sem texto pequeno.
                            </p>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="card_prefix_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 text-sm">Tamanho — pequeno</FormLabel>
                              <FormControl>
                                <select {...field} className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm">
                                  <option value="xs">XS — muito pequeno</option>
                                  <option value="sm">SM — pequeno</option>
                                  <option value="base">Base — médio</option>
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="card_main_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 text-sm">Tamanho — grande</FormLabel>
                              <FormControl>
                                <select {...field} className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm">
                                  <option value="xl">XL</option>
                                  <option value="2xl">2XL — padrão</option>
                                  <option value="3xl">3XL — grande</option>
                                  <option value="4xl">4XL — muito grande</option>
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="etiqueta"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Etiqueta</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Últimas vagas" {...field} className="bg-white" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Aparece como tag roxa no card.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vagas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Limite de Vagas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ex: 20"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div>
                            <FormLabel className="text-yellow-700 text-sm font-medium">⭐ Passeio em Destaque</FormLabel>
                            <p className="text-xs text-yellow-600">Aparece com visual especial na página inicial</p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_exclusive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div>
                            <FormLabel className="text-teal-700 text-sm font-medium">Passeio Exclusivo</FormLabel>
                            <p className="text-xs text-teal-600">Não aparece nos cards públicos</p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="has_accommodation"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div>
                            <FormLabel className="text-purple-700 text-sm font-medium">🏨 Possui Hospedagem</FormLabel>
                            <p className="text-xs text-purple-600">Ativa o módulo de distribuição de quartos</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Categorias */}
                {allCategorias.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium text-slate-700">Categorias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        Selecione as categorias que descrevem este passeio. Usadas nos filtros da home.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allCategorias.map((cat) => {
                          const selected = selectedCategoriaIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCategoria(cat.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                selected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary'
                              }`}
                            >
                              {cat.icone && <span>{cat.icone}</span>}
                              {cat.nome}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preços */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-slate-700">Pacotes e Preços</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pix_discount_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm flex items-center gap-2">
                            <Percent className="h-4 w-4 text-green-600" />
                            Desconto no PIX (%)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              placeholder="Ex: 5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">Desconto aplicado ao preço PIX (aparece como promoção no card)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-700">Opção {index + 1}</span>
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 h-7 px-2">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`pricing_options.${index}.option_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-600 text-xs">Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Camping" {...field} className="bg-white h-9" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`pricing_options.${index}.pix_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-600 text-xs">Preço Base (R$)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="bg-white h-9"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {index === 0 && (
                          <div className="mt-3 p-3 bg-white rounded border text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-green-600">PIX{watchPixDiscount > 0 ? ` (-${watchPixDiscount}%)` : ''}:</span>
                              <span className="font-medium">R$ {pixPriceWithDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600">Cartão 1x (sem juros):</span>
                              <span className="font-medium">R$ {watchPixPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Cartão 12x (+17.28%):</span>
                              <span className="font-medium">R$ {(cardPrice12x / 12).toFixed(2)}/mês</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button type="button" variant="outline" onClick={() => append({ option_name: '', description: '', pix_price: 0 })} className="w-full h-9 text-sm">
                      <Plus className="h-3 w-3 mr-2" />
                      Adicionar Opção
                    </Button>
                  </CardContent>
                </Card>

                {/* Detalhes */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-slate-700">Detalhes do Passeio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="about"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Sobre</FormLabel>
                          <FormControl>
                            <ReactQuill
                              theme="snow"
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Descrição do passeio"
                              modules={{ toolbar: [['bold', 'italic'], [{ 'list': 'bullet' }], ['link']] }}
                              style={{ minHeight: '100px' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itinerary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Itinerário</FormLabel>
                          <FormControl>
                            <ReactQuill
                              theme="snow"
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Itinerário detalhado"
                              modules={{ toolbar: [['bold', 'italic'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['link']] }}
                              style={{ minHeight: '100px' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="includes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Incluído</FormLabel>
                            <FormControl>
                              <ReactQuill
                                theme="snow"
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="O que está incluído"
                                modules={{ toolbar: [[{ 'list': 'bullet' }]] }}
                                style={{ minHeight: '80px' }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="not_includes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600 text-sm">Não Incluído</FormLabel>
                            <FormControl>
                              <ReactQuill
                                theme="snow"
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="O que não está incluído"
                                modules={{ toolbar: [[{ 'list': 'bullet' }]] }}
                                style={{ minHeight: '80px' }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="departures"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Informações adicionais de embarque</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Ponto de encontro, orientações gerais de saída..."
                              className="bg-white resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Exibido abaixo dos pontos de embarque na página do passeio.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="text-slate-600 text-sm">PDF do Roteiro</FormLabel>
                      <div className="mt-2">
                        {currentPdfPath && (
                          <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded text-sm">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600">PDF atual</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentPdfPath(null)} className="h-6 px-2 ml-auto">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="bg-white" />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="whatsapp_group_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600 text-sm">Link do Grupo do WhatsApp</FormLabel>
                          <FormDescription className="text-xs">
                            Após o pagamento, um botão aparecerá para o cliente entrar no grupo
                          </FormDescription>
                          <FormControl>
                            <Input placeholder="https://chat.whatsapp.com/..." {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    {loading ? 'Salvando...' : tour ? 'Atualizar' : 'Criar Passeio'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="galeria">
            {tour && <TourGalleryManager tourId={tour.id} />}
          </TabsContent>

          <TabsContent value="pontos">
            {tour && <TourBoardingPointsManager tourId={tour.id} tourName={tour.name} />}
          </TabsContent>

          <TabsContent value="opcionais">
            {tour && <TourOptionalItemsManager tourId={tour.id} />}
          </TabsContent>

          <TabsContent value="pagamento">
            {tour && (
              <TourPaymentConfig tourId={tour.id} />
            )}
          </TabsContent>

          <TabsContent value="transporte">
            {tour && (
              <TourTransportConfig tourId={tour.id} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TourForm;