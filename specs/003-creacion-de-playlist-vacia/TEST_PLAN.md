# Plan de pruebas: 003-creacion-de-playlist-vacia

## 1. Metadatos

| Campo | Valor |
|---|---|
| Feature | `003-creacion-de-playlist-vacia` |
| Versión del plan | 0.1.3 |
| Fecha | 2026-10-10 |
| Replanificación aplicada | `DISC-002` (`PLANNING_OMISSION`, 2026-10-09): se precisan TC-010 y TC-013 con el canal de confirmación de la solicitud; TC-011 y TC-012 intactos; ningún `TC-XXX` se renumera. `DISC-003` (`PLANNING_OMISSION`, 2026-10-10): la lista congelada de dependencias de TC-028 pasa de 7 a 8 paquetes con `@vitest/coverage-v8` y se precisa §8/§10; el umbral del 80 % y el resto de casos quedan intactos |
| Replanificación aplicada (DISC-004 / CR-001) | `DISC-004` (`SCOPE_CHANGE`, análisis vinculante `ses_eda659a8fffe41u9Q81OIfhly8`, 2026-10-10; aprobación humana el 2026-10-10 08:51): la medición de cobertura se re-acota al alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) manteniendo el umbral del 80 %, conforme a `CR-001` (`CHANGE_REQUESTS.md`). Se alinean TC-028, §10 y §12 en esta versión 0.1.3; ningún `TC-XXX` se renumera y el resto de casos quedan intactos |
| Base funcional | `SPECS.md` 0.2.0, `REQUIREMENTS.md` 0.2.0, `USE_CASES.md` 0.2.0, `ACCEPTANCE_CRITERIA.feature` 0.2.0 |
| Base arquitectónica | `ARCHITECTURE.md` 0.1.0 (§3 a §6, ADR-001, ADR-002) |
| Tareas asociadas | `TASKS.md` (TASK-001 a TASK-021) |
| Estado inicial de todos los casos | `Pendiente` |
| Naturaleza de este documento | Planificación exclusiva: no se crean pruebas reales en esta entrega |

## 2. Estrategia

| Nivel | Objetivo | Herramienta | Criterios |
|---|---|---|---|
| Unidad | Reglas de negocio puras de Business (validación, duplicados, clasificación de errores, caso de uso con puertos doblados) y lógica pura de Presentation (interpretación de respuestas, análisis de indicadores) | Vitest | Sin red, sin disco, sin terminal; dobles de los puertos `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`; resultados observables idénticos a los literales aprobados |
| Integración | Data con efectos simulados, puerto `RegistroTecnico` sobre Pino, composición de dependencias reales, punto de entrada del CLI y arnés de extremo a extremo | Vitest con `msw` o punto de inyección de `fetch` (ambos disponibles: `msw` ya figura en `devDependencies`) | Sin navegación real; ficheros de tokens y de registro aislados con `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE`; sin escritura en `data/` del repositorio |
| Aceptación | Criterios Gherkin AC-001 a AC-005 ejecutables en español | Vitest organizado en escenarios con palabras clave y etiquetas Gherkin en español | 5 criterios cubiertos; literales exactos; sin dependencia nueva de lenguaje Gherkin (justificado en §5) |
| Transversal | RNF-001 a RNF-006 (seguridad, idioma, capas, SEA, calidad y observabilidad) | Biome, `tsc --noEmit`, Vitest con cobertura, análisis de registros y revisión de imports | Sin errores de Biome, sin errores de tipos, cobertura mínima del 80 % en `src/business/**`, complejidad cognitiva menor de 15, sin `any`, sin secretos en salidas |

## 3. Convención TDD

Para toda tarea de comportamiento (`TASK-001` a `TASK-020`):

