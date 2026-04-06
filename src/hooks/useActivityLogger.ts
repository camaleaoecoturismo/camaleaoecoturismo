import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ActionType = 'login' | 'logout' | 'page_view' | 'create' | 'update' | 'delete';

interface LogEntry {
  action_type: ActionType;
  section?: string;
  details?: Record<string, unknown>;
  duration_sec?: number;
}

// Session ID is generated once per browser tab session
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function writeLog(entry: LogEntry) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('staff_activity_logs').insert({
    user_id: session.user.id,
    user_email: session.user.email,
    session_id: SESSION_ID,
    action_type: entry.action_type,
    section: entry.section ?? null,
    details: entry.details ?? null,
    duration_sec: entry.duration_sec ?? null,
  });
}

/**
 * Log a one-off action (create, update, delete, login, logout).
 */
export async function logAction(
  action_type: ActionType,
  section?: string,
  details?: Record<string, unknown>
) {
  await writeLog({ action_type, section, details });
}

/**
 * Hook that logs a page_view when the component mounts and records
 * the time spent on the page (duration_sec) when it unmounts.
 *
 * Usage: call at the top of each main admin tab component.
 * Example: usePageViewLogger('financeiro');
 */
export function usePageViewLogger(section: string) {
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
    writeLog({ action_type: 'page_view', section });

    return () => {
      const duration_sec = Math.round((Date.now() - mountTimeRef.current) / 1000);
      if (duration_sec > 0) {
        writeLog({ action_type: 'page_view', section, duration_sec });
      }
    };
  }, [section]);
}

/**
 * Returns a stable logAction callback bound to a specific section.
 * Convenience for components that log multiple actions in the same section.
 */
export function useSectionLogger(section: string) {
  return useCallback(
    (action: 'create' | 'update' | 'delete', details?: Record<string, unknown>) =>
      logAction(action, section, details),
    [section]
  );
}
