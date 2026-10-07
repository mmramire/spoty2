# DESCUBRIMIENTOS

## Convención

Usar IDs reales secuenciales `DISC-001`, `DISC-002`, etc. No reutilizar identificadores.

---

### DISC-001

**Estado:** cerrado (2026-10-07, evaluación de contenido completada en TASK-011)

**Detectado por:** revisión de Fase A (TASK-003), agente de migración

**Contexto:** `skills-lock.json` declaraba 4 skills externas mientras `.opencode/skill-registry.md` afirmaba "El proyecto se inicia sin skills externas".

**Descripción:** Las 4 skills externas instaladas (`nodejs-backend-patterns`, `nodejs-best-practices`, `typescript-advanced-types`, `vitest`) están bloqueadas en `skills-lock.json` con `computedHash`, pero su **evaluación de contenido** (origen, licencia, mantenimiento, seguridad, conflicto de políticas) nunca se documentó, pese a que la regla interna de `skill-registry.md` exige evaluación e incorporación explícita antes de figurar como incorporadas.

**Impacto:** Deuda de trazabilidad y de seguridad de skills. `AGENTS.md` §11 exige evaluar origen, licencia y riesgo de inyección antes de incorporar una skill externa. Migrar el registro a "Incorporada" (hecho en TASK-003) sin la evaluación deja constancia de la omisión, no la subsana.

**Artefactos afectados:** `.opencode/skill-registry.md`, `skills-lock.json`, `.agents/skills/`

**Decisión:** Resuelto el 2026-10-07 mediante TASK-011: evaluación de contenido documentada en `.opencode/skill-registry.md` para las 4 skills (origen, mantenedor, licencia verificada, contenido completo revisado, detección de riesgos de inyección, compatibilidad V3, alineación con `AGENTS.md`). Resultado: `vitest`, `typescript-advanced-types` y `nodejs-best-practices` → **ACEPTADA**; `nodejs-backend-patterns` → **ACEPTADA CON RESTRICCIONES**. Sin bloqueos; sin instalaciones ni cambios de composición. La deuda de trazabilidad del registry queda **resuelta**.

**Tarea relacionada:** TASK-011 (completada)

**Cambio relacionado:** ninguno (solo evaluación documental; skills, lock y composición intactos)

**Aprobación humana requerida:** sí (otorgada en el cierre de migración)

**Evidencia:** `skills-lock.json` (4 entradas con hash), `.agents/skills/*/SKILL.md` (4 existentes y leídos íntegramente), `.opencode/skill-registry.md` (tabla de evaluación completa fechada 2026-10-07, sin campos "Pendiente"), licencias verificadas en fuentes primarias (MIT `wshobson/agents`, MIT+CC BY 4.0 `sickn33/antigravity-awesome-skills`, MIT `antfu/skills`), barrido de patrones de inyección en `.agents/skills/**` → sin coincidencias maliciosas.

---

### DISC-002

**Estado:** cerrado

**Detectado por:** ejecución de `node scripts/opencode-v3-validate.mjs` durante la insprevia de migración

**Contexto:** Ambos scripts v3 (`scripts/opencode-v3-validate.mjs` y `scripts/opencode-v3-models.mjs`) calculaban su raíz con `resolve(new URL("..", import.meta.url).pathname)`.

**Descripción:** En Windows, `new URL(...).pathname` devuelve una ruta con formato `/C:/...`, que `path.resolve` interpreta produciendo `C:\C:\Proyectos\spoty2\...`.

**Impacto:** El validador reportaba 24 falsos `FALTA` sobre archivos realmente existentes y fallaba con `JSON inválido: ENOENT ... C:\C:\Proyectos\spoty2\opencode.json` (exit 1). Además, `opencode-v3-models.mjs sync` habría leído/escrito en rutas rotas. Consecuencia directa: **MIGRATION_GATE_3 no era ejecutable**.

**Artefactos afectados:** `scripts/opencode-v3-validate.mjs`, `scripts/opencode-v3-models.mjs`

**Decisión:** Corregir la causa raíz usando `fileURLToPath` de `node:url` (solución estándar de Node.js para rutas URL → sistema de archivos), sin tocar la lógica de validación.

**Tarea relacionada:** TASK-001

**Cambio relacionado:** ninguno (infraestructura de migración, dentro de alcance aprobado)

**Aprobación humana requerida:** no (ejecutada bajo aprobación de Fase A)

