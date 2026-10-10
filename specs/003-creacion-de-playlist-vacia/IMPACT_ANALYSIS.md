# Análisis de impacto: DISC-001 (regla `.gitignore` ignora `src/data/` y `tests/data/`)

- **Feature:** `003-creacion-de-playlist-vacia`
- **Descubrimiento:** `DISC-001` en `DISCOVERIES.md` (observación de `tdd-implementer` en TASK-003, formalizada el 2026-10-08)
- **Rama:** `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-004 completadas y verdes
- **Clasificación:** `TECHNICAL_BLOCKER`
- **Solicitud de cambio:** no se crea `CR-XXX` (no hay cambio de alcance)
- **Fecha:** 2026-10-08

## 1. Elemento que originó el descubrimiento

Configuración transversal de control de versiones: regla `.gitignore:10` `data/` con intención documentada `# Runtime data (tokens, app logs)`.

El patrón sin barra inicial coincide con cualquier directorio llamado `data` en cualquier nivel del repositorio, por lo que además del directorio runtime de la raíz (`data/app.log`, `data/tokens.json`) ignora los paquetes de código `src/data/` y `tests/data/` previstos por `ARCHITECTURE.md` §4.3 y `TASKS.md` TASK-002 y TASK-003.

Evidencia reproducida en esta actuación:

- `git check-ignore -v` sobre los cuatro entregables (`src/data/http/playlists-client.ts`, `tests/data/http/playlists-client.test.ts`, `src/data/logging/registro-tecnico.ts`, `tests/data/logging/registro-tecnico.test.ts`) → `.gitignore:10:data/` en los cuatro casos.
- `git ls-files --others --ignored --exclude-standard -- src/data tests/data` → 11 ficheros ignorados, incluidos ficheros preexistentes (`spotify-client.ts`, `pino-setup.ts`, `tokens-file.ts`, `log-file.ts`).
- `git ls-files -- src/data tests/data` → vacío; `git status --short` no lista dichos ficheros como `??`.

## 2. Recorrido de la cadena de trazabilidad

Cadena aplicada según la skill `change-impact`:

`DISC-001 → OBJ → RF/RNF → UC → AC → ARCH/ADR → TASK → TEST → CODE → VALIDATION`

- **OBJ-001:** no afectado. El objetivo (crear playlist vacía desde el CLI con confirmación en español) no cambia.
- **RF-001, RF-002:** no afectados. Ningún requisito funcional exige o prohíbe una regla de `.gitignore`; el comportamiento de creación, validación, duplicados y mensajes permanece intacto.
- **RNF-001 a RNF-006:** no afectados en su contenido. RNF-001 (sin secretos en registros) y RNF-006 (Pino en `data/app.log`) presuponen el directorio runtime de la raíz, que seguirá ignorado tras la corrección. RNF-003 (capas), RNF-004 (SEA) y RNF-005 (calidad) no dependen del patrón de ignorados.
- **UC-001 (principal, A1, E1-E3):** no afectado. Flujos, disparadores y postcondiciones intactos.
- **AC-001 a AC-005:** no afectados. Ningún escenario Gherkin describe seguimiento Git.
- **ARCHITECTURE.md 0.1.0 (incluidos ADR-001 y ADR-002):** no afectado. La arquitectura ya prevé `src/data/http/playlists-client.ts` y el registro sobre `pino-setup.ts`; el bloqueo no nace de una contradicción entre requisitos y arquitectura sino de una configuración de repositorio externa a la arquitectura.
- **TASKS.md (TASK-001 a TASK-021) y TEST_PLAN.md (TC-001 a TC-029):** no afectados en su contenido. TASK-002 (TC-002, TC-003) y TASK-003 (TC-004) siguen válidos; sus pruebas están en verde. Lo que queda bloqueado es la publicabilidad de su `CODE` asociado, no su definición.
- **CODE → VALIDATION:** bloqueado operativamente (el código existe y pasa pruebas pero no es versionable), sin que ello invalide el código mismo.

## 3. Clasificación: `TECHNICAL_BLOCKER`

Conforme a `.opencode/rules/change-management.md` (`PLANNING_OMISSION` / `SPEC_CORRECTION` / `SCOPE_CHANGE` / `ARCHITECTURE_CONFLICT` / `TECHNICAL_BLOCKER`):

