#!/usr/bin/env node
/**
 * rename-humberto-criativos.js
 * Baixa criativos raw do Drive → transcreve primeiros 30s → extrai hook → renomeia no padrão Syra
 * C{N} [Vídeo] [Hook: {X}] [CTA: Agendar].{ext}
 */

const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const { execSync } = require('child_process');

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
require('dotenv').config({ path: '/home/synkra/meu-aios/.env' });

const { google } = require('googleapis');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getDrive() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

async function downloadFile(fileId, destPath) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    res.data.on('error', reject).pipe(writer).on('finish', resolve).on('error', reject);
  });
}

async function renameFile(fileId, newName) {
  const drive = getDrive();
  await drive.files.update({ fileId, requestBody: { name: newName } });
}

async function trashFile(fileId) {
  const drive = getDrive();
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}

function extractFirst30s(videoPath, audioPath) {
  execSync(
    `ffmpeg -y -i "${videoPath}" -t 30 -vn -ac 1 -ar 16000 -b:a 64k "${audioPath}" 2>/dev/null`,
    { stdio: 'pipe' }
  );
}

async function transcribeSnippet(audioPath) {
  try {
    const file = fs.createReadStream(audioPath);
    const res = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'json',
    });
    return res.text || '';
  } catch (e) {
    console.log(`  ⚠️  Transcrição falhou: ${e.message}`);
    return '';
  }
}

