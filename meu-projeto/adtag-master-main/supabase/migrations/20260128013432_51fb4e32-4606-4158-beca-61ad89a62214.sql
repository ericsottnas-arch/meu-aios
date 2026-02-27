-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

-- Add client_id to generated_campaigns
ALTER TABLE public.generated_campaigns 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add client_id to generated_audiences
ALTER TABLE public.generated_audiences 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add client_id to generated_creatives
ALTER TABLE public.generated_creatives 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_campaigns_client_id ON public.generated_campaigns(client_id);
CREATE INDEX idx_audiences_client_id ON public.generated_audiences(client_id);
CREATE INDEX idx_creatives_client_id ON public.generated_creatives(client_id);