| Categoría | Aplica | Motivo del descarte o aceptación |
|---|---|---|
| `PLANNING_OMISSION` | No | La necesidad bloqueada no estaba implícita ni explícita en la especificación como comportamiento omitido. El ejemplo de referencia (falta el botón que dispara una descarga ya especificada) no encaja: aquí ningún caso de uso, criterio, módulo de arquitectura ni tarea omitió un paso funcional. Todo el comportamiento está planificado. |
| `SPEC_CORRECTION` | No | La especificación 0.2.0 es internamente correcta y consistente (`SPEC_REVIEW.md` `PASS_WITH_NOTES` más addendum). No existe contradicción entre requisitos, casos de uso, criterios y arquitectura que corregir. |
| `SCOPE_CHANGE` | No | No aparece ningún comportamiento nuevo no contemplado (como programar descargas automáticas en el ejemplo de referencia). No se añade requisito, no se amplía alcance, no se modifica ningún literal aprobado. Por tanto no se registra `CR-XXX` y no se requiere aprobación de alcance. |
| `ARCHITECTURE_CONFLICT` | No | La solución prevista (`PlaylistGateway` en Data, `RegistroTecnico` sobre Pino, dirección `Presentation → Business → Data`, compatibilidad SEA, sin dependencias nuevas) sigue siendo compatible con las restricciones. El conflicto no es entre requisitos y arquitectura. |
| `TECHNICAL_BLOCKER` | **Sí** | Existe un bloqueo técnico que requiere decisión: la configuración de ignorados impide el seguimiento Git de todo `src/data/` y `tests/data/`, lo que bloquea la trazabilidad `CODE → VALIDATION` y el gate `FEATURE_DONE` sin afectar a ningún requisito. Requiere una decisión operativa mínima sobre `.gitignore`, sin replanificación funcional. |

## 4. Impacto por artefacto

| Artefacto | Afectado | Acción |
|---|---|---|
| `SPECS.md` | No | Sin cambio |
| `REQUIREMENTS.md` | No | Sin cambio |
| `USE_CASES.md` | No | Sin cambio |
| `ACCEPTANCE_CRITERIA.feature` | No | Sin cambio |
| `ARCHITECTURE.md` y ADR-001/ADR-002 | No | Sin cambio |
| `TASKS.md` | No | Sin cambio de contenido; TASK-002 y TASK-003 citadas solo como trazabilidad del bloqueo |
| `TEST_PLAN.md` | No | Sin cambio |
| `TRACEABILITY.md` | No | Sin cambio (la cadena funcional sigue válida) |
| `STATE.md` | No | Sin cambio (no se declara ni se mueve ningún gate en este análisis) |
| `SPEC_REVIEW.md` | No | Sin cambio |
| `DISCOVERIES.md` | Sí | Creado `DISC-001` (única escritura funcional permitida junto a este fichero) |
| `IMPACT_ANALYSIS.md` | Sí | Este fichero |
| `CHANGE_REQUESTS.md` | No | No se crea (no hay `SCOPE_CHANGE`; `CR-XXX` solo si es cambio de alcance) |
| `.gitignore` | Sí (propuesto, no aplicado) | Corrección propuesta exacta en §5; aplicación fuera del alcance autorizado de este análisis |
| Código (`src/`, `tests/`) | No | Prohibida su modificación en este análisis; el código existente no se toca |

## 5. Regla de mínimo cambio y corrección propuesta exacta

Se actualiza únicamente el artefacto afectado (`.gitignore`, línea 10). No se regenera ningún conjunto documental ni se toca especificación, arquitectura, tareas o código.

Corrección propuesta (sin aplicarla en este análisis):

```diff
 # Runtime data (tokens, app logs)
-data/
+/data/
```

Efecto:

- `/data/` con barra inicial ancla el patrón a la raíz del repositorio: solo se ignora el directorio runtime `data/` (`data/app.log`, `data/tokens.json`), que es la intención documentada del comentario.
- `src/data/` y `tests/data/` (código y pruebas de la capa Data) dejan de estar ignorados y pasan a ser rastreables, incluidos los entregables de TASK-002 y TASK-003 y los ficheros preexistentes hoy también ignorados.
- No cambia ningún comportamiento funcional, no añade dependencia, conserva las capas `Presentation → Business → Data` y conserva la compatibilidad con empaquetado futuro como binario único vía Node.js SEA (sin binarios nativos, sin carga dinámica, sin rutas nuevas).
- No se propone `!src/data/**` ni ninguna excepción adicional: sería redundante una vez anclado el patrón y ampliaría el cambio más allá del mínimo.

Nota de alcance mínimo: la regla `downloads/` (línea 13) presenta el mismo patrón sin ancla, pero queda fuera de este análisis porque ningún entregable de esta feature reside bajo un directorio `downloads` anidado y la regla de mínimo cambio prohíbe extender la corrección a lo no afectado. Si el orquestador lo considera, debe tratarlo como observación separada.

