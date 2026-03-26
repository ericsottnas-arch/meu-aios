# VPS Hostinger - Detalhes Completos

## Acesso
- **IP:** 187.77.252.12
- **SSH:** `ssh root@187.77.252.12` (chave ed25519, sem senha)
- **Hostname:** srv1526850
- **OS:** Ubuntu
- **Provedor:** Hostinger

## Web Server: Caddy
- **Config:** `/etc/caddy/Caddyfile`
- **Reload:** `caddy reload --config /etc/caddy/Caddyfile`
- **HTTPS:** automático via Let's Encrypt

## Apps Deployadas
| App | Path | Porta | PM2 | Dominio |
|-----|------|-------|-----|---------|
| syra-hub | `/root/apps/syra-hub` | 3000 | sim | hub.syradigital.com |
| servano-dashboard | `/root/apps/servano-dashboard` | static | nao | servanoadvogados.syradigital.com |

## Caddyfile Atual
```
hub.syradigital.com {
    reverse_proxy localhost:3000
}

servanoadvogados.syradigital.com {
    root * /root/apps/servano-dashboard
    file_server
    try_files {path} /index.html
}
```

## Deploy de Apps Estaticas (SPA)
1. Build local: `npm run build`
2. Upload: `scp -r dist/* root@187.77.252.12:/root/apps/{nome}/`
3. Caddy: adicionar bloco com `file_server` + `try_files {path} /index.html`
4. Reload: `caddy reload --config /etc/caddy/Caddyfile`
5. DNS: criar A record no Cloudflare (proxy OFF para Caddy gerar HTTPS)

## Deploy de Apps Node.js
1. Upload codigo para `/root/apps/{nome}/`
2. PM2: `pm2 start server.js --name {nome}`
3. Caddy: `reverse_proxy localhost:{porta}`
4. DNS: criar A record no Cloudflare

## Gotchas
- **Permissoes /root:** Caddy roda como usuario `caddy`. Precisa `chmod 755 /root` e `chmod -R 755` nos apps para Caddy servir arquivos
- **Cert HTTPS:** Se Caddy tenta gerar cert antes do DNS existir, fica em retry com delay de 10min. Fix: deletar cert cache (`find /var/lib/caddy -name '*dominio*' -delete`) e `systemctl restart caddy`
- **Cloudflare Account ID:** `5075458eaaa4f9e08fca7a9cf7411fff`

## DNS (Cloudflare)
- Dominio: syradigital.com gerenciado no Cloudflare
- Conta: ericsottnas@gmail.com
- Zone ID syradigital.com: dd4548df15f74e61dad01160ca58abfa
- API Key (Global): salva em meu-projeto/.env como CLOUDFLARE_API_KEY
- Para Caddy gerar HTTPS proprio: usar DNS Only (nuvem cinza, proxy OFF)
- Se usar proxy Cloudflare: Caddy nao consegue gerar cert
- **Kiwify area membros:** www.syradigital.com → CNAME club.kiwify.com (proxied: false)
