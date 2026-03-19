-- Create analytics_sessions table
CREATE TABLE public.analytics_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id_anon TEXT,
    first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    session_duration_seconds INTEGER DEFAULT 0,
    pages_per_session INTEGER DEFAULT 1,
    is_new_visitor BOOLEAN DEFAULT true,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    os TEXT,
    browser TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referer_domain TEXT,
    conversion_goal TEXT,
    converted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_pageviews table
CREATE TABLE public.analytics_pageviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    page_path TEXT NOT NULL,
    page_title TEXT,
    scroll_depth_percent INTEGER DEFAULT 0 CHECK (scroll_depth_percent >= 0 AND scroll_depth_percent <= 100),
    time_on_page_seconds INTEGER DEFAULT 0,
    clicked_main_cta BOOLEAN DEFAULT false,
    cta_type TEXT
);

-- Create analytics_events table
CREATE TABLE public.analytics_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_label TEXT,
    event_value NUMERIC
);

-- Create indexes for better query performance
CREATE INDEX idx_analytics_sessions_first_visit ON public.analytics_sessions(first_visit_at);
CREATE INDEX idx_analytics_sessions_device ON public.analytics_sessions(device_type);
CREATE INDEX idx_analytics_sessions_utm ON public.analytics_sessions(utm_source, utm_medium, utm_campaign);
CREATE INDEX idx_analytics_sessions_converted ON public.analytics_sessions(converted);
CREATE INDEX idx_analytics_pageviews_session ON public.analytics_pageviews(session_id);
CREATE INDEX idx_analytics_pageviews_viewed ON public.analytics_pageviews(viewed_at);
CREATE INDEX idx_analytics_pageviews_path ON public.analytics_pageviews(page_path);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);

-- Enable RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics_sessions
CREATE POLICY "Admins can manage analytics sessions"
ON public.analytics_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert analytics sessions"
ON public.analytics_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update own session"
ON public.analytics_sessions FOR UPDATE
USING (true);

-- RLS policies for analytics_pageviews
CREATE POLICY "Admins can manage analytics pageviews"
ON public.analytics_pageviews FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert analytics pageviews"
ON public.analytics_pageviews FOR INSERT
WITH CHECK (true);

-- RLS policies for analytics_events
CREATE POLICY "Admins can manage analytics events"
ON public.analytics_events FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);