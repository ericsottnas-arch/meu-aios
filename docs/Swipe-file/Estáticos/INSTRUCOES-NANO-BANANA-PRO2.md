# 🎨 Instruções Nano Banana Pro 2 - Paciente Portfólio

## Resumo Executivo
Replicar estilo **Belle Fernandes** com seu paciente. O JSON contém TODAS as especificações visuais necessárias.

---

## ✅ Checklist PRÉ-EXECUÇÃO

- [ ] Foto do paciente em alta resolução (min. 1080px largura)
- [ ] Background removido (transparente ou branco)
- [ ] Iluminação clara (frontal ou soft natural)
- [ ] Foto centralizada (headshot + ombros)
- [ ] Ter JSON `prompt-paciente-portfólio.json` aberto

---

## 📋 PROMPT PARA NANO BANANA PRO 2

### Opção 1: Usar JSON Direto (RECOMENDADO)

```bash
# Substitua [CAMINHO_FOTO] pelo caminho da foto do seu paciente
# Substitua [CAMINHO_JSON] pelo caminho do JSON

curl -X POST "https://api.banana.dev/predict" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @prompt-paciente-portfólio.json \
  --data-raw '{
    "image_path": "[CAMINHO_FOTO]",
    "prompt_json": true,
    "config_file": "[CAMINHO_JSON]"
  }'
```

---

### Opção 2: Integração com Python

```python
import json
import requests
from pathlib import Path

# Load configuration
with open('prompt-paciente-portfólio.json', 'r') as f:
    config = json.load(f)

# Load patient photo
photo_path = "caminho/para/foto_paciente.jpg"

payload = {
    "image": open(photo_path, 'rb'),
    "design_config": json.dumps(config, ensure_ascii=False),
    "output_format": "png",
    "quality": "maximum"
}

response = requests.post(
    "https://api.banana.dev/predict",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files=payload
)

# Salvar resultado
output = response.json()
with open('paciente-portfólio-output.png', 'wb') as f:
    f.write(output['image_data'])
```

---

### Opção 3: Prompt de Texto Simples

Se o Nano Banana Pro 2 usar interface de texto simples:

```
Crie uma imagem estilo portfolio antes/depois com as seguintes especificações:

🎨 DESIGN:
- Fundo: #0d0d0f (preto profundo com vignette suave)
- Cores acentos: #d6ba9e (rose/taupe warm), #c9a876 (gold)
- Cores texto: #f5f0eb (cream)

📝 TIPOGRAFIA:
TÍTULO (em maiúsculas, 140px):
- Font: Playfair Display 900 italic
- Texto: "PACIENTE PORTFÓLIO"
- Cor: #d6ba9e
- Espaçamento: 8px entre letras

Subtítulo superior (18px, Montserrat 600):
- Texto: "// PACIENTE PORTFÓLIO | RESULTADO&TRANSFORMAÇÃO"
- Cor: #d6ba9e

Subtítulo oferta (24px, Montserrat 500):
- Texto: "Você paga apenas os custos dos materiais."
- Cor: #f5f0eb

CTA (20px, Montserrat 600, center bottom):
- Texto: "Envie \"Eu quero\" para confirmar"
- Cor: #f5f0eb

📸 FOTO:
- Posicionar à direita (lado direito do canvas)
- Headshot do paciente até ombros
- Ângulo: frontal ou 45° suave
- Sem background (transparente)
- Aplicar glow subtil (#d6ba9e, 15% opacity) ao redor

🔵 ZOOM CIRCLES:
- 3 círculos com stroke #d6ba9e (3px)
- Circle 1: lower left, 160px diameter, zoom 2.0x cheek esquerdo
- Circle 2: right side, 180px diameter, zoom 2.2x olho direito
- Circle 3: lower right, 170px diameter, zoom 2.1x detalhe bochecha

✨ EFEITOS:
- Vignette suave (radius 1.5, darkness 40%, feather 200px)
- Glow subtil ao redor (blur 40px)
- Highlight estratégico (maçãs do rosto, debaixo dos olhos)
- Speech bubble com pergunta: "Resultado transformado?" (fundo cream #f5f0eb)

⚡ IMPORTANTE:
✓ Manter 100% de autenticidade do paciente
✓ Não distorcer características naturais
✓ Se há resultado, mostrar DIFERENÇA REAL
✓ Cores EXATAS da paleta
✓ Tipografia EXATA (Playfair 900 italic)
✓ Layout deve corresponder à referência (sem desvios)
```

---

## 🖼️ LAYOUT VISUAL RESUMIDO

