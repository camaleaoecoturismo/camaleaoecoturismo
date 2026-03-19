-- Add accommodation flag to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS has_accommodation boolean DEFAULT false;

-- Create table for accommodations (pousadas) per tour
CREATE TABLE public.tour_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  notes text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create table for rooms within accommodations
CREATE TABLE public.accommodation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid REFERENCES public.tour_accommodations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  room_type text NOT NULL DEFAULT 'duplo', -- casal, duplo_solteiro, triplo, quadruplo, etc
  capacity integer NOT NULL DEFAULT 2,
  gender_restriction text, -- masculino, feminino, misto (null = sem restrição)
  notes text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create table for room assignments (participant to room)
CREATE TABLE public.room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.accommodation_rooms(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES public.reservation_participants(id) ON DELETE CASCADE,
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE CASCADE,
  participant_index integer NOT NULL DEFAULT 1, -- 1 = titular, 2+ = adicional
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  assigned_by text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  -- Ensure each participant can only be assigned to one room per tour
  UNIQUE(reserva_id, participant_index, room_id)
);

-- Create index for faster lookups
CREATE INDEX idx_tour_accommodations_tour_id ON public.tour_accommodations(tour_id);
CREATE INDEX idx_accommodation_rooms_accommodation_id ON public.accommodation_rooms(accommodation_id);
CREATE INDEX idx_room_assignments_room_id ON public.room_assignments(room_id);
CREATE INDEX idx_room_assignments_reserva ON public.room_assignments(reserva_id, participant_index);

-- Enable RLS
ALTER TABLE public.tour_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only via service role, public read for now)
CREATE POLICY "Allow all operations for authenticated users on tour_accommodations"
ON public.tour_accommodations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on accommodation_rooms"
ON public.accommodation_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on room_assignments"
ON public.room_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to get room occupancy count
CREATE OR REPLACE FUNCTION public.get_room_occupancy(p_room_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.room_assignments
  WHERE room_id = p_room_id
$$;