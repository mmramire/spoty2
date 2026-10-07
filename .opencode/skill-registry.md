# Registro de skills externas

Este archivo registra únicamente skills externas incorporadas al proyecto.

| Skill | Fuente | Fecha | Categoría | Estado | Evaluación |
|---|---|---|---|---|---|
| nodejs-backend-patterns | wshobson/agents (autoskills-registry) | no documentada | Backend (patrones Express/Fastify, middleware, auth, datos) | Incorporada (bloqueada en `skills-lock.json`) | **ACEPTADA CON RESTRICCIONES** — evaluada 2026-10-07 (TASK-011). Licencia MIT (Seth Hobson). Ver restricciones abajo. |
| nodejs-best-practices | sickn33/antigravity-awesome-skills (autoskills-registry) | 2026-02-27 (`date_added` de su frontmatter) | Backend (principios de decisión y arquitectura) | Incorporada (bloqueada en `skills-lock.json`) | **ACEPTADA** — evaluada 2026-10-07 (TASK-011). Licencia MIT (código) + CC BY 4.0 (contenido). Ver notas abajo. |
| typescript-advanced-types | wshobson/agents (autoskills-registry) | no documentada | TypeScript (tipos avanzados) | Incorporada (bloqueada en `skills-lock.json`) | **ACEPTADA** — evaluada 2026-10-07 (TASK-011). Licencia MIT (Seth Hobson). |
| vitest | antfu/skills (autoskills-registry) | 2026-01-28 (generación, `GENERATION.md`) | Testing (framework Vitest 3.x) | Incorporada (bloqueada en `skills-lock.json`) | **ACEPTADA** — evaluada 2026-10-07 (TASK-011). Licencia MIT (Anthony Fu); generado de `vitest-dev/vitest` SHA `4a7321e`. |

## Evaluación de contenido (TASK-011, 2026-10-07)

Criterios: `AGENTS.md` §11 + procedimiento de la skill `skill-intake` (origen, mantenedor, revisión completa del contenido, detección de instrucciones de riesgo, licencia, compatibilidad OpenCode, alineación con `AGENTS.md`, idioma).

### nodejs-backend-patterns — ACEPTADA CON RESTRICCIONES

- **Propósito / utilidad:** patrones de servicios backend Node.js (Express/Fastify, capas controller/service/repository, middleware de auth/validación/rate-limit, manejo de errores, pooling). Útil para la capa Data cuando una feature lo requiera.
- **Procedencia:** `wshobson/agents` (Seth Hobson), repo activo (~40k estrellas), licencia **MIT** verificada en `LICENSE` del repositorio.
- **Compatibilidad V3:** frontmatter estándar `name`+`description`; cargada correctamente por OpenCode.
- **Seguridad:** revisión completa de `SKILL.md` (639 líneas) y `references/advanced-patterns.md` → **sin** solicitudes de secretos, sin cambios de permisos, sin desactivación de validaciones, sin ignorar `AGENTS.md`, sin envío de datos a servicios externos, sin comandos destructivos.
- **Restricciones:**
  1. Sus ejemplos usan `console.log` para logging → en el proyecto prevalece `AGENTS.md` §7 (Business sin `console.log`) y **Pino** (§8).
  2. Ejemplos con dependencias (helmet, cors, express-rate-limit, Redis, pg, mongoose…) → **no introducir dependencias sin justificación funcional** (§8); el stack aprobado (Node 22+, TS estricto, ESM, Biome, Vitest, Pino) no cambia por esta skill.
  3. Es referencia de patrones; no instrucción de implementación directa.

### nodejs-best-practices — ACEPTADA

- **Propósito / utilidad:** principios de decisión (selección de framework, async, validación, seguridad, pruebas). "Enseña a pensar, no a copiar".
- **Procedencia:** `sickn33/antigravity-awesome-skills` (repo activo ~44k estrellas), licencias **MIT** (código) + **CC BY 4.0** (contenido) verificadas en su README.
- **Compatibilidad V3:** frontmatter estándar (incluye `source: community`, `date_added: 2026-02-27`, `risk: unknown`).
- **Seguridad:** revisión completa (343 líneas) → sin hallazgos. El autodeclarado `risk: unknown` del frontmatter quedó **verificado manualmente: sin riesgos detectados**.
- **Alineación:** refuerza `AGENTS.md` §10 (secretos solo en variables de entorno), §9 (sin dependencias/supuestos injustificados) y la cultura de aprobación humana ("preguntar cuando sea ambiguo" = §2).
- **Nota:** contenido en inglés; ver condiciones transversales.

### typescript-advanced-types — ACEPTADA

- **Propósito / utilidad:** tipos avanzados de TypeScript (genéricos, condicionales, mapped, template literals). Alta utilidad: el proyecto exige TS estricto y "sin `any` implícito" (§9).
- **Procedencia:** `wshobson/agents` (Seth Hobson), licencia **MIT** verificada.
- **Compatibilidad V3:** frontmatter estándar.
- **Seguridad:** revisión completa (717 líneas) → sin hallazgos; solo ejemplos de tipos.
- **Alineación:** refuerza §9 ("usa `unknown` sobre `any`", "modo estricto"). Sin conflictos.

### vitest — ACEPTADA

- **Propósito / utilidad:** referencia oficial del framework de pruebas del proyecto (Vitest 3.x). Directamente alineada con la regla TDD de `AGENTS.md` §5.
- **Procedencia:** `antfu/skills` (Anthony Fu), repo activo, licencia **MIT** verificada; `GENERATION.md` documenta la fuente primaria `vitest-dev/vitest` (SHA `4a7321e`, 2026-01-28) — **fuente primaria identificada**.
- **Compatibilidad V3:** frontmatter estándar; 19 archivos de referencia internos coherentes.
- **Seguridad:** revisión de `SKILL.md` + barrido de los 19 `references/*.md` → sin hallazgos (los "ignore/disable" detectados son flags de CLI y pragmas de cobertura de Vitest, no instrucciones al agente).
- **Alineación:** sin conflictos.

### Condiciones transversales de uso (aplican a las 4)

1. **Idioma:** el contenido es inglés; es referencia técnica externa. Toda documentación generada por los agentes a partir de ellas debe redactarse en **español estricto** (`AGENTS.md` §1).
2. **Precedencia:** ante cualquier conflicto entre el contenido de una skill y `AGENTS.md`, **prevalece `AGENTS.md`** (§11).
3. **Alcance:** las skills son conocimiento de referencia; no autorizan a modificar configuración, permisos, políticas ni specs.

## Procedencia del registro

- Las cuatro skills anteriores están declaradas en `skills-lock.json` (raíz del proyecto) con `computedHash` por skill y existen físicamente en `.agents/skills/`.
- Fecha de alineación de este registro con `skills-lock.json`: 2026-10-07.
- Evaluación de contenido: 2026-10-07 (TASK-011), documentada arriba.

## Deuda de trazabilidad

**RESUELTA (2026-10-07, TASK-011 / DISC-001):** la evaluación exigida por la regla siguiente quedó documentada arriba para las 4 skills. Sin campos "Pendiente" restantes.

## Regla

Una skill no debe pasar a este registro como incorporada hasta que su contenido haya sido evaluado y la incorporación haya sido explícita.