**Evidencia:** `node scripts/opencode-v3-validate.mjs` → `JSON: válido` / `Estructura OpenCode v3: válida`, exit 0, sin `C:\C:\` ni `ENOENT`. `node scripts/opencode-v3-models.mjs list` → exit 0. Reproducible tras TASK-001.

---

### DISC-003

**Estado:** cerrado (2026-10-07, opción (b) aprobada)

**Detectado por:** revisión de `AGENTS.md` requerida por MIGRATION_GATE_3 (TASK-005)

**Contexto:** `AGENTS.md` no existe en `HEAD`; la fuente histórica de las reglas v2 es `.opencode/agent.md` (borrado, recuperable con `git show HEAD:.opencode/agent.md`).

**Descripción:** Tres reglas específicas del proyecto presentes en el `AGENTS.md` histórico **no aparecen** en el `AGENTS.md` v3 actual:

1. **Gate `spec-checker`** (v2, marcada en negrita): "Al completar specs: ejecuta el spec-checker manual o automático para validar cumplimiento de CHECKLIST DE VALIDACIÓN en todos los artefactos de specs/" y "si encuentra brechas: corrígelas antes de marcar la tarea como done". El agente `spec-checker` fue retirado como obsoleto y el `AGENTS.md` actual no establece ningún sustituto textual (el `final-validator` cubre una función análoga de forma implícita).
2. **Empaquetado como binario único** (v2 regla 7 y DoD): "diseñar la solución para que pueda empaquetarse como un binario ejecutable único… Node.js SEA".
3. **Incidencias SonarLint** (v2 protocolo paso 5 y DoD): "corrige antes de cerrar la tarea… no ignores advertencias de mantenibilidad o complejidad identificadas explícitamente".

**Impacto:** Bloqueaba la aprobación de Gate 3 (puntos "AGENTS.md histórico revisado" y "reglas específicas preservadas"). **Resuelto:** los tres puntos quedan incorporados en `AGENTS.md` y Gate 3 pasa a `APROBADO`.

**Artefactos afectados:** `AGENTS.md`, posiblemente `.opencode/commands/` y plantillas de specs

**Decisión:** Resuelta el 2026-10-07 mediante aprobación humana de la opción (b): incorporar solo las reglas históricas que sigan siendo aplicables, preservando la intención y no necesariamente el mecanismo v2. Verificación de vigencia realizada con evidencia (no por inferencia):

1. **`spec-checker`** → intención vigente, mecanismo sustituido. `final-validator` asume explícitamente la validación final de specs, requisitos y criterios de aceptación (texto añadido en `AGENTS.md` §4). No se reinstala el agente v2.
2. **Node.js SEA / binario único** → **vigente**, respaldado por decisión de arquitectura #11 de `specs/001-spoty2-mvp/plan.md`, `README.md` y `docs/constitution.md` (principio 7). Incorporado como restricción arquitectónica en `AGENTS.md` §7.
3. **SonarLint** → **vigente**, respaldado por `specs/002-download-songs/REQUIREMENTS.md` (complejidad cognitiva < 15) y `docs/constitution.md` (regla 5). Incorporada en `AGENTS.md` §9.

Ninguna de las tres se retira, por lo que no corresponde `CR-XXX`.

**Tarea relacionada:** TASK-010 (completada)

**Cambio relacionado:** ninguno (no hubo retiradas de reglas)

**Aprobación humana requerida:** sí

**Evidencia:** `git show HEAD:.opencode/agent.md` (reglas v2) vs `AGENTS.md` (170 líneas originales). Incorporaciones verificadas en `AGENTS.md` §4 (equivalencia `final-validator` ↔ `spec-checker`), §7 (restricción Node.js SEA) y §9 (SonarLint + umbral < 15), cada una con su referencia a DISC-003.

---

### DISC-004

**Estado:** cerrado (2026-10-07, corrección documental aplicada; deuda futura de release documentada)

**Detectado por:** verificación de respaldo de la regla SEA durante DISC-003 / TASK-010

**Contexto:** `README.md` documenta la sección "Compilación a Binario Standalone" y prescribe el comando `node --experimental-sea-config sea-config.json`.

**Descripción:** El archivo `sea-config.json` **no existe** ni en el disco de trabajo ni en el historial de git (`git ls-files` sin coincidencias), por lo que la instrucción de compilación del `README.md` no es ejecutable tal como está escrita.

**Impacto:** Inconsistencia documentación ↔ disco. No afecta al gate de migración (la restricción arquitectónica SEA sigue respaldada por `specs/001-spoty2-mvp/plan.md` y `docs/constitution.md`), pero sí a cualquier proceso de release que siga el README.

**Artefactos afectados:** `README.md` (posiblemente), ausencia de `sea-config.json`

**Decisión:** Resuelto el 2026-10-07 en TASK-012 mediante investigación acotada del flujo de build real (no por inferencia): `sea-config.json` **no debe existir en el estado actual** — nunca existió en el historial de git (`git log --all -- sea-config.json` sin resultados), `package.json` no tiene script SEA ni dependencia `postject`, no hay pipeline de release (solo `dependabot.yml`) y `npm run build` (tsc) funciona sin él. No fue reemplazado por otro mecanismo: la regla vigente (`AGENTS.md` §7, `docs/constitution.md` principio 7) es de **diseño compatible con la compilación futura**, no de presencia del archivo. **No se crea `sea-config.json`** (sería un mecanismo nuevo sin necesidad actual). Corrección mínima aplicada: `README.md` §"Compilación a Binario Standalone" describe ahora con veracidad el estado real (configuración pendiente) en lugar de prescribir un comando no ejecutable. Clasificada como **no bloqueante / deuda técnica documentada**: la creación de la configuración SEA queda para la futura feature de release binario. No bloquea Gate 4.

**Tarea relacionada:** TASK-012 (completada)

**Cambio relacionado:** ninguno de alcance (corrección documental en `README.md`; sin nuevo mecanismo SEA)

**Aprobación humana requerida:** sí (otorgada en el cierre de migración)

**Evidencia:** `Test-Path sea-config.json` → `False`; `git log --all --oneline -- sea-config.json` → vacío; `git ls-files | Select-String sea` → vacío; `package.json` scripts = `build, dev, test, test:watch, lint, lint:check` (sin SEA); `postject` ausente en `package-lock.json`; `.github/` solo `dependabot.yml`; `specs/001-spoty2-mvp/plan.md:239` (DoD con `node --experimental-sea-config` — histórico, read-only); `README.md` corregido en TASK-012.

---

### DISC-005

**Estado:** cerrado (2026-10-07, no bloqueante)

**Detectado por:** inspección del catálogo de modelos durante TASK-007 (Fase C)

**Contexto:** TASK-007 exige inspeccionar los modelos realmente disponibles. Se compararon dos fuentes del catálogo del proveedor `opencode`: la salida del CLI `opencode models` y la consulta del catálogo de modelos de OpenCode.

**Descripción:** Las dos fuentes discrepan. El CLI `opencode models` (tras `--refresh`) lista **11** modelos, todos `status: active`. La herramienta de catálogo de OpenCode reporta `total: 9`. Diferencia: `opencode/ling-3.0-flash-fin-free` y `opencode/nemotron-3-ultra-free` aparecen **solo en el CLI**.

**Impacto:** `nemotron-3-ultra-free` fue la justificación de TASK-002 ("inexistente en catálogo", reemplazado por `nemotron-3.5-lightning-free`); hoy el CLI lo lista como activo (fecha de lanzamiento 2026-06-04). La corrección de TASK-002 **sigue siendo válida**: todos los modelos configurados en `model-policy.json` existen en ambas fuentes (verificado). Lo que queda matizado es la evidencia histórica: cualquier verificación futura de existencia de modelos debe especificar qué fuente se usó. No bloquea gates.

**Artefactos afectados:** metodología de verificación de `.opencode/model-policy.json`; evidencia de TASK-002

**Decisión:** Cerrado (2026-10-07) como **discrepancia de catálogo no bloqueante**: diferencia entre la salida del CLI y la herramienta de catálogo de OpenCode, **sin impacto sobre los modelos actualmente utilizados por `model-policy.json`** (los 6 IDs configurados existen en ambas fuentes) y **sin acción requerida para completar la migración**. No se modifica la política de modelos. Lección documentada: toda verificación futura de existencia de modelos debe especificar qué fuente se usó. **No se crea `TASK-013`** (deuda futura documentada, no bloquea ningún criterio de Gate 4).

**Tarea relacionada:** ninguna (cerrado sin tarea; `TASK-013` no creado)

**Cambio relacionado:** ninguno

**Aprobación humana requerida:** sí (otorgada en el cierre de migración)

**Evidencia:** `opencode models --refresh` → 11 IDs; catálogo de modelos de OpenCode → `total: 9`; diferencia exacta = `[ling-3.0-flash-fin-free, nemotron-3-ultra-free]`; los 6 IDs de `model-policy.json` presentes en ambas fuentes.

---

### DISC-006

**Estado:** cerrado (2026-10-07, deuda documental histórica aceptada)

**Detectado por:** TASK-008 (revisión read-only de `specs/001` y `specs/002` para Gate 4)

**Contexto:** Gate 4 exige revisar ambas specs y verificar convenciones de idioma y trazabilidad. La revisión se hizo exclusivamente en lectura: ninguna inconsistencia fue corregida.

**Descripción:** Inconsistencias internas y huecos de trazabilidad encontrados.

`specs/002-download-songs/`:

1. **Colisión de IDs RB-015/RB-016**: `SPECS.md` define RB-015 = "permisos 0o600" y RB-016 = "sin tokens en logs"; `USE_CASES.md` define RB-015 = "directorio no escribible" y RB-016 = "Ctrl+C no deja archivo parcial". Dos significados distintos para los mismos IDs.
2. **RF-010 fantasma**: la "Matriz de Trazabilidad Resumen" de `REQUIREMENTS.md` incluye `RF-010` (§6, UC-005, AC-012), pero el documento no tiene sección RF-010 ni lo lista en la tabla superior (salta de RF-009 a RF-011).
3. **Mapeos incorrectos en la matriz de `REQUIREMENTS.md`**: RF-007 → UC-006 (el UC real de directorio personalizado es UC-004); RF-008 → UC-004 (UC-004 no cubre el resumen estadístico); RF-009 → AC-015 (AC-015 trata el directorio no escribible; el AC de menú para RF-009 es AC-016).
4. **Contradicción de idioma en logs**: RNF-006 define eventos en español (`"Descarga completada: <path>"`) y AC-018 los exige en español, pero AC-001 espera `"Download completed: 150 tracks"` y AC-012 `"Download cancelled by user at track 250/1000"` (inglés).
5. **Cobertura incompleta en el `.feature`**: la "Matriz de Cobertura" referencia un escenario `"Performance < 60s para 3000 tracks"` (RNF-001) **que no existe** en el archivo, y solo lista 8 de los 18 AC (omite RF-006/007/008/009 y RNF-002/003/004/005). Todos los estados = "Pendiente".
6. **Tests referenciados inexistentes**: los 6 archivos de la columna "Test" (`download-songs`, `rate-limit`, `token-refresh`, `cli-options`, `security`, `perf` `.test.ts`) **no existen**; `tests/` contiene solo 9 archivos relacionados con specs/001 (auth/retry/storage). RNF-005 exige cobertura ≥ 80% en Business sin evidencia de ejecución.

`specs/001-spoty2-mvp/`:

7. **IDs RF inexistentes en la spec**: `plan.md` traza con `RF-01`…`RF-08`, `RNF-06`, `RNF-08`, pero `spec.md` no define ningún ID (sus RF son secciones 5.1-5.7 sin identificador) y specs/001 no tiene `REQUIREMENTS.md`/`USE_CASES.md`/`.feature`. La trazabilidad externa solo es posible por contenido, no por ID.
8. **Inconsistencia menor de scopes**: decisión #3 dice "7 scopes pre-aprobados"; el ejemplo de `tokens.json` del propio `plan.md` lista 8.

Menores: checklists de validación sin marcar (`[ ]`) pese a "Estado: Aprobado"; numeración duplicada en `SPECS.md` (dos `## 3`, dos `## 9`); checklist de `ARCHITECTURE.md` dice "ADR-001 a ADR-005" pero existe ADR-006; keywords Gherkin mezcladas (`Scenario:` en AC-001..004 bajo `# language: es`, `Escenario:` en el resto).

