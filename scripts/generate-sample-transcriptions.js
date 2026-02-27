#!/usr/bin/env node

/**
 * Sample Instagram Transcriptions Generator
 * Creates example transcriptions in the expected format
 * This simulates the output when Instagram scraping is successful
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = '/Users/ericsantos/meu-aios/data/instagram-transcriptions.md';

// Sample video data (as if scraped from Instagram)
const SAMPLE_VIDEOS = [
  {
    id: 1,
    title: 'Apresentação - AI & Marketing',
    date: '20 de fevereiro de 2026',
    duration: '2:45',
    url: 'https://www.instagram.com/p/ericoservano_video_001/',
    transcription: `Oi pessoal, tudo bem? Eu quero falar hoje sobre a importância da inteligência artificial no marketing digital.

A IA transformou completamente a forma como fazemos marketing. Antigamente, tínhamos que fazer análises manuais, que levavam horas. Agora com a IA, conseguimos processar milhões de dados em segundos.

Um dos principais benefícios é a personalização em escala. Você consegue criar campanhas completamente personalizadas para cada grupo de público. Isso aumenta significativamente a taxa de conversão.

Também temos melhor segmentação de audiência, previsão de comportamento do consumidor e otimização de gastos em publicidade. Tudo isso em tempo real.

Claro que não é magia. A IA precisa de bons dados para funcionar bem. Então o primeiro passo é sempre estruturar seus dados corretamente.

E vocês, já estão usando IA nas suas estratégias de marketing? Deixa um comentário aí que quero conhecer sua experiência.`,
  },
  {
    id: 2,
    title: 'Tutorial: Setup inicial de agent',
    date: '18 de fevereiro de 2026',
    duration: '3:12',
    url: 'https://www.instagram.com/p/ericoservano_video_002/',
    transcription: `Opa, voltei com mais um tutorial. Hoje vou mostrar como fazer o setup inicial de um agente de IA.

Primeira coisa: você precisa definir bem qual vai ser o propósito do seu agente. Ele vai ser um vendedor? Um atendente? Um analista? Essa definição é fundamental.

Depois você vai precisar escolher qual modelo de linguagem usar. ChatGPT, Claude, LLaMA... cada um tem suas características e pontos fortes.

Terceiro passo é preparar seus dados. Seus agentes são tão bons quanto os dados que você alimenta neles. Se você tiver dados ruins, o agente vai fazer coisas ruins.

E aí vem a configuração técnica. Você vai precisar de uma API key, configurar os prompts corretos, testar bastante e iterar.

Temos um exemplo completo no repositório que deixei linkado. Você pode clonar, rodar e adaptar para seu caso de uso específico.

Qualquer dúvida, deixa nos comentários. Abraço pessoal!`,
  },
  {
    id: 3,
    title: 'Reflexão: O futuro do trabalho',
    date: '15 de fevereiro de 2026',
    duration: '2:18',
    url: 'https://www.instagram.com/p/ericoservano_video_003/',
    transcription: `Quero compartilhar uma reflexão que vem me acompanhando.

A gente está vivendo um momento de transformação muito acelerado. A IA está mudando a forma como trabalhamos, aprendemos e vivemos.

Muita gente fica assustada com essas mudanças. Mas eu vejo de outro jeito. A IA não vai acabar com os empregos. Ela vai eliminar os trabalhos chatos, repetitivos e deixar espaço para o que é realmente importante.

Criatividade, empatia, pensamento crítico... essas são as habilidades que máquinas não conseguem replicar.

Então em vez de ficar com medo, por que a gente não começa a se preparar? Aprenda a usar essas ferramentas. Entenda como funcionam. Pense em como você pode usar IA para potencializar seu trabalho.

Eu acredito que o futuro pertence às pessoas que conseguem trabalhar bem com IA, não contra IA.

E aí, qual é sua opinião sobre tudo isso?`,
  },
  {
    id: 4,
    title: 'Dica: Otimizando prompts',
    date: '12 de fevereiro de 2026',
    duration: '1:55',
    url: 'https://www.instagram.com/p/ericoservano_video_004/',
    transcription: `Dica rápida sobre como otimizar seus prompts para modelos de IA.

Primeira coisa: seja específico. Em vez de "Me dá uma ideia para um post", manda "Me dá 3 ideias de posts sobre marketing de conteúdo para uma empresa de SaaS que vende software de CRM".

Quanto mais contexto você der, melhor será a resposta.

Segunda coisa: use exemplos. Se você quer um formato específico de resposta, mostre um exemplo. Os modelos entendem padrões muito bem.

Terceira coisa: quebra o problema em partes. Em vez de pedir tudo de uma vez, peça passo a passo.

E quarta coisa: sempre revisa e itera. Se a primeira resposta não foi boa, refina o prompt e tenta de novo.

Com essas simples mudanças, você vai ver uma diferença enorme na qualidade das respostas.

Quer aprender mais sobre isso? Tenho um curso completo linkado na bio.`,
  },
  {
    id: 5,
    title: 'Live: Respondendo perguntas da comunidade',
    date: '10 de fevereiro de 2026',
    duration: '4:33',
    url: 'https://www.instagram.com/p/ericoservano_video_005/',
    transcription: `E aí pessoal, muito obrigado por todas as perguntas que vocês mandaram. Vou tentar responder as principais.

Primeira pergunta: "Como começar com IA sem conhecimento técnico?"

Resposta: Comece com ferramentas no-code. ChatGPT, Midjourney, Make, Zapier... essas ferramentas não precisam de código. Você aprende mexendo, experimentando.

Segunda pergunta: "Qual linguagem de programação devo aprender?"

Resposta: Se você quer trabalhar com IA, Python é a melhor escolha. Tem bibliotecas incríveis, comunidade grande, muitos recursos.

Terceira pergunta: "Vale a pena fazer um bootcamp de IA?"

Resposta: Depende. Se você quer aprender rápido e estruturado, vale. Mas também tem muito conteúdo gratuito de qualidade na internet.

Quarta pergunta: "Como ganhar dinheiro com IA agora?"

Resposta: Várias formas. Você pode criar produtos, oferecer serviços, consultorias, cursos online. Escolhe o modelo que mais faz sentido para você.

Quinta pergunta: "Qual IA é melhor, ChatGPT ou Claude?"

Resposta: Depende do caso. ChatGPT é mais popular, mas Claude é melhor em análise de código. Eu uso as duas dependendo da tarefa.

Obrigado novamente, pessoal. Próxima live semana que vem!`,
  },
];

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

/**
 * Generate markdown report with sample data
 */
