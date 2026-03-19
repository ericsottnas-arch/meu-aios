// client-creative-presets.js
// Presets de cores para criativos de estética médica
// Cada preset exporta keys que os templates do static-creative-generator aceitam

const PRESETS = {
  // Dark background + gold accent (default estética premium)
  'warm-gold': {
    bgColor: '#1A1A1A',
    accentColor: '#C9A87C',
    headlineColor: '#F5F0EB',
    subtitleColor: 'rgba(255,255,255,0.7)',
    ctaBorderColor: 'rgba(201,168,124,0.5)',
    ctaColor: 'rgba(255,255,255,0.85)',
    ctaBg: 'transparent',
    overlayTop: 'rgba(0,0,0,0.1)',
    overlayMid: 'rgba(0,0,0,0.05)',
    overlayBot: 'rgba(0,0,0,0.75)',
  },

  // Dark rosé + copper accent (feminino, sofisticado)
  'rose-gold': {
    bgColor: '#1E1518',
    accentColor: '#D4A08A',
    headlineColor: '#F5E6DC',
    subtitleColor: 'rgba(245,230,220,0.7)',
    ctaBorderColor: 'rgba(212,160,138,0.5)',
    ctaColor: 'rgba(245,230,220,0.85)',
    ctaBg: 'transparent',
    overlayTop: 'rgba(30,21,24,0.1)',
    overlayMid: 'rgba(30,21,24,0.05)',
    overlayBot: 'rgba(30,21,24,0.8)',
  },

  // Light background + brown accent (educativo, clean)
  'soft-cream': {
    bgColor: '#FAF6F1',
    accentColor: '#8B7355',
    headlineColor: '#2C2420',
    subtitleColor: 'rgba(44,36,32,0.6)',
    ctaBorderColor: 'rgba(139,115,85,0.4)',
    ctaColor: '#2C2420',
    ctaBg: 'transparent',
    overlayTop: 'rgba(250,246,241,0.3)',
    overlayMid: 'rgba(250,246,241,0.1)',
    overlayBot: 'rgba(250,246,241,0.85)',
  },

  // White background + gold CTA sólido (ads Meta, alta conversão)
  'clinical-white': {
    bgColor: '#FFFFFF',
    accentColor: '#C9A87C',
    headlineColor: '#1A1A1A',
    subtitleColor: 'rgba(26,26,26,0.6)',
    ctaBorderColor: '#C9A87C',
    ctaColor: '#FFFFFF',
    ctaBg: '#C9A87C',
    overlayTop: 'rgba(255,255,255,0.2)',
    overlayMid: 'rgba(255,255,255,0.05)',
    overlayBot: 'rgba(255,255,255,0.85)',
  },

  // Black background + gold bold (premium, impacto)
  'dark-elegance': {
    bgColor: '#0A0A0A',
    accentColor: '#D4AF37',
    headlineColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.65)',
    ctaBorderColor: 'rgba(212,175,55,0.6)',
    ctaColor: '#D4AF37',
    ctaBg: 'transparent',
    overlayTop: 'rgba(0,0,0,0.15)',
    overlayMid: 'rgba(0,0,0,0.1)',
    overlayBot: 'rgba(0,0,0,0.85)',
  },
};

function getPreset(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) throw new Error(`Preset desconhecido: ${presetId}. Disponíveis: ${Object.keys(PRESETS).join(', ')}`);
  return { ...preset };
}

function listPresets() {
  return Object.keys(PRESETS);
}

module.exports = { PRESETS, getPreset, listPresets };