1. **RED**: escribir primero la prueba prevista de la tarea y comprobar que falla de forma válida (módulo o comportamiento inexistente).
2. **GREEN**: implementar el mínimo necesario para que pase.
3. **REFACTOR**: eliminar duplicación y reducir complejidad sin cambiar el comportamiento.
4. Volver a ejecutar las pruebas relevantes y después la suite completa.
5. Registrar la evidencia en `TDD_LOG.md` (fecha, prueba, resultado), exigido por TASK-021.

`TASK-021` es documental y se valida con una comprobación equivalente: revisión de que cada tarea de comportamiento tiene entrada en `TDD_LOG.md` y al menos un `TC-XXX` en este plan.

No se permite implementación de producción sin una prueba que exprese el comportamiento objetivo (`NO TEST → NO IMPLEMENTATION`).

## 4. Catálogo de casos de prueba

| ID | Tarea | Requisitos | Criterios | Caso de uso | Nivel | Descripción | Estado |
|---|---|---|---|---|---|---|---|
| TC-001 | TASK-001 | RF-001, RF-002, RNF-003 | AC-001, AC-005 | UC-001 | Unidad (nivel tipo) | Comprobar con `expectTypeOf` que el resultado de creación es una unión discriminada estrechable hasta los 9 desenlaces, que los cuatro puertos de `ARCHITECTURE.md` §5 son consumibles por el caso de uso y que los módulos no contienen `any` ni importan de Presentation, CLI, Pino, `fetch` ni sistema de ficheros. | Verde |
| TC-002 | TASK-002 | RF-001, RNF-001 | AC-001, AC-004 | UC-001, UC-001-E2 | Integración | `crearPlaylist` con red simulada: 201 devuelve identificador y enlace; 401, 403 y 500 producen errores tipados con `estado` y `causa` depurada; 429 con cabecera `Retry-After: 7` produce `reintentoTras = 7` y 429 sin cabecera lo deja ausente; no se envía jamás `collaborative: true` ni se emiten mensajes de usuario. | Verde |
| TC-003 | TASK-002 | RF-001 | AC-005 | UC-001-A1 | Integración | `listarPlaylistsPropias` con red simulada: pagina hasta agotar (2 páginas), descarta listas de otros propietarios y devuelve los nombres efectivos propios. | Verde |
| TC-004 | TASK-003 | RNF-001, RNF-006 | AC-001, AC-004, AC-005 | UC-001 | Integración | `RegistroTecnico` escribe en el fichero indicado por `SPOTY_LOG_FILE`: `info` con nombre, visibilidad, descripción efectiva e identificador; `advertencia` con nombre e intento; `error` con causa. Búsqueda de patrones de testigo o cabecera de autorización sin coincidencias. | Verde |
| TC-005 | TASK-004 | RNF-005 | AC-004 | UC-001-E2 | Unidad | Regresión: la suite existente `tests/business/retry/retry.test.ts` sigue en verde sin modificar sus aserciones (2 reintentos, retroceso exponencial, `(retryAfter + 1) * 1000`, límite de 10000 ms, sin reintento de errores no transitorios ni de errores que no son de autenticación). | Verde |
| TC-006 | TASK-004 | RF-002, RNF-006 | AC-004 | UC-001-E2 | Unidad | Política de 429: `maxRetries = 3`; `getDelay` devuelve `reintentoTras * 1000` cuando es mayor que 0 y `10000` en su ausencia; todas las esperas pasan por el puerto `Espera` inyectado (sin temporizadores reales) y cada reintento emite `advertencia` con intento y estado. | Verde |
| TC-007 | TASK-005 | RF-001 | AC-002, AC-005 | UC-001, UC-001-E3 | Unidad | Predicados: recorte de espacios; 3 a 100 caracteres visibles; vacío, solo espacios y nombre ausente rechazados; descripción vacía o solo espacios resuelta a `"Playlist sin descripción"`; visibilidad ausente o doble rechazada y `--public`/`--private` solos aceptados; modalidad colaborativa no representable. | Verde |
| TC-008 | TASK-006 | RF-001 | AC-005 | UC-001-A1 | Unidad | `esDuplicadoPropio`: `"Viaje 2026 "` frente a `"Viaje 2026"` coincide; `"Viaje"` frente a `"viaje"` no coincide; una lista ajena homónima no cuenta porque solo entran las propias; sin acceso a red ni disco. | Verde |
| TC-009 | TASK-007 | RF-002, RNF-001 | AC-004 | UC-001-E2 | Unidad | Clasificación: `401 → SesionCaducada`, `403 → PermisosInsuficientes`, `429` persistente `→ LimiteAgotado`, resto `→ FalloInesperado` con causa depurada; la causa no contiene cuerpos de respuesta, cabeceras ni testigos; la función no produce mensajes de usuario. | Verde |
| TC-010 | TASK-008 | RF-001, RNF-006 | AC-001 | UC-001 | Unidad | Caso de uso con dobles de los cuatro puertos y con `canalConfirmacion` inyectado en la solicitud: el canal se invoca después de la validación y de la comprobación de duplicados y antes de crear; cuando devuelve `confirmada` el resultado es `Exito` con identificador y enlace, el `info` de inicio se emite solo después de esa confirmación (ya no hay posibilidad de cancelación) y antes de `crearPlaylist`, y el `info` de éxito lleva nombre, visibilidad, descripción efectiva e identificador. | Verde |
| TC-011 | TASK-008 | RF-001, RF-002 | AC-004, AC-005 | UC-001-E1, UC-001-E3 | Unidad | Sin sesión: `SinSesion` y el gateway no se invoca. Nombre inválido o visibilidad ausente/doble: `ErrorValidacion` sin listar propias ni crear. | Verde |
| TC-012 | TASK-008 | RF-001, RNF-006 | AC-005 | UC-001-A1 | Unidad | Duplicado: resultado `Duplicado` con el nombre efectivo, `advertencia` con el nombre y ninguna llamada a `crearPlaylist`. | Verde |
| TC-013 | TASK-008 | RF-002, RNF-006 | AC-003, AC-005 | UC-001 | Unidad | Cancelación: invocación cuyo `canalConfirmacion` devuelve `cancelada` (respuesta distinta de `s`, otra respuesta o `Ctrl+C` trasladados por Presentation) → resultado `Cancelado`, cero llamadas a `crearPlaylist` y cero eventos emitidos al `RegistroTecnico` (sin `info` de inicio y sin `advertencia`); también con `duplicadoAceptado: true` en la solicitud y canal `cancelada`. | Verde |
| TC-014 | TASK-009 | RF-002, RNF-006 | AC-004 | UC-001-E2 | Unidad | `429` persistente: como máximo 4 intentos (3 reintentos), espera de `10000` ms sin cabecera y de `reintentoTras * 1000` con cabecera, `advertencia` por intento con estado, resultado `LimiteAgotado` y `error` final con causa depurada. | Verde |
| TC-015 | TASK-009 | RF-002, RNF-001, RNF-006 | AC-004 | UC-001-E2 | Unidad | `401 → SesionCaducada`, `403 → PermisosInsuficientes` y fallo genérico `→ FalloInesperado`, cada uno con `error` final de causa depurada, sin reintentos para 401/403 y sin datos sensibles en el registro. | Verde |
| TC-016 | TASK-010 | RNF-003, RNF-004 | AC-002, AC-003 | UC-001 | Integración | Importar el módulo de lógica de CLI no ejecuta el arranque, no escribe en consola y no termina el proceso; `src/cli.ts` conserva el arranque y los códigos de salida; `main`, `handleCommand` y `runInteractiveMode` son invocables desde prueba. | Verde |
| TC-017 | TASK-011 | RF-002, RNF-002 | AC-001, AC-002, AC-003, AC-004, AC-005 | UC-001 | Unidad | Los literales nuevos coinciden carácter a carácter con los aprobados (los 10 mensajes de error y éxito, las 2 peticiones, la pregunta de modificación, la ayuda del menú y el ítem de opción); los literales preexistentes de `MESSAGES` no cambian. | Verde |
| TC-018 | TASK-012 | RF-001, RF-002, RNF-002 | AC-002, AC-003, AC-005 | UC-001, UC-001-A1 | Unidad | Con entrada simulada: peticiones literales; `Enter` en descripción produce `"Playlist sin descripción"`; la lista de visibilidad tiene la pública preseleccionada; `(s/N): ` solo confirma con `s`; el menú de duplicados acepta únicamente `0`, `1` y `2`; la pregunta de modificación es literal; `Ctrl+C` aborta la creación sin crear ni registrar. | Verde |
| TC-019 | TASK-013 | RF-001, RNF-003, RNF-006 | AC-001, AC-004 | UC-001, UC-001-E1 | Integración | Composición real con tokens y registro en ficheros temporales y red simulada: el caso de uso compuesto devuelve éxito, escribe el registro en el fichero temporal y no toca `data/` real; `REQUIRED_SCOPES` ya contiene `playlist-modify-public` y `playlist-modify-private`; revisión de imports de las tres capas. | Verde |
| TC-020 | TASK-014 | RF-001, RF-002, RNF-002 | AC-001, AC-003, AC-004, AC-005 | UC-001, UC-001-A1, UC-001-E2, UC-001-E3 | Unidad | Con dobles de caso de uso y de peticiones: `Exito` muestra `Playlist creada: ...` con identificador y enlace; cada desenlace de error muestra su literal exacto; `ErrorValidacion` de longitud repite la petición tras mostrar el literal; `Duplicado` muestra el literal y el menú `1/2/0` con las ramas `1` (repite nombre y pregunta modificación), `2` (pasa a confirmación) y `0` (`Creación cancelada. No se creó ninguna playlist.` sin crear ni añadir registro); una respuesta distinta de `s` en la confirmación cancela sin crear. | Verde |
| TC-021 | TASK-015 | RF-001, RF-002, RNF-002 | AC-002, AC-005 | UC-001, UC-001-E3 | Unidad | Análisis de indicadores: los 4 ejemplos aprobados (`--name "Viaje 2026" --private`; con `--description "Carretera"`; con `--public --description "Carretera"`; `--public` con descripción por defecto) inician el flujo con los datos esperados; visibilidad ausente o doble produce `Se debe declarar flag único en comando --public o --private`; nombre ausente o fuera de 3-100 produce `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa con `Nombre de la playlist (3-100 caracteres):`. | Verde |
| TC-022 | TASK-016 | RF-001, RF-002, RNF-002 | AC-003 | UC-001 | Integración | Menú: aparece `4. Crear playlist vacía`; la ayuda es `(navega con 0-4,9, Ctrl+C para cancelar)`; la opción `4` enruta al flujo de creación; las opciones `1`, `2`, `3`, `9` y `0` conservan su comportamiento; las etiquetas del selector coinciden con la numeración real. | Verde |
| TC-023 | TASK-017 | RF-001, RF-002, RNF-001, RNF-004 | AC-001, AC-002, AC-003, AC-004, AC-005 | UC-001 | Integración | Arnés: ejecuta comando y menú con Spotify simulado, tokens y registro en directorio temporal, salida capturada e interrupción `Ctrl+C` simulable; ninguna prueba requiere Internet, credenciales reales ni escritura en el repositorio. | Verde |
| TC-024 | TASK-018 | RF-001, RF-002, RNF-002, RNF-006 | AC-001, AC-002 | UC-001, UC-001-E3 | Aceptación | Escenarios en español `@AC-001` y `@AC-002`: creación única con mensaje `Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: ..., enlace: ...)` con identificador y enlace e inicio y éxito registrados sin datos sensibles; los 4 ejemplos de invocación y los 2 rechazos con sus literales exactos. | Verde |
| TC-025 | TASK-018 | RF-002, RNF-001, RNF-006 | AC-004 | UC-001-E1, UC-001-E2 | Aceptación | Escenario en español `@AC-004`: ausencia de sesión → `No hay sesión activa. Conecta con Spotify con la opción 1` y nada creado; 401 → `Sesión caducada. Vuelve a conectar con Spotify.`; 403 → `Permisos insuficientes para crear la playlist.`; 429 persistente tras 3 reintentos con `Retry-After` o 10 segundos → `Vuelva a intentarlo más tarde`; fallo genérico → `No se pudo crear la playlist por un error inesperado.`; registro de causa sin cuerpo sensible y ausencia de tokens en consola, registros y ficheros. | Verde |
| TC-026 | TASK-019 | RF-001, RF-002, RNF-002 | AC-003 | UC-001 | Aceptación | Escenario en español `@AC-003`: opción `4. Crear playlist vacía`, ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`, peticiones de nombre y descripción, lista de visibilidad con pública preseleccionada, confirmación `(s/N): ` donde solo `s` confirma, cualquier otra respuesta vuelve al menú sin crear y `Ctrl+C` aborta sin crear. | Verde |
| TC-027 | TASK-019 | RF-001, RF-002, RNF-006 | AC-005 | UC-001, UC-001-A1, UC-001-E3 | Aceptación | Escenario en español `@AC-005`: nombre vacío, solo espacios o fuera de 3-100 rechazado con su literal y reingreso; duplicado exacto tras recorte sensible a mayúsculas con su literal y menú; opciones `1`, `2` y `0` con sus literales y comportamiento; sin creación en la rama `0`. | Verde |
| TC-028 | TASK-020 | RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006 | AC-001, AC-002, AC-003, AC-004, AC-005 | UC-001 | Transversal | Verificación automatizada: búsqueda de patrones de testigo en consola, `data/app.log` y ficheros generados; revisión de imports de capas; Biome sin errores; `tsc --noEmit` sin errores en modo estricto; suite Vitest en verde con cobertura mínima del 80 % en el alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) según `vitest.config.ts` re-acotado por `CR-001` (el proveedor `@vitest/coverage-v8`, ya configurado en `vitest.config.ts`, se materializa con la lista congelada de dependencias de 8 paquetes: los 7 previos más `@vitest/coverage-v8`, versión compatible con `vitest ^5.0.3`; replanificación `DISC-003`); complejidad cognitiva menor de 15 por función; ausencia de `any`; eventos `info`/`warn`/`error` exigidos presentes y cancelaciones sin registro; `REQUIRED_SCOPES` con ambos ámbitos de playlist sin cambio en la conexión. | Verde |
| TC-029 | TASK-021 | RNF-002, RNF-005 | AC-001, AC-002, AC-003, AC-004, AC-005 | UC-001 | Transversal (documental) | `TDD_LOG.md` con entrada por tarea de comportamiento (fecha, prueba, resultado `RED → GREEN → REFACTOR`); matriz `TASK`/`TC` coherente con este plan y con `TASKS.md`; documentación en español estricto sin infracciones. | Verde |

