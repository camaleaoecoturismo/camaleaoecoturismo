-- Tabela para definições de colunas personalizadas por passeio
CREATE TABLE public.tour_custom_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'currency', 'select', 'multiselect', 'boolean')),
  options TEXT[] DEFAULT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para valores das colunas personalizadas por reserva
CREATE TABLE public.reservation_custom_column_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.tour_custom_columns(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reserva_id, column_id)
);

-- Enable RLS
ALTER TABLE public.tour_custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_custom_column_values ENABLE ROW LEVEL SECURITY;

-- Policies for tour_custom_columns
CREATE POLICY "Anyone can view tour custom columns"
ON public.tour_custom_columns FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tour custom columns"
ON public.tour_custom_columns FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies for reservation_custom_column_values
CREATE POLICY "Anyone can view custom column values"
ON public.reservation_custom_column_values FOR SELECT
USING (true);

CREATE POLICY "Admins can manage custom column values"
ON public.reservation_custom_column_values FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tour_custom_columns_updated_at
BEFORE UPDATE ON public.tour_custom_columns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservation_custom_column_values_updated_at
BEFORE UPDATE ON public.reservation_custom_column_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tour_custom_columns_tour_id ON public.tour_custom_columns(tour_id);
CREATE INDEX idx_reservation_custom_column_values_reserva_id ON public.reservation_custom_column_values(reserva_id);
CREATE INDEX idx_reservation_custom_column_values_column_id ON public.reservation_custom_column_values(column_id);