**Impacto:** No bloquea Gate 4 por sí mismo (specs históricas, ya implementadas), pero deja deuda documental de trazabilidad e impide que el punto "No existen bloqueos conocidos" quede conforme hasta que se decida su destino. Evidencia relevante para DISC-005: **ninguna** (las specs no contienen referencias a catálogos de modelos); DISC-005 queda intacto.

**Artefactos afectados:** `specs/002-download-songs/` (SPECS, REQUIREMENTS, USE_CASES, ACCEPTANCE_CRITERIA), `specs/001-spoty2-mvp/` (spec.md, plan.md)

**Decisión:** Solo lectura en TASK-008; ninguna corrección aplicada. Requiere decisión humana: (a) corregir las specs históricas, o (b) aceptarlas como históricas y conservar estas lecciones como deuda documental. No convertir automáticamente en `TASK-XXX`.

**Tarea relacionada:** pendiente de decisión humana

**Cambio relacionado:** ninguno (specs intactas)

**Aprobación humana requerida:** sí

**Evidencia:** correspondencias leídas in situ: `SPECS.md` §3 (RB-015/016) vs `USE_CASES.md` §Reglas de Negocio (RB-015/016); `REQUIREMENTS.md` matriz de trazabilidad (RF-010, RF-007/008/009) vs secciones RF y `USE_CASES.md` UC-004/UC-006; `ACCEPTANCE_CRITERIA.feature` AC-001/AC-012/AC-018 vs `REQUIREMENTS.md` RNF-006; matriz de cobertura del `.feature` vs escenarios presentes; `Get-ChildItem -Recurse -Filter *.test.ts` → 6/6 tests de specs/002 ausentes; `plan.md` §6 vs `spec.md` §5 (sin IDs).

