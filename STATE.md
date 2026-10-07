# ESTADO DEL PROYECTO

## Estado SDD actual

Estado: `MIGRATION_COMPLETE` — Migración OpenCode v2 → v3 formalmente cerrada (Gates 1-4 APROBADO, 2026-10-07)
Feature/Spec activa: ninguna (no se ha creado Spec 003)
Último punto seguro de reanudación: cierre de migración emitido. TASK-011 (skills evaluadas) y TASK-012 (`sea-config.json`) completadas; DISC-001/004/005 cerrados; 12/12 tareas completadas; 7/7 descubrimientos cerrados. La siguiente actividad permitida es iniciar el flujo normal de una nueva feature (`SPECS → REQUIREMENTS → USE_CASES → GHERKIN → ARCHITECTURE/ADR → APPROVAL → TASKS → TDD → VALIDATION → FEATURE_DONE`), previa aprobación humana.

## Gates

| Gate | Estado | Evidencia |
|---|---|---|
| Especificación | N/A | Sin spec activa |
| Implementación | N/A | Sin implementación en curso |
| Aceptación | N/A | Sin spec en validación |

## Migración V3

| Gate local | Estado | Evidencia |
|---|---|---|
| MIGRATION_GATE_1 | APROBADO | Ver sección de evidencia inferior |
| MIGRATION_GATE_2 | APROBADO | Ver sección de evidencia inferior |
| MIGRATION_GATE_3 | APROBADO | 12/12 puntos conformes; evidencia en sección inferior; DISC-003 cerrado |
| MIGRATION_GATE_4 | APROBADO | 10/10 puntos conformes; TASK-011 y TASK-012 completadas; 7/7 DISC cerrados; 12/12 TASK completadas; validación final ejecutada (2026-10-07) |

> Los estados de migración son locales a este proceso y no sustituyen los estados globales definidos en AGENTS.md.

### Evidencia MIGRATION_GATE_1 — Limpieza (APROBADO, 2026-10-07)

- Componentes v2 presentes en `HEAD` y **ausentes** en disco: `.opencode/agent.md`, `.opencode/agent/spec-checker.md`, `.opencode/agent/spec-driven.md`, `.opencode/agents/commit-agent.json`, `.opencode/agents/commit-agent.sh`.
- `.opencode/agents/commit-agent.md` (versión v3) **conservado** y presente.
- Ningún componente v3 eliminado: `node scripts/opencode-v3-validate.mjs` → exit 0.
- Verificación reproducible: `git ls-tree -r HEAD --name-only` + `Test-Path` de cada ruta.

### Evidencia MIGRATION_GATE_2 — Estructura (APROBADO, 2026-10-07)

Verificación literal de las 14 rutas de `MIGRACION_V3.md` §5, todas `OK`:

```text
AGENTS.md (170 líneas)          opencode.json (10 líneas)
skills-lock.json (25 líneas)    .opencode/agents/  .opencode/commands/
.opencode/rules/                .opencode/skills/  .opencode/templates/
.opencode/model-policy.json     .opencode/model-policy.md
.opencode/skill-registry.md     .agents/  scripts/  specs/
```

### Evidencia MIGRATION_GATE_3 — Integridad (ejecutado en TASK-005)

| Criterio | Resultado | Evidencia |
|---|---|---|
| Validador v3 | CONFORME | exit 0: `JSON: válido` + `Estructura OpenCode v3: válida` |
| `opencode.json` parsea | CONFORME | `JSON.parse` sin error |
| `model-policy.json` parsea | CONFORME | `JSON.parse` sin error |
| Scripts verificados individualmente | CONFORME | SCRIPT-001 `list` exit 0; SCRIPT-002 exit 0 |
| Sin IDs de agente duplicados | CONFORME | 11 agentes = 11 `assignments`, 1:1, sin duplicados |
| Skills registradas existen físicamente | CONFORME | 4/4 con `SKILL.md` en `.agents/skills/` |
| `skills-lock.json` ↔ `skill-registry.md` | CONFORME (Fase A) | 4/4 idénticas tras TASK-003 |
| `specs/001-spoty2-mvp/` conservada | CONFORME | presente, sin modificar |
| `specs/002-download-songs/` conservada | CONFORME | presente, sin modificar |
| `AGENTS.md` histórico revisado | CONFORME | comparación `HEAD:.opencode/agent.md` (v2) vs `AGENTS.md` actual + 3 incorporaciones aprobadas → DISC-003 cerrado |
| Reglas específicas preservadas | CONFORME | §4 equivalencia `final-validator` ↔ `spec-checker`; §7 restricción Node.js SEA; §9 SonarLint + umbral < 15 → DISC-003 cerrado |
| Evidencia persistida en `STATE.md` | CONFORME | este archivo + `DISCOVERIES.md` + `TASKS.md` creados en raíz |

