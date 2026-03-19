// test-gabrielle-creatives.js
// Gera 4 criativos de teste para Dra. Gabrielle usando fotos reais do Drive

const path = require('path');
const fs = require('fs');
const { renderCreative, loadBrandConfig } = require('./lib/static-creative-generator');

const PHOTOS_DIR = '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/Clientes/Dra Gabrielle/📸 Imagens';

async function run() {
  const brand = loadBrandConfig('dra-gabrielle');
  const photos = fs.readdirSync(PHOTOS_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`[Test] ${photos.length} fotos encontradas`);
  console.log(`[Test] Brand: ${brand.name} (${brand.handle})\n`);

  const tests = [
    {
      name: 'Test 1 — Before/After + warm-gold',
      config: {
        template: 'before-after',
        preset: 'warm-gold',
        brandId: 'dra-gabrielle',
        photoPath: path.join(PHOTOS_DIR, photos[0]),
        tag: 'LIPO SEM CORTES',
        headline: 'Resultado Real,\nSem Filtro',
        subtitle: 'Método exclusivo em 3 fases que prepara seu corpo antes de tratar a gordura',
        cta: 'AGENDE SUA AVALIAÇÃO',
        outputId: 'gabrielle-test-before-after',
      },
    },
    {
      name: 'Test 2 — Photo Overlay + rose-gold',
      config: {
        template: 'photo-overlay',
        preset: 'rose-gold',
        brandId: 'dra-gabrielle',
        photoPath: path.join(PHOTOS_DIR, photos[2]),
        tag: 'POWER SHAPE',
        headline: 'Desbloqueie o\nResultado do\nSeu Treino',
        subtitle: 'Para quem treina mas a pochete insiste em ficar',
        cta: 'SAIBA MAIS',
        outputId: 'gabrielle-test-photo-overlay',
      },
    },
    {
      name: 'Test 3 — Story + soft-cream',
      config: {
        template: 'story',
        preset: 'soft-cream',
        brandId: 'dra-gabrielle',
        photoPath: path.join(PHOTOS_DIR, photos[4]),
        tag: 'HARMONIZAÇÃO DE GLÚTEO',
        headline: 'Genética Não\nÉ Destino',
        subtitle: 'Preenchimento com ácido hialurônico — resultado natural e imediato',
        cta: 'AGENDE AGORA',
        outputId: 'gabrielle-test-story',
      },
    },
    {
      name: 'Test 4 — Result Card + clinical-white (Ad)',
      config: {
        template: 'result-card',
        preset: 'clinical-white',
        brandId: 'dra-gabrielle',
        photoPath: path.join(PHOTOS_DIR, photos[6]),
        tag: 'LIPO SEM CORTES',
        headline: 'Sem Cortes.\nSem Anestesia.\nResultado Real.',
        subtitle: 'Agende sua avaliação gratuita',
        cta: 'QUERO AGENDAR',
        outputId: 'gabrielle-test-result-card',
      },
    },
  ];

  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    try {
      const output = await renderCreative(test.config);
      console.log(`✅ OK → ${output}`);
    } catch (err) {
      console.error(`❌ ERRO: ${err.message}`);
    }
  }

  console.log('\n[Test] Concluído! Verifique os PNGs em .carousel-temp/gabrielle-test-*/creative.png');
}

run().catch(console.error);
