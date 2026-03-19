import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  Clock,
  Ticket,
  CreditCard
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketInfo {
  id: string;
  ticket_number: string;
  participant_name: string;
  participant_cpf: string | null;
  boarding_point_name: string | null;
  boarding_point_address: string | null;
  boarding_time: string | null;
  trip_date: string;
  amount_paid: number | null;
  reservation_number: string | null;
  status: string;
  checkin_at: string | null;
  tour_name?: string;
}

type ScanResult = 
  | { type: 'success'; ticket: TicketInfo }
  | { type: 'already_used'; ticket: TicketInfo }
  | { type: 'invalid'; message: string }
  | { type: 'cancelled'; ticket: TicketInfo }
  | null;

export default function CheckinScanner() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
    return () => {
      stopScanner();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para acessar o check-in');
        navigate('/auth');
        return;
      }

      const { data: role } = await supabase.rpc('get_current_user_role');
      if (role !== 'admin') {
        toast.error('Acesso restrito a administradores');
        navigate('/');
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      toast.error('Erro ao verificar autenticação');
      navigate('/auth');
    } finally {
      setCheckingAuth(false);
    }
  };

  const startScanner = async () => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Extract token from URL or use direct token
          let token = decodedText;
          if (decodedText.includes('/checkin/')) {
            token = decodedText.split('/checkin/').pop() || decodedText;
          }
          
          await handleScan(token);
          await stopScanner();
        },
        () => {} // Ignore errors during scanning
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
      // Fetch ticket by qr_token
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

      const ticketInfo: TicketInfo = {
        ...ticket,
        tour_name: (ticket.tours as any)?.name
      };

      if (ticket.status === 'cancelled') {
        setScanResult({ type: 'cancelled', ticket: ticketInfo });
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

      if (updateError) {
        throw updateError;
      }

      setScanResult({ type: 'success', ticket: { ...ticketInfo, status: 'used', checkin_at: new Date().toISOString() } });
      toast.success('Check-in realizado com sucesso!');

    } catch (error: any) {
      console.error('Error processing scan:', error);
      setScanResult({ type: 'invalid', message: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;
    
    setIsSearching(true);
    try {
      // Search by ticket number, participant name, or reservation number
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          tours:tour_id (name)
        `)
        .or(`ticket_number.ilike.%${manualSearch}%,participant_name.ilike.%${manualSearch}%,reservation_number.ilike.%${manualSearch}%`)
        .limit(1);

      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        setScanResult({ type: 'invalid', message: 'Nenhum ticket encontrado' });
        return;
      }

      const ticket = tickets[0];
      const ticketInfo: TicketInfo = {
        ...ticket,
        tour_name: (ticket.tours as any)?.name
      };

      if (ticket.status === 'cancelled') {
        setScanResult({ type: 'cancelled', ticket: ticketInfo });
      } else if (ticket.status === 'used') {
        setScanResult({ type: 'already_used', ticket: ticketInfo });
      } else {
        // Confirm check-in
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ 
            status: 'used', 
            checkin_at: new Date().toISOString() 
          })
          .eq('id', ticket.id);

        if (updateError) throw updateError;

        setScanResult({ type: 'success', ticket: { ...ticketInfo, status: 'used', checkin_at: new Date().toISOString() } });
        toast.success('Check-in realizado com sucesso!');
      }
    } catch (error: any) {
      toast.error('Erro na busca: ' + error.message);
    } finally {
      setIsSearching(false);
      setManualSearch('');
    }
  };

  const resetScan = () => {
    setScanResult(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Check-in por QR Code</h1>
            <p className="text-sm text-muted-foreground">Escaneie o ticket do participante</p>
          </div>
        </div>

        {/* Scanner Area */}
        {!scanResult && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div 
                id="qr-reader" 
                className={`w-full rounded-lg overflow-hidden ${isScanning ? 'h-64' : 'h-0'}`}
              />

              {!isScanning ? (
                <Button onClick={startScanner} className="w-full gap-2" size="lg">
                  <Camera className="h-5 w-5" />
                  Iniciar Câmera
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="destructive" className="w-full gap-2" size="lg">
                  <CameraOff className="h-5 w-5" />
                  Parar Câmera
                </Button>
              )}

              {/* Manual Search */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou busque manualmente</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Nome, código do ticket ou pedido..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Button onClick={handleManualSearch} disabled={isSearching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Display */}
        {scanResult && (
          <Card className={`border-2 ${
            scanResult.type === 'success' ? 'border-green-500 bg-green-50' :
            scanResult.type === 'already_used' ? 'border-yellow-500 bg-yellow-50' :
            scanResult.type === 'cancelled' ? 'border-gray-500 bg-gray-50' :
            'border-red-500 bg-red-50'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {scanResult.type === 'success' && (
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                )}
                {scanResult.type === 'already_used' && (
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                )}
                {scanResult.type === 'cancelled' && (
                  <XCircle className="h-12 w-12 text-gray-500" />
                )}
                {scanResult.type === 'invalid' && (
                  <XCircle className="h-12 w-12 text-red-500" />
                )}
                <div>
                  <CardTitle className={`text-lg ${
                    scanResult.type === 'success' ? 'text-green-700' :
                    scanResult.type === 'already_used' ? 'text-yellow-700' :
                    scanResult.type === 'cancelled' ? 'text-gray-700' :
                    'text-red-700'
                  }`}>
                    {scanResult.type === 'success' && 'Check-in Realizado!'}
                    {scanResult.type === 'already_used' && 'Ticket Já Utilizado'}
                    {scanResult.type === 'cancelled' && 'Ticket Cancelado'}
                    {scanResult.type === 'invalid' && 'Ticket Inválido'}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {scanResult.type === 'invalid' ? (
                <p className="text-red-600">{scanResult.message}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participante</p>
                      <p className="font-semibold">{scanResult.ticket.participant_name}</p>
                    </div>
                  </div>

                  {scanResult.ticket.tour_name && (
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Passeio</p>
                        <p className="font-semibold">{scanResult.ticket.tour_name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-semibold">
                        {format(new Date(scanResult.ticket.trip_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {scanResult.ticket.boarding_point_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Embarque</p>
                        <p className="font-semibold">{scanResult.ticket.boarding_point_name}</p>
                        {scanResult.ticket.boarding_time && (
                          <p className="text-sm text-muted-foreground">{scanResult.ticket.boarding_time}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {scanResult.ticket.amount_paid && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Pago</p>
                        <p className="font-semibold text-green-600">
                          {scanResult.ticket.amount_paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p>Ticket: {scanResult.ticket.ticket_number}</p>
                    <p>Pedido: {scanResult.ticket.reservation_number}</p>
                    {scanResult.type === 'already_used' && scanResult.ticket.checkin_at && (
                      <p className="text-yellow-600 font-medium mt-1">
                        Check-in anterior: {format(new Date(scanResult.ticket.checkin_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={resetScan} className="w-full gap-2" size="lg">
                <RefreshCw className="h-4 w-4" />
                Ler Próximo Ticket
              </Button>
            </CardContent>
          </Card>
        )}

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