---

### DISC-007

**Estado:** cerrado (2026-10-07)

**Detectado por:** TASK-009 (duplicidad de templates y referencias cruzadas)

**Contexto:** En `.opencode/templates/` conviven 20 archivos: 17 con extensión `.template` (sistema de plantillas SDD con placeholders `{{FEATURE_NAME}}`) y 3 sin extensión (`STATE.md`, `TASKS.md`, `DISCOVERIES.md`) declarados como plantillas de persistencia de migración por `MIGRACION_V3.md` §9 y `README_APLICACION.md:10-12`.

**Descripción:** Tras comparar contenido, propósito, rutas y referencias, **no se detectó ningún duplicado redundante**: los 3 pares representan ámbitos diferentes (migración del proyecto vs artifacts de feature SDD), y los otros 14 `.template` no tienen par. Sin embargo, queda una **ambigüedad residual no declarada**: `.opencode/agents/feature-planner.md:33` y `.opencode/commands/sdd-iniciar.md:8` invocan genéricamente "las plantillas de `.opencode/templates/`" sin distinguir el ámbito, de modo que para `STATE.md`, `TASKS.md` y `DISCOVERIES.md` de una futura feature existen dos plantillas con contrato distinto y ninguna declaración en la propia carpeta que indique cuál usar.

