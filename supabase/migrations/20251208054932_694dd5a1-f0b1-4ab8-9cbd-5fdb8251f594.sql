-- Add payment configuration to tours table
ALTER TABLE public.tours 
ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS mp_card_fee_percent numeric NOT NULL DEFAULT 4.99,
ADD COLUMN IF NOT EXISTS mp_installments_max integer NOT NULL DEFAULT 12;

-- Add comment for payment_mode values
COMMENT ON COLUMN public.tours.payment_mode IS 'Payment mode: whatsapp, mercadopago, or both';

-- Create tour optional items table (per tour)
CREATE TABLE public.tour_optional_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_optional_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tour_optional_items
CREATE POLICY "Anyone can view active optional items" 
ON public.tour_optional_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage optional items" 
ON public.tour_optional_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add MP transaction fields to reservas
ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS mp_preference_id text,
ADD COLUMN IF NOT EXISTS mp_payment_id text,
ADD COLUMN IF NOT EXISTS mp_status text,
ADD COLUMN IF NOT EXISTS selected_optional_items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS card_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1;

-- Create trigger for updated_at on tour_optional_items
CREATE TRIGGER update_tour_optional_items_updated_at
BEFORE UPDATE ON public.tour_optional_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();