**Resultado local Gate 3: `APROBADO` (12/12, 2026-10-07).** Verificación posterior a las incorporaciones: `node scripts/opencode-v3-validate.mjs` → exit 0; specs `001`/`002` sin cambios; `opencode.json` sin cambios; overlay sin fusionar; 11 agentes presentes; las tres reglas aprobadas presentes en `AGENTS.md`.

- `DISC-003` → **cerrado** (opción (b) aprobada; ver `DISCOVERIES.md`).
- `DISC-004` → abierto en su momento, **cerrado** el 2026-10-07 en TASK-012 (ver `DISCOVERIES.md`).

### Evidencia MIGRATION_GATE_4 — Preparación para próxima especificación (parcial, 2026-10-07)

| Criterio Gate 4 | Resultado | Evidencia |
|---|---|---|
| `specs/001-spoty2-mvp/` revisada | CONFORME | TASK-008: 3/3 artefactos leídos, read-only |
| `specs/002-download-songs/` revisada | CONFORME | TASK-008: 5/5 artefactos leídos, read-only |
| Convenciones de idioma verificadas | CONFORME con excepciones | specs en español; excepciones (logs inglés en AC-001/AC-012, keywords Gherkin mezcladas) documentadas en DISC-006 |
| Convenciones de trazabilidad verificadas | CONFORME con hallazgos | huecos y mapeos incorrectos documentados en DISC-006 (0 bloqueantes) |
| Configuración v3 validada | CONFORME | validador v3 exit 0 en cada tarea de Fase C/D |
| Optimización de contexto/tokens documentada y aplicada | CONFORME | TASK-006 (fusión overlay) + TASK-007 (small_model = NO APLICABLE) |
| `STATE.md` actualizado | CONFORME | esta sección |
| `DISCOVERIES.md` actualizado | CONFORME | DISC-001/004/005/006/007 cerrados; DISC-002/003 cerrados desde fases previas (7/7 cerrados) |
| `TASKS.md` actualizado | CONFORME | TASK-001…012 completadas (12/12) |
| No existen bloqueos conocidos | CONFORME | 0 DISC abiertos; 0 TASK pendientes; sin solicitudes de cambio (`CR-XXX`) pendientes; sin decisiones pendientes |

**Resultado local Gate 4: `APROBADO` (10/10, 2026-10-07).**

### Evidencia de cierre — Fases 1-5 del cierre definitivo (2026-10-07)

**Fase 1 — corrección administrativa mínima:** `TASK-006` corregido a `completada` en `TASKS.md` (discrepancia detectada en la validación previa; su ejecución en Fase C ya estaba aprobada y validada). `DISC-005` cerrado como no bloqueante (discrepancia de catálogo sin impacto sobre los modelos de `model-policy`; sin `TASK-013`). `DISC-006` permanece cerrado. Coherencia verificada: `STATE.md` ↔ `TASKS.md` ↔ `DISCOVERIES.md`.

**Fase 2 — TASK-011 (skills externas):** evaluación de las 4 skills con el procedimiento de `skill-intake` + `AGENTS.md` §11, documentada en `.opencode/skill-registry.md`. Resultado: 3 **ACEPTADA** (`vitest`, `typescript-advanced-types`, `nodejs-best-practices`) + 1 **ACEPTADA CON RESTRICCIONES** (`nodejs-backend-patterns`: ejemplos con `console.log`/dependencias; prevalecen §7/§8 y Pino). Licencias verificadas en fuentes primarias (MIT / MIT+CC BY 4.0 / MIT). Barrido de inyección: 0 hallazgos. `DISC-001` → cerrado.

**Fase 3 — TASK-012 (`sea-config.json`):** investigación acotada (git, `package.json`, lockfile, CI) → el archivo **no es necesario para el estado actual** y no fue reemplazado por otro mecanismo; la regla V3 (§7) es de compatibilidad de diseño con la compilación futura. **No se creó `sea-config.json`**; se corrigió `README.md` para que la instrucción de compilación refleje el estado real. `DISC-004` → cerrado (no bloqueante / deuda técnica documentada: creación del config SEA en la futura feature de release).

