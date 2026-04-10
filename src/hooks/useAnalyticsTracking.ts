import { useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/utils/uuid';

const SESSION_KEY = 'analytics_session_id';
const SESSION_EXPIRY_KEY = 'analytics_session_expiry';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  user_id_anon: string;
  device_type: string;
  browser: string;
  os: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referer_domain: string | null;
  is_new_visitor: boolean;
}

interface ModalTrackingData {
  modalName: string;
  tourId?: string;
  tourName?: string;
  openedAt: number;
}

interface FormQuestionTiming {
  questionId: string;
  questionText: string;
  startedAt: number;
  answeredAt?: number;
}

// Analytics context for global access
interface AnalyticsContextType {
  trackEvent: (eventName: string, category?: string, label?: string, value?: number) => Promise<void>;
  trackConversion: (goal: string) => Promise<void>;
  trackModalOpen: (modalName: string, tourId?: string, tourName?: string) => void;
  trackModalClose: (modalName: string) => void;
  trackTabChange: (modalName: string, tabName: string) => void;
  trackFormQuestionStart: (questionId: string, questionText: string) => void;
  trackFormQuestionAnswer: (questionId: string) => void;
  trackFormComplete: (formName: string, totalQuestions: number) => void;
  trackCTAClick: (ctaType: string) => void;
  trackClick: (elementName: string, context?: string) => void;
  trackScroll: (scrollPercent: number, context?: string) => void;
  getSessionId: () => string | null;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function getUTMParams(): { source: string | null; medium: string | null; campaign: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  };
}

