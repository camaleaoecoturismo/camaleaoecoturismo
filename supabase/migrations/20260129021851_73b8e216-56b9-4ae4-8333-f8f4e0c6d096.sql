-- Create table for support/contact topics
CREATE TABLE public.support_topics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'MessageCircle',
    action_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (action_type IN ('whatsapp', 'link')),
    whatsapp_message TEXT,
    redirect_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_topics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active support topics"
ON public.support_topics
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage support topics"
ON public.support_topics
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add comment
COMMENT ON TABLE public.support_topics IS 'Support/contact topics for guided WhatsApp button menu';