**Fase 4 — validación final:** estructura 13/13; agentes 11/11; validador v3 exit 0; `models sync --check` exit 0; `opencode debug config` exit 0 (`default_agent: sdd`, `subagent_depth: 1`, compaction `auto`/`prune`/`reserved: 10000`, `watcher.ignore` (5), `permission` presente, `small_model` ausente); `model-policy` 5 roles/11 assignments; `skills-lock` 4; 10 comandos `sdd-*`; 6 rules; 7 skills internas; 4 skills externas; 20/20 templates; políticas de `AGENTS.md` §1-§15 verificadas (español, trazabilidad, gates + `final-validator`↔`spec-checker` §4, TDD §5, cambios §6, `Presentation → Business → Data` + SEA §7, stack §8, SonarLint < 15 §9, seguridad §10, skills §11, reglas de oro §14); 12/12 TASK completadas; 7/7 DISC cerrados; specs `001`/`002` sin cambios y preservadas (3+5 archivos); Spec 003 no creada; sin cambios staged y sin commits.

**Fase 5 — decisión:** Gate 4 → `APROBADO`; estado final → `MIGRATION_COMPLETE`.

### Resolución DISC-007 — Ámbito de templates (cerrado, 2026-10-07)

- **Ambigüedad original:** `feature-planner.md:33` y `sdd-iniciar.md:8` invocaban genéricamente "las plantillas de `.opencode/templates/`", sin distinguir los 3 templates de migración sin extensión de los 17 templates de features SDD (`.template`).
- **Decisión:** aclaración documental mínima; los flujos SDD consumen **exclusivamente** los `.template`; los archivos sin extensión son templates de migración V2 → V3 y no deben usarse en nuevas features; `STATE.md`/`TASKS.md`/`DISCOVERIES.md` de la raíz son artefactos vivos.
- **Cambio:** 2 archivos (`.opencode/agents/feature-planner.md`, `.opencode/commands/sdd-iniciar.md`), solo líneas de referencia a templates.
- **Verificación:** `.opencode/templates/` intacto (20/20; 0 eliminados, renombrados, movidos, fusionados ni modificados); sin referencias ambiguas residuales; validador v3 exit 0; `models sync --check` exit 0; specs `001`/`002` sin cambios; Spec 003 no creada; `AGENTS.md`, `opencode.json`, `model-policy`, skills y overlay sin cambios; sin commits.

## Artefactos activos

- Spec: ninguna activa (SPEC-001 y SPEC-002 históricas, conservadas)
- Requirements: `specs/002-download-songs/REQUIREMENTS.md` (histórica)
- Use Cases: `specs/002-download-songs/USE_CASES.md` (histórica)
- Gherkin: `specs/002-download-songs/ACCEPTANCE_CRITERIA.feature` (histórica)
- Architecture: `specs/002-download-songs/ARCHITECTURE.md` (histórica)
- ADRs: ninguno
- Tasks: `TASKS.md`
- Tests: sin suite de migración (la migración es infraestructura)

## Bloqueos

- **Ninguno.** Migración cerrada con 0 descubrimientos abiertos y 0 tareas pendientes.

Resumen de cierre de descubrimientos:

- `DISC-001` **cerrado** (2026-10-07): evaluación de las 4 skills documentada en TASK-011.
- `DISC-002` **cerrado**: bug de rutas Windows (TASK-001).
- `DISC-003` **cerrado**: 3 reglas históricas incorporadas (TASK-010, opción (b)).
- `DISC-004` **cerrado** (2026-10-07): `sea-config.json` no necesario para el estado actual; `README.md` corregido; deuda futura de release documentada (TASK-012).
- `DISC-005` **cerrado** (2026-10-07): discrepancia de catálogo no bloqueante; sin impacto en `model-policy`; sin `TASK-013`.
- `DISC-006` **cerrado**: deuda documental histórica de specs aceptada.
- `DISC-007` **cerrado**: ámbito de templates declarado explícitamente; 0 templates eliminados o fusionados.

## Próxima acción

- Migración **`MIGRATION_COMPLETE`**. Siguiente actividad permitida, previa aprobación humana: iniciar el flujo normal de una nueva feature (`SPECS → REQUIREMENTS → USE_CASES → GHERKIN → ARCHITECTURE/ADR → APPROVAL → TASKS → TDD → VALIDATION → FEATURE_DONE`) mediante `/sdd-iniciar`. No comenzar esa feature sin decisión humana.
