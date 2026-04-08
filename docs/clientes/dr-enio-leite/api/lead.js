/**
 * Vercel Serverless Function — /api/lead
 * Recebe submissão do formulário e cria contato no GHL (Dr. Enio Leite)
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.drenioleite.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      nome       = '',
      telefone   = '',
      procedimento = 'Consulta Geral',
      utm_source   = '',
      utm_medium   = '',
      utm_campaign = '',
      utm_content  = '',
      utm_term     = '',
    } = req.body || {};

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'nome e telefone são obrigatórios' });
    }

    // Formatar telefone — garantir +55 + apenas dígitos
    const digits = telefone.replace(/\D/g, '');
    const phone  = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;

    // Separar primeiro e último nome
    const parts     = nome.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName  = parts.slice(1).join(' ') || '';

    // Montar notas com UTMs
    const utmNotes = [
      utm_source   && `Fonte: ${utm_source}`,
      utm_medium   && `Mídia: ${utm_medium}`,
      utm_campaign && `Campanha: ${utm_campaign}`,
      utm_content  && `Criativo: ${utm_content}`,
      utm_term     && `Termo: ${utm_term}`,
    ].filter(Boolean).join('\n');

    const body = {
      locationId: process.env.GHL_ENIO_LOCATION_ID,
      firstName,
      lastName,
      phone,
      source: 'landing-page',
      tags: [
        'website-lead',
        procedimento.toLowerCase().replace(/\s+/g, '-'),
        utm_campaign || 'organico',
      ].filter(Boolean),
    };

    // Adicionar UTMs como notas se existirem
    if (utmNotes) body.internalNotes = utmNotes;

    const ghlRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_ENIO_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(body),
    });

    const ghlData = await ghlRes.json();

    if (!ghlRes.ok) {
      console.error('GHL error:', JSON.stringify(ghlData));
      // Retorna 200 pro front pra não mostrar erro ao usuário
      return res.status(200).json({ success: true, warning: 'GHL error' });
    }

    return res.status(200).json({ success: true, contactId: ghlData.contact?.id });

  } catch (err) {
    console.error('Lead handler error:', err.message);
    return res.status(200).json({ success: true }); // silencioso pro usuário
  }
}
