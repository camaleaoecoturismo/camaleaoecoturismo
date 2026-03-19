import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, Home, RefreshCw, MessageCircle } from 'lucide-react';
import logoImage from "@/assets/logo.png";

export default function ReservaFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reservaId = searchParams.get('reserva');

  const handleContactWhatsApp = () => {
    const message = `Olá! Tive um problema com meu pagamento. Reserva: ${reservaId || 'não informado'}`;
    const whatsappURL = `https://wa.me/5582993649454?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#8d00da' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src={logoImage} alt="Camaleão Ecoturismo" className="h-10 mx-auto mb-4" />
        </div>

        <Card className="bg-white">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Pagamento não Aprovado
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Infelizmente seu pagamento não foi processado. Isso pode acontecer por diversos motivos.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium mb-2">Possíveis motivos:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Saldo insuficiente</li>
                <li>• Cartão recusado pelo banco</li>
                <li>• Dados do cartão incorretos</li>
                <li>• Limite de crédito atingido</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate(-1)}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              
              <Button
                variant="outline"
                onClick={handleContactWhatsApp}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com Suporte
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}