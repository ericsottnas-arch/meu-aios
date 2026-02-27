#!/usr/bin/env node

const readline = require('readline');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar .env manualmente
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    });
  } catch (error) {
    console.log('⚠️  Arquivo .env não encontrado');
  }
}

loadEnv();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🤖 AIOS> '
});

console.log('\n╔════════════════════════════════════════╗');
console.log('║   🚀 AIOS Terminal CLI - Gemini       ║');
console.log('╚════════════════════════════════════════╝\n');
console.log('📋 Agentes disponíveis:');
console.log('   @analyst    - Análise de negócios');
console.log('   @dev        - Desenvolvimento');
console.log('   @architect  - Arquitetura');
console.log('   @pm         - Product Manager');
console.log('   @qa         - Quality Assurance');
console.log('   @sm         - Scrum Master\n');
console.log('⚡ Comandos especiais:');
console.log('   *help       - Mostrar ajuda');
console.log('   *clear      - Limpar tela');
console.log('   *exit       - Sair\n');
console.log('───────────────────────────────────────\n');

// Verificar se tem chave API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log('❌ ERRO: GEMINI_API_KEY não configurada!');
  console.log('   Configure em: .env\n');
  process.exit(1);
} else {
  console.log('✅ Gemini API configurada!\n');
}

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  
  // Comandos especiais
  if (input === '*exit' || input === 'exit' || input === 'quit') {
    console.log('\n👋 Até logo!\n');
    process.exit(0);
  }
  
  if (input === '*clear') {
    console.clear();
    rl.prompt();
    return;
  }
  
  if (input === '*help') {
    console.log('\n📖 GUIA DE USO:');
    console.log('   @analyst sua pergunta   - Falar com analista');
    console.log('   @dev sua pergunta       - Falar com desenvolvedor');
    console.log('   sua pergunta            - Pergunta geral\n');
    rl.prompt();
    return;
  }
  
  if (!input) {
    rl.prompt();
    return;
  }
  
  // Processar mensagem
  let agent = 'geral';
  let message = input;
  
  // Detectar se tem @agente
  const agentMatch = input.match(/@(\w+)\s+(.+)/);
  if (agentMatch) {
    agent = agentMatch[1];
    message = agentMatch[2];
  }
  
  console.log(`\n⏳ Processando com ${agent}...\n`);
  
  await callGemini(agent, message);
  
  rl.prompt();
  
}).on('close', () => {
  console.log('\n👋 Até logo!\n');
  process.exit(0);
});

// Função para chamar Gemini
async function callGemini(agent, message) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Contextos dos agentes
  const contexts = {
    analyst: 'Você é um analista de negócios experiente, especializado em entender requisitos de usuários e criar documentos de PRD (Product Requirements Document). Seja detalhado e estruturado.',
    dev: 'Você é um desenvolvedor full-stack sênior com expertise em múltiplas linguagens e frameworks. Forneça código limpo e explicações práticas.',
    architect: 'Você é um arquiteto de software especializado em design de sistemas escaláveis, padrões de arquitetura e melhores práticas.',
    pm: 'Você é um Product Manager focado em priorização, roadmap e estratégia de produto.',
    qa: 'Você é um especialista em Quality Assurance, testes automatizados e garantia de qualidade de software.',
    sm: 'Você é um Scrum Master experiente, focado em metodologias ágeis e facilitação de equipes.',
    geral: 'Você é um assistente de IA útil e versátil.'
  };
  
  const context = contexts[agent] || contexts.geral;
  const fullPrompt = `${context}\n\nUsuário: ${message}\n\nResponda de forma clara e útil em português:`;
  
  const postData = JSON.stringify({
    contents: [{
      parts: [{ text: fullPrompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000
    }
  });
  
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.candidates && response.candidates[0]) {
            const reply = response.candidates[0].content.parts[0].text;
            console.log(`┌─────────────────────────────────────`);
            console.log(`│ 🤖 ${agent.toUpperCase()}`);
            console.log(`├─────────────────────────────────────`);
            console.log(reply);
            console.log(`└─────────────────────────────────────\n`);
          } else if (response.error) {
            console.log('❌ Erro da API:', response.error.message);
          } else {
            console.log('❌ Resposta inesperada da API');
            console.log(JSON.stringify(response, null, 2));
          }
          
          resolve();
        } catch (error) {
          console.log('❌ Erro ao processar resposta:', error.message);
          resolve();
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Erro na requisição:', error.message);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// Tratar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Até logo!\n');
  process.exit(0);
});