Verificación esperada tras aplicar la corrección (a realizar por quien la aplique, no en este análisis):

1. `git check-ignore -v src/data/http/playlists-client.ts` → sin salida (ya no ignorado).
2. `git check-ignore -v data/app.log` → `/data/` (sigue ignorado).
3. `git status --short` → muestra los ficheros de `src/data/` y `tests/data/` como `??` o `M` listos para seguimiento.
4. `git ls-files --others --exclude-standard -- src/data tests/data` → vacío en la columna de ignorados para dichos entregables.

## 6. Decisión

- Clasificar DISC-001 como `TECHNICAL_BLOCKER`.
- No crear `CR-XXX` en `CHANGE_REQUESTS.md`.
- No modificar `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `ARCHITECTURE.md`, `TASKS.md`, `TEST_PLAN.md`, `TRACEABILITY.md`, `STATE.md`, `SPEC_REVIEW.md`, código ni `.gitignore` en este análisis.
- Proponer al orquestador (y al humano si corresponde por tratarse de un fichero transversal) la corrección exacta `data/` → `/data/` como único cambio, con la verificación del §5.
- No avanzar a implementación hasta que la corrección esté aplicada y verificada, de modo que el commit final incluya los entregables de TASK-002 y TASK-003 y quede restaurada la cadena `CODE → VALIDATION` hacia `FEATURE_DONE`.

---

# Análisis de impacto: DISC-002 (canal de confirmación y cancelación no planificado en el contrato de `crearPlaylistVacia`)

- **Feature:** `003-creacion-de-playlist-vacia`
- **Descubrimiento:** `DISC-002` en `DISCOVERIES.md` (líneas 42-80; detectado por `tdd-implementer` durante la preparación de TASK-008, antes del RED de TC-010 a TC-013)
- **Rama:** `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-007 completadas y verdes
- **Clasificación:** `PLANNING_OMISSION`
- **Solicitud de cambio:** no se crea `CR-XXX` (no hay cambio de alcance)
- **Aprobación humana de alcance:** no requerida
- **Fecha:** 2026-10-09

## 1. Elemento que originó el descubrimiento

El contrato aprobado del caso de uso `crearPlaylistVacia(solicitud, dependencias)` con entrada limitada a `{ nombre, descripcion?, visibilidad }` (`src/business/playlists/types.ts:32-39`, contrato de TASK-001) más los cuatro puertos `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera` (`ARCHITECTURE.md` §5 y TASK-008).

Dicho contrato debe a la vez ser sensible a la confirmación y cancelación del usuario: producir `Cancelado` sin crear ni registrar (TASK-008 y TC-013), emitir el `info` de inicio solo cuando ya no hay posibilidad de cancelación (TASK-008 y TC-010), y cerrar la reinvocación tras la opción 2 del menú de duplicados sin bucle (UC-001-A1 paso 4/5 y `ARCHITECTURE.md` §6.5). No existe ningún canal aprobado para que esa confirmación o cancelación llegue a la función.

Tres facetas del mismo vacío, según `DISCOVERIES.md`:

1. `Cancelado` inalcanzable (TC-013): todo estado de entrada se agota en `SinSesion`, `ErrorValidacion`, `Duplicado`, `Exito` o desenlace de servicio; ninguna entrada produce `cancelado`.
2. `info` de inicio condicionado a la confirmación (TC-010): la función necesita distinguir estado confirmado de estado pendiente o cancelado, y ese estado no viaja en la solicitud ni en ningún puerto.
3. Reinvocación tras la opción 2 sin señal de cierre: Presentation reinvoca con la misma solicitud, que vuelve a listar propias y vuelve a detectar el duplicado, sin señal aprobada de duplicado ya aceptado o creación confirmada. La faceta de orden (duplicados en UC-001 paso 4 antes de la confirmación del paso 5 frente a AC-003) pertenece a la misma decisión.

Evidencia reproducida en este análisis (sin ejecutar código ni modificar artefactos):

