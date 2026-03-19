import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, RefreshCw, Search, Edit, LogOut, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

interface Trip {
  id: string;
  titulo: string;
  data: string;
  user_id: string;
}

interface Stop {
  id: string;
  trip_id: string;
  titulo: string;
  horario: string | null;
  apelido_curto: string | null;
  ordem: number;
}

interface Entry {
  id: string;
  trip_id: string;
  stop_id: string;
  nome: string;
  presente: boolean;
}

const Checkin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStop, setFilterStop] = useState<string>("all");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Dialog states
  const [newTripDialog, setNewTripDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDate, setNewTripDate] = useState("");
  const [importText, setImportText] = useState("");
  const [addEntryDialog, setAddEntryDialog] = useState(false);
  const [selectedStopForAdd, setSelectedStopForAdd] = useState<string | null>(null);
  const [newEntryName, setNewEntryName] = useState("");
  
  // Edit states
  const [editingStop, setEditingStop] = useState<string | null>(null);
  const [editStopTitle, setEditStopTitle] = useState("");
  const [editStopTime, setEditStopTime] = useState("");
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editEntryName, setEditEntryName] = useState("");
  const [collapsedStops, setCollapsedStops] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTrip) {
      loadTripData();
      subscribeToRealtime();
    }
  }, [selectedTrip]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const loadTrips = async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("data", { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao carregar viagens", variant: "destructive" });
      return;
    }
    setTrips(data || []);
  };

  const loadTripData = async () => {
    if (!selectedTrip) return;

    const [stopsResult, entriesResult] = await Promise.all([
      supabase.from("stops").select("*").eq("trip_id", selectedTrip.id).order("ordem"),
      supabase.from("entries").select("*").eq("trip_id", selectedTrip.id)
    ]);

    if (stopsResult.error || entriesResult.error) {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
      return;
    }

    setStops(stopsResult.data || []);
    setEntries(entriesResult.data || []);
  };

  const subscribeToRealtime = () => {
    if (!selectedTrip) return;

    const channel = supabase
      .channel('checkin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `trip_id=eq.${selectedTrip.id}` }, () => {
        loadTripData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createTrip = async () => {
    if (!newTripTitle || !newTripDate) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({ titulo: newTripTitle, data: newTripDate, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar viagem", variant: "destructive" });
      return;
    }

    setTrips([data, ...trips]);
    setSelectedTrip(data);
    setNewTripDialog(false);
    setNewTripTitle("");
    setNewTripDate("");
    toast({ title: "Viagem criada com sucesso!" });
  };

  const parseImportText = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const parsedStops: { titulo: string; horario: string; nomes: string[] }[] = [];
    let currentStop: { titulo: string; horario: string; nomes: string[] } | null = null;

    for (const line of lines) {
      if (line.startsWith('📍')) {
        if (currentStop) parsedStops.push(currentStop);
        const titulo = line.replace('📍', '').trim();
        currentStop = { titulo, horario: '', nomes: [] };
      } else if (line.startsWith('🕔') || line.startsWith('🕕') || line.startsWith('🕖') || line.startsWith('🕗')) {
        if (currentStop) {
          currentStop.horario = line.replace(/🕔|🕕|🕖|🕗/, '').trim();
        }
      } else if (line.startsWith('▪️')) {
        if (currentStop) {
          currentStop.nomes.push(line.replace('▪️', '').trim());
        }
      }
    }
    if (currentStop) parsedStops.push(currentStop);
    return parsedStops;
  };

  const importList = async () => {
    if (!selectedTrip || !importText) return;

    const parsed = parseImportText(importText);
    
    for (let i = 0; i < parsed.length; i++) {
      const stopData = parsed[i];
      const { data: stop, error: stopError } = await supabase
        .from("stops")
        .insert({
          trip_id: selectedTrip.id,
          titulo: stopData.titulo,
          horario: stopData.horario,
          ordem: i
        })
        .select()
        .single();

      if (stopError || !stop) continue;

      const entriesToInsert = stopData.nomes.map(nome => ({
        trip_id: selectedTrip.id,
        stop_id: stop.id,
        nome,
        presente: false
      }));

      await supabase.from("entries").insert(entriesToInsert);
    }

    loadTripData();
    setImportDialog(false);
    setImportText("");
    toast({ title: "Lista importada com sucesso!" });
  };

  const togglePresence = async (entryId: string, newValue: boolean) => {
    const { error } = await supabase
      .from("entries")
      .update({ presente: newValue })
      .eq("id", entryId);

    if (error) {
      toast({ title: "Erro ao atualizar presença", variant: "destructive" });
    }
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      toast({ title: "Erro ao excluir participante", variant: "destructive" });
    }
  };

  const addEntry = async () => {
    if (!selectedStopForAdd || !newEntryName.trim()) {
      toast({ title: "Preencha o nome do participante", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("entries")
      .insert({
        trip_id: selectedTrip!.id,
        stop_id: selectedStopForAdd,
        nome: newEntryName.trim(),
        presente: false
      });

    if (error) {
      toast({ title: "Erro ao adicionar participante", variant: "destructive" });
    } else {
      setAddEntryDialog(false);
      setNewEntryName("");
      setSelectedStopForAdd(null);
      toast({ title: "Participante adicionado!" });
    }
  };

  const updateStop = async (stopId: string) => {
    if (!editStopTitle.trim()) {
      toast({ title: "Título não pode estar vazio", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("stops")
      .update({ 
        titulo: editStopTitle.trim(),
        horario: editStopTime.trim() || null
      })
      .eq("id", stopId);

    if (error) {
      toast({ title: "Erro ao atualizar ponto", variant: "destructive" });
    } else {
      setEditingStop(null);
      toast({ title: "Ponto atualizado!" });
    }
  };

  const updateEntry = async (entryId: string) => {
    if (!editEntryName.trim()) {
      toast({ title: "Nome não pode estar vazio", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("entries")
      .update({ nome: editEntryName.trim() })
      .eq("id", entryId);

    if (error) {
      toast({ title: "Erro ao atualizar nome", variant: "destructive" });
    } else {
      setEditingEntry(null);
      toast({ title: "Nome atualizado!" });
    }
  };

  const toggleStopCollapse = (stopId: string) => {
    const newCollapsed = new Set(collapsedStops);
    if (newCollapsed.has(stopId)) {
      newCollapsed.delete(stopId);
    } else {
      newCollapsed.add(stopId);
    }
    setCollapsedStops(newCollapsed);
  };

  const resetAllCheckins = async () => {
    if (!selectedTrip) return;
    if (!confirm("Deseja realmente zerar todos os check-ins?")) return;

    const { error } = await supabase
      .from("entries")
      .update({ presente: false })
      .eq("trip_id", selectedTrip.id);

    if (error) {
      toast({ title: "Erro ao resetar check-ins", variant: "destructive" });
    } else {
      toast({ title: "Check-ins resetados!" });
    }
  };

  const exportCSV = () => {
    if (!selectedTrip) return;

    const headers = ["Ponto de Embarque", "Horário", "Nome", "Presente"];
    const rows = stops.flatMap(stop => {
      const stopEntries = entries.filter(e => e.stop_id === stop.id);
      return stopEntries.map(entry => [
        stop.titulo,
        stop.horario || "",
        entry.nome,
        entry.presente ? "Sim" : "Não"
      ]);
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin_${selectedTrip.titulo.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStop = filterStop === "all" || entry.stop_id === filterStop;
    const matchesPending = !showPendingOnly || !entry.presente;
    return matchesSearch && matchesStop && matchesPending;
  });

  const totalEntries = entries.length;
  const presentCount = entries.filter(e => e.presente).length;
  const absentCount = entries.filter(e => !e.presente).length;
  const missingCount = totalEntries - presentCount;
  const progressPercent = totalEntries > 0 ? (presentCount / totalEntries) * 100 : 0;

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#8d00da] text-white p-4 sticky top-0 z-50 shadow-lg" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Check-in Camaleão</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Trip Selector */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto flex gap-2 items-center">
          <select 
            className="flex-1 p-2 border rounded"
            value={selectedTrip?.id || ""}
            onChange={(e) => {
              const trip = trips.find(t => t.id === e.target.value);
              setSelectedTrip(trip || null);
            }}
          >
            <option value="">Selecione uma viagem</option>
            {trips.map(trip => (
              <option key={trip.id} value={trip.id}>
                {trip.titulo} - {new Date(trip.data + 'T12:00:00').toLocaleDateString('pt-BR')}
              </option>
            ))}
          </select>
          
          <Dialog open={newTripDialog} onOpenChange={setNewTripDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#8d00da] hover:bg-[#7000b0]">
                <Plus className="h-4 w-4 mr-2" />
                Nova Viagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Viagem</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome da viagem"
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                />
                <Input
                  type="date"
                  value={newTripDate}
                  onChange={(e) => setNewTripDate(e.target.value)}
                />
                <Button onClick={createTrip} className="w-full bg-[#8d00da] hover:bg-[#7000b0]">
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedTrip && (
        <>
          {/* HUD */}
          <div className="bg-white border-b p-4 sticky top-[72px] z-40 shadow">
            <div className="max-w-7xl mx-auto space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#8d00da]">{totalEntries}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#16a34a]">{presentCount}</div>
                  <div className="text-xs text-gray-600">Presentes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">{absentCount}</div>
                  <div className="text-xs text-gray-600">Ausentes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-500">{missingCount}</div>
                  <div className="text-xs text-gray-600">Faltam</div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white border-b p-4">
            <div className="max-w-7xl mx-auto space-y-3">
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nome..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="p-2 border rounded"
                  value={filterStop}
                  onChange={(e) => setFilterStop(e.target.value)}
                >
                  <option value="all">Todos os pontos</option>
                  {stops.map(stop => (
                    <option key={stop.id} value={stop.id}>{stop.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 flex-wrap items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showPendingOnly} onCheckedChange={(c) => setShowPendingOnly(!!c)} />
                  <span className="text-sm">Pendentes</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={editMode} onCheckedChange={(c) => setEditMode(!!c)} />
                  <span className="text-sm">Editar</span>
                </label>

                <Dialog open={importDialog} onOpenChange={setImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Importar Lista de Embarque</DialogTitle>
                    </DialogHeader>
                    <Textarea
                      placeholder="Cole aqui a lista formatada..."
                      className="min-h-[300px] font-mono text-sm"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <Button onClick={importList} className="bg-[#8d00da] hover:bg-[#7000b0]">
                      Importar
                    </Button>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm" onClick={resetAllCheckins}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zerar
                </Button>

                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Entries List */}
          <div className="max-w-7xl mx-auto p-4 space-y-4 pb-20">
            {stops.map(stop => {
              const stopEntries = filteredEntries.filter(e => e.stop_id === stop.id).sort((a, b) => a.nome.localeCompare(b.nome));
              if (stopEntries.length === 0 && !editMode) return null;

              const stopPresent = stopEntries.filter(e => e.presente).length;
              const stopTotal = stopEntries.length;
              const isCollapsed = collapsedStops.has(stop.id);
              const isEditingThisStop = editingStop === stop.id;

              return (
                <Collapsible key={stop.id} open={!isCollapsed} onOpenChange={() => toggleStopCollapse(stop.id)}>
                  <div className="bg-white rounded-lg shadow-md">
                    {/* Header do ponto de embarque */}
                    <div className="p-3 border-b">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditingThisStop ? (
                            <div className="space-y-2">
                              <Input
                                placeholder="Título do ponto"
                                value={editStopTitle}
                                onChange={(e) => setEditStopTitle(e.target.value)}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Horário (ex: 05h30)"
                                value={editStopTime}
                                onChange={(e) => setEditStopTime(e.target.value)}
                                className="text-sm"
                              />
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" onClick={() => updateStop(stop.id)} className="bg-[#8d00da] hover:bg-[#7000b0]">
                                  <Save className="h-3 w-3 mr-1" />
                                  Salvar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingStop(null)}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <CollapsibleTrigger asChild>
                                <button className="flex items-center gap-2 w-full text-left group">
                                  <h3 className="font-bold text-base md:text-lg text-[#8d00da] truncate">📍 {stop.titulo}</h3>
                                  {isCollapsed ? (
                                    <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-[#8d00da] flex-shrink-0" />
                                  ) : (
                                    <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-[#8d00da] flex-shrink-0" />
                                  )}
                                </button>
                              </CollapsibleTrigger>
                              <div className="flex items-center justify-between mt-1">
                                <div>
                                  {stop.horario && <p className="text-xs md:text-sm text-gray-600">🕐 {stop.horario}</p>}
                                  <p className="text-xs md:text-sm text-gray-500">
                                    {stopPresent}/{stopTotal} presentes
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditingThisStop && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedStopForAdd(stop.id);
                                setAddEntryDialog(true);
                              }}
                              title="Adicionar participante"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            {editMode && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingStop(stop.id);
                                  setEditStopTitle(stop.titulo);
                                  setEditStopTime(stop.horario || "");
                                }}
                                title="Editar ponto"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="p-2 space-y-1">
                        {stopEntries.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhum participante</p>
                        )}
                        {stopEntries.map(entry => {
                          const isEditingThisEntry = editingEntry === entry.id;
                          
                          return (
                            <div 
                              key={entry.id}
                              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors gap-2"
                            >
                              {isEditingThisEntry ? (
                                <div className="flex-1 flex items-center gap-2 flex-wrap">
                                  <Input
                                    value={editEntryName}
                                    onChange={(e) => setEditEntryName(e.target.value)}
                                    className="flex-1 min-w-[150px] text-sm"
                                  />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => updateEntry(entry.id)} className="h-8">
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)} className="h-8">
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm md:text-base text-gray-900 truncate">
                                      {entry.nome}
                                    </span>
                                  </div>

                                  <div className="flex gap-1 flex-shrink-0">
                                    {editMode ? (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            setEditingEntry(entry.id);
                                            setEditEntryName(entry.nome);
                                          }}
                                          title="Editar nome"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => deleteEntry(entry.id)}
                                          title="Excluir"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          variant={entry.presente ? "default" : "outline"}
                                          className={`h-7 px-2 text-[10px] ${
                                            entry.presente 
                                              ? 'bg-[#16a34a] hover:bg-[#16a34a]/90 text-white border-[#16a34a]' 
                                              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                          }`}
                                          onClick={() => togglePresence(entry.id, true)}
                                        >
                                          Presente
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={!entry.presente ? "default" : "outline"}
                                          className={`h-7 px-2 text-[10px] ${
                                            !entry.presente 
                                              ? 'bg-orange-500 hover:bg-orange-500/90 text-white border-orange-500' 
                                              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                          }`}
                                          onClick={() => togglePresence(entry.id, false)}
                                        >
                                          Ausente
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>

          {/* Add Entry Dialog */}
          <Dialog open={addEntryDialog} onOpenChange={setAddEntryDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Participante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input
                    placeholder="Digite o nome do participante"
                    value={newEntryName}
                    onChange={(e) => setNewEntryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                  />
                </div>
                <Button onClick={addEntry} className="w-full bg-[#8d00da] hover:bg-[#7000b0]">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Checkin;
