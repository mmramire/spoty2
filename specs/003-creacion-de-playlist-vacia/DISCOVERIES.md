# Descubrimientos: Creación de playlist vacía

## Convención

Usar identificadores secuenciales `DISC-001`, `DISC-002`, etc. Este fichero es de ámbito de la feature `003-creacion-de-playlist-vacia` y su numeración es local a la feature.

---

### DISC-001

**Estado:** analizado (pendiente de corrección operativa en `.gitignore`, sin bloqueo funcional)

**Detectado por:** observación de `tdd-implementer` durante TASK-003, formalizado por `change-analyzer` el 2026-10-08

**Contexto:** Rama `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-004 completadas y verdes. Al preparar el commit final se detecta que los entregables de TASK-002 y TASK-003 no aparecen en `git status`.

**Descripción:** La regla `.gitignore:10` `data/` —pensada para runtime (`data/app.log`, `data/tokens.json`)— ignora también `src/data/` y `tests/data/` porque un patrón sin barra inicial coincide con cualquier directorio llamado `data` en cualquier nivel. En consecuencia, los entregables `src/data/http/playlists-client.ts`, `tests/data/http/playlists-client.test.ts`, `src/data/logging/registro-tecnico.ts` y `tests/data/logging/registro-tecnico.test.ts` existen en disco pero no están bajo seguimiento Git y no entrarían en el commit final. El efecto es transversal: ningún fichero bajo `src/data/` ni `tests/data/` está seguido (incluidos ficheros preexistentes como `spotify-client.ts` o `pino-setup.ts`).

**Impacto:** No afecta al comportamiento funcional ni a los criterios de TASK-003. Bloquea la trazabilidad `CODE → VALIDATION` y el gate `FEATURE_DONE`, porque el código existe y las pruebas están en verde pero no son versionables ni revisables en el commit.

**Artefactos afectados:** Solo `.gitignore` (línea 10, configuración transversal de repositorio). Ningún artefacto funcional de la feature resulta afectado (ver `IMPACT_ANALYSIS.md`).

**Decisión:** Pendiente de aplicación operativa. Corrección propuesta `data/` → `/data/` (anclar a la raíz del repositorio) sin tocar especificación, arquitectura ni tareas. Este análisis no aplica la corrección (fuera de su alcance autorizado) y no avanza a implementación.

**Tarea relacionada:** TASK-002 (entregables de gateway no rastreados), TASK-003 (entregables de registro no rastreados). Las tareas no requieren replanificación; su contenido sigue válido.

**Cambio relacionado:** ninguno (no es cambio de alcance; no se crea `CR-XXX`).

**Aprobación humana requerida:** no para alcance (no hay cambio de requisitos). Se requiere autorización operativa del orquestador o del humano para aplicar la corrección en el fichero transversal `.gitignore` y verificar el seguimiento, fuera del alcance de este análisis.

**Evidencia:**

- `.gitignore:10` contiene `data/` con comentario `# Runtime data (tokens, app logs)`.
- `git check-ignore -v src/data/http/playlists-client.ts tests/data/http/playlists-client.test.ts src/data/logging/registro-tecnico.ts tests/data/logging/registro-tecnico.test.ts` → las cuatro rutas devuelven `.gitignore:10:data/`.
- `git ls-files --others --ignored --exclude-standard -- src/data tests/data` lista 11 ficheros ignorados, incluidos los cuatro entregables citados.
- `git ls-files -- src/data tests/data` → vacío (ningún fichero de `src/data` ni `tests/data` está bajo seguimiento).
- `git status --short` no muestra los ficheros de `src/data/` ni `tests/data/` como no rastreados (`??`), precisamente por estar ignorados.
- `Test-Path src/data` y `Test-Path tests/data` → `True` (los ficheros existen en disco).

---

### DISC-002

**Estado:** analizado por `change-analyzer` el 2026-10-09 (clasificación `PLANNING_OMISSION`; pendiente de replanificación por `task-planner`; TASK-008 sigue bloqueada hasta el replan)

**Detectado por:** `tdd-implementer` durante la preparación de TASK-008, el 2026-10-08, antes de escribir la prueba RED (TC-010 a TC-013)