- `TASKS.md:182-187`: la función recibe la solicitud y los cuatro puertos, produce `Cancelado` sin invocar creación y sin emitir ningún registro, y emite el `info` de inicio solo después de superar validación, duplicados y confirmación.
- `TASKS.md:189`: criterio de finalización de TASK-008 = TC-010, TC-011, TC-012 y TC-013 en verde.
- `TEST_PLAN.md:52-55`: TC-010 exige el `info` solo cuando ya no hay posibilidad de cancelación; TC-013 exige `Cancelado` con cero llamadas de creación y cero eventos al `RegistroTecnico`.
- `ARCHITECTURE.md:82`, `:97`, `:202`: `crearPlaylistVacia(solicitud, dependencias)` con solicitud de tres campos más las cuatro dependencias; `ARCHITECTURE.md:190`: Presentation gestiona el aborto y Business devuelve `Cancelado` cuando ya había sido invocado, sin definir por qué camino llega la cancelación.
- `src/business/playlists/types.ts:32-39`: `SolicitudCreacion` contiene solo `nombre`, `descripcion?` y `visibilidad`; `types.ts:108-117`: unión de 9 desenlaces incluido `cancelado`.
- Enumeración de estados de entrada: sin canal de cancelación no existe transición posible hacia `cancelado`.

## 2. Recorrido de la cadena de trazabilidad

Cadena aplicada según la skill `change-impact`:

`DISC-002 → OBJ → RF/RNF → UC → AC → ARCH/ADR → TASK → TEST → CODE → VALIDATION`

- **OBJ-001:** no afectado en su contenido. El objetivo (crear playlist vacía desde el CLI con confirmación en español) no cambia; se cita solo como raíz de la cadena.
- **RF-001, RF-002:** no afectados. RF-001 ya exige validación, duplicados y sesión; RF-002 ya exige confirmación `(s/N): ` y cancelación con `Creación cancelada. No se creó ninguna playlist.`. Ningún requisito añade comportamiento nuevo ni se modifica.
- **RNF-001 a RNF-006:** no afectados en su contenido. RNF-006 ya exige `info` de inicio y éxito y cero registros ante cancelación; RNF-003 (capas y reutilización no CLI), RNF-004 (SEA) y RNF-005 (calidad) siguen vigentes como restricciones para la futura corrección.
- **UC-001 (principal, A1, E1-E3):** no afectado. El flujo principal paso 5 (confirmación final), UC-001-A1 pasos 4/5 (opción 2 hacia la confirmación final, opción 0 sin crear ni registrar) y BR-007 ya contienen la necesidad; no se corrige ni se amplía el caso de uso.
- **AC-001 a AC-005:** no afectados. AC-001 (crear con confirmación), AC-003 (menú con confirmación y `Ctrl+C`) y AC-005 (opciones 1/2/0) ya exigen el comportamiento; ningún escenario Gherkin se modifica en este análisis.
- **ARCHITECTURE.md 0.1.0 (incluidos ADR-001 y ADR-002):** afectado y pendiente de corrección por `task-planner` (fuera del alcance de este análisis). Afecta a §4.2 (tipos de solicitud y resultado), §5 (los cuatro puertos no transportan confirmación), §6.5 (opción 2 hacia la confirmación), §6.7 (cancelación sin canal definido), §8 (ejemplo de solicitud con tres campos) y §10 (condición del `info` de inicio). ADR-001 y ADR-002 no se tocan: la política 429 y la puerta `PlaylistGateway` siguen válidas.
- **TASKS.md 0.1.0:** afectado y pendiente de replanificación (fuera de este análisis). TASK-008 (líneas 173-191: exige `Cancelado` y el `info` condicionado con el contrato actual) está bloqueada antes del RED; TASK-014 (coordinador con ramas de duplicados y confirmación) es arrastrada; TASK-015/TC-021, TASK-019/TC-027 lo son en última instancia. TASK-001 a TASK-007 completadas no se reabren.
- **TEST_PLAN.md 0.1.0:** afectado y pendiente de precisión (fuera de este análisis). TC-010 (condición del `info`) y TC-013 (transición a `Cancelado`) no son derivables sin definir primero cómo se expresa la cancelación; TC-011 y TC-012 siguen derivables. Ningún `TC-XXX` se reescribe en este análisis.
- **TRACEABILITY.md:** afectado solo como coherencia posterior. La cadena funcional `OBJ → RF/RNF → UC → AC` sigue válida; cuando `task-planner` complete arquitectura, tareas y pruebas deberá alinear las columnas `TASK`, `TC`, `CODE` y `VALIDATION`. No se modifica en este análisis.
- **CODE:** no modificado en este análisis. `src/business/playlists/types.ts` (`SolicitudCreacion`) y `src/business/playlists/puertos.ts` (`DependenciasCreacion`) quedan señalados como destino de la futura corrección; no se escribe `src/business/playlists/crear-playlist.ts` ni TC-010/TC-013.
- **VALIDATION:** bloqueada parcialmente. TASK-008 no puede cerrar sus cuatro criterios; en última instancia AC-001/AC-003/AC-005 quedan pendientes de evidencia hasta el replan. No se declara ningún gate en este análisis.

