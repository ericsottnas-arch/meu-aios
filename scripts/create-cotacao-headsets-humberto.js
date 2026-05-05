/**
 * Cotação de Headsets — Time Comercial Dr. Humberto Andrade
 * Cria Google Sheet profissional na pasta do cliente
 */
require('dotenv').config({ path: require('path').join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { google } = require('googleapis');

const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

const sheets = google.sheets({ version: 'v4', auth });
const drive  = google.drive({ version: 'v3', auth });

const FOLDER_ID = '1umYozUzq8qV8hB1IaHUYpJEJZLj8wss7';
const SS_ID     = '167ur6jEA05klvvTIzjsCFrCEUKEtuUzJPjmtFLLUiIw';
const SID       = 1341115322;

const c    = (r,g,b) => ({ red: r, green: g, blue: b });
const wh   = c(1,1,1);
const dark = c(0.12, 0.12, 0.12);
const gray = c(0.95, 0.95, 0.95);
const lgr  = c(0.87, 0.96, 0.87);
const blue = c(0.13, 0.38, 0.80);
const yel  = c(1.00, 0.98, 0.88);
const bGray  = { style: 'SOLID',        color: c(0.7, 0.7, 0.7) };
const bDark  = { style: 'SOLID_MEDIUM', color: c(0.3, 0.3, 0.3) };
const bGreen = { style: 'SOLID_MEDIUM', color: c(0.18, 0.65, 0.18) };

const rng = (si, ei, sc, ec) => ({ sheetId: SID, startRowIndex: si, endRowIndex: ei, startColumnIndex: sc, endColumnIndex: ec });

// Coluna COMPATÍVEL CPU adicionada — só produtos que funcionam fone+mic direto
const PRODUCTS = [
  {
    num: '1 ✅',
    name: 'C3Tech PH-340BK — Headset USB Estéreo',
    brand: 'C3Tech',
    conn: 'USB — plug-and-play, sem adaptador',
    compat: '✅ Funciona direto',
    mic: 'Sim — omnidirecional articulado, cabo 185cm',
    rating: '4.4 ⭐  (179 aval.)',
    price: 'R$ 70,00',
    total: 'R$ 140,00',
    link: 'https://www.mercadolivre.com.br/headset-c3-tech-com-microfone-ph-340bk-usb-stereo-com-controle-cor-preto/p/MLB21886122',
    store: 'Ver no ML',
  },
  {
    num: '2',
    name: 'Fortrek HSL-102 — Headset P2 Duplo',
    brand: 'Fortrek',
    conn: 'P2 DUPLO — 2 plugues (verde=fone, rosa=mic)',
    compat: '✅ Funciona direto',
    mic: 'Sim — haste flexível, cabo 2,2m',
    rating: '4.4 ⭐  (1.732 aval.)',
    price: 'R$ 65,00',
    total: 'R$ 130,00',
    link: 'https://www.mercadolivre.com.br/headset-fortrek-hsl-102-preto/p/MLB15356181',
    store: 'Ver no ML',
  },
  {
    num: '3 ⚠️',
    name: 'Logitech H111 — Headset P2 Combo',
    brand: 'Logitech',
    conn: 'P2 COMBO — 1 plugue único (precisa de adaptador splitter para CPU)',
    compat: '⚠️ Precisa adaptador ~R$10',
    mic: 'Sim — redução de ruído',
    rating: '4.6 ⭐  (1.090 aval.)',
    price: 'R$ 65,00 + R$ 10 splitter',
    total: 'R$ 150,00',
    link: 'https://www.mercadolivre.com.br/headset-com-fio-h111-com-microfone-com-reducao-de-ruido-e-conexo-35mm-bt-1-unidade-logitech/p/MLB11754916',
    store: 'Ver no ML',
  },
  {
    num: '4',
    name: 'Go Tech 0H109 VoIP — Headset USB Biauricular',
    brand: 'Go Tech',
    conn: 'USB — plug-and-play, cabo 2m, botão mute + vol.',
    compat: '✅ Funciona direto',
    mic: 'Sim — haste flexível + mute no cabo',
    rating: '5.0 ⭐  (jan/2026)',
    price: 'R$ 79,00',
    total: 'R$ 158,00',
    link: 'https://www.mercadolivre.com.br/fone-de-ouvido-headset-usb-cmicrofone-preto-gotech/p/MLB20767379',
    store: 'Ver no ML',
  },
  {
    num: '5',
    name: 'C3Tech PH-300BK — Headset USB',
    brand: 'C3Tech',
    conn: 'USB — plug-and-play, cabo 180cm',
    compat: '✅ Funciona direto',
    mic: 'Sim — omnidirecional 6x5mm',
    rating: '4.3 ⭐  (136 aval.)',
    price: 'R$ 72,00',
    total: 'R$ 144,00',
    link: 'https://www.amazon.com.br/Headset-PH-300BK-Microfone-Omnidirecional-Alto-Falante/dp/B0DSCK46SK',
    store: 'Ver na Amazon',
  },
];

async function main() {
  // Mover para pasta
  const meta = await drive.files.get({ fileId: SS_ID, fields: 'parents' });
  await drive.files.update({
    fileId: SS_ID,
    addParents: FOLDER_ID,
    removeParents: (meta.data.parents || []).join(','),
    fields: 'id',
  }).catch(() => {});

  const N = 11; // número de colunas

  // Dados
  const values = [
    ['COTAÇÃO DE HEADSETS — TIME COMERCIAL DR. HUMBERTO ANDRADE', ...Array(N-1).fill('')],
    ['Data: 15/04/2026  |  Qtd: 2 unidades  |  Finalidade: Ligações via GoHighLevel (GHL) em computadores de mesa (CPU)', ...Array(N-1).fill('')],
    Array(N).fill(''),
    ['#', 'PRODUTO', 'MARCA', 'CONEXÃO', 'COMPATÍVEL CPU', 'MICROFONE', 'AVALIAÇÃO', 'PREÇO UNIT.', 'QTD', 'TOTAL', 'COMPRAR'],
    ...PRODUCTS.map(p => [
      p.num, p.name, p.brand, p.conn, p.compat, p.mic, p.rating, p.price, '2', p.total,
      `=HYPERLINK("${p.link}","🛒 ${p.store}")`,
    ]),
    Array(N).fill(''),
    [
      '⚠️ NOTA TÉCNICA',
      'USB = plug-and-play, funciona fone+microfone direto na CPU sem configuração. P2 DUPLO (2 plugues) = encaixa nas 2 entradas da CPU (verde=fone, rosa=mic). P2 COMBO (1 plugue) = precisa de adaptador splitter Y (~R$10) para funcionar mic+fone separados na CPU.',
      ...Array(N-2).fill(''),
    ],
    Array(N).fill(''),
    ['✅  RECOMENDAÇÃO: C3Tech PH-340BK (linha 1) — USB, plug-and-play, fone+mic funcionam direto na CPU, sem adaptador. Total para 2 unidades: R$ 140,00', ...Array(N-1).fill('')],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SS_ID,
    range: 'Cotação!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  // Formatação
  const requests = [
    // ─── Merges ───────────────────────────────────────────────
    { mergeCells: { range: rng(0,1,0,N),  mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: rng(1,2,0,N),  mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: rng(9,10,0,N), mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: rng(10,11,1,N),mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: rng(12,13,0,N),mergeType: 'MERGE_ALL' } },

    // ─── Título ───────────────────────────────────────────────
    { repeatCell: { range: rng(0,1,0,N), fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        cell: { userEnteredFormat: { backgroundColor: dark, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 14, foregroundColor: wh } } } } },

    // ─── Subtítulo ────────────────────────────────────────────
    { repeatCell: { range: rng(1,2,0,N), fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        cell: { userEnteredFormat: { backgroundColor: c(0.2,0.2,0.2), horizontalAlignment: 'CENTER',
          textFormat: { fontSize: 9, foregroundColor: c(0.8,0.8,0.8) } } } } },

    // ─── Header ───────────────────────────────────────────────
    { repeatCell: { range: rng(3,4,0,N), fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        cell: { userEnteredFormat: { backgroundColor: dark, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 9, foregroundColor: wh } } } } },

    // ─── Linha 1 (recomendada) ────────────────────────────────
    { repeatCell: { range: rng(4,5,0,N), fields: 'userEnteredFormat(backgroundColor)',
        cell: { userEnteredFormat: { backgroundColor: lgr } } } },

    // ─── Zebra linhas 2, 4 ────────────────────────────────────
    { repeatCell: { range: rng(5,6,0,N), fields: 'userEnteredFormat(backgroundColor)',
        cell: { userEnteredFormat: { backgroundColor: gray } } } },
    { repeatCell: { range: rng(7,8,0,N), fields: 'userEnteredFormat(backgroundColor)',
        cell: { userEnteredFormat: { backgroundColor: gray } } } },

    // ─── Nota técnica ─────────────────────────────────────────
    { repeatCell: { range: rng(10,11,0,N), fields: 'userEnteredFormat(backgroundColor)',
        cell: { userEnteredFormat: { backgroundColor: yel } } } },
    { repeatCell: { range: rng(10,11,0,1), fields: 'userEnteredFormat(textFormat)',
        cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 9 } } } } },

    // ─── Recomendação ─────────────────────────────────────────
    { repeatCell: { range: rng(12,13,0,N), fields: 'userEnteredFormat(backgroundColor,textFormat)',
        cell: { userEnteredFormat: { backgroundColor: lgr,
          textFormat: { bold: true, fontSize: 10 } } } } },

    // ─── Bordas tabela ────────────────────────────────────────
    { updateBorders: { range: rng(3,9,0,N), top: bDark, bottom: bDark, left: bDark, right: bDark, innerHorizontal: bGray, innerVertical: bGray } },
    { updateBorders: { range: rng(4,5,0,N), top: bGreen, bottom: bGreen, left: bGreen, right: bGreen } },

    // ─── Wrap + alinhamento produtos ──────────────────────────
    { repeatCell: { range: rng(4,9,0,N), fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)',
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'MIDDLE',
          textFormat: { fontSize: 9 } } } } },
    { repeatCell: { range: rng(4,9,7,10), fields: 'userEnteredFormat(horizontalAlignment)',
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } } } },

    // ─── Link azul ────────────────────────────────────────────
    { repeatCell: { range: rng(4,9,10,N), fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER',
          textFormat: { foregroundColor: blue, bold: true, fontSize: 9 } } } } },

    // ─── Coluna COMPATÍVEL CPU — destaque ─────────────────────
    { repeatCell: { range: rng(4,9,4,5), fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', textFormat: { bold: true, fontSize: 9 } } } } },

    // ─── Larguras ─────────────────────────────────────────────
    ...[55, 270, 80, 185, 145, 185, 140, 105, 40, 105, 120].map((px, i) => ({
      updateDimensionProperties: { range: { sheetId: SID, dimension: 'COLUMNS', startIndex: i, endIndex: i+1 },
        properties: { pixelSize: px }, fields: 'pixelSize' }
    })),

    // ─── Alturas ──────────────────────────────────────────────
    { updateDimensionProperties: { range: { sheetId: SID, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 50 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: SID, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 28 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: SID, dimension: 'ROWS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 35 }, fields: 'pixelSize' } },

    // ─── Freeze header ────────────────────────────────────────
    { updateSheetProperties: { properties: { sheetId: SID, gridProperties: { frozenRowCount: 4 } }, fields: 'gridProperties.frozenRowCount' } },
  ];

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SS_ID, requestBody: { requests } });

  console.log('Pronto!');
  console.log('https://docs.google.com/spreadsheets/d/' + SS_ID + '/edit');
}

main().catch(e => console.error('Fatal:', e.message));
