import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Home, MessageCircle } from 'lucide-react';
import logoImage from "@/assets/logo.png";

export default function ReservaPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reservaId = searchParams.get('reserva');

  const handleContactWhatsApp = () => {
    const message = `Olá! Fiz um pagamento e está pendente. Reserva: ${reservaId || 'não informado'}`;
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
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-12 w-12 text-yellow-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Pagamento Pendente
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Seu pagamento está sendo processado. Isso pode levar alguns minutos.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>PIX:</strong> Se você pagou via PIX, o pagamento será confirmado automaticamente em alguns instantes.
              </p>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Você receberá uma confirmação por e-mail assim que o pagamento for aprovado.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleContactWhatsApp}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com Suporte
              </Button>

              <Button
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