**Contexto:** Rama `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-007 completadas y verdes. Antes de escribir TC-010 y TC-013 se intenta determinar qué invocación de `crearPlaylistVacia(solicitud, dependencias)` debe producir el desenlace `Cancelado` y en qué momento la función puede conocer que «ya no hay posibilidad de cancelación» para emitir el `info` de inicio (TASK-008, TC-010 y TC-013).

**Descripción:** los artefactos aprobados exigen a la vez que el caso de uso reciba exactamente la solicitud con `nombre`, `descripcion` opcional y `visibilidad`, más los cuatro puertos `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`, y que el caso de uso sea sensible a la confirmación/cancelación del usuario. No existe ningún canal aprobado para que esa confirmación o cancelación llegue a la función. Tres facetas del mismo vacío:

1. **`Cancelado` inalcanzable (TC-013).** Con la entrada limitada a `{ nombre, descripcion?, visibilidad }` (`src/business/playlists/types.ts:32-39`, contrato de TASK-001) y a los cuatro puertos, todo estado de entrada se agota en: sin sesión → `SinSesion`; longitud inválida → `ErrorValidacion` de `nombre`; visibilidad `ausente`/`doble` → `ErrorValidacion` de `visibilidad`; duplicado → `Duplicado`; sin duplicado → `Exito` o desenlace de servicio. Ninguna entrada produce `cancelado`, por lo que TC-013 («resultado `Cancelado`, cero llamadas de creación y cero eventos emitidos al `RegistroTecnico`») no puede escribirse sin definir primero cómo se expresa la cancelación.
2. **`info` de inicio condicionado a la confirmación (TC-010).** TASK-008 exige emitir el `info` de inicio «solo después de superar validación, duplicados y confirmación» y TC-010 exige que se emita «solo cuando ya no hay posibilidad de cancelación»; la función necesita distinguir estado confirmado de estado pendiente o cancelado, y ese estado no viaja en la solicitud ni en ningún puerto (los cuatro están fijados en `ARCHITECTURE.md` §5 y en TASK-008).
3. **Reinvocación tras la opción 2 del menú de duplicados (bucle imposible de cerrar).** UC-001-A1 paso 4/5 y `ARCHITECTURE.md` §6.5 establecen que, ante `Duplicado`, la opción 2 «continúa hacia la confirmación final» y después crea con el mismo nombre. Presentation debe reinvocar el caso de uso con la misma solicitud, que vuelve a listar propias y vuelve a detectar el duplicado → `Duplicado` otra vez → el flujo no alcanza nunca `Exito` sin una señal aprobada de «duplicado ya aceptado / creación confirmada».

Faceta adicional de la misma decisión (orden): UC-001 coloca la comprobación de duplicados (paso 4) antes de la confirmación final (paso 5), mientras AC-003 muestra peticiones → confirmación en la vía simple; si la confirmación debe conocerse *antes* de invocar al caso de uso (única vía sin nuevo campo), el orden aprobado se invierte en la vía sin duplicados, y el estado intermedio «nombre válido, sin duplicado, sin confirmar» no tiene desenlace en la unión aprobada de 9 resultados.

**Impacto:** bloquea TASK-008 de forma parcial pero determinante: TC-011 (`SinSesion`/`ErrorValidacion`) y TC-012 (`Duplicado` + `advertencia`) son derivables, pero TC-010 y TC-013 no lo son, y el criterio de finalización de TASK-008 exige los cuatro en verde. Arrastra TASK-014 (coordinador con ramas de duplicados y confirmación), TASK-015/TC-021, TASK-019/TC-027 (aceptación de la opción 2 con Spotify simulado) y, en última instancia, AC-001/AC-003/AC-005.

**Artefactos afectados (potenciales, no modificados por este descubrimiento):** `ARCHITECTURE.md` §4.2 y §8 (enumeración de la solicitud), `ARCHITECTURE.md` §5 (cuatro puertos) y §6.5/§6.7, `src/business/playlists/types.ts` (`SolicitudCreacion`, contrato de TASK-001), `src/business/playlists/puertos.ts` (`DependenciasCreacion`), `TASKS.md` §TASK-008 y §TASK-014, `TEST_PLAN.md` TC-010 y TC-013. Este descubrimiento no modifica ninguno de ellos.

**Decisión:** ninguna solución implementada. No se escribe `src/business/playlists/crear-playlist.ts` ni TC-010/TC-013, porque cualquier diseño elegido (campo nuevo en la solicitud, quinto puerto, memoria de la invocación u otro) modifica contratos aprobados y fija comportamiento no definido. Precedente aplicable: TASK-007 registró que «los contratos de TASK-001 solo cambian con `DISC-XXX`».

**Clasificación candidata (la determina `change-analyzer`, no este descubrimiento):** `PLANNING_OMISSION` si la enumeración de `ARCHITECTURE.md` §4.2/§8 se consideraba resumida y la solicitud estaba prevista para llevar también el estado de flujo; `ARCHITECTURE_CONFLICT` o `SPEC_CORRECTION` si la entrada de tres campos se considera exhaustiva y TASK-008/TC-010/TC-013 exigen un canal de confirmación que la arquitectura no contempla.

**Tarea relacionada:** TASK-008 (bloqueada antes del RED). Relacionadas posteriormente: TASK-014, TASK-015, TASK-019.

**Cambio relacionado:** ninguno (no se crea `CR-XXX` hasta que `change-analyzer` clasifique el vacío).

**Aprobación humana requerida:** sí, si la clasificación resulta ser `SCOPE_CHANGE` o `ARCHITECTURE_CONFLICT`; no procede continuar con implementación especulativa mientras el análisis esté pendiente.

**Evidencia:**

- `TASKS.md:182-187` (TASK-008): la función «recibe la solicitud y los puertos `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`», produce `Cancelado` «sin invocar creación y sin emitir ningún registro» y emite el `info` de inicio «solo después de superar validación, duplicados y confirmación».
- `TASKS.md:189`: criterio de finalización = TC-010, TC-011, TC-012 y TC-013 en verde.
- `TEST_PLAN.md:52-55`: definiciones de TC-010 («el `info` de inicio solo se emite cuando ya no hay posibilidad de cancelación») y TC-013 («resultado `Cancelado`, cero llamadas de creación y cero eventos emitidos al `RegistroTecnico`»).
- `ARCHITECTURE.md:82`, `:97`, `:202`: «crearPlaylistVacia(solicitud, dependencias)» con «una solicitud con nombre, descripción opcional y visibilidad, más las dependencias `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`»; `ARCHITECTURE.md:190`: «Presentation gestiona el aborto; Business devuelve `Cancelado` cuando ya había sido invocado», sin definir por qué camino llega la cancelación.
- `src/business/playlists/types.ts:32-39`: `SolicitudCreacion` contiene solo `nombre`, `descripcion?` y `visibilidad`.
- `grep -rn -i "confirm" src/` en la capa Business sin resultados: no existe ningún campo o puerto de confirmación en el código actual.
- Enumeración de estados de entrada de la función (revisión manual): sin canal de cancelación posible hacia el desenlace `cancelado` de `ResultadoCreacion` (`types.ts:108-117`, 9 desenlaces).

---

### DISC-003

**Estado:** analizado por `change-analyzer` el 2026-10-10 (análisis `ses_eda7c46fbffehONm6SLvxkyIIF`; clasificación `PLANNING_OMISSION`; replan 0.1.2 aplicado en `TASKS.md` y `TEST_PLAN.md`; sin `CR-XXX`)

**Detectado por:** `tdd-implementer` el 2026-10-09, al ejecutar la validación externa de cobertura prevista para TC-028 (`npx vitest run --coverage`)

**Contexto:** rama `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-019 completadas y verdes, TASK-020 con TC-028 en verde (20 pruebas) y la suite completa en verde (30 ficheros, 295 pruebas). TASK-020 §RNF-005 exige «`tsc --noEmit` en modo estricto, Biome sin errores, Vitest completo en verde, cobertura mínima del 80 % en `src/business/**` según `vitest.config.ts`, complejidad cognitiva menor de 15 por función y ausencia de `any`», y TC-028 (`TEST_PLAN.md` §4) exige «suite Vitest en verde con cobertura mínima del 80 % en `src/business/**`», mientras TASK-020 §RNF-004 y `TEST_PLAN.md` §8 exigen literalmente «sin dependencias nuevas: Vitest, Biome, Pino, `msw` y el SDK de Spotify ya declarados».

