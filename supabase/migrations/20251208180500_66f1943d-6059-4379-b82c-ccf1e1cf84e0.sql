-- Create payment_logs table for tracking all payment events
CREATE TABLE public.payment_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_status TEXT,
    event_message TEXT,
    mp_payment_id TEXT,
    amount NUMERIC,
    refund_amount NUMERIC,
    payment_method TEXT,
    raw_data JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add refund columns to reservas table
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_by UUID;

-- Create index for faster queries
CREATE INDEX idx_payment_logs_reserva_id ON public.payment_logs(reserva_id);
CREATE INDEX idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX idx_payment_logs_created_at ON public.payment_logs(created_at);

-- Enable RLS on payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_logs
CREATE POLICY "Admins can manage payment logs"
ON public.payment_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert payment logs during payment"
ON public.payment_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view payment logs for their reservations"
ON public.payment_logs
FOR SELECT
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.payment_logs IS 'Tracks all payment-related events: attempts, approvals, rejections, refunds, etc.';