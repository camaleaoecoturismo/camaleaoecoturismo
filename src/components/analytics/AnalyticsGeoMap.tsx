import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Globe, Building2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import AnalyticsFilters, { AnalyticsFiltersState } from './AnalyticsFilters';

const BRAZIL_GEO_URL =
  'https://cdn.jsdelivr.net/gh/codeforamerica/click_that_hood@master/public/data/brazil-states.geojson';

function normalizeStr(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface GeoRow {
  country: string | null;
  state: string | null;
  city: string | null;
}

interface GeoData {
  stateCounts: Record<string, number>;
  stateLabels: Record<string, string>;
  cityCounts: Array<{ city: string; state: string; count: number }>;
  topCountry: { name: string; count: number } | null;
  topState: { name: string; count: number } | null;
  topCity: { name: string; count: number } | null;
  totalSessions: number;
}

const AnalyticsGeoMap: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    deviceType: 'all',
    campaign: 'all',
    pagePath: 'all',
  });
  const [geoData, setGeoData] = useState<GeoData>({
    stateCounts: {},
    stateLabels: {},
    cityCounts: [],
    topCountry: null,
    topState: null,
    topCity: null,
    totalSessions: 0,
  });
  const [geoJson, setGeoJson] = useState<object | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const [maxCount, setMaxCount] = useState(1);

  // Load Brazil GeoJSON once
  useEffect(() => {
    fetch(BRAZIL_GEO_URL)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((data) => setGeoJson(data))
      .catch(() => setGeoError(true));
  }, []);

  const fetchGeoData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('analytics_sessions')
        .select('country, state, city')
        .gte('first_visit_at', filters.startDate.toISOString())
        .lte('first_visit_at', filters.endDate.toISOString())
        .not('country', 'is', null);

      if (filters.deviceType !== 'all') query = query.eq('device_type', filters.deviceType);
      if (filters.campaign !== 'all') query = query.eq('utm_campaign', filters.campaign);

      const { data } = await query;
      if (!data) return;

      const countryCounts: Record<string, number> = {};
      const stateCounts: Record<string, number> = {};
      const stateLabels: Record<string, string> = {};
      const cityMap: Record<string, { city: string; state: string; count: number }> = {};

      for (const row of data as GeoRow[]) {
        if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
        if (row.state) {
          const key = normalizeStr(row.state);
          stateCounts[key] = (stateCounts[key] || 0) + 1;
          stateLabels[key] = row.state;
        }
        if (row.city && row.state) {
          const key = `${row.city}||${row.state}`;
          if (!cityMap[key]) cityMap[key] = { city: row.city, state: row.state, count: 0 };
          cityMap[key].count += 1;
        }
      }

      const cityCounts = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 15);
      const max = Math.max(1, ...Object.values(stateCounts));
      setMaxCount(max);

      const topCountryEntry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
      const topStateEntry = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];
      const topCity = cityCounts[0] || null;

      setGeoData({
        stateCounts,
        stateLabels,
        cityCounts,
        topCountry: topCountryEntry ? { name: topCountryEntry[0], count: topCountryEntry[1] } : null,
        topState: topStateEntry
          ? { name: stateLabels[topStateEntry[0]] || topStateEntry[0], count: topStateEntry[1] }
          : null,
        topCity: topCity ? { name: topCity.city, count: topCity.count } : null,
        totalSessions: data.length,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchGeoData(); }, [fetchGeoData]);

  function getStateColor(featureName: string | undefined): string {
    const key = normalizeStr(featureName);
    const count = geoData.stateCounts[key] || 0;
    if (count === 0) return '#f0faf0';
    const intensity = Math.min(count / maxCount, 1);
    const r = Math.round(200 - intensity * 173);
    const g = Math.round(230 - intensity * 136);
    const b = Math.round(201 - intensity * 169);
    return `rgb(${r},${g},${b})`;
  }

  const summaryCards = [
    {
      label: 'País mais frequente',
      value: geoData.topCountry?.name || '—',
      sub: geoData.topCountry ? `${geoData.topCountry.count} sessões` : '',
      icon: Globe,
    },
    {
      label: 'Estado mais frequente',
      value: geoData.topState?.name || '—',
      sub: geoData.topState ? `${geoData.topState.count} sessões` : '',
      icon: MapPin,
    },
    {
      label: 'Cidade mais frequente',
      value: geoData.topCity?.name || '—',
      sub: geoData.topCity ? `${geoData.topCity.count} sessões` : '',
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AnalyticsFilters filters={filters} onFiltersChange={setFilters} />
        <Button variant="outline" size="sm" onClick={fetchGeoData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold leading-tight">{card.value}</p>
                  {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Acessos por Estado — Brasil
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {geoError ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Globe className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Não foi possível carregar o mapa.</p>
            </div>
          ) : geoData.totalSessions === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado geográfico encontrado no período.</p>
              <p className="text-xs mt-1 opacity-70">Os dados de localização serão coletados nas próximas sessões.</p>
            </div>
          ) : geoJson ? (
            <div className="relative">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 700, center: [-54, -15] }}
                style={{ width: '100%', height: 'auto' }}
                viewBox="0 0 800 600"
              >
                <Geographies geography={geoJson}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const stateName: string = geo.properties?.name || '';
                      const count = geoData.stateCounts[normalizeStr(stateName)] || 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getStateColor(stateName)}
                          stroke="#ffffff"
                          strokeWidth={0.6}
                          style={{
                            default: { outline: 'none', cursor: 'pointer', transition: 'fill 0.2s' },
                            hover: { fill: '#4caf50', outline: 'none' },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={(evt) =>
                            setTooltip({ name: stateName, count, x: evt.clientX, y: evt.clientY })
                          }
                          onMouseMove={(evt) =>
                            setTooltip((prev) => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null)
                          }
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
                  style={{ left: tooltip.x + 14, top: tooltip.y - 44 }}
                >
                  <p className="font-semibold">{tooltip.name}</p>
                  <p className="text-gray-300">{tooltip.count} {tooltip.count === 1 ? 'sessão' : 'sessões'}</p>
                </div>
              )}

              {/* Legend */}
              <div className="mt-3 flex items-center gap-2 justify-end">
                <span className="text-[10px] text-muted-foreground">Menos</span>
                <div className="flex rounded overflow-hidden">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => {
                    const r = Math.round(200 - i * 173);
                    const g = Math.round(230 - i * 136);
                    const b = Math.round(201 - i * 169);
                    return <div key={i} className="w-7 h-3" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />;
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground">Mais acessos</span>
              </div>
            </div>
          ) : (
            // GeoJSON still loading
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top cities table */}
      {geoData.cityCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top Cidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Cidade</th>
                    <th className="text-left py-2 pr-4">Estado</th>
                    <th className="text-right py-2 pr-4">Sessões</th>
                    <th className="text-right py-2">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {geoData.cityCounts.map((row, idx) => (
                    <tr
                      key={`${row.city}-${row.state}`}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 pr-4 font-medium">{row.city}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.state}</td>
                      <td className="py-2 pr-4 text-right">{row.count}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {geoData.totalSessions > 0
                          ? `${((row.count / geoData.totalSessions) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsGeoMap;
