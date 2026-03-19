import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AIInsightsCardProps {
  metrics: {
    totalSessions: number;
    uniqueVisitors: number;
    totalPageviews: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
  };
  sessionsPerDay: any[];
  conversionByDevice: any[];
  topPages: any[];
  dateRange: { start: Date; end: Date };
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  metrics,
  sessionsPerDay,
  conversionByDevice,
  topPages,
  dateRange
}) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = () => {
    setLoading(true);
    const newInsights: string[] = [];
    const periodDays = differenceInDays(dateRange.end, dateRange.start) + 1;

    // Sessions analysis
    if (metrics.totalSessions > 0) {
      const avgSessionsPerDay = metrics.totalSessions / periodDays;
      newInsights.push(
        `📊 Foram registradas ${metrics.totalSessions.toLocaleString('pt-BR')} sessões no período, com média de ${avgSessionsPerDay.toFixed(1)} sessões por dia.`
      );
    }

    // Peak days analysis
    if (sessionsPerDay.length > 0) {
      const maxSessions = Math.max(...sessionsPerDay.map(d => d.sessões));
      const peakDay = sessionsPerDay.find(d => d.sessões === maxSessions);
      if (peakDay && maxSessions > 0) {
        newInsights.push(
          `📈 O dia com maior pico de acessos foi ${peakDay.date} com ${maxSessions} sessões.`
        );
      }
    }

    // Bounce rate analysis
    if (metrics.bounceRate > 50) {
      newInsights.push(
        `⚠️ A taxa de rejeição está em ${metrics.bounceRate.toFixed(1)}%, acima da média recomendada de 50%. Considere melhorar o conteúdo das páginas de entrada.`
      );
    } else if (metrics.bounceRate > 0) {
      newInsights.push(
        `✅ A taxa de rejeição de ${metrics.bounceRate.toFixed(1)}% está dentro de padrões saudáveis, indicando engajamento positivo dos visitantes.`
      );
    }

    // Conversion analysis
    if (metrics.conversionRate > 0) {
      if (metrics.conversionRate > 3) {
        newInsights.push(
          `🎯 Excelente taxa de conversão de ${metrics.conversionRate.toFixed(1)}%! O site está convertendo bem os visitantes em ações.`
        );
      } else if (metrics.conversionRate > 1) {
        newInsights.push(
          `🎯 Taxa de conversão de ${metrics.conversionRate.toFixed(1)}% está na média. Há oportunidade para otimização.`
        );
      } else {
        newInsights.push(
          `⚡ Taxa de conversão de ${metrics.conversionRate.toFixed(1)}% pode ser melhorada. Revise CTAs e fluxo de conversão.`
        );
      }
    }

    // Device analysis
    if (conversionByDevice.length > 0) {
      const mobileData = conversionByDevice.find(d => d.device === 'Mobile');
      const desktopData = conversionByDevice.find(d => d.device === 'Desktop');
      
      if (mobileData && desktopData) {
        const mobileRate = mobileData['taxa de conversão'];
        const desktopRate = desktopData['taxa de conversão'];
        
        if (mobileRate < desktopRate * 0.7 && mobileRate < desktopRate) {
          newInsights.push(
            `📱 Mobile converte ${((1 - mobileRate / desktopRate) * 100).toFixed(0)}% menos que Desktop. Revise a experiência mobile.`
          );
        }
      }
    }

    // Top pages analysis
    if (topPages.length > 0) {
      const topPage = topPages[0];
      newInsights.push(
        `🏆 A página mais acessada foi "${topPage.página}" com ${topPage.visualizações} visualizações.`
      );
    }

    // Duration analysis
    const avgMinutes = metrics.avgSessionDuration / 60;
    if (avgMinutes > 0) {
      if (avgMinutes > 3) {
        newInsights.push(
          `⏱️ Tempo médio de ${avgMinutes.toFixed(1)} minutos por sessão indica alto engajamento com o conteúdo.`
        );
      } else if (avgMinutes > 1) {
        newInsights.push(
          `⏱️ Duração média de ${avgMinutes.toFixed(1)} minutos. Conteúdo mais envolvente pode aumentar esse tempo.`
        );
      }
    }

    setInsights(newInsights);
    setLoading(false);
  };

  useEffect(() => {
    generateInsights();
  }, [metrics, sessionsPerDay, conversionByDevice, topPages]);

  if (metrics.totalSessions === 0) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Análise Automática do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não há dados suficientes no período selecionado para gerar insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            <span>Insights da IA</span>
            <Sparkles className="h-3 w-3 text-yellow-500" />
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={generateInsights}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <p key={index} className="text-sm text-foreground/90 leading-relaxed">
              {insight}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInsightsCard;
