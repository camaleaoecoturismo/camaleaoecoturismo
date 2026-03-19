import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tours, commemorativeDates, opportunities, year, analysisType, selectedMonth, selectedTourIds } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Filter tours based on analysis type
    let filteredTours = tours;
    let contextLabel = `calendário de viagens para ${year}`;

    if (analysisType === 'month' && selectedMonth) {
      filteredTours = tours.filter((t: any) => {
        const startMonth = t.data_passeio?.slice(0, 7);
        return startMonth === selectedMonth;
      });
      const monthNames: Record<string, string> = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
      };
      const [y, m] = selectedMonth.split('-');
      contextLabel = `mês de ${monthNames[m]} ${y}`;
    } else if (analysisType === 'tour' && selectedTourIds?.length === 1) {
      filteredTours = tours.filter((t: any) => selectedTourIds.includes(t.id));
      contextLabel = `viagem "${filteredTours[0]?.nome || 'selecionada'}"`;
    } else if (analysisType === 'comparison' && selectedTourIds?.length >= 2) {
      filteredTours = tours.filter((t: any) => selectedTourIds.includes(t.id));
      contextLabel = `comparação entre ${filteredTours.length} viagens`;
    }

    // Calculate statistics
    const totalTours = filteredTours.length;
    const activeTours = filteredTours.filter((t: any) => t.ativo).length;
    const exclusiveTours = filteredTours.filter((t: any) => t.isExclusive).length;
    const featuredTours = filteredTours.filter((t: any) => t.isFeatured).length;
    
    const tourDates = new Set<string>();
    const monthCounts: Record<string, number> = {};
    const dayOfWeekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const tourNameCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    
    filteredTours.forEach((tour: any) => {
      const startDate = new Date(tour.data_passeio);
      const endDate = tour.data_fim ? new Date(tour.data_fim) : startDate;
      
      const current = new Date(startDate);
      while (current <= endDate) {
        tourDates.add(current.toISOString().split('T')[0]);
        dayOfWeekCounts[current.getDay()]++;
        current.setDate(current.getDate() + 1);
      }
      
      const month = startDate.toISOString().slice(0, 7);
      monthCounts[month] = (monthCounts[month] || 0) + 1;
      
      const baseName = tour.nome.replace(/\s*\d{4}.*$/, '').trim();
      tourNameCounts[baseName] = (tourNameCounts[baseName] || 0) + 1;
      
      if (tour.cidade) {
        cityCounts[tour.cidade] = (cityCounts[tour.cidade] || 0) + 1;
      }
    });

    const repeatedTours = Object.entries(tourNameCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    const sortedMonths = Object.entries(monthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const sortedDays = Object.entries(dayOfWeekCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([day, count]) => ({ day: dayNames[parseInt(day)], count }));

    const occupiedDays = tourDates.size;
    const freeDays = 365 - occupiedDays;
    const occupancyRate = ((occupiedDays / 365) * 100).toFixed(1);

    const analysisData = {
      year,
      analysisType: analysisType || 'year',
      totalTours,
      activeTours,
      exclusiveTours,
      featuredTours,
      occupiedDays,
      freeDays,
      occupancyRate,
      commemorativeDatesCount: commemorativeDates.length,
      opportunitiesCount: opportunities.length,
      repeatedTours: repeatedTours.slice(0, 5),
      topMonths: sortedMonths,
      topDays: sortedDays.slice(0, 3),
      topCities: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };

    // Build prompt based on analysis type
    let systemPrompt = '';
    let userPrompt = '';

    const baseStats = `
📊 ESTATÍSTICAS:
- Total de passeios: ${totalTours}
- Passeios ativos: ${activeTours}
- Passeios exclusivos: ${exclusiveTours}
- Passeios em destaque: ${featuredTours}
- Dias ocupados: ${occupiedDays}

📆 DIAS DA SEMANA MAIS POPULARES:
${sortedDays.slice(0, 3).map(d => `- ${d.day}: ${d.count} dias de viagem`).join('\n')}

🏙️ CIDADES:
${Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => `- ${city}: ${count} viagens`).join('\n') || '- Dados não disponíveis'}`;

    if (analysisType === 'month') {
      systemPrompt = `Você é um analista especializado em turismo. Analise os dados de um mês específico e forneça insights táticos em português brasileiro.
Foque em: ocupação do mês, tipos de passeio, sugestões para melhorar o mês, comparação implícita com a média anual.
Responda em Markdown conciso. Máximo 350 palavras.`;
      
      userPrompt = `Analise os dados do ${contextLabel}:
${baseStats}

📅 PASSEIOS DO MÊS:
${filteredTours.map((t: any) => `- ${t.nome} (${t.data_passeio}${t.data_fim ? ' a ' + t.data_fim : ''}) ${t.ativo ? '✅' : '❌'} ${t.cidade || ''}`).join('\n')}

Forneça análise tática com sugestões para otimizar este mês.`;

    } else if (analysisType === 'tour') {
      const tour = filteredTours[0];
      systemPrompt = `Você é um consultor especializado em turismo de aventura. Analise detalhadamente uma viagem específica e forneça um diagnóstico completo em português brasileiro.
Foque em: posicionamento, frequência, sazonalidade, potencial de crescimento, sugestões operacionais.
Responda em Markdown conciso. Máximo 400 palavras.`;
      
      // Get all instances of this tour name across the year
      const baseName = tour?.nome?.replace(/\s*\d{4}.*$/, '').trim();
      const allInstances = tours.filter((t: any) => t.nome.replace(/\s*\d{4}.*$/, '').trim() === baseName);
      
      userPrompt = `Analise a viagem "${tour?.nome}":

📋 DADOS DA VIAGEM:
- Nome: ${tour?.nome}
- Cidade: ${tour?.cidade || 'N/A'}
- Data: ${tour?.data_passeio}${tour?.data_fim ? ' a ' + tour.data_fim : ''}
- Status: ${tour?.ativo ? 'Ativo' : 'Inativo'}
- Exclusivo: ${tour?.isExclusive ? 'Sim' : 'Não'}
- Destaque: ${tour?.isFeatured ? 'Sim' : 'Não'}

🔄 RECORRÊNCIA NO ANO:
- Este destino aparece ${allInstances.length}x no calendário de ${year}
${allInstances.map((t: any) => `  - ${t.nome}: ${t.data_passeio}`).join('\n')}

Forneça um diagnóstico completo com recomendações estratégicas.`;

    } else if (analysisType === 'comparison') {
      systemPrompt = `Você é um analista comparativo especializado em turismo. Compare as viagens fornecidas lado a lado em português brasileiro.
Foque em: diferenças de posicionamento, sazonalidade, público-alvo potencial, qual se destaca e por quê, sugestões cruzadas.
Use tabelas markdown quando possível. Máximo 500 palavras.`;
      
      userPrompt = `Compare estas ${filteredTours.length} viagens:

${filteredTours.map((t: any, i: number) => `
### Viagem ${i + 1}: ${t.nome}
- Cidade: ${t.cidade || 'N/A'}
- Data: ${t.data_passeio}${t.data_fim ? ' a ' + t.data_fim : ''}
- Status: ${t.ativo ? 'Ativo' : 'Inativo'}
- Exclusivo: ${t.isExclusive ? 'Sim' : 'Não'}
- Destaque: ${t.isFeatured ? 'Sim' : 'Não'}
- Recorrência no ano: ${tours.filter((tt: any) => tt.nome.replace(/\s*\d{4}.*$/, '').trim() === t.nome.replace(/\s*\d{4}.*$/, '').trim()).length}x`).join('\n')}

Forneça uma análise comparativa detalhada com recomendações.`;

    } else {
      // Default: year analysis
      systemPrompt = `Você é um analista especializado em turismo e planejamento de viagens. 
Analise os dados do calendário de viagens e forneça insights estratégicos em português brasileiro.
Seja conciso, use bullet points, e foque em:
1. Padrões identificados
2. Oportunidades de melhoria
3. Sugestões de otimização
4. Alertas importantes

Responda em formato Markdown com seções claras. Máximo 400 palavras.`;

      userPrompt = `Analise estes dados do ${contextLabel}:
${baseStats}

- Dias livres: ${freeDays}
- Taxa de ocupação: ${occupancyRate}%
- Feriados cadastrados: ${commemorativeDates.length}
- Oportunidades identificadas: ${opportunities.length}

📅 MESES MAIS VIAJADOS:
${sortedMonths.map(([month, count]) => `- ${month}: ${count} viagens`).join('\n')}

🔄 PASSEIOS QUE SE REPETEM:
${repeatedTours.length > 0 ? repeatedTours.slice(0, 5).map(([name, count]) => `- ${name}: ${count}x`).join('\n') : '- Nenhum passeio repetido encontrado'}

Forneça uma análise estratégica com insights acionáveis.`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para IA. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices?.[0]?.message?.content || "Análise não disponível";

    return new Response(
      JSON.stringify({
        statistics: analysisData,
        aiAnalysis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-calendar-dates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
