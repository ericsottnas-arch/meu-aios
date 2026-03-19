# PM2 Setup - Sistema Autônomo Completo

**Data:** 27 de fevereiro de 2026
**Status:** ✅ Configurado e Funcionando

## 📋 O que foi implementado

### ✅ Instalação
- PM2 instalado globalmente
- `ecosystem.config.js` criado com 5 processos
- Scripts npm adicionados ao `package.json`
- Diretório `/logs` criado e configurado

### ✅ Processos Orquestrados
1. **nico-telegram** (porta 3000) - Telegram webhook server
2. **nico-whatsapp** (porta 3001) - WhatsApp agent server
3. **celo** (porta 3002) - Celo agent server
4. **alex** (porta 3003) - Alex project manager
5. **ghl-webhook** (porta 3004) - GHL webhook server

### ✅ Recursos Habilitados
- ✅ Auto-restart em caso de falha
- ✅ Limite de memória (500M por processo)
- ✅ Logs centralizados em `/logs/`
- ✅ Logs com timestamp formatado
- ✅ Max 10 restarts automáticos
- ✅ Delay de 5 segundos entre restarts

---

## 🚀 Comandos Disponíveis

### Iniciar/Parar Serviços
```bash
npm run pm2:start      # Inicia todos os 5 serviços
npm run pm2:stop       # Para todos os 5 serviços
npm run pm2:restart    # Reinicia todos os 5 serviços
npm run pm2:reload     # Reload gracioso (zero downtime)
npm run pm2:kill       # Para PM2 daemon completamente
```

### Monitoramento
```bash
npm run pm2:status     # Status de cada processo
npm run pm2:logs       # Mostra logs em tempo real
npm run pm2:monit      # Dashboard interativo (Ctrl+C para sair)
```

### Gerenciamento
```bash
npm run pm2:startup    # Configurar auto-startup no boot
npm run pm2:save       # Salvar configuração em disco
```

---

## ⚙️ Configuração de Boot Automático

### Passo 1: Executar comando do PM2 (REQUER SUDO)
Abra um terminal e execute:

```bash
cd /Users/ericsantos/meu-aios/meu-projeto
sudo env PATH=$PATH:/usr/local/bin /Users/ericsantos/.npm-global/lib/node_modules/pm2/bin/pm2 startup launchd -u ericsantos --hp /Users/ericsantos
```

Você será solicitado pela senha do macOS. Digite a senha e pressione Enter.

### Passo 2: Salvar Configuração
Após confirmar, execute:

```bash
npm run pm2:save
```

### ✅ Resultado
- PM2 iniciará automaticamente no boot do macOS
- Todos os 5 serviços subirão automaticamente
- Logs continuarão sendo registrados em `/logs/`

---

## 📊 Monitoramento de Recursos

### Verificar Uso de Memória
```bash
npm run pm2:status
# Coluna "mem" mostra uso atual
```

### Logs em Tempo Real
```bash
npm run pm2:logs       # Todos os logs
npm run pm2:logs nico-telegram   # Apenas telegram
npm run pm2:logs --err            # Apenas erros
```

### Dashboard Interativo
```bash
npm run pm2:monit
```
Navegue com setas, pressione Ctrl+C para sair.

---

## 📁 Estrutura de Logs

Todos os logs estão em `/meu-projeto/logs/`:

```
logs/
├── nico-telegram.out.log      # Output principal (Telegram)
├── nico-telegram.error.log    # Erros (Telegram)
├── nico-whatsapp.out.log      # Output principal (WhatsApp)
├── nico-whatsapp.error.log    # Erros (WhatsApp)
├── celo.out.log               # Output principal (Celo)
├── celo.error.log             # Erros (Celo)
├── alex.out.log               # Output principal (Alex)
├── alex.error.log             # Erros (Alex)
├── ghl.out.log                # Output principal (GHL)
└── ghl.error.log              # Erros (GHL)
```

**Nota:** O diretório `/logs` está listado em `.gitignore` e não é commitado.

---

## 🔄 Fluxo de Restart Automático

Quando um processo falha:

1. PM2 detecta a falha
2. Aguarda 5 segundos
3. Tenta reiniciar automaticamente
4. Máximo de 10 tentativas por processo
5. Se falhar 10 vezes, PM2 marca como `errored`

**Exemplo:**
```bash
npm run pm2:status
# Se um processo está "stopped" ou "errored", você pode:
pm2 restart <id>        # Reiniciar manualmente
pm2 restart all         # Reiniciar todos
```

---

## 🛑 Parar Tudo Permanentemente

Se você quiser parar todos os serviços:

```bash
npm run pm2:stop       # Para serviços, mas mantém PM2 rodando
npm run pm2:kill       # Para tudo, incluindo PM2 daemon
```

Para remover completamente a configuração de boot:

```bash
pm2 delete all         # Remove todos os processos do PM2
pm2 unstartup         # Remove auto-startup
```

---

## 🔍 Troubleshooting

### Processos não iniciam ao rebootar
1. Verifique se `pm2 startup` foi executado com sucesso
2. Verifique `/Users/ericsantos/.pm2/dump.pm2` existe
3. Execute `npm run pm2:save` novamente

### Logs não aparecem
1. Verifique permissões da pasta `/logs/`:
   ```bash
   ls -la meu-projeto/logs/
   ```
2. Se necessário, ajuste permissões:
   ```bash
   chmod 755 meu-projeto/logs/
   ```

### Um processo está constantemente rearrancando
1. Verifique o arquivo de erro:
   ```bash
   tail -f meu-projeto/logs/[nome].error.log
   ```
2. Procure pela mensagem de erro
3. Corrija o problema no servidor
4. Reinicie: `pm2 restart [nome]`

### PM2 não encontra arquivo
1. Verifique que `ecosystem.config.js` existe:
   ```bash
   ls -la meu-projeto/ecosystem.config.js
   ```
2. Verifique que os servidores existem:
   ```bash
   ls -la meu-projeto/*.js | grep -E "(telegram|whatsapp|celo|alex|ghl)"
   ```

---

## 📝 Observações Importantes

- **Cloudflare Tunnel**: O script `start-nico.sh` que inicia o tunnel pode ser adicionado ao PM2 futuramente se necessário
- **Ambiente**: O arquivo `.env` é carregado automaticamente por PM2 via `env_file: '.env'`
- **CRON Jobs**: Os agendamentos (08h, 20h) continuam funcionando dentro dos servidores
- **Compatibilidade**: PM2 não conflita com os scripts `.sh` existentes

---

## 🎯 Próximos Passos

1. **Imediato:** Execute o comando `sudo` mencionado acima para configurar auto-startup
2. **Verificação:** Após reboot, execute `npm run pm2:status` para confirmar que tudo subiu
3. **Monitoramento:** Use `npm run pm2:monit` regularmente para acompanhar saúde dos processos

---

**Sistema autônomo PRONTO PARA PRODUÇÃO** ✅