## 5. Criterios de aceptación ejecutables

| Criterio | Escenario | Tarea | Casos | Nivel |
|---|---|---|---|---|
| AC-001 | Crear playlist vacía con confirmación e identificador | TASK-018 | TC-024 (más TC-010, TC-019, TC-020) | Aceptación |
| AC-002 | Punto de inicio por comando directo con parámetros validados | TASK-018 | TC-024 (más TC-021) | Aceptación |
| AC-003 | Punto de inicio por menú interactivo con confirmación | TASK-019 | TC-026 (más TC-018, TC-022) | Aceptación |
| AC-004 | Informar errores de sesión, autorización y servicio sin exponer datos sensibles | TASK-018 | TC-025 (más TC-002, TC-006, TC-009, TC-014, TC-015) | Aceptación |
| AC-005 | Validar nombre y gestionar duplicados contra listas propias | TASK-019 | TC-027 (más TC-007, TC-008, TC-020) | Aceptación |

Reglas de ejecución:

- Los escenarios se escriben en español con `Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y` y `Pero`, y conservan las etiquetas `@AC-XXX`, `@RF-XXX` y `@UC-001` de `ACCEPTANCE_CRITERIA.feature`.
- Cada paso del `.feature` tiene una aserción correspondiente en la suite; no se modifica `ACCEPTANCE_CRITERIA.feature`.
- Sin dependencia nueva de lenguaje Gherkin: los escenarios se implementan como suites de Vitest con la misma estructura y etiquetas, porque añadir un ejecutor Gherkin obligaría a justificar e investigar una librería nueva (política de `AGENTS.md` §8) sin aportar cobertura adicional. Si se decidiera incorporar un ejecutor, correspondería investigarlo antes de añadirlo.
- Aplicando la nota O-004, AC-002 puede dividirse en escenarios adicionales dentro de las suites si mejora la legibilidad, sin renumerar identificadores.
- Ninguna prueba de aceptación necesita red real, credenciales ni escritura en `data/` del repositorio.