async function extractHook(transcription, procedimento) {
  if (!transcription || transcription.trim().length < 5) {
    return procedimento;
  }
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em criativo de anúncios para médicos. Dado o início de uma transcrição de vídeo, identifique o TIPO DE HOOK usado em 2-4 palavras (ex: "Antes e Depois", "Depoimento de Paciente", "Médico Especialista", "Transformação", "Qualidade de Vida", "Dor do Paciente", "Curiosidade", "Resultado Rápido"). Responda APENAS com o nome do hook, sem explicação.'
        },
        {
          role: 'user',
          content: `Procedimento: ${procedimento}\nInício do vídeo: "${transcription.slice(0, 300)}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });
    return res.choices[0]?.message?.content?.trim() || procedimento;
  } catch (e) {
    // fallback: pegar primeiras palavras significativas
    const words = transcription.split(/\s+/).slice(0, 6).join(' ');
    return words || procedimento;
  }
}

async function processFile(file, counter, procedimento, workDir) {
  const { id, originalName } = file;
  const ext = path.extname(originalName).toLowerCase().replace('.mov', '.mp4');
  const formato = ext === '.jpg' || ext === '.png' ? 'Estático' : 'Vídeo';

  console.log(`\n  [${counter}] ${originalName}`);

  const videoPath = path.join(workDir, `${id}${ext === '.mp4' ? '.mp4' : ext}`);
  const audioPath = path.join(workDir, `${id}.mp3`);

  // Download
  process.stdout.write(`  📥 Baixando...`);
  await downloadFile(id, videoPath);
  const sizeMB = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
  console.log(` ${sizeMB}MB`);

  let hook = procedimento;
  if (formato === 'Vídeo') {
    // Extrair primeiros 30s
    process.stdout.write(`  🎵 Extraindo áudio...`);
    try {
      extractFirst30s(videoPath, audioPath);
      console.log(' ok');
    } catch (e) {
      console.log(` falhou: ${e.message}`);
    }

    if (fs.existsSync(audioPath)) {
      process.stdout.write(`  🎙️  Transcrevendo...`);
      const transcription = await transcribeSnippet(audioPath);
      console.log(transcription ? ` "${transcription.slice(0, 80)}..."` : ' sem áudio');

      process.stdout.write(`  🏷️  Determinando hook...`);
      hook = await extractHook(transcription, procedimento);
      console.log(` "${hook}"`);
    }
  }

  // Gerar novo nome
  const newName = `C${counter} [${formato}] [Hook: ${hook}] [CTA: Agendar]${ext}`;
  process.stdout.write(`  ✏️  Renomeando → ${newName}...`);
  await renameFile(id, newName);
  console.log(' ✅');

  // Limpar temporários
  [videoPath, audioPath].forEach(p => { try { fs.unlinkSync(p); } catch {} });

  return { id, oldName: originalName, newName };
}

// ── Mapa completo de arquivos a processar ────────────────────────────────────

const WORK = [
  {
    procedimento: 'Blefaroplastia',
    folderId: '1zl42NWjUbwBLgj8V1qdqF-AsN3yu5cf_',
    startCounter: 8,
    files: [
      { id: '1IWWNmwl-r-308dZ1Gvq18_FkxUB91L1c', originalName: '58B73F05-5499-4C76-9E25-C6F5947AD04D.MP4' },
    ],
    duplicatesToTrash: [],
  },
  {
    procedimento: 'Lifting Facial',
    folderId: '1faMkepOU_TO11HyxPMninC34k82hqBpz',
    startCounter: 1,
    files: [
      { id: '1R7V6gtMMjFfymtPf2FCKy-4DxXrebRWy', originalName: '61BE67A9-8367-4895-A1DC-F807DB3A967B.MP4' },
      { id: '1vx-GBMQhg7oeSeohdzAQ4bIuO23fvP8r',  originalName: 'copy_4DC9A758-ECC1-4C3F-A087-AAEE62397292.MOV' },
      { id: '1KgYLF7PdbuMH5haCvNWSgdsXE83qE0nr',  originalName: 'copy_C075143D-052C-4A94-B1B9-10354FFA2456.MOV' },
      { id: '1ggkHo2IJPMI6h7DgpCoi27j9yIis9lI1',  originalName: 'copy_EA7DB6BA-AE46-4ECC-B64F-9655DBF23CA1.MOV' },
    ],
    duplicatesToTrash: [],
  },
  {
    procedimento: 'Otoplastia',
    folderId: '1GbYCKK_vUdWX2F_uKuHMLnPzVxjangiQ',
    startCounter: 1,
    files: [
      { id: '1yH4F216SVi5UY28gnPSXWJrQHTLCA4X3', originalName: '205DDAE8-2AEF-47D9-B2EB-70302705EBF3.mp4' },
      { id: '1SKzMhUrBgQ8avgR2OsDQEVG7iH6yMIQ6', originalName: 'F3106135-1121-4D05-95CF-EDC56DC4B1B2.mp4' },
      { id: '1_RoacxUYvXIfxgqSb6Xz13pEJ1RigqRg',  originalName: 'INSTITUTO HR.mp4' },
    ],
    duplicatesToTrash: [],
  },
  {
    procedimento: 'Rinoplastia',
    folderId: '1T2zDOYWhOVvsQrnhTDSse8W5UwqkeQIb',
    startCounter: 1,
    files: [
      { id: '10RaOpbKwBEUj67X6kSGLp_MN1gCldLxl', originalName: '22873702-6C90-4282-9CE7-AE2849D4FAE7.mp4' },
      { id: '1y6l4K7-zGILljlnyo_-Y2NvoQWx7N2kH',  originalName: '3D99D52F-22F4-4EC0-99BD-6A5E639A6552.mp4' },
      { id: '18bxMNr6dTIn-6YkeouGJw1bpV5fp5yGJ',  originalName: '6E05D6BF-AC6B-4F0F-837E-551A852DCBB9.MP4' },
      { id: '14J5GW8kW8XDfF0zwKshD2f9r0erpFwBv',  originalName: '725D1A59-D9FD-478E-96C6-160AB779B956.mp4' },
      { id: '1QcymRAtwTtTjl8C0ohWziMol0u0l69_p',  originalName: '86028917-3E94-4E38-8366-9CEBCC406FE2.mp4' },
      { id: '1sV8mIzeOPygWNJsG46andpJZK-GMzzNn',  originalName: '94513C2E-4B24-4C8A-9348-4E21ED60FDD7.mp4' },
      { id: '1ewIui62p6fERcCSRuKAxLJEFuZtk2TsI',  originalName: '978C9C2D-4C26-4F4E-8F87-FD526FAF13D7.mp4' },
      { id: '1ErkWEKzUpMaJ9B5Wx5k9LHwg9ig3NzpB',  originalName: 'copy_6E85E1DB-DFC5-400F-B376-FAE726800B02.mov' },
      { id: '1LxOuBi7MGJp3b1mMbIxW8BK1zeQZuyVb',  originalName: 'copy_7E836B81-5F21-4DDF-805A-976BAE68FB76.mov' },
      { id: '16CObAwdCVXzCzdC0fZqKcVOD8FjoOSS1',  originalName: 'copy_80D8AB9E-DE80-4572-9572-60FF642B0CA7.mov' },
      { id: '1LUf5AvCHkfBRSt6hx7B2jvAulXHnaW-W',  originalName: 'doutores_da_face_002_1776264736067.mp4' },
    ],
    duplicatesToTrash: [
      '1hauF06ZA5ZI958duYqsJyleX7L0gP9_p',  // 22873702 dup
      '1TFaByrKyvAtoCBsVxOVlE1se4qqMWLv6',  // 725D1A59 dup
      '1pkQCipZbhC_-2FonqJt_HdU64aitmEJi',  // 94513C2E dup
      '1glh0CrxD-ZBcVVU8H6evHe06Qg3iQh-z',  // 978C9C2D dup
      '1qEcmX2qof93fWK-36PfokT9SU3UhGWEa',  // 6E05D6BF dup
    ],
  },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const workDir = path.join(os.tmpdir(), 'humberto-criativos-' + Date.now());
  fs.mkdirSync(workDir, { recursive: true });

  const results = [];

  for (const folder of WORK) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📁 ${folder.procedimento}`);
    console.log(`${'═'.repeat(60)}`);

    // 1. Trashing duplicatas
    if (folder.duplicatesToTrash.length > 0) {
      console.log(`\n🗑️  Removendo ${folder.duplicatesToTrash.length} duplicata(s)...`);
      for (const dupId of folder.duplicatesToTrash) {
        try {
          await trashFile(dupId);
          console.log(`  ✅ Deletado: ${dupId}`);
        } catch (e) {
          console.log(`  ⚠️  Falhou ao deletar ${dupId}: ${e.message}`);
        }
      }
    }

    // 2. Processar arquivos
    let counter = folder.startCounter;
    for (const file of folder.files) {
      try {
        const result = await processFile(file, counter, folder.procedimento, workDir);
        results.push({ pasta: folder.procedimento, ...result });
        counter++;
        // Pausa para não sobrecarregar Groq
        if (counter <= folder.startCounter + folder.files.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (e) {
        console.log(`  ❌ Erro: ${e.message}`);
        results.push({ pasta: folder.procedimento, id: file.id, oldName: file.originalName, error: e.message });
        counter++;
      }
    }
  }

  // Limpar workDir
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}

  // Relatório final
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 RELATÓRIO FINAL');
  console.log(`${'═'.repeat(60)}`);
  const ok     = results.filter(r => !r.error);
  const errors = results.filter(r => r.error);
  console.log(`✅ Renomeados: ${ok.length}`);
  if (errors.length) {
    console.log(`❌ Erros: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e.oldName}: ${e.error}`));
  }
  console.log('\nCriativos renomeados:');
  ok.forEach(r => console.log(`  [${r.pasta}] ${r.oldName} → ${r.newName}`));
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
