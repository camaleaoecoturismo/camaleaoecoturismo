import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  ArrowLeft,
  User,
  MapPin,
  Clock,
  Users,
  QrCode,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Undo2,
  UserX
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Tour {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string | null;
}

interface Ticket {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf: string | null;
  boarding_point_name: string | null;
  boarding_point_address: string | null;
  boarding_time: string | null;
  status: string; // 'active' | 'used' | 'absent'
  checkin_at: string | null;
  reservation_number: string | null;
  qr_token: string;
}

interface GroupedTickets {
  [boardingPoint: string]: Ticket[];
}

interface TourCheckinPageProps {
  onBack: () => void;
}

type ScanResult = 
  | { type: 'success'; ticket: Ticket }
  | { type: 'already_used'; ticket: Ticket }
  | { type: 'wrong_tour'; ticket: Ticket; tourName: string }
  | { type: 'invalid'; message: string }
  | null;

export default function TourCheckinPage({ onBack }: TourCheckinPageProps) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Search/Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done' | 'absent'>('all');
  
  // Collapsible boarding points
  const [collapsedPoints, setCollapsedPoints] = useState<Set<string>>(new Set());

  // Fetch available tours (today or future)
  useEffect(() => {
    fetchTours();
  }, []);

  // Fetch tickets when tour changes
  useEffect(() => {
    if (selectedTourId) {
      fetchTickets();
    } else {
      setTickets([]);
    }
  }, [selectedTourId]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const fetchTours = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tours')
        .select('id, name, city, start_date, end_date')
        .gte('start_date', today)
        .eq('is_active', true)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setTours(data || []);
    } catch (error) {
      console.error('Error fetching tours:', error);
      toast.error('Erro ao carregar passeios');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tour_id', selectedTourId)
        .in('status', ['active', 'used', 'absent'])
        .order('boarding_point_name', { ascending: true })
        .order('participant_name', { ascending: true });
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Scanner functions
  const startScanner = async () => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode("qr-reader-checkin");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          let token = decodedText;
          if (decodedText.includes('/checkin/')) {
            token = decodedText.split('/checkin/').pop() || decodedText;
          } else if (decodedText.includes('/ticket/')) {
            token = decodedText.split('/ticket/').pop() || decodedText;
          }
          
          await handleScan(token);
          await stopScanner();
        },
        () => {}
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      toast.error('Erro ao iniciar câmera: ' + error.message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = async (token: string) => {
    setIsProcessing(true);
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          tours:tour_id (name)
        `)
        .eq('qr_token', token)
        .single();

      if (error || !ticket) {
        setScanResult({ type: 'invalid', message: 'Ticket não encontrado' });
        return;
      }

      const ticketInfo: Ticket = {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        participant_name: ticket.participant_name,
        participant_cpf: ticket.participant_cpf,
        boarding_point_name: ticket.boarding_point_name,
        boarding_point_address: ticket.boarding_point_address,
        boarding_time: ticket.boarding_time,
        status: ticket.status,
        checkin_at: ticket.checkin_at,
        reservation_number: ticket.reservation_number,
        qr_token: ticket.qr_token
      };

      // Check if ticket belongs to selected tour
      if (ticket.tour_id !== selectedTourId) {
        setScanResult({ 
          type: 'wrong_tour', 
          ticket: ticketInfo,
          tourName: (ticket.tours as any)?.name || 'Outro passeio'
        });
        return;
      }

      if (ticket.status === 'used') {
        setScanResult({ type: 'already_used', ticket: ticketInfo });
        return;
      }

      // Mark ticket as used
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          status: 'used', 
          checkin_at: new Date().toISOString() 
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      const updatedTicket = { ...ticketInfo, status: 'used', checkin_at: new Date().toISOString() };
      setScanResult({ type: 'success', ticket: updatedTicket });
      
      // Update local tickets list
      setTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));
      
      toast.success(`Check-in confirmado: ${ticket.participant_name}`);

    } catch (error: any) {
      console.error('Error processing scan:', error);
      setScanResult({ type: 'invalid', message: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCheckin = async (ticket: Ticket) => {
    if (ticket.status === 'used') {
      toast.error('Este ticket já foi utilizado');
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'used', 
          checkin_at: new Date().toISOString() 
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'used', checkin_at: new Date().toISOString() }
          : t
      ));
      
      toast.success(`Check-in confirmado: ${ticket.participant_name}`);
    } catch (error: any) {
      toast.error('Erro ao fazer check-in: ' + error.message);
    }
  };

  const handleUndoCheckin = async (ticket: Ticket) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'active', 
          checkin_at: null 
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'active', checkin_at: null }
          : t
      ));
      
      toast.success(`Check-in desfeito: ${ticket.participant_name}`);
    } catch (error: any) {
      toast.error('Erro ao desfazer check-in: ' + error.message);
    }
  };

  const handleMarkAbsent = async (ticket: Ticket) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'absent', 
          checkin_at: null 
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'absent', checkin_at: null }
          : t
      ));
      
      toast.success(`Ausência registrada: ${ticket.participant_name}`);
    } catch (error: any) {
      toast.error('Erro ao registrar ausência: ' + error.message);
    }
  };

  const handleUndoAbsent = async (ticket: Ticket) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'active', 
          checkin_at: null 
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'active', checkin_at: null }
          : t
      ));
      
      toast.success(`Ausência desfeita: ${ticket.participant_name}`);
    } catch (error: any) {
      toast.error('Erro ao desfazer ausência: ' + error.message);
    }
  };

  const toggleBoardingPoint = (boardingPoint: string) => {
    setCollapsedPoints(prev => {
      const next = new Set(prev);
      if (next.has(boardingPoint)) {
        next.delete(boardingPoint);
      } else {
        next.add(boardingPoint);
      }
      return next;
    });
  };

  const resetScanResult = () => {
    setScanResult(null);
  };

  // Filter and group tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.participant_cpf?.includes(searchQuery) ||
      ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'pending' && ticket.status === 'active') ||
      (filterStatus === 'done' && ticket.status === 'used') ||
      (filterStatus === 'absent' && ticket.status === 'absent');
    
    return matchesSearch && matchesFilter;
  });

  const groupedTickets: GroupedTickets = filteredTickets.reduce((acc, ticket) => {
    const key = ticket.boarding_point_name || 'Sem ponto de embarque';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ticket);
    return acc;
  }, {} as GroupedTickets);

  // Statistics
  const totalTickets = tickets.length;
  const checkedIn = tickets.filter(t => t.status === 'used').length;
  const pending = tickets.filter(t => t.status === 'active').length;
  const absent = tickets.filter(t => t.status === 'absent').length;

  const selectedTour = tours.find(t => t.id === selectedTourId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Check-in de Participantes</h1>
          <p className="text-sm text-muted-foreground">Escaneie ou confirme manualmente</p>
        </div>
      </div>

      {/* Tour Selector */}
      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Selecione o Passeio
          </label>
          <Select value={selectedTourId} onValueChange={setSelectedTourId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um passeio..." />
            </SelectTrigger>
            <SelectContent>
              {tours.map(tour => (
                <SelectItem key={tour.id} value={tour.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{tour.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(tour.start_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} • {tour.city}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTourId && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-2 text-center">
                <Users className="h-4 w-4 mx-auto text-blue-600 mb-0.5" />
                <div className="text-xl font-bold text-blue-700">{totalTickets}</div>
                <div className="text-[10px] text-blue-600">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-2 text-center">
                <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-0.5" />
                <div className="text-xl font-bold text-green-700">{checkedIn}</div>
                <div className="text-[10px] text-green-600">Check-in</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-2 text-center">
                <Clock className="h-4 w-4 mx-auto text-amber-600 mb-0.5" />
                <div className="text-xl font-bold text-amber-700">{pending}</div>
                <div className="text-[10px] text-amber-600">Pendentes</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-2 text-center">
                <UserX className="h-4 w-4 mx-auto text-red-600 mb-0.5" />
                <div className="text-xl font-bold text-red-700">{absent}</div>
                <div className="text-[10px] text-red-600">Ausentes</div>
              </CardContent>
            </Card>
          </div>

          {/* Scanner Button */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div 
                id="qr-reader-checkin" 
                className={`w-full rounded-lg overflow-hidden mb-4 ${isScanning ? 'h-64' : 'h-0'}`}
              />

              {!isScanning ? (
                <Button 
                  onClick={startScanner} 
                  className="w-full gap-2" 
                  size="lg"
                  variant="default"
                >
                  <QrCode className="h-5 w-5" />
                  Escanear QR Code
                </Button>
              ) : (
                <Button 
                  onClick={stopScanner} 
                  variant="destructive" 
                  className="w-full gap-2" 
                  size="lg"
                >
                  <CameraOff className="h-5 w-5" />
                  Parar Câmera
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Scan Result Modal */}
          {scanResult && (
            <Card className={`border-2 ${
              scanResult.type === 'success' ? 'border-green-500 bg-green-50' :
              scanResult.type === 'already_used' ? 'border-amber-500 bg-amber-50' :
              scanResult.type === 'wrong_tour' ? 'border-orange-500 bg-orange-50' :
              'border-red-500 bg-red-50'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {scanResult.type === 'success' && (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  )}
                  {scanResult.type === 'already_used' && (
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                  )}
                  {scanResult.type === 'wrong_tour' && (
                    <AlertTriangle className="h-10 w-10 text-orange-500" />
                  )}
                  {scanResult.type === 'invalid' && (
                    <XCircle className="h-10 w-10 text-red-500" />
                  )}
                  <div>
                    <CardTitle className={`text-lg ${
                      scanResult.type === 'success' ? 'text-green-700' :
                      scanResult.type === 'already_used' ? 'text-amber-700' :
                      scanResult.type === 'wrong_tour' ? 'text-orange-700' :
                      'text-red-700'
                    }`}>
                      {scanResult.type === 'success' && 'Check-in Realizado!'}
                      {scanResult.type === 'already_used' && 'Ticket Já Utilizado'}
                      {scanResult.type === 'wrong_tour' && 'Passeio Diferente'}
                      {scanResult.type === 'invalid' && 'Ticket Inválido'}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {scanResult.type === 'invalid' ? (
                  <p className="text-red-600">{scanResult.message}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{scanResult.ticket.participant_name}</span>
                    </div>
                    
                    {scanResult.ticket.boarding_point_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{scanResult.ticket.boarding_point_name}</span>
                      </div>
                    )}

                    {scanResult.type === 'already_used' && scanResult.ticket.checkin_at && (
                      <p className="text-amber-600 font-medium text-sm">
                        Check-in feito em: {format(new Date(scanResult.ticket.checkin_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    )}

                    {scanResult.type === 'wrong_tour' && (
                      <p className="text-orange-600 font-medium text-sm">
                        Este ticket é do passeio: {scanResult.tourName}
                      </p>
                    )}
                  </div>
                )}

                <Button onClick={resetScanResult} className="w-full gap-2" size="lg">
                  <RefreshCw className="h-4 w-4" />
                  Continuar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'pending' | 'done' | 'absent')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="done">Com check-in</SelectItem>
                <SelectItem value="absent">Ausentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Participants by Boarding Point */}
          {loadingTickets ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : Object.keys(groupedTickets).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {tickets.length === 0 
                  ? 'Nenhum participante confirmado para este passeio'
                  : 'Nenhum resultado encontrado'
                }
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTickets).map(([boardingPoint, boardingTickets]) => (
                <Card key={boardingPoint}>
                  <CardHeader 
                    className="py-3 px-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => toggleBoardingPoint(boardingPoint)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {collapsedPoints.has(boardingPoint) ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <MapPin className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">{boardingPoint}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {boardingTickets.filter(t => t.status === 'used').length}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          {boardingTickets.filter(t => t.status === 'absent').length}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {boardingTickets.length}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {!collapsedPoints.has(boardingPoint) && (
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {boardingTickets.map(ticket => (
                          <div 
                            key={ticket.id}
                            className={`flex items-center justify-between p-3 ${
                              ticket.status === 'used' ? 'bg-green-50/50' : 
                              ticket.status === 'absent' ? 'bg-red-50/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {ticket.status === 'used' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : ticket.status === 'absent' ? (
                                  <UserX className="h-4 w-4 text-red-500 flex-shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                )}
                                <span className={`font-medium truncate ${
                                  ticket.status === 'used' ? 'text-green-700' : 
                                  ticket.status === 'absent' ? 'text-red-700 line-through' : ''
                                }`}>
                                  {ticket.participant_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>{ticket.ticket_number}</span>
                                {ticket.status === 'used' && ticket.checkin_at && (
                                  <span className="text-green-600">
                                    • {format(new Date(ticket.checkin_at), "HH:mm")}
                                  </span>
                                )}
                                {ticket.status === 'absent' && (
                                  <span className="text-red-600">• Ausente</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {ticket.status === 'active' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => handleManualCheckin(ticket)}
                                  >
                                    <Check className="h-3 w-3" />
                                    Check-in
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => handleMarkAbsent(ticket)}
                                  >
                                    <UserX className="h-3 w-3" />
                                    Ausente
                                  </Button>
                                </>
                              )}
                              {ticket.status === 'used' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleUndoCheckin(ticket)}
                                >
                                  <Undo2 className="h-3 w-3" />
                                  Desfazer
                                </Button>
                              )}
                              {ticket.status === 'absent' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleUndoAbsent(ticket)}
                                >
                                  <Undo2 className="h-3 w-3" />
                                  Desfazer
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedTourId && tours.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum passeio disponível para check-in
          </CardContent>
        </Card>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span>Processando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
