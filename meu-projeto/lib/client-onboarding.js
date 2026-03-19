/**
 * Client Onboarding — Orquestrador de 8 steps para onboarding automatizado.
 *
 * Cada step é independente e retryable. Se um falhar, continua pro próximo
 * (graceful degradation). O context acumula resultados entre steps.
 */

const fs = require('fs');
const path = require('path');
const stevo = require('./stevo');
const clickup = require('./clickup');
const driveAccess = require('./drive-access');

// Números fixos que entram em TODOS os grupos de onboarding (Syra team)
// O bot Stevo (5511947835619) já entra automaticamente como criador/SuperAdmin
const SYRA_FIXED_NUMBERS = ['5511966137112'];
const DOCS_BASE = path.resolve(__dirname, '..', '..', 'docs', 'clientes');
const CONFIG_PATH = path.resolve(DOCS_BASE, 'CLIENTES-CONFIG.json');

const GROUP_DESCRIPTION = `🚀 Growth Performance | Syra Digital 💚

Bem-vindos ao hub central do nosso projeto! Para garantir o alinhamento de todos e o histórico das decisões, concentre toda a comunicação por aqui e evite mensagens no privado.`;

function getWelcomeMessage(driveLink) {
  return `Faaala, turma! O seguinte, agora que estamos oficialmente juntos, tenho alguns recados gerais pra repassar e informações/documentos que precisamos:

Primeira e mais importante… É de suma importância que a comunicação se mantenha dentro do grupo. Dessa maneira, todos conseguem ter uma visualização clara do que está acontecendo.

O que preciso de vocês inicialmente:

1. Compartilhem o link de fotos profissionais. Podem ser em Drive, OneDrive ou iCloud.
2. Enviar as logos e suas variações, juntamente com a identidade visual da marca (caso não tenham, me avisem).
3. Enviar os números de WhatsApp/telefone que temos para suporte, atendimento, comercial e outras áreas.
4. Acesso com login e senha das hospedagens e domínios.
5. Pedir para o time de tráfego adicionar o e-mail ericsottnas@gmail.com como um novo parceiro da conta de anúncios, com acesso total (tanto Google quanto Meta Ads).
6. Enviar apresentações comerciais, portfólios, antes e depois e resultados de pacientes dentro do Drive abaixo. Dessa forma, teremos documentados todos os materiais para construção de novos anúncios.

Pasta do cliente:
${driveLink}`;
}

const SUBTASK_TITLES = [
  'Compartilhar fotos profissionais (Drive, OneDrive ou iCloud)',
  'Enviar logos e identidade visual da marca',
  'Enviar números de WhatsApp/telefone (suporte, atendimento, comercial)',
  'Enviar acesso às hospedagens e domínios',
  'Adicionar ericsottnas@gmail.com como parceiro nas contas de anúncios (Google + Meta Ads)',
  'Enviar materiais comerciais (portfólios, antes/depois, resultados) na pasta do Drive',
];

/**
 * Converte nome do cliente em ID slug.
 * "Dra. Bruna Nogueira" → "dra-bruna-nogueira"
 */