**Descripción:** `vitest.config.ts` ya configura la cobertura (`provider: 'v8'`, `include: ['src/business/**/*.ts']` y umbrales `lines`, `functions`, `branches` y `statements` en 80), pero el proveedor que la materializa, `@vitest/coverage-v8`, no figura en `package.json`. Ejecutar `npx vitest run --coverage` termina en exit 1 con `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. Instalarlo entraría en conflicto con RNF-004 y con la propia TC-028: la prueba congela carácter a carácter los sets de `dependencies` y `devDependencies` (`['@biomejs/biome', '@types/node', 'msw', 'pino-pretty', 'tsc-alias', 'typescript', 'vitest']`), de modo que añadir el proveedor dejaría TC-028 en roja. Existe, por tanto, una tensión no resuelta entre RNF-004 (sin dependencias nuevas) y RNF-005/TC-028 (cobertura ejecutable con el 80 %), sin decisión aprobada sobre si `@vitest/coverage-v8` se considera parte de «Vitest ya declarado» o una dependencia nueva sujeta a justificación e investigación (`AGENTS.md` §8).

**Impacto:** la validación externa «cobertura mínima alcanzada» (`TEST_PLAN.md`) queda no ejecutable y el gate `FEATURE_DONE` de RNF-005 no puede respaldarse con evidencia de ejecución; TC-028 solo puede verificar la *configuración* de cobertura en `vitest.config.ts`. No afecta al comportamiento funcional ni al resto de pruebas: la suite completa sigue en verde.

**Artefactos afectados (potenciales, no modificados por este descubrimiento):** `TASKS.md` §TASK-020 (líneas de RNF-004 y RNF-005), `TEST_PLAN.md` §4 (TC-028) y §8, `package.json` (lista de dependencias congeladas por TC-028) y, según la clasificación, `REQUIREMENTS.md` RNF-004/RNF-005. Este descubrimiento no modifica ninguno de ellos.

**Decisión:** analizado como `PLANNING_OMISSION` en el análisis `ses_eda7c46fbffehONm6SLvxkyIIF` (2026-10-10). No se instala `@vitest/coverage-v8` en este asiento ni se ejecuta la cobertura; el replan 0.1.2 precisa TASK-020 §RNF-004 con `@vitest/coverage-v8` como proveedor implícito de RNF-005 ya configurado en `vitest.config.ts` y actualiza TC-028 y `TEST_PLAN.md` §8/§10, sin modificar requisitos aprobados ni crear `CR-XXX`. La ejecución de cobertura queda registrada como validación externa pendiente de ejecución operativa, y TC-028 verifica la configuración de cobertura aprobada más la lista actualizada de dependencias.

**Clasificación definitiva (`change-analyzer`, análisis `ses_eda7c46fbffehONm6SLvxkyIIF`, 2026-10-10):** `PLANNING_OMISSION` (el proveedor se consideraba implícito en la base «Vitest ya declarado» y solo faltó declararlo en `package.json`; replan mínimo en 0.1.2). Se descarta `SCOPE_CHANGE` con `CR-XXX` por no existir dependencia nueva sujeta a alcance ni cambio de requisitos.

**Tarea relacionada:** TASK-020 (validación externa de cobertura de TC-028). Ninguna otra tarea depende de ella para su ejecución.

**Cambio relacionado:** ninguno (clasificación `PLANNING_OMISSION` confirmada el 2026-10-10; no se crea `CR-XXX` por no existir cambio de alcance).

**Aprobación humana requerida:** no para alcance (clasificación `PLANNING_OMISSION` sin `CR-XXX` ni cambio de requisitos). La instalación operativa de `@vitest/coverage-v8` y la ejecución de la cobertura quedan fuera del alcance de este asiento y pendientes de autorización operativa del orquestador.

**Evidencia:**

- `TASKS.md:393-394` (TASK-020): RNF-004 «sin dependencias nuevas, sin binarios nativos y sin requisitos de ejecución que impidan el empaquetado SEA» y RNF-005 «cobertura mínima del 80 % en `src/business/**` según `vitest.config.ts`».
- `TEST_PLAN.md:71` (TC-028): «suite Vitest en verde con cobertura mínima del 80 % en `src/business/**`»; `TEST_PLAN.md:111` (§8): «Sin dependencias nuevas: Vitest, Biome, Pino, `msw` y el SDK de Spotify ya declarados»; `TEST_PLAN.md:147`: «cobertura mínima alcanzada» entre las validaciones de cierre.
- `vitest.config.ts:12-20`: `coverage.provider: 'v8'`, `include: ['src/business/**/*.ts']` y umbrales `lines`, `functions`, `branches` y `statements` en 80.
- `package.json`: `devDependencies` sin `@vitest/coverage-v8` (los 7 paquetes exactos que TC-028 congela).
- `npx vitest run --coverage` → **exit 1** con `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`.
- `tests/transversal/verificacion-rnf.test.ts` (TC-028): aserción `expect(claves(paquete.devDependencies)).toEqual([...])` que fallaría si se añadiera el proveedor sin replanificar.

