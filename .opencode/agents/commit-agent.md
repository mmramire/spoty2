# Commit Agent - Subagente para Commits Inteligentes

## Descripción
Agente especializado en crear commits siguiendo convenciones estrictas basadas en el nombre de la rama, con staging interactivo y prevención de mensajes duplicados.

## Invocación
```bash
# Desde opencode
> task commit-agent "commit"
# O con parámetros opcionales
> task commit-agent "commit --message-only"  # Solo genera mensaje, no commitea
```

## Comportamiento

### 1. Detección del tipo de commit
- **Primaria**: Parsear `git branch --show-current` → extraer prefijo `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `perf/`, `ci/`, `build/`, `revert/`
- **Secundaria (fallback)**: Preguntar interactivamente al usuario con opciones

### 2. Prevención de mensajes duplicados
- Obtener **todos los commits de la rama actual** (`git log --oneline <merge-base>..HEAD`)
- Extraer los "resúmenes" (parte después de `tipo/REQ-XXX: `)
- Comparar el nuevo resumen propuesto contra todos los existentes
- Si hay similitud > 80% (Levenshtein) → advertir y pedir confirmación o nuevo mensaje

### 3. Staging interactivo
- Preguntar: "¿Ya has hecho stage de los archivos que quieres comitear? (s/n)"
- Si **sí** → proceder directamente
- Si **no** → `git status --porcelain` → mostrar lista numerada → usuario selecciona índices (ej: "1,3-5") → `git add` selectivo

### 4. Formato del mensaje de commit
```
<tipo>/<REQ-XXX>: <resumen breve en imperativo, max 72 chars>

<cuerpo opcional con detalles técnicos si el usuario lo provee>
```

### 5. Validaciones pre-commit
- Ejecutar `npm run lint` (o `biome check`) si existe en package.json
- Ejecutar `npm test` (o `vitest run`) si existe
- Si fallan → ofrecer: "¿Commit anyway? (s/n)" o "Fix first"

## Flujo completo

```
1. Detectar rama actual → extraer tipo/REQ
2. Verificar si hay cambios staged (git diff --cached --name-only)
   - Si no hay staged → preguntar staging interactivo
3. Generar resumen sugerido basado en diff (git diff --cached --stat + nombres archivos)
4. Verificar duplicados contra historial de la rama
5. Presentar mensaje propuesto al usuario para confirmación/edición
6. Validaciones pre-commit (lint/test)
7. Ejecutar git commit -m "..."
8. Mostrar hash y confirmación
```

## Ejemplos de mensajes generados

```
feat/REQ-001: añadir autenticación OAuth con PKCE
fix/REQ-002: corregir bug writeFile en download-songs
chore/REQ-003: actualizar dependencias y biome config
docs/REQ-001: documentar API endpoints en README
refactor/REQ-004: extraer lógica de paginación a servicio separado
```

## Configuración opcional (via .opencode/commit-agent.json)

```json
{
  "branchPrefixes": ["feat", "fix", "chore", "docs", "refactor", "test", "perf", "ci", "build", "revert"],
  "requireTicketPattern": "REQ-\\d+",
  "maxSummaryLength": 72,
  "duplicateThreshold": 0.8,
  "runLintBeforeCommit": true,
  "runTestsBeforeCommit": true,
  "interactiveStaging": true
}
```

## Notas de implementación
- Usar `git` CLI via `bash` tool para máxima compatibilidad
- Levenshtein distance para detección de duplicados (implementación simple)
- Colores en output para mejor UX (ansi codes)
- Manejo de errores graceful con mensajes accionables