function clientNameToId(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Steps individuais
// ============================================================

async function stepDrive(input, context) {
  const result = driveAccess.createClientFolder(input.clientName);
  context.drivePath = result.path;
  context.driveCreated = result.created;

  // Aguardar sync do Google Drive e extrair link compartilhável
  const driveLink = await driveAccess.getDriveFolderLink(result.path, 15000);
  if (driveLink) {
    // Extrair folderId e definir permissão "Qualquer pessoa com o link pode editar"
    const folderId = driveLink.split('/folders/')[1];
    try {
      context.driveLink = await driveAccess.shareFolderAsPublicEditor(folderId);
    } catch (err) {
      console.warn('⚠️  Não conseguiu definir permissão pública no Drive:', err.message);
      context.driveLink = driveLink; // usa link sem permissão pública
    }
  }

  const msg = result.created ? 'Pasta criada' : 'Pasta já existia';
  return { success: true, message: context.driveLink ? `${msg} (compartilhada: ${context.driveLink})` : `${msg} (link pendente — sync do Drive não completou)` };
}

async function stepCreateGroup(input, context) {
  // clientPhone = stakeholder (principal), clientPhones = todos os números do cliente
  const clientPhones = input.clientPhones || [input.clientPhone];
  const allParticipants = [...new Set([...SYRA_FIXED_NUMBERS, ...clientPhones])];

  const result = await stevo.createGroup(
    `${input.clientName} × Syra Digital`,
    allParticipants
  );
  // API retorna { data: { jid: "...@g.us" }, message: "success" }
  context.groupJid = result?.data?.jid || result?.groupJid || result?.id;
  if (!context.groupJid) throw new Error('Resposta sem groupJid: ' + JSON.stringify(result));

  const added = result?.data?.added?.length || 0;
  const failed = result?.data?.failed?.length || 0;
  return { success: true, message: `Grupo criado: ${context.groupJid} (${added} adicionados${failed ? `, ${failed} falharam` : ''})` };
}

async function stepPromoteAdmins(input, context) {
  if (!context.groupJid) throw new Error('groupJid não disponível');
  // Promover: Eric pessoal + stakeholder (contato principal do cliente)
  const toPromote = [...new Set([...SYRA_FIXED_NUMBERS, input.clientPhone])];
  await stevo.updateGroupParticipants(context.groupJid, 'promote', toPromote);
  return { success: true, message: `${toPromote.join(', ')} promovidos a admin` };
}

async function stepGroupPhoto(input, context) {
  if (!context.groupJid) throw new Error('groupJid não disponível');
  const photoPath = path.resolve(__dirname, '..', 'public', 'syra-group-photo.jpg');
  const imageBase64 = fs.readFileSync(photoPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imageBase64}`;
  await stevo.setGroupPhoto(context.groupJid, dataUri);
  return { success: true, message: 'Foto do grupo definida' };
}

async function stepDescribeGroup(input, context) {
  if (!context.groupJid) throw new Error('groupJid não disponível');
  await stevo.setGroupDescription(context.groupJid, GROUP_DESCRIPTION);
  return { success: true, message: 'Descrição definida' };
}

async function stepWelcome(input, context) {
  if (!context.groupJid) throw new Error('groupJid não disponível');
  const driveLink = context.driveLink || input.driveLink || '[Link será adicionado pelo Eric]';
  const text = getWelcomeMessage(driveLink);
  await stevo.sendText(context.groupJid, text);
  return { success: true, message: driveLink.startsWith('http') ? 'Boas-vindas enviada com link do Drive' : 'Boas-vindas enviada (link do Drive pendente)' };
}

async function stepClickupList(input, context) {
  // Criar uma nova Lista dedicada para o cliente no Folder "Clientes"
  // com os mesmos statuses Kanban do padrão Syra
  const list = await clickup.createClientList(input.clientName);
  context.clickupListId = list.id;
  context.clickupListUrl = list.url;
  return { success: true, message: `Lista criada: ${list.name} (${list.id})` };
}

async function stepClickupTask(input, context) {
  if (!context.clickupListId) throw new Error('clickupListId não disponível');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const task = await clickup.createTaskInList(context.clickupListId, {
    title: `[ONBOARDING] ${input.clientName}`,
    description: `Onboarding do cliente ${input.clientName}.\n\nTelefone: ${input.clientPhone}\n${input.clientInstagram ? `Instagram: ${input.clientInstagram}\n` : ''}${input.clientEmail ? `Email: ${input.clientEmail}\n` : ''}\nPasta Drive: ${context.drivePath || 'N/A'}\nLink Drive: ${context.driveLink || 'N/A'}\nGrupo WhatsApp: ${context.groupJid || 'N/A'}`,
    priority: 2,
    dueDateMs: dueDate.getTime(),
  });

  context.taskId = task.id;
  context.taskUrl = task.url;

  // Criar subtarefas na lista do cliente
  const subtasks = await clickup.createSubtasksInList(context.clickupListId, task.id, SUBTASK_TITLES);
  context.subtaskCount = subtasks.length;

  return { success: true, message: `Tarefa criada: ${task.url} (${subtasks.length} subtarefas)` };
}

async function stepDocs(input, context) {
  const clientId = clientNameToId(input.clientName);
  const clientDocsPath = path.join(DOCS_BASE, clientId);

  // Criar pasta local docs/clientes/{id}/
  if (!fs.existsSync(clientDocsPath)) {
    fs.mkdirSync(clientDocsPath, { recursive: true });
  }

  // Gerar README.md
  const readme = `# ${input.clientName}

## Dados do Cliente

| Campo | Valor |
|-------|-------|
| **Nome** | ${input.clientName} |
| **Telefone** | ${input.clientPhone} |
| **Instagram** | ${input.clientInstagram || 'N/A'} |
| **Email** | ${input.clientEmail || 'N/A'} |
| **Especialidade** | ${input.specialty || 'A definir'} |
| **Localização** | ${input.location || 'A definir'} |
| **Prioridade** | ${input.priority || 'standard'} |

## Integrações

| Integração | Valor |
|------------|-------|
| **Pasta Drive** | ${context.drivePath || 'N/A'} |
| **Grupo WhatsApp** | ${context.groupJid || 'N/A'} |
| **Tarefa ClickUp** | ${context.taskUrl || 'N/A'} |
| **Data Onboarding** | ${new Date().toISOString().split('T')[0]} |

## Status

- [x] Onboarding iniciado
- [ ] Documentos recebidos
- [ ] Identidade visual recebida
- [ ] Acesso às plataformas de ads
- [ ] Primeira campanha criada
`;

  fs.writeFileSync(path.join(clientDocsPath, 'README.md'), readme);

  // Atualizar CLIENTES-CONFIG.json
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (!config.clients[clientId]) {
      config.clients[clientId] = {
        id: clientId,
        name: input.clientName,
        status: 'active',
        priority: input.priority || 'standard',
        location: input.location || '',
        contact: {
          phone: input.clientPhone,
          instagram: input.clientInstagram || '',
          email: input.clientEmail || '',
        },
        specialty: input.specialty || '',
        integrations: {
          groupJid: context.groupJid || '',
          clickupListId: context.clickupListId || '',
          clickupListUrl: context.clickupListUrl || '',
          driveLink: context.driveLink || '',
        },
        paths: {
          folder: `docs/clientes/${clientId}`,
          readme: `docs/clientes/${clientId}/README.md`,
        },
      };
      config.summary.totalClients = Object.keys(config.clients).length;
      config.summary.activeClients = Object.values(config.clients).filter(c => c.status === 'active').length;
      config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }
  } catch (err) {
    console.warn('⚠️  Erro ao atualizar CLIENTES-CONFIG.json:', err.message);
  }

  context.docsPath = clientDocsPath;
  return { success: true, message: `Docs criados em ${clientId}/` };
}

async function stepNotify(input, context) {
  // Esta função retorna o resumo — o caller (Alex) é quem envia no Telegram
  const lines = [
    `✅ *Onboarding Completo: ${input.clientName}*`,
    '',
  ];
  if (context.drivePath) lines.push(`📁 Pasta Drive: criada`);
  if (context.groupJid) lines.push(`💬 Grupo WhatsApp: ${context.groupJid}`);
  if (context.taskUrl) lines.push(`📋 ClickUp: ${context.taskUrl}`);
  if (context.docsPath) lines.push(`📄 Docs: docs/clientes/${clientNameToId(input.clientName)}/`);

  if (context.errors && context.errors.length > 0) {
    lines.push('');
    lines.push('⚠️ *Steps com erro:*');
    for (const err of context.errors) {
      lines.push(`  • ${err.step}: ${err.message}`);
    }
  }

  context.summary = lines.join('\n');
  return { success: true, message: 'Resumo gerado' };
}

// ============================================================
// Orquestrador
// ============================================================

const STEPS = [
  { id: 'drive', label: 'Pasta Google Drive', fn: stepDrive },
  { id: 'group', label: 'Grupo WhatsApp', fn: stepCreateGroup },
  { id: 'promote', label: 'Promover admins', fn: stepPromoteAdmins },
  { id: 'photo', label: 'Foto do grupo', fn: stepGroupPhoto },
  { id: 'describe', label: 'Descrição do grupo', fn: stepDescribeGroup },
  { id: 'welcome', label: 'Mensagem de boas-vindas', fn: stepWelcome },
  { id: 'clickup-list', label: 'Lista ClickUp do cliente', fn: stepClickupList },
  { id: 'clickup-task', label: 'Tarefa de onboarding', fn: stepClickupTask },
  { id: 'docs', label: 'Documentação local', fn: stepDocs },
  { id: 'notify', label: 'Resumo final', fn: stepNotify },
];

/**
 * Executa o onboarding completo.
 * @param {Object} input - Dados do cliente
 * @param {function} [onProgress] - Callback (stepIndex, totalSteps, stepLabel, status)
 * @returns {Promise<{context: Object, results: Array}>}
 */
async function runOnboarding(input, onProgress) {
  const context = { errors: [] };
  const results = [];

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (onProgress) {
      onProgress(i, STEPS.length, step.label, 'running');
    }

    try {
      const result = await step.fn(input, context);
      results.push({ step: step.id, ...result });
      if (onProgress) {
        onProgress(i, STEPS.length, step.label, 'done');
      }
    } catch (err) {
      console.error(`❌ Onboarding step "${step.id}" falhou:`, err.message);
      context.errors.push({ step: step.id, message: err.message });
      results.push({ step: step.id, success: false, message: err.message });
      if (onProgress) {
        onProgress(i, STEPS.length, step.label, 'error');
      }
    }
  }

  return { context, results };
}

module.exports = {
  runOnboarding,
  clientNameToId,
  STEPS,
};
