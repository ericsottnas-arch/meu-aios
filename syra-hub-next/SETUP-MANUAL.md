# Syra Hub Next.js - Guia de Setup Manual

## O que JA esta funcionando

| Item | Status | URL |
|------|--------|-----|
| App Next.js | Deployado | https://syra-hub-next.vercel.app |
| Dominio customizado | Configurado | https://hub.syradigital.com |
| DNS Cloudflare | A record criado | hub → 76.76.21.21 |
| SSL/HTTPS | Automatico (Vercel) | Funcionando |
| Login email+senha | Funcionando | ericsottnas@gmail.com / SyraHub2026x |
| Supabase DB | Migrado | 11 clientes, profiles, RLS |
| Middleware Auth | Ativo | Redireciona para /login se nao autenticado |
| Sidebar + Dashboard | Implementado | 12 secoes de navegacao |

## Usuario Admin criado

- **Email:** ericsottnas@gmail.com
- **Senha:** SyraHub2026x
- **Role:** admin (pode ver tudo)

## Passos manuais pendentes (2-3 minutos)

### 1. Atualizar Site URL no Supabase (Opcional - so afeta reset de senha)

1. Acesse: https://supabase.com/dashboard/project/cbhykdpvpnbxvbtlnvpv/auth/url-configuration
2. No campo "Site URL", altere para: `https://hub.syradigital.com`
3. Clique "Save changes"

**Nota:** O login email+senha funciona SEM isso. So afeta links em emails (reset senha, confirmacao).

### 2. Adicionar Redirect URLs no Supabase (Para Google OAuth)

1. Na mesma pagina de URL Configuration
2. Em "Redirect URLs", clique "Add URL"
3. Adicione: `https://hub.syradigital.com/callback`
4. Adicione: `https://syra-hub-next.vercel.app/callback`

### 3. Configurar Google OAuth (Opcional - login Google)

1. Acesse Google Cloud Console: https://console.cloud.google.com
2. Crie ou selecione um projeto
3. Em "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
4. Tipo: Web Application
5. Authorized redirect URIs: `https://cbhykdpvpnbxvbtlnvpv.supabase.co/auth/v1/callback`
6. Copie Client ID e Client Secret
7. No Supabase: Auth > Sign In / Providers > Google > Enable
8. Cole Client ID e Client Secret

## Credenciais do projeto

| Servico | Credencial |
|---------|-----------|
| Supabase Project Ref | cbhykdpvpnbxvbtlnvpv |
| Supabase URL | https://cbhykdpvpnbxvbtlnvpv.supabase.co |
| Vercel Project | syra-hub-next |
| Cloudflare Zone ID | dd4548df15f74e61dad01160ca58abfa |
| Dominio | hub.syradigital.com |

## Proximos passos (Fases 3-8 do plano)

- Fase 3: Clientes + Migracao DB completa (campaigns, CRM, prospecting)
- Fase 4: Dashboard de Midia Paga + CRM
- Fase 5: Prospeccao + Health Checks VPS
- Fase 6: Sync Workers VPS → Supabase
- Fase 7: Forms publicos + Docs + Polish
- Fase 8: Portal do Cliente + Deploy final