**Impacto:** No bloquea Gate 4 por sí mismo, pero afecta al paso siguiente a la migración (iniciar Spec 003): un agente podría instanciar la plantilla de formato migración en lugar de la de formato feature (o viceversa). Corregirlo requeriría modificar un agente/comando o la documentación V3, fuera del alcance de TASK-009.

**Artefactos afectados:** `.opencode/templates/` (3 pares), `.opencode/agents/feature-planner.md`, `.opencode/commands/sdd-iniciar.md`

**Decisión:** Resuelto documentalmente (2026-10-07) mediante aclaración de ámbito mínima, **sin eliminar, renombrar, mover ni fusionar ningún template**. Declaración aplicada en los dos puntos de referencia genérica: `.opencode/agents/feature-planner.md:33` y `.opencode/commands/sdd-iniciar.md:8` quedan explícitos en que los flujos de features SDD consumen los templates de features SDD (archivos `.template`), que los archivos sin extensión (`STATE.md`, `TASKS.md`, `DISCOVERIES.md`) son templates de migración V2 → V3 que **no deben usarse como templates de nuevas features**, y que los `STATE.md`, `TASKS.md` y `DISCOVERIES.md` de la raíz son artefactos vivos, no templates. La ambigüedad de ámbito quedó resuelta documentalmente.

**Tarea relacionada:** TASK-009 (duplicidad detectada); resolución aplicada bajo esta aprobación humana

**Cambio relacionado:** ninguno (ningún archivo de template eliminado, renombrado, movido, fusionado ni modificado)

**Aprobación humana requerida:** sí (otorgada)

**Evidencia:** comparación de contenido de los 6 archivos (formato `**Campo:**` + tabla `MIGRATION_GATE_*` en los sin extensión vs placeholders `{{FEATURE_NAME}}` + gates `SPEC_READY`/`IMPLEMENTATION_READY`/`FEATURE_DONE` en los `.template`); referencias por nombre → solo los 3 sin extensión están referenciados (`MIGRACION_V3.md:200-202`, `README_APLICACION.md:10-12`); `feature-planner.md:33` y `sdd-iniciar.md:8` genéricos; ningún `.template` referenciado por nombre; sin referencias rotas (verificado con `Test-Path` literal sobre todas las rutas en backticks de la documentación V3). Resolución: los dos puntos de referencia genérica fueron reemplazados por formulación explícita de ámbito (migración V2 → V3 vs features SDD) el 2026-10-07; `.opencode/templates/` permanece con 20/20 archivos intactos y sin modificaciones.
