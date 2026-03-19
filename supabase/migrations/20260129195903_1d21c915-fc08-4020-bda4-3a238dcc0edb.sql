-- Create client_credits table to track all credit transactions
CREATE TABLE public.client_credits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
    tour_name TEXT, -- Store name in case tour is deleted
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    original_value NUMERIC(10,2), -- Original payment value (for credits)
    percentage_applied NUMERIC(5,2), -- Percentage applied (e.g., 70% refund)
    cancellation_date DATE,
    reason TEXT,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_client_credits_cliente_id ON public.client_credits(cliente_id);
CREATE INDEX idx_client_credits_coupon_id ON public.client_credits(coupon_id);

-- Enable RLS
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Admins can view all client credits"
ON public.client_credits FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert client credits"
ON public.client_credits FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update client credits"
ON public.client_credits FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client credits"
ON public.client_credits FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add cliente_id to coupons table to make coupons exclusive to a client
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_credit_coupon BOOLEAN DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS credit_remaining NUMERIC(10,2);

-- Create function to get client credit balance
CREATE OR REPLACE FUNCTION public.get_client_credit_balance(p_cliente_id UUID)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END),
        0
    )::NUMERIC(10,2)
    FROM public.client_credits
    WHERE cliente_id = p_cliente_id
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_client_credits_updated_at
BEFORE UPDATE ON public.client_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();