## 3. Clasificación: `PLANNING_OMISSION`

Conforme a `.opencode/rules/change-management.md` (`PLANNING_OMISSION` / `SPEC_CORRECTION` / `SCOPE_CHANGE` / `ARCHITECTURE_CONFLICT` / `TECHNICAL_BLOCKER`):

| Categoría | Aplica | Motivo del descarte o aceptación |
|---|---|---|
| `PLANNING_OMISSION` | **Sí** | La necesidad ya estaba explícita en la fuente de verdad: confirmación final `(s/N): ` y cancelaciones en RF-002, BR-007, UC-001 paso 5 y UC-001-A1, AC-001/AC-003/AC-005 y RNF-006 (cancelaciones sin registro). Lo omitido es el medio planificado (campo de estado de flujo, señal de duplicado aceptado, quinto puerto u otro canal) en arquitectura, contratos, tareas y pruebas. Encaja con el ejemplo de referencia (descarga especificada sin botón planificado): completar caso de uso, criterio, arquitectura o tareas afectados sin inventar requisito nuevo. |
| `SPEC_CORRECTION` | No | La especificación 0.2.0 es internamente correcta y consistente (`SPEC_REVIEW.md` `PASS_WITH_NOTES` más addendum). No existe contradicción entre requisitos, casos de uso y criterios que corregir: todos exigen de forma coherente confirmación y cancelación. El vacío nace en la traducción a contratos concretos, no en la fuente funcional. |
| `SCOPE_CHANGE` | No | No aparece ningún comportamiento nuevo no contemplado (como programar descargas automáticas en el ejemplo de referencia). La confirmación, la cancelación, el menú `1/2/0` y el `Cancelado` ya pertenecen al alcance aprobado P-002/P-004. Por tanto no se registra `CR-XXX` y no se requiere aprobación humana de alcance. |
| `ARCHITECTURE_CONFLICT` | No | La solución prevista sigue siendo compatible con las restricciones: dirección `Presentation → Business → Data`, Business sin CLI ni entrada o salida directa, Data con efectos encapsulados, reutilización no CLI y compatibilidad SEA. El problema no es incompatibilidad con RNF-003/RNF-004, sino enumeración incompleta de la solicitud y puertos dentro de esas restricciones. La futura corrección deberá mantenerse dentro de ellas. |
| `TECHNICAL_BLOCKER` | No | No existe bloqueo externo de herramienta, entorno o configuración (como DISC-001 con `.gitignore`). Es un vacío funcional de contrato que requiere completar la planificación, no una decisión técnica operativa. |

## 4. Impacto por artefacto (regla de mínimo cambio)

| Artefacto | Afectado | Acción en este análisis |
|---|---|---|
| `SPECS.md` 0.2.0 | No | Sin cambio; la fuente de verdad funcional queda intacta |
| `REQUIREMENTS.md` 0.2.0 | No | Sin cambio; no se modifica silenciosamente ningún requisito aprobado |
| `USE_CASES.md` 0.2.0 | No | Sin cambio |
| `ACCEPTANCE_CRITERIA.feature` 0.2.0 | No | Sin cambio |
| `ARCHITECTURE.md` 0.1.0 | Sí (pendiente, no aplicado) | `task-planner` deberá precisar §4.2, §5, §6.5/§6.7, §8 y §10 con el canal de confirmación elegido, dentro de RNF-003/RNF-004; ADR-001/ADR-002 intactos |
| `TASKS.md` 0.1.0 | Sí (pendiente, no aplicado) | `task-planner` deberá replanificar TASK-008 y TASK-014 (y por arrastre TASK-015/019); TASK-001 a TASK-007 no se reabren |
| `TEST_PLAN.md` 0.1.0 | Sí (pendiente, no aplicado) | `task-planner` deberá precisar TC-010 y TC-013 (cómo se expresa la cancelación y cuándo el `info` ya no es cancelable); TC-011/TC-012 intactos |
| `TRACEABILITY.md` | Sí (pendiente, no aplicado) | Alinear columnas `TASK`/`TC`/`CODE`/`VALIDATION` tras el replan; cadena `OBJ → RF/RNF → UC → AC` intacta |
| `STATE.md` | No | Sin cambio; no se declara ni se mueve ningún gate |
| `SPEC_REVIEW.md` | No | Sin cambio |
| `DISCOVERIES.md` | Sí | Actualizado el estado de DISC-002 a analizado con esta clasificación (única escritura funcional permitida junto a este fichero) |
| `IMPACT_ANALYSIS.md` | Sí | Este fichero (se conserva íntegro el análisis de DISC-001 y se añade este de DISC-002) |
| `CHANGE_REQUESTS.md` | No | No se crea `CR-XXX` (no hay `SCOPE_CHANGE`) |
| Código (`src/`, `tests/`) | No | Prohibida su modificación en este análisis; no se escribe `crear-playlist.ts` ni TC-010/TC-013 |

