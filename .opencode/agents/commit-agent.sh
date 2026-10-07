#!/usr/bin/env bash
# Commit Agent - Implementation Script
# Uso: .opencode/agents/commit-agent.sh [--message-only] [--no-verify]

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración por defecto
MESSAGE_ONLY=false
NO_VERIFY=false
BRANCH_PREFIXES=("feat" "fix" "chore" "docs" "refactor" "test" "perf" "ci" "build" "revert")
TICKET_PATTERN="REQ-[0-9]+"
MAX_SUMMARY_LENGTH=72
DUPLICATE_THRESHOLD=80
RUN_LINT=true
RUN_TESTS=true
INTERACTIVE_STAGING=true

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --message-only) MESSAGE_ONLY=true; shift ;;
        --no-verify) NO_VERIFY=true; shift ;;
        *) echo "Uso: $0 [--message-only] [--no-verify]"; exit 1 ;;
    esac
done

# Funciones utilitarias
log_info() { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }
log_step() { echo -e "${CYAN}▶${NC} $*"; }

# Levenshtein distance para detección de duplicados
levenshtein() {
    local s1="$1" s2="$2"
    local len1=${#s1} len2=${#s2}
    local -a d
    for ((i=0; i<=len1; i++)); do d[i*((len2+1))]=$i; done
    for ((j=0; j<=len2; j++)); do d[j]=$j; done
    for ((i=1; i<=len1; i++)); do
        for ((j=1; j<=len2; j++)); do
            local cost=0
            [[ "${s1:i-1:1}" != "${s2:j-1:1}" ]] && cost=1
            local a=$((d[(i-1)*(len2+1)+j] + 1))
            local b=$((d[i*(len2+1)+j-1] + 1))
            local c=$((d[(i-1)*(len2+1)+j-1] + cost))
            local min=$a
            (( b < min )) && min=$b
            (( c < min )) && min=$c
            d[i*(len2+1)+j]=$min
        done
    done
    echo ${d[len1*(len2+1)+len2]}
}

# Similaridad porcentual
similarity() {
    local s1="$1" s2="$2"
    local dist=$(levenshtein "$s1" "$s2")
    local maxlen=${#s1}
    (( ${#s2} > maxlen )) && maxlen=${#s2}
    (( maxlen == 0 )) && echo 100 || echo $(( 100 - (dist * 100 / maxlen) ))
}

# Obtener tipo de commit desde rama
get_commit_type_from_branch() {
    local branch=$(git branch --show-current 2>/dev/null || echo "")
    if [[ -z "$branch" ]]; then
        return 1
    fi
    for prefix in "${BRANCH_PREFIXES[@]}"; do
        if [[ "$branch" =~ ^${prefix}/(${TICKET_PATTERN})(.*)$ ]]; then
            echo "${prefix}/${BASH_REMATCH[1]}"
            return 0
        fi
    done
    return 1
}

# Preguntar tipo de commit interactivamente
ask_commit_type() {
    echo -e "\n${CYAN}No se pudo detectar el tipo desde la rama.${NC}"
    echo "Selecciona el tipo de commit:"
    local options=("feat" "fix" "chore" "docs" "refactor" "test" "perf" "ci" "build" "revert")
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[i]}"
    done
    read -p "Opción [1-${#options[@]}]: " choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#options[@]} )); then
        local type="${options[choice-1]}"
        read -p "Ticket ID (ej: REQ-001): " ticket
        if [[ "$ticket" =~ ^${TICKET_PATTERN}$ ]]; then
            echo "${type}/${ticket}"
            return 0
        fi
    fi
    return 1
}

# Obtener resúmenes de commits previos en la rama
get_previous_summaries() {
    local base_branch=$(git merge-base HEAD $(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||') 2>/dev/null || echo "main")
    git log --oneline "${base_branch}..HEAD" 2>/dev/null | while IFS= read -r line; do
        # Extraer resumen después de "tipo/REQ-XXX: "
local pattern='^[a-f0-9]+ [a-z]+/[A-Z]+-[0-9]+: (.+)$'
    if [[ "$line" =~ $pattern ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
    done
}

# Verificar duplicados
check_duplicates() {
    local proposed_summary="$1"
    local duplicates=()
    local prev_summary=""
    while IFS= read -r prev_summary; do
        [[ -z "$prev_summary" ]] && continue
        local sim=$(similarity "$proposed_summary" "$prev_summary")
        if (( sim >= DUPLICATE_THRESHOLD )); then
            duplicates+=("$prev_summary ($sim%)")
        fi
    done < <(get_previous_summaries)
    if (( ${#duplicates[@]} > 0 )); then
        log_warn "Posibles mensajes duplicados detectados:"
        for d in "${duplicates[@]}"; do
            echo "  - $d"
        done
        return 1
    fi
    return 0
}

# Generar resumen sugerido desde diff
generate_summary_from_diff() {
    local files=$(git diff --cached --name-only 2>/dev/null | head -5)
    [[ -z "$files" ]] && files=$(git status --porcelain | awk '{print $2}' | head -5)
    local summary=""
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local action=""
        if git diff --cached --name-only | grep -q "^${file}$"; then
            action="modificado"
        elif git status --porcelain | grep -q "^?? ${file}$"; then
            action="añadido"
        elif git status --porcelain | grep -q "^ D ${file}$"; then
            action="eliminado"
        else
            action="cambiado"
        fi
        [[ -n "$summary" ]] && summary+=", "
        summary+="${action} $(basename "$file")"
    done <<< "$files"
    # Truncar si es muy largo
    if (( ${#summary} > MAX_SUMMARY_LENGTH )); then
        summary="${summary:0:$((MAX_SUMMARY_LENGTH-3))}..."
    fi
    echo "$summary"
}

# Staging interactivo
interactive_staging() {
    local files=()
    while IFS= read -r line; do
        [[ -n "$line" ]] && files+=("$line")
    done < <(git status --porcelain | awk '{print $2}')
    
    if (( ${#files[@]} == 0 )); then
        log_warn "No hay archivos para staging"
        return 1
    fi
    
    echo -e "\n${CYAN}Archivos disponibles para staging:${NC}"
    for i in "${!files[@]}"; do
        local status=$(git status --porcelain "${files[i]}" | awk '{print $1}')
        local status_icon=""
        case "$status" in
            "??") status_icon="${GREEN}[NUEVO]${NC}" ;;
            " M") status_icon="${YELLOW}[MODIFICADO]${NC}" ;;
            " D") status_icon="${RED}[ELIMINADO]${NC}" ;;
            *) status_icon="[${status}]" ;;
        esac
        echo "  $((i+1))) ${files[i]} $status_icon"
    done
    
    echo -e "\nIngresa números de archivos (ej: 1,3-5,7) o 'all' para todos:"
    read -p "> " selection
    
    local selected=()
    if [[ "$selection" == "all" ]]; then
        selected=("${files[@]}")
    else
        IFS=',' read -ra parts <<< "$selection"
        for part in "${parts[@]}"; do
            if [[ "$part" =~ ^([0-9]+)-([0-9]+)$ ]]; then
                for ((i=BASH_REMATCH[1]; i<=BASH_REMATCH[2]; i++)); do
                    (( i > 0 && i <= ${#files[@]} )) && selected+=("${files[i-1]}")
                done
            elif [[ "$part" =~ ^[0-9]+$ ]]; then
                (( part > 0 && part <= ${#files[@]} )) && selected+=("${files[part-1]}")
            fi
        done
    fi
    
    if (( ${#selected[@]} == 0 )); then
        log_warn "Ningún archivo seleccionado"
        return 1
    fi
    
    log_step "Agregando archivos seleccionados..."
    git add "${selected[@]}"
    log_success "Archivos agregados: ${selected[*]}"
    return 0
}

# Validaciones pre-commit
run_validations() {
    [[ "$NO_VERIFY" == true ]] && return 0
    
    local failed=false
    
    if [[ "$RUN_LINT" == true ]] && [[ -f package.json ]] && grep -q '"lint"' package.json; then
        log_step "Ejecutando lint..."
        if ! npm run lint --if-present 2>&1 | tail -5; then
            log_error "Lint falló"
            failed=true
        else
            log_success "Lint pasó"
        fi
    fi
    
    if [[ "$RUN_TESTS" == true ]] && [[ -f package.json ]] && grep -q '"test"' package.json; then
        log_step "Ejecutando tests..."
        if ! npm test --if-present 2>&1 | tail -5; then
            log_error "Tests fallaron"
            failed=true
        else
            log_success "Tests pasaron"
        fi
    fi
    
    if [[ "$failed" == true ]]; then
        read -p "¿Commit anyway? (s/n): " choice
        [[ "$choice" != "s" ]] && return 1
    fi
    return 0
}

# Main
main() {
    log_step "Commit Agent iniciado"
    
    # 1. Detectar tipo de commit
    local commit_prefix
    if commit_prefix=$(get_commit_type_from_branch); then
        log_info "Tipo detectado desde rama: $commit_prefix"
    else
        log_warn "No se pudo detectar tipo desde rama"
        if ! commit_prefix=$(ask_commit_type); then
            log_error "Tipo de commit inválido"
            exit 1
        fi
    fi
    
    # 2. Verificar staging
    local staged_files=$(git diff --cached --name-only)
    if [[ -z "$staged_files" ]]; then
        read -p "¿Ya has hecho stage de los archivos? (s/n): " has_staged
        if [[ "$has_staged" != "s" ]]; then
            if ! interactive_staging; then
                log_error "Staging cancelado"
                exit 1
            fi
        fi
    else
        log_info "Archivos ya en staging:"
        echo "$staged_files" | sed 's/^/  - /'
    fi
    
    # 3. Generar resumen sugerido
    local suggested_summary=$(generate_summary_from_diff)
    log_info "Resumen sugerido: $suggested_summary"
    
    # 4. Pedir resumen al usuario
    read -p "Resumen del commit (máx ${MAX_SUMMARY_LENGTH} chars) [$suggested_summary]: " user_summary
    local summary="${user_summary:-$suggested_summary}"
    
    # Validar longitud
    while (( ${#summary} > MAX_SUMMARY_LENGTH )); do
        log_warn "Resumen muy largo (${#summary} > $MAX_SUMMARY_LENGTH)"
        read -p "Acorta el resumen: " summary
    done
    
    # 5. Verificar duplicados
    if ! check_duplicates "$summary"; then
        read -p "¿Continuar anyway? (s/n): " choice
        [[ "$choice" != "s" ]] && exit 1
    fi
    
    # 6. Preguntar por cuerpo opcional
    read -p "Cuerpo del commit (opcional, Enter para omitir): " body
    
    # 7. Construir mensaje final
    local commit_msg="${commit_prefix}: ${summary}"
    [[ -n "$body" ]] && commit_msg+=$'\n\n'"$body"
    
    echo -e "\n${CYAN}Mensaje de commit:${NC}"
    echo "----------------------------------------"
    echo "$commit_msg"
    echo "----------------------------------------"
    
    read -p "¿Confirmar commit? (s/n): " confirm
    [[ "$confirm" != "s" ]] && { log_info "Commit cancelado"; exit 0; }
    
    # 8. Validaciones
    if ! run_validations; then
        exit 1
    fi
    
    # 9. Ejecutar commit
    if [[ "$MESSAGE_ONLY" == true ]]; then
        echo "$commit_msg"
    else
        log_step "Ejecutando commit..."
        git commit -m "$commit_msg"
        local commit_hash=$(git rev-parse --short HEAD)
        log_success "Commit creado: $commit_hash"
        git log --oneline -1
    fi
}

main "$@"