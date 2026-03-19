import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Calendar,
  MapPin,
  Plus,
  X,
  Info,
} from 'lucide-react';
import { useLandingPageTours } from '@/hooks/useLandingPages';
import { useTours } from '@/hooks/useTours';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ToursSelectorProps {
  pageId: string;
}

export const ToursSelector: React.FC<ToursSelectorProps> = ({ pageId }) => {
  const { pageTours, loading: loadingPageTours, addTour, removeTour } = useLandingPageTours(pageId);
  const { tours, loading: loadingTours } = useTours();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const selectedTourIds = useMemo(() => 
    new Set(pageTours.map(pt => pt.tour_id)), 
    [pageTours]
  );

  const filteredTours = useMemo(() => {
    let filtered = tours;

    if (showOnlyActive) {
      filtered = filtered.filter(t => t.is_active);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.city?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => 
      new Date(a.start_date + 'T12:00:00').getTime() - new Date(b.start_date + 'T12:00:00').getTime()
    );
  }, [tours, searchQuery, showOnlyActive]);

  const selectedTours = useMemo(() => 
    tours.filter(t => selectedTourIds.has(t.id)),
    [tours, selectedTourIds]
  );

  const handleToggleTour = (tourId: string, isSelected: boolean) => {
    if (isSelected) {
      removeTour(tourId);
    } else {
      addTour(tourId);
    }
  };

  const loading = loadingPageTours || loadingTours;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Tours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Passeios Selecionados
            <Badge variant="secondary">{selectedTours.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTours.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum passeio selecionado manualmente.</p>
              <p className="text-sm mt-1">
                Selecione passeios abaixo ou use tags de filtro nas regiões.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTours.map((tour) => (
                <Badge 
                  key={tour.id} 
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {tour.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={() => removeTour(tour.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tour Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os Passeios</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar passeios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-active"
                checked={showOnlyActive}
                onCheckedChange={(checked) => setShowOnlyActive(checked as boolean)}
              />
              <label htmlFor="show-active" className="text-sm cursor-pointer">
                Apenas ativos
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTours.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhum passeio encontrado
              </p>
            ) : (
              filteredTours.map((tour) => {
                const isSelected = selectedTourIds.has(tour.id);
                return (
                  <div
                    key={tour.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/5 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggleTour(tour.id, isSelected)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTour(tour.id, isSelected)}
                    />
                    
                    {tour.image_url && (
                      <img
                        src={tour.image_url}
                        alt={tour.name}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tour.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tour.city}, {tour.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(tour.start_date + 'T12:00:00'), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!tour.is_active && (
                        <Badge variant="outline" className="text-xs">Inativo</Badge>
                      )}
                      {tour.etiqueta && (
                        <Badge variant="secondary" className="text-xs">{tour.etiqueta}</Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
