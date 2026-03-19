import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Calendar, Lightbulb, BarChart3 } from 'lucide-react';
import { ContentPost, ContentIdea, FORMAT_CONFIG, OBJECTIVE_CONFIG, POST_STATUS_CONFIG, IDEA_STATUS_CONFIG } from './types';

interface ContentDashboardProps {
  stats: {
    byFormat: Record<string, number>;
    byObjective: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
    scheduled: number;
    unscheduled: number;
  };
  alerts: string[];
  posts: ContentPost[];
  ideas: ContentIdea[];
}

const ContentDashboard: React.FC<ContentDashboardProps> = ({
  stats,
  alerts,
  posts,
  ideas,
}) => {
  const totalFormat = Object.values(stats.byFormat).reduce((a, b) => a + b, 0);
  const totalObjective = Object.values(stats.byObjective).reduce((a, b) => a + b, 0);

  // Get upcoming posts (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingPosts = posts.filter(p => {
    if (!p.data_publicacao) return false;
    const postDate = new Date(p.data_publicacao);
    return postDate >= today && postDate <= nextWeek;
  }).slice(0, 5);

  // Get ready ideas
  const readyIdeas = ideas.filter(i => i.status === 'pronta').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Atenção</AlertTitle>
              <AlertDescription className="text-yellow-700">{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Postagens</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-3xl font-bold">{stats.scheduled}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Data</p>
                <p className="text-3xl font-bold">{stats.unscheduled}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ideias Prontas</p>
                <p className="text-3xl font-bold">{ideas.filter(i => i.status === 'pronta').length}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-yellow-400 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição por Formato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(FORMAT_CONFIG).map(([key, config]) => {
              const count = stats.byFormat[key] || 0;
              const percent = totalFormat > 0 ? (count / totalFormat) * 100 : 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      {config.label}
                    </span>
                    <span className="font-medium">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By Objective */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuição por Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(OBJECTIVE_CONFIG).map(([key, config]) => {
              const count = stats.byObjective[key] || 0;
              const percent = totalObjective > 0 ? (count / totalObjective) * 100 : 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={config.color}>{config.label}</span>
                    <span className="font-medium">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Postagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length > 0 ? (
              <div className="space-y-3">
                {upcomingPosts.map(post => {
                  const formatConfig = FORMAT_CONFIG[post.formato];
                  const statusConfig = POST_STATUS_CONFIG[post.status];

                  return (
                    <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <span className="text-xl">{formatConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.tema}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.data_publicacao && new Date(post.data_publicacao).toLocaleDateString('pt-BR')}
                          {post.horario && ` às ${post.horario.slice(0, 5)}`}
                        </p>
                      </div>
                      <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-xs`}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma postagem nos próximos 7 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ready Ideas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Ideias Prontas para Usar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readyIdeas.length > 0 ? (
              <div className="space-y-3">
                {readyIdeas.map(idea => {
                  const formatConfig = FORMAT_CONFIG[idea.formato];
                  const objectiveConfig = OBJECTIVE_CONFIG[idea.objetivo];

                  return (
                    <div key={idea.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <span className="text-xl">{formatConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{idea.tema}</p>
                        {idea.gancho && (
                          <p className="text-xs text-muted-foreground italic truncate">"{idea.gancho}"</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`${objectiveConfig.color} text-xs`}>
                        {objectiveConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma ideia pronta para usar
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Postagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(POST_STATUS_CONFIG).map(([key, config]) => {
              const count = stats.byStatus[key] || 0;
              return (
                <div key={key} className={`px-4 py-3 rounded-lg ${config.bgColor} flex-1 min-w-[120px]`}>
                  <p className={`font-bold text-2xl ${config.color}`}>{count}</p>
                  <p className={`text-sm ${config.color}`}>{config.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentDashboard;
