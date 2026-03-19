import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Copy, Trash2, GripVertical, Search, X, Info, ChevronUp, ChevronDown, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface QuestionOption {
  label: string;
  value: string;
  order?: number;
}

interface QuestionTemplate {
  id: string;
  title: string;
  description: string | null;
  field_type: string;
  is_required: boolean;
  order_index: number;
  is_active: boolean;
  allow_tour_edit: boolean;
  options: QuestionOption[];
  standard_field_key: string | null;
  condition_field_key: string | null;
  condition_value: string | null;
  created_at: string;
  updated_at: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Sim ou Não' },
  { value: 'radio', label: 'Seleção única (radio)' },
  { value: 'checkbox', label: 'Seleção múltipla (checkbox)' },
  { value: 'select', label: 'Lista suspensa (select)' },
  { value: 'emergency_contact', label: 'Contato de Emergência' },
  { value: 'policy_accept', label: 'Aceite de Política' },
];

// Standard field keys that map to specific form behaviors
const STANDARD_FIELD_KEYS = [
  { value: '', label: 'Nenhum (campo personalizado)' },
  { value: 'cpf', label: 'CPF', step: 1, locked: true },
  { value: 'nome_completo', label: 'Nome Completo', step: 1, locked: true },
  { value: 'whatsapp', label: 'WhatsApp', step: 1, locked: true },
  { value: 'data_nascimento', label: 'Data de Nascimento', step: 1, locked: true },
  { value: 'email', label: 'E-mail', step: 1, locked: true },
  { value: 'numero_participantes', label: 'Número de Participantes', step: 2, locked: true },
  { value: 'ponto_embarque_id', label: 'Ponto de Embarque', step: 2, locked: true },
  { value: 'nivel_condicionamento', label: 'Nível de Condicionamento', step: 2, locked: false },
  { value: 'problema_saude', label: 'Problema de Saúde', step: 2, locked: false },
  { value: 'descricao_problema_saude', label: 'Descrição Problema de Saúde', step: 2, locked: false },
  { value: 'contato_emergencia', label: 'Contato de Emergência', step: 2, locked: false },
  { value: 'assistencia_diferenciada', label: 'Assistência Diferenciada', step: 2, locked: false },
  { value: 'descricao_assistencia_diferenciada', label: 'Descrição Assistência', step: 2, locked: false },
  { value: 'aceita_politica', label: 'Aceite Termos e Condições', step: 3, locked: true },
  { value: 'aceita_cancelamento', label: 'Aceite Política de Cancelamento', step: 3, locked: true },
];

const STEP_LABELS: Record<number, string> = {
  1: 'Etapa 1: Dados Pessoais',
  2: 'Etapa 2: Informações Adicionais',
  3: 'Etapa 3: Termos e Políticas',
};

// Helper to parse JSON options
const parseOptions = (options: Json | null): QuestionOption[] => {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          label: String((opt as Record<string, unknown>).label || ''),
          value: String((opt as Record<string, unknown>).value || ''),
          order: typeof (opt as Record<string, unknown>).order === 'number' ? (opt as Record<string, unknown>).order as number : undefined,
        };
      }
      return { label: '', value: '' };
    });
  }
  return [];
};

// Get step for a question based on its standard_field_key or order_index
const getQuestionStep = (q: QuestionTemplate): number => {
  if (q.standard_field_key) {
    const stdField = STANDARD_FIELD_KEYS.find(s => s.value === q.standard_field_key);
    if (stdField && 'step' in stdField) return stdField.step;
  }
  // Default based on order_index
  if (q.order_index <= 5) return 1;
  if (q.order_index <= 15) return 2;
  return 3;
};

