import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Download,
  ChevronDown,
  ChevronRight,
  Undo2,
  UserX
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';

interface TourStats {
  total: number;
  checkedIn: number;
  pending: number;
  absent: number;
}

interface Tour {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string | null;
  stats?: TourStats;
}

interface Ticket {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf: string | null;
  boarding_point_name: string | null;
  boarding_point_address: string | null;
  boarding_time: string | null;
  status: string;
  checkin_at: string | null;
  reservation_number: string | null;
  qr_token: string;
}

interface GroupedTickets {
  [boardingPoint: string]: Ticket[];
}

type ScanResult = 
  | { type: 'success'; ticket: Ticket }
  | { type: 'already_used'; ticket: Ticket }
  | { type: 'wrong_tour'; ticket: Ticket; tourName: string }
  | { type: 'invalid'; message: string }
  | null;

export default function Embarques() {
  const navigate = useNavigate();
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
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
  
  // Audio ref for check-in sound
  const checkinAudioRef = useRef<HTMLAudioElement | null>(null);

  const ACCESS_PASSWORD = 'camaleao2025';

  // Check password session on mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('embarques_access');
    if (savedPassword === ACCESS_PASSWORD) {
      setPasswordVerified(true);
    }
  }, []);

  // Fetch tours after password verified
  useEffect(() => {
    if (passwordVerified) {
      fetchTours();
    }
    return () => {
      stopScanner();
    };
  }, [passwordVerified]);

  const handlePasswordSubmit = () => {
    if (passwordInput === ACCESS_PASSWORD) {
      sessionStorage.setItem('embarques_access', ACCESS_PASSWORD);
      setPasswordVerified(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Fetch tickets when tour changes + real-time subscription
  useEffect(() => {
    if (selectedTourId) {
      fetchTickets();
      
      // Set up real-time subscription for tickets
      const channel = supabase
        .channel(`tickets-${selectedTourId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets',
            filter: `tour_id=eq.${selectedTourId}`
          },
          (payload) => {
            console.log('Real-time update:', payload);
            // Refresh tickets on any change
            fetchTickets();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setTickets([]);
    }
  }, [selectedTourId]);


  const fetchTours = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get tours from today onwards, or ending today
      const { data: toursData, error } = await supabase
        .from('tours')
        .select('id, name, city, start_date, end_date')
        .or(`start_date.gte.${today},end_date.gte.${today}`)
        .eq('is_active', true)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      // Fetch ticket stats for each tour (excluding cancelled reservations)
      const toursWithStats = await Promise.all(
        (toursData || []).map(async (tour) => {
          const { data: ticketsData } = await supabase
            .from('tickets')
            .select(`
              status,
              reservas:reserva_id (
                status,
                payment_status
              )
            `)
            .eq('tour_id', tour.id)
            .in('status', ['active', 'used', 'absent']);
          
          // Only include tickets from CONFIRMED and PAID reservations
          const validTickets = (ticketsData || []).filter(ticket => {
            const reserva = ticket.reservas as any;
            if (!reserva) return false;
            const isConfirmed = reserva.status === 'confirmada' || reserva.status === 'confirmado';
            const isPaid = reserva.payment_status === 'pago' || reserva.payment_status === 'confirmed';
            return isConfirmed && isPaid;
          });
          
          const stats: TourStats = {
            total: validTickets.length,
            checkedIn: validTickets.filter(t => t.status === 'used').length,
            pending: validTickets.filter(t => t.status === 'active').length,
            absent: validTickets.filter(t => t.status === 'absent').length
          };
          
          return { ...tour, stats };
        })
      );
      
      setTours(toursWithStats);
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
      // Fetch tickets with reservation info - only show confirmed and paid
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          reservas:reserva_id (
            status,
            payment_status
          )
        `)
        .eq('tour_id', selectedTourId)
        .in('status', ['active', 'used', 'absent'])
        .order('boarding_point_name', { ascending: true })
        .order('participant_name', { ascending: true });
      
      if (error) throw error;
      
      // Only include tickets from CONFIRMED and PAID reservations
      const validTickets = (data || []).filter(ticket => {
        const reserva = ticket.reservas as any;
        if (!reserva) return false; // Exclude tickets without reservation
        
        // Only include confirmed reservations
        const isConfirmed = reserva.status === 'confirmada' || reserva.status === 'confirmado';
        
        // Only include paid reservations
        const isPaid = reserva.payment_status === 'pago' || reserva.payment_status === 'confirmed';
        
        return isConfirmed && isPaid;
      });
      
      // Remove the reservas field from the tickets before setting state
      const cleanedTickets = validTickets.map(({ reservas, ...ticket }) => ticket);
      
      setTickets(cleanedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Scanner functions - FULL AREA for QR codes (no restricted scanning box)
  const startScanner = async () => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode("qr-reader-embarques");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          // NO qrbox - uses entire camera view for scanning
          aspectRatio: 1.0 // Square aspect ratio
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

  // Play check-in sound
  const playCheckinSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not available');
    }
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
      
      playCheckinSound();
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
      
      playCheckinSound();
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

  // Password protection screen
  if (!passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Check-in de Embarque</CardTitle>
            <p className="text-sm text-muted-foreground">Digite a senha para acessar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Senha de acesso"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className={passwordError ? 'border-red-500' : ''}
            />
            {passwordError && (
              <p className="text-sm text-red-500">Senha incorreta</p>
            )}
            <Button onClick={handlePasswordSubmit} className="w-full">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Check-in de Embarque</h1>
            <p className="text-sm text-muted-foreground">Escaneie ou confirme manualmente</p>
          </div>
        </div>

        {/* Tour Selection - Mini Cards with Expandable Content */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Selecione o Passeio</p>
          <div className="space-y-2">
            {tours.map(tour => {
              const isSelected = selectedTourId === tour.id;
              const stats = tour.stats || { total: 0, checkedIn: 0, pending: 0, absent: 0 };
              
              return (
                <Card 
                  key={tour.id}
                  className={`transition-all ${
                    isSelected 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                  }`}
                  onClick={() => !isSelected && setSelectedTourId(tour.id)}
                >
                  <CardContent className={`p-3 ${isSelected ? 'pb-0' : ''}`}>
                    {/* Tour Header - Always visible */}
                    <div 
                      className={`flex items-center justify-between gap-3 ${isSelected ? 'cursor-pointer' : ''}`}
                      onClick={(e) => {
                        if (isSelected) {
                          e.stopPropagation();
                          setSelectedTourId('');
                        }
                      }}
                    >
                      {/* Tour Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${isSelected ? 'text-primary' : ''}`}>
                          {tour.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(tour.start_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {tour.city}
                          </span>
                        </div>
                      </div>
                      
                      {/* Mini Stats */}
                      <div className="flex items-center gap-1.5 text-xs shrink-0">
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">{isSelected ? totalTickets : stats.total}</span>
                        </div>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          <Check className="h-3 w-3" />
                          <span className="font-medium">{isSelected ? checkedIn : stats.checkedIn}</span>
                        </div>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{isSelected ? pending : stats.pending}</span>
                        </div>
                        {(isSelected ? absent : stats.absent) > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            <UserX className="h-3 w-3" />
                            <span className="font-medium">{isSelected ? absent : stats.absent}</span>
                          </div>
                        )}
                        {isSelected && (
                          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content - Only when selected */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Refresh Button */}
                        <Button 
                          variant="outline" 
                          className="w-full gap-2" 
                          onClick={fetchTickets}
                          disabled={loadingTickets}
                          size="sm"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingTickets ? 'animate-spin' : ''}`} />
                          {loadingTickets ? 'Atualizando...' : 'Atualizar'}
                        </Button>

                        {/* Scanner Section */}
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                          <div 
                            id="qr-reader-embarques" 
                            className={`w-full rounded-lg overflow-hidden mb-3 bg-black ${isScanning ? 'aspect-square max-h-64' : 'h-0'}`}
                            style={{ aspectRatio: isScanning ? '1/1' : undefined }}
                          />
                          {!isScanning ? (
                            <Button 
                              onClick={startScanner} 
                              className="w-full gap-2" 
                              variant="default"
                            >
                              <QrCode className="h-4 w-4" />
                              Escanear QR Code
                            </Button>
                          ) : (
                            <Button 
                              onClick={stopScanner} 
                              variant="destructive" 
                              className="w-full gap-2"
                            >
                              <CameraOff className="h-4 w-4" />
                              Parar Câmera
                            </Button>
                          )}
                        </div>

                        {/* Scan Result */}
                        {scanResult && (
                          <div className={`rounded-lg border-2 p-3 ${
                            scanResult.type === 'success' ? 'border-green-500 bg-green-50' :
                            scanResult.type === 'already_used' ? 'border-amber-500 bg-amber-50' :
                            scanResult.type === 'wrong_tour' ? 'border-orange-500 bg-orange-50' :
                            'border-red-500 bg-red-50'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {scanResult.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                              {scanResult.type === 'already_used' && <AlertTriangle className="h-6 w-6 text-amber-500" />}
                              {scanResult.type === 'wrong_tour' && <AlertTriangle className="h-6 w-6 text-orange-500" />}
                              {scanResult.type === 'invalid' && <XCircle className="h-6 w-6 text-red-500" />}
                              <span className={`font-semibold ${
                                scanResult.type === 'success' ? 'text-green-700' :
                                scanResult.type === 'already_used' ? 'text-amber-700' :
                                scanResult.type === 'wrong_tour' ? 'text-orange-700' : 'text-red-700'
                              }`}>
                                {scanResult.type === 'success' && 'Check-in Realizado!'}
                                {scanResult.type === 'already_used' && 'Já Embarcou'}
                                {scanResult.type === 'wrong_tour' && 'Passeio Diferente'}
                                {scanResult.type === 'invalid' && 'Ticket Inválido'}
                              </span>
                            </div>
                            {scanResult.type !== 'invalid' && (
                              <p className="text-sm mb-2">{scanResult.ticket.participant_name}</p>
                            )}
                            <Button onClick={resetScanResult} size="sm" className="w-full">
                              Próximo
                            </Button>
                          </div>
                        )}

                        {/* Search and Filter */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8 h-9"
                            />
                          </div>
                          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                            <SelectTrigger className="w-28 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pending">Aguardando</SelectItem>
                              <SelectItem value="done">Embarcados</SelectItem>
                              <SelectItem value="absent">Ausentes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Tickets by Boarding Point */}
                        {loadingTickets ? (
                          <div className="flex justify-center py-6">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        ) : (
                          <div className="space-y-3 pb-3">
                            {Object.entries(groupedTickets).map(([boardingPoint, pointTickets]) => (
                              <div key={boardingPoint} className="rounded-lg border overflow-hidden">
                                <div 
                                  className="py-2 px-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors flex items-center justify-between"
                                  onClick={() => toggleBoardingPoint(boardingPoint)}
                                >
                                  <div className="flex items-center gap-2">
                                    {collapsedPoints.has(boardingPoint) ? (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-sm font-medium">{boardingPoint}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                      {pointTickets.filter(t => t.status === 'used').length}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {pointTickets.length}
                                    </span>
                                  </div>
                                </div>
                                {!collapsedPoints.has(boardingPoint) && (
                                  <div>
                                    {pointTickets.map((ticket, idx) => (
                                      <div
                                        key={ticket.id}
                                        className={`flex items-center justify-between p-2.5 ${
                                          idx !== pointTickets.length - 1 ? 'border-b' : ''
                                        } ${ticket.status === 'used' ? 'bg-green-50/50' : ticket.status === 'absent' ? 'bg-red-50/50' : ''}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                            ticket.status === 'used' 
                                              ? 'bg-green-500 text-white' 
                                              : ticket.status === 'absent'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-100 text-gray-400'
                                          }`}>
                                            {ticket.status === 'used' ? (
                                              <Check className="h-3.5 w-3.5" />
                                            ) : ticket.status === 'absent' ? (
                                              <UserX className="h-3.5 w-3.5" />
                                            ) : (
                                              <User className="h-3.5 w-3.5" />
                                            )}
                                          </div>
                                          <div>
                                            <div className={`font-medium text-sm ${ticket.status === 'absent' ? 'line-through text-red-700' : ''}`}>
                                              {ticket.participant_name}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                              {ticket.status === 'used' && ticket.checkin_at && (
                                                <span className="text-green-600">
                                                  ✓ {format(new Date(ticket.checkin_at), "HH:mm")}
                                                </span>
                                              )}
                                              {ticket.status === 'absent' && (
                                                <span className="text-red-600">Ausente</span>
                                              )}
                                              {ticket.status === 'active' && ticket.ticket_number}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          {ticket.status === 'active' && (
                                            <>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleManualCheckin(ticket)}
                                                className="h-7 w-7 text-green-600 hover:bg-green-50"
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleMarkAbsent(ticket)}
                                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                                              >
                                                <UserX className="h-4 w-4" />
                                              </Button>
                                            </>
                                          )}
                                          {(ticket.status === 'used' || ticket.status === 'absent') && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => ticket.status === 'used' ? handleUndoCheckin(ticket) : handleUndoAbsent(ticket)}
                                              className="h-7 w-7 text-muted-foreground"
                                            >
                                              <Undo2 className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}

                            {Object.keys(groupedTickets).length === 0 && (
                              <div className="py-6 text-center text-muted-foreground text-sm">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p>Nenhum participante encontrado</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {isProcessing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <span>Processando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