## 6. Criterios de calidad de las pruebas

- TypeScript en modo estricto, ESM y Vitest como único ejecutor de pruebas (`npm test` / `vitest run`).
- Biome sin errores en código y en pruebas (`biome check`), formato con comillas simples y ancho de línea 100.
- Complejidad cognitiva menor de 15 por función, también en funciones de prueba auxiliares.
- Sin `any` explícito ni implícito; usar dobles tipados de los puertos.
- Sin `console.log` en Business; la salida de consola se captura en Presentation cuando la prueba lo requiere.
- Cada `TASK-XXX` de comportamiento tiene al menos un `TC-XXX` y toda ejecución `RED` inicial queda registrada.

## 7. Seguridad y registros (RNF-001, RNF-006)

- Búsqueda de patrones de testigo, `refresh_token`, `authorization` y claves en: salida de consola, `data/app.log` (o el fichero temporal equivalente), ficheros generados y propios de las pruebas. Resultado esperado: cero coincidencias.
- Las causas registradas ante fallo genérico contienen el motivo técnico depurado, nunca cuerpos de respuesta completos ni cabeceras.
- Comprobación de eventos: `info` de inicio y de éxito, `advertencia` de duplicado y de cada reintento, `error` final con causa.
- Comprobación negativa: ninguna entrada de registro corresponde a una cancelación del usuario.
- Los tests usan tokens ficticios claramente inválidos y nunca un testigo real.

