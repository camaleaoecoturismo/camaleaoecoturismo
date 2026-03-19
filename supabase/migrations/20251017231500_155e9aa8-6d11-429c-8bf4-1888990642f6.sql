-- Create trips table for managing tours/excursions
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create stops table for boarding points
CREATE TABLE public.stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  horario TEXT,
  apelido_curto TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create entries table for participants
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  stop_id UUID REFERENCES public.stops(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  presente BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for stops
CREATE POLICY "Users can view stops of their trips"
  ON public.stops FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = stops.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert stops for their trips"
  ON public.stops FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = stops.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update stops of their trips"
  ON public.stops FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = stops.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete stops of their trips"
  ON public.stops FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = stops.trip_id
    AND trips.user_id = auth.uid()
  ));

-- RLS Policies for entries
CREATE POLICY "Users can view entries of their trips"
  ON public.entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = entries.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert entries for their trips"
  ON public.entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = entries.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update entries of their trips"
  ON public.entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = entries.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete entries of their trips"
  ON public.entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = entries.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Trigger to update updated_at on trips
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on entries
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;