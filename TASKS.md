# TAREAS

## Convención

Cada tarea debe tener un ID `TASK-XXX` y trazabilidad suficiente para conocer por qué existe. No reutilizar identificadores.

---

### TASK-001 — Corregir bug de rutas Windows en scripts v3

**Estado:** completada

**Origen:** DISC-002

**Objetivo:** Sustituir `resolve(new URL("..", import.meta.url).pathname)` por `fileURLToPath` en los dos scripts v3 para que resuelvan la raíz correcta en Windows.

**Archivos previstos:** `scripts/opencode-v3-validate.mjs`, `scripts/opencode-v3-models.mjs`

**Prueba/TDD:** ejecución real de ambos scripts con comprobación de exit 0, ausencia de `C:\C:\` y de `ENOENT`

**Criterio de finalización:** validador devuelve `Estructura OpenCode v3: válida`; `models list` legible

**Evidencia:** Fase A, 2026-10-07 — exit 0 en ambos scripts. Vinculada a MIGRATION_GATE_3 (punto "validador v3").

---

### TASK-002 — Corregir fallback de modelo inexistente

**Estado:** completada

**Origen:** plan de Fase A (inspección previa)

**Objetivo:** Reemplazar `opencode/nemotron-3-ultra-free` (inexistente en catálogo) por `opencode/nemotron-3.5-lightning-free` (existente) en roles `reasoning` y `coding`.

**Archivos previstos:** `.opencode/model-policy.json` (2), `.opencode/model-policy.md` (2)

**Prueba/TDD:** parseo de JSON + `models sync` sin reescrituras + verificación de existencia del ID en catálogo

**Criterio de finalización:** sin referencias a `nemotron-3-ultra-free`; JSON válido; agentes sincronizados

**Evidencia:** Fase A, 2026-10-07 — `sync` sin salida (frontmatters ya coincidían); validador exit 0.

---

### TASK-003 — Alinear skill-registry con skills-lock

**Estado:** completada

**Origen:** DISC-001

**Objetivo:** Registrar en `.opencode/skill-registry.md` las 4 skills externas reales de `skills-lock.json`, marcando como `no documentada`/`Pendiente` los campos sin fuente, sin inferir datos.

**Archivos previstos:** `.opencode/skill-registry.md`

**Prueba/TDD:** comparación `skills-lock.json` ↔ tabla del registry ↔ existencia física de `SKILL.md`

**Criterio de finalización:** 4/4 coincidentes y físicas; validador exit 0

**Evidencia:** Fase A, 2026-10-07 — 4/4 idénticas. Deuda de evaluación abierta como DISC-001.

---

### TASK-004 — Crear archivos de estado y registrar Gates 1 y 2

**Estado:** completada

**Origen:** MIGRACION_V3.md §9 (persistencia de evidencia)

**Objetivo:** Crear `STATE.md`, `DISCOVERIES.md` y `TASKS.md` en la raíz desde las plantillas de `.opencode/templates/`, sin crear archivos de estado adicionales, y persistir la evidencia de Gate 1 y Gate 2.

**Archivos previstos:** `STATE.md`, `DISCOVERIES.md`, `TASKS.md` (raíz)

**Prueba/TDD:** tarea documental — validación equivalente: verificación reproducible de cada ruta/evidencia citada

**Criterio de finalización:** los 3 archivos existen; Gates 1 y 2 con estado y evidencia; DISC-001 y DISC-002 registrados; trazabilidad TASK ↔ DISC ↔ Gate explícita

**Evidencia:** Fase B, 2026-10-07 — creados los 3 archivos; Gate 1 y Gate 2 = `APROBADO` en `STATE.md`.

---

### TASK-005 — Ejecutar MIGRATION_GATE_3 completo y persistir evidencia

**Estado:** completada

**Origen:** MIGRACION_V3.md §11 (Gate 3)

**Objetivo:** Ejecutar los 12 puntos del checklist de Gate 3 con evidencia objetiva y persistir el resultado en `STATE.md`. Incluye la revisión obligatoria de `AGENTS.md` histórico y la comprobación de reglas específicas preservadas.

**Archivos previstos:** `STATE.md` (evidencia), `DISCOVERIES.md` (DISC-003 si aparecen hallazgos)

**Prueba/TDD:** validador v3, parseo de JSON por parser, ejecución de scripts, enumeración de agentes vs `assignments`, comparación lock ↔ registry ↔ disco, verificación de specs, comparación `HEAD:.opencode/agent.md` vs `AGENTS.md`

**Criterio de finalización:** los 12 puntos con resultado y evidencia; hallazgos registrados como DISC y no corregidos silenciosamente

**Evidencia:** Fase B, 2026-10-07 — 10/12 puntos conformes, 2 no conformes (AGENTS.md histórico y reglas preservadas, ambos vía DISC-003). Resultado Gate 3: `BLOQUEADO`. Tabla completa en `STATE.md`.

---

### TASK-006 — Fusionar overlay de optimizaciones en opencode.json *(completada — Fase C)*

**Estado:** completada

**Origen:** MIGRACION_V3.md §10 + `README_APLICACION.md`

**Objetivo:** Fusionar `opencode.optimizations.jsonc` en `opencode.json` (`compaction.auto`, `compaction.prune`, `compaction.reserved`, `permission.*`, `watcher.ignore`) previa validación contra el `$schema` instalado.

**Archivos previstos:** `opencode.json`

**Prueba/TDD:** validador v3 exit 0 + parseo de JSON

**Criterio de finalización:** optimizaciones activas sin romper esquema

**Evidencia:** Fase C, 2026-10-07 — fusión selectiva aplicada en `opencode.json`: `compaction.auto`, `compaction.prune`, `compaction.reserved`, `permission` (skill/webfetch/websearch) y `watcher.ignore`. Validación previa contra el `$schema` de OpenCode 1.18.35: todas las propiedades compatibles (sin DISC). Verificaciones: `opencode debug config` exit 0; validador v3 exit 0; `models sync --check` exit 0. Sin `small_model` (decisión en TASK-007). Vinculada a MIGRATION_GATE_4.

---

### TASK-007 — Decidir `small_model` *(completada — Fase C)*

**Estado:** completada

**Origen:** `OPTIMIZACION_TOKENS_V3.md` (sección `small_model`)

**Objetivo:** Decidir si se habilita `small_model` o se documenta como no aplicable, con sincronización a `model-policy.json`.

**Archivos previstos:** `opencode.json`, `.opencode/model-policy.json`

**Prueba/TDD:** tarea de decisión documental con validación equivalente

**Criterio de finalización:** decisión registrada y consistente

**Evidencia:** Decisión **NO APLICABLE — `small_model` queda sin configurar** (2026-10-07). Evaluación con catálogo real inspeccionado (no por inferencia):

1. **Sin ventaja económica:** los 11 modelos del catálogo tienen coste 0 (input/output/cache). `MIGRACION_V3.md:323` condiciona el uso de `small_model` a que "haya un modelo más económico disponible"; la condición no se cumple porque ningún modelo es más económico que 0.
2. **Sin ventaja de velocidad demostrable:** los primarios actuales ya son de clase ligera (`mimo-v2.6-flash-free`, `ling-3.1-flash-free`); elegir otro por el nombre ("flash"/"lightning") sería inferencia, y la instrucción de la tarea prohíbe elegir arbitrariamente.
3. **Incompatibilidad con la estrategia de `model-policy.json`:** la política se organiza en roles con `primary` + `fallbacks`, pero no existe rol `small`/`fast`, y `small_model` es un string único **sin cadena de fallback**. Configurarlo introduciría una referencia de modelo fuera de la política central, incumpliendo la propia nota del overlay ("mantener este valor sincronizado desde la política central de modelos").
4. **Sin candidato suficientemente estable:** todos los modelos del catálogo son gratuitos y temporales por definición de `AGENTS.md` §12; `catalog_notes` confirma "Modelo gratuito temporal" en los anotados.

Sin cambios en `opencode.json` (clave `small_model` ausente), `.opencode/model-policy.json` ni agentes. Hallazgo de catálogo asociado registrado como DISC-005 (no bloqueante). Validaciones: JSON de `opencode.json` válido; validador v3 exit 0; `sync --check` exit 0; `opencode debug config` → `small_model` no presente; 11/11 agentes; `specs/001` y `specs/002` sin cambios.

---

### TASK-008 — Revisión de specs 001 y 002 para Gate 4 *(completada — Fase D)*

**Estado:** completada

**Origen:** MIGRACION_V3.md §8

**Objetivo:** Revisar `specs/001-spoty2-mvp/` y `specs/002-download-songs/` (idioma, estructura, consistencia, trazabilidad, ausencia de cambios funcionales). **Sin modificar su contenido.**

**Archivos previstos:** ninguno (solo lectura) o registro de hallazgos en `DISCOVERIES.md`

**Prueba/TDD:** tarea documental con validación equivalente

**Criterio de finalización:** puntos de Gate 4 verificados

**Evidencia:** Completada 2026-10-07 (revisión exclusivamente read-only, 8/8 artefactos leídos).

- **Inventario**: `specs/001-spoty2-mvp/` = `spec.md`, `plan.md`, `resumen-fixes.md`; `specs/002-download-songs/` = `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `ARCHITECTURE.md`. No existe Spec 003.
- **Trazabilidad specs/002** (`SPEC → RF/RNF → UC → AC → TEST`): cadena presente (RF-001..011 + RNF-001..006, UC-001..006, AC-001..018) pero con huecos: RF-010 referenciado sin sección; mapeos UC/AC incorrectos (RF-007, RF-008, RF-009); matriz de cobertura del `.feature` con escenario inexistente (RNF-001) y 8/18 AC; los 6 tests referenciados inexistentes en disco (`tests/` solo tiene 9 archivos de specs/001).
- **Trazabilidad specs/001**: `plan.md` usa IDs `RF-01..RF-08`/`RNF-06`/`RNF-08` ausentes en `spec.md` (sin IDs); sin `REQUIREMENTS.md`/`USE_CASES.md`/`.feature`.
- **Consistencia interna**: colisión de IDs RB-015/RB-016 entre `SPECS.md` y `USE_CASES.md`; contradicción de idioma de logs (RNF-006/AC-018 español vs AC-001/AC-012 inglés); decisión #3 "7 scopes" vs 8 en el ejemplo de `tokens.json`; checklists sin marcar pese a "Estado: Aprobado"; numeración duplicada en `SPECS.md`; ADR-006 fuera del checklist de `ARCHITECTURE.md`; keywords Gherkin mezcladas.
- **Reglas V3 vs specs**: SEA respaldada (`plan.md` decisión #11, DoD #6, §7.6) ✅; SonarLint < 15 presente (`REQUIREMENTS.md` RNF-005) ✅; seguridad de tokens presente (RNF-003, ADR-004) ✅; sin mención de `spec-checker` (sin contradicción con la equivalencia `final-validator`) ✅; ciclo TDD RED/GREEN/REFACTOR no expresado en specs (regla vivida en `AGENTS.md`, sin contradicción) — observación.
- **Clasificación**: 0 BLOQUEANTE; 6 GAP + 2 CONTRADICCIÓN + 4 OBSERVACIÓN (mayoritariamente NO BLOQUEANTE, deuda documental de specs históricas).
- **DISC-006 registrado** (consolidado de los hallazgos, abierto, pendiente de decisión humana; no convertido en TASK).
- **DISC-005**: la revisión de specs no aportó evidencia relevante; intacto.
- Validaciones finales: `git status specs/` → SIN CAMBIOS; Spec 003 inexistente; validador v3 exit 0; 11/11 agentes; `opencode.json`/`model-policy`/`AGENTS.md` sin cambios.

---

### TASK-009 — Resolver duplicidad de plantillas y referencias cruzadas *(completada — Fase D)*

**Estado:** completada

**Origen:** inspección previa de migración

**Objetivo:** Aclarar la relación `X.md` vs `X.md.template` en `.opencode/templates/` (STATE, DISCOVERIES, TASKS) y las referencias a `README_OPENCODE_V3.md`, `docs/ARQUITECTURA_V3.md`, `docs/MATRIZ_AGENTES.md`.

**Archivos previstos:** documentación de infraestructura

**Prueba/TDD:** tarea documental con validación equivalente

**Criterio de finalización:** fuente de verdad única por plantilla

**Evidencia:** Completada 2026-10-07. Cadena problema → evidencia → decisión → cambio → validación:

- **Problema**: 20 archivos en `.opencode/templates/`, con 3 nombres solapados (`STATE.md`, `TASKS.md`, `DISCOVERIES.md`) existentes con y sin extensión `.template`.
- **Evidencia**: inventario completo; comparación de contenido de los 6 archivos del par; mapa de referencias entrantes/salientes por grep de rutas, nombres y placeholders; `Test-Path` literal sobre todas las rutas en backticks de la documentación V3.
- **Clasificación de duplicados**: `STATE` pair = **PROPÓSITOS DIFERENTES** (sin extensión: persistencia de migración con tabla `MIGRATION_GATE_1..4`, declarados canónicos en `MIGRACION_V3.md` §9 y `README_APLICACION.md:10-12`; `.template`: estado de feature con gates `SPEC_READY`/`IMPLEMENTATION_READY`/`FEATURE_DONE`). `TASKS` pair y `DISCOVERIES` pair = **VERSIONES DIFERENTES** con ámbitos distintos (formato de migración `**Campo:**` —idéntico al de los artefactos reales de la raíz creados en TASK-004— vs formato feature `{{FEATURE_NAME}}` con trazabilidad RF/UC/AC/TC). Los otros 14 `.template` (SPECS, REQUIREMENTS, USE_CASES, ACCEPTANCE_CRITERIA, ARCHITECTURE, ADR, CHANGE_REQUESTS, IMPACT_ANALYSIS, SPEC_REVIEW, TEST_PLAN, TEST_REVIEW, TDD_LOG, TRACEABILITY, VALIDATION) = **NO DUPLICADO** (sin par, son el sistema SDD de features). `templates/X.md` vs `raíz/X.md` = **NO DUPLICADO** (plantilla vs instancia viva).
- **Fuente canónica por ámbito**: migración del proyecto → archivos **sin extensión**; features SDD futuras → archivos **`.template`**.
- **Decisión**: **cero eliminaciones, cero fusiones** (ningún archivo demostrado redundante e inutilizado: los 3 sin extensión están referenciados por `MIGRACION_V3.md:200-202` y `README_APLICACION.md:10-12`; los 17 `.template` son el sistema invocado por `sdd-iniciar.md:8` y `feature-planner.md:33`). Ambigüedad residual (ámbito no declarado en los agentes/comandos) registrada como **DISC-007**, sin convertirla en TASK.
- **Referencias cruzadas**: `README_OPENCODE_V3.md`, `docs/ARQUITECTURA_V3.md` y `docs/MATRIZ_AGENTES.md` existen; **0 referencias rotas** (las rutas a `.opencode/agent*` de `README_OPENCODE_V3.md:13-16` son históricas bajo el encabezado "Qué reemplaza", coherentes con la limpieza de Gate 1); las 3 docs están **huérfanas** (nadie las enlaza) — observación, sin rotura.
- **DISC-005**: los templates no contienen referencias a catálogos de modelos → sin nueva evidencia, intacto.
- **Validaciones**: validador v3 exit 0; `models sync --check` exit 0; 20/20 templates intactos (ninguno eliminado); 0 referencias hacia archivos inexistentes; specs `001`/`002` sin cambios; Spec 003 no creada; `AGENTS.md`, `opencode.json`, `model-policy`, agentes, skills, overlay sin cambios; `sea-config.json` no creado; sin commits.
- **Resolución de DISC-007 (2026-10-07)**: aclaración documental de ámbito aplicada en `.opencode/agents/feature-planner.md:33` y `.opencode/commands/sdd-iniciar.md:8` — los flujos de features SDD consumen exclusivamente los templates `.template`; los 3 templates sin extensión son de migración V2 → V3 y no deben usarse en nuevas features; `STATE.md`/`TASKS.md`/`DISCOVERIES.md` de la raíz son artefactos vivos. DISC-007 → **cerrado**. Cero templates eliminados, renombrados, movidos ni fusionados (20/20 intactos). Detalle en `DISCOVERIES.md` y en la sección de resolución de Gate 4 de `STATE.md`.

---

### TASK-010 — Decidir destino de las 3 reglas históricas de AGENTS.md

**Estado:** completada

**Origen:** DISC-003

**Objetivo:** Decidir e implementar el destino de las reglas v2 no preservadas: gate `spec-checker`, empaquetado binario único/SEA y resolución de SonarLint. Requiere aprobación humana; si la decisión modifica reglas de proceso aprobadas, elevar `CR-XXX`.

**Archivos previstos:** `AGENTS.md`

**Prueba/TDD:** tarea documental con validación equivalente

**Criterio de finalización:** DISC-003 cerrado con decisión humana registrada; Gate 3 desbloqueado

**Evidencia:** Completada 2026-10-07 con aprobación de la opción (b). Verificación de vigencia con evidencia documental (no por inferencia): `spec-checker` → intención vigente, sustituido por `final-validator`; SEA → vigente (decisión de arquitectura #11 de `specs/001-spoty2-mvp/plan.md`, `README.md`, `docs/constitution.md`); SonarLint → vigente (`specs/002-download-songs/REQUIREMENTS.md` umbral < 15, `docs/constitution.md` regla 5). Tres textos incorporados en `AGENTS.md` §4, §7 y §9. Sin `CR-XXX` (ninguna regla retirada). Gate 3 → `APROBADO` (12/12). Hallazgo asociado registrado como DISC-004.

---

### TASK-011 — Evaluar las 4 skills externas *(completada — derivada de DISC-001)*

**Estado:** completada

**Origen:** DISC-001

**Objetivo:** Ejecutar la evaluación exigida por `AGENTS.md` §11 (origen, fuente primaria, mantenimiento, compatibilidad, licencia, riesgo de inyección, conflicto con políticas, idioma) para `nodejs-backend-patterns`, `nodejs-best-practices`, `typescript-advanced-types` y `vitest`, y documentarla en `.opencode/skill-registry.md`.

**Archivos previstos:** `.opencode/skill-registry.md`

**Prueba/TDD:** tarea documental con validación equivalente

**Criterio de finalización:** los campos "Pendiente"/"no documentada" del registry quedan resueltos o la no incorporación se decide formalmente

**Evidencia:** Completada 2026-10-07. Evaluación siguiendo el procedimiento de la skill `skill-intake` y `AGENTS.md` §11:

- **Registro/lock/disco**: 4/4 en `.opencode/skill-registry.md`, 4/4 en `skills-lock.json` (con `computedHash`), 4/4 `SKILL.md` físicos en `.agents/skills/`. Sin instalaciones nuevas, sin reemplazos, sin ampliación del registry.
- **Contenido**: `SKILL.md` de las 4 skills leídos íntegramente (639 + 343 + 717 + 52 líneas) + barrido de seguridad sobre `.agents/skills/**` (patrones de inyección: solicitud de secretos, cambios de permisos, desactivar validaciones, ignorar `AGENTS.md`, envío de datos, comandos destructivos) → **0 hallazgos maliciosos**. Los "ignore/disable" detectados son flags de CLI y pragmas de cobertura de Vitest.
- **Procedencia y licencia** (fuentes primarias verificadas): `wshobson/agents` → MIT (Seth Hobson); `sickn33/antigravity-awesome-skills` → MIT + CC BY 4.0; `antfu/skills` → MIT (Anthony Fu), con fuente primaria `vitest-dev/vitest` SHA `4a7321e` documentada en `GENERATION.md`.
- **Compatibilidad V3**: frontmatters estándar `name`+`description`; cargadas por OpenCode sin incidencias.
- **Resultado**: `vitest` → **ACEPTADA**; `typescript-advanced-types` → **ACEPTADA**; `nodejs-best-practices` → **ACEPTADA**; `nodejs-backend-patterns` → **ACEPTADA CON RESTRICCIONES** (ejemplos con `console.log` y dependencias; prevalecen `AGENTS.md` §7/§8 y Pino). Condiciones transversales: salida en español, precedencia de `AGENTS.md`, alcance solo referencial.
- **DISC-001** → **cerrado**; deuda de trazabilidad del registry **resuelta** (sin campos "Pendiente"). Ninguna decisión arquitectónica nueva requerida; sin bloqueos.

Vinculada a MIGRATION_GATE_4.

---

### TASK-012 — Resolver la ausencia de `sea-config.json` *(completada — derivada de DISC-004)*

**Estado:** completada

**Origen:** DISC-004

**Objetivo:** Determinar y ejecutar la resolución de la inconsistencia `README.md` ↔ disco: o bien crear `sea-config.json` con la configuración de empaquetado SEA coherente con `package.json` y `specs/001-spoty2-mvp/plan.md`, o bien corregir `README.md` si el archivo no es el mecanismo vigente. No resolver por inferencia: verificar primero el flujo de build real.

**Archivos previstos:** `sea-config.json` o `README.md` (según decisión), con registro en `DISCOVERIES.md`

**Prueba/TDD:** si se crea el archivo, validación ejecutable del build SEA; si se corrige documentación, validación verificable equivalente

**Criterio de finalización:** DISC-004 cerrado con decisión registrada; instrucción de compilación del `README.md` ejecutable o corregida

**Evidencia:** Completada 2026-10-07. Investigación acotada del flujo real de build:

- **A) ¿Debe existir actualmente?** No: `git log --all -- sea-config.json` → vacío (nunca existió); `package.json` sin script SEA; `postject` ausente en `package-lock.json`; `.github/` sin pipeline de release (solo `dependabot.yml`); `npm run build` = `tsc && tsc-alias` funciona sin él.
- **B) ¿Fue reemplazado?** No: no existe mecanismo alternativo. La regla vigente (`AGENTS.md` §7, `docs/constitution.md` #7, `docs/agent.md:55-56`) exige **compatibilidad de diseño** con la compilación futura (SEA o `@yao-pkg/pkg`), no la presencia del archivo.
- **C) ¿Necesario para el estado actual?** No: sin flujo de release activo, no hay nada que empaquetar ahora.
- **D) ¿Impide la migración V3?** No: ningún criterio de Gate 1-4 exige el archivo; la regla V3 es de diseño.
- **Decisión ejecutada:** **no se crea `sea-config.json`** (mecanismo nuevo sin necesidad actual, desalentado por la regla de cierre); se **corrige `README.md`** mínimamente: la sección "Compilación a Binario Standalone" describe el estado real (configuración SEA pendiente para la futura feature de release) y deja de prescribir un comando no ejecutable.
- **Validación equivalente:** el texto de `README.md` resultante no contiene comandos inexistentes; `git status` confirma `README.md` como único archivo de documentación de producto modificado; specs `001`/`002` intactas; `sea-config.json` no creado.
- **DISC-004** → **cerrado** (no bloqueante / deuda técnica documentada).

Vinculada a MIGRATION_GATE_4.
