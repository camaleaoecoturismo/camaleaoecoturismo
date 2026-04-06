import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// All sections and the sidebar tab IDs they unlock
export const SECTION_TO_TABS: Record<string, string[]> = {
  gestao:        ['gestao-dashboard', 'gestao', 'gestao-participantes', 'gestao-pagamentos', 'gestao-movimentacao', 'gestao-atendimento'],
  reservas:      ['clientes-reservas'],
  catalogo:      ['catalogo'],
  financeiro:    ['financeiro', 'financeiro-dashboard', 'financeiro-diario', 'financeiro-passeio', 'financeiro-mensal', 'financeiro-balanco', 'financeiro-competencia', 'financeiro-historico', 'financeiro-comparacao', 'financeiro-grafica', 'financeiro-analise'],
  clientes:      ['clientes', 'clientes-lista', 'clientes-interessados', 'clientes-atendimento', 'clientes-creditos', 'clientes-cadastro', 'clientes-planilha', 'clientes-analytics'],
  fidelidade:    ['fidelidade', 'fidelidade-clientes', 'fidelidade-pontos', 'fidelidade-selos', 'fidelidade-niveis', 'fidelidade-mensagens'],
  chat_ia:       ['conversas', 'treinamento'],
  marketing:     ['marketing', 'jornada', 'conteudo-calendario', 'paginas-institucionais', 'paginas', 'home-sections', 'stories', 'tour-moments', 'depoimentos', 'formularios', 'categorias'],
  configuracoes: ['funcionalidades', 'func-menu', 'func-banners', 'func-mensagens', 'func-cupons', 'func-emails', 'func-politica', 'func-templates', 'func-tickets', 'func-transporte', 'func-pagina-sucesso', 'func-processos', 'func-seguro-roca', 'analytics', 'analytics-acessos', 'analytics-abandono', 'loja', 'mapa-processos'],
  guias:         ['guias'],
  exportar:      ['exportar'],
};

export const ALL_SECTIONS = [
  { key: 'gestao',        label: 'Passeios' },
  { key: 'reservas',      label: 'Reservas' },
  { key: 'catalogo',      label: 'Catálogo' },
  { key: 'financeiro',    label: 'Financeiro' },
  { key: 'clientes',      label: 'Clientes' },
  { key: 'fidelidade',    label: 'Fidelidade' },
  { key: 'chat_ia',       label: 'Conversas IA' },
  { key: 'marketing',     label: 'Marketing' },
  { key: 'configuracoes', label: 'Configurações do Site' },
  { key: 'guias',         label: 'Guias' },
  { key: 'exportar',      label: 'Exportar Dados' },
] as const;

export interface StaffPermissionsResult {
  isAdmin: boolean;
  isStaff: boolean;
  permissions: Record<string, boolean>;
  allowedTabs: Set<string> | null; // null = no restriction (admin)
  firstAllowedTab: string;
  loading: boolean;
}

export function useStaffPermissions(): StaffPermissionsResult {
  const [result, setResult] = useState<StaffPermissionsResult>({
    isAdmin: false,
    isStaff: false,
    permissions: {},
    allowedTabs: null,
    firstAllowedTab: 'gestao-dashboard',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const userId = session.user.id;

      // Get user role
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (!roleRow) {
        setResult(prev => ({ ...prev, loading: false }));
        return;
      }

      if (roleRow.role === 'admin') {
        setResult({
          isAdmin: true,
          isStaff: false,
          permissions: {},
          allowedTabs: null, // null = unrestricted
          firstAllowedTab: 'gestao-dashboard',
          loading: false,
        });
        return;
      }

      if (roleRow.role === 'staff') {
        // Load staff permissions
        const { data: permRows } = await supabase
          .from('staff_permissions')
          .select('section, can_access')
          .eq('user_id', userId);

        if (cancelled) return;

        const permissions: Record<string, boolean> = {};
        const allowedTabs = new Set<string>();

        // Always include 'usuarios' tab for checking (will be gated by isAdmin in sidebar)
        (permRows || []).forEach(row => {
          permissions[row.section] = row.can_access;
          if (row.can_access) {
            const tabs = SECTION_TO_TABS[row.section] || [];
            tabs.forEach(tab => allowedTabs.add(tab));
          }
        });

        // Find first accessible tab
        let firstAllowedTab = 'gestao-dashboard';
        for (const section of ALL_SECTIONS) {
          if (permissions[section.key]) {
            const tabs = SECTION_TO_TABS[section.key];
            if (tabs && tabs.length > 0) {
              firstAllowedTab = tabs[0];
              break;
            }
          }
        }

        setResult({
          isAdmin: false,
          isStaff: true,
          permissions,
          allowedTabs,
          firstAllowedTab,
          loading: false,
        });
        return;
      }

      setResult(prev => ({ ...prev, loading: false }));
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return result;
}
