# Revisión de pruebas: 003-creacion-de-playlist-vacia

## 1. Metadatos

| Campo | Valor |
|---|---|
| Feature | `003-creacion-de-playlist-vacia` |
| Fecha de la revisión | 2026-10-10 |
| Rama | `feat/REQ-003-creacion-de-playlist-vacia` |
| Base | `482bd57` (`git rev-parse --short HEAD` → `482bd57`) |
| Fuentes revisadas | `TASKS.md` 0.1.3, `TEST_PLAN.md` 0.1.3, `TRACEABILITY.md`, `TDD_LOG.md`, `ACCEPTANCE_CRITERIA.feature` 0.2.0, `DISCOVERIES.md`, `CHANGE_REQUESTS.md` |
| Alcance de esta revisión | Solo lectura de código, pruebas y artefactos. No se modifica código ni especificación fuente. El único fichero creado es este informe (salida autorizada del revisor). |
| Veredicto | **PASS_WITH_NOTES — APTO para validación final** |

## 2. Lista de comprobaciones y evidencia de ejecución

| # | Comprobación | Resultado | Evidencia (comando → exit) |
|---|---|---|---|
| C-01 | Suite completa en verde | Cumple | `npx vitest run` → **exit 0** (`Test Files 30 passed`, `Tests 295 passed`, `Type Errors no errors`); repetido → **exit 0** |
| C-02 | Cobertura mínima del 80 % en el alcance 003 | Cumple | `npx vitest run --coverage` → **exit 0**; sentencias 97,79 %, ramas 92,50 %, funciones 100 %, líneas 97,76 % (`vitest.config.ts`: `src/business/playlists/**` + `src/business/retry/**`, umbrales 80 intactos) |
| C-03 | Compilación estricta | Cumple | `npx tsc --noEmit` → **exit 0** |
| C-04 | Tipos de las pruebas de nivel tipo (`TC-001`) | Cumple | `npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 0** |
| C-05 | Biome sobre código, pruebas y configuración | Cumple | `npx biome check src tests biome.json tsconfig.json tsconfig.type-tests.json vitest.config.ts` → **exit 0** (`Checked 67 files`) |
| C-06 | Biome a nivel de repositorio | Observación | `npx biome check .` → **exit 1** solo por artefactos fuera del alcance (`dist/**/*.d.ts`, `downloads/`, `package.json`, `opencode.json`, `skills-lock.json`, `.opencode/model-policy.json`); línea base ya registrada en `TDD_LOG.md` (TASK-020, fila «Baseline global honesto») |
| C-07 | Estados de planificación coherentes | Cumple | `TASKS.md`: 21/21 tareas con `Estado: DONE`; `TEST_PLAN.md`: 29/29 casos con `Verde` |
| C-08 | Determinismo de las pruebas de la feature | Cumple | `npx vitest run tests/acceptance tests/business/playlists tests/data tests/integration tests/presentation tests/transversal tests/business/retry --sequence.shuffle` → **exit 0** en 3 semillas distintas (246 pruebas por ejecución) |
| C-09 | Determinismo del orden completo | Observación | `npx vitest run --sequence.shuffle` → **exit 1** por 2 pruebas **preexistentes** de `tests/business/auth/` (ver H-03); el orden configurado (`npm test`) es estable y reproducible |
| C-10 | Sin red real | Cumple | `global.fetch` sustituido en `tests/setup.ts:4`; arnés con doble que rechaza toda URL no simulada y prueba explícita `tests/integration/arnes-e2e.test.ts:203` (`rejects.toThrow`) → la suite completa pasa sin Internet |
| C-11 | Sin credenciales reales | Cumple | Únicos valores de token en el repositorio son ficticios (`refresh-${testigo}`, `test-refresh-token`, `Bearer testigo-ficticio`); ninguna coincidencia de testigo real en `src/`, `tests/`, consola ni registros |
| C-12 | Sin escritura en `data/` real salvo la excepción documentada | Cumple con excepción verificada | Aislamiento con `SPOTY_LOG_FILE`/`SPOTY_TOKENS_FILE`/`SPOTY_LOG_DIR` en todos los ficheros nuevos; medición de fecha de modificación: `npx vitest run tests/acceptance tests/integration tests/transversal` → **exit 0** y `data/app.log` **sin modificar**; `npx vitest run tests/business/retry/retry.test.ts` (TC-005, preexistente) → **exit 0** y `data/app.log` **modificado**, tal como documenta `TDD_LOG.md` § TASK-017/§ TASK-020 observación (d) |
| C-13 | Sin restos en el repositorio tras la suite | Cumple | `test-data/` y `test-data-logs/` inexistentes tras la ejecución; el directorio `coverage/` generado por la revisión se eliminó; `data/` sigue gitignorado (`/data/`) |
| C-14 | Sin pruebas vacías ni deshabilitadas | Cumple | `grep` de `.skip`, `.only`, `.todo`, `xit`, `xdescribe` → 0 coincidencias; análisis automatizado de cuerpos de `it`/`test` → 272 tests de origen, sin aserciones solo 10: 9 son `test-d.ts` con `expectTypeOf` (52 aserciones de nivel tipo) y 1 es preexistente (H-04) |
| C-15 | Correspondencia Gherkin 1-1 | Cumple con nota menor | 46 pasos en `ACCEPTANCE_CRITERIA.feature`: 45 reproducidos literalmente como comentario con aserción en las suites de aceptación y 1 con sustitución del marcador `"X"` por el literal concreto `"Viaje 2026"`; 5 escenarios del `.feature` ↔ 5 `it` de aceptación con las etiquetas `@AC-001`…`@AC-005` |
| C-16 | Cobertura de criterios | Cumple | Ver §3 |
| C-17 | Cobertura de tareas con evidencia TDD | Cumple con notas | Ver §4 |
| C-18 | Casos de error y límites | Cumple | Ver §5 |
| C-19 | Integración en los límites entre capas | Cumple | Ver §5 |
| C-20 | Ausencia de mocks amplios sin necesidad | Cumple | 11 `vi.mock`, todos en fronteras justificadas: `node:readline/promises` (entrada simulada), `composicion-crear-playlist` (doble del caso de uso en pruebas de Presentation), `auth/flow` y `spotify-client` (aislar módulos ajenos a la feature). Los tests de aceptación no mockean el código evaluado: fijan los literales a mano |
| C-21 | Español estricto en la documentación de la revisión | Cumple | Todos los ficheros nuevos de la feature (`TDD_LOG.md`, pruebas de `tests/acceptance`, `tests/helpers`, `tests/transversal`, `tests/business/playlists`, `tests/integration`) están en español; los nombres en inglés corresponden solo a suites preexistentes (H-05) |

## 3. Cobertura de criterios AC-001 a AC-005

| Criterio | Escenario de aceptación | TC de aceptación | Soporte de unidad/integración | Verificación |
|---|---|---|---|---|
| AC-001 | `tests/acceptance/comando-directo.test.ts:184` (`@AC-001`) | TC-024 | TC-010 (`crear-playlist.test.ts:136`), TC-019 (`composicion-crear-playlist.test.ts:211`), TC-020 (`crear-playlist.test.ts:235`) | Cobertura verificada |
| AC-002 | `tests/acceptance/comando-directo.test.ts:232` (`@AC-002`), con los 4 ejemplos y 2 rechazos | TC-024 | TC-021 (`comando-crear-playlist.test.ts:209`) | Cobertura verificada |
| AC-003 | `tests/acceptance/menu-interactivo.test.ts:202` (`@AC-003`) | TC-026 | TC-018 (`prompts.test.ts:94`), TC-022 (`menu-crear-playlist.test.ts:176`) | Cobertura verificada |
| AC-004 | `tests/acceptance/comando-directo.test.ts:328` (`@AC-004`) | TC-025 | TC-002, TC-006, TC-009, TC-014, TC-015 (`playlists-client.test.ts:90`, `politica-reintento.test.ts`, `errores.test.ts:70`, `crear-playlist-reintentos.test.ts:135`) | Cobertura verificada |
| AC-005 | `tests/acceptance/menu-interactivo.test.ts:262` (`@AC-005`) | TC-027 | TC-007 (`validacion.test.ts:52`), TC-008 (`duplicados.test.ts:41`), TC-020 (`crear-playlist.test.ts:235`) | Cobertura verificada |

Los cinco criterios tienen escenario de aceptación en verde **más** soporte de unidad o integración, conforme a `TEST_PLAN.md` §5 y §10. Los literales de la aceptación están escritos a mano desde la especificación y no se leen del código evaluado (`tests/acceptance/comando-directo.test.ts:64`, `tests/acceptance/menu-interactivo.test.ts:63`).

## 4. Cobertura de tareas, TDD y no vaciedad

- 21/21 tareas (`TASK-001`…`TASK-021`) tienen `TC-XXX` declarado en `TASKS.md` y fila correspondiente en `TEST_PLAN.md` (29 casos, todos `Verde`).
- 20/20 tareas de comportamiento tienen entrada propia en `TDD_LOG.md` con `Evidencia RED`, `Implementación (GREEN)`, `Evidencia GREEN` y `Refactorización`, con ejecuciones `exit 1` en RED y `exit 0` en GREEN. `TASK-008` tiene dos asientos: el primero documenta el bloqueo legítimo por `DISC-002` («se detuvo antes del RED», sin implementación) y el segundo (`TASK-008 (reintento)`) completa el ciclo tras la replanificación 0.1.1.
- `TASK-021` es documental y aplica la validación equivalente prevista (`TEST_PLAN.md` §3), con `exit 0` en las comprobaciones de contenido y de matrices.
- **Comprobación de no vaciedad por mutación temporal documentada en 17 de 20 tareas de comportamiento**, siempre con mutación aplicada → `exit 1` → reversión → `exit 0` y hash SHA-256 idéntico (por ejemplo `TDD_LOG.md:1254`, `:1345`, `:1524`, `:1859`, `:1945`, `:2041`, `:2145`).
- **Tres tareas sin apartado de mutación explícito**: `TASK-002` (`TDD_LOG.md` líneas 116-242), `TASK-008 (reintento)` (966-1041) y `TASK-009` (1137-1216). En las tres la no vaciedad queda evidenciada por el propio RED (`exit 1` por módulo o comportamiento ausente: `Cannot find package '@/business/playlists/crear-playlist.js'`, «el error del gateway se propaga sin reintentar ni clasificar»), pero falta la comprobación posterior por mutación. No bloqueante: ver H-01.
- Las tareas de aceptación (`TASK-018`, `TASK-019`) declaran con honestidad que los escenarios no podían caer en rojo por comportamiento (la feature ya estaba implementada) y sustituyen el RED por mutaciones temporales que matan exactamente cada `@AC-XXX` (`TDD_LOG.md:1872`, `:1874`, `:1957`).

## 5. Calidad: errores, límites, integración y aislamiento

**Errores y límites relevantes cubiertos**

- Longitud: 2, 3, 100 y 101 caracteres visibles (`validacion.test.ts:64-77`), emoji de surrogate (`validacion.test.ts:82`), vacío y solo espacios (`validacion.test.ts`, `crear-playlist.test.ts`), rechazos en comando directo con `'x'.repeat(101)` (`comando-directo.test.ts:304`).
- HTTP: 201, 401, 403, 429 con y sin `Retry-After`, 500 con cuerpo sensible, cuerpo inesperado, sin testigo de sesión (`playlists-client.test.ts`, `errores.test.ts`, `crear-playlist-reintentos.test.ts`).
- Reintentos: 4 intentos máximos, esperas 7000/10000 ms sin temporizadores reales, `advertencia` por intento con `estado` 429 e `intento` 1-3 (`politica-reintento.test.ts:89-140`).
- Duplicados: recorte, sensibilidad a mayúsculas, contención descartada, lista propia vacía, lista ajena homónima (`duplicados.test.ts`).
- Cancelaciones: `N`, `S`, vacío, otra respuesta y `Ctrl+C` en cada petición, sin crear ni registrar (`prompts.test.ts`, `crear-playlist.test.ts`, `menu-interactivo.test.ts`).
- Seguridad: causas sin cuerpos ni cabeceras, sin `Bearer`/`refresh_token` en consola, registros y ficheros (`errores.test.ts:130`, `registro-tecnico.test.ts`, `verificacion-rnf.test.ts:244-291`).

**Integración en los límites entre capas**

- Data → Business: `playlists-client.test.ts` verifica la conformidad estructural con el puerto `PlaylistGateway` y que el módulo no importa de Business ni Presentation.
- Business → Presentation: `composicion-crear-playlist.test.ts` compone los cuatro puertos reales con red simulada y ficheros temporales, y revisa los imports de las tres capas.
- Extremo a extremo: `integration/arnes-e2e.test.ts` ejecuta comando y menú con Spotify simulado, tokens y registro en temporal, salida capturada y `Ctrl+C` simulable; prueba de aislamiento explícita (`:220-223`).
- Transversal: `transversal/verificacion-rnf.test.ts` ejecuta `tsc` y `biome` por spawn sobre el estado real del repositorio.

**Aislamiento**

- Sin navegación real, sin credenciales reales, sin escritura en `data/` salvo la excepción preexistente TC-005 (verificada empíricamente en C-12 y documentada en `TDD_LOG.md`).
- Las pruebas de aceptación e integración no tocan `data/app.log` (medición de fecha de modificación).
- Sin restos en el árbol de trabajo tras la suite.

## 6. Hallazgos

Ninguno bloqueante. Se listan los no bloqueantes con fichero y línea:

| ID | Hallazgo | Fichero / línea | Efecto |
|---|---|---|---|
| H-01 | Tres tareas sin comprobación de no vaciedad por mutación explícita (la no vaciedad la aporta el RED) | `TDD_LOG.md` § TASK-002 (116-242), § TASK-008 reintento (966-1041), § TASK-009 (1137-1216) | No bloqueante: `TEST_PLAN.md` §3 y §6 exigen RED→GREEN→REFACTOR registrado, no mutación obligatoria por tarea |
| H-02 | `npx biome check .` termina en `exit 1` por artefactos fuera del alcance (`dist/`, `downloads/`, ficheros de configuración raíz) | `biome.json:51-54` (`include: **/*.ts`, sin exclusión de `dist/`) | No bloqueante: el criterio aplicado (`TEST_PLAN.md` §6) es «Biome sin errores en código y en pruebas» y `npx biome check src tests …` → `exit 0` |
| H-03 | Pruebas preexistentes con dependencia del orden: bajo `--sequence.shuffle` fallan `getAuthConfig > should throw when env vars missing` y `validateTokensOrThrow > should return tokens when valid` en algunas semillas | `tests/business/auth/types.test.ts:61-73` (variables de entorno asignadas sin limpieza; `vi.unstable_unstubAllEnvs` no se aplica) y `tests/business/auth/tokens.test.ts:121-124` | No bloqueante para esta feature: ambos ficheros están sin modificar respecto de `HEAD 482bd57` (`git status` vacío sobre `tests/business/auth`), no pertenecen a los 29 `TC-XXX` y el comando configurado (`npm test`) es estable. Las pruebas de la 003 superan 3 ejecuciones barajadas |
| H-04 | Un test preexistente sin aserción: su cuerpo solo invoca y espera | `tests/business/retry/retry.test.ts:147-156` («should pass context to logger») | No bloqueante: preexistente, sin cambios, ajeno a los `TC-XXX` de la feature |
| H-05 | Títulos de prueba en inglés en suites preexistentes | `tests/business/auth/*.test.ts`, `tests/business/retry/retry.test.ts`, `tests/data/storage/*.test.ts` | No bloqueante: RNF-002 se refiere a documentación y mensajes de usuario; todos los ficheros nuevos de la 003 están en español |
| H-06 | `ACCEPTANCE_CRITERIA.feature` usa el marcador `"X"` en un paso y la suite lo reproduce con el literal concreto | `ACCEPTANCE_CRITERIA.feature:66` frente a `tests/acceptance/menu-interactivo.test.ts:309` | No bloqueante: correspondencia 1-1 conservada, con sustitución del marcador por el nombre del escenario y aserción sobre `LITERAL_DUPLICADO` |
| H-07 | Estados de `DISCOVERIES.md` desfasados respecto de la ejecución ya aplicada (`DISC-001` sigue diciendo «pendiente de corrección operativa» aunque `.gitignore` ya contiene `/data/`; `DISC-002` sigue diciendo «pendiente de replanificación» aunque el replan 0.1.1 está asentado) | `DISCOVERIES.md:11`, `DISCOVERIES.md:44` | No bloqueante para pruebas: corrección y replan verificados en el árbol; se señala al `final-validator` para el gate `FEATURE_DONE` («sin descubrimientos pendientes») |
| H-08 | `TRACEABILITY.md` conserva `Pendiente` en las columnas `TASK`, `TC`, `CODE` y `VALIDATION` | `TRACEABILITY.md:5-12` | No bloqueante para pruebas: artefacto de especificación no editable en esta revisión; la cadena completa vive en `TASKS.md` §6 y `TDD_LOG.md`. Se señala al `final-validator` (notas O-005/O-006) |

## 7. Veredicto

**PASS_WITH_NOTES — APTO para validación final.**

- Cobertura: los 5 criterios `AC-001`…`AC-005` tienen escenario de aceptación en verde (TC-024…TC-027) más soporte de unidad/integración; las 21 tareas tienen `TC-XXX` y evidencia `RED → GREEN → REFACTOR` en `TDD_LOG.md`.
- Calidad: sin pruebas deshabilitadas ni vacías, correspondencia Gherkin 1-1 (46/46 pasos), sin red real, sin credenciales y sin escritura en `data/` salvo la excepción preexistente TC-005 documentada y verificada empíricamente.
- Herramientas: `vitest run` (30/295), `vitest run --coverage` (97,79/92,50/100/97,76), `tsc --noEmit`, `tsc -p tsconfig.type-tests.json --noEmit` y `biome check` sobre el alcance terminan todos en **exit 0**.
- No se detecta ningún hallazgo bloqueante. Los ocho hallazgos de §6 son observaciones no bloqueantes, cuatro de ellos preexistentes y ajenos a la feature.