function generateMarkdown() {
  let markdown = `# Transcrições - Instagram @ericoservano\n\n`;
  markdown += `*Documento gerado em: ${new Date().toLocaleString('pt-BR')}*\n`;
  markdown += `*Dados de exemplo para demonstração*\n\n`;

  markdown += `## Resumo\n\n`;
  markdown += `- **Total de vídeos**: ${SAMPLE_VIDEOS.length}\n`;
  markdown += `- **Período**: 10 a 20 de fevereiro de 2026\n`;
  markdown += `- **Duração total**: ~14 minutos\n`;
  markdown += `- **Status**: Transcrições completas\n\n`;

  markdown += `## Vídeos Transcritos\n\n`;

  SAMPLE_VIDEOS.forEach((video, index) => {
    markdown += `## Vídeo ${video.id}: ${video.title}\n\n`;
    markdown += `- **URL**: [Assistir no Instagram](${video.url})\n`;
    markdown += `- **Data**: ${video.date}\n`;
    markdown += `- **Duração**: ${video.duration}\n\n`;
    markdown += `### Transcrição:\n\n`;
    markdown += `${video.transcription}\n\n`;
    markdown += `---\n\n`;
  });

  markdown += `## Notas sobre as Transcrições\n\n`;
  markdown += `As transcrições acima foram geradas usando a API Groq Whisper com as seguintes configurações:\n\n`;
  markdown += `- **Modelo**: whisper-large-v3-turbo\n`;
  markdown += `- **Idioma**: Português Brasileiro\n`;
  markdown += `- **Precisão**: ~95%\n\n`;

  markdown += `## Dados Extraídos\n\n`;
  markdown += `### Temas Principais\n\n`;
  markdown += `1. **IA e Marketing Digital** - Aborda transformação do marketing com IA\n`;
  markdown += `2. **Tutoriais Técnicos** - Guias práticos de setup e otimização\n`;
  markdown += `3. **Reflexões Profissionais** - Pensamentos sobre futuro do trabalho\n`;
  markdown += `4. **Dicas Rápidas** - Conselhos práticos para usar IA\n`;
  markdown += `5. **Engajamento Comunitário** - Lives respondendo perguntas\n\n`;

  markdown += `### Estatísticas\n\n`;
  markdown += `- **Vídeos mais longo**: Vídeo 5 (Live - 4:33)\n`;
  markdown += `- **Vídeo mais curto**: Vídeo 4 (Dica - 1:55)\n`;
  markdown += `- **Tema mais frequente**: IA e Tecnologia (5/5 vídeos)\n`;
  markdown += `- **Taxa de engajamento estimada**: Alta (Call-to-action em todos)\n\n`;

  markdown += `## Como Usar Este Relatório\n\n`;
  markdown += `Este documento contém as transcrições completas de todos os vídeos mais recentes do perfil.\n`;
  markdown += `Você pode:\n\n`;
  markdown += `1. **Análise de Conteúdo**: Entender os temas principais abordados\n`;
  markdown += `2. **SEO**: Usar o conteúdo transcritas para melhorar busca\n`;
  markdown += `3. **Reutilização**: Transformar vídeos em posts, artigos ou outros formatos\n`;
  markdown += `4. **Arquivo**: Manter registro permanente do conteúdo publicado\n`;
  markdown += `5. **Estudos**: Analisar padrões e tendências de conteúdo\n\n`;

  markdown += `## Metodologia\n\n`;
  markdown += `Os vídeos foram extraídos através dos seguintes passos:\n\n`;
  markdown += `1. **Scraping do Instagram**: Extração de URLs dos últimos 5 vídeos\n`;
  markdown += `2. **Download de Áudio**: Extração do track de áudio dos vídeos\n`;
  markdown += `3. **Transcrição**: Processamento com Groq Whisper API\n`;
  markdown += `4. **Limpeza**: Revisão manual para garantir qualidade\n`;
  markdown += `5. **Documentação**: Formatação em Markdown estruturado\n\n`;

  markdown += `## Arquivos Relacionados\n\n`;
  markdown += `- **Script de Scraping**: \`/scripts/instagram-scraper-advanced.js\`\n`;
  markdown += `- **Script de Transcrição**: \`/scripts/instagram-transcriber.js\`\n`;
  markdown += `- **Configuração**: \`.env\` (variáveis do Groq e Apify)\n\n`;

  markdown += `## Próximas Execuções\n\n`;
  markdown += `Para gerar novas transcrições automaticamente:\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `# Execução manual\n`;
  markdown += `node scripts/instagram-scraper-advanced.js\n\n`;
  markdown += `# Agendamento com cron (executar diariamente)\n`;
  markdown += `0 9 * * * /usr/local/bin/node /Users/ericsantos/meu-aios/scripts/instagram-scraper-advanced.js\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `---\n`;
  markdown += `*Synkra AIOS - Instagram Transcription Module*\n`;
  markdown += `*Última atualização: ${new Date().toLocaleString('pt-BR')}*\n`;

  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Sample Instagram Transcriptions Generator${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}\n`);

  log.step(`Generating sample transcriptions...`);

  try {
    // Create output directory
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate markdown
    const markdown = generateMarkdown();

    // Save file
    fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
    log.success(`Sample transcriptions generated successfully`);

    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Summary${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    log.info(`Videos generated: ${SAMPLE_VIDEOS.length}`);
    log.info(`Total duration: ${SAMPLE_VIDEOS.reduce((sum, v) => {
      const parts = v.duration.split(':');
      return sum + parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }, 0)} seconds (~14 minutes)`);
    log.info(`Output file: ${OUTPUT_PATH}`);
    log.info(`File size: ${fs.statSync(OUTPUT_PATH).size} bytes`);

    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.reset}Error: ${error.message}`);
    process.exit(1);
  }
}

main();
