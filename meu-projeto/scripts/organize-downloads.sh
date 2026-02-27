#!/bin/bash
# Organiza a pasta Downloads por tipo e separa arquivos antigos (90+ dias)
# Uso: bash organize-downloads.sh

set -e
DOWNLOADS="$HOME/Downloads"
cd "$DOWNLOADS"

# Pastas de destino (prefixo numérico para ordem)
DIRS=(
  "01_Documentos"
  "02_Imagens"
  "03_Vídeos"
  "04_Áudio"
  "05_Planilhas_e_CSV"
  "06_Instaladores"
  "07_Compactados"
  "08_Projetos"
  "09_Outras_pastas"
  "10_Arquivos_antigos"
)

# Criar pastas
for d in "${DIRS[@]}"; do
  mkdir -p "$d"
done

# Subpastas em Arquivos_antigos (mesmo esquema)
mkdir -p "10_Arquivos_antigos/01_Documentos"
mkdir -p "10_Arquivos_antigos/02_Imagens"
mkdir -p "10_Arquivos_antigos/03_Vídeos"
mkdir -p "10_Arquivos_antigos/04_Áudio"
mkdir -p "10_Arquivos_antigos/05_Planilhas_e_CSV"
mkdir -p "10_Arquivos_antigos/06_Instaladores"
mkdir -p "10_Arquivos_antigos/07_Compactados"

DAYS_OLD=90
move_file() {
  local src="$1"
  local dest_dir="$2"
  if [[ ! -f "$src" ]]; then return; fi
  local base=$(basename "$src")
  local dest="$dest_dir/$base"
  if [[ -e "$dest" ]]; then
    dest="$dest_dir/${base%.*}_$(date +%s).${base##*.}"
  fi
  mv -n "$src" "$dest" 2>/dev/null || true
}

# Contadores
moved=0
skipped=0

# Processar apenas itens no primeiro nível (arquivos e pastas)
while IFS= read -r -d '' item; do
  name=$(basename "$item")
  # Ignorar pastas de destino e arquivos do sistema
  if [[ "$name" == .DS_Store || "$name" == .localized ]]; then continue; fi
  if [[ "$name" == 01_Documentos || "$name" == 02_Imagens || "$name" == 03_Vídeos || \
        "$name" == 04_Áudio || "$name" == 05_Planilhas_e_CSV || "$name" == 06_Instaladores || \
        "$name" == 07_Compactados || "$name" == 08_Projetos || "$name" == 09_Outras_pastas || \
        "$name" == 10_Arquivos_antigos ]]; then continue; fi

  if [[ -d "$item" ]]; then
    # Pastas: .app -> Instaladores; aios-core, qualifica-lead -> Projetos; resto -> Outras_pastas
    if [[ "$name" == *.app ]]; then
      mv -n "$item" "06_Instaladores/" 2>/dev/null && ((moved++)) || ((skipped++))
    elif [[ "$name" == *aios-core* || "$name" == *qualifica-lead* || "$name" == *-main ]]; then
      mv -n "$item" "08_Projetos/" 2>/dev/null && ((moved++)) || ((skipped++))
    else
      mv -n "$item" "09_Outras_pastas/" 2>/dev/null && ((moved++)) || ((skipped++))
    fi
    continue
  fi

  # Arquivos
  ext=$(echo "${name##*.}" | cut -d'_' -f1 | cut -d'?' -f1 | cut -d'=' -f1 | tr '[:upper:]' '[:lower:]')
  is_old=0
  if [[ -f "$item" ]]; then
    if [[ "$(uname)" == Darwin ]]; then
      mtime=$(stat -f %m "$item" 2>/dev/null || echo 0)
    else
      mtime=$(stat -c %Y "$item" 2>/dev/null || echo 0)
    fi
    now=$(date +%s)
    if (( mtime > 0 && (now - mtime) > (DAYS_OLD * 86400) )); then is_old=1; fi
  fi

  target=""
  case "$ext" in
    pdf|doc|docx|pptx|ppt|odt|ods|odp|pages|numbers|key) target="01_Documentos";;
    jpg|jpeg|png|gif|heic|avif|webp|bmp|tiff|tif|ico|eps) target="02_Imagens";;
    mp4|mov|avi|mkv|webm|m4v) target="03_Vídeos";;
    mp3|opus|m4a|wav|aac|ogg|flac) target="04_Áudio";;
    csv|xls|xlsx) target="05_Planilhas_e_CSV";;
    dmg|pkg) target="06_Instaladores";;
    zip|rar|7z|tar|gz) target="07_Compactados";;
    *) target="01_Documentos";; # html, json, txt, etc. como documentos/outros
  esac

  if [[ -z "$target" ]]; then continue; fi

  if [[ $is_old -eq 1 ]]; then
    target="10_Arquivos_antigos/$target"
  fi
  move_file "$item" "$target" && ((moved++)) || ((skipped++))
done < <(find "$DOWNLOADS" -maxdepth 1 -mindepth 1 \( -type f -o -type d \) -print0 2>/dev/null)

echo "Organização concluída. Itens movidos: $moved (ignorados/erros: $skipped)"
