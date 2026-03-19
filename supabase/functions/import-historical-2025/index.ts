import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dados EXATOS do PDF Historico_melhor.pdf - 49 trilhas
// Formato: start_date -> { faturamento, gastos_viagem, clientes }
const tourFinancialData: Record<string, { faturamento: number; gastos_viagem: number; clientes: number }> = {
  // JANEIRO (3 trilhas)
  '2025-01-06': { faturamento: 9000.00, gastos_viagem: 5455.68, clientes: 42 },      // 1. Trilha do Cacau (Giseng)
  '2025-01-18': { faturamento: 7410.00, gastos_viagem: 3648.00, clientes: 46 },      // 2. Trilha do Lago Azul
  '2025-01-26': { faturamento: 9036.50, gastos_viagem: 5665.84, clientes: 46 },      // 3. Trilha da Fazenda Guadalupe
  
  // FEVEREIRO (4 trilhas)
  '2025-02-09': { faturamento: 8420.00, gastos_viagem: 5348.64, clientes: 41 },      // 4. Trilha do Cacau
  '2025-02-15': { faturamento: 6930.00, gastos_viagem: 4519.08, clientes: 24 },      // 5. Trilha das Cachoeiras de Bonito
  '2025-02-22': { faturamento: 2058.00, gastos_viagem: 1061.36, clientes: 15 },      // 7. Cachoeira da Tiririca (Petrosynergy)
  '2025-02-28': { faturamento: 86480.50, gastos_viagem: 68418.60, clientes: 46 },    // 6. Chapada Diamantina
  
  // MARÇO (3 trilhas)
  '2025-03-16': { faturamento: 7565.00, gastos_viagem: 4758.44, clientes: 36 },      // 8. Cachoeiras do Paraíso
  '2025-03-21': { faturamento: 16452.50, gastos_viagem: 13188.32, clientes: 29 },    // 9. Vale do Catimbau
  '2025-03-29': { faturamento: 3060.00, gastos_viagem: 3060.00, clientes: 18 },      // 10. Trilha do Lago Azul
  
  // ABRIL (7 trilhas)
  '2025-04-06': { faturamento: 3205.00, gastos_viagem: 1273.60, clientes: 15 },      // 11. Trilha de Flexeiras
  '2025-04-12': { faturamento: 6270.00, gastos_viagem: 4781.32, clientes: 33 },      // 13. Fazenda Guadalupe
  '2025-04-13': { faturamento: 2270.00, gastos_viagem: 1763.76, clientes: 19 },      // 15. Parque Prata (Jayanna)
  '2025-04-17': { faturamento: 106730.00, gastos_viagem: 84443.74, clientes: 57 },   // 12. Chapada Diamantina
  '2025-04-26': { faturamento: 12240.00, gastos_viagem: 8460.00, clientes: 98 },     // 14+16. Rio Gelado (Uniodonto) + Parque Prata (Sicredi)
  '2025-04-27': { faturamento: 0, gastos_viagem: 0, clientes: 0 },                   // 17. Passeio do Rio Gelado (cancelado)
  
  // MAIO (4 trilhas)
  '2025-05-04': { faturamento: 850.00, gastos_viagem: 850.00, clientes: 5 },         // 18. Parque Prata
  '2025-05-10': { faturamento: 3200.00, gastos_viagem: 2043.76, clientes: 44 },      // 19. Cachoeiras do Paraíso (Farofeiros)
  '2025-05-25': { faturamento: 7150.00, gastos_viagem: 4628.96, clientes: 0 },       // 20. Trilha do Cacau (0 clientes conforme PDF)
  '2025-05-31': { faturamento: 8689.50, gastos_viagem: 5259.28, clientes: 32 },      // 21. Passeio do Rio Gelado (EngenhARQ)
  
  // JUNHO (3 trilhas)
  '2025-06-08': { faturamento: 2000.00, gastos_viagem: 1840.00, clientes: 32 },      // 22. Trilha de Flexeiras (Cristiano)
  '2025-06-15': { faturamento: 24267.50, gastos_viagem: 24767.50, clientes: 14 },    // 23. Chapada Diamantina
  '2025-06-29': { faturamento: 0, gastos_viagem: 0, clientes: 0 },                   // 24. Passeio do Rio Gelado (cancelado)
  
  // JULHO (2 trilhas)
  '2025-07-19': { faturamento: 2180.00, gastos_viagem: 1566.32, clientes: 8 },       // 25. Passeio do Rio Gelado
  '2025-07-20': { faturamento: 4800.00, gastos_viagem: 3613.17, clientes: 31 },      // 26. Fazenda Guadalupe
  
  // AGOSTO (4 trilhas)
  '2025-08-17': { faturamento: 11199.10, gastos_viagem: 9139.16, clientes: 29 },     // 27. Trilha dos Túneis
  '2025-08-23': { faturamento: 2962.00, gastos_viagem: 2378.76, clientes: 19 },      // 28. Trilha da Mata Verde
  '2025-08-24': { faturamento: 3220.00, gastos_viagem: 2010.00, clientes: 30 },      // 29. Trilha de Flexeiras (Grupo fechado)
  '2025-08-30': { faturamento: 12283.05, gastos_viagem: 8378.36, clientes: 20 },     // 30. Vale do Catimbau
  
  // SETEMBRO (5 trilhas)
  '2025-09-12': { faturamento: 86159.67, gastos_viagem: 65243.41, clientes: 46 },    // 31. Chapada Diamantina
  '2025-09-20': { faturamento: 7730.00, gastos_viagem: 5692.52, clientes: 42 },      // 32+33. Cachoeiras de Bonito + Rio Gelado (Petrosynergy)
  '2025-09-21': { faturamento: 5900.00, gastos_viagem: 3423.20, clientes: 30 },      // 34. Trilha de Flexeiras
  '2025-09-27': { faturamento: 898.00, gastos_viagem: 898.00, clientes: 2 },         // 35. Camping de Jequiá
  
  // OUTUBRO (5 trilhas)
  '2025-10-05': { faturamento: 8972.00, gastos_viagem: 5747.72, clientes: 43 },      // 36. Trilha do Cacau
  '2025-10-18': { faturamento: 3898.00, gastos_viagem: 3661.00, clientes: 25 },      // 37. Fazenda Guadalupe
  '2025-10-19': { faturamento: 3777.00, gastos_viagem: 2903.64, clientes: 19 },      // 38. Cachoeiras do Paraíso
  '2025-10-25': { faturamento: 20280.00, gastos_viagem: 14651.10, clientes: 72 },    // 39+40. Cânions + Fazenda Guadalupe (Sicredi)
  
  // NOVEMBRO (5 trilhas)
  '2025-11-09': { faturamento: 7258.00, gastos_viagem: 4059.32, clientes: 33 },      // 41. Trilha Cachoeira da Tiririca
  '2025-11-15': { faturamento: 17016.00, gastos_viagem: 10760.32, clientes: 29 },    // 42. Vale do Catimbau
  '2025-11-22': { faturamento: 2127.50, gastos_viagem: 2150.12, clientes: 14 },      // 43. Trilha do Rio São Miguel
  '2025-11-23': { faturamento: 12311.00, gastos_viagem: 9450.15, clientes: 29 },     // 44. Trilha dos Túneis
  '2025-11-29': { faturamento: 8060.00, gastos_viagem: 5765.40, clientes: 60 },      // 45. Fazenda Guadalupe (Quartier)
  
  // DEZEMBRO (4 trilhas)
  '2025-12-06': { faturamento: 8584.00, gastos_viagem: 6514.00, clientes: 50 },      // 46. Fazenda Guadalupe
  '2025-12-13': { faturamento: 8890.00, gastos_viagem: 4971.20, clientes: 30 },      // 47. Trilha das Cachoeiras de Bonito
  '2025-12-14': { faturamento: 10406.00, gastos_viagem: 7532.00, clientes: 68 },     // 48. Passeio do Rio Gelado (Sylvia Pereira)
  '2025-12-27': { faturamento: 180518.25, gastos_viagem: 149273.56, clientes: 100 }, // 49. Chapada Diamantina - Réveillon
};