---

### DISC-004

**Estado:** **cerrado** el 2026-10-10. Analizado por `change-analyzer` (análisis vinculante `ses_eda659a8fffe41u9Q81OIfhly8`, clasificación `SCOPE_CHANGE`), `CR-001` aprobada por aprobación humana explícita el 2026-10-10 08:51 y **ejecutada** el 2026-10-10 por `tdd-implementer`: `coverage.include` re-acotado al alcance 003 en `vitest.config.ts` con el umbral del 80 % intacto, TC-028 actualizado en verde y cobertura externa verificada (sentencias 97,79 %, ramas 92,50 %, funciones 100 %, líneas 97,76 %, exit 0). Detalle en el addendum de cierre de `TDD_LOG.md`.

**Detectado por:** `tdd-implementer`, al ejecutar la validación externa de cobertura de RNF-005 (`npx vitest run --coverage`) una vez instalado `@vitest/coverage-v8@5.0.3` conforme al replan 0.1.2 de `DISC-003`.

**Contexto:** rama `feat/REQ-003-creacion-de-playlist-vacia`, gate `IMPLEMENTATION_READY`, TASK-001 a TASK-019 completadas y verdes, TASK-020 con TC-028 en verde (20 pruebas) y la suite completa en verde (30 ficheros, 295 pruebas). `@vitest/coverage-v8@5.0.3` está instalado como única dependencia de desarrollo nueva autorizada por el replan 0.1.2 de `DISC-003` (resuelto y fijado en el lockfile, sin warnings de peer, sin efecto sobre el empaquetado SEA), de modo que la cobertura ya es ejecutable y `vitest.config.ts` aplica los umbrales aprobados del 80 % sobre `src/business/**`.

