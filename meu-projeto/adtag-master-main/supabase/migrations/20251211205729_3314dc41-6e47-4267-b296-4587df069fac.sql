-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generated campaigns table
CREATE TABLE public.generated_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT,
  company_name TEXT,
  campaign_objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns"
ON public.generated_campaigns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
ON public.generated_campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.generated_campaigns FOR DELETE
USING (auth.uid() = user_id);

-- Generated audiences table
CREATE TABLE public.generated_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  positioning TEXT,
  age_range TEXT,
  interest_targeting BOOLEAN,
  geolocation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audiences"
ON public.generated_audiences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audiences"
ON public.generated_audiences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audiences"
ON public.generated_audiences FOR DELETE
USING (auth.uid() = user_id);

-- Generated creatives table
CREATE TABLE public.generated_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  format TEXT,
  cta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own creatives"
ON public.generated_creatives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own creatives"
ON public.generated_creatives FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creatives"
ON public.generated_creatives FOR DELETE
USING (auth.uid() = user_id);