// Manutenção mensal estimada (distribuição proporcional ao movimento)
const monthlyMaintenance: Record<string, number> = {
  '01': 1000.00,
  '02': 1500.00,
  '03': 1000.00,
  '04': 2000.00,
  '05': 1000.00,
  '06': 1000.00,
  '07': 800.00,
  '08': 1500.00,
  '09': 2000.00,
  '10': 1500.00,
  '11': 1500.00,
  '12': 3000.00,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando importação de Historico_2025-2.pdf...');

    const results = {
      reservasAtualizadas: 0,
      reservasCriadas: 0,
      custosAtualizados: 0,
      custosCriados: 0,
      manutencaoAtualizada: 0,
      errors: [] as string[],
    };

    // 1. Buscar todos os tours de 2025
    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('id, name, start_date')
      .gte('start_date', '2025-01-01')
      .lt('start_date', '2026-01-01');

    if (toursError) throw toursError;

    console.log(`Encontrados ${tours?.length || 0} tours de 2025`);

    // 2. Processar cada tour
    for (const tour of tours || []) {
      const dateKey = tour.start_date.split('T')[0];
      const financialData = tourFinancialData[dateKey];

      if (!financialData) {
        console.log(`Sem dados para tour ${tour.name} (${dateKey})`);
        continue;
      }

      // 2a. Verificar se já existe reserva histórica
      const { data: existingReserva } = await supabase
        .from('reservas')
        .select('id')
        .eq('tour_id', tour.id)
        .eq('capture_method', 'historico')
        .maybeSingle();

      if (existingReserva) {
        // Atualizar reserva existente
        const { error: updateError } = await supabase
          .from('reservas')
          .update({
            valor_pago: financialData.faturamento,
            valor_passeio: financialData.faturamento,
            valor_total_com_opcionais: financialData.faturamento,
            numero_participantes: financialData.clientes || 1,
          })
          .eq('id', existingReserva.id);

        if (updateError) {
          results.errors.push(`Erro atualizando reserva ${tour.name}: ${updateError.message}`);
        } else {
          console.log(`✓ Reserva atualizada: ${tour.name} - R$ ${financialData.faturamento}`);
          results.reservasAtualizadas++;
        }
      } else if (financialData.faturamento > 0) {
        // Criar nova reserva histórica
        let { data: ponto } = await supabase
          .from('tour_boarding_points')
          .select('id')
          .eq('tour_id', tour.id)
          .limit(1)
          .maybeSingle();

        if (!ponto) {
          const { data: newPonto, error: pontoError } = await supabase
            .from('tour_boarding_points')
            .insert({ tour_id: tour.id, nome: 'Histórico', order_index: 0 })
            .select('id')
            .single();
          if (pontoError) {
            results.errors.push(`Erro criando ponto para ${tour.name}: ${pontoError.message}`);
            continue;
          }
          ponto = newPonto;
        }

        // Criar cliente genérico
        const cpf = `999${dateKey.replace(/-/g, '')}`;
        
        let { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .eq('cpf', cpf)
          .maybeSingle();

        if (!cliente) {
          const { data: newCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert({
              nome_completo: `Histórico - ${tour.name}`,
              cpf,
              email: `hist-${cpf}@camaleao.local`,
              whatsapp: '00000000000',
              data_nascimento: '1990-01-01',
            })
            .select('id')
            .single();

          if (clienteError) {
            results.errors.push(`Erro criando cliente para ${tour.name}: ${clienteError.message}`);
            continue;
          }
          cliente = newCliente;
        }

        // Criar reserva histórica
        const { error: reservaError } = await supabase
          .from('reservas')
          .insert({
            cliente_id: cliente.id,
            tour_id: tour.id,
            ponto_embarque_id: ponto.id,
            status: 'confirmado',
            payment_status: 'pago',
            payment_method: 'pix',
            valor_passeio: financialData.faturamento,
            valor_pago: financialData.faturamento,
            valor_total_com_opcionais: financialData.faturamento,
            numero_participantes: financialData.clientes || 1,
            data_pagamento: new Date(tour.start_date).toISOString(),
            data_confirmacao: new Date(tour.start_date).toISOString(),
            observacoes: `Histórico 2025 - ${financialData.clientes} participantes`,
            capture_method: 'historico',
            seen_by_admin: true,
          });

        if (reservaError) {
          results.errors.push(`Erro criando reserva para ${tour.name}: ${reservaError.message}`);
        } else {
          console.log(`✓ Reserva criada: ${tour.name} - R$ ${financialData.faturamento}`);
          results.reservasCriadas++;
        }
      }

      // 2b. Atualizar/criar tour_costs para gastos em viagem
      if (financialData.gastos_viagem > 0) {
        const { data: existingCost } = await supabase
          .from('tour_costs')
          .select('id')
          .eq('tour_id', tour.id)
          .eq('product_service', 'Gastos Viagem (Histórico)')
          .maybeSingle();

        if (existingCost) {
          const { error: updateCostError } = await supabase
            .from('tour_costs')
            .update({
              unit_value: financialData.gastos_viagem,
              valor_pago: financialData.gastos_viagem,
            })
            .eq('id', existingCost.id);

          if (updateCostError) {
            results.errors.push(`Erro atualizando custo ${tour.name}: ${updateCostError.message}`);
          } else {
            results.custosAtualizados++;
          }
        } else {
          const { error: insertCostError } = await supabase
            .from('tour_costs')
            .insert({
              tour_id: tour.id,
              product_service: 'Gastos Viagem (Histórico)',
              expense_type: 'viagem',
              quantity: 1,
              unit_value: financialData.gastos_viagem,
              valor_pago: financialData.gastos_viagem,
              order_index: 0,
              auto_scale_participants: false,
            });

          if (insertCostError) {
            results.errors.push(`Erro criando custo ${tour.name}: ${insertCostError.message}`);
          } else {
            console.log(`✓ Custo viagem criado: ${tour.name} - R$ ${financialData.gastos_viagem}`);
            results.custosCriados++;
          }
        }
      }
    }

    // 3. Atualizar custos mensais (manutenção)
    console.log('Atualizando custos de manutenção mensal...');
    
    for (const [month, value] of Object.entries(monthlyMaintenance)) {
      const { data: existing } = await supabase
        .from('monthly_general_costs')
        .select('id')
        .eq('year', 2025)
        .eq('month', month)
        .eq('expense_type', 'manutencao')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('monthly_general_costs')
          .update({ unit_value: value })
          .eq('id', existing.id);
        
        if (!error) results.manutencaoAtualizada++;
      } else {
        const { error } = await supabase
          .from('monthly_general_costs')
          .insert({
            year: 2025,
            month,
            expense_name: 'Manutenção e Investimentos',
            expense_type: 'manutencao',
            quantity: 1,
            unit_value: value,
            order_index: 0,
          });
        
        if (!error) results.manutencaoAtualizada++;
      }
    }

    // 4. Garantir pró-labore em todos os meses
    console.log('Verificando pró-labore mensal...');
    
    for (let m = 1; m <= 12; m++) {
      const month = String(m).padStart(2, '0');
      
      const { data: existing } = await supabase
        .from('monthly_general_costs')
        .select('id')
        .eq('year', 2025)
        .eq('month', month)
        .eq('expense_type', 'pro_labore')
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('monthly_general_costs')
          .insert({
            year: 2025,
            month,
            expense_name: 'Pró-labore',
            expense_type: 'pro_labore',
            quantity: 1,
            unit_value: 1518.00,
            order_index: 1,
          });
      }
    }

    // Calcular totais importados
    const { data: totalReservas } = await supabase
      .from('reservas')
      .select('valor_pago, numero_participantes')
      .eq('capture_method', 'historico');

    const totalFaturamento = totalReservas?.reduce((sum, r) => sum + (r.valor_pago || 0), 0) || 0;
    const totalClientes = totalReservas?.reduce((sum, r) => sum + (r.numero_participantes || 0), 0) || 0;

    const { data: totalCustos } = await supabase
      .from('tour_costs')
      .select('tour_id, unit_value')
      .eq('product_service', 'Gastos Viagem (Histórico)');

    const totalGastosViagem = totalCustos?.reduce((sum, c) => sum + (c.unit_value || 0), 0) || 0;

    const result = {
      success: true,
      ...results,
      totais: {
        faturamento: totalFaturamento,
        gastosViagem: totalGastosViagem,
        clientes: totalClientes,
      },
      metaPDF: {
        faturamento: 762714.07,
        gastosViagem: 585018.31,
        clientes: 1521,
      }
    };

    console.log('Importação concluída:', result);

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
