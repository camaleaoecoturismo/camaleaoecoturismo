import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, Mail, MailOpen, Info, Tag, AlertCircle, Megaphone, Loader2, Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientCommunicationsProps {
  clientAccountId: string;
}

interface Communication {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  info: { icon: Info, color: 'blue', label: 'Informação' },
  promo: { icon: Tag, color: 'green', label: 'Promoção' },
  reminder: { icon: Bell, color: 'amber', label: 'Lembrete' },
  alert: { icon: AlertCircle, color: 'red', label: 'Alerta' }
};

const ClientCommunications = ({ clientAccountId }: ClientCommunicationsProps) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchCommunications();
  }, [clientAccountId]);

  const fetchCommunications = async () => {
    const { data, error } = await supabase
      .from('client_communications')
      .select('*')
      .eq('client_account_id', clientAccountId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCommunications(data);
      setUnreadCount(data.filter(c => !c.is_read).length);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('client_communications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setCommunications(prev => 
        prev.map(c => c.id === id ? { ...c, is_read: true } : c)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = communications.filter(c => !c.is_read).map(c => c.id);
    
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('client_communications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setCommunications(prev => prev.map(c => ({ ...c, is_read: true })));
      setUnreadCount(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Comunicações
              {unreadCount > 0 && (
                <Badge className="bg-red-500">{unreadCount}</Badge>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <MailOpen className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhuma comunicação</p>
              <p className="text-sm">Você receberá aqui novidades, promoções e lembretes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map(comm => {
                const config = typeConfig[comm.type] || typeConfig.info;
                const IconComponent = config.icon;
                
                return (
                  <div 
                    key={comm.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      comm.is_read ? 'bg-muted/30' : 'bg-white border-l-4'
                    }`}
                    style={!comm.is_read ? { borderLeftColor: `var(--${config.color}-500)` } : {}}
                    onClick={() => !comm.is_read && markAsRead(comm.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-${config.color}-100`}>
                        <IconComponent className={`w-4 h-4 text-${config.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-semibold ${comm.is_read ? 'text-muted-foreground' : ''}`}>
                            {comm.title}
                          </p>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {config.label}
                          </Badge>
                          {!comm.is_read && (
                            <Badge className="bg-primary text-xs">Nova</Badge>
                          )}
                        </div>
                        <p className={`text-sm ${comm.is_read ? 'text-muted-foreground' : ''}`}>
                          {comm.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(comm.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {!comm.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientCommunications;