**Descripción:** con la cobertura ejecutable, `src/business/**` obtiene **71,86 % de sentencias, 72,64 % de ramas, 79,51 % de funciones y 71,72 % de líneas**: por debajo del umbral del 80 % en las cuatro métricas, con exit 1 (`ERROR: Coverage for lines (71.72%) does not meet global threshold (80%)`, e idénticamente para las otras tres). La causa raíz no está en la instrumentación ni en la feature 003: `src/business/download-songs.ts` (código preexistente de la feature 002) aparece con 0 % y `src/business/auth/flow.ts` (código preexistente de la feature 001) con 8,97 %, y ninguna prueba del repositorio ejecuta esos módulos en esta rama — la única suite que los toca, `tests/presentation/menu-crear-playlist.test.ts`, los sustituye íntegramente con `vi.mock`. La instrumentación v8 es correcta: los módulos de la feature 003 alcanzan `business/playlists` 97,76 % y `business/retry` 97,87 %. El umbral del 80 % sobre el agregado de `src/business/**` es, por tanto, inalcanzable con las 295 pruebas actuales: harían falta pruebas nuevas sobre el flujo OAuth (`flow.ts`) y la descarga (`download-songs.ts`), comportamiento de las features 001 y 002.

**Impacto:** la validación externa «cobertura mínima alcanzada» (`TEST_PLAN.md` §10/§147) falla con evidencia numérica, de modo que RNF-005 y el gate `FEATURE_DONE` no pueden respaldarse y TASK-020 no puede cerrarse. No afecta al comportamiento funcional: la suite completa sigue en verde (295/295) y `TC-028` sigue en verde con 20/20.