```
┌─────────────────────────────────────────┐
│ // PACIENTE PORTFÓLIO | RESULTADO...   │ (18px, top)
│                                         │
│ PACIENTE PORTFÓLIO                   📸 │ (140px Playfair italic)
│ (título grande à esquerda)           📸 │
│                                      📸 │
│ Você paga apenas os                     │ (24px)
│ custos dos materiais.               [🔵]│
│                                         │
│ [Speech Bubble]                     [🔵]│
│ "Resultado transformado?"               │
│                                         │
│                                     [🔵]│
│                                         │
│ Envie "Eu quero" para confirmar         │ (bottom, 20px)
└─────────────────────────────────────────┘
```

---

## ⚠️ CRITICAL RULES (Não desobedeça)

### ❌ NÃO FAZER:
1. ❌ Usar modelo genérico - DEVE ser o paciente real
2. ❌ Distorcer características - manter natural
3. ❌ Cores fora da paleta - #0d0d0f, #f5f0eb, #d6ba9e
4. ❌ Fonte diferente de Playfair 900 italic - não substituir
5. ❌ Resultado fake/filtrado - mostrar diferença real
6. ❌ Vignette dramático - SUAVE
7. ❌ Glow óbvio - SUBTIL (profissional)

### ✅ MUST HAVE:
1. ✅ Foto real do paciente (reconhecível)
2. ✅ 3 zoom circles com stroke #d6ba9e
3. ✅ Paleta exata (#0d0d0f, #f5f0eb, #d6ba9e)
4. ✅ Título em Playfair 900 italic, maiúsculas
5. ✅ Speech bubble com pergunta
6. ✅ CTA visível no bottom
7. ✅ Efeitos suaves (vignette, glow)

---

## 🔄 PROCESSO INTEGRIDADE PACIENTE

### Se Modificar Foto:

**PRESERVAR:**
- ✓ Tom de pele autêntico
- ✓ Formato natural do rosto
- ✓ Características únicas (marcas, cicatrizes relevantes)
- ✓ Simetria natural (não artificial)
- ✓ Aparência etária

**PERMITIDO REALÇAR:**
- ✓ Luminosidade (reequilíbrio)
- ✓ Brilho natural (glow profissional)
- ✓ Contraste olhos
- ✓ Tom uniforme (se relevante)

**NUNCA FAZER:**
- ✗ Facial reconstruction
- ✗ Adicionar features inexistentes
- ✗ Remover características importantes
- ✗ Criar resultado impossível
- ✗ Parecer filtrado/irreal

---

## 📦 SAÍDA ESPERADA

**Formato:** PNG
**Resolução:** 1080x1350 px
**Cor Profile:** sRGB
**Background:** #0d0d0f
**Qualidade:** Maximum

---

## 🚀 WORKFLOW PRÁTICO

### Passo 1: Preparar Foto
```bash
# Usar Photoshop, GIMP ou online tool para:
# 1. Remover background (ou deixar branco)
# 2. Centralizar headshot
# 3. Exportar como PNG 1080px mínimo
```

### Passo 2: Executar Nano Banana
```python
# Use o script Python (Opção 2 acima)
python gerar-portfólio.py --patient "Dr. Erico" --photo "erico.png"
```

### Passo 3: Validar Output
- [ ] Foto reconhecível?
- [ ] Cores corretas?
- [ ] Título em maiúsculas?
- [ ] 3 circles presentes?
- [ ] Texto legível?
- [ ] Efeitos suaves?

### Passo 4: Otimizar
Se precisar ajustes, edite JSON e execute novamente.

---

## 🎯 EXEMPLOS DE USO

### Exemplo 1: Dr. Erico Servano
```json
{
  "patient_name": "Dr. Erico Servano",
  "photo_path": "docs/clientes/dr-erico/assets/headshot.png",
  "treatment_type": "Resultado Premium"
}
```

### Exemplo 2: Dra. Vanessa Soares
```json
{
  "patient_name": "Dra. Vanessa Soares",
  "photo_path": "docs/clientes/dra-vanessa/assets/transformacao.png",
  "treatment_type": "Antes/Depois Transformação"
}
```

---

## 💡 DICAS PRO

1. **Iluminação:** Quanto melhor a foto original, melhor o resultado
2. **Fundo:** Remova background para máxima clareza
3. **Resolução:** Use mínimo 1080px de largura
4. **Teste:** Faça um teste com foto genérica antes do paciente real
5. **Feedback:** Se resultado não atender, ajuste JSON e reexecute

---

## 🔗 ARQUIVOS RELACIONADOS

- `prompt-paciente-portfólio.json` - Configuração completa (USAR ESTE)
- Pasta: `docs/clientes/` - Fotos dos pacientes
- Pasta: `docs/Swipe-file/Estáticos/` - Outputs gerados

---

## 📞 SUPORTE

Se o Nano Banana Pro 2 retornar erro:

1. Verifique formato da foto (PNG/JPG)
2. Verifique resolução mínima (1080px)
3. Valide JSON (sem caracteres especiais quebrados)
4. Tente com foto menor primeiro (teste)
5. Confira API key/token

---

**Última atualização:** 26/02/2026
**Status:** Pronto para Produção ✅