export default function FormQuestionsManagement() {
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    field_type: 'text',
    is_required: false,
    is_active: true,
    allow_tour_edit: true,
    options: [] as QuestionOption[],
    standard_field_key: '',
    condition_field_key: '',
    condition_value: '',
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('form_question_templates')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      const questionsData: QuestionTemplate[] = (templates || []).map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        field_type: q.field_type,
        is_required: q.is_required,
        order_index: q.order_index,
        is_active: q.is_active,
        allow_tour_edit: q.allow_tour_edit,
        options: parseOptions(q.options),
        standard_field_key: q.standard_field_key,
        condition_field_key: q.condition_field_key || null,
        condition_value: q.condition_value || null,
        created_at: q.created_at,
        updated_at: q.updated_at,
      }));

      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Erro ao carregar perguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const questionData = {
        title: formData.title,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        is_active: formData.is_active,
        allow_tour_edit: formData.allow_tour_edit,
        options: formData.options as unknown as Json,
        order_index: editingQuestion?.order_index || questions.length + 1,
        standard_field_key: formData.standard_field_key || null,
        condition_field_key: formData.condition_field_key || null,
        condition_value: formData.condition_value || null,
      };

      if (editingQuestion) {
        // Log history
        await supabase.from('form_question_history').insert([{
          question_id: editingQuestion.id,
          old_values: editingQuestion as unknown as Json,
          new_values: questionData as unknown as Json,
          change_type: 'update',
        }]);

        const { error } = await supabase
          .from('form_question_templates')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Pergunta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('form_question_templates')
          .insert([questionData]);

        if (error) throw error;
        toast.success('Pergunta criada com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Erro ao salvar pergunta');
    }
  };

  const handleDuplicate = async (question: QuestionTemplate) => {
    try {
      const { error } = await supabase.from('form_question_templates').insert([{
        title: `${question.title} (Cópia)`,
        description: question.description,
        field_type: question.field_type,
        is_required: question.is_required,
        is_active: false,
        allow_tour_edit: question.allow_tour_edit,
        options: question.options as unknown as Json,
        order_index: questions.length + 1,
        standard_field_key: null, // Don't duplicate standard key
        condition_field_key: question.condition_field_key,
        condition_value: question.condition_value,
      }]);

      if (error) throw error;
      toast.success('Pergunta duplicada com sucesso');
      fetchQuestions();
    } catch (error) {
      console.error('Error duplicating question:', error);
      toast.error('Erro ao duplicar pergunta');
    }
  };

  const handleDelete = async (question: QuestionTemplate) => {
    // Check if it's a locked standard field
    const stdField = STANDARD_FIELD_KEYS.find(s => s.value === question.standard_field_key);
    if (stdField && 'locked' in stdField && stdField.locked) {
      toast.error('Esta pergunta é essencial e não pode ser excluída. Você pode apenas desativá-la.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    try {
      const { error } = await supabase
        .from('form_question_templates')
        .delete()
        .eq('id', question.id);

      if (error) throw error;
      toast.success('Pergunta excluída com sucesso');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erro ao excluir pergunta');
    }
  };

  const handleToggleActive = async (question: QuestionTemplate) => {
    try {
      const { error } = await supabase
        .from('form_question_templates')
        .update({ is_active: !question.is_active })
        .eq('id', question.id);

      if (error) throw error;
      toast.success(question.is_active ? 'Pergunta desativada' : 'Pergunta ativada');
      fetchQuestions();
    } catch (error) {
      console.error('Error toggling question:', error);
      toast.error('Erro ao atualizar pergunta');
    }
  };

  const handleMoveOrder = async (question: QuestionTemplate, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === question.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= questions.length) return;

    const otherQuestion = questions[newIndex];
    
    try {
      // Swap order_index values
      await supabase
        .from('form_question_templates')
        .update({ order_index: otherQuestion.order_index })
        .eq('id', question.id);
      
      await supabase
        .from('form_question_templates')
        .update({ order_index: question.order_index })
        .eq('id', otherQuestion.id);

      fetchQuestions();
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Erro ao reordenar');
    }
  };

  const handleEdit = (question: QuestionTemplate) => {
    setEditingQuestion(question);
    setFormData({
      title: question.title,
      description: question.description || '',
      field_type: question.field_type,
      is_required: question.is_required,
      is_active: question.is_active,
      allow_tour_edit: question.allow_tour_edit,
      options: question.options || [],
      standard_field_key: question.standard_field_key || '',
      condition_field_key: question.condition_field_key || '',
      condition_value: question.condition_value || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      title: '',
      description: '',
      field_type: 'text',
      is_required: false,
      is_active: true,
      allow_tour_edit: true,
      options: [],
      standard_field_key: '',
      condition_field_key: '',
      condition_value: '',
    });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { label: '', value: '', order: formData.options.length }],
    });
  };

  const updateOption = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    // Auto-fill value if empty when label changes
    if (field === 'label' && !newOptions[index].value) {
      newOptions[index].value = value.toLowerCase().replace(/\s+/g, '_');
    }
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const getFieldTypeLabel = (type: string) => {
    return FIELD_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStandardFieldLabel = (key: string | null) => {
    if (!key) return null;
    return STANDARD_FIELD_KEYS.find(s => s.value === key)?.label || key;
  };

  const isLockedField = (key: string | null) => {
    if (!key) return false;
    const stdField = STANDARD_FIELD_KEYS.find(s => s.value === key);
    return stdField && 'locked' in stdField && stdField.locked;
  };

  const needsOptions = ['radio', 'checkbox', 'select'].includes(formData.field_type);

  // Filter questions by step/tab
  const getFilteredQuestions = () => {
    let filtered = questions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.standard_field_key && q.standard_field_key.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(q => q.field_type === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => 
        filterStatus === 'active' ? q.is_active : !q.is_active
      );
    }

    // Filter by step/tab
    if (activeTab !== 'all') {
      const stepNum = parseInt(activeTab);
      filtered = filtered.filter(q => getQuestionStep(q) === stepNum);
    }

    return filtered;
  };

  const filteredQuestions = getFilteredQuestions();

  // Group questions by step for preview
  const questionsByStep = {
    1: questions.filter(q => q.is_active && getQuestionStep(q) === 1),
    2: questions.filter(q => q.is_active && getQuestionStep(q) === 2),
    3: questions.filter(q => q.is_active && getQuestionStep(q) === 3),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Formulário de Reserva</h2>
          <p className="text-muted-foreground">
            Configure as perguntas que aparecem no formulário de inscrição
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={previewMode ? "default" : "outline"} 
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {previewMode ? 'Sair da Prévia' : 'Visualizar'}
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pergunta
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-purple-50 to-white border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Prévia do Formulário
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Veja como as perguntas aparecerão para o cliente (apenas perguntas ativas)
              </p>
            </CardHeader>
          </Card>

          {[1, 2, 3].map(step => (
            <Card key={step}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">Etapa {step}</Badge>
                  {STEP_LABELS[step]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionsByStep[step as keyof typeof questionsByStep].length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Nenhuma pergunta ativa nesta etapa
                  </p>
                ) : (
                  questionsByStep[step as keyof typeof questionsByStep].map((q, idx) => (
                    <div 
                      key={q.id} 
                      className="p-4 border rounded-lg bg-muted/20 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {idx + 1}. {q.title}
                            {q.is_required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {q.description && (
                            <p className="text-xs text-muted-foreground">{q.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {getFieldTypeLabel(q.field_type)}
                        </Badge>
                      </div>
                      {q.condition_field_key && (
                        <p className="text-xs text-orange-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Condicional: aparece quando {q.condition_field_key} = {q.condition_value}
                        </p>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.options.map((opt, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Edit Mode
        <>
          {/* Tabs for steps */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                Todas ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="1">
                Etapa 1 ({questions.filter(q => getQuestionStep(q) === 1).length})
              </TabsTrigger>
              <TabsTrigger value="2">
                Etapa 2 ({questions.filter(q => getQuestionStep(q) === 2).length})
              </TabsTrigger>
              <TabsTrigger value="3">
                Etapa 3 ({questions.filter(q => getQuestionStep(q) === 3).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar perguntas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Questions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ordem</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="w-[140px]">Tipo</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question, index) => {
                    const step = getQuestionStep(question);
                    const isLocked = isLockedField(question.standard_field_key);
                    
                    return (
                      <TableRow 
                        key={question.id}
                        className={!question.is_active ? 'opacity-50' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleMoveOrder(question, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleMoveOrder(question, 'down')}
                                disabled={index === filteredQuestions.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                              {question.order_index}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{question.title}</span>
                              {question.is_required && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">Obrigatória</Badge>
                              )}
                              {isLocked && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Essencial
                                </Badge>
                              )}
                            </div>
                            {question.description && (
                              <p className="text-xs text-muted-foreground">{question.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {question.standard_field_key && (
                                <Badge variant="outline" className="text-[10px]">
                                  Campo: {question.standard_field_key}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px]">
                                Etapa {step}
                              </Badge>
                              {question.condition_field_key && (
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                  Condicional
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getFieldTypeLabel(question.field_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(question)}
                            className={question.is_active ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground'}
                          >
                            {question.is_active ? (
                              <><CheckCircle className="h-4 w-4 mr-1" /> Ativa</>
                            ) : (
                              <><EyeOff className="h-4 w-4 mr-1" /> Inativa</>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(question)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicate(question)}
                              title="Duplicar"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!isLocked && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(question)}
                                title="Excluir"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma pergunta encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar Pergunta' : 'Criar Nova Pergunta'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da pergunta do formulário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Standard Field Key - Hidden for locked fields when editing */}
            {(!editingQuestion || !isLockedField(editingQuestion.standard_field_key)) && (
              <div className="space-y-2">
                <Label htmlFor="standard_field_key">
                  Campo Padrão do Sistema
                  <span className="text-muted-foreground text-xs ml-2">(opcional)</span>
                </Label>
                <Select
                  value={formData.standard_field_key || 'none'}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    standard_field_key: value === 'none' ? '' : value 
                  })}
                  disabled={editingQuestion && isLockedField(editingQuestion.standard_field_key)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione se aplicável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (campo personalizado)</SelectItem>
                    {STANDARD_FIELD_KEYS.filter(s => s.value).map(field => (
                      <SelectItem 
                        key={field.value} 
                        value={field.value}
                        disabled={questions.some(q => q.standard_field_key === field.value && q.id !== editingQuestion?.id)}
                      >
                        {field.label} {'step' in field && `(Etapa ${field.step})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Campos padrão têm comportamentos especiais no formulário (ex: CPF faz busca automática de cliente)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Texto da Pergunta *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Qual seu nome completo?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (texto de apoio)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Texto auxiliar que aparece abaixo da pergunta"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Tipo de Campo *</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) => setFormData({ ...formData, field_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOptions && (
              <div className="space-y-2">
                <Label>Opções de Seleção</Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        placeholder="Texto da opção"
                        className="flex-1"
                      />
                      <Input
                        value={option.value}
                        onChange={(e) => updateOption(index, 'value', e.target.value)}
                        placeholder="Valor interno"
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Opção
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="is_required" className="cursor-pointer">Obrigatória</Label>
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="is_active" className="cursor-pointer">Ativa</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="allow_tour_edit" className="cursor-pointer text-sm">Editável por passeio</Label>
                <Switch
                  id="allow_tour_edit"
                  checked={formData.allow_tour_edit}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_tour_edit: checked })}
                />
              </div>
            </div>

            {/* Conditional Display Section */}
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Condição de Exibição (Opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Configure quando esta pergunta deve aparecer baseado na resposta de outra pergunta.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="condition_field_key" className="text-xs">Pergunta de Condição</Label>
                  <Select
                    value={formData.condition_field_key || "none"}
                    onValueChange={(value) => setFormData({ ...formData, condition_field_key: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (sempre exibir)</SelectItem>
                      {questions
                        .filter(q => q.field_type === 'boolean' || q.field_type === 'radio' || q.field_type === 'select')
                        .filter(q => q.id !== editingQuestion?.id)
                        .map(q => (
                          <SelectItem key={q.standard_field_key || q.id} value={q.standard_field_key || q.id}>
                            {q.title}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="condition_value" className="text-xs">Valor Esperado</Label>
                  <Select
                    value={formData.condition_value}
                    onValueChange={(value) => setFormData({ ...formData, condition_value: value })}
                    disabled={!formData.condition_field_key}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingQuestion ? 'Salvar Alterações' : 'Criar Pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