**Artefactos afectados (potenciales, no modificados por este descubrimiento):** `REQUIREMENTS.md` RNF-005 (umbral del 80 %), `TEST_PLAN.md` §4 (TC-028), §10 y la validación de cierre «cobertura mínima alcanzada», `TASKS.md` §TASK-020 (RNF-005) y `vitest.config.ts` (umbrales). Este descubrimiento no modifica ninguno de ellos.

**Decisión:** analizado como `SCOPE_CHANGE` por `change-analyzer` el 2026-10-10 (análisis `ses_eda659a8fffe41u9Q81OIfhly8`) y aprobado por aprobación humana explícita el 2026-10-10 08:51. Opción aprobada recogida en `CR-001` (`CHANGE_REQUESTS.md`): re-acotar la medición de cobertura al alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) manteniendo el umbral del 80 %, con replanificación 0.1.3 aplicada en `TASKS.md` y `TEST_PLAN.md`. No se relaja el umbral del 80 %, no se excluye ningún fichero propio del alcance 003, no se añaden pruebas de las features 001/002 y no se modifica `src/business/download-songs.ts` ni `src/business/auth/flow.ts`. ejecutado el 2026-10-10 por `tdd-implementer` con TDD: el ajuste de `coverage.include` en `vitest.config.ts` (RED exit 1 → GREEN exit 0, umbral del 80 % intacto) y la validación externa de cobertura (`npx vitest run --coverage` exit 0 con sentencias 97,79 %, ramas 92,50 %, funciones 100 % y líneas 97,76 % sobre el alcance 003). El descubrimiento queda cerrado.

**Tarea relacionada:** TASK-020 (validación externa de cobertura de TC-028). Ninguna otra tarea depende de ella para su ejecución, pero el gate `FEATURE_DONE` de la feature sí depende del resultado.

**Cambio relacionado:** `CR-001` (`CHANGE_REQUESTS.md`, clasificación `SCOPE_CHANGE`, aprobación humana 2026-10-10 08:51, estado `IMPLEMENTADO`), replanificación 0.1.3 aplicada en `TASKS.md` y `TEST_PLAN.md` y ejecución completada el 2026-10-10.

**Aprobación humana requerida:** sí para alcance, y **obtenida**: aprobación humana explícita el 2026-10-10 08:51 para la opción «Re-acotar medición a 003» manteniendo el umbral del 80 % (`CR-001`). Sin esta aprobación no se habría avanzado.

**Evidencia:**

- `npx vitest run --coverage` → **exit 1** con `Coverage summary: Statements 71.86 % (281/391), Branches 72.64 % (162/223), Functions 79.51 % (66/83), Lines 71.72 % (279/389)` y los cuatro `ERROR: Coverage for … does not meet global threshold (80%)`.
- Informe de cobertura: `business/download-songs.ts` 0 % (líneas 45-150 sin cubrir), `business/auth/flow.ts` 8,97 %, `business/auth/tokens.ts` 93,1 %, `business/auth/types.ts` 92,3 %, `business/playlists/**` 97,76 %, `business/retry/retry.ts` 97,87 %.
- `grep` sobre `tests/**/*.test.ts`: ningún fichero de prueba importa `business/download-songs`; la única referencia a `business/auth/flow` es `tests/presentation/menu-crear-playlist.test.ts:104` (`vi.mock('@/business/auth/flow.js', …)`), que sustituye el módulo y por tanto no aporta cobertura de ejecución.
- `npx vitest run` (sin cobertura) → **exit 0** con 30 ficheros y 295 pruebas en verde: el déficit de cobertura no es una roja de la suite.
- `npm ls @vitest/coverage-v8` → exit 0, `@vitest/coverage-v8@5.0.3` resuelto y deduped bajo `vitest@5.0.3`, sin warnings de peer.
- `tests/transversal/verificacion-rnf.test.ts` (TC-028): aserción de RNF-004 actualizada de 7 a 8 `devDependencies` exactamente como fija `TEST_PLAN.md` 0.1.2 (RED previa exit 1, GREEN posterior exit 0 con 20/20).
