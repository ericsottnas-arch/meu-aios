-- ============================================================
-- Seed: Client Integrations — tokens GHL, Meta, Google Ads
-- Run AFTER 002_client_integrations.sql
-- ============================================================

-- ============================================================
-- GHL (GoHighLevel) — tokens por localização
-- ============================================================

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'ghl', '{
  "locationId": "9VML3WG6LUoz7Eh5fb9U",
  "token": "pit-bb328204-dbc2-47e1-833a-83b06a9c0849",
  "pipelineId": "gSnNjh0nlDzezTgXQV29"
}'::jsonb
FROM public.clients c WHERE c.slug = 'dr-erico-servano'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'ghl', '{
  "locationId": "3iNi7kJci5f0BNUoq4kX",
  "token": "pit-1965f764-1709-4e20-b0a3-97d330a9f665",
  "pipelineId": "IqBgqQLwrueiZlsV4yzI"
}'::jsonb
FROM public.clients c WHERE c.slug = 'estetica-gabrielleoliveira'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

-- ============================================================
-- Meta Ads — IDs por conta (token global via env META_ACCESS_TOKEN)
-- ============================================================

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'meta', '{
  "adAccountId": "act_1397446335381640",
  "pageId": "804491499425586"
}'::jsonb
FROM public.clients c WHERE c.slug = 'dr-erico-servano'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'meta', '{
  "adAccountId": "act_659024227004356",
  "pageId": "280473538472405"
}'::jsonb
FROM public.clients c WHERE c.slug = 'dra-vanessa-soares'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'meta', '{
  "adAccountId": "act_4992030634193032",
  "pageId": "837049336158107"
}'::jsonb
FROM public.clients c WHERE c.slug = 'torre-1'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'meta', '{
  "adAccountId": "act_1136892320236480"
}'::jsonb
FROM public.clients c WHERE c.slug = 'estetica-gabrielleoliveira'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;

-- ============================================================
-- Google Ads — customer IDs (credentials globais via env)
-- ============================================================

INSERT INTO public.client_integrations (client_id, platform, config)
SELECT c.id, 'google_ads', '{
  "customerId": "2169824174"
}'::jsonb
FROM public.clients c WHERE c.slug = 'dr-erico-servano'
ON CONFLICT (client_id, platform) DO UPDATE SET config = EXCLUDED.config;