## 8. Compatibilidad SEA y dependencias (RNF-004)

- Sin dependencias nuevas salvo `@vitest/coverage-v8` (`DISC-003`): el resto —Vitest, Biome, Pino, `msw` y el SDK de Spotify— ya estaba declarado. `@vitest/coverage-v8` no es una dependencia funcional añadida, sino el proveedor implícito de la cobertura v8 que RNF-005 ya aprobaba y que `vitest.config.ts` ya configura (`provider: 'v8'`); debe instalarse en `devDependencies` con versión compatible con `vitest ^5.0.3` y quedar reflejado en la lista congelada de TC-028 (8 paquetes). No introduce binarios nativos ni requisitos de ejecución: es exclusivamente una dependencia de desarrollo, sin efecto sobre el empaquetado SEA.
- Ninguna prueba exige binarios nativos, servicios del sistema ni carga dinámica fuera del empaquetado.
- El punto de entrada `src/cli.ts` conserva el arranque único compatible con `package.json` `bin` y con el empaquetado futuro.

## 9. Capas y reutilización no CLI (RNF-003)

- El caso de uso se prueba sin `argv`, sin `readline` y sin salida a consola.
- Business se prueba con dobles de `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`, más un doble del canal de confirmación suministrado en la solicitud (que devuelve `confirmada` o `cancelada`); ningún doble simula terminal ni `readline`.
- Data se prueba con red simulada y ficheros temporales, sin reglas de negocio en el módulo.
- Presentation se prueba con dobles del caso de uso y de las peticiones, verificando que no decide longitudes, duplicados, reintentos ni mapeos de estados HTTP.