function getRefererDomain(): string | null {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    if (url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function safeStorage(type: 'local' | 'session', action: 'get' | 'set', key: string, value?: string): string | null {
  try {
    const store = type === 'local' ? localStorage : sessionStorage;
    if (action === 'get') return store.getItem(key);
    if (action === 'set' && value !== undefined) store.setItem(key, value);
  } catch {}
  return null;
}

function generateAnonId(): string {
  let anonId = safeStorage('local', 'get', 'analytics_anon_id');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    safeStorage('local', 'set', 'analytics_anon_id', anonId);
  }
  return anonId;
}

async function getOrCreateSession(): Promise<SessionData | null> {
  try {
    const existingSessionId = safeStorage('session', 'get', SESSION_KEY);
    const sessionExpiry = safeStorage('session', 'get', SESSION_EXPIRY_KEY);

    // Check if session is still valid
    if (existingSessionId && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
      // Extend session
      safeStorage('session', 'set', SESSION_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
      
      // Update last_visit_at
      await supabase
        .from('analytics_sessions')
        .update({ last_visit_at: new Date().toISOString() })
        .eq('id', existingSessionId);
      
      return { id: existingSessionId } as SessionData;
    }
    
    // Create new session
    const utmParams = getUTMParams();
    const anonId = generateAnonId();
    const isNewVisitor = !safeStorage('local', 'get', 'analytics_returning_visitor');

    // Geo lookup via IP (non-critical, best-effort)
    let geoData: { country: string | null; state: string | null; city: string | null } =
      { country: null, state: null, city: null };
    try {
      const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined;
      const geo = await fetch('https://ipapi.co/json/', { signal }).then(r => r.json());
      geoData = {
        country: geo.country_name || null,
        state: geo.region || null,
        city: geo.city || null,
      };
    } catch {}

    const sessionData = {
      user_id_anon: anonId,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      utm_source: utmParams.source,
      utm_medium: utmParams.medium,
      utm_campaign: utmParams.campaign,
      referer_domain: getRefererDomain(),
      full_referrer: document.referrer || null,
      is_new_visitor: isNewVisitor,
      first_visit_at: new Date().toISOString(),
      last_visit_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_page: window.location.pathname,
      country: geoData.country,
      state: geoData.state,
      city: geoData.city,
    };
    
    // Generate UUID client-side to avoid needing SELECT permission after INSERT
    const newSessionId = generateUUID();

    const { error } = await supabase
      .from('analytics_sessions')
      .insert({ id: newSessionId, ...sessionData });

    if (error) {
      console.error('Error creating analytics session:', error);
      return null;
    }

    // Mark as returning visitor for future visits
    safeStorage('local', 'set', 'analytics_returning_visitor', 'true');

    // Store session
    safeStorage('session', 'set', SESSION_KEY, newSessionId);
    safeStorage('session', 'set', SESSION_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());

    return { id: newSessionId, ...sessionData };
  } catch (error) {
    console.error('Analytics session error:', error);
    return null;
  }
}

async function updateSessionMetrics(sessionId: string, pagesCount: number, duration: number) {
  try {
    await supabase
      .from('analytics_sessions')
      .update({
        pages_per_session: pagesCount,
        session_duration_seconds: Math.floor(duration / 1000),
        last_visit_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error updating session metrics:', error);
  }
}

async function sendHeartbeat(sessionId: string, currentPage: string) {
  try {
    await supabase
      .from('analytics_sessions')
      .update({
        current_page: currentPage,
        last_heartbeat: new Date().toISOString(),
        last_visit_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch {
    // non-critical
  }
}

// Call this when a visitor identifies themselves (form submit, reserva, etc.)
export async function identifyVisitor(data: {
  sessionId: string | null;
  name?: string;
  email?: string;
  phone?: string;
  clienteId?: string;
}) {
  if (!data.sessionId) return;
  try {
    await supabase
      .from('analytics_sessions')
      .update({
        identified_name:  data.name  || null,
        identified_email: data.email || null,
        identified_phone: data.phone || null,
        cliente_id:       data.clienteId || null,
      })
      .eq('id', data.sessionId);
  } catch {
    // non-critical
  }
}

export function useAnalyticsTracking() {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const pageCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const lastPathnameRef = useRef<string | null>(null);

  // Pageview enrichment
  const currentPageviewIdRef = useRef<string | null>(null);
  const pageEnterTimeRef = useRef<number>(Date.now());
  const maxScrollDepthRef = useRef<number>(0);

  // Modal tracking state
  const activeModalsRef = useRef<Map<string, ModalTrackingData>>(new Map());
  const currentTabRef = useRef<Map<string, { tabName: string; startedAt: number }>>(new Map());

  // Form question timing
  const formQuestionsRef = useRef<Map<string, FormQuestionTiming>>(new Map());
  const formStartTimeRef = useRef<number | null>(null);
  
  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const session = await getOrCreateSession();
      if (session) {
        sessionIdRef.current = session.id;
        sessionStartRef.current = Date.now();
      }
    };
    
    initSession();
    
    // Scroll depth tracking
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((window.scrollY / docHeight) * 100);
      if (pct > maxScrollDepthRef.current) maxScrollDepthRef.current = pct;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Heartbeat every 30s — keeps "online now" accurate
    const heartbeatInterval = setInterval(() => {
      if (sessionIdRef.current) {
        sendHeartbeat(sessionIdRef.current, window.location.pathname);
      }
    }, 30_000);

    // Update session metrics on page unload
    const handleUnload = () => {
      if (sessionIdRef.current) {
        const duration = Date.now() - sessionStartRef.current;
        const SUPABASE_URL = 'https://guwplwuwriixgvkjlutg.supabase.co';
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        // Use fetch with keepalive so auth headers are sent (sendBeacon can't set headers)
        fetch(
          `${SUPABASE_URL}/rest/v1/analytics_sessions?id=eq.${sessionIdRef.current}`,
          {
            method: 'PATCH',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              pages_per_session: pageCountRef.current,
              session_duration_seconds: Math.floor(duration / 1000),
            }),
          }
        ).catch(() => {});
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('scroll', handleScroll);
      clearInterval(heartbeatInterval);
    };
  }, []);
  
  // Track page views on route change
  useEffect(() => {
    const pathname = location.pathname;
    
    // Avoid tracking the same page twice
    if (pathname === lastPathnameRef.current) return;
    lastPathnameRef.current = pathname;
    
    // Skip admin and internal routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/cliente') || pathname.startsWith('/minha-conta')) return;
    
    const trackPage = async () => {
      if (!sessionIdRef.current) {
        const session = await getOrCreateSession();
        if (session) {
          sessionIdRef.current = session.id;
        }
      }

      if (sessionIdRef.current) {
        // Enrich previous pageview with time on page and scroll depth
        if (currentPageviewIdRef.current) {
          const timeOnPage = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);
          supabase
            .from('analytics_pageviews')
            .update({
              time_on_page_seconds: timeOnPage,
              scroll_depth_percent: maxScrollDepthRef.current,
            })
            .eq('id', currentPageviewIdRef.current)
            .then(() => {});
        }

        // Reset enrichment state
        pageEnterTimeRef.current = Date.now();
        maxScrollDepthRef.current = 0;

        pageCountRef.current += 1;

        // Update current_page in session for real-time visibility
        sendHeartbeat(sessionIdRef.current, pathname);

        // Insert new pageview and store its id
        try {
          const { data, error } = await supabase
            .from('analytics_pageviews')
            .insert({
              session_id: sessionIdRef.current,
              page_path: pathname,
              page_title: document.title || pathname,
              viewed_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (!error && data) {
            currentPageviewIdRef.current = data.id;
          }
        } catch {
          // non-critical
        }

        // Update session metrics periodically
        if (pageCountRef.current % 3 === 0) {
          const duration = Date.now() - sessionStartRef.current;
          await updateSessionMetrics(sessionIdRef.current, pageCountRef.current, duration);
        }
      }
    };
    
    trackPage();
  }, [location.pathname]);
  
  // Track generic event
  const trackEvent = useCallback(async (eventName: string, category?: string, label?: string, value?: number) => {
    if (!sessionIdRef.current) {
      const session = await getOrCreateSession();
      if (session) sessionIdRef.current = session.id;
    }
    if (!sessionIdRef.current) return;
    
    try {
      await supabase
        .from('analytics_events')
        .insert({
          session_id: sessionIdRef.current,
          event_name: eventName,
          event_category: category,
          event_label: label,
          event_value: value,
        });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, []);
  
  // Track conversion
  const trackConversion = useCallback(async (goal: string) => {
    if (!sessionIdRef.current) return;
    
    try {
      await supabase
        .from('analytics_sessions')
        .update({
          converted: true,
          conversion_goal: goal,
        })
        .eq('id', sessionIdRef.current);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }, []);
  
  // Track modal open
  const trackModalOpen = useCallback((modalName: string, tourId?: string, tourName?: string) => {
    const now = Date.now();
    activeModalsRef.current.set(modalName, {
      modalName,
      tourId,
      tourName,
      openedAt: now,
    });
    
    // Track event
    trackEvent('modal_open', 'modal', modalName, undefined);
    
    // If it's reservation form, start tracking form time and mark CTA click
    if (modalName === 'reserva') {
      formStartTimeRef.current = now;
      formQuestionsRef.current.clear();
      // Record that a CTA was clicked on the current page
      if (currentPageviewIdRef.current) {
        supabase
          .from('analytics_pageviews')
          .update({ clicked_main_cta: true, cta_type: 'reservar_vaga' })
          .eq('id', currentPageviewIdRef.current)
          .then(() => {});
      }
    }
  }, [trackEvent]);
  
  // Track modal close
  const trackModalClose = useCallback((modalName: string) => {
    const modalData = activeModalsRef.current.get(modalName);
    if (modalData) {
      const timeSpent = Math.floor((Date.now() - modalData.openedAt) / 1000);
      
      // Track time spent in modal
      trackEvent('modal_close', 'modal', modalName, timeSpent);
      
      // Track final tab time if any
      const tabData = currentTabRef.current.get(modalName);
      if (tabData) {
        const tabTimeSpent = Math.floor((Date.now() - tabData.startedAt) / 1000);
        trackEvent('tab_time_spent', 'modal_tab', `${modalName}_${tabData.tabName}`, tabTimeSpent);
        currentTabRef.current.delete(modalName);
      }
      
      activeModalsRef.current.delete(modalName);
    }
  }, [trackEvent]);
  
  // Track tab change within modal
  const trackTabChange = useCallback((modalName: string, tabName: string) => {
    const now = Date.now();
    
    // Track time spent on previous tab
    const prevTab = currentTabRef.current.get(modalName);
    if (prevTab) {
      const tabTimeSpent = Math.floor((now - prevTab.startedAt) / 1000);
      trackEvent('tab_time_spent', 'modal_tab', `${modalName}_${prevTab.tabName}`, tabTimeSpent);
    }
    
    // Set new tab
    currentTabRef.current.set(modalName, { tabName, startedAt: now });
    trackEvent('tab_change', 'modal_tab', `${modalName}_${tabName}`);
  }, [trackEvent]);
  
  // Track form question start
  const trackFormQuestionStart = useCallback((questionId: string, questionText: string) => {
    const now = Date.now();
    formQuestionsRef.current.set(questionId, {
      questionId,
      questionText,
      startedAt: now,
    });
    
    trackEvent('question_view', 'form', questionText.substring(0, 50));
  }, [trackEvent]);
  
  // Track form question answer
  const trackFormQuestionAnswer = useCallback((questionId: string) => {
    const questionData = formQuestionsRef.current.get(questionId);
    if (questionData) {
      const timeToAnswer = Math.floor((Date.now() - questionData.startedAt) / 1000);
      questionData.answeredAt = Date.now();
      
      trackEvent('question_answer', 'form', questionData.questionText.substring(0, 50), timeToAnswer);
    }
  }, [trackEvent]);
  
  // Track form complete
  const trackFormComplete = useCallback((formName: string, totalQuestions: number) => {
    if (formStartTimeRef.current) {
      const totalTime = Math.floor((Date.now() - formStartTimeRef.current) / 1000);
      
      // Calculate average time per question
      const answeredQuestions = Array.from(formQuestionsRef.current.values())
        .filter(q => q.answeredAt);
      
      const avgTimePerQuestion = answeredQuestions.length > 0
        ? Math.floor(answeredQuestions.reduce((sum, q) => {
            return sum + (q.answeredAt! - q.startedAt);
          }, 0) / answeredQuestions.length / 1000)
        : 0;
      
      trackEvent('form_complete', 'form', formName, totalTime);
      trackEvent('form_avg_question_time', 'form', formName, avgTimePerQuestion);
      trackEvent('form_questions_answered', 'form', formName, answeredQuestions.length);
      
      // Track conversion
      if (formName === 'reserva') {
        trackConversion('reservation_completed');
      }
      
      formStartTimeRef.current = null;
    }
  }, [trackEvent, trackConversion]);
  
  // Track CTA click on current pageview
  const trackCTAClick = useCallback((ctaType: string) => {
    if (!currentPageviewIdRef.current) return;
    supabase
      .from('analytics_pageviews')
      .update({ clicked_main_cta: true, cta_type: ctaType })
      .eq('id', currentPageviewIdRef.current)
      .then(() => {});
  }, []);

  // Track click
  const trackClick = useCallback((elementName: string, context?: string) => {
    trackEvent('click', 'interaction', context ? `${context}_${elementName}` : elementName);
  }, [trackEvent]);
  
  // Track scroll
  const trackScroll = useCallback((scrollPercent: number, context?: string) => {
    trackEvent('scroll', 'interaction', context || 'page', scrollPercent);
  }, [trackEvent]);
  
  // Get session ID
  const getSessionId = useCallback(() => {
    return sessionIdRef.current;
  }, []);
  
  return {
    trackEvent,
    trackConversion,
    trackModalOpen,
    trackModalClose,
    trackTabChange,
    trackFormQuestionStart,
    trackFormQuestionAnswer,
    trackFormComplete,
    trackCTAClick,
    trackClick,
    trackScroll,
    getSessionId,
  };
}

// Create context for global access
export const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if context not available
    return {
      trackEvent: async () => {},
      trackConversion: async () => {},
      trackModalOpen: () => {},
      trackModalClose: () => {},
      trackTabChange: () => {},
      trackFormQuestionStart: () => {},
      trackFormQuestionAnswer: () => {},
      trackFormComplete: () => {},
      trackCTAClick: () => {},
      trackClick: () => {},
      trackScroll: () => {},
      getSessionId: () => null,
    };
  }
  return context;
}