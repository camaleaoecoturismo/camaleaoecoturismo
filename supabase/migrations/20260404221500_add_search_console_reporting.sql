CREATE TABLE public.search_console_import_batches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    report_start_date DATE NOT NULL,
    report_end_date DATE NOT NULL,
    source_file TEXT,
    notes TEXT,
    rows_imported INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT search_console_import_batches_valid_range
      CHECK (report_end_date >= report_start_date)
);

CREATE TABLE public.search_console_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES public.search_console_import_batches(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_path TEXT NOT NULL,
    query_text TEXT NOT NULL DEFAULT '',
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    ctr NUMERIC(10, 4) NOT NULL DEFAULT 0,
    position NUMERIC(10, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT search_console_metrics_non_negative
      CHECK (clicks >= 0 AND impressions >= 0)
);

CREATE INDEX idx_search_console_batches_range
ON public.search_console_import_batches(report_start_date, report_end_date);

CREATE INDEX idx_search_console_metrics_batch
ON public.search_console_metrics(batch_id);

CREATE INDEX idx_search_console_metrics_path
ON public.search_console_metrics(page_path);

CREATE INDEX idx_search_console_metrics_query
ON public.search_console_metrics(query_text);

ALTER TABLE public.search_console_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_console_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage search console import batches"
ON public.search_console_import_batches FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage search console metrics"
ON public.search_console_metrics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