## 10. Cobertura mínima

- Cada `TASK-XXX` de comportamiento tiene al menos un `TC-XXX` (29 casos para 21 tareas).
- Cada `AC-001` a `AC-005` tiene al menos un caso de aceptación en verde más soporte de unidad o integración.
- Cobertura del alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) mínima del 80 % en líneas, funciones, ramas y sentencias según `vitest.config.ts` re-acotado por `CR-001`; su ejecución requiere `@vitest/coverage-v8` instalado como proveedor dev (replanificación `DISC-003`), sin relajar el umbral.
- Sin requisitos ni criterios huérfanos en la matriz de `TASKS.md` §6.

## 11. Riesgos y notas de planificación

| Nota | Riesgo para las pruebas | Actuación prevista |
|---|---|---|
| N-001 (alcance de la confirmación final) | Podría interpretarse que el comando directo también pide confirmación | TC-021 y TC-024 fijan la lectura aprobada: solo el flujo interactivo pide confirmación; cualquier divergencia se registra como `DISC-XXX` antes de implementar |
| N-002 (destino de `Ctrl+C`) | El destino posterior al aborto no está descrito en el artefacto de criterios | TC-018 y TC-026 verifican solo el comportamiento exigido: aborto sin crear ni registrar |
| N-003 (`warn` de duplicado frente a cancelación) | Riesgo de omitir el `advertencia` exigido por RNF-006 | TC-012 exige el `advertencia` y TC-020 exige que la cancelación no añada registros |
| N-004 (etiquetas del selector de menú) | Incoherencia interna existente que afectaría a la lectura del menú | TC-022 exige coherencia con `0-4,9` |
| DISC-002 (canal de confirmación, `PLANNING_OMISSION`) | Sin canal, el `info` condicionado de TC-010 y el `Cancelado` de TC-013 no serían escribibles y la reinvocación tras la opción 2 de TC-020/TC-027 no cerraría | TC-010 fija el orden canal → `info` de inicio → creación; TC-013 fija `Cancelado` con cero llamadas y cero eventos; TC-011 y TC-012 quedan intactos |
| O-005, O-006 | Desfases documentales en `ARCHITECTURE.md`, `STATE.md` y `TRACEABILITY.md` | No afectan a las pruebas; se subsanan al tocar esos artefactos o al declarar los gates |
| Pino asíncrono en pruebas | El transporte de Pino puede no vaciar el fichero antes de la aserción | Aislar con `SPOTY_LOG_FILE`, forzar el vaciado del logger o inyectar el logger en pruebas, sin relajar la comprobación de eventos |

## 12. Condiciones de cierre de la fase de pruebas

La fase de pruebas puede darse por concluida solo con evidencia, y nunca en esta entrega de planificación:

- todas las `TASK-XXX` completas y todas las `TC-XXX` en verde;
- Biome, `tsc --noEmit` y suite de Vitest sin errores;
- cobertura mínima alcanzada en el alcance 003 (`src/business/playlists/**` + `src/business/retry/**` al 80 %, medición re-acotada por `CR-001`);
- AC-001 a AC-005 con escenarios en verde;
- `TDD_LOG.md` con evidencia por tarea;
- RNF-001, RNF-002, RNF-005 y RNF-006 verificados sin secretos ni documentación en inglés;
- sin descubrimientos `DISC-XXX` ni solicitudes `CR-XXX` pendientes.

Con estas condiciones se podrá proponer `FEATURE_DONE`, previa validación final. **Esta entrega no declara `FEATURE_DONE`.**