## 5. Decisión

- Clasificar DISC-002 como `PLANNING_OMISSION`.
- No crear `CR-XXX` en `CHANGE_REQUESTS.md`.
- No requerir aprobación humana de alcance (obligatoria solo para `SCOPE_CHANGE`, `ARCHITECTURE_CONFLICT` o cambio de requisitos aprobados; ninguno aplica).
- No modificar `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `ARCHITECTURE.md`, `TASKS.md`, `TEST_PLAN.md`, `TRACEABILITY.md`, `STATE.md`, `SPEC_REVIEW.md`, código ni pruebas en este análisis.
- Devolver el control al orquestador para que `task-planner` complete los artefactos afectados según la regla de mínimo cambio y desbloquee TASK-008.
- No avanzar a implementación ni a replanificación en este análisis.

---

# Análisis de impacto: DISC-003 (proveedor de cobertura `@vitest/coverage-v8` no declarado en `package.json`)

- **Feature:** `003-creacion-de-playlist-vacia`
- **Descubrimiento:** `DISC-003` en `DISCOVERIES.md` (detectado por `tdd-implementer` durante TASK-020, el 2026-10-09, antes de declarar la tarea terminada)
- **Rama:** `feat/REQ-003-creacion-de-playlist-vacia`, base `482bd57`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-019 completadas y verdes, TASK-020 con TC-028 en verde salvo la validación externa de cobertura
- **Clasificación:** `PLANNING_OMISSION`
- **Solicitud de cambio:** no se crea `CR-XXX` (no hay cambio de alcance)
- **Aprobación humana de alcance:** no requerida
- **Fecha de análisis:** 2026-10-10
- **Análisis de referencia:** `ses_eda7c46fbffehONm6SLvxkyIIF`
- **Replan asociado:** 0.1.2 aplicado por `task-planner` (`ses_eda7b6494ffeKbWfMPvC206JlF`) en `TASKS.md` y `TEST_PLAN.md`, con excepción justificada de `@vitest/coverage-v8`

## 1. Elemento que originó el descubrimiento

La tensión no resuelta entre TASK-020 §RNF-004 y §RNF-005, recogida en `TEST_PLAN.md` §4 (TC-028) y §8:

- `vitest.config.ts:12-20` ya configura la cobertura (`provider: 'v8'`, `include: ['src/business/**/*.ts']` y umbrales `lines`, `functions`, `branches` y `statements` en 80), pero el proveedor que la materializa, `@vitest/coverage-v8`, no figura en `package.json`.
- Ejecutar `npx vitest run --coverage` termina en salida 1 con `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`.
- TASK-020 §RNF-004 y `TEST_PLAN.md` §8 exigen literalmente «sin dependencias nuevas: Vitest, Biome, Pino, `msw` y el SDK de Spotify ya declarados», y TC-028 congela carácter a carácter los conjuntos de `dependencies` y `devDependencies` (`['@biomejs/biome', '@types/node', 'msw', 'pino-pretty', 'tsc-alias', 'typescript', 'vitest']`), de modo que añadir el proveedor sin replanificar dejaría TC-028 en rojo.

Evidencia reproducida en el descubrimiento (sin ejecutar código ni modificar artefactos en este asiento):

- `TASKS.md:393-394` (TASK-020): RNF-004 «sin dependencias nuevas, sin binarios nativos y sin requisitos de ejecución que impidan el empaquetado SEA» y RNF-005 «cobertura mínima del 80 % en `src/business/**` según `vitest.config.ts`».
- `TEST_PLAN.md:71` (TC-028): «suite Vitest en verde con cobertura mínima del 80 % en `src/business/**`»; `TEST_PLAN.md:111` (§8): «Sin dependencias nuevas: Vitest, Biome, Pino, `msw` y el SDK de Spotify ya declarados»; `TEST_PLAN.md:147`: «cobertura mínima alcanzada» entre las validaciones de cierre.
- `package.json`: `devDependencies` sin `@vitest/coverage-v8` (los 7 paquetes exactos que TC-028 congela antes del replan 0.1.2).
- `tests/transversal/verificacion-rnf.test.ts` (TC-028): aserción sobre las claves de `devDependencies` que fallaría si se añadiera el proveedor sin replanificar.

## 2. Recorrido de la cadena de trazabilidad

Cadena aplicada según la skill `change-impact`:

`DISC-003 → OBJ → RF/RNF → UC → AC → ARCH/ADR → TASK → TEST → CODE → VALIDATION`

- **OBJ-001:** no afectado en su contenido. El objetivo (crear playlist vacía desde el CLI con confirmación en español) no cambia; se cita solo como raíz de la cadena.
- **RF-001, RF-002:** no afectados. Ningún requisito funcional exige o prohíbe el proveedor de cobertura; el comportamiento de creación, validación, duplicados y mensajes permanece intacto.
- **RNF-004, RNF-005:** afectados solo en precisión, sin cambio de alcance. RNF-005 (cobertura mínima del 80 % en `src/business/**` según `vitest.config.ts`) queda intacto en umbral y alcance; RNF-004 («sin dependencias nuevas») se precisa en el replan 0.1.2 para recoger `@vitest/coverage-v8` como proveedor implícito de la base «Vitest ya declarado», ya configurado en `vitest.config.ts`. RNF-001 a RNF-003, RNF-004 en SEA y RNF-006 siguen vigentes como restricciones.
- **UC-001 (principal, A1, E1-E3):** no afectado. Flujos, disparadores y postcondiciones intactos.
- **AC-001 a AC-005:** no afectados. Ningún escenario Gherkin describe la herramienta de cobertura.
- **ARCHITECTURE.md 0.1.0 (incluidos ADR-001 y ADR-002):** no afectado. La cobertura es validación transversal fuera de las capas `Presentation → Business → Data`; no se añade puerto, módulo ni dependencia de producción.
- **TASKS.md:** afectado y replanificado en 0.1.2 (fuera del alcance de este asiento). TASK-020 §RNF-004 se precisa con `@vitest/coverage-v8` como proveedor implícito de RNF-005; RNF-005, el umbral del 80 % y el resto de tareas quedan intactos. TASK-001 a TASK-019 no se reabren.
- **TEST_PLAN.md:** afectado y replanificado en 0.1.2 (fuera del alcance de este asiento). La lista congelada de dependencias de TC-028 pasa de 7 a 8 paquetes con `@vitest/coverage-v8` y se precisa §8/§10; el umbral del 80 % y el resto de casos quedan intactos. Ningún `TC-XXX` se renumera.
- **TRACEABILITY.md:** no afectado en su cadena funcional. La cadena `OBJ → RF/RNF → UC → AC` sigue válida; la precisión de TASK-020/TC-028 no rompe trazabilidad crítica.
- **CODE:** no modificado en este asiento. `src/` y `tests/` funcionales quedan intactos; el único efecto previsto es en `package.json` como dependencia de desarrollo, sin código de producción.
- **VALIDATION:** desbloqueada en planificación, pendiente de ejecución operativa. La validación externa «cobertura mínima alcanzada» queda planificable tras el replan 0.1.2; su instalación y ejecución quedan fuera de este asiento y pendientes de autorización operativa del orquestador. No se declara ningún gate en este análisis.

## 3. Clasificación: `PLANNING_OMISSION`

Conforme a `.opencode/rules/change-management.md` (`PLANNING_OMISSION` / `SPEC_CORRECTION` / `SCOPE_CHANGE` / `ARCHITECTURE_CONFLICT` / `TECHNICAL_BLOCKER`):

| Categoría | Aplica | Motivo del descarte o aceptación |
|---|---|---|
| `PLANNING_OMISSION` | **Sí** | La necesidad ya estaba explícita en la fuente aprobada: RNF-005 exige cobertura mínima del 80 % en `src/business/**` según `vitest.config.ts`, y dicho fichero ya fija `provider: 'v8'` con umbrales en 80. Lo omitido es el medio planificado (declarar en `package.json` el proveedor que materializa esa configuración y actualizar la aserción congelada de TC-028). Encaja con el ejemplo de referencia (descarga especificada sin botón planificado): completar tareas y pruebas afectadas sin inventar requisito nuevo. |
| `SPEC_CORRECTION` | No | La especificación 0.2.0 es internamente correcta y consistente (`SPEC_REVIEW.md` `PASS_WITH_NOTES` más addendum). No existe contradicción entre requisitos, casos de uso y criterios que corregir: RNF-004 y RNF-005 son coherentes una vez precisado que el proveedor pertenece a la base «Vitest ya declarado». |
| `SCOPE_CHANGE` | No | No aparece ningún comportamiento nuevo no contemplado (como programar descargas automáticas en el ejemplo de referencia). La cobertura, el umbral del 80 % y la base de herramientas ya pertenecen al alcance aprobado. Por tanto no se registra `CR-XXX` y no se requiere aprobación humana de alcance. |
| `ARCHITECTURE_CONFLICT` | No | La solución prevista sigue siendo compatible con las restricciones: dirección `Presentation → Business → Data`, compatibilidad con empaquetado futuro como binario único vía Node.js SEA (solo dependencia de desarrollo, sin binarios nativos, sin carga dinámica y sin requisitos de ejecución nuevos) y reutilización no CLI. |
| `TECHNICAL_BLOCKER` | No | No existe bloqueo externo de herramienta o configuración ajeno a la planificación funcional (como DISC-001 con `.gitignore`). Es un vacío de planificación de dependencias de desarrollo que se resuelve con el replan mínimo. |

Justificación de mínimo cambio: `@vitest/coverage-v8` es la única vía para materializar el RNF-005 aprobado (proveedor `v8` ya fijado en `vitest.config.ts`, sin alternativa nativa que produzca la cobertura exigida), afecta solo a desarrollo (nunca a producción ni a SEA), y no amplía alcance ni modifica requisitos.

## 4. Impacto por artefacto (regla de mínimo cambio)

| Artefacto | Afectado | Acción en este asiento |
|---|---|---|
| `SPECS.md` 0.2.0 | No | Sin cambio; la fuente de verdad funcional queda intacta |
| `REQUIREMENTS.md` 0.2.0 | No | Sin cambio; no se modifica silenciosamente ningún requisito aprobado (RNF-004/RNF-005 intactos en contenido) |
| `USE_CASES.md` 0.2.0 | No | Sin cambio |
| `ACCEPTANCE_CRITERIA.feature` 0.2.0 | No | Sin cambio |
| `ARCHITECTURE.md` 0.1.0 | No | Sin cambio; ADR-001/ADR-002 intactos |
| `TASKS.md` | Sí (replanificado, no aplicado aquí) | Replan 0.1.2 ya aplicado: TASK-020 §RNF-004 precisado con `@vitest/coverage-v8` como proveedor implícito de RNF-005; resto intacto |
| `TEST_PLAN.md` | Sí (replanificado, no aplicado aquí) | Replan 0.1.2 ya aplicado: TC-028 con 8 paquetes y §8/§10 precisados; resto intacto |
| `TRACEABILITY.md` | No | Sin cambio (la cadena funcional sigue válida) |
| `STATE.md` | No | Sin cambio; no se declara ni se mueve ningún gate |
| `SPEC_REVIEW.md` | No | Sin cambio |
| `DISCOVERIES.md` | Sí | Actualizado el estado de DISC-003 a analizado con esta clasificación (única escritura funcional permitida junto a este fichero) |
| `IMPACT_ANALYSIS.md` | Sí | Este fichero (se conservan íntegros los análisis de DISC-001 y DISC-002 y se añade este de DISC-003) |
| `CHANGE_REQUESTS.md` | No | No se crea `CR-XXX` (no hay `SCOPE_CHANGE`) |
| Código (`src/`, `tests/`) | No | Prohibida su modificación en este asiento |

## 5. Decisión

- Clasificar DISC-003 como `PLANNING_OMISSION`.
- No crear `CR-XXX` en `CHANGE_REQUESTS.md`.
- No requerir aprobación humana de alcance (obligatoria solo para `SCOPE_CHANGE`, `ARCHITECTURE_CONFLICT` o cambio de requisitos aprobados; ninguno aplica).
- No modificar `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `ARCHITECTURE.md`, `TASKS.md`, `TEST_PLAN.md`, `TRACEABILITY.md`, `STATE.md`, `SPEC_REVIEW.md`, código, pruebas ni gates en este asiento.
- Dejar constancia del replan 0.1.2 ya aplicado en `TASKS.md` y `TEST_PLAN.md` (precisión de TASK-020, TC-028 y §8/§10 con `@vitest/coverage-v8` como proveedor implícito de RNF-005, solo desarrollo y sin efecto SEA).
- No avanzar a implementación en este asiento; la instalación operativa y la ejecución de la cobertura quedan pendientes de autorización operativa del orquestador.
