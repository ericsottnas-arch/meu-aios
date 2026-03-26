/**
 * Script para gerar o GOOGLE_ADS_REFRESH_TOKEN
 *
 * USO:
 *   1. Preencha CLIENT_ID e CLIENT_SECRET abaixo (ou via env)
 *   2. node scripts/get-google-ads-token.mjs
 *   3. Abra a URL no navegador, autorize e cole o código aqui
 */

import { createServer } from 'http'
import { URL } from 'url'

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || 'COLE_SEU_CLIENT_ID'
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || 'COLE_SEU_CLIENT_SECRET'
const REDIRECT_URI = 'http://localhost:9999/callback'
const SCOPE = 'https://www.googleapis.com/auth/adwords'

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`

console.log('\n🔑 Google Ads — Gerador de Refresh Token\n')
console.log('1. Abra esta URL no navegador:\n')
console.log(authUrl)
console.log('\n2. Autorize a conta e aguarde o redirect...\n')

// Servidor local para capturar o código
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:9999`)
  const code = url.searchParams.get('code')

  if (!code) {
    res.end('Sem código. Tente novamente.')
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()

    if (tokens.refresh_token) {
      console.log('\n✅ Sucesso!\n')
      console.log('GOOGLE_ADS_REFRESH_TOKEN=' + tokens.refresh_token)
      console.log('\nAdicione essa variável no .env.local e no Vercel.\n')
      res.end('<h2>✅ Token gerado com sucesso! Volte ao terminal.</h2>')
    } else {
      console.error('Erro:', tokens)
      res.end('<h2>❌ Erro. Veja o terminal.</h2>')
    }
  } catch (err) {
    console.error(err)
    res.end('<h2>❌ Erro. Veja o terminal.</h2>')
  } finally {
    server.close()
    process.exit(0)
  }
})

server.listen(9999, () => {
  console.log('Aguardando callback em http://localhost:9999/callback